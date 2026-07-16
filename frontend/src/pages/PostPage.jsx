import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getPost, getComments, likePost, deletePost } from '../api';
import CommentSection from '../components/CommentSection';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useBlog } from '../App';
import { TRANSLATIONS } from '../utils/i18n';
import styles from './PostPage.module.css';

export default function PostPage() {
  const { id } = useParams();
  const { isAdmin, user, lang } = useBlog();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likeLoading, setLikeLoading] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ko;

  // i18n 번역 문구 매핑
  const postLabels = {
    back: lang === 'ja' ? '← リストに戻る' : lang === 'en' ? '← Back to List' : '← 목록으로',
    edit: lang === 'ja' ? '編集' : lang === 'en' ? 'Edit' : '수정',
    delete: lang === 'ja' ? '削除' : lang === 'en' ? 'Delete' : '삭제',
    author: lang === 'ja' ? '投稿者' : lang === 'en' ? 'Author' : '작성자',
    confirmDelete: lang === 'ja' 
      ? '記事を本当に削除しますか？関連するコメントもすべて削除されます。' 
      : lang === 'en' 
      ? 'Are you sure you want to delete this post? All related comments will also be deleted.' 
      : '글을 정말 삭제하시겠습니까? 관련 댓글도 모두 삭제됩니다.'
  };

  const fetchComments = useCallback(async () => {
    try {
      const data = await getComments(id);
      setComments(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    Promise.all([getPost(id), getComments(id)])
      .then(([postData, commentsData]) => {
        setPost(postData);
        setComments(commentsData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const scrolled = (window.pageYOffset / totalScroll) * 100;
        setScrollProgress(scrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function handleLike() {
    if (likeLoading) return;
    setLikeLoading(true);
    try {
      const result = await likePost(id);
      setPost((prev) => ({ ...prev, likes: result.likes }));
    } catch (err) {
      alert(err.message);
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(postLabels.confirmDelete)) return;
    try {
      await deletePost(id);
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className={styles.status}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!post) return null;

  // 카테고리 번역
  const getCategoryTranslation = (cat) => {
    switch (cat) {
      case '전체': return t.all;
      case '덱 리스트': return t.decklist;
      case '공략': return t.guide;
      case '마스터듀얼': return t.masterduel;
      default: return cat;
    }
  };

  // 날짜 다국어 포맷 설정
  const formattedDate = post.createdAt ? new Date(post.createdAt).toLocaleDateString(
    lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'ko-KR', 
    { year: 'numeric', month: 'long', day: 'numeric' }
  ) : '';

  return (
    <div className={styles.page}>
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBar} style={{ width: `${scrollProgress}%` }}></div>
      </div>

      <header className={styles.header}>
        <Link to="/" className={styles.back}>
          {postLabels.back}
        </Link>
        
        {(isAdmin || (user && post.authorId === user.username)) && (
          <div className={styles.adminActions}>
            <Link to={`/write/${post.id}`} className={styles.editBtn}>
              {postLabels.edit}
            </Link>
            <button onClick={handleDelete} className={styles.deleteBtn}>
              {postLabels.delete}
            </button>
          </div>
        )}
      </header>

      <article className={`${styles.article} glass-panel`}>
        <div className={styles.metaRow}>
          <span className={styles.category}>{getCategoryTranslation(post.category)}</span>
          <span className={styles.divider} style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>•</span>
          <span className={styles.date}>{formattedDate}</span>
          <span className={styles.divider} style={{ margin: '0 0.5rem', color: 'var(--text-muted)' }}>•</span>
          <span className={styles.views} style={{ color: 'var(--text-muted)' }}>
            <span className="emoji-gray">👁️</span> {post.views ?? 0}
          </span>
        </div>

        <h1 className={styles.title}>{post.title}</h1>

        <div className={styles.authorSection}>
          <span className={styles.author}>{postLabels.author}: {post.author}</span>
        </div>

        <div className={styles.content}>
          <MarkdownRenderer content={post.content} />
        </div>

        <div className={styles.feedbackSection}>
          <button
            className={`${styles.likeBtn} ${post.likes > 0 ? styles.hasLikes : ''}`}
            onClick={handleLike}
            disabled={likeLoading}
            aria-label="Like"
          >
            <span className={styles.heartIcon}><span className="emoji-gray">❤️</span></span>
            <span className={styles.likeCount}>{post.likes ?? 0}</span>
          </button>
        </div>
      </article>

      <CommentSection
        postId={id}
        comments={comments}
        onCommentAdded={fetchComments}
      />
    </div>
  );
}
