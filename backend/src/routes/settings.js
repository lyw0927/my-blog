const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { adminMiddleware } = require('../middleware/authMiddleware');

const DEFAULT_SETTINGS = {
  blogTitle: "마술사 덱 노트",
  logoEmoji: "🃏",
  logoImageUrl: "",
  subtitle: "유희왕 마술사 계열 덱 구성, 매치업, 전략을 기록하는 덱 노트"
};

// GET /api/settings - 블로그 설정 조회
router.get('/', async (req, res, next) => {
  try {
    const doc = await db.collection('settings').doc('config').get();
    if (!doc.exists) {
      return res.json(DEFAULT_SETTINGS);
    }
    res.json({ ...DEFAULT_SETTINGS, ...doc.data() });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings - 블로그 설정 변경 (관리자 전용)
router.put('/', adminMiddleware, async (req, res, next) => {
  try {
    const { blogTitle, logoEmoji, logoImageUrl, subtitle } = req.body;
    
    const docRef = db.collection('settings').doc('config');
    const updateData = {
      blogTitle: blogTitle || DEFAULT_SETTINGS.blogTitle,
      logoEmoji: logoEmoji || DEFAULT_SETTINGS.logoEmoji,
      logoImageUrl: logoImageUrl !== undefined ? logoImageUrl : DEFAULT_SETTINGS.logoImageUrl,
      subtitle: subtitle !== undefined ? subtitle : DEFAULT_SETTINGS.subtitle
    };

    if (typeof docRef.set === 'function') {
      await docRef.set(updateData);
    } else {
      await docRef.update(updateData);
    }

    res.json({ message: '설정이 성공적으로 저장되었습니다.', settings: updateData });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
