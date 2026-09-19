import type { Locale } from './shared';

export const copy = {
  ja: {
    brand: 'いっぽ', tagline: '今日の、ちいさな一歩。', chat: 'おはなし', steps: 'ちいさな一歩', settings: '設定',
    sidebarNote: '急がなくても、大丈夫。\nあなたのペースで。', sidebarFooter: '日本と韓国を、ひとつの一歩で。',
    chapter: 'A LITTLE SPACE FOR YOU', heading: '今日は、どんな一日？', intro: 'うまく言葉にできなくても大丈夫。\n今の気持ちを、ここから少しずつ。',
    greeting: 'こんにちは、いっぽです。', invitation: '話したいことから、はじめましょう。',
    today: '今日のひととき', online: 'AIチャット', demo: 'デモ · 定型応答', checking: '接続を確認中', demoNote: 'これは体験用のデモです。AIは使わず、端末内で定型文を返します。',
    configFallback: '接続できないため、端末内のデモを表示しています。', retryConnection: '接続を再確認',
    prompts: ['ちょっと、疲れちゃった', '何から始めたらいいかな', '今日のうれしかったこと'],
    promptHints: ['気持ちをほどく', '小さなきっかけを探す', 'いいことを一つ'],
    placeholder: '今、思っていることを…', send: 'メッセージを送信', sending: '返事を準備しています…', cancel: '中止',
    inputHint: 'Enterで送信 · Shift + Enterで改行', mobileInputHint: 'あなたのペースで、おはなししましょう。',
    privacyHint: '会話は通常、この画面を閉じると消えます。', savedHint: '会話をこの端末に保存しています。',
    disclaimer: 'いっぽは医療サービスではありません。診断・治療は行いません。',
    you: 'あなた', assistant: 'いっぽ', responseDemo: 'デモの定型応答', responseLocal: '端末内で選んだ一歩', responseAI: 'AIの応答',
    error: '返事を取得できませんでした。接続を確認して、もう一度お試しください。', retry: 'もう一度試す',
    tooLong: 'メッセージは1,000文字以内で入力してください。', tokenRequired: '送信する前に、下の認証を完了してください。',
    dailyLimit: '今日のAI利用枠に達しました。午前9時以降にまたお話しできます。小さな一歩は引き続き使えます。',
    notConfigured: 'AIの接続を準備中です。小さな一歩は引き続き使えます。',
    consentTitle: 'AIとのおはなしを始める前に',
    consent: 'AI応答のため、会話の一部（最大8件・合計3,200文字）と利用言語・地域がCloudflareで外部処理されることに同意します。',
    consentHint: '氏名・住所・連絡先などの個人情報は入力しないでください。AIは誤ることがあります。',
    consentNeeded: '外部処理への同意後に送信できます。', verify: '送信前の確認', verificationError: '認証を読み込めません。接続を確認してから、もう一度お試しください。',
    littleStep: 'TODAY’S LITTLE STEP', stepHeading: '一歩は、小さくていい。', stepIntro: '今のあなたに合うことを、一つだけ。',
    energyQuestion: 'いまのエネルギーは？', energyLow: 'ゆっくりしたい', energyHigh: '余裕がある', energyLabel: 'エネルギー',
    energyNames: ['おやすみモード', '少しだけ', 'いつものペース', 'ちょっと元気', '余裕がある'],
    suggested: 'こんな一歩、どうでしょう', minutes: '分くらい', startStep: 'この一歩をやってみる', defer: '今日は見送る',
    active: 'あなたのタイミングで', completeStep: 'できた', completed: '今日の一歩を、ひとつ。', completedNote: '小さなことも、あなたの一歩。\nここまでできた自分に、ひと息。',
    deferred: '今日は、ひと休み。', deferredNote: 'お休みすることも、大切な選択です。\nまた気が向いたときに。',
    another: '別の一歩を見てみる', stepLocal: '一歩の記録はこの端末に保存されます。日付は日本・韓国時間（UTC+9）です。',
    noCompetition: '比べなくていい。続かない日があってもいい。', tomorrow: '明日のことは、明日の自分に。',
    settingsHeading: 'あなたに合う、いっぽ。', settingsIntro: '言葉も、記録も、自分で選べます。',
    language: '表示・会話の言語', languageHint: '言語を変更すると、現在の会話は消去されます。',
    region: '利用する地域', regionHint: '地域に合った相談先を表示します。表示言語とは別に選べます。変更時は会話を消去します。',
    japan: '日本', korea: '韓国', privacy: '会話とプライバシー', saveHistory: '会話をこの端末に保存する',
    saveDescription: '初期設定はオフです。オンにすると、直近60件の会話をブラウザに保存します。同じ端末を使う人が閲覧できる場合があります。',
    export: '会話を書き出す', clear: '会話・一歩の記録を消去', clearQuestion: 'この端末の会話と一歩の記録を消去しますか？元に戻せません。', clearConfirm: '記録を消去する',
    clearDone: '会話と一歩の記録を消去しました。', storageError: '端末への保存ができません。この画面でのみ利用できます。',
    mode: '接続モード', liveDescription: 'Cloudflare Workers AIに接続します。同意した会話のみ送信します。',
    demoDescription: '定型文によるデモです。会話は外部へ送信されません。ミッションも端末内で使えます。',
    revokeConsent: '外部処理への同意を取り消す', consentRevoked: '同意を取り消しました。送信中の応答も中止しました。',
    support: 'ひとりで抱えなくていい', supportText: 'つらさが強いときは、信頼できる人や専門の相談先へ。緊急時は地域の緊急窓口に連絡してください。',
    supportJP: 'まもろうよ こころ · 厚生労働省', supportKR: '自殺予防相談電話 109 · 韓国', externalLink: '新しいタブで開く',
    newConversation: '新しいおはなし', clearChatQuestion: '現在の会話と保存された会話を消去しますか？', clearChatConfirm: '新しくはじめる',
    emptyExport: 'まだ書き出せる会話がありません。', exportTitle: 'いっぽの会話', exportNotice: 'AI・デモの応答は医療的な助言ではありません。',
    mascot: 'いっぽの公式ロゴ', dateSuffix: 'の一歩', connectRetry: '再接続しています…',
  },
  ko: {
    brand: '잇포', tagline: '오늘의, 작은 한 걸음.', chat: '한 걸음', steps: '작은 한 걸음', settings: '설정',
    sidebarNote: '서두르지 않아도 괜찮아요.\n당신의 속도로.', sidebarFooter: '한국과 일본을, 하나의 발걸음으로.',
    chapter: 'A LITTLE SPACE FOR YOU', heading: '오늘은 어떤 하루였나요?', intro: '마음을 꼭 잘 설명하지 않아도 괜찮아요.\n지금의 마음부터, 조금씩 이야기해요.',
    greeting: '안녕하세요, 잇포예요.', invitation: '이야기하고 싶은 것부터 시작해요.',
    today: '오늘의 잠깐', online: 'AI 채팅', demo: '데모 · 정해진 답변', checking: '연결 확인 중', demoNote: '체험용 데모예요. AI를 사용하지 않고, 기기 안에서 정해진 문장으로 답해요.',
    configFallback: '연결할 수 없어 기기 안의 데모를 표시하고 있어요.', retryConnection: '연결 다시 확인',
    prompts: ['조금 지친 것 같아요', '무엇부터 시작하면 좋을까요', '오늘 기분 좋았던 일'],
    promptHints: ['마음 들여다보기', '작은 시작 찾아보기', '좋았던 순간 하나'],
    placeholder: '지금 떠오르는 이야기를 적어주세요…', send: '메시지 보내기', sending: '답변을 준비하고 있어요…', cancel: '중지',
    inputHint: 'Enter로 전송 · Shift + Enter로 줄 바꿈', mobileInputHint: '당신의 속도로, 편하게 이야기해요.',
    privacyHint: '기본적으로 이 화면을 닫으면 대화가 사라져요.', savedHint: '대화를 이 기기에 저장하고 있어요.',
    disclaimer: '잇포는 의료 서비스가 아니며, 진단이나 치료를 제공하지 않아요.',
    you: '나', assistant: '잇포', responseDemo: '데모의 정해진 답변', responseLocal: '기기에서 고른 한 걸음', responseAI: 'AI 답변',
    error: '답변을 가져오지 못했어요. 연결을 확인하고 다시 시도해주세요.', retry: '다시 시도',
    tooLong: '메시지는 1,000자 이내로 입력해주세요.', tokenRequired: '보내기 전에 아래 인증을 완료해주세요.',
    dailyLimit: '오늘 AI 이용 한도에 도달했어요. 오전 9시 이후 다시 대화할 수 있어요. 작은 미션은 계속 이용할 수 있어요.',
    notConfigured: 'AI 연결을 준비 중이에요. 작은 미션은 계속 이용할 수 있어요.',
    consentTitle: 'AI와 이야기하기 전에',
    consent: 'AI 답변을 위해 대화 일부(최대 8개·합계 3,200자)와 사용 언어·지역이 Cloudflare에서 외부 처리되는 데 동의해요.',
    consentHint: '이름·주소·연락처 등 개인정보는 입력하지 마세요. AI는 틀릴 수 있어요.',
    consentNeeded: '외부 처리에 동의한 뒤 보낼 수 있어요.', verify: '전송 전 확인', verificationError: '인증을 불러오지 못했어요. 연결을 확인한 후 다시 시도해주세요.',
    littleStep: 'TODAY’S LITTLE STEP', stepHeading: '한 걸음은, 작아도 돼요.', stepIntro: '지금의 나에게 맞는 일을, 하나만.',
    energyQuestion: '지금 에너지는 어떤가요?', energyLow: '쉬고 싶어요', energyHigh: '여유 있어요', energyLabel: '에너지',
    energyNames: ['쉬어가는 모드', '아주 조금만', '평소의 속도', '조금 활기차요', '여유 있어요'],
    suggested: '이런 한 걸음, 어때요?', minutes: '분 정도', startStep: '이 한 걸음 시작하기', defer: '오늘은 쉬어가기',
    active: '편한 때에 해보세요', completeStep: '해냈어요', completed: '오늘의 한 걸음을 남겼어요.', completedNote: '아주 작은 일도, 나만의 한 걸음.\n여기까지 온 나에게 잠깐의 여유를.',
    deferred: '오늘은, 잠깐 쉬어요.', deferredNote: '쉬어가는 것도 소중한 선택이에요.\n다시 마음이 내킬 때 만나요.',
    another: '다른 한 걸음 보기', stepLocal: '한 걸음 기록은 이 기기에 저장돼요. 날짜는 한국·일본 시간(UTC+9)을 사용해요.',
    noCompetition: '비교하지 않아도, 매일 이어가지 않아도 괜찮아요.', tomorrow: '내일의 일은, 내일의 나에게.',
    settingsHeading: '나에게 맞는, 잇포.', settingsIntro: '언어도, 기록도 직접 선택해요.',
    language: '화면·대화 언어', languageHint: '언어를 바꾸면 현재 대화가 지워져요.',
    region: '사용 지역', regionHint: '지역에 맞는 상담 기관을 안내해요. 화면 언어와 따로 선택할 수 있어요. 변경하면 대화가 지워져요.',
    japan: '일본', korea: '한국', privacy: '대화와 개인정보', saveHistory: '이 기기에 대화 저장하기',
    saveDescription: '기본 설정은 꺼짐이에요. 켜면 최근 대화 60개를 브라우저에 저장해요. 같은 기기를 쓰는 사람이 볼 수 있어요.',
    export: '대화 내보내기', clear: '대화·한 걸음 기록 지우기', clearQuestion: '이 기기에 저장된 대화와 한 걸음 기록을 지울까요? 되돌릴 수 없어요.', clearConfirm: '기록 지우기',
    clearDone: '대화와 한 걸음 기록을 지웠어요.', storageError: '이 기기에 저장할 수 없어요. 현재 화면에서만 사용할 수 있어요.',
    mode: '연결 모드', liveDescription: 'Cloudflare Workers AI에 연결해요. 동의한 대화만 보내요.',
    demoDescription: '정해진 문장으로 답하는 데모예요. 대화는 외부로 전송하지 않아요. 미션도 기기 안에서 사용할 수 있어요.',
    revokeConsent: '외부 처리 동의 철회하기', consentRevoked: '동의를 철회했어요. 전송 중인 답변도 중지했어요.',
    support: '혼자 감당하지 않아도 돼요', supportText: '힘든 마음이 크다면 믿을 만한 사람이나 전문 상담 기관에 연락해보세요. 긴급한 상황에는 지역 긴급 서비스에 연락하세요.',
    supportJP: '마모로요 코코로 · 일본 후생노동성', supportKR: '자살예방상담전화 109 · 한국', externalLink: '새 탭에서 열기',
    newConversation: '새로운 이야기', clearChatQuestion: '현재 대화와 저장된 대화를 지울까요?', clearChatConfirm: '새로 시작하기',
    emptyExport: '아직 내보낼 대화가 없어요.', exportTitle: '잇포의 대화', exportNotice: 'AI·데모의 답변은 의료적 조언이 아니에요.',
    mascot: '잇포 공식 로고', dateSuffix: '의 한 걸음', connectRetry: '다시 연결하고 있어요…',
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

export const missions = {
  ja: [
    { title: 'お水を、ひとくち。', body: '手の届くところにある水やお茶を、ひとくち。今日はそれだけでも。', duration: 1 },
    { title: '好きな音を、一曲だけ。', body: '聴き慣れた音楽を一曲。何かをしながらでも、ぼんやりでも。', duration: 3 },
    { title: '窓の向こうを、眺めてみる。', body: '窓から、空や外の景色を少しだけ。目に入った色を、一つ見つけてみましょう。', duration: 2 },
    { title: '身のまわりを、一か所だけ。', body: '机の上や、かばんの中。気になる場所を一つだけ、少し整えてみましょう。', duration: 3 },
    { title: '外の空気を、少しだけ。', body: '無理のない安全な場所へ、短いお散歩。出かけにくければ、部屋の中を歩いても。', duration: 5 },
  ],
  ko: [
    { title: '물, 한 모금 마셔볼까요.', body: '손이 닿는 곳의 물이나 차를 한 모금. 오늘은 그것만으로도 좋아요.', duration: 1 },
    { title: '좋아하는 음악, 딱 한 곡.', body: '익숙한 음악 한 곡을 들어봐요. 다른 일을 하면서도, 잠깐 멍하니 있어도 좋아요.', duration: 3 },
    { title: '창밖을, 잠깐 바라봐요.', body: '창문 너머 하늘이나 바깥 풍경을 잠깐 바라봐요. 눈에 들어오는 색 하나를 찾아볼까요.', duration: 2 },
    { title: '내 주변, 딱 한 곳만.', body: '책상 위나 가방 안에서 마음이 가는 한 곳을 골라 조금만 정돈해봐요.', duration: 3 },
    { title: '바깥 공기를, 조금만.', body: '무리 없는 안전한 곳으로 짧게 걸어봐요. 밖에 나가기 어렵다면 실내를 걸어도 좋아요.', duration: 5 },
  ],
};

export function getDemoReply(text: string, locale: Locale, turn: number): string {
  if (/死にたい|自殺|消えたい|죽고|자살|사라지고|kill myself|suicid/i.test(text)) {
    return locale === 'ja'
      ? 'とてもつらい気持ちを伝えてくれたのですね。今、自分を傷つけそうなときは、一人で過ごさず、近くの人や地域の緊急窓口に助けを求めてください。画面の「ひとりで抱えなくていい」から、公的な相談先を確認できます。このデモでは状況の判断や緊急対応はできません。'
      : '많이 힘든 마음을 이야기해주셨군요. 지금 자신을 해칠 것 같다면 혼자 있지 말고, 가까운 사람이나 지역 긴급 서비스에 도움을 요청해주세요. 화면의 “혼자 감당하지 않아도 돼요”에서 공공 상담 기관을 확인할 수 있어요. 이 데모는 상황을 판단하거나 긴급 대응을 할 수 없어요.';
  }
  if (/疲|つら|しんど|지친|지쳤|피곤|힘들|tired/i.test(text)) {
    return locale === 'ja'
      ? 'お疲れさまでした。今日は少し、ペースをゆるめてもいいかもしれませんね。\n\nどんなことが、いちばん心に残っていますか？'
      : '오늘도 수고했어요. 잠깐 속도를 늦춰봐도 좋겠어요.\n\n어떤 일이 가장 마음에 남아 있나요?';
  }
  if (/うれし|嬉|좋았|좋은|기분 좋|happy/i.test(text)) {
    return locale === 'ja'
      ? 'うれしかったことに、少し目を向ける時間。いいですね。\n\nどんな場面だったのでしょう？　覚えておきたいことを、一つだけ言葉にしてみても。'
      : '기분 좋았던 순간을 잠깐 돌아보는 시간이네요.\n\n어떤 장면이었나요? 기억해두고 싶은 것 하나를 말로 남겨봐도 좋겠어요.';
  }
  const replies = locale === 'ja'
    ? ['話してくれてありがとうございます。全部を一度にまとめなくても大丈夫です。\n\n今いちばん気になっていることは、どんなことですか？', '何から始めるか迷う日もありますね。\n\nまとまっていなくても大丈夫です。続きを聞かせてもらえますか。', 'ここでは、自分のペースで言葉にしてみてください。\n\n身近な人に話したり、少し休んだりする時間も大切にしてくださいね。']
    : ['이야기해줘서 고마워요. 한 번에 모두 정리하지 않아도 괜찮아요.\n\n지금 가장 마음에 걸리는 건 무엇인가요?', '무엇부터 시작할지 고민되는 날도 있죠.\n\n생각이 정리되지 않아도 괜찮아요. 조금 더 이야기해줄래요?', '이곳에서는 자신의 속도로 마음을 말해보세요.\n\n가까운 사람과 이야기하거나 잠깐 쉬어가는 시간도 소중히 챙겨주세요.'];
  return replies[turn % replies.length];
}
