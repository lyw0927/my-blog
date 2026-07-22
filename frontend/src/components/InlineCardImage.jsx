import React, { useState, useEffect } from 'react';
import { getCardInfo } from '../api';
import { KOREAN_CARD_MAP } from '../utils/cardMap';
import styles from './InlineCardImage.module.css';

const cardImageCache = {};

export default function InlineCardImage({ cardName, displayName }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const englishName = KOREAN_CARD_MAP[cardName] || cardName;

  useEffect(() => {
    if (cardImageCache[englishName]) {
      setImageUrl(cardImageCache[englishName]);
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const info = await getCardInfo(englishName);
        const url = info?.card_images?.[0]?.image_url_small || info?.card_images?.[0]?.image_url;
        if (mounted && url) {
          cardImageCache[englishName] = url;
          setImageUrl(url);
        }
      } catch {
        if (mounted) setError(true);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [englishName]);

  const neuronUrl = `https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=${encodeURIComponent(displayName)}&stype=1&request_locale=ko`;

  if (loading) {
    return <span className={styles.wrapper}><span className={styles.skeleton} /></span>;
  }

  if (error || !imageUrl) {
    return (
      <a href={neuronUrl} target="_blank" rel="noopener noreferrer" className={styles.fallbackLink}>
        🃏 {displayName}
      </a>
    );
  }

  return (
    <a
      href={neuronUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.wrapper} card-tooltip-trigger`}
      data-card-name={englishName}
      title={displayName}
    >
      <img
        src={imageUrl}
        alt={displayName}
        className={styles.cardImg}
        loading="lazy"
      />
      <span className={styles.label}>{displayName}</span>
    </a>
  );
}
