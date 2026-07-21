import React from 'react';
import styles from './MarkdownRenderer.module.css';
import { KOREAN_CARD_MAP } from '../utils/cardMap';
import DeckListRenderer from './DeckListRenderer';

export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  const blocks = [];
  let isCodeBlock = false;
  let codeContent = [];
  let codeLang = '';

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (isCodeBlock) {
        blocks.push({
          type: 'code',
          lang: codeLang,
          content: codeContent.join('\n'),
        });
        codeContent = [];
        codeLang = '';
        isCodeBlock = false;
      } else {
        isCodeBlock = true;
        codeLang = line.trim().substring(3).trim();
      }
    } else if (isCodeBlock) {
      codeContent.push(line);
    } else {
      blocks.push({
        type: 'text',
        content: line,
      });
    }
  }

  const groupedBlocks = [];
  let currentGroup = null;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type === 'code') {
      if (currentGroup) {
        groupedBlocks.push(currentGroup);
        currentGroup = null;
      }
      groupedBlocks.push(block);
    } else {
      const text = block.content;
      const trimmed = text.trim();

      if (trimmed === '') {
        if (currentGroup) {
          groupedBlocks.push(currentGroup);
          currentGroup = null;
        }
      } else if (trimmed.startsWith('#')) {
        if (currentGroup) {
          groupedBlocks.push(currentGroup);
          currentGroup = null;
        }
        const match = text.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          groupedBlocks.push({
            type: 'heading',
            level: match[1].length,
            content: match[2],
          });
        } else {
          groupedBlocks.push({ type: 'paragraph', content: text });
        }
      } else if (trimmed.startsWith('>') && !trimmed.startsWith('>>')) {
        if (currentGroup && currentGroup.type !== 'blockquote') {
          groupedBlocks.push(currentGroup);
          currentGroup = null;
        }
        const quoteText = trimmed.substring(1).trim();
        if (!currentGroup) {
          currentGroup = { type: 'blockquote', lines: [quoteText] };
        } else {
          currentGroup.lines.push(quoteText);
        }
      } else if (trimmed.match(/^[-*+]\s+/) || trimmed.match(/^\d+\.\s+/)) {
        const isOrdered = !!trimmed.match(/^\d+\.\s+/);
        const listType = isOrdered ? 'ol' : 'ul';

        if (currentGroup && currentGroup.type !== listType) {
          groupedBlocks.push(currentGroup);
          currentGroup = null;
        }

        const itemText = isOrdered
          ? trimmed.replace(/^\d+\.\s+/, '')
          : trimmed.replace(/^[-*+]\s+/, '');

        if (!currentGroup) {
          currentGroup = { type: listType, items: [itemText] };
        } else {
          currentGroup.items.push(itemText);
        }
      } else {
        if (currentGroup && currentGroup.type !== 'paragraph') {
          groupedBlocks.push(currentGroup);
          currentGroup = null;
        }

        if (!currentGroup) {
          currentGroup = { type: 'paragraph', lines: [text] };
        } else {
          currentGroup.lines.push(text);
        }
      }
    }
  }

  if (currentGroup) {
    groupedBlocks.push(currentGroup);
  }

  const parseInline = (text) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.*?)_/g, '<em>$1</em>');

    // Inline Code
    html = html.replace(/`(.*?)`/g, '<code class="inline-code">$1</code>');

    // Images (must be before links)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="md-image" style="max-width:100%;border-radius:8px;margin:0.5rem 0;" />');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>');

    // Card Tooltips: [[카드이름]] 또는 [[영어카드명|한글표시명]]
    html = html.replace(/\[\[(.*?)\]\]/g, (match, innerText) => {
      let cardName = innerText.trim();
      let displayName = cardName;

      // 파이프(|) 구분자가 있는 경우 처리
      if (innerText.includes('|')) {
        const parts = innerText.split('|');
        const first = parts[0].trim();
        const second = parts[1].trim();

        const translatedFirst = KOREAN_CARD_MAP[first];
        const translatedSecond = KOREAN_CARD_MAP[second];

        if (translatedFirst) {
          cardName = translatedFirst;
          displayName = second;
        } else if (translatedSecond) {
          cardName = translatedSecond;
          displayName = first;
        } else {
          // 둘 다 사전에 없는 경우, 한글이 섞인 쪽을 표시명, 영문만 있는 쪽을 API용 이름으로 판정
          const hasKorean = (str) => /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(str);
          if (hasKorean(first) && !hasKorean(second)) {
            cardName = second;
            displayName = first;
          } else {
            cardName = first;
            displayName = second;
          }
        }
      } else {
        cardName = KOREAN_CARD_MAP[cardName] || cardName;
      }

      return `<a class="card-tooltip-trigger" href="https://www.db.yugioh-card.com/yugiohdb/card_search.action?ope=1&sess=1&keyword=${encodeURIComponent(displayName)}&stype=1&request_locale=ko" target="_blank" rel="noopener noreferrer" data-card-name="${cardName}" style="color: var(--primary); font-weight: 700; border-bottom: 1px dashed var(--primary); cursor: pointer; text-decoration: none;">${displayName}</a>`;
    });

    // 엔터키(줄바꿈)가 실제 브라우저 화면 상에서도 줄바꿈(<br>)으로 렌더링되도록 개행 문자 변환
    html = html.replace(/\n/g, '<br />');

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className={styles.markdown}>
      {groupedBlocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const Tag = `h${block.level}`;
            return <Tag key={idx} className={styles[`h${block.level}`]}>{parseInline(block.content)}</Tag>;
          }
          case 'paragraph':
            return <p key={idx} className={styles.p}>{parseInline(block.lines.join('\n'))}</p>;
          case 'blockquote':
            return (
              <blockquote key={idx} className={styles.blockquote}>
                {block.lines.map((line, lIdx) => (
                  <p key={lIdx}>{parseInline(line)}</p>
                ))}
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={idx} className={styles.ul}>
                {block.items.map((item, iIdx) => (
                  <li key={iIdx}>{parseInline(item)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className={styles.ol}>
                {block.items.map((item, iIdx) => (
                  <li key={iIdx}>{parseInline(item)}</li>
                ))}
              </ol>
            );
          case 'code':
            if (block.lang === 'decklist') {
              return <DeckListRenderer key={idx} content={block.content} />;
            }
            return (
              <div key={idx} className={styles.codeContainer}>
                {block.lang && <div className={styles.codeHeader}>{block.lang}</div>}
                <pre className={styles.pre}>
                  <code>{block.content}</code>
                </pre>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
