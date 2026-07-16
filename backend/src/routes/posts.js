const express = require('express');
const router = express.Router();
const { db, FieldValue } = require('../firebase');
const { authMiddleware } = require('../middleware/authMiddleware');

// 글 목록 조회
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db
      .collection('posts')
      .orderBy('createdAt', 'desc')
      .get();

    const posts = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        views: data.views || 0,
        likes: data.likes || 0,
        createdAt: data.createdAt?.toDate().toISOString() ?? null,
      };
    });

    res.json(posts);
  } catch (err) {
    next(err);
  }
});

// 글 단건 조회 (조회수 1 증가)
router.get('/:id', async (req, res, next) => {
  try {
    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // 조회수 증가
    await ref.update({ views: FieldValue.increment(1) });

    const updatedDoc = await ref.get();
    const data = updatedDoc.data();
    res.json({
      id: updatedDoc.id,
      ...data,
      views: data.views || 0,
      likes: data.likes || 0,
      createdAt: data.createdAt?.toDate().toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

// 글 작성 (회원 및 관리자 로그인 필요)
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { title, content, category, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'title, content 는 필수입니다.' });
    }

    const docRef = await db.collection('posts').add({
      title,
      content,
      author: req.user.nickname || '익명',
      authorId: req.user.username,
      category: category || '덱 리스트',
      tags: Array.isArray(tags) ? tags : [],
      likes: 0,
      views: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (err) {
    next(err);
  }
});

// 글 수정 (자신의 글 또는 관리자만 가능)
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { title, content, category, tags } = req.body;
    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const postData = doc.data();
    if (req.user.role !== 'admin' && postData.authorId !== req.user.username) {
      return res.status(403).json({ message: '자신의 글만 수정할 수 있습니다.' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];

    await ref.update(updateData);
    res.json({ message: '글이 성공적으로 수정되었습니다.' });
  } catch (err) {
    next(err);
  }
});

// 글 삭제 (자신의 글 또는 관리자만 가능)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const postData = doc.data();
    if (req.user.role !== 'admin' && postData.authorId !== req.user.username) {
      return res.status(403).json({ message: '자신의 글만 삭제할 수 있습니다.' });
    }

    // 하위 댓글 삭제 후 글 삭제
    const commentsSnapshot = await ref.collection('comments').get();
    for (const commentDoc of commentsSnapshot.docs) {
      await ref.collection('comments').doc(commentDoc.id).delete();
    }
    await ref.delete();

    res.json({ message: '글과 댓글이 성공적으로 삭제되었습니다.' });
  } catch (err) {
    next(err);
  }
});

// 좋아요 증가 (24시간당 IP당 1회 제한)
router.post('/:id/like', async (req, res, next) => {
  try {
    const ref = db.collection('posts').doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    // IP 구하기 및 특수문자 치환 (Doc ID 생성용)
    const rawIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const cleanIp = String(rawIp).replace(/[^a-zA-Z0-9]/g, '_');
    const logDocId = `${req.params.id}_${cleanIp}`;

    const logRef = db.collection('likes_log').doc(logDocId);
    const logDoc = await logRef.get();

    if (logDoc.exists) {
      const logData = logDoc.data();
      const likedAt = logData.likedAt ? new Date(logData.likedAt) : null;
      
      if (likedAt) {
        const now = new Date();
        const diff = now.getTime() - likedAt.getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        if (diff < oneDay) {
          const timeLeftMs = oneDay - diff;
          const hoursLeft = Math.ceil(timeLeftMs / (1000 * 60 * 60));
          return res.status(400).json({ 
            message: `이미 이 게시글에 좋아요를 누르셨습니다. ${hoursLeft}시간 후에 다시 누를 수 있습니다.` 
          });
        }
      }
    }

    // 좋아요 이력 저장
    await logRef.set({
      postId: req.params.id,
      ip: rawIp,
      likedAt: new Date().toISOString()
    });

    // 좋아요 카운트 증가
    await ref.update({ likes: FieldValue.increment(1) });

    const updated = await ref.get();
    res.json({ likes: updated.data().likes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
