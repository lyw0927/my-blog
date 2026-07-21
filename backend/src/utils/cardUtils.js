const https = require('https');

// 외부 API JSON 호출 헬퍼
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error('Status Code: ' + res.statusCode));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 모든 유희왕 카드 풀 중 무작위 1장 ID 가져오기 (CORS 제한 없음, 장애 시 프리셋 폴백)
async function getRandomCardId() {
  const PRESETS = [
    '48171151', // 조현의 마술사
    '76794549', // 아스트로그래프 마술사
    '32751480', // 자독의 마술사
    '91584698', // 혜안의 마술사
    '14558127', // 하루 우라라
    '23434538', // 증식의 G
    '46986414', // 블랙 매지션
    '38033121', // 블랙 매지션 걸
    '89631139'  // 푸른 눈의 백룡
  ];
  try {
    const url = 'https://db.ygoprodeck.com/api/v7/cardinfo.php?num=1&offset=0&sort=random&cachebust';
    const json = await fetchJson(url);
    const cardId = json.data?.[0]?.id;
    if (cardId) return String(cardId);
  } catch (err) {
    console.error('Failed to fetch random card from API, using fallback preset:', err.message);
  }
  return PRESETS[Math.floor(Math.random() * PRESETS.length)];
}

// Yugipedia MediaWiki API를 통해 영어 카드명을 한국어 공식 카드명으로 변환
async function translateEnglishToKorean(englishName) {
  if (!englishName) return null;
  const formattedTitle = englishName.replace(/\s+/g, '_');
  const url = `https://yugipedia.com/api.php?action=query&prop=revisions&rvprop=content&format=json&titles=${encodeURIComponent(formattedTitle)}`;
  
  try {
    const json = await fetchJson(url);
    const pages = json.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') return null;
    const content = pages[pageId].revisions?.[0]?.['*'] || '';
    
    // ko_name 추출
    const match = content.match(/\|\s*ko_name\s*=\s*(.*?)\n/i) ||
                  content.match(/\|\s*ko_name\s*=\s*(.*?)\r\n/i);
    if (match) {
      return match[1].trim();
    }
  } catch (err) {
    console.error('Yugipedia translation error for ' + englishName + ':', err.message);
  }
  return null;
}

module.exports = {
  fetchJson,
  getRandomCardId,
  translateEnglishToKorean
};

