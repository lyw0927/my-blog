const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('admin_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || '요청에 실패했습니다.');
  }
  return res.json();
}

// 회원/어드민 로그인
export const loginUser = async (username, password) => {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(password !== undefined ? { username, password } : { password: username }),
  });
  if (data.token) {
    localStorage.setItem('admin_token', data.token);
  }
  return data;
};

// 회원가입
export const registerUser = (username, password, nickname, avatar) =>
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, nickname, avatar }),
  });

// 토큰 유효성 검사 (유저 정보 반환)
export const checkAdminAuth = async () => {
  const token = localStorage.getItem('admin_token');
  if (!token) return null;
  try {
    const res = await request('/auth/verify');
    return res.valid ? res.user : null;
  } catch (err) {
    localStorage.removeItem('admin_token');
    return null;
  }
};

// 로그아웃
export const logoutAdmin = () => {
  localStorage.removeItem('admin_token');
};

// 글 목록
export const getPosts = () => request('/posts');

// 글 단건
export const getPost = (id) => request(`/posts/${id}`);

// 글 작성 (어드민)
export const createPost = (data) =>
  request('/posts', { method: 'POST', body: JSON.stringify(data) });

// 글 수정 (어드민)
export const updatePost = (id, data) =>
  request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// 글 삭제 (어드민)
export const deletePost = (id) =>
  request(`/posts/${id}`, { method: 'DELETE' });

// 좋아요
export const likePost = (id) =>
  request(`/posts/${id}/like`, { method: 'POST' });

// 댓글 목록
export const getComments = (postId) => request(`/posts/${postId}/comments`);

// 댓글 작성 (parentId 옵션으로 대댓글 지원)
export const createComment = (postId, data) =>
  request(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify(data) });

// 댓글 수정 (비밀번호 검증)
export const updateComment = (postId, commentId, data) =>
  request(`/posts/${postId}/comments/${commentId}`, { method: 'PUT', body: JSON.stringify(data) });

// 댓글 삭제 (비밀번호 검증, 어드민은 우회)
export const deleteComment = (postId, commentId, password) =>
  request(`/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    body: JSON.stringify(password ? { password } : {}),
  });

// 이미지 업로드 (어드민)
export const uploadImage = async (file) => {
  const token = localStorage.getItem('admin_token');
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '업로드에 실패했습니다.');
  }
  return res.json(); // { url: '/uploads/img-xxx.jpg' }
};

// 블로그 설정 조회
export const getSettings = () => request('/settings');

// 블로그 설정 업데이트 (어드민)
export const updateSettings = (data) =>
  request('/settings', { method: 'PUT', body: JSON.stringify(data) });

// 가입된 회원 목록 조회 (어드민)
export const getUsers = () => request('/auth/users');

// 회원 강제 탈퇴 (어드민)
export const deleteUser = (username) =>
  request(`/auth/users/${username}`, { method: 'DELETE' });

// CORS 우회용 랜덤 카드 API 조회
export const getRandomCard = () => request('/auth/random-card');

// 카드 캐시용 상세 정보 조회 API
export const getCardInfo = (cardName) => request(`/cards/${encodeURIComponent(cardName)}`);
