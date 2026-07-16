require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const postsRouter = require('./routes/posts');
const commentsRouter = require('./routes/comments');
const uploadRouter = require('./routes/upload');
const settingsRouter = require('./routes/settings');
const cardsRouter = require('./routes/cards');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// 정적 파일 서빙 (업로드 이미지)
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 라우트
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/posts/:postId/comments', commentsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/cards', cardsRouter);

// 헬스 체크
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// 에러 핸들러
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
