export const TRANSLATIONS = {
  ko: {
    // Menu
    login: '로그인',
    logout: '로그아웃',
    write: '새 글',
    settings: '설정',
    welcome: '님',
    back: '돌아가기',
    cancel: '취소',
    myPosts: '내가 쓴 글',

    // Main Feed / Categories
    all: '전체',
    decklist: '덱 리스트',
    guide: '공략',
    masterduel: '마스터듀얼',
    sadam: '사담',
    searchPlaceholder: '글 제목 검색...',
    noPosts: '작성된 게시글이 없습니다.',
    newest: '최신순',
    oldest: '오래된순',
    views: '조회수순',
    likes: '좋아요순',

    // Tooltip Card Labels
    pendulumEffect: '🔮 펜듈럼 효과',
    monsterEffect: '⚔️ 몬스터 효과',
    level: '⭐ 레벨',
    scale: '🔷 스케일',
    atk: '공격력',
    def: '수비력',
    loading: '⏳ 카드 정보를 불러오는 중...',
    notFound: '⚠️ 카드 정보를 찾을 수 없습니다.',
  },
  en: {
    login: 'Login',
    logout: 'Logout',
    write: 'New Post',
    settings: 'Settings',
    welcome: '',
    back: 'Back',
    cancel: 'Cancel',
    myPosts: 'My Posts',

    all: 'All',
    decklist: 'Deck Lists',
    guide: 'Guides',
    masterduel: 'Master Duel',
    sadam: 'Chit-chat',
    searchPlaceholder: 'Search post titles...',
    noPosts: 'No posts found.',
    newest: 'Newest',
    oldest: 'Oldest',
    views: 'Most Viewed',
    likes: 'Most Liked',

    pendulumEffect: '🔮 Pendulum Effect',
    monsterEffect: '⚔️ Monster Effect',
    level: '⭐ Level',
    scale: '🔷 Scale',
    atk: 'ATK',
    def: 'DEF',
    loading: '⏳ Loading card info...',
    notFound: '⚠️ Card info not found.',
  },
  ja: {
    login: 'ログイン',
    logout: 'ログアウト',
    write: '新規投稿',
    settings: '設定',
    welcome: '様',
    back: '戻る',
    cancel: 'キャンセル',
    myPosts: '自分が書いた記事',

    all: 'すべて',
    decklist: 'デッキレシピ',
    guide: '攻略',
    masterduel: 'マスターデュエル',
    sadam: '雑談',
    searchPlaceholder: 'タイトルで検索...',
    noPosts: '投稿された記事がありません。',
    newest: '最新順',
    oldest: '古い順',
    views: '閲覧数順',
    likes: '人気順',

    pendulumEffect: '🔮 ペンデュラム効果',
    monsterEffect: '⚔️ モンスター効果',
    level: '⭐ レベル',
    scale: '🔷 スケール',
    atk: '攻撃力',
    def: '守備力',
    loading: '⏳ カード情報を読み込んでいます...',
    notFound: '⚠️ カード情報が見つかりませんでした。',
  }
};

