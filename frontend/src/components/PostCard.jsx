import { Link } from 'react-router-dom';
import styles from './PostCard.module.css';

export default function PostCard({ post }) {
  const cleanPreview = post.content
    ?.replace(/[#*`\[\]\(\)\-_>]/g, ' ') // Strip markdown syntax characters
    ?.replace(/\s+/g, ' ') // Collapse spaces
    ?.slice(0, 140) || '';

  // Estimate reading time: ~200 Korean characters per minute
  const readingTime = Math.max(1, Math.ceil((post.content?.length || 0) / 200));

  return (
    <article className={`${styles.card} glass-panel`}>
      <div className={styles.header}>
        <span className={styles.category}>{post.category || 'General'}</span>
        <span className={styles.readTime}>{readingTime}분 분량</span>
      </div>

      <Link to={`/posts/${post.id}`} className={styles.titleLink}>
        <h2 className={styles.title}>{post.title}</h2>
      </Link>

      <p className={styles.preview}>
        {cleanPreview}
        {post.content?.length > 140 ? '…' : ''}
      </p>

      <div className={styles.footer}>
        <div className={styles.meta}>
          <span className={styles.author}>{post.author}</span>
          <span className={styles.divider}>•</span>
          <span className={styles.date}>
            {post.createdAt ? new Date(post.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : ''}
          </span>
        </div>
        <div className={styles.likes}>
          <span className={styles.viewsCount} style={{ marginRight: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <span className="emoji-gray">👁️</span> {post.views ?? 0}
          </span>
          <span className={styles.heart}><span className="emoji-gray">❤️</span></span> {post.likes ?? 0}
        </div>
      </div>
    </article>
  );
}
