const { verify } = require('../routes/jwtHelper');
const JWT_SECRET = process.env.JWT_SECRET || 'my-blog-jwt-secret-key-12345';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '인증 권한이 없습니다. (토큰 없음)' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verify(token, JWT_SECRET);

  if (!decoded) {
    return res.status(403).json({ message: '인증에 실패했습니다. (유효하지 않은 토큰)' });
  }

  req.user = decoded; // { username, nickname, role }
  next();
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
  });
}

module.exports = { authMiddleware, adminMiddleware };