// 주요 핵심 마술사 카드들의 3개국어 설명 맵 (조현, 혜안, 자독, 아스트로그래프 등)
export const LOCALIZED_CARD_DESC = {
  'Ash Blossom & Joyous Spring': {
    ko: {
      name: '하루 우라라',
      monster: '이 카드명의 효과는 1턴에 1번밖에 사용할 수 없다. ①: 이하의 어느 효과를 포함하는 마법 / 함정 / 몬스터의 효과가 발동했을 때, 이 카드를 패에서 버리고 발동할 수 있다. 그 효과를 무효로 한다.\n● 덱에서 카드를 패에 넣는 효과\n● 덱에서 몬스터를 특수 소환하는 효과\n● 덱에서 카드를 묘지로 보내는 효과'
    },
    en: {
      name: 'Ash Blossom & Joyous Spring',
      monster: 'You can only use this effect of "Ash Blossom & Joyous Spring" once per turn. During either player\'s turn, when a card or effect is activated that includes any of these effects: You can discard this card; negate that effect.\n● Add a card from the Deck to the hand.\n● Special Summon from the Deck.\n● Send a card from the Deck to the GY.'
    },
    ja: {
      name: '灰流うらら',
      monster: 'このカード名の効果は１ターンに１度しか使用できない。①：以下のいずれかの効果を含む魔法・罠・モンスターの効果が発動した時、このカードを手札から捨てて発動できる。その効果を無効にする。\n●デッキからカードを手札に加える効果\n●デッキからモンスターを特殊召喚する効果\n●デッキからカードを墓地に送る効果'
    }
  },
  'Maxx "C"': {
    ko: {
      name: '증식의 G',
      monster: '이 카드명의 효과는 1턴에 1번밖에 사용할 수 없으며, 상대 턴에도 발동할 수 있다. ①: 이 카드를 패에서 묘지로 보내고 발동할 수 있다. 이 턴에, 상대가 몬스터의 특수 소환에 성공할 때마다, 자신은 덱에서 1장 드로우해야 한다.'
    },
    en: {
      name: 'Maxx "C"',
      monster: 'During either player\'s turn: You can send this card from your hand to the Graveyard; this turn, each time your opponent Special Summons a monster(s), immediately draw 1 card. You can only use 1 "Maxx \"C\"" per turn.'
    },
    ja: {
      name: '増殖するＧ',
      monster: 'このカード名の効果は１ターンに１度しか使用できず、相手ターンでも発동できる。①：このカードを手札から墓地に送って発動できる。このターン、相手がモンスターの特殊召喚に成功する度に、自分はデッキから１枚ドローしなければならない。'
    }
  },
  'Called by the Grave': {
    ko: {
      name: '무덤의 지명자',
      monster: '①: 상대 묘지의 몬스터 1장을 대상으로 하고 발동할 수 있다. 그 몬스터를 제외한다. 다음 턴의 종료시까지, 이 효과로 제외한 몬스터 및 그 몬스터와 원래의 카드명이 같은 몬스터의 효과는 무효화된다.'
    },
    en: {
      name: 'Called by the Grave',
      monster: 'Target 1 monster in your opponent\'s GY; banish it, and if you do, until the end of the next turn, its effects are negated, as well as the activated effects and effects on the field of monsters with the same original name.'
    },
    ja: {
      name: '墓穴の指名者',
      monster: '①：相手の墓地のモンスター１体を対象として発動できる。そのモンスターを除外する。次のターンの終了時まで、この効果で除外したモンスター及びそのモンスターと元々のカード名が同じモンスターの効果は無効化される。'
    }
  },
  'Mirrorjade the Iceblade Dragon': {
    ko: {
      name: '빙검룡 미라제이드',
      monster: '"빙검룡 미라제이드"는 자신 필드에 1장밖에 앞면 표시로 존재할 수 없다. ①: 1턴에 1번, "낙인룡 알비온" 등 "알버스의 낙윤"을 융합 소재로 하는 융합 몬스터 1장을 엑스트라 덱에서 묘지로 보내고 발동할 수 있다. 필드의 몬스터 1장을 골라 제외한다. 이 효과는 상대 턴에도 발동할 수 있다. 이 효과를 사용한 다음 턴, 자신은 이 효과를 사용할 수 없다. ②: 융합 소환한 이 카드가 상대에 의해 필드에서 벗어났을 경우에 발동할 수 있다. 이 턴의 엔드 페이즈에 상대 필드의 몬스터를 전부 파괴한다.'
    },
    en: {
      name: 'Mirrorjade the Iceblade Dragon',
      monster: 'You can only control 1 "Mirrorjade the Iceblade Dragon". Once per turn (Quick Effect): You can send 1 Fusion Monster from your Extra Deck to the GY that mentions "Fallen of Albaz" as material; banish 1 monster on the field. This effect cannot be used next turn. If this Fusion Summoned card in its owner\'s control leaves the field because of an opponent\'s card: You can destroy all monsters your opponent controls during the End Phase of this turn.'
    },
    ja: {
      name: '氷剣竜ミラジェイド',
      monster: '「氷剣竜ミラジェイド」は自分フィールドに１体しか表側表示で存在できない。①：１ターンに１度、「アルバスの落胤」を融合素材とする融合モンスター１体をエクストラデッキから墓地へ送って発動できる。フィールドのモンスター１体を選んで除外する。この効果は相手ターンでも発動できる。この効果を発動した次のターン、自分はこの効果を発動できない。②：融合召喚したこのカードが相手によってフィールドから離れた場合に発동できる。このターンのエンドフェイズに相手フィールドのモンスターを全て破壊する。'
    }
  },
  'Harmonizing Magician': {
    ko: {
      name: '조현의 마술사',
      pendulum: '①: 이 카드가 펜듈럼 존에 존재하는 한, 자신 필드의 펜듈럼 몬스터의 공격력 / 수비력은, 자신의 엑스트라 덱의 앞면 표시의 "마술사" 펜듈럼 몬스터의 종류 × 100 올린다.',
      monster: '이 카드는 엑스트라 덱에서의 특수 소환은 할 수 없으며, 이 카드를 펜듈럼 소환의 소재로 할 경우, 다른 소재는 전부 "마술사" 펜듈럼 몬스터여야 한다. ①: 이 카드가 패에서 펜듈럼 소환에 성공했을 때 발동할 수 있다. 덱에서 "조현의 마술사" 이외의 "마술사" 펜듈럼 몬스터 1장을 수비 표시로 특수 소환한다. 이 효과로 특수 소환된 몬스터의 효과는 무효화되고, 필드에서 벗어났을 경우에 제외된다.'
    },
    en: {
      name: 'Harmonizing Magician',
      pendulum: 'All Pendulum Monsters you control gain 100 ATK/DEF for each face-up "Magician" Pendulum Monster with different names in your Extra Deck.',
      monster: 'Cannot be Special Summoned from the Extra Deck. Cannot be used as a Material for a Fusion, Synchro, or Xyz Summon, unless all other Materials are "Magician" Pendulum Monsters. When this card is Pendulum Summoned from the hand: You can Special Summon 1 "Magician" Pendulum Monster from your Deck in Defense Position, except "Harmonizing Magician", but its effects are negated, also banish it when it leaves the field.'
    },
    ja: {
      name: '調弦の魔術師',
      pendulum: '①：このカードがＰゾーンに存在する限り、自分フィールドのＰモンスターの攻撃力・守備力は、自分のエクストラデッキの表側表示の「魔術師」Ｐモンスターの種類×１００アップする。',
      monster: 'このカードはエクストラデッキからの特殊召喚はできず、このカードをＰ召喚の素材とする場合、他の素材は全て「魔術師」Ｐモンスターでなければならない。①：このカードが手札からのＰ召喚に成功した時に発動できる。デッキから「調弦の魔術師」以外の「魔術師」Ｐモンスター１体を守備表示で特殊召喚する。この効果で特殊召喚されたモンスターの効果は無効化され、フィールドから離れた場合に除外される。'
    }
  },
  'Astrograph Sorcerer': {
    ko: {
      name: '아스트로그래프 마술사',
      pendulum: '①: 자신 메인 페이즈에 발동할 수 있다. 이 카드를 파괴하고, 패 / 덱에서 "별을 읽는 마술사" 1장을 고르고, 자신의 펜듈럼 존에 놓거나 특수 소환한다.',
      monster: '①: 자신 필드의 카드가 전투 / 효과로 파괴되었을 경우에 발동할 수 있다. 이 카드를 패에서 특수 소환한다. 그 후, 이 턴에 파괴된 몬스터 1장을 고르고, 그 동명 몬스터 1장을 덱에서 패에 넣을 수 있다. ②: 필드의 이 카드와, 자신 필드 / 묘지 / 제외 상태인 "펜듈럼 드래곤", "싱크로 드래곤", "엑시즈 드래곤", "퓨전 드래곤" 몬스터를 1장씩 제외하고 발동할 수 있다. "패왕룡 즈아크" 1장을 엑스트라 덱에서 융합 소환 취급하여 특수 소환한다.'
    },
    en: {
      name: 'Astrograph Sorcerer',
      pendulum: 'During your Main Phase: You can destroy this card, and if you do, take 1 "Stargazer Magician" from your hand or Deck, and either place it in your Pendulum Zone or Special Summon it.',
      monster: 'If a card(s) you control is destroyed by battle or card effect: You can Special Summon this card from your hand, then you can choose 1 monster in your GY, Extra Deck, or that is banished, that was destroyed this turn, and add 1 monster with the same name from your Deck to your hand. You can banish this card you control, plus 4 monsters from your hand, field, and/or GY (1 each with "Pendulum Dragon", "Synchro Dragon", "Xyz Dragon", and "Fusion Dragon" in their original names); Special Summon 1 "Supreme King Z-ARC" from your Extra Deck. (This is treated as a Fusion Summon.)'
    },
    ja: {
      name: 'アストログラフ・マジシャン',
      pendulum: '①：自分メインフェイズに発動できる。このカードを破壊し、手札・デッキから「星読みの魔術師」１体を選び、自分のＰゾーンに置くか特殊召喚する。',
      monster: '①：自分フィールドのカードが戦闘・効果で破壊された場合に発동できる。このカードを手札から特殊召喚する。その後、このターンに破壊されたモンスター１体を選び、その同名モンスター１体をデッキから手札に加える事ができる。②：フィールドのこのカードと、自分の手札・フィールド・墓地・除外状態の「ペンデュラム・ドラゴン」「シンクロ・ドラゴン」「エクシーズ・ドラゴン」「フュージョン・ドラゴン」モンスターを１体ずつ除外して発動できる。「覇王龍ズァーク」１体をエクストラデッキから融合召喚扱いとして特殊召喚する。'
    }
  },
  'Wisdom-Eye Magician': {
    ko: {
      name: '혜안의 마술사',
      pendulum: '①: 다른 한쪽 펜듈럼 존에 "마술사" 카드 또는 "EM(엔터메이트)" 카드가 존재할 경우에 발동할 수 있다. 이 카드를 파괴하고, 덱에서 "혜안의 마술사" 이외의 "마술사" 펜듈럼 몬스터 1장을 자신의 펜듈럼 존에 놓는다.',
      monster: '①: 이 카드를 패에서 버리고, 자신 필드의 펜듈럼 존의, 원래의 공격력과 다른 카드의 펜듈럼 스케일을 턴 종료시까지 원래의 스케일 수치로 한다.'
    },
    en: {
      name: 'Wisdom-Eye Magician',
      pendulum: 'If you have a "Magician" or "Performapal" card in your other Pendulum Zone: You can destroy this card, and if you do, place 1 "Magician" Pendulum Monster from your Deck in your Pendulum Zone, except "Wisdom-Eye Magician".',
      monster: 'You can discard this card, then target 1 card in your Pendulum Zone, whose current Pendulum Scale is different from its original value; its Pendulum Scale becomes its original value until the end of this turn.'
    },
    ja: {
      name: '慧眼の魔術師',
      pendulum: '①：もう片方の自分のＰゾーンに「魔術師」カードまたは「ＥＭ」カードが存在する場合に発動できる。このカードを破壊し、デッキから「慧眼の魔術師」以外の「魔術師」Ｐモンスター１体を選び、自分のＰゾーンに置く。',
      monster: '①：このカードを手札から捨て、自分のＰゾーン의、現在のＰスケールが元々の数値と異なるカード１枚を対象として発動できる。そのカードのＰスケールはターン終了時まで元々の数値になる。'
    }
  },
  'Purple Poison Magician': {
    ko: {
      name: '자독의 마술사',
      pendulum: '①: 1턴에 1번, 자신 필드의 어둠 속성 / 마법사족 몬스터가 전투를 실행하는 데미지 계산 전에 발동할 수 있다. 그 몬스터의 공격력은 데미지 단계 종료시까지 1200 올린다. 그 후, 이 카드를 파괴한다.',
      monster: '(이 카드는 룰상 "펜듈럼 드래곤" 카드로도 취급한다) ①: 이 카드가 전투 / 효과로 파괴되었을 경우, 필드의 앞면 표시 카드 1장을 대상으로 하고 발동할 수 있다. 그 카드를 파괴한다.'
    },
    en: {
      name: 'Purple Poison Magician',
      pendulum: 'Once per turn, if your DARK Spellcaster-Type monster battles, before damage calculation: You can activate this effect; that monster gains 1200 ATK until the end of the Damage Step, then destroy this card.',
      monster: '(This card is always treated as a "Pendulum Dragon" card.) If this card is destroyed by battle or card effect: You can target 1 face-up card on the field; destroy it.'
    },
    ja: {
      name: '紫毒の魔術師',
      pendulum: '①：１ターンに１度、自分の闇属性・魔法使い族モンスターが戦闘を行うダメージ計算前に発動できる。そのモンスターの攻撃力はダメージステップ終了時まで１２００アップする。その後、このカードを破壊する。',
      monster: '（このカードはルール上「ペンデュラム・ドラゴン」カードとしても扱う）①：このカードが戦闘・効果で破壊された場合、フィールドの表側表示のカード１枚を対象として発動できる。そのカードを破壊する。'
    }
  },
  'Dragonpit Magician': {
    ko: {
      name: '천룡의 마술사',
      pendulum: '①: 1턴에 1번, 다른 한쪽 펜듈럼 존에 "마술사" 카드가 존재할 경우, 패의 펜듈럼 몬스터 1장을 버리고, 필드의 마법 / 함정 카드 1장을 대상으로 하여 발동할 수 있다. 그 카드를 파괴한다.',
      monster: '마력 조작에 재능이 있는 젊은 천재 마술사. 그 침착하고 이성적인 태도 덕분에 주위의 평판도 높다. 이성을 잃고 함부로 마력을 뿜어내는 누군가를 다독이는 일도 자주 담당한다.'
    },
    en: {
      name: 'Dragonpit Magician',
      pendulum: 'Once per turn, if you have a "Magician" card in your other Pendulum Zone: You can discard 1 Pendulum Monster, then target 1 Spell/Trap Card on the field; destroy it.',
      monster: 'This gifted young magician has a talent for manipulating magical energy. Calm and rational, he is well regarded by his peers. He acts as a moderator for another hot-headed magician who tends to release his magic without thinking.'
    },
    ja: {
      name: '竜穴の魔術師',
      pendulum: '①：１ターンに１度、もう片方の自分のＰゾーンに「魔術師」カードが存在する場合、手札のＰモンスター１体を捨て、フィールドの魔法・罠カード１枚を対象として発動できる。そのカードを破壊する。',
      monster: '魔力の操作に長けた若き天才魔術師。物静かで理性的な態度から周囲の評判も高い。カッとなりやすく暴走しがちな誰かさんのなだめ役に回る事も多い。'
    }
  }
};
