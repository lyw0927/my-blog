const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { fetchJson } = require('../utils/cardUtils');
const { translateViaNamuwiki } = require('../utils/namuwiki');
const { KOREAN_CARD_MAP } = require('../utils/cardMap');

const hasKorean = (str) => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(str);

// GET /api/cards/:cardName - 카드 정보 조회 및 캐싱 (100개 제한 LRU 알고리즘 탑재)
router.get('/:cardName', async (req, res, next) => {
  try {
    const cardName = req.params.cardName;
    const docId = encodeURIComponent(cardName);
    const cacheRef = db.collection('cards_cache');
    const docRef = cacheRef.doc(docId);
    const doc = await docRef.get();

    // 1. 이미 데이터베이스 캐시에 있다면 그대로 반환 후, 최근 조회 일시(lastAccessedAt) 업데이트
    if (doc.exists) {
      const cached = doc.data();
      await docRef.update({
        lastAccessedAt: Date.now()
      });
      return res.json(cached.cardData);
    }

    // 2. 캐시에 없으면 한글 이름일 경우 우선 로컬 사전 매핑 확인 후 나무위키 번역 실행
    let queryName = cardName;
    let descKo = null;
    if (hasKorean(cardName)) {
      // 2-1. 우선 백엔드 로컬 카드맵 사전에서 별칭/한글명 매핑 확인
      const localEnglish = KOREAN_CARD_MAP[cardName];
      if (localEnglish) {
        console.log(`[Card Resolution] '${cardName}' 로컬 사전 매핑 성공 => '${localEnglish}'`);
        queryName = localEnglish;
        // 로컬 사전에 기록되어 있어도 한글 효과 텍스트를 긁어오기 위해 나무위키 조회 시도
        try {
          const resolved = await translateViaNamuwiki(cardName);
          if (resolved && resolved.descKo) {
            descKo = resolved.descKo;
          }
        } catch (e) {
          // 패스
        }
      } else {
        console.log(`[Card Resolution] 한글 카드명 '${cardName}' 감지. 나무위키 번역 시작...`);
        const resolved = await translateViaNamuwiki(cardName);
        if (resolved && resolved.englishName) {
          console.log(`[Card Resolution] '${cardName}' 나무위키 번역 성공 => '${resolved.englishName}'`);
          queryName = resolved.englishName;
          descKo = resolved.descKo;
        } else {
          console.log(`[Card Resolution] '${cardName}' 번역 실패`);
          return res.status(404).json({ message: '카드를 찾을 수 없습니다.' });
        }
      }
    }

    // 3. 외부 YGOPRODeck API에서 새로 가져오기 (cachebust 추가)
    const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(queryName)}&cachebust`;
    const json = await fetchJson(url);
    const cardData = json.data?.[0];

    if (!cardData) {
      return res.status(404).json({ message: '카드를 찾을 수 없습니다.' });
    }

    // 크롤링된 한국어 효과가 있다면 주입
    if (descKo) {
      cardData.desc_ko = descKo;
    }

    // 한국어명이 존재한다면 주입
    if (hasKorean(cardName)) {
      cardData.name_ko = cardName;
    }

    // 4. 만약 캐시가 100장 이상 쌓여있다면, 가장 오랫동안 클릭되지 않은 카드(lastAccessedAt 최솟값) 1장을 캐시에서 지움
    const snapshot = await cacheRef.get();
    const docs = snapshot.docs;
    if (docs.length >= 100) {
      const list = docs.map(d => ({ id: d.id, ...d.data() }));
      // lastAccessedAt 오름차순 (가장 과거 시간 순) 정렬
      list.sort((a, b) => (a.lastAccessedAt || 0) - (b.lastAccessedAt || 0));

      if (list.length > 0) {
        const oldestDocId = list[0].id;
        await cacheRef.doc(oldestDocId).delete();
        console.log(`[Cache Evict] 100장 초과로 가장 오래된 캐시 삭제: ${decodeURIComponent(oldestDocId)}`);
      }
    }

    // 5. 새로운 카드 데이터를 데이터베이스 캐시에 저장 (최근 조회 일시 포함, 캐시 키는 사용자가 요청한 한글명/영문명 그대로 보존)
    await docRef.set({
      cardData,
      lastAccessedAt: Date.now()
    });

    res.json(cardData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
