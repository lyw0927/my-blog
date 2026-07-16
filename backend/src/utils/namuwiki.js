const https = require('https');

function fetchNamuwiki(koreanNameOrUrl) {
  return new Promise((resolve, reject) => {
    let url = koreanNameOrUrl;
    if (!url.startsWith('http')) {
      url = `https://namu.wiki/w/${encodeURIComponent(koreanNameOrUrl)}`;
    }
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `https://namu.wiki${redirectUrl}`;
        }
        resolve(fetchNamuwiki(redirectUrl));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Status: ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const SPELLING_EQUIVALENCES = [
  { pattern: /라비린스|라뷰린스/g, replacement: '라(?:비|뷰)린스', keys: ['라비린스', '라뷰린스'] },
  { pattern: /크샤트리라|크샤트리아/g, replacement: '크샤트리(?:라|아)', keys: ['크샤트리라', '크샤트리아'] },
  { pattern: /스프라이트|스플라이트/g, replacement: '스(?:프|플)라이트', keys: ['스프라이트', '스플라이트'] },
  { pattern: /퓨어리이|퓨어리/g, replacement: '퓨어리(?:이)?', keys: ['퓨어리', '퓨어리이'] },
  { pattern: /펜듈럼\s*그래프/g, replacement: '펜듈럼\\s*그래프', keys: ['펜듈럼그래프', '펜듈럼 그래프'] },
  { pattern: /오드\s*아이즈/g, replacement: '오드\\s*아이즈', keys: ['오드아이즈', '오드 아이즈'] },
  { pattern: /드래곤\s*메이드/g, replacement: '드래곤\\s*메이드', keys: ['드래곤메이드', '드래곤 메이드'] }
];

function extractEnglishName(html, koreanName, isArchetypePage) {
  // 특수문자 이스케이프 처리
  let escapedName = koreanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  
  // 공통 유사 철자 정규식 변환 적용
  for (const eq of SPELLING_EQUIVALENCES) {
    if (eq.pattern.test(escapedName)) {
      escapedName = escapedName.replace(eq.pattern, eq.replacement);
    }
  }
  
  // 1단계: 검색한 카드명과 정확히 일치하는 인포박스 타이틀 블록 매칭 (동적 정규식)
  const dynamicRegex = new RegExp(`<b><span[^>]*>\\s*${escapedName}\\s*</span></b>(?:.*?<br\\s*/?>)+?\\s*([a-zA-Z0-9\\s',!\\-\\&\\#\\(\\)\\.\\/\\;\\"]+)</div>`, 'i');
  const dynMatch = html.match(dynamicRegex);
  if (dynMatch) {
    return decodeHtmlEntities(dynMatch[1].trim());
  }

  // 1-2단계: 폴백 동적 정규식 (<tr><td colspan="2"><strong>카드명</strong><br>영문명)
  const dynamicFbRegex = new RegExp(`<strong>\\s*${escapedName}\\s*</strong><br\\s*/?>\\s*([a-zA-Z0-9\\s',!\\-\\&\\#\\(\\)\\.\\/\\;\\"]+)`, 'i');
  const dynFbMatch = html.match(dynamicFbRegex);
  if (dynFbMatch) {
    return decodeHtmlEntities(dynFbMatch[1].trim());
  }

  // 아키타입 통합 페이지인 경우, 다른 엉뚱한 카드의 인포박스를 가로채지 않도록 제네릭 폴백 금지
  if (isArchetypePage) {
    return null;
  }

  // 2단계: 기존 제네릭 정규식 (단독 카드 문서에서 최종 폴백)
  const regex = /<b><span[^>]*>([^<]+)<\/span><\/b>(?:.*?<br\s*\/?>)+?\s*([a-zA-Z0-9\s',!\-\&\#\ON\(\)\.\/\;\"]+)<\/div>/i;
  const match = html.match(regex);
  if (match) {
    return decodeHtmlEntities(match[2].trim());
  }

  const fallbackRegex = /<strong>([^<]+)<\/strong><br\s*\/?>\s*([a-zA-Z0-9\s',!\-\&\#\(\)\.\/\;\"]+)/i;
  const fbMatch = html.match(fallbackRegex);
  if (fbMatch) {
    return decodeHtmlEntities(fbMatch[2].trim());
  }

  return null;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#9312;/g, '①')
    .replace(/&#9313;/g, '②')
    .replace(/&#9314;/g, '③')
    .replace(/&#9315;/g, '④')
    .replace(/&#9316;/g, '⑤')
    .replace(/&#9317;/g, '⑥')
    .replace(/&#9318;/g, '⑦')
    .replace(/&#9319;/g, '⑧')
    .replace(/&#9320;/g, '⑨')
    .replace(/&#9321;/g, '⑩');
}

function cleanHtmlTags(str) {
  return str.replace(/<[^>]*>/g, '').trim();
}

function extractKoreanDescription(html, cardName) {
  // 1. 접미사 (유희왕) 제거
  const cleanCardName = cardName.replace(/\(유희왕\)/g, '').trim();
  
  let escapedName = cleanCardName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // 공통 유사 철자 정규식 변환 적용
  for (const eq of SPELLING_EQUIVALENCES) {
    if (eq.pattern.test(escapedName)) {
      escapedName = escapedName.replace(eq.pattern, eq.replacement);
    }
  }

  // 카드 타이틀이 들어간 스팬 검색
  const titleRegex = new RegExp(`<b><span[^>]*>\\s*${escapedName}\\s*</span></b>`, 'i');
  const titleMatch = html.match(titleRegex);
  if (!titleMatch) {
    return null;
  }

  const startIdx = titleMatch.index;
  // 인포박스 영역 슬라이싱
  const slice = html.slice(startIdx, startIdx + 8000);
  
  // 마법/함정 카드 혹은 펜듈럼/효과 몬스터 템플릿 (하얀 반투명 배경의 div들)
  const spellRegex = /<div style='[^']*background:\s*(?:#ffffffdd|#ffffff|rgba\(255,\s*255,\s*255,\s*0\.\d+\))[^*']*'[^>]*>([\s\S]*?)<\/div>/gi;
  let spellMatch;
  const candidates = [];

  while ((spellMatch = spellRegex.exec(slice)) !== null) {
    const rawText = spellMatch[1];
    const cleaned = cleanHtmlTags(rawText);
    const decoded = decodeHtmlEntities(cleaned);

    if (decoded.length < 15) continue;
    
    // 단순 정보행 제외
    if (decoded.includes('마법 카드') || decoded.includes('함정 카드') || decoded.includes('공격력') || decoded.includes('수비력')) {
      if (!decoded.includes('①') && !decoded.includes('이 카드명')) {
        continue;
      }
    }

    const score = decoded.length 
      + (decoded.includes('①') ? 100 : 0) 
      + (decoded.includes('②') ? 80 : 0) 
      + (decoded.includes('1턴에 1번') ? 50 : 0)
      + (decoded.includes('펜듈럼') ? 30 : 0);

    if (score > 40) {
      candidates.push({ rawText, decoded, score });
    }
  }

  if (candidates.length > 0) {
    // 점수 높은 순 정렬
    candidates.sort((a, b) => b.score - a.score);

    const finalBlocks = [];
    const seenTexts = new Set();

    // 1위 후보 등록
    const first = candidates[0];
    finalBlocks.push(first.rawText);
    seenTexts.add(first.decoded.slice(0, 15));

    // 2위 후보 중 1위와 내용이 다르고 점수가 높은 녀석이 있다면 결합 (펜듈럼 효과 + 몬스터 효과 융합)
    for (let i = 1; i < candidates.length; i++) {
      const cand = candidates[i];
      const prefix = cand.decoded.slice(0, 15);
      if (!seenTexts.has(prefix) && cand.score > 80) {
        finalBlocks.push(cand.rawText);
        seenTexts.add(prefix);
      }
    }

    // 원래 슬라이스 내의 등장 순서대로 정렬 (독해성 보장)
    const sortedBlocks = finalBlocks.map(blockHtml => {
      return {
        html: blockHtml,
        index: slice.indexOf(blockHtml)
      };
    }).sort((a, b) => a.index - b.index).map(item => item.html);

    // 정제하여 합치기
    const cleanedBlocks = sortedBlocks.map(blockHtml => {
      let processedText = blockHtml
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .trim();
      
      processedText = decodeHtmlEntities(processedText);

      const lines = processedText.split('\n');
      const filteredLines = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.includes('수록 팩') || trimmed.includes('OCG 금지') || trimmed.includes('카드 등급') || trimmed.startsWith('카드 종류')) {
          break;
        }
        filteredLines.push(trimmed);
      }
      return filteredLines.join('\n');
    });

    return cleanedBlocks.filter(t => t.length > 0).join('\n\n----------------------------------------\n\n');
  }

  // 최종 폴백: 아날로그 텍스트 기반 추출
  let cleanText = slice.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
  cleanText = decodeHtmlEntities(cleanText);
  const startKeywords = ['이 카드명의', '이 카드명', '자신 필드에', '이 카드는', '이 카드가', '①'];
  let effectStartIdx = -1;
  for (const kw of startKeywords) {
    const idx = cleanText.indexOf(kw);
    if (idx !== -1) {
      if (effectStartIdx === -1 || idx < effectStartIdx) {
        effectStartIdx = idx;
      }
    }
  }
  if (effectStartIdx !== -1) {
    const endKeywords = ['1. 개요', '1. explanation', '1. 설명', '1. 단어', '2. 설명', '[편집]', '분류:'];
    let effectEndIdx = cleanText.length;
    for (const kw of endKeywords) {
      const idx = cleanText.indexOf(kw);
      if (idx !== -1 && idx > effectStartIdx) {
        if (idx < effectEndIdx) {
          effectEndIdx = idx;
        }
      }
    }
    return cleanText.slice(effectStartIdx, effectEndIdx).trim();
  }

  return null;
}

async function translateViaNamuwiki(koreanName) {
  // 1단계: 카드 이름으로 직접 조회
  try {
    let html = await fetchNamuwiki(koreanName);
    let englishName = extractEnglishName(html, koreanName, false);
    if (englishName) {
      const descKo = extractKoreanDescription(html, koreanName);
      return { englishName, descKo };
    }
  } catch (err) {
    // 404 등 발생 시 패스
  }
  
  // 2단계: '(유희왕)' 접미사 붙여서 우회 조회 (동음이의어 대응)
  if (!koreanName.includes('(유희왕)')) {
    try {
      const fallbackName = `${koreanName}(유희왕)`;
      let html = await fetchNamuwiki(fallbackName);
      let englishName = extractEnglishName(html, koreanName, false);
      if (englishName) {
        const descKo = extractKoreanDescription(html, koreanName);
        return { englishName, descKo };
      }
    } catch (err) {
      // 패스
    }
  }

  // 3단계: 아키타입(단어별) 기반 통합 문서 조회 (예: "웰컴 라비린스" -> "웰컴" (실패) -> "라비린스" -> "라뷰린스" 문서 검색)
  const parts = koreanName.trim().split(/\s+/);
  if (parts.length > 1) {
    const candidates = [];
    for (const p of parts.filter(p => p.length >= 2)) {
      candidates.push(p);
      
      // 유사 철자 후보군 추가
      for (const eq of SPELLING_EQUIVALENCES) {
        let matched = false;
        for (const key of eq.keys) {
          if (p.includes(key)) {
            matched = true;
            break;
          }
        }
        if (matched) {
          for (const key of eq.keys) {
            candidates.push(p.replace(eq.pattern, key));
          }
        }
      }
    }
    
    // 중복 제거
    const uniqueCandidates = [...new Set(candidates)];
    
    for (const archetype of uniqueCandidates) {
      const archetypesToTry = [archetype, `${archetype}(유희왕)`];
      for (const arch of archetypesToTry) {
        try {
          let html = await fetchNamuwiki(arch);
          let englishName = extractEnglishName(html, koreanName, true);
          if (englishName) {
            console.log(`[Archetype Match] 아키타입 문서 '${arch}'에서 '${koreanName}' 매칭 성공!`);
            const descKo = extractKoreanDescription(html, koreanName);
            return { englishName, descKo };
          }
        } catch (err) {
          // 패스
        }
      }
    }
  }
  
  return null;
}

module.exports = { translateViaNamuwiki };
