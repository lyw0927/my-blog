import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';

import { KOREAN_CARD_MAP } from '../utils/cardMap';
import { fetchJson, getRandomCardId, translateEnglishToKorean } from '../utils/cardUtils';
import { translateViaNamuwiki } from '../utils/namuwiki';

const app = new Hono().basePath('/api');

// CORS middleware
app.use('*', cors({
  origin: (origin) => origin,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

const JWT_DEFAULT_SECRET = 'my-blog-jwt-secret-key-12345';

// Helper: Get authenticated user from request headers
async function getAuthUser(c) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    throw new Error('Authorization 헤더가 없습니다.');
  }
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization 헤더 형식이 올바르지 않습니다. (Bearer 필수)');
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('토큰 값이 비어 있습니다.');
  }
  const secret = c.env.JWT_SECRET || JWT_DEFAULT_SECRET;
  try {
    return await verify(token, secret);
  } catch (e) {
    throw new Error(`토큰 검증 실패: ${e.message}`);
  }
}

// Middlewares
const authMiddleware = async (c, next) => {
  try {
    const user = await getAuthUser(c);
    c.set('user', user);
    await next();
  } catch (err) {
    return c.json({ message: `인증 권한이 없습니다. (${err.message})` }, 401);
  }
};

const adminMiddleware = async (c, next) => {
  try {
    const user = await getAuthUser(c);
    if (!user || user.role !== 'admin') {
      return c.json({ message: '관리자 권한이 필요합니다. (어드민 역할이 아님)' }, 403);
    }
    c.set('user', user);
    await next();
  } catch (err) {
    return c.json({ message: `관리자 인증 실패: ${err.message}` }, 403);
  }
};

// -------------------------------------------------------------
// 1. AUTH ROUTES (/api/auth)
// -------------------------------------------------------------

