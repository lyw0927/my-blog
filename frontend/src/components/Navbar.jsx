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
  const [frontCardName, setFrontCardName] = useState('별을 읽는 마술사');
  
  // 🕰️ 펜듈럼 흔들림 이스터에그 상태
  const [clickCount, setClickCount] = useState(0);
  const [isSwinging, setIsSwinging] = useState(false);

  // settings.logoImageUrl 변경 시 알 맞추기 및 해당 이미지의 영어 카드명 자동 확인
  useEffect(() => {
    const initLogoCardName = async () => {
      setImgError(false);
      
      if (settings.logoImageUrl) {
        setFrontImageUrl(settings.logoImageUrl);
        
        // 카드 이미지 URL에서 숫자 ID 추출 (예: 92644052.jpg)
        const match = settings.logoImageUrl.match(/\/(\d+)\.(?:jpg|png|jpeg)/i);
        if (match) {
          const cardId = match[1];
          try {
            // YGOPRODeck API에서 카드 ID에 매칭되는 영어 카드명 조회
            const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${cardId}`);
            const json = await res.json();
            const cardName = json.data?.[0]?.name;
            if (cardName) {
              setFrontCardName(cardName);
            }
          } catch (err) {
            console.error('Failed to resolve logo card name:', err);
            if (cardId === '92644052') {
              setFrontCardName('별을 읽는 마술사');
            } else {
              setFrontCardName('');
            }
          }
        } else {
          setFrontCardName('');
        }
      } else {
        setFrontImageUrl('');
        setFrontCardName('별을 읽는 마술사');
      }
    };
    initLogoCardName();
  }, [settings.logoImageUrl]);

  // 카드 클릭 핸들러: 앞면→뒷면 or 뒷면→랜덤카드 새알면
  const handleCardClick = async (e) => {
    e.preventDefault();
    if (cardLoading) return;

    // 🕰️ 10번 클릭 시 펜듈럼 흔들림 활성화/비활성화 처리
    if (isSwinging) {
      setIsSwinging(false);
      setClickCount(0);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 10) {
        setIsSwinging(true);
      }
    }

    if (!cardFlipped) {
      // 앞면 오픈 상태에서 클릭 → 뒷면으로
      setCardFlipped(true);
    } else {
      // 뒷면 오픈 상태에서 클릭 → 랜덤 카드 fetch 후 앞면으로
      setCardLoading(true);
      try {
        const data = await getRandomCard();
        const img = data?.card_images?.[0]?.image_url_small || data?.card_images?.[0]?.image_url;
        if (img) {
          setFrontImageUrl(img);
          setFrontCardName(data.name || '별을 읽는 마술사');
        }
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
              className={`${styles.cardFlipWrapper} ${cardFlipped ? styles.cardFlipped : ''} ${cardLoading ? styles.cardLoading : ''} ${!cardFlipped && frontCardName ? 'card-tooltip-trigger' : ''} ${isSwinging ? styles.pendulumSwing : ''}`}
              onClick={handleCardClick}
              data-card-name={frontCardName}
              title={isSwinging ? '클릭하면 흔들림 멈춤!' : cardFlipped ? '클릭하면 랜덤 카드! (10번 연속 클릭하면...?)' : '클릭해보세요! (10번 연속 클릭하면...?)'}
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
