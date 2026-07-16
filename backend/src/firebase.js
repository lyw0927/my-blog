const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let db;
let FieldValue;
let isMock = false;

// Mock Firestore Implementation for Local Fallback
class MockFirestore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { posts: {}, comments: {} };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      } else {
        this.save();
      }
    } catch (e) {
      console.error("Mock DB load failed, using empty database:", e);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error("Mock DB save failed:", e);
    }
  }

  collection(name) {
    return new MockCollection(this, name);
  }

  batch() {
    const dbInstance = this;
    return {
      delete(ref) {
        if (ref.type === 'comment') {
          delete dbInstance.data.comments[ref.postId]?.[ref.id];
        } else if (ref.type === 'post') {
          delete dbInstance.data.posts[ref.id];
          delete dbInstance.data.comments[ref.id];
        }
      },
      async commit() {
        dbInstance.save();
      }
    };
  }
}

class MockCollection {
  constructor(db, name, parentDocId = null) {
    this.db = db;
    this.name = name;
    this.parentDocId = parentDocId;
    this.orders = [];
  }

  orderBy(field, direction = 'desc') {
    this.orders.push({ field, direction });
    return this;
  }

  async get() {
    let list = [];
    if (this.name === 'posts') {
      list = Object.entries(this.db.data.posts || {}).map(([id, val]) => ({
        id,
        ref: { type: 'post', id },
        data: () => ({
          ...val,
          createdAt: val.createdAt ? { toDate: () => new Date(val.createdAt) } : null
        })
      }));
    } else if (this.name === 'comments') {
      const postComments = (this.db.data.comments && this.db.data.comments[this.parentDocId]) || {};
      list = Object.entries(postComments).map(([id, val]) => ({
        id,
        ref: { type: 'comment', id, postId: this.parentDocId },
        data: () => ({
          ...val,
          createdAt: val.createdAt ? { toDate: () => new Date(val.createdAt) } : null
        })
      }));
    } else {
      const colData = this.db.data[this.name] || {};
      list = Object.entries(colData).map(([id, val]) => ({
        id,
        ref: { type: this.name, id },
        data: () => ({
          ...val,
          createdAt: val.createdAt ? { toDate: () => new Date(val.createdAt) } : null
        })
      }));
    }

    // Apply ordering
    for (const order of this.orders) {
      list.sort((a, b) => {
        const valA = a.data()[order.field];
        const valB = b.data()[order.field];
        
        const timeA = valA && typeof valA.toDate === 'function' ? valA.toDate().getTime() : new Date(valA || 0).getTime();
        const timeB = valB && typeof valB.toDate === 'function' ? valB.toDate().getTime() : new Date(valB || 0).getTime();

        if (timeA < timeB) return order.direction === 'asc' ? -1 : 1;
        if (timeA > timeB) return order.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return { docs: list };
  }

  doc(id) {
    if (this.name === 'posts') {
      return new MockDocument(this.db, 'posts', id);
    } else if (this.name === 'comments') {
      return new MockDocument(this.db, 'comments', id, this.parentDocId);
    }
    return new MockDocument(this.db, this.name, id);
  }

  async add(data) {
    const id = 'mock_' + Math.random().toString(36).substring(2, 11);
    const parsedData = { ...data };
    
    if (parsedData.createdAt && typeof parsedData.createdAt === 'object') {
      parsedData.createdAt = new Date().toISOString();
    }

    if (this.name === 'posts') {
      this.db.data.posts[id] = parsedData;
    } else if (this.name === 'comments') {
      if (!this.db.data.comments[this.parentDocId]) {
        this.db.data.comments[this.parentDocId] = {};
      }
      this.db.data.comments[this.parentDocId][id] = parsedData;
    }
    this.db.save();
    return { id, ref: { type: this.name === 'posts' ? 'post' : 'comment', id, postId: this.parentDocId } };
  }
}

class MockDocument {
  constructor(db, collectionName, id, parentDocId = null) {
    this.db = db;
    this.collectionName = collectionName;
    this.id = id;
    this.parentDocId = parentDocId;
    this.ref = { type: collectionName === 'posts' ? 'post' : 'comment', id, postId: parentDocId };
  }

  collection(name) {
    if (name === 'comments') {
      return new MockCollection(this.db, 'comments', this.id);
    }
    throw new Error('Unsupported subcollection: ' + name);
  }

  async get() {
    let exists = false;
    let dataVal = null;

    if (this.collectionName === 'posts') {
      exists = !!(this.db.data.posts && this.db.data.posts[this.id]);
      dataVal = this.db.data.posts && this.db.data.posts[this.id];
    } else if (this.collectionName === 'comments') {
      exists = !!(this.db.data.comments && this.db.data.comments[this.parentDocId] && this.db.data.comments[this.parentDocId][this.id]);
      dataVal = this.db.data.comments && this.db.data.comments[this.parentDocId] && this.db.data.comments[this.parentDocId][this.id];
    } else {
      exists = !!(this.db.data[this.collectionName] && this.db.data[this.collectionName][this.id]);
      dataVal = this.db.data[this.collectionName] && this.db.data[this.collectionName][this.id];
    }

    return {
      exists,
      id: this.id,
      ref: this.ref,
      data: () => exists ? {
        ...dataVal,
        createdAt: dataVal.createdAt ? { toDate: () => new Date(dataVal.createdAt) } : null
      } : null
    };
  }

  async update(updateData) {
    if (this.collectionName === 'posts') {
      const post = this.db.data.posts[this.id];
      if (!post) throw new Error('Post not found');
      
      for (const [k, v] of Object.entries(updateData)) {
        if (v && typeof v === 'object') {
          // Handle increment
          if (v.constructor && (v.constructor.name === 'NumericIncrementTransform' || v.type === 'increment' || v.operand !== undefined)) {
            post[k] = (post[k] || 0) + (v.operand || 1);
          } else {
            post[k] = v;
          }
        } else {
          post[k] = v;
        }
      }
      this.db.save();
    } else {
      if (!this.db.data[this.collectionName]) {
        this.db.data[this.collectionName] = {};
      }
      const current = this.db.data[this.collectionName][this.id] || {};
      this.db.data[this.collectionName][this.id] = {
        ...current,
        ...updateData
      };
      this.db.save();
    }
  }

  async set(setData) {
    if (!this.db.data[this.collectionName]) {
      this.db.data[this.collectionName] = {};
    }
    this.db.data[this.collectionName][this.id] = { ...setData };
    this.db.save();
  }

  async delete() {
    if (this.collectionName === 'posts') {
      delete this.db.data.posts[this.id];
      delete this.db.data.comments[this.id];
    } else if (this.collectionName === 'comments') {
      delete this.db.data.comments[this.parentDocId]?.[this.id];
    } else {
      if (this.db.data[this.collectionName]) {
        delete this.db.data[this.collectionName][this.id];
      }
    }
    this.db.save();
  }
}

// Try initializing real Firebase Admin SDK first
try {
  const { createPrivateKey } = require('crypto');
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH 환경 변수가 설정되지 않았습니다.');
  }

  const resolvedPath = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Firebase 서비스 계정 파일이 존재하지 않습니다: ${resolvedPath}`);
  }

  const serviceAccount = require(resolvedPath);
  
  // Format the key if it has double-escaped newlines
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    // Verify key validity using crypto module
    createPrivateKey(serviceAccount.private_key);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  db = admin.firestore();
  FieldValue = admin.firestore.FieldValue;
  console.log("Firebase Admin SDK가 정상적으로 초기화되었습니다.");
} catch (err) {
  console.warn("⚠️ Firebase Admin SDK 초기화 실패 또는 비공개 키가 유효하지 않습니다. 로컬 DB 파일(db.json) 모드로 실행합니다.");
  console.warn(`상세 이유: ${err.message}`);
  
  isMock = true;
  db = new MockFirestore(path.resolve(__dirname, '../db.json'));
  
  // Mock FieldValue
  FieldValue = {
    increment(operand) {
      return { type: 'increment', operand };
    },
    serverTimestamp() {
      return { type: 'serverTimestamp' };
    }
  };
}

module.exports = { db, FieldValue, isMock };
