import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createPost, getPost, updatePost, uploadImage } from '../api';
import { useBlog } from '../App';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { KOREAN_CARD_MAP } from '../utils/cardMap';
import styles from './WritePage.module.css';

export default function WritePage() {
  const { id } = useParams();
  const { isLoggedIn, user, isAdmin } = useBlog();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('덱 리스트');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingPost, setFetchingPost] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showBookmark, setShowBookmark] = useState(true);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [cardSearchResults, setCardSearchResults] = useState([]);

  // 카드 검색 실시간 필터링
  useEffect(() => {
    const query = cardSearchQuery.trim().toLowerCase();
    if (!query) {
      setCardSearchResults([]);
      return;
    }

    const keys = Object.keys(KOREAN_CARD_MAP);
    const matched = keys.filter(
      (key) => key.toLowerCase().includes(query) || KOREAN_CARD_MAP[key].toLowerCase().includes(query)
    );
    const uniqueMatched = Array.from(new Set(matched)).slice(0, 10);
    setCardSearchResults(uniqueMatched);
  }, [cardSearchQuery]);

  // 본문 커서 위치에 텍스트 삽입 헬퍼
  const insertText = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + textToInsert);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.slice(0, start) + textToInsert + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + textToInsert.length;
      textarea.selectionEnd = start + textToInsert.length;
    }, 0);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  useEffect(() => {
    if (id && user) {
      setFetchingPost(true);
      getPost(id)
          .then((post) => {
            // 작성자 본인이나 어드민만 수정 가능
            if (user.role !== 'admin' && post.authorId !== user.username) {
              navigate('/');
              return;
            }
            setTitle(post.title || '');
            setContent(post.content || '');
            setCategory(post.category || '덱 리스트');
          })
          .catch((err) => setError(err.message))
          .finally(() => setFetchingPost(false));
    }
  }, [id, user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setError('');

    const postData = {
      title: title.trim(),
      content: content.trim(),
      category: category.trim(),
      tags: [],
      author: 'Lyw',
    };

    try {
      if (id) {
        await updatePost(id, postData);
        navigate(`/posts/${id}`);
      } else {
        const { id: newId } = await createPost(postData);
        navigate(`/posts/${newId}`);
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  // 이미지 업로드 처리 — 업로드 후 마크다운 삽입
  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const { url } = await uploadImage(file);
      const backendBase = 'http://localhost:4000';
      const fullUrl = `${backendBase}${url}`;
      const markdownImg = `\n![이미지](${fullUrl})\n`;

      // 커서 위치에 삽입
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.slice(0, start) + markdownImg + content.slice(end);
        setContent(newContent);
        // 커서를 삽입 뒤로 이동
        setTimeout(() => {
          textarea.selectionStart = start + markdownImg.length;
          textarea.selectionEnd = start + markdownImg.length;
          textarea.focus();
        }, 0);
      } else {
        setContent((prev) => prev + markdownImg);
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      // 같은 파일 재선택 허용
      e.target.value = '';
    }
  }

  // 드래그 앤 드롭 지원
  async function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    setUploading(true);
    setUploadError('');
    try {
      const { url } = await uploadImage(file);
      const backendBase = 'http://localhost:4000';
      const fullUrl = `${backendBase}${url}`;
      const markdownImg = `\n![이미지](${fullUrl})\n`;
      setContent((prev) => prev + markdownImg);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  // 클립보드 붙여넣기 이미지 지원 (Ctrl+V)
  async function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        setUploading(true);
        setUploadError('');
        try {
          const { url } = await uploadImage(file);
          const backendBase = 'http://localhost:4000';
          const fullUrl = `${backendBase}${url}`;
          const markdownImg = `\n![이미지](${fullUrl})\n`;

          const textarea = textareaRef.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.slice(0, start) + markdownImg + content.slice(end);
            setContent(newContent);
            setTimeout(() => {
              textarea.selectionStart = start + markdownImg.length;
              textarea.selectionEnd = start + markdownImg.length;
              textarea.focus();
            }, 0);
          } else {
            setContent((prev) => prev + markdownImg);
          }
        } catch (err) {
          setUploadError(err.message);
        } finally {
          setUploading(false);
        }
        return; // 첫 번째 이미지만 처리
      }
    }
  }

  if (fetchingPost) return <div className={styles.status}>글 정보를 불러오고 있습니다...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to={id ? `/posts/${id}` : '/'} className={styles.back}>
          ← 취소
        </Link>
        <h2 className={styles.heading}>{id ? '글 수정하기' : '새 글 작성하기'}</h2>
        <button
          type="button"
          className={styles.bookmarkToggle}
          onClick={() => setShowBookmark(!showBookmark)}
        >
          <span className="emoji-gray">📖</span> {showBookmark ? '책갈피 숨기기' : '명령어 책갈피'}
        </button>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>카테고리</label>
          <select
            className={styles.select}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="덱 리스트">덱 리스트</option>
            <option value="공략">공략</option>
            <option value="마스터듀얼">마스터듀얼</option>
            <option value="사담">사담</option>
          </select>
        </div>

        <div className={styles.formGroup}>
          <input
            type="text"
            className={`${styles.input} ${styles.titleInput}`}
            placeholder="제목을 입력해 주세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
          />
        </div>

        {/* 이미지 업로드 툴바 */}
        <div className={styles.imageToolbar}>
          <button
            type="button"
            className={styles.imageUploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><span className="emoji-gray">⏳</span> 업로드 중...</>
            ) : (
              <><span className="emoji-gray">🖼️</span> 사진 첨부</>
            )}
          </button>
          <span className={styles.imageHint}>
            이미지: 클릭 · 드래그&드롭 · <kbd className={styles.kbd}>Ctrl+V</kbd> / <span className="emoji-gray">💡</span> 팁: 본문에 <code>[[카드이름]]</code>을 쓰면 자동 유희왕 카드 링크가 적용됩니다.
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />
        </div>
        {uploadError && <p className={styles.uploadError}>⚠️ {uploadError}</p>}

        <div className={styles.layoutWrapper}>
          {showBookmark && (
          <aside className={`${styles.bookmarkPanel} glass-panel`}>
            <h3 className={styles.bookmarkTitle}>📖 명령어 책갈피</h3>
            
            {/* 🔍 카드 검색 삽입 단축 도구 */}
            <div className={styles.bookmarkGroup}>
              <span className={styles.bookmarkGroupLabel}>🔍 카드 검색 삽입</span>
              <input
                type="text"
                className={styles.cardSearchField}
                placeholder="한글/영문 카드이름..."
                value={cardSearchQuery}
                onChange={(e) => setCardSearchQuery(e.target.value)}
              />
              {cardSearchResults.length > 0 && (
                <div className={styles.searchResultsList}>
                  {cardSearchResults.map((cardName) => (
                    <button
                      key={cardName}
                      type="button"
                      className={styles.searchResultBtn}
                      onClick={() => {
                        insertText(`[[${cardName}]]`);
                        setCardSearchQuery('');
                      }}
                      title={KOREAN_CARD_MAP[cardName]}
                    >
                      {cardName}
                    </button>
                  ))}
                </div>
              )}
              {cardSearchQuery && cardSearchResults.length === 0 && (
                <button
                  type="button"
                  className={styles.bookmarkBtn}
                  onClick={() => {
                    insertText(`[[${cardSearchQuery}]]`);
                    setCardSearchQuery('');
                  }}
                >
                  "{cardSearchQuery}" 직접 삽입
                </button>
              )}
            </div>
            
            <div className={styles.bookmarkGroup}>
                <span className={styles.bookmarkGroupLabel}>덱 리스트 템플릿</span>
                <button
                  type="button"
                  className={styles.bookmarkBtn}
                  onClick={() => insertText("```decklist\n# 메인 덱\n조현의 마술사 x3\n혜안의 마술사 x3\n자독의 마술사 x3\n우라라 x3\n증식의 G x3\n무덤의 지명자 x2\n\n# 엑스트라 덱\n별새김의 마술사 x1\n```")}
                >
                  덱 리스트 틀 삽입
                </button>
              </div>

              <div className={styles.bookmarkGroup}>
                <span className={styles.bookmarkGroupLabel}>자주 쓰는 카드 링크</span>
                <div className={styles.cardBtnGrid}>
                  {['조현의 마술사', '혜안의 마술사', '자독의 마술사', '홍채의 마술사', '아스트로그래프 마술사', '하루 우라라', '증식의 G', '무덤의 지명자', '말살의 지명자', '무한포영', '이펙트 뵐러', '원시생명체 니비루'].map(cardName => (
                    <button
                      key={cardName}
                      type="button"
                      className={styles.cardMiniBtn}
                      onClick={() => insertText(`[[${cardName}]]`)}
                    >
                      {cardName.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.bookmarkGroup}>
                <span className={styles.bookmarkGroupLabel}>마크다운 서식</span>
                <div className={styles.cardBtnGrid}>
                  <button type="button" className={styles.cardMiniBtn} onClick={() => insertText('**굵은 글씨**')}>굵게</button>
                  <button type="button" className={styles.cardMiniBtn} onClick={() => insertText('*기울임*')}>기울임</button>
                  <button type="button" className={styles.cardMiniBtn} onClick={() => insertText('`한줄 코드`')}>코드</button>
                  <button type="button" className={styles.cardMiniBtn} onClick={() => insertText('[링크이름](주소)')}>링크</button>
                  <button type="button" className={styles.cardMiniBtn} onClick={() => insertText('![이미지 설명](이미지 주소)')}>이미지</button>
                  <button type="button" className={styles.cardMiniBtn} onClick={() => insertText('\n> 인용구 내용\n')}>인용</button>
                </div>
              </div>
            </aside>
          )}

          <div className={styles.mainWriteArea}>
            <div className={styles.editorContainer}>
              <div className={styles.editorPanel}>
                <label className={styles.panelLabel}>본문 작성 (Markdown 지원)</label>
                <textarea
                  ref={textareaRef}
                  className={styles.textarea}
                  placeholder="내용을 마크다운 형식으로 작성해 보세요...&#10;&#10;[💡 카드 링크 기능]&#10;본문에 [[조현의 마술사]] 처럼 입력하면 클릭 시 나무위키 문서로 이동되는 링크가 자동 적용됩니다!&#10;&#10;[🖼️ 이미지 업로드]&#10;사진 첨부 버튼, 에디터 영역에 파일 끌어놓기, 혹은 스크린샷 복사 후 붙여넣기(Ctrl+V)를 지원합니다."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={50000}
                  required
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                />
              </div>

              <div className={`${styles.previewPanel} glass-panel`}>
                <label className={styles.panelLabel}>실시간 미리보기</label>
                <div className={styles.previewScroll}>
                  {title && <h1 className={styles.previewTitle}>{title}</h1>}
                  <MarkdownRenderer content={content} />
                  {!title && !content && (
                    <p className={styles.previewPlaceholder}>작성하시는 본문이 여기에 실시간으로 표시됩니다.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.footerRow}>
          <button className="glow-btn" type="submit" disabled={loading}>
            {loading ? '등록 중…' : id ? '수정 완료' : '글 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
