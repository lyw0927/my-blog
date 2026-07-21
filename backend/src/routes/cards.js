const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { fetchJson, translateEnglishToKorean } = require('../utils/cardUtils');
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
    let nameKo = null;
    let namuwikiPage = null;

    if (hasKorean(cardName)) {
      // 2-1. 우선 백엔드 로컬 카드맵 사전에서 별칭/한글명 매핑 확인
      const localEnglish = KOREAN_CARD_MAP[cardName];
      if (localEnglish) {
        console.log(`[Card Resolution] '${cardName}' 로컬 사전 매핑 성공 => '${localEnglish}'`);
        queryName = localEnglish;
        nameKo = cardName;
        // 로컬 사전에 기록되어 있어도 한글 효과 텍스트를 긁어오기 위해 나무위키 조회 시도
        try {
          const resolved = await translateViaNamuwiki(cardName);
          if (resolved && resolved.descKo) {
            descKo = resolved.descKo;
            namuwikiPage = resolved.resolvedPage;
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
          nameKo = cardName;
          namuwikiPage = resolved.resolvedPage;
        } else {
          console.log(`[Card Resolution] '${cardName}' 번역 실패`);
          return res.status(404).json({ message: '카드를 찾을 수 없습니다.' });
        }
      }
    } else {
      // 2-2. 인풋이 영문인 경우 역방향 조회하여 한국어 설명 추가 확보 시도 (영문 호버 대응)
      let foundKoName = null;
      for (const [ko, en] of Object.entries(KOREAN_CARD_MAP)) {
        if (en.toLowerCase() === cardName.toLowerCase()) {
          // 더 구체적인 이름(예: '천룡의 마술사' vs '천룡')을 선호
          if (!foundKoName || ko.length > foundKoName.length) {
            foundKoName = ko;
          }
        }
      }
      if (foundKoName) {
        console.log(`[Card Resolution] 영문 카드명 '${cardName}' 역방향 로컬 사전 매핑 성공 => '${foundKoName}'`);
        nameKo = foundKoName;
        try {
          const resolved = await translateViaNamuwiki(foundKoName);
          if (resolved && resolved.descKo) {
            descKo = resolved.descKo;
            namuwikiPage = resolved.resolvedPage;
          }
        } catch (e) {
          // 패스
        }
      } else {
        // 로컬 사전에 없을 경우 Yugipedia API를 통해 한국어 공식 명칭 조회 시도! (대단히 스마트한 글로벌 번역 연동)
        console.log(`[Card Resolution] 영문 카드명 '${cardName}' 로컬 사전 매핑 실패. Yugipedia 번역 검색 시작...`);
        const yugipediaKoName = await translateEnglishToKorean(cardName);
        if (yugipediaKoName) {
          console.log(`[Card Resolution] Yugipedia 번역 성공 => '${yugipediaKoName}'`);
          nameKo = yugipediaKoName;
          try {
            const resolved = await translateViaNamuwiki(yugipediaKoName);
            if (resolved && resolved.descKo) {
              descKo = resolved.descKo;
              namuwikiPage = resolved.resolvedPage;
            }
          } catch (e) {
            // 패스
          }
        } else {
          console.log(`[Card Resolution] Yugipedia 번역 실패`);
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
    if (nameKo) {
      cardData.name_ko = nameKo;
    }

    // 실제 나무위키 대상 문서 주소명이 존재한다면 주입
    if (namuwikiPage) {
      cardData.namuwiki_page = namuwikiPage;
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
// Server trigger restart comment

