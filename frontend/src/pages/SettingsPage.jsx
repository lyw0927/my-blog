import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlog } from '../App';
import { updateSettings } from '../api';
import styles from './SettingsPage.module.css';

import { KOREAN_CARD_MAP } from '../utils/cardMap';

export default function SettingsPage() {
  const { isAdmin, settings, refreshSettings } = useBlog();
  const navigate = useNavigate();

  const [blogTitle, setBlogTitle] = useState('');
  const [logoEmoji, setLogoEmoji] = useState('🃏');
  const [logoImageUrl, setLogoImageUrl] = useState('');
  const [subtitle, setSubtitle] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [cardResults, setCardResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [error, setError] = useState('');
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/login');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (settings) {
      setBlogTitle(settings.blogTitle || '');
      setLogoEmoji(settings.logoEmoji || '🃏');
      setLogoImageUrl(settings.logoImageUrl || '');
      setSubtitle(settings.subtitle || '');
    }
  }, [settings]);

  // 이미지 주소 변경 시 에러 판정 초기화
  useEffect(() => {
    setPreviewError(false);
  }, [logoImageUrl]);

  // YGOPRODeck API를 활용한 카드 검색
  const handleCardSearch = async (e) => {
    e.preventDefault();
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setSearching(true);
    setSearchError('');
    setCardResults([]);

    // 한글 카드명 입력 시 영문명으로 번역 매핑 조회
    let apiQuery = rawQuery;
    if (KOREAN_CARD_MAP[rawQuery]) {
      apiQuery = KOREAN_CARD_MAP[rawQuery];
    }

    try {
      const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(apiQuery)}`);
      if (!res.ok) {
        throw new Error('검색 결과가 없거나 API 통신 에러가 발생했습니다.');
      }
      const data = await res.json();
      setCardResults(data.data ? data.data.slice(0, 12) : []);
    } catch (err) {
      setSearchError('카드를 찾을 수 없습니다. 영문 혹은 지원되는 한글 카드명을 입력해 주세요. (예: 조현의 마술사, 천룡의 마술사, Astrograph)');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectCard = (card) => {
    if (card.card_images && card.card_images.length > 0) {
      const imgUrl = card.card_images[0].image_url_small || card.card_images[0].image_url;
      setLogoImageUrl(imgUrl);
      setSaveSuccess(`[${card.name}] 일러스트가 프리뷰에 반영되었습니다. 저장 버튼을 꼭 눌러주세요!`);
      setTimeout(() => setSaveSuccess(''), 4500);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveSuccess('');

    const trimmedUrl = logoImageUrl.trim();

    // 입력 유효성 검사: URL 필드에 한글 카드명 등을 직접 넣었을 때 에러 차단
    if (trimmedUrl && !trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('/')) {
      const isKoreanName = KOREAN_CARD_MAP[trimmedUrl] || trimmedUrl.includes('마술사');
      if (isKoreanName) {
        setError(`'${trimmedUrl}'는 이미지 주소가 아닙니다. 아래의 '유희왕 카드 검색기'를 이용해 검색 후 원하시는 카드를 클릭하여 지정해 주세요.`);
      } else {
        setError('올바른 이미지 주소를 입력해 주세요. (http:// 또는 https://로 시작해야 합니다.)');
      }
      setSaving(false);
      return;
    }

    if (previewError && trimmedUrl) {
      setError('현재 이미지 프리뷰가 정상적으로 로드되지 않는 주소입니다. 올바른 이미지 주소를 사용해 주세요.');
      setSaving(false);
      return;
    }

    try {
      await updateSettings({
        blogTitle: blogTitle.trim(),
        logoEmoji: logoEmoji.trim(),
        logoImageUrl: trimmedUrl,
        subtitle: subtitle.trim()
      });
      refreshSettings();
      setSaveSuccess('설정이 성공적으로 저장되었습니다!');
      setTimeout(() => {
        setSaveSuccess('');
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.back}>
          ← 돌아가기
        </button>
        <h2 className={styles.heading}>⚙️ 블로그 설정</h2>
      </header>

      <div className={styles.layout}>
        {/* 기본 정보 설정 */}
        <form onSubmit={handleSave} className={`${styles.form} glass-panel`}>
          <h3 className={styles.sectionTitle}>기본 타이틀 정보</h3>

          <div className={styles.formGroup}>
            <label className={styles.label}>블로그 타이틀</label>
            <input
              type="text"
              className={styles.input}
              value={blogTitle}
              onChange={(e) => setBlogTitle(e.target.value)}
              placeholder="예: 마술사 덱 노트"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>블로그 부제목</label>
            <textarea
              className={styles.textarea}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="블로그 상단에 들어갈 소개글입니다."
              rows={3}
            />
          </div>

          <div className={styles.logoRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>로고 이모지 (이미지가 없을 시 사용)</label>
              <input
                type="text"
                className={styles.input}
                value={logoEmoji}
                onChange={(e) => setLogoEmoji(e.target.value)}
                placeholder="예: 🃏"
              />
            </div>
            
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label className={styles.label}>카드 로고 이미지 URL</label>
              <input
                type="text"
                className={styles.input}
                value={logoImageUrl}
                onChange={(e) => setLogoImageUrl(e.target.value)}
                placeholder="검색기에서 카드 선택 또는 이미지 주소 입력"
              />
            </div>
          </div>

          {logoImageUrl && (
            <div className={styles.previewContainer}>
              <span className={styles.label}>현재 선택된 로고 프리뷰:</span>
              <div className={styles.logoPreview}>
                {previewError ? (
                  <span className={styles.error} style={{ fontSize: '0.85rem' }}>⚠️ 로드 불가능한 이미지 주소입니다.</span>
                ) : (
                  <img 
                    src={logoImageUrl} 
                    alt="Card Logo Preview" 
                    className={styles.previewImg} 
                    onError={() => setPreviewError(true)}
                  />
                )}
                <button 
                  type="button" 
                  className={styles.clearLogo}
                  onClick={() => setLogoImageUrl('')}
                >
                  초기화 (이모지 로고 사용)
                </button>
              </div>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
          {saveSuccess && <p className={styles.success}>{saveSuccess}</p>}

          <button className="glow-btn" type="submit" disabled={saving}>
            {saving ? '저장 중...' : '설정 저장하기'}
          </button>
        </form>

        {/* 유희왕 카드 데이터베이스 검색 연동 */}
        <div className={`${styles.searchCardPanel} glass-panel`}>
          <h3 className={styles.sectionTitle}>🃏 유희왕 카드 데이터베이스 검색</h3>
          <p className={styles.hint}>
            원하는 마술사 카드 이름을 **한글** 또는 **영어**로 입력 후 검색해보세요.<br />
            (한글 지원: 조현의 마술사, 천룡의 마술사, 자독의 마술사, 혜안의 마술사, 홍채의 마술사, 아스트로그래프 마술사 등)
          </p>

          <form onSubmit={handleCardSearch} className={styles.searchForm}>
            <input
              type="text"
              className={styles.input}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="예: 조현의 마술사 또는 Astrograph"
            />
            <button type="submit" className={styles.searchBtn} disabled={searching}>
              {searching ? '검색 중...' : '검색'}
            </button>
          </form>

          {searchError && <p className={styles.error}>{searchError}</p>}

          <div className={styles.cardResults}>
            {cardResults.map((card) => (
              <div key={card.id} className={styles.cardItem} onClick={() => handleSelectCard(card)}>
                {card.card_images && card.card_images.length > 0 && (
                  <img
                    src={card.card_images[0].image_url_small || card.card_images[0].image_url}
                    alt={card.name}
                    className={styles.cardThumb}
                    title="이 카드로 로고 설정"
                  />
                )}
                <div className={styles.cardInfo}>
                  <div className={styles.cardName}>{card.name}</div>
                  <div className={styles.cardType}>{card.race} / {card.type}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
