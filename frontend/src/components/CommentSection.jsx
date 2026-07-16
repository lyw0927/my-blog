import { useState } from 'react';
import { createComment, updateComment, deleteComment } from '../api';
import { useBlog } from '../App';
import styles from './CommentSection.module.css';

export default function CommentSection({ postId, comments, onCommentAdded }) {
  const { isAdmin, isLoggedIn, user, lang } = useBlog();

  // 작성 폼 state
  const [author, setAuthor] = useState('');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 비밀번호 모달 state
  const [modal, setModal] = useState(null); // { type: 'edit'|'delete', commentId, author }
  const [modalPassword, setModalPassword] = useState('');
  const [editContent, setEditContent] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // 다국어
  const commentLabels = {
    title: lang === 'ja' ? <><span className="emoji-gray">💬</span> コメント</> : lang === 'en' ? <><span className="emoji-gray">💬</span> Comments</> : <><span className="emoji-gray">💬</span> 댓글</>,
    nickname: lang === 'ja' ? 'ニックネーム' : lang === 'en' ? 'Nickname' : '닉네임',
    password: lang === 'ja' ? 'パスワード' : lang === 'en' ? 'Password' : '비밀번호',
    contentPlaceholder: lang === 'ja' ? 'コメントを入力してください...' : lang === 'en' ? 'Write a comment...' : '댓글 내용을 입력하세요...',
    empty: lang === 'ja' ? '最初のコメントを書いてみましょう！' : lang === 'en' ? 'Be the first to write a comment!' : '첫 번째 댓글을 작성해 보세요!',
    submit: lang === 'ja' ? '登録' : lang === 'en' ? 'Submit' : '댓글 등록',
    submitting: lang === 'ja' ? '登録中…' : lang === 'en' ? 'Submitting…' : '등록 중…',
    edit: lang === 'ja' ? '수정' : lang === 'en' ? 'Edit' : '수정',
    delete: lang === 'ja' ? '削除' : lang === 'en' ? 'Delete' : '삭제',
    enterPassword: lang === 'en' ? 'Enter password to verify' : '비밀번호를 입력하세요',
    confirm: lang === 'en' ? 'Confirm' : '확인',
    cancel: lang === 'en' ? 'Cancel' : '취소',
    editTitle: lang === 'en' ? 'Edit Comment' : '댓글 수정',
    deleteTitle: lang === 'en' ? 'Delete Comment' : '댓글 삭제',
    deleteConfirmMsg: lang === 'en' ? 'Enter your password to delete this comment.' : '비밀번호를 입력하면 댓글이 삭제됩니다.',
  };

  const formatCommentDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString(
      lang === 'ja' ? 'ja-JP' : lang === 'en' ? 'en-US' : 'ko-KR',
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    );
  };

  // 댓글 작성
  async function handleSubmit(e) {
    e.preventDefault();
    const finalAuthor = isLoggedIn ? user.nickname : author.trim();
    const finalAvatar = isLoggedIn ? (user.avatar || '48171151') : undefined;
    if (!finalAuthor || !content.trim()) return;
    // 비로그인 시 비밀번호 필수
    if (!isLoggedIn && !password.trim()) return;

    setLoading(true);
    setError('');
    try {
      await createComment(postId, {
        author: finalAuthor,
        content: content.trim(),
        password: isLoggedIn ? '_admin_bypass_' : password.trim(),
        avatar: finalAvatar,
      });
      setAuthor('');
      setPassword('');
      setContent('');
      onCommentAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // 수정 버튼 클릭 → 모달 오픈
  function openEditModal(c) {
    setModal({ type: 'edit', commentId: c.id, author: c.author });
    setEditContent(c.content);
    setModalPassword('');
    setModalError('');
  }

  // 삭제 버튼 클릭 → 어드민은 바로 삭제, 일반 사용자는 비밀번호 모달 오픈
  async function openDeleteModal(c) {
    if (isAdmin) {
      // 어드민: 비밀번호 없이 바로 삭제
      try {
        await deleteComment(postId, c.id, undefined);
        onCommentAdded();
      } catch (err) {
        alert(err.message);
      }
      return;
    }
    setModal({ type: 'delete', commentId: c.id, author: c.author });
    setModalPassword('');
    setModalError('');
  }

  function closeModal() {
    setModal(null);
    setModalPassword('');
    setEditContent('');
    setModalError('');
  }

  // 모달 확인 (수정 or 삭제)
  async function handleModalConfirm() {
    if (!modal) return;
    setModalLoading(true);
    setModalError('');
    try {
      if (modal.type === 'edit') {
        if (!editContent.trim()) { setModalError('내용을 입력해 주세요.'); setModalLoading(false); return; }
        await updateComment(postId, modal.commentId, {
          content: editContent.trim(),
          password: isAdmin ? undefined : modalPassword,
        });
      } else {
        await deleteComment(postId, modal.commentId, isAdmin ? undefined : modalPassword);
      }
      closeModal();
      onCommentAdded();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <section className={`${styles.section} glass-panel`}>
      <h3 className={styles.heading}>{commentLabels.title} {comments.length}</h3>

      {/* 댓글 목록 */}
      <ul className={styles.list}>
        {comments.map((c) => (
          <li key={c.id} className={styles.item}>
            <div className={styles.commentHeader}>
              <div className={styles.commentMeta}>
                <div className={styles.commentAvatarWrapper}>
                  <img
                    src={`https://images.ygoprodeck.com/images/cards_cropped/${c.avatar || '48171151'}.jpg`}
                    alt="profile icon"
                    className={styles.commentAvatar}
                  />
                </div>
                <span className={styles.commentAuthor}>{c.author}</span>
                <span className={styles.commentDate}>{formatCommentDate(c.createdAt)}</span>
              </div>
              <div className={styles.commentActions}>
                <button
                  className={styles.editBtn}
                  onClick={() => openEditModal(c)}
                  aria-label="Edit comment"
                >
                  {commentLabels.edit}
                </button>
                <button
                  className={styles.deleteBtn}
                  onClick={() => openDeleteModal(c)}
                  aria-label="Delete comment"
                >
                  {commentLabels.delete}
                </button>
              </div>
            </div>
            <p className={styles.commentContent}>{c.content}</p>
          </li>
        ))}
        {comments.length === 0 && <li className={styles.empty}>{commentLabels.empty}</li>}
      </ul>

      {/* 댓글 작성 폼 */}
      <form onSubmit={handleSubmit} className={styles.form}>
        {isLoggedIn ? (
          <div className={styles.loggedInInfo}>
            <div className={styles.commentAvatarWrapper} style={{ width: '28px', height: '28px' }}>
              <img
                src={`https://images.ygoprodeck.com/images/cards_cropped/${user.avatar || '48171151'}.jpg`}
                alt="my avatar"
                className={styles.commentAvatar}
              />
            </div>
            <span className={styles.loggedInUserText}>
              <strong>{user.nickname}</strong>
            </span>
          </div>
        ) : (
          <div className={styles.guestFields}>
            <div className={styles.inputs}>
              <input
                className={styles.input}
                placeholder={commentLabels.nickname}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={30}
                required
              />
              <input
                className={styles.input}
                type="password"
                placeholder={commentLabels.password}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={50}
                required
              />
            </div>
          </div>
        )}

        <textarea
          className={styles.textarea}
          placeholder={commentLabels.contentPlaceholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={500}
          required
        />
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.formActions}>
          <button className="glow-btn" type="submit" disabled={loading}>
            {loading ? commentLabels.submitting : commentLabels.submit}
          </button>
        </div>
      </form>

      {/* 비밀번호 확인 모달 */}
      {modal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.modalTitle}>
              {modal.type === 'edit' ? commentLabels.editTitle : commentLabels.deleteTitle}
            </h4>

            {modal.type === 'edit' && (
              <textarea
                className={styles.textarea}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                maxLength={500}
                style={{ marginBottom: '0.75rem' }}
              />
            )}

            {modal.type === 'delete' && (
              <p className={styles.modalDesc}>{commentLabels.deleteConfirmMsg}</p>
            )}

            {!isAdmin && (
              <input
                className={styles.input}
                type="password"
                placeholder={commentLabels.enterPassword}
                value={modalPassword}
                onChange={(e) => setModalPassword(e.target.value)}
                autoFocus
              />
            )}

            {modalError && <p className={styles.error}>{modalError}</p>}

            <div className={styles.modalActions}>
              <button
                className={`glow-btn ${modal.type === 'delete' ? styles.dangerBtn : ''}`}
                onClick={handleModalConfirm}
                disabled={modalLoading}
              >
                {modalLoading ? '처리 중…' : commentLabels.confirm}
              </button>
              <button className={styles.cancelBtn} onClick={closeModal}>
                {commentLabels.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
