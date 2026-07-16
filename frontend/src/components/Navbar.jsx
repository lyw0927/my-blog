import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBlog } from '../App';
import { logoutAdmin, getRandomCard } from '../api';
import { TRANSLATIONS } from '../utils/i18n';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, setUser, isAdmin, isLoggedIn, theme, toggleTheme, settings, lang, changeLanguage } = useBlog();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [frontImageUrl, setFrontImageUrl] = useState(settings.logoImageUrl || '');
  const [cardLoading, setCardLoading] = useState(false);

  // settings.logoImageUrl 변경 시 알 맞추기
  useEffect(() => {
    setFrontImageUrl(settings.logoImageUrl || '');
  }, [settings.logoImageUrl]);

  useEffect(() => {
    setImgError(false);
  }, [settings.logoImageUrl]);

  // 카드 클릭 핸들러: 앞면→뒷면 or 뒷면→랜덤카드 새알면
  const handleCardClick = async (e) => {
    e.preventDefault();
    if (cardLoading) return;
    if (!cardFlipped) {
      // 앞면 오픈 상태에서 클릭 → 뒷면으로
      setCardFlipped(true);
    } else {
      // 뒷면 오픈 상태에서 클릭 → 랜덤 카드 fetch 후 앞면으로
      setCardLoading(true);
      try {
        const data = await getRandomCard();
        const img = data?.card_images?.[0]?.image_url_small || data?.card_images?.[0]?.image_url;
        if (img) setFrontImageUrl(img);
      } catch { /* 실패 시 기존 이미지 유지 */ }
      finally { setCardLoading(false); }
      setCardFlipped(false);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    setUser(null);
    navigate('/');
  };

  const hasLogoImage = settings.logoImageUrl && settings.logoImageUrl.trim() !== '' && !imgError;
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ko;

  // 다국어 블로그 제목 계산
  let displayTitle = settings.blogTitle || '마술사 덱 노트';
  if (lang === 'en') {
    displayTitle = "Magician Deck Notes";
  } else if (lang === 'ja') {
    displayTitle = "魔術師デッキノート";
  }

  return (
    <nav className={`${styles.navbar} glass-panel`}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          {(frontImageUrl || settings.logoImageUrl) && !imgError ? (
            <span
              className={`${styles.cardFlipWrapper} ${cardFlipped ? styles.cardFlipped : ''} ${cardLoading ? styles.cardLoading : ''}`}
              onClick={handleCardClick}
              title={cardFlipped ? '클릭하면 랜덤 카드!' : '클릭해보세요!'}
            >
              <span className={styles.cardFace}>
                <img
                  src={frontImageUrl || settings.logoImageUrl}
                  alt="Logo Card"
                  onError={() => setImgError(true)}
                  className={styles.logoCardImg}
                />
              </span>
              <span className={styles.cardBack}>
                <img
                  src="https://ms.yugipedia.com//thumb/e/e5/Back-EN.png/200px-Back-EN.png"
                  alt="Card Back"
                  className={styles.logoCardImg}
                />
              </span>
            </span>
          ) : (
            <span className={styles.logoEmoji}>{settings.logoEmoji || '🃏'}</span>
          )}
          <span className={styles.logoText}>{displayTitle}</span>
        </Link>

        <div className={styles.actions}>
          {/* 언어 스위처 */}
          <select 
            value={lang} 
            onChange={(e) => changeLanguage(e.target.value)} 
            className={styles.langSelect}
            aria-label="Language"
          >
            <option value="ko">KO</option>
            <option value="en">EN</option>
            <option value="ja">JA</option>
          </select>

          <button
            className={styles.themeBtn}
            onClick={toggleTheme}
            aria-label="테마 전환"
            title={theme === 'dark' ? '라이트 모드로 변경' : '다크 모드로 변경'}
          >
            <span className="emoji-gray">{theme === 'dark' ? '☀️' : '🌙'}</span>
          </button>

          {isLoggedIn ? (
            <>
              <span className={styles.welcomeText}>
                {user?.nickname}{t.welcome}
              </span>
              {isAdmin && (
                <Link to="/settings" className={styles.settingsLink} title="블로그 설정">
                  <span className="emoji-gray">⚙️</span> {t.settings}
                </Link>
              )}
              <Link to="/write" className="glow-btn">
                <span className="emoji-gray">📝</span> {t.write}
              </Link>
              <button onClick={handleLogout} className={styles.logoutBtn}>
                {t.logout}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
