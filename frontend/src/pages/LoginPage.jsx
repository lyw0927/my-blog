import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlog } from '../App';
import { loginUser } from '../api';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { setUser } = useBlog();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!username || !password) {
        throw new Error('아이디와 비밀번호를 입력해 주세요.');
      }
      const data = await loginUser(username, password);
      setUser({
        username: data.username || username,
        nickname: data.nickname,
        role: data.role,
        avatar: data.avatar || '48171151'
      });
      navigate('/');
    } catch (err) {
      setError(err.message || '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.card} glass-panel`}>
        <div className={styles.logo}>🔐</div>
        <h2 className={styles.title}>블로그 관리자 로그인</h2>
        <p className={styles.subtitle}>아이디와 비밀번호를 입력해 주세요.</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>아이디</label>
            <input
              type="text"
              className={styles.input}
              placeholder="아이디를 입력하세요"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>비밀번호</label>
            <input
              type="password"
              className={styles.input}
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button className={`${styles.button} glow-btn`} type="submit" disabled={loading}>
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}
