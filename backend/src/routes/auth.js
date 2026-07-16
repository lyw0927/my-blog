const express = require('express');
const router = express.Router();
const { sign, verify } = require('./jwtHelper');
const { db } = require('../firebase');
const { adminMiddleware } = require('../middleware/authMiddleware');
const { fetchJson, getRandomCardId } = require('../utils/cardUtils');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';
const JWT_SECRET = process.env.JWT_SECRET || 'my-blog-jwt-secret-key-12345';

// POST /api/auth/register - 회원가입
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, nickname } = req.body;
    if (!username || !password || !nickname) {
      return res.status(400).json({ message: '아이디, 비밀번호, 닉네임을 모두 입력해 주세요.' });
    }

    const cleanedUsername = username.trim().toLowerCase();
    if (cleanedUsername === 'admin') {
      return res.status(400).json({ message: '사용할 수 없는 아이디입니다.' });
    }

    const userRef = db.collection('users').doc(cleanedUsername);
    const doc = await userRef.get();

    if (doc.exists) {
      return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
    }

    // 회원가입 시 서버에서 무작위 아바타 배정 (전체 카드 대상)
    const randomAvatar = await getRandomCardId();

    const userData = {
      username: cleanedUsername,
      password: password.trim(), // 간단한 매칭을 위해 평문 저장
      nickname: nickname.trim(),
      avatar: randomAvatar,
      role: 'user'
    };

    if (typeof userRef.set === 'function') {
      await userRef.set(userData);
    } else {
      await userRef.update(userData);
    }

    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login - 로그인
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 기존 비밀번호 전용 로그인 하위 호환성 유지 (관리자 빠른 로그인용)
    if (!username && password) {
      if (password === ADMIN_PASSWORD) {
        const token = sign({ username: 'admin', nickname: 'Sinji', role: 'admin', avatar: '76794549' }, JWT_SECRET);
        return res.json({ token, role: 'admin', nickname: 'Sinji', avatar: '76794549' });
      } else {
        return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
      }
    }

    if (!username || !password) {
      return res.status(400).json({ message: '아이디와 비밀번호를 모두 입력해 주세요.' });
    }

    const cleanedUsername = username.trim().toLowerCase();

    // 관리자 로그인 체크
    if (cleanedUsername === 'admin') {
      if (password === ADMIN_PASSWORD) {
        const token = sign({ username: 'admin', nickname: 'Sinji', role: 'admin', avatar: '76794549' }, JWT_SECRET);
        return res.json({ token, role: 'admin', nickname: 'Sinji', avatar: '76794549' });
      } else {
        return res.status(401).json({ message: '관리자 비밀번호가 올바르지 않습니다.' });
      }
    }

    // 일반 회원 로그인 체크
    const userRef = db.collection('users').doc(cleanedUsername);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(401).json({ message: '존재하지 않는 아이디입니다.' });
    }

    const user = doc.data();
    if (user.password !== password.trim()) {
      return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
    }

    const token = sign({ username: user.username, nickname: user.nickname, role: user.role, avatar: user.avatar || '48171151' }, JWT_SECRET);
    res.json({ token, role: user.role, nickname: user.nickname, avatar: user.avatar || '48171151' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/verify - 토큰 검증
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, message: '토큰이 없습니다.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verify(token, JWT_SECRET);

  if (decoded) {
    // 유저 정보 포함 반환
    return res.json({ valid: true, user: decoded });
  } else {
    return res.status(401).json({ valid: false, message: '유효하지 않거나 만료된 토큰입니다.' });
  }
});

// GET /api/auth/users - 가입된 회원 목록 조회 (관리자 전용)
router.get('/users', adminMiddleware, async (req, res, next) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        username: data.username,
        nickname: data.nickname,
        role: data.role
      };
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/users/:username - 회원 강제 탈퇴 (관리자 전용)
router.delete('/users/:username', adminMiddleware, async (req, res, next) => {
  try {
    const { username } = req.params;
    if (username === 'admin') {
      return res.status(400).json({ message: '관리자 계정은 삭제할 수 없습니다.' });
    }
    const userRef = db.collection('users').doc(username);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: '존재하지 않는 회원입니다.' });
    }
    await userRef.delete();
    res.json({ message: '회원이 성공적으로 강제 탈퇴 처리되었습니다.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/random-card - 우회용 랜덤 카드 가져오기 (CORS 우회용)
router.get('/random-card', async (req, res, next) => {
  try {
    const randomUrl = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?num=1&offset=0&sort=random&cachebust';
    const json = await fetchJson(randomUrl);
    const card = json.data?.[0] || null;
    res.json(card);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
