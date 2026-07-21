import React, { useState, useEffect } from 'react';
import { getCardInfo } from '../api';
import { KOREAN_CARD_MAP } from '../utils/cardMap';
import styles from './DeckListRenderer.module.css';

// 메모리 캐시로 중복 API 호출 방지
const deckCardCache = {};

export default function DeckListRenderer({ content }) {
  const [deckData, setDeckData] = useState([]);
  const [cardInfos, setCardInfos] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. 텍스트 파싱
  useEffect(() => {
    const lines = content.split('\n');
    const sections = [];
    let currentSection = { title: '', cards: [] };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 섹션 제목 파싱 (# 메인 덱, [메인 덱] 등)
      if (trimmed.startsWith('#') || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        if (currentSection.title || currentSection.cards.length > 0) {
          sections.push(currentSection);
        }
        const title = trimmed.startsWith('#') 
          ? trimmed.replace(/^#+\s*/, '') 
          : trimmed.slice(1, -1);
        currentSection = { title, cards: [] };
      } else {
        // 카드 및 수량 파싱
        // 예: "조현의 마술사 x3", "우라라 3장", "Maxx \"C\" * 3"
        // 카드명과 수량을 분리하는 정규식
        const match = trimmed.match(/^(.*?)(?:\s+[xX*]\s*|\s+(\d+)장$|\s+)(\d+)$/) || trimmed.match(/^(.*?)$/);
        if (match) {
          const rawName = match[1].trim();
          const count = match[3] ? parseInt(match[3], 10) : 1;
          
          if (rawName) {
            // 한글 -> 영어 매핑
            const englishName = KOREAN_CARD_MAP[rawName] || rawName;
            currentSection.cards.push({
              rawName,
              englishName,
              count
            });
          }
        }
      }
    });

    if (currentSection.title || currentSection.cards.length > 0) {
      sections.push(currentSection);
    }

    setDeckData(sections);
  }, [content]);

  // 2. 카드 상세 정보 (이미지) 비동기 로드
  useEffect(() => {
    if (deckData.length === 0) return;

    // 고유 카드 이름 리스트 추출
    const uniqueCardNames = [];
    deckData.forEach(section => {
      section.cards.forEach(card => {
        if (!uniqueCardNames.includes(card.englishName)) {
          uniqueCardNames.push(card.englishName);
        }
      });
    });

    let isMounted = true;
    setLoading(true);

    async function loadCardInfos() {
      const newInfos = { ...cardInfos };
      const promises = uniqueCardNames.map(async (name) => {
        if (newInfos[name] || deckCardCache[name]) {
          newInfos[name] = newInfos[name] || deckCardCache[name];
          return;
        }

        try {
          const info = await getCardInfo(name);
          if (info) {
            newInfos[name] = info;
            deckCardCache[name] = info; // 글로벌 캐시 저장
          }
        } catch (err) {
          console.error(`Failed to fetch card info for: ${name}`, err);
          // 실패 시 기본 플레이스홀더 데이터
          newInfos[name] = {
            name,
            card_images: [{ image_url_small: 'https://ms.yugipedia.com//thumb/e/e5/Back-EN.png/200px-Back-EN.png' }]
          };
        }
      });

      await Promise.all(promises);

      if (isMounted) {
        setCardInfos(newInfos);
        setLoading(false);
      }
    }

    loadCardInfos();

    return () => {
      isMounted = false;
    };
  }, [deckData]);

  if (loading) {
    return (
      <div className={`${styles.deckContainer} glass-panel ${styles.loadingState}`}>
        <div className={styles.loader}></div>
        <p className={styles.loadingText}>덱 리스트 이미지를 로드 중입니다...</p>
      </div>
    );
  }

  return (
    <div className={`${styles.deckContainer} glass-panel`}>
      {deckData.map((section, sIdx) => (
        <div key={sIdx} className={styles.section}>
          {section.title && <h4 className={styles.sectionTitle}>{section.title}</h4>}
          <div className={styles.grid}>
            {section.cards.map((card, cIdx) => {
              const info = cardInfos[card.englishName];
              const imageUrl = info?.card_images?.[0]?.image_url_small || info?.card_images?.[0]?.image_url || 'https://ms.yugipedia.com//thumb/e/e5/Back-EN.png/200px-Back-EN.png';
              
              return (
                <div key={card.englishName} className={styles.cardStack}>
                  {Array.from({ length: card.count }).map((_, i) => (
                    <a 
                      key={`${card.englishName}-${i}`} 
                      className={`${styles.cardWrapper} card-tooltip-trigger`}
                      data-card-name={card.englishName}
                      href={`https://namu.wiki/w/${encodeURIComponent(card.rawName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={card.rawName}
                      style={{
                        zIndex: i + 1,
                      }}
                    >
                      <img 
                        src={imageUrl} 
                        alt={card.rawName} 
                        className={styles.cardImg}
                        loading="lazy"
                      />
                    </a>
                  ))}
                  {card.count > 1 && (
                    <span className={styles.countBadge}>
                      x{card.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
