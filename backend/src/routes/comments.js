const express = require('express');
const router = express.Router({ mergeParams: true });
const { db, FieldValue } = require('../firebase');
const { adminMiddleware } = require('../middleware/authMiddleware');
const { getRandomCardId } = require('../utils/cardUtils');
const bcrypt = require('bcryptjs');

// 댓글 목록 조회
router.get('/', async (req, res, next) => {
  try {
    const snapshot = await db
      .collection('posts')
      .doc(req.params.postId)
      .collection('comments')
      .orderBy('createdAt', 'asc')
      .get();

    const comments = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        author: data.author,
        content: data.content,
        avatar: data.avatar,
        createdAt: data.createdAt?.toDate().toISOString() ?? null,
        // passwordHash는 절대 클라이언트에 전달하지 않음
      };
    });

    res.json(comments);
  } catch (err) {
    next(err);
  }
});

// 댓글 작성 (누구나 가능, 비밀번호 필수)
router.post('/', async (req, res, next) => {
  try {
    const { author, content, password, avatar } = req.body;

    if (!author || !content || !password) {
      return res.status(400).json({ message: 'author, content, password 는 필수입니다.' });
    }

    const postRef = db.collection('posts').doc(req.params.postId);
    const post = await postRef.get();

    if (!post.exists) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    let finalAvatar = avatar;
    if (!finalAvatar) {
      finalAvatar = await getRandomCardId();
    }

    // 비밀번호 bcrypt 해시화 (saltRounds=10)
    const passwordHash = await bcrypt.hash(password, 10);

    const docRef = await postRef.collection('comments').add({
      author,
      content,
      avatar: finalAvatar,
      passwordHash,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.status(201).json({ id: docRef.id });
  } catch (err) {
    next(err);
  }
});

// 댓글 수정 (비밀번호 검증 필요, 어드민은 우회 가능)
router.put('/:commentId', async (req, res, next) => {
  try {
    const { postId, commentId } = req.params;
    const { content, password } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'content 는 필수입니다.' });
    }

    const commentRef = db
      .collection('posts')
      .doc(postId)
      .collection('comments')
      .doc(commentId);

    const doc = await commentRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    }

    // 어드민 토큰 여부 확인 (선택적 인증)
    const token = req.headers.authorization?.replace('Bearer ', '');
    let isAdmin = false;
    if (token) {
      try {
        const { verify } = require('./jwtHelper');
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const decoded = verify(token, secret);
        if (decoded && decoded.role === 'admin') isAdmin = true;
      } catch (e) { /* 패스 */ }
    }

    // 어드민이 아닌 경우 비밀번호 검증
    if (!isAdmin) {
      if (!password) {
        return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
      }
      const match = await bcrypt.compare(password, doc.data().passwordHash || '');
      if (!match) {
        return res.status(403).json({ message: '비밀번호가 일치하지 않습니다.' });
      }
    }

    await commentRef.update({ content });
    res.json({ message: '댓글이 수정되었습니다.' });
  } catch (err) {
    next(err);
  }
});

// 댓글 삭제 (비밀번호 검증 필요, 어드민은 우회 가능)
router.delete('/:commentId', async (req, res, next) => {
  try {
    const { postId, commentId } = req.params;
    const { password } = req.body;

    const commentRef = db
      .collection('posts')
      .doc(postId)
      .collection('comments')
      .doc(commentId);

    const doc = await commentRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
    }

    // 어드민 토큰 여부 확인 (선택적 인증)
    const token = req.headers.authorization?.replace('Bearer ', '');
    let isAdmin = false;
    if (token) {
      try {
        const { verify } = require('./jwtHelper');
        const secret = process.env.JWT_SECRET || 'fallback-secret';
        const decoded = verify(token, secret);
        if (decoded && decoded.role === 'admin') isAdmin = true;
      } catch (e) { /* 패스 */ }
    }

    // 어드민이 아닌 경우 비밀번호 검증
    if (!isAdmin) {
      if (!password) {
        return res.status(400).json({ message: '비밀번호를 입력해 주세요.' });
      }
      const match = await bcrypt.compare(password, doc.data().passwordHash || '');
      if (!match) {
        return res.status(403).json({ message: '비밀번호가 일치하지 않습니다.' });
      }
    }

    await commentRef.delete();
    res.json({ message: '댓글이 성공적으로 삭제되었습니다.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