// POST /api/auth/register - 회원가입
app.post('/auth/register', async (c) => {
  try {
    const { username, password, nickname } = await c.req.json();
    if (!username || !password || !nickname) {
      return c.json({ message: '아이디, 비밀번호, 닉네임을 모두 입력해 주세요.' }, 400);
    }

    const cleanedUsername = username.trim().toLowerCase();
    if (cleanedUsername === 'admin') {
      return c.json({ message: '사용할 수 없는 아이디입니다.' }, 400);
    }

    // 아이디 중복 체크
    const existing = await c.env.DB.prepare('SELECT username FROM users WHERE username = ?')
      .bind(cleanedUsername)
      .first();

    if (existing) {
      return c.json({ message: '이미 존재하는 아이디입니다.' }, 400);
    }

    const randomAvatar = await getRandomCardId();
    // 간단한 매칭을 위해 원본 코드처럼 평문 저장 (필요 시 해싱할 수도 있으나 하위 호환성 유지)
    const userData = {
      username: cleanedUsername,
      password: password.trim(),
      nickname: nickname.trim(),
      avatar: randomAvatar,
      role: 'user'
    };

    await c.env.DB.prepare('INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)')
      .bind(userData.username, userData.password, userData.nickname, userData.avatar, userData.role)
      .run();

    return c.json({ message: '회원가입이 완료되었습니다.' }, 201);
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// POST /api/auth/login - 로그인
app.post('/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json();
    const ADMIN_PASSWORD = c.env.ADMIN_PASSWORD || 'admin1234';
    const secret = c.env.JWT_SECRET || JWT_DEFAULT_SECRET;

    // 기존 비밀번호 전용 로그인 하위 호환성 (관리자 빠른 로그인)
    if (!username && password) {
      if (password === ADMIN_PASSWORD) {
        const payload = { username: 'admin', nickname: 'Sinji', role: 'admin', avatar: '76794549' };
        const token = await sign(payload, secret);
        return c.json({ token, role: 'admin', nickname: 'Sinji', avatar: '76794549' });
      } else {
        return c.json({ message: '비밀번호가 올바르지 않습니다.' }, 401);
      }
    }

    if (!username || !password) {
      return c.json({ message: '아이디와 비밀번호를 모두 입력해 주세요.' }, 400);
    }

    const cleanedUsername = username.trim().toLowerCase();

    // 관리자 로그인 체크
    if (cleanedUsername === 'admin') {
      if (password === ADMIN_PASSWORD) {
        const payload = { username: 'admin', nickname: 'Sinji', role: 'admin', avatar: '76794549' };
        const token = await sign(payload, secret);
        return c.json({ token, role: 'admin', nickname: 'Sinji', avatar: '76794549' });
      } else {
        return c.json({ message: '관리자 비밀번호가 올바르지 않습니다.' }, 401);
      }
    }

    // 일반 회원 로그인 체크
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ?')
      .bind(cleanedUsername)
      .first();

    if (!user) {
      return c.json({ message: '존재하지 않는 아이디입니다.' }, 401);
    }

    if (user.password !== password.trim()) {
      return c.json({ message: '비밀번호가 올바르지 않습니다.' }, 401);
    }

    const payload = { username: user.username, nickname: user.nickname, role: user.role, avatar: user.avatar || '48171151' };
    const token = await sign(payload, secret);
    return c.json({ token, role: user.role, nickname: user.nickname, avatar: user.avatar || '48171151' });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// GET /api/auth/verify - 토큰 검증
app.get('/auth/verify', async (c) => {
  const user = await getAuthUser(c);
  if (user) {
    return c.json({ valid: true, user });
  } else {
    return c.json({ valid: false, message: '유효하지 않거나 만료된 토큰입니다.' }, 401);
  }
});

// GET /api/auth/users - 가입된 회원 목록 (관리자 전용)
app.get('/auth/users', adminMiddleware, async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT username, nickname, role FROM users').all();
    return c.json(results);
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// DELETE /api/auth/users/:username - 회원 탈퇴 처리 (관리자 전용)
app.delete('/auth/users/:username', adminMiddleware, async (c) => {
  try {
    const username = c.req.param('username');
    if (username === 'admin') {
      return c.json({ message: '관리자 계정은 삭제할 수 없습니다.' }, 400);
    }

    const user = await c.env.DB.prepare('SELECT username FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (!user) {
      return c.json({ message: '존재하지 않는 회원입니다.' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM users WHERE username = ?')
      .bind(username)
      .run();

    return c.json({ message: '회원이 성공적으로 강제 탈퇴 처리되었습니다.' });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// GET /api/auth/random-card - 우회용 랜덤 카드 가져오기
app.get('/auth/random-card', async (c) => {
  try {
    const randomUrl = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?num=1&offset=0&sort=random&cachebust';
    const json = await fetchJson(randomUrl);
    const card = json.data?.[0] || null;
    return c.json(card);
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// -------------------------------------------------------------
// 2. POSTS ROUTES (/api/posts)
// -------------------------------------------------------------

// GET /api/posts - 글 목록 조회
app.get('/posts', async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM posts ORDER BY createdAt DESC').all();
    const posts = results.map(row => ({
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    }));
    return c.json(posts);
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// GET /api/posts/:id - 단건 조회 (조회수 증가)
app.get('/posts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(id)
      .first();

    if (!post) {
      return c.json({ message: '게시글을 찾을 수 없습니다.' }, 404);
    }

    // 조회수 1 증가
    await c.env.DB.prepare('UPDATE posts SET views = views + 1 WHERE id = ?')
      .bind(id)
      .run();

    const updated = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(id)
      .first();

    return c.json({
      ...updated,
      tags: updated.tags ? JSON.parse(updated.tags) : []
    });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// POST /api/posts - 글 작성
app.post('/posts', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { title, content, category, tags } = await c.req.json();

    if (!title || !content) {
      return c.json({ message: 'title, content 는 필수입니다.' }, 400);
    }

    const id = 'post_' + Math.random().toString(36).substring(2, 11);
    const postData = {
      id,
      title,
      content,
      author: user.nickname || '익명',
      authorId: user.username,
      category: category || '덱 리스트',
      tags: JSON.stringify(Array.isArray(tags) ? tags : []),
      likes: 0,
      views: 0,
      createdAt: new Date().toISOString()
    };

    await c.env.DB.prepare(
      'INSERT INTO posts (id, title, content, author, authorId, category, tags, likes, views, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(
        postData.id,
        postData.title,
        postData.content,
        postData.author,
        postData.authorId,
        postData.category,
        postData.tags,
        postData.likes,
        postData.views,
        postData.createdAt
      )
      .run();

    return c.json({ id }, 201);
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// PUT /api/posts/:id - 글 수정
app.put('/posts/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');
    const { title, content, category, tags } = await c.req.json();

    const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(id)
      .first();

    if (!post) {
      return c.json({ message: '게시글을 찾을 수 없습니다.' }, 404);
    }

    if (user.role !== 'admin' && post.authorId !== user.username) {
      return c.json({ message: '자신의 글만 수정할 수 있습니다.' }, 403);
    }

    const updatedTitle = title !== undefined ? title : post.title;
    const updatedContent = content !== undefined ? content : post.content;
    const updatedCategory = category !== undefined ? category : post.category;
    const updatedTags = tags !== undefined ? JSON.stringify(Array.isArray(tags) ? tags : []) : post.tags;

    await c.env.DB.prepare('UPDATE posts SET title = ?, content = ?, category = ?, tags = ? WHERE id = ?')
      .bind(updatedTitle, updatedContent, updatedCategory, updatedTags, id)
      .run();

    return c.json({ message: '글이 성공적으로 수정되었습니다.' });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// DELETE /api/posts/:id - 글 삭제
app.delete('/posts/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id = c.req.param('id');

    const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(id)
      .first();

    if (!post) {
      return c.json({ message: '게시글을 찾을 수 없습니다.' }, 404);
    }

    if (user.role !== 'admin' && post.authorId !== user.username) {
      return c.json({ message: '자신의 글만 삭제할 수 있습니다.' }, 403);
    }

    // 하위 댓글 및 글 데이터 삭제
    await c.env.DB.prepare('DELETE FROM comments WHERE postId = ?').bind(id).run();
    await c.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

    return c.json({ message: '글과 댓글이 성공적으로 삭제되었습니다.' });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// POST /api/posts/:id/like - 좋아요 카운트 증가 (24시간 IP 제한)
app.post('/posts/:id/like', async (c) => {
  try {
    const id = c.req.param('id');
    const post = await c.env.DB.prepare('SELECT * FROM posts WHERE id = ?')
      .bind(id)
      .first();

    if (!post) {
      return c.json({ message: '게시글을 찾을 수 없습니다.' }, 404);
    }

    // Cloudflare Connecting IP 구하기
    const rawIp = c.req.header('CF-Connecting-IP') || '127.0.0.1';
    const cleanIp = rawIp.replace(/[^a-zA-Z0-9]/g, '_');
    const logDocId = `${id}_${cleanIp}`;

    const log = await c.env.DB.prepare('SELECT * FROM likes_log WHERE id = ?')
      .bind(logDocId)
      .first();

    if (log) {
      const likedAt = new Date(log.likedAt);
      const now = new Date();
      const diff = now.getTime() - likedAt.getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      if (diff < oneDay) {
        const timeLeftMs = oneDay - diff;
        const hoursLeft = Math.ceil(timeLeftMs / (1000 * 60 * 60));
        return c.json({
          message: `이미 이 게시글에 좋아요를 누르셨습니다. ${hoursLeft}시간 후에 다시 누를 수 있습니다.`
        }, 400);
      }
    }

    // 좋아요 이력 저장 (INSERT OR REPLACE)
    const nowStr = new Date().toISOString();
    await c.env.DB.prepare('INSERT OR REPLACE INTO likes_log (id, postId, ip, likedAt) VALUES (?, ?, ?, ?)')
      .bind(logDocId, id, rawIp, nowStr)
      .run();

    // 좋아요 카운터 1 증가
    await c.env.DB.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?')
      .bind(id)
      .run();

    const updated = await c.env.DB.prepare('SELECT likes FROM posts WHERE id = ?')
      .bind(id)
      .first();

    return c.json({ likes: updated.likes });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// -------------------------------------------------------------
// 3. COMMENTS ROUTES (/api/posts/:postId/comments)
// -------------------------------------------------------------

// GET /api/posts/:postId/comments - 댓글 목록 조회
app.get('/posts/:postId/comments', async (c) => {
  try {
    const postId = c.req.param('postId');
    const { results } = await c.env.DB.prepare('SELECT * FROM comments WHERE postId = ? ORDER BY createdAt ASC')
      .bind(postId)
      .all();

    const comments = results.map(row => ({
      id: row.id,
      author: row.author,
      content: row.content,
      avatar: row.avatar,
      createdAt: row.createdAt
    }));

    return c.json(comments);
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// POST /api/posts/:postId/comments - 댓글 작성
app.post('/posts/:postId/comments', async (c) => {
  try {
    const postId = c.req.param('postId');
    const { author, content, password, avatar } = await c.req.json();

    if (!author || !content || !password) {
      return c.json({ message: 'author, content, password 는 필수입니다.' }, 400);
    }

    const post = await c.env.DB.prepare('SELECT id FROM posts WHERE id = ?')
      .bind(postId)
      .first();

    if (!post) {
      return c.json({ message: '게시글을 찾을 수 없습니다.' }, 404);
    }

    let finalAvatar = avatar;
    if (!finalAvatar) {
      finalAvatar = await getRandomCardId();
    }

    // 비밀번호 bcrypt 해싱
    const passwordHash = await bcrypt.hash(password, 10);
    const id = 'comment_' + Math.random().toString(36).substring(2, 11);
    const nowStr = new Date().toISOString();

    await c.env.DB.prepare(
      'INSERT INTO comments (id, postId, author, content, avatar, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
      .bind(id, postId, author, content, finalAvatar, passwordHash, nowStr)
      .run();

    return c.json({ id }, 201);
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// PUT /api/posts/:postId/comments/:commentId - 댓글 수정
app.put('/posts/:postId/comments/:commentId', async (c) => {
  try {
    const { postId, commentId } = c.req.param();
    const { content, password } = await c.req.json();

    if (!content) {
      return c.json({ message: 'content 는 필수입니다.' }, 400);
    }

    const comment = await c.env.DB.prepare('SELECT * FROM comments WHERE id = ? AND postId = ?')
      .bind(commentId, postId)
      .first();

    if (!comment) {
      return c.json({ message: '댓글을 찾을 수 없습니다.' }, 404);
    }

    // 어드민 토큰 체크
    const user = await getAuthUser(c);
    const isAdmin = user && user.role === 'admin';

    if (!isAdmin) {
      if (!password) {
        return c.json({ message: '비밀번호를 입력해 주세요.' }, 400);
      }
      const match = await bcrypt.compare(password, comment.passwordHash || '');
      if (!match) {
        return c.json({ message: '비밀번호가 일치하지 않습니다.' }, 403);
      }
    }

    await c.env.DB.prepare('UPDATE comments SET content = ? WHERE id = ?')
      .bind(content, commentId)
      .run();

    return c.json({ message: '댓글이 수정되었습니다.' });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// DELETE /api/posts/:postId/comments/:commentId - 댓글 삭제
app.delete('/posts/:postId/comments/:commentId', async (c) => {
  try {
    const { postId, commentId } = c.req.param();
    // DELETE 요청 시 request body에서 password 추출 가능
    const { password } = await c.req.json().catch(() => ({}));

    const comment = await c.env.DB.prepare('SELECT * FROM comments WHERE id = ? AND postId = ?')
      .bind(commentId, postId)
      .first();

    if (!comment) {
      return c.json({ message: '댓글을 찾을 수 없습니다.' }, 404);
    }

    const user = await getAuthUser(c);
    const isAdmin = user && user.role === 'admin';

    if (!isAdmin) {
      if (!password) {
        return c.json({ message: '비밀번호를 입력해 주세요.' }, 400);
      }
      const match = await bcrypt.compare(password, comment.passwordHash || '');
      if (!match) {
        return c.json({ message: '비밀번호가 일치하지 않습니다.' }, 403);
      }
    }

    await c.env.DB.prepare('DELETE FROM comments WHERE id = ?').bind(commentId).run();
    return c.json({ message: '댓글이 성공적으로 삭제되었습니다.' });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// -------------------------------------------------------------
// 4. SETTINGS ROUTES (/api/settings)
// -------------------------------------------------------------

const DEFAULT_SETTINGS = {
  blogTitle: "마술사 덱 노트",
  logoEmoji: "🃏",
  logoImageUrl: "",
  subtitle: "유희왕 마술사 계열 덱 구성, 매치업, 전략을 기록하는 덱 노트"
};

// GET /api/settings - 블로그 설정 조회
app.get('/settings', async (c) => {
  try {
    const row = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('config')
      .first();

    if (!row) {
      return c.json(DEFAULT_SETTINGS);
    }
    const settingsVal = JSON.parse(row.value);
    return c.json({ ...DEFAULT_SETTINGS, ...settingsVal });
  } catch (err) {
    return c.json(DEFAULT_SETTINGS);
  }
});

// PUT /api/settings - 설정 업데이트 (관리자 전용)
app.put('/settings', adminMiddleware, async (c) => {
  try {
    const { blogTitle, logoEmoji, logoImageUrl, subtitle } = await c.req.json();

    const currentConfigRow = await c.env.DB.prepare('SELECT value FROM settings WHERE key = ?')
      .bind('config')
      .first();

    const current = currentConfigRow ? JSON.parse(currentConfigRow.value) : {};

    const updateData = {
      blogTitle: blogTitle || current.blogTitle || DEFAULT_SETTINGS.blogTitle,
      logoEmoji: logoEmoji || current.logoEmoji || DEFAULT_SETTINGS.logoEmoji,
      logoImageUrl: logoImageUrl !== undefined ? logoImageUrl : (current.logoImageUrl || DEFAULT_SETTINGS.logoImageUrl),
      subtitle: subtitle !== undefined ? subtitle : (current.subtitle || DEFAULT_SETTINGS.subtitle)
    };

    await c.env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .bind('config', JSON.stringify(updateData))
      .run();

    return c.json({ message: '설정이 성공적으로 저장되었습니다.', settings: updateData });
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

// -------------------------------------------------------------
// 5. UPLOADS (R2 integration on POST /api/upload)
// -------------------------------------------------------------

// POST /api/upload - 이미지 업로드 (관리자 전용)
app.post('/upload', adminMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.image; // Hono File object

    if (!file) {
      return c.json({ error: '파일이 업로드되지 않았습니다.' }, 400);
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMime.includes(file.type)) {
      return c.json({ error: '지원하지 않는 파일 형식입니다. (jpg, png, gif, webp만 가능)' }, 400);
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const filename = `img-${uniqueSuffix}.${ext}`;

    // Cloudflare R2 버킷에 업로드
    await c.env.MY_BUCKET.put(filename, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    const imageUrl = `/uploads/${filename}`;
    return c.json({ url: imageUrl });
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// -------------------------------------------------------------
// 6. CARDS ROUTES (/api/cards)
// -------------------------------------------------------------

const hasKorean = (str) => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(str);

// GET /api/cards/:cardName - 카드 정보 조회 및 캐싱 (100개 제한 LRU 알고리즘)
app.get('/cards/:cardName', async (c) => {
  try {
    const cardName = c.req.param('cardName');
    const docId = cardName;

    // 1. D1 캐시 데이터 확인
    const cachedRow = await c.env.DB.prepare('SELECT cardData FROM cards_cache WHERE cardName = ?')
      .bind(docId)
      .first();

    if (cachedRow) {
      // 캐시가 있다면 접근 일시 업데이트 후 즉시 반환
      await c.env.DB.prepare('UPDATE cards_cache SET lastAccessedAt = ? WHERE cardName = ?')
        .bind(Date.now(), docId)
        .run();
      return c.json(JSON.parse(cachedRow.cardData));
    }

    // 2. 캐시에 없는 경우 번역 및 데이터 조회
    let queryName = cardName;
    let descKo = null;
    let nameKo = null;
    let namuwikiPage = null;

    if (hasKorean(cardName)) {
      const localEnglish = KOREAN_CARD_MAP[cardName];
      if (localEnglish) {
        queryName = localEnglish;
        nameKo = cardName;
        try {
          const resolved = await translateViaNamuwiki(cardName);
          if (resolved && resolved.descKo) {
            descKo = resolved.descKo;
            namuwikiPage = resolved.resolvedPage;
          }
        } catch (e) {}
      } else {
        const resolved = await translateViaNamuwiki(cardName);
        if (resolved && resolved.englishName) {
          queryName = resolved.englishName;
          descKo = resolved.descKo;
          nameKo = cardName;
          namuwikiPage = resolved.resolvedPage;
        } else {
          return c.json({ message: '카드를 찾을 수 없습니다.' }, 404);
        }
      }
    } else {
      let foundKoName = null;
      for (const [ko, en] of Object.entries(KOREAN_CARD_MAP)) {
        if (en.toLowerCase() === cardName.toLowerCase()) {
          if (!foundKoName || ko.length > foundKoName.length) {
            foundKoName = ko;
          }
        }
      }
      if (foundKoName) {
        nameKo = foundKoName;
        try {
          const resolved = await translateViaNamuwiki(foundKoName);
          if (resolved && resolved.descKo) {
            descKo = resolved.descKo;
            namuwikiPage = resolved.resolvedPage;
          }
        } catch (e) {}
      } else {
        const yugipediaKoName = await translateEnglishToKorean(cardName);
        if (yugipediaKoName) {
          nameKo = yugipediaKoName;
          try {
            const resolved = await translateViaNamuwiki(yugipediaKoName);
            if (resolved && resolved.descKo) {
              descKo = resolved.descKo;
              namuwikiPage = resolved.resolvedPage;
            }
          } catch (e) {}
        }
      }
    }

    // 3. YGOPRODeck API 호출
    const ygoproUrl = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(queryName)}&cachebust`;
    const json = await fetchJson(ygoproUrl);
    const cardData = json.data?.[0];

    if (!cardData) {
      return c.json({ message: '카드를 찾을 수 없습니다.' }, 404);
    }

    if (descKo) cardData.desc_ko = descKo;
    if (nameKo) cardData.name_ko = nameKo;
    if (namuwikiPage) cardData.namuwiki_page = namuwikiPage;

    // 4. 캐시 개수 100개 제한 (LRU 구현)
    const { count } = await c.env.DB.prepare('SELECT count(*) as count FROM cards_cache').first();
    if (count >= 100) {
      // 가장 과거에 접속한(lastAccessedAt 최솟값) 데이터 1건 삭제
      const oldest = await c.env.DB.prepare('SELECT cardName FROM cards_cache ORDER BY lastAccessedAt ASC LIMIT 1').first();
      if (oldest) {
        await c.env.DB.prepare('DELETE FROM cards_cache WHERE cardName = ?').bind(oldest.cardName).run();
      }
    }

    // 5. 캐시에 데이터 저장
    await c.env.DB.prepare('INSERT INTO cards_cache (cardName, cardData, lastAccessedAt) VALUES (?, ?, ?)')
      .bind(docId, JSON.stringify(cardData), Date.now())
      .run();

    return c.json(cardData);
  } catch (err) {
    return c.json({ message: err.message }, 500);
  }
});

export const onRequest = handle(app);
