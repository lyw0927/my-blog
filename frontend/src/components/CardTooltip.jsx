import { useState, useEffect, useRef } from 'react';
import { useBlog } from '../App';
import { TRANSLATIONS, LOCALIZED_CARD_DESC } from '../utils/i18n';
import { getCardInfo } from '../api';
import styles from './CardTooltip.module.css';

const cardCache = {}; // API 중복 조회 방지용 메모리 캐시

export default function CardTooltip() {
  const { lang } = useBlog();
  const [activeCard, setActiveCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ko;

  useEffect(() => {
    const handleMouseOver = async (e) => {
      const trigger = e.target.closest('.card-tooltip-trigger');
      if (!trigger) return;

      const cardName = trigger.getAttribute('data-card-name');
      if (!cardName) return;

      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

      // 툴팁 노출 위치 계산 (화면 밖 탈출 방지 펜스 로직 적용)
      const rect = trigger.getBoundingClientRect();
      const tooltipWidth = 360;
      let x = rect.left + window.scrollX;
      let y = rect.bottom + window.scrollY + 8;

      if (x + tooltipWidth > window.innerWidth + window.scrollX) {
        x = rect.right + window.scrollX - tooltipWidth;
      }
      if (x < 0) x = 8;

      setPosition({ x, y });
      setVisible(true);
      setLoading(true);
      setError(false);
      setActiveCard(null);

      // 캐시 유무 확인 후 로드
      if (cardCache[cardName]) {
        setActiveCard(cardCache[cardName]);
        setLoading(false);
      } else {
        try {
          const cardData = await getCardInfo(cardName);
          cardCache[cardName] = cardData;
          setActiveCard(cardData);
        } catch (err) {
          setError(true);
        } finally {
          setLoading(false);
        }
      }
    };

    const handleMouseOut = (e) => {
      const trigger = e.target.closest('.card-tooltip-trigger');
      if (!trigger) return;

      setVisible(false);
      setLoading(false);
      setActiveCard(null);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  // 펜듈럼 몬스터의 경우 펜듈럼 효과와 몬스터 효과를 분리하여 렌더링
  const renderCardDesc = (desc, isPendulum, cardName) => {
    // 1. 사전 번역 데이터가 있으면 한글/영어/일본어 맞춤 출력
    const localized = LOCALIZED_CARD_DESC[cardName];
    if (localized && localized[lang]) {
      const data = localized[lang];
      return (
        <div className={styles.splitEffects}>
          {data.pendulum && (
            <div className={styles.effectSection}>
              <span className={styles.effectLabel}>{t.pendulumEffect}</span>
              <p className={styles.effectText}>{data.pendulum}</p>
            </div>
          )}
          {data.monster && (
            <div className={styles.effectSection}>
              <span className={styles.effectLabel}>{t.monsterEffect}</span>
              <p className={styles.effectText}>{data.monster}</p>
            </div>
          )}
        </div>
      );
    }

    // 2. 번역 데이터가 없는 경우 기존 파싱 로직 실행 (영문 그대로 출력)
    if (!desc) return null;

    const hasPendulumTag = /\[\s*Pendulum Effect\s*\]/i.test(desc);
    const hasMonsterTag = /\[\s*Monster Effect\s*\]/i.test(desc);
    const hasDivider = desc.includes('----------------------------------------');

    if (isPendulum && (hasPendulumTag || hasMonsterTag || hasDivider)) {
      const parts = desc.split(/----------------------------------------/);
      let pendulumEffect = '';
      let monsterEffect = '';

      if (parts.length >= 2) {
        pendulumEffect = parts[0].replace(/\[\s*Pendulum Effect\s*\]/gi, '').trim();
        monsterEffect = parts[1].replace(/\[\s*Monster Effect\s*\]/gi, '').trim();
      } else {
        const splitMatch = desc.match(/\[\s*Monster Effect\s*\]/i);
        if (splitMatch) {
          const splitIndex = splitMatch.index;
          pendulumEffect = desc.substring(0, splitIndex).replace(/\[\s*Pendulum Effect\s*\]/gi, '').trim();
          monsterEffect = desc.substring(splitIndex + splitMatch[0].length).trim();
        } else {
          return <p className={styles.cardDesc}>{desc}</p>;
        }
      }

      return (
        <div className={styles.splitEffects}>
          {pendulumEffect && (
            <div className={styles.effectSection}>
              <span className={styles.effectLabel}>{t.pendulumEffect}</span>
              <p className={styles.effectText}>{pendulumEffect}</p>
            </div>
          )}
          {monsterEffect && (
            <div className={styles.effectSection}>
              <span className={styles.effectLabel}>{t.monsterEffect}</span>
              <p className={styles.effectText}>{monsterEffect}</p>
            </div>
          )}
        </div>
      );
    }

    return <p className={styles.cardDesc}>{desc}</p>;
  };

  // 속성 다국어 번역 매퍼
  const getAttributeTranslation = (attr) => {
    if (!attr) return '';
    const map = {
      DARK: { ko: '어둠', ja: '闇', en: 'DARK' },
      LIGHT: { ko: '빛', ja: '光', en: 'LIGHT' },
      FIRE: { ko: '화염', ja: '炎', en: 'FIRE' },
      WATER: { ko: '물', ja: '水', en: 'WATER' },
      WIND: { ko: '바람', ja: '風', en: 'WIND' },
      EARTH: { ko: '땅', ja: '地', en: 'EARTH' },
      DIVINE: { ko: '신', ja: '神', en: 'DIVINE' }
    };
    return map[attr.toUpperCase()]?.[lang] || attr;
  };

  // 카드 속성 타입 매퍼
  const getTypeTranslation = (type) => {
    if (!type) return '';
    if (lang === 'ko') {
      return type
        .replace(/Monster/g, '몬스터')
        .replace(/Spell/g, '마법')
        .replace(/Trap/g, '함정')
        .replace(/Pendulum/g, '펜듈럼')
        .replace(/Effect/g, '효과')
        .replace(/Ritual/g, '의식')
        .replace(/Fusion/g, '융합')
        .replace(/Synchro/g, '싱크로')
        .replace(/Xyz/g, '엑시즈')
        .replace(/Link/g, '링크')
        .replace(/Tuner/g, '튜너')
        .replace(/Normal/g, '일반')
        .replace(/Token/g, '토큰')
        .replace(/Spirit/g, '스피릿')
        .replace(/Toon/g, '툰')
        .replace(/Union/g, '유니온')
        .replace(/Gemini/g, '듀얼')
        .replace(/Flip/g, '리버스');
    } else if (lang === 'ja') {
      return type
        .replace(/Monster/g, 'モンスター')
        .replace(/Spell/g, '魔法')
        .replace(/Trap/g, '罠')
        .replace(/Pendulum/g, 'ペンデュラム')
        .replace(/Effect/g, '効果')
        .replace(/Ritual/g, '儀式')
        .replace(/Fusion/g, '融合')
        .replace(/Synchro/g, 'シンクロ')
        .replace(/Xyz/g, 'エクシーズ')
        .replace(/Link/g, 'リンク')
        .replace(/Tuner/g, 'チューナー')
        .replace(/Normal/g, '通常')
        .replace(/Token/g, 'トークン')
        .replace(/Spirit/g, 'スピリット')
        .replace(/Toon/g, 'トゥーン')
        .replace(/Union/g, 'ユニオン')
        .replace(/Gemini/g, 'デュアル')
        .replace(/Flip/g, 'リバース');
    }
    return type;
  };

  if (!visible) return null;

  // 카드 이름 다국어 매핑
  const localizedCard = LOCALIZED_CARD_DESC[activeCard?.name];
  const displayName = (localizedCard && localizedCard[lang]?.name) || (lang === 'ko' && activeCard?.name_ko) || activeCard?.name;

  return (
    <div 
      className={`${styles.tooltip} glass-panel`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {loading && <div className={styles.loading}>{t.loading}</div>}
      {error && <div className={styles.error}>{t.notFound}</div>}
      {activeCard && (
        <div className={styles.cardContent}>
          <img 
            src={activeCard.card_images?.[0]?.image_url_small || activeCard.card_images?.[0]?.image_url} 
            alt={activeCard.name} 
            className={styles.cardImg}
          />
          <div className={styles.cardInfo}>
            <h4 className={styles.cardName}>{displayName}</h4>
            <div className={styles.cardMeta}>
              <span className={styles.cardType}>{getTypeTranslation(activeCard.type)}</span>
              {activeCard.attribute && (
                <span className={styles.cardAttribute}>🌀 {getAttributeTranslation(activeCard.attribute)}</span>
              )}
              {activeCard.level && (
                <span className={styles.cardLevel}>{t.level} {activeCard.level}</span>
              )}
              {activeCard.scale !== undefined && (
                <span className={styles.cardScale}>{t.scale} {activeCard.scale}</span>
              )}
            </div>
            
            {activeCard.atk !== undefined && (
              <div className={styles.cardStats}>
                {t.atk} {activeCard.atk} / {t.def} {activeCard.def}
              </div>
            )}
            
            {renderCardDesc((lang === 'ko' && activeCard.desc_ko) || activeCard.desc, activeCard.type.toLowerCase().includes('pendulum'), activeCard.name)}
          </div>
        </div>
      )}
    </div>
  );
}
