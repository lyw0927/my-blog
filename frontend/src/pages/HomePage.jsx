import { useEffect, useState } from 'react';
import { getPosts } from '../api';
import PostCard from '../components/PostCard';
import ProfileCard from '../components/ProfileCard';
import { useBlog } from '../App';
import { TRANSLATIONS } from '../utils/i18n';
import styles from './HomePage.module.css';

export default function HomePage() {
  const { settings, lang } = useBlog();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, views, likes
  
  // 내부 카테고리 필터링은 기존 데이터 모델과 일치시키기 위해 한글 값을 기준으로 유지하고, 출력 시에만 번역합니다.
  const [activeCategory, setActiveCategory] = useState('전체');
  const CATEGORIES = ['전체', '덱 리스트', '공략', '마스터듀얼', '사담'];

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ko;

  // 카테고리 번역 매퍼
  const getCategoryTranslation = (cat) => {
    switch (cat) {
      case '전체': return t.all;
      case '덱 리스트': return t.decklist;
      case '공략': return t.guide;
      case '마스터듀얼': return t.masterduel;
      case '사담': return t.sadam;
      default: return cat;
    }
  };

  useEffect(() => {
    getPosts()
      .then((data) => {
        setPosts(data);
        setFilteredPosts(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // 필터, 검색, 정렬 처리 로직
  useEffect(() => {
    let result = posts;

    // 카테고리 필터링
    if (activeCategory !== '전체') {
      result = result.filter((p) => p.category === activeCategory);
    }

    // 검색어 필터링 (제목으로만 검색)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) => p.title?.toLowerCase().includes(query));
    }

    // 정렬 로직
    result = [...result].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      } else if (sortBy === 'views') {
        return (b.views || 0) - (a.views || 0);
      } else if (sortBy === 'likes') {
        return (b.likes || 0) - (a.likes || 0);
      }
      return 0;
    });

    setFilteredPosts(result);
  }, [searchQuery, activeCategory, sortBy, posts]);

  // 다국어 기본 타이틀 및 서브타이틀 바인딩
  let displayTitle = settings.blogTitle || '마술사 덱 노트';
  let displaySubtitle = settings.subtitle || t.subtitle;
  if (lang === 'en') {
    displayTitle = "Magician Deck Notes";
    displaySubtitle = "Yu-Gi-Oh Magician Decklists, Matchups, and Strategy Notes";
  } else if (lang === 'ja') {
    displayTitle = "魔術師デッキノート";
    displaySubtitle = "遊戯王魔術師デッキレシピ、対面、戦略を記録するデッキノート";
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>{displayTitle}</h1>
        <p className={styles.subtitle}>{displaySubtitle}</p>
      </header>

      <div className={styles.layout}>
        <main className={styles.mainFeed}>
          {/* 필터 및 검색 표시 바 */}
          <div className={`${styles.filterBar} glass-panel`}>
            <div className={styles.categories}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`${styles.catBtn} ${activeCategory === cat ? styles.activeCat : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {getCategoryTranslation(cat)}
                </button>
              ))}
            </div>

            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchField}
              />
              {searchQuery && (
                <button
                  type="button"
                  className={styles.clearSearch}
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 정렬 필터 바 */}
          <div className={styles.sortBar}>
            <button
              className={`${styles.sortBtn} ${sortBy === 'newest' ? styles.activeSort : ''}`}
              onClick={() => setSortBy('newest')}
            >
              {t.newest}
            </button>
            <button
              className={`${styles.sortBtn} ${sortBy === 'oldest' ? styles.activeSort : ''}`}
              onClick={() => setSortBy('oldest')}
            >
              {t.oldest}
            </button>
            <button
              className={`${styles.sortBtn} ${sortBy === 'views' ? styles.activeSort : ''}`}
              onClick={() => setSortBy('views')}
            >
              {t.views}
            </button>
            <button
              className={`${styles.sortBtn} ${sortBy === 'likes' ? styles.activeSort : ''}`}
              onClick={() => setSortBy('likes')}
            >
              {t.likes}
            </button>
          </div>

          {loading && <div className={styles.status}>Loading...</div>}
          {error && <div className={styles.error}>{error}</div>}

          {!loading && filteredPosts.length === 0 && (
            <div className={styles.noPosts}>{t.noPosts}</div>
          )}

          <div className={styles.feed}>
            {filteredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
