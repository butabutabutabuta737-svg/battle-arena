(() => {
  const $ = (sel) => document.querySelector(sel);

  // Suppress mobile-browser-native affordances (long-press "コピー/検索/共有" menu,
  // right-click menu, drag-ghost images, double-tap-to-zoom on rapid taps) so they never
  // interrupt gameplay taps/holds — CSS user-select/touch-callout alone doesn't reliably
  // stop all of these on every browser. Text inputs on the lobby screen are unaffected
  // since e.target there is an <input>, which this only guards, not disables.
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 350 && e.target.tagName !== 'INPUT') e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // Belt-and-suspenders for title BGM: every title-screen button already calls audioReady()
  // individually, but browsers only ever unlock an AudioContext on a genuine user gesture,
  // so this catches literally the first pointerdown/keydown anywhere on the page (e.g. a
  // stray click that doesn't hit a button, or any future button that forgets to call
  // audioReady() itself) rather than depending on every single interactive element
  // remembering to do so. Safe to leave permanently registered, not { once: true } — both
  // audioReady() and startTitleBgm() are no-ops once already resumed/playing.
  document.addEventListener('pointerdown', () => audioReady(), { passive: true });
  document.addEventListener('keydown', () => audioReady());

  // PWA installability (manifest.json + an icon set already cover the rest) — sw.js is
  // deliberately network-only, see its own comment for why (this project already hit a real
  // stale-cache confusion bug once, no interest in reintroducing that risk).
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  const modeSelect = $('#modeSelect');
  const modeArenaBtn = $('#modeArenaBtn');
  const lobbyBackBtn = $('#lobbyBackBtn');
  const lobby = $('#lobby');
  const gameScreen = $('#game');
  const nameInput = $('#nameInput');
  const roomInput = $('#roomInput');
  const createBtn = $('#createBtn');
  const joinBtn = $('#joinBtn');
  const roomLabel = $('#roomLabel');
  const roomLabel2 = $('#roomLabel2');
  const statusLabel = $('#statusLabel');
  const canvas = $('#canvas');
  const ctx = canvas.getContext('2d');
  const arenaWrap = $('.arena-wrap');
  const hpMine = $('#hpMine');
  const hpTheirs = $('#hpTheirs');
  const hpBlockTheirs = $('#hpBlockTheirs');
  const hpBonusMine = $('#hpBonusMine');
  const hpBonusTheirs = $('#hpBonusTheirs');
  const hpBonusAlly = $('#hpBonusAlly');
  const nameMine = $('#nameMine');
  const nameTheirs = $('#nameTheirs');
  const rematchBtn = $('#rematchBtn');
  const resultBanner = $('#resultBanner');
  const waitOverlay = $('#waitOverlay');
  const resultOverlay = $('#resultOverlay');
  const shareHint = $('#shareHint');
  const muteBtn = $('#muteBtn');
  const homeBtn = $('#homeBtn');
  const helpToggleBtn = $('#helpToggleBtn');
  const pauseToggleBtn = $('#pauseToggleBtn');
  const pauseOverlay = $('#pauseOverlay');
  const resumeBtn = $('#resumeBtn');
  const storyRetryBtn = $('#storyRetryBtn');
  const gameOverText = $('#gameOverText');
  const gameOverScore = $('#gameOverScore');
  const modeStoryBtn = $('#modeStoryBtn');
  const storyIntro = $('#storyIntro');
  const storyIntroBackBtn = $('#storyIntroBackBtn');
  const storyNameInput = $('#storyNameInput');
  const storyRouletteToggle = $('#storyRouletteToggle');
  const story1pBtn = $('#story1pBtn');
  const story2pBtn = $('#story2pBtn');
  const hardModeBlock = $('#hardModeBlock');
  const hard1pBtn = $('#hard1pBtn');
  const hard2pBtn = $('#hard2pBtn');
  const story2pLobby = $('#story2pLobby');
  const story2pBackBtn = $('#story2pBackBtn');
  const story2pNameInput = $('#story2pNameInput');
  const story2pRouletteToggle = $('#story2pRouletteToggle');
  const story2pCreateBtn = $('#story2pCreateBtn');
  const story2pRoomInput = $('#story2pRoomInput');
  const story2pJoinBtn = $('#story2pJoinBtn');
  const storyStageLabel = $('#storyStageLabel');
  const storyEndingOverlay = $('#storyEndingOverlay');
  const storyEndingTitleBtn = $('#storyEndingTitleBtn');
  const challengeExBtn = $('#challengeExBtn');
  const storyEndingTag = $('#storyEndingTag');
  const storyEndingTitle = $('#storyEndingTitle');
  const storyEndingText = $('#storyEndingText');
  const trueEndingOverlay = $('#trueEndingOverlay');
  const trueEndingTitleBtn = $('#trueEndingTitleBtn');
  const gameOverOverlay = $('#gameOverOverlay');
  const bossIntroOverlay = $('#bossIntroOverlay');
  const bossIntroStage = $('#bossIntroStage');
  const bossIntroPortrait = $('#bossIntroPortrait');
  const bossIntroPortrait2 = $('#bossIntroPortrait2');
  const bossIntroName = $('#bossIntroName');
  const bossIntroLine = $('#bossIntroLine');
  const bossIntroRule = $('#bossIntroRule');
  const bossDefeatOverlay = $('#bossDefeatOverlay');
  const bossDefeatStage = $('#bossDefeatStage');
  const bossDefeatPortrait = $('#bossDefeatPortrait');
  const bossDefeatPortrait2 = $('#bossDefeatPortrait2');
  const bossDefeatName = $('#bossDefeatName');
  const bossDefeatLine = $('#bossDefeatLine');
  const bossVictoryOverlay = $('#bossVictoryOverlay');
  const waveIntroOverlay = $('#waveIntroOverlay');
  const waveIntroStage = $('#waveIntroStage');
  const waveIntroTitle = $('#waveIntroTitle');
  const waveIntroLine = $('#waveIntroLine');
  const mobWaveLabel = $('#mobWaveLabel');
  const levelLabel = $('#levelLabel');
  const levelUpToast = $('#levelUpToast');
  const bossSpecialWarn = $('#bossSpecialWarn');
  const lowHpVignette = $('#lowHpVignette');
  const roundStakes = $('#roundStakes');
  const bossSpecialName = $('#bossSpecialName');
  const levelUpValue = $('#levelUpValue');
  const floatJoystick = $('#floatJoystick');
  const floatJoystickKnob = $('#floatJoystickKnob');
  const fireBtn = $('#fireBtn');
  const swordBtn = $('#swordBtn');
  const buffMine = $('#buffMine');
  const buffTheirs = $('#buffTheirs');
  const allyHpBlock = $('#allyHpBlock');
  const bottomHpRow = $('#bottomHpRow');
  const boss2HpBlock = $('#boss2HpBlock');
  const nameBoss2 = $('#nameBoss2');
  const hpBoss2 = $('#hpBoss2');
  const hpBonusBoss2 = $('#hpBonusBoss2');
  const buffBoss2 = $('#buffBoss2');
  const nameAlly = $('#nameAlly');
  const hpAlly = $('#hpAlly');
  const buffAlly = $('#buffAlly');
  const downedMine = $('#downedMine');
  const downedTheirs = $('#downedTheirs');
  const lvMine = $('#lvMine');
  const lvTheirs = $('#lvTheirs');
  const downedBanner = $('#downedBanner');
  const bombControls = $('.bomb-controls');
  const placeBombBtn = $('#placeBombBtn');
  const detonateBombBtn = $('#detonateBombBtn');
  const bombStatus = $('#bombStatus');
  const bombStatusCount = $('#bombStatusCount');
  const matchScoreEl = $('#matchScore');
  const rouletteToggle = $('#rouletteToggle');
  const rouletteBlock = $('#rouletteBlock');
  const rouletteLabel = $('#rouletteLabel');
  const rouletteReel = $('#rouletteReel');

  const MATCH_WIN_TARGET = 3; // must match game.js's MATCH_WIN_TARGET — display text only

  const ITEM_LABEL = {
    speed: 'スピード', rapid: '連射', power: '攻撃力', heal: '回復', big: '弾が巨大化',
    laser: 'レーザー砲', bomb: '爆弾', shield: 'シールド', swordRange: '剣の間合い', clone: '分身',
  };

  const BUFF_META = {
    speed: { icon: '⚡', label: 'スピード' },
    rapid: { icon: '🔥', label: '連射' },
    power: { icon: '💥', label: '攻撃力' },
    big: { icon: '🟣', label: '弾が巨大化' },
    laser: { icon: '🔴', label: 'レーザー砲' },
    shield: { icon: '🛡️', label: 'シールド' },
    swordRange: { icon: '📏', label: '剣の間合い' },
    clone: { icon: '👥', label: '分身' },
  };
  const ITEM_META = {
    speed: { icon: '⚡', color: '#7fe9ff' },
    rapid: { icon: '🔥', color: '#ffbb5c' },
    power: { icon: '💥', color: '#ff8adf' },
    heal: { icon: '❤️', color: '#7dffa0' },
    big: { icon: '🟣', color: '#b28dff' },
    laser: { icon: '🔴', color: '#ff5b5b' },
    bomb: { icon: '💣', color: '#ffa64d' },
    shield: { icon: '🛡️', color: '#6de3ff' },
    swordRange: { icon: '📏', color: '#c8dcff' },
    clone: { icon: '👥', color: '#ffef8a' },
  };

  // Purely decorative per-stage boss identity for story mode — icon/color escalate in
  // intensity by stage (used both for the ship's canvas rendering and the pre-battle
  // intro card). The actual name/セリフ text comes from the server (boss.name/boss.line,
  // game.js's STORY_BOSSES) since that's authoritative game data; this table only supplies
  // presentation the server has no reason to know about, same pattern as ITEM_META/BUFF_META.
  const BOSS_TIER_THEME = [
    // image: deliberately a *separate* set of files (boss*-face.jpg) from the plain boss*.jpg
    // used elsewhere (.boss-portrait on #storyIntro's 5-boss row, .cert-portrait on the
    // certificate) — those two still want the original tall full-body shot at their own
    // narrower/taller display boxes, but this portrait (the pre-battle セリフ card) got a
    // dedicated request to show more face and less background, without changing the card's
    // own display size. Cropped tight on the face/shoulders specifically for this card's
    // ~140x175 box, so plain "center top" reads well for all five without needing the
    // per-boss offset the old wide-shot crops did.
    { uniform: '#ffffff', icon: '🔰', image: 'images/bosses/boss1-face.jpg', facePos: 'center top' }, // stage1: rookie soldier, white
    { uniform: '#d98a3d', icon: '🗡️', image: 'images/bosses/boss2-face.jpg', facePos: 'center top' }, // stage2: veteran mercenary, bronze
    { uniform: '#c0392b', icon: '🎖️', image: 'images/bosses/boss3-face.jpg', facePos: 'center top' }, // stage3: elite squad captain, deep red
    { uniform: '#6b5b95', icon: '🔪', image: 'images/bosses/boss4-face.jpg', facePos: 'center top' }, // stage4: knife specialist, stealthy purple
    { uniform: '#ffd35b', icon: '👑', image: 'images/bosses/boss5-face.jpg', facePos: 'center top' }, // stage5: battlefield champion, gold
  ];
  // Hidden EX boss ("戦神") aura — a fixed set of differently-colored rings (not a color-
  // cycling animation, which was tried first and explicitly rejected: "切り替わりではなく1つの
  // デザインで色々な色の枠がある状態に") drawn concentrically around it, see drawShip()'s
  // isExBoss branch below.
  const RAINBOW_RING_COLORS = ['#ff4d4d', '#ff9d3d', '#ffe14d', '#4dff88', '#4dc8ff', '#b34dff'];
  // Flavor text for the between-boss grunt-wave mini-game, indexed by mobWaveIndex-1 (1-4,
  // matching game.js's MOB_WAVE_COLOR_WEIGHTS) — ties each wave to the boss just defeated and
  // hints at the escalating threat of the next one. Purely client-side display text (the
  // server has no reason to know or broadcast it — see mobWaveIndex's comment in game.js's
  // broadcastState).
  const MOB_WAVE_NARRATION = [
    '見習い兵士を退けた——しかし戦場はまだ静まらない。散った雑兵たちが怒りにまかせて群がってくる。次なる強敵「歴戦の傭兵」にたどり着くには、まずこの群れを突破せねばならない。',
    '歴戦の傭兵を討ち果たした。だが奥にはさらに統率の取れた部隊が控えている——その先鋒たちが殺気を纏って押し寄せる。「精鋭部隊長」のもとへ進むには、この群れを蹴散らせ。',
    '精鋭部隊長を倒した。しかし静寂の奥から、闇に紛れた気配が次々と現れる。「血刃の暗殺者」が放った刺客たちだ。一体でも見逃せば、闇に沈められる。',
    '血刃の暗殺者を破った。だが最後の壁——「戦場の覇者」を守る精鋭たちが、総力を挙げて立ちはだかる。ここが正念場だ。すべてを薙ぎ払い、頂点への道を切り開け。',
  ];

  // Per-mob wave-color-tier theme (see game.js's MOB_WAVE_COLOR_STATS for the matching
  // speed/damage multipliers) — white(weakest) -> blue -> green -> red -> gold(strongest),
  // read straight off each wave monster's server-assigned `waveColor` field so strength is
  // visible at a glance during the swarm.
  const WAVE_COLOR_THEME = {
    white: { glow: '#f5f5f5', fill: '#3d3d45', ring: '245,245,245' },
    blue: { glow: '#5b9dff', fill: '#1c2a4a', ring: '91,157,255' },
    green: { glow: '#6bff8f', fill: '#1c3a24', ring: '107,255,143' },
    red: { glow: '#ff5b5b', fill: '#3a1c1c', ring: '255,91,91' },
    gold: { glow: '#ffd35b', fill: '#3a2c14', ring: '255,211,91' },
  };

  function shadeColor(hex, factor) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 0xff) * factor);
    const g = Math.round(((n >> 8) & 0xff) * factor);
    const b = Math.round((n & 0xff) * factor);
    return `rgb(${r},${g},${b})`;
  }

  // shadeColor() above only parses '#rrggbb'. Several colors in drawShip() are already the
  // `rgb(r,g,b)` *output* of shadeColor (a boss's uniformDark/helmet are derived from its tier
  // theme), and re-shading one of those would parse to NaN and silently yield an invalid
  // fillStyle — canvas ignores those, so it fails by drawing the previous colour rather than by
  // throwing. This accepts either form.
  function shadeAnyColor(color, factor) {
    if (typeof color === 'string' && color.startsWith('#')) return shadeColor(color, factor);
    const parts = String(color).match(/-?\d+(\.\d+)?/g);
    if (!parts || parts.length < 3) return color;
    const [r, g, b] = parts.map((v) => Math.round(Math.min(255, Math.max(0, parseFloat(v) * factor))));
    return `rgb(${r},${g},${b})`;
  }

  // Same both-formats tolerance as shadeAnyColor, for gradient stops that need a real alpha.
  function withAlpha(color, alpha) {
    let r = 255, g = 255, b = 255;
    if (typeof color === 'string' && color.startsWith('#')) {
      const n = parseInt(color.slice(1), 16);
      r = (n >> 16) & 0xff; g = (n >> 8) & 0xff; b = n & 0xff;
    } else {
      const parts = String(color).match(/-?\d+(\.\d+)?/g);
      if (parts && parts.length >= 3) [r, g, b] = parts.map((v) => Math.round(parseFloat(v)));
    }
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ---- story-mode kill certificate: the only persistent client-side state in this whole
  // project (everything else is server-authoritative/in-memory only) — tracks the highest
  // story-mode boss stage the player has ever defeated, in localStorage, so it survives page
  // reloads/new sessions. Same feature pattern as this session's other project's vertical
  // shooter (流星よけ/MeteorDodge)'s "証明書" system: title-screen button → tiered card.
  const CERT_STORAGE_KEY = 'battle-arena-best-boss-defeated'; // legacy key — still kept in sync
    // (derived, see recomputeBestBossDefeated below) purely for back-compat/rollback safety;
    // clearedSolo/clearedCoop below are now the actual source of truth.
  const CERT_SOLO_KEY = 'battle-arena-cleared-solo';
  const CERT_COOP_KEY = 'battle-arena-cleared-coop';
  // Index 6 is the hidden EX boss's tier — only ever displayed once exBossDefeated is true
  // (see below), which itself requires bestBossDefeated===5, so there's no "index 6 with
  // index<5" reachable state to worry about.
  const CERT_TITLES = ['証明書なし', '1面 撃破証明書', '2面 撃破証明書', '3面 撃破証明書', '4面 撃破証明書', '全ボス撃破証明書', '真・撃破証明書', '極・双撃破証明書'];
  const CERT_HONORIFICS = ['', '見習い戦士', '歴戦の戦士', '精鋭の戦士', '血刃を制する者', '戦場の狼', '戦場を統べし者', '双影を断つ者'];
  let bestBossDefeated = 0;
  try { bestBossDefeated = parseInt(localStorage.getItem(CERT_STORAGE_KEY), 10) || 0; } catch (e) { bestBossDefeated = 0; }

  function loadClearedSet(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) { return new Set(); }
  }
  function saveClearedSet(key, set) {
    try { localStorage.setItem(key, JSON.stringify([...set])); } catch (e) { /* localStorage unavailable (private mode etc.) — certificate just won't persist */ }
  }
  let clearedSolo = loadClearedSet(CERT_SOLO_KEY);
  let clearedCoop = loadClearedSet(CERT_COOP_KEY);
  // 2P co-op didn't exist before this feature, so any pre-existing bestBossDefeated progress
  // can only have come from solo play — back-fill clearedSolo from it once, rather than a
  // returning player's existing progress silently vanishing from the certificate's new
  // per-mode breakdown the first time they open it after this update.
  if (clearedSolo.size === 0 && clearedCoop.size === 0 && bestBossDefeated > 0) {
    for (let s = 1; s <= bestBossDefeated; s++) clearedSolo.add(s);
    saveClearedSet(CERT_SOLO_KEY, clearedSolo);
  }

  function recomputeBestBossDefeated() {
    bestBossDefeated = Math.max(0, ...clearedSolo, ...clearedCoop);
    try { localStorage.setItem(CERT_STORAGE_KEY, String(bestBossDefeated)); } catch (e) { /* localStorage unavailable — legacy key just won't persist */ }
  }

  function recordBossDefeated(stage, isCoop) {
    const set = isCoop ? clearedCoop : clearedSolo;
    if (!set.has(stage)) {
      set.add(stage);
      saveClearedSet(isCoop ? CERT_COOP_KEY : CERT_SOLO_KEY, set);
      recomputeBestBossDefeated();
    }
  }

  // ---- Records: best times + achievement badges ----------------------------------------------
  // Both live only in this browser, alongside the certificate flags above. The server publishes
  // the raw facts (see game.js resetStageStats) and every decision about what they unlock is
  // made here, so adding a badge never needs a server change.
  const TIME_STORAGE_KEY = 'battle-arena-best-times';
  const ACHV_STORAGE_KEY = 'battle-arena-achievements';
  let bestTimes = {};
  try { bestTimes = JSON.parse(localStorage.getItem(TIME_STORAGE_KEY) || '{}') || {}; } catch (e) { bestTimes = {}; }
  let unlockedAchv = new Set();
  try { unlockedAchv = new Set(JSON.parse(localStorage.getItem(ACHV_STORAGE_KEY) || '[]')); } catch (e) { unlockedAchv = new Set(); }
  // Tracks "has every stage of THIS run been flawless so far" for the 完全無欠 badge. Not
  // persisted — it only has meaning within one run.
  let runFlawless = false;

  // secret: hidden behind ❓ until earned, so the badge list doesn't spoil the hidden boss or
  // what hard mode actually is before the player has found either.
  const ACHIEVEMENTS = [
    { id: 'first-kill', icon: '🩸', name: '初陣', desc: 'ボスを初めて撃破する' },
    { id: 'flawless', icon: '🛡️', name: '無傷の狼', desc: '一度もダメージを受けずにボスを撃破する' },
    { id: 'blade-only', icon: '⚔️', name: '抜刀のみ', desc: '銃を一発も撃たずにボスを撃破する' },
    { id: 'swift', icon: '⚡', name: '電光石火', desc: '90秒以内にボスを撃破する' },
    { id: 'shutout', icon: '🔥', name: '完封', desc: '1本も落とさずにボスを撃破する' },
    { id: 'comeback', icon: '💪', name: '不屈', desc: '0勝2敗から逆転してボスを撃破する' },
    { id: 'wave-flawless', icon: '🌪️', name: '無傷の掃討', desc: 'ザコ戦をノーダメージで突破する' },
    { id: 'low-level', icon: '🎖️', name: '実力主義', desc: 'Lv3以下で最終面のボスを撃破する' },
    { id: 'all-clear', icon: '🏆', name: '全面制覇', desc: 'ストーリーモードを最後までクリアする' },
    { id: 'coop-clear', icon: '🤝', name: '戦友', desc: '2P協力プレイで最後までクリアする' },
    { id: 'speedrun', icon: '⏱️', name: '疾風の遠征', desc: '通しプレイを10分以内にクリアする' },
    { id: 'perfect-run', icon: '👑', name: '完全無欠', desc: '全ての面をノーダメージで撃破しきる' },
    { id: 'ex-slayer', icon: '🌌', name: '戦神殺し', desc: '隠されたボスを討ち取る', secret: true },
    { id: 'duo-down', icon: '💥', name: '同時撃破', desc: '2体のボスをほぼ同時に沈める', secret: true },
    { id: 'hard-clear', icon: '🔴', name: '双影を断つ', desc: 'ハードモードを全てクリアする', secret: true },
  ];
  const ACHV_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

  function formatMs(ms) {
    if (!ms || ms < 0) return '--';
    const total = ms / 1000;
    const m = Math.floor(total / 60);
    const s = total - m * 60;
    return m > 0 ? `${m}分${s.toFixed(1)}秒` : `${s.toFixed(1)}秒`;
  }
  // Returns true when this run beat the stored record (or set the first one).
  function recordBestTime(key, ms) {
    if (!ms || ms <= 0) return false;
    const prev = bestTimes[key];
    if (prev && prev <= ms) return false;
    bestTimes[key] = Math.round(ms);
    try { localStorage.setItem(TIME_STORAGE_KEY, JSON.stringify(bestTimes)); } catch (e) { /* private mode — records just won't persist */ }
    return true;
  }
  // Badges unlocked in one evaluation are announced together — see flushAchvToasts.
  let pendingAchv = [];
  function unlockAchv(id) {
    if (unlockedAchv.has(id)) return;
    const a = ACHV_BY_ID.get(id);
    if (!a) return;
    unlockedAchv.add(id);
    try { localStorage.setItem(ACHV_STORAGE_KEY, JSON.stringify([...unlockedAchv])); } catch (e) { /* same as above */ }
    pendingAchv.push(a);
  }
  function flushAchvToasts() {
    if (!pendingAchv.length) return;
    const list = pendingAchv;
    pendingAchv = [];
    queueToast(
      list.length === 1
        ? `${list[0].icon} 実績解除「${list[0].name}」`
        : `🏅 実績${list.length}件解除　${list.map((a) => a.icon + a.name).join('　')}`,
      'achv'
    );
  }

  const recordToastEl = $('#recordToast');
  const toastQueue = [];
  let toastTimer = null;
  // Queued, never stacked: a stage clear can produce a time notice AND several badges at once,
  // and showing them on top of each other would be unreadable.
  function queueToast(text, kind) {
    toastQueue.push({ text, kind });
    if (!toastTimer) showNextToast();
  }
  function showNextToast() {
    const next = toastQueue.shift();
    if (!next) { toastTimer = null; recordToastEl.className = 'record-toast'; return; }
    recordToastEl.textContent = next.text;
    recordToastEl.className = 'record-toast toast-' + next.kind;
    void recordToastEl.offsetWidth; // restart the transition when one toast follows another
    recordToastEl.classList.add('showing');
    if (next.kind !== 'time' && window.GameAudio) window.GameAudio.playLevelUp();
    toastTimer = setTimeout(() => {
      recordToastEl.classList.remove('showing');
      toastTimer = setTimeout(showNextToast, 260);
    }, 2200);
  }
  function clearToasts() {
    pendingAchv = [];
    toastQueue.length = 0;
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    recordToastEl.className = 'record-toast';
  }

  // Hidden EX boss's own defeat flag — separate key/variable from bestBossDefeated (which stays
  // 0-5, unchanged semantics) since the EX boss isn't part of STORY_BOSSES/storyStageCount at all.
  const EX_STORAGE_KEY = 'battle-arena-ex-boss-defeated';
  let exBossDefeated = false;
  try { exBossDefeated = localStorage.getItem(EX_STORAGE_KEY) === '1'; } catch (e) { exBossDefeated = false; }
  // Called once per real boss-series win, on the 'finished' phase edge (see its call site).
  function evaluateRecords(state, stage) {
    const st = state.stageStats || {};
    const wins = state.matchWins || {};
    const mode = state.hardMode ? 'hard' : state.exBossActive ? 'ex' : state.storyCoop ? 'coop' : 'solo';
    const isFinal = stage >= (state.storyStageCount || 5);

    if (mode === 'ex') {
      if (recordBestTime('ex', st.playMs)) queueToast(`⏱ ${formatMs(st.playMs)} 🏆 自己ベスト更新！`, 'best');
      else if (st.playMs > 0) queueToast(`⏱ ${formatMs(st.playMs)}`, 'time');
      unlockAchv('ex-slayer');
    } else {
      const key = `${mode}-${stage}`;
      if (recordBestTime(key, st.playMs)) queueToast(`⏱ ${formatMs(st.playMs)} 🏆 自己ベスト更新！`, 'best');
      else if (st.playMs > 0) queueToast(`⏱ ${formatMs(st.playMs)}`, 'time');
    }

    unlockAchv('first-kill');
    if (st.damaged === false) unlockAchv('flawless');
    if (st.firedBullet === false) unlockAchv('blade-only');
    if (st.playMs > 0 && st.playMs <= 90000) unlockAchv('swift');
    if ((wins.boss || 0) === 0) unlockAchv('shutout');
    if ((wins.boss || 0) === MATCH_WIN_TARGET - 1) unlockAchv('comeback');
    if (st.duoDown) unlockAchv('duo-down');

    // Every stage of this run flawless? Stage 1 starts the chain; anything else extends it.
    if (stage <= 1) runFlawless = !st.damaged;
    else runFlawless = runFlawless && !st.damaged;

    if (isFinal && mode !== 'ex') {
      const me = state.players.find((p) => p.id === myId);
      if (me && typeof me.storyLevel === 'number' && me.storyLevel <= 3) unlockAchv('low-level');
      if (mode === 'hard') unlockAchv('hard-clear');
      else {
        unlockAchv('all-clear');
        if (mode === 'coop') unlockAchv('coop-clear');
      }
      const runMs = state.runPlayMs || 0;
      if (recordBestTime(`${mode}-run`, runMs)) queueToast(`🏁 通し ${formatMs(runMs)} 🏆 自己ベスト更新！`, 'best');
      if (runMs > 0 && runMs <= 600000) unlockAchv('speedrun');
      if (runFlawless) unlockAchv('perfect-run');
    }
    flushAchvToasts();
  }
  function evaluateWaveRecords(state) {
    if (state.waveStats && state.waveStats.damaged === false) unlockAchv('wave-flawless');
    flushAchvToasts();
  }

  function recordExBossDefeated() {
    if (exBossDefeated) return;
    exBossDefeated = true;
    try { localStorage.setItem(EX_STORAGE_KEY, '1'); } catch (e) { /* localStorage unavailable — certificate just won't persist */ }
  }

  // Hard-mode all-clear. Its own record (and its own certificate tier, 7) rather than being
  // folded into the EX-boss flag: beating the EX boss is what UNLOCKS hard mode, so the two
  // must stay distinguishable or the certificate would claim a hard clear the moment the EX
  // boss fell.
  const HARD_STORAGE_KEY = 'battle-arena-hard-cleared';
  let hardCleared = false;
  try { hardCleared = localStorage.getItem(HARD_STORAGE_KEY) === '1'; } catch (e) { hardCleared = false; }
  function recordHardCleared() {
    if (hardCleared) return;
    hardCleared = true;
    try { localStorage.setItem(HARD_STORAGE_KEY, '1'); } catch (e) { /* same as above */ }
  }

  let ws = null;
  let myId = null;
  let isCpuMatch = false;
  let storyStage = 1;
  let storyStageCount = 5;
  let introShownForStage = 0; // last storyStage the boss-intro card was shown for, so it fires once per stage, not once per round
  let introShownForWave = 0; // mirrors introShownForStage, keyed by mobWaveIndex instead
  let bossIntroHideTimer = null;
  let bossDefeatHideTimer = null;
  let bossVictoryHideTimer = null;
  let waveIntroHideTimer = null;
  let gameOverRetryReady = false; // flips true only after gameOverTimer elapses — keeps the
    // retry button hidden for a dramatic beat instead of appearing the instant the boss wins
  let gameOverTimer = null;
  // Same idea as gameOverRetryReady, for an ordinary decided round (1 of 3) — per explicit
  // request that a single round's result also gets a 3s beat before the next-round button.
  let roundPauseReady = false;
  let roundPauseTimer = null;
  // Near-death tension state, driven by updateHud and consumed by the frame loop's heartbeat.
  const LOW_HP_THRESHOLD = 0.3; // below 30% of max hp
  const HEARTBEAT_SLOW_MS = 900; // just under the threshold
  const HEARTBEAT_FAST_MS = 380; // at death's door
  let lowHpActive = false;
  let lowHpIntensity = 0;
  let lastHeartbeatAt = 0;
  let lastStakesKey = ''; // so the match-point sting fires once per countdown, not per broadcast
  let trueEndingTapReady = false; // flips true (and reveals the "tap to continue" hint) only after trueEndingRevealTimer elapses — same "let it sit" beat as gameOverRetryReady above
  let trueEndingRevealTimer = null;
  // Gates rematchBtn/trueEndingOverlay behind the WHOLE post-victory dramatic sequence for
  // this kill (roulette wait, if any -> "勝利！！" flash -> optional defeat-quote card or
  // crumble) actually finishing — reset false right when that sequence is kicked off, flipped
  // true only once its last step's own onDone fires. Deliberately NOT inferred from "is
  // bossVictoryOverlay/bossDefeatOverlay currently hidden" (the previous approach) — with the
  // roulette wait in front of it, both overlays are ALSO hidden for the first ~1-2.6s while the
  // sequence hasn't even started yet, which let rematchBtn appear (and the wave mini-game get
  // triggered) while the flash/defeat-quote were still queued behind it — confirmed live via a
  // timing test showing waveIntroOverlay and bossVictoryOverlay visible at the same time,
  // matching an explicit "画面がめちゃくちゃ" report.
  let bossPresentationDone = false;
  let lastStoryLevel = 1; // last storyLevel we've shown a level-up toast for
  let lastArenaFitSignature = ''; // re-run fitArena() only when something HUD-height-affecting actually changes, not every ~33ms updateHud() tick
  let levelUpHideTimer = null;
  let leavingIntentionally = false;
  let arena = { w: 800, h: 1000, walls: [], trees: [], houses: [] }; // matches game.js's ARENA_W/ARENA_H defaults, before the real value arrives from the server
  let latestState = null;
  let prevState = null;
  let lastPhase = null;
  let lastCountdown = null;
  let lastHouseHealSfxAt = 0; // throttles the passive house-healing cue so it doesn't spam every tick
  let seenBulletIds = new Set();
  const bulletPos = new Map(); // bulletId -> {x,y} last known position, for impact sparks

  const keys = { up: false, down: false, left: false, right: false };
  let aimAngle = 0;
  let usingTouchAim = false;

  // ---- juice: particles / shake / flash ----
  let particles = [];
  let laserBeams = [];
  let swordSlashes = [];
  const SWORD_RANGE_VISUAL = 70; // mirrors game.js's SWORD_RANGE — visual reach only, not a collider
  const MONSTER_RADIUS_VISUAL = 20; // mirrors game.js's MONSTER_RADIUS
  const GOLD_MONSTER_RADIUS_VISUAL = 26; // mirrors game.js's GOLD_MONSTER_RADIUS
  const GOLDEN_CHICKEN_RADIUS_VISUAL = 18; // mirrors game.js's GOLDEN_CHICKEN_RADIUS
  const GOLD_WAVE_MOB_RADIUS_VISUAL = 24; // mirrors game.js's GOLD_WAVE_MOB_RADIUS (MONSTER_RADIUS * 1.2)
  let shockwaves = [];
  let shakeMag = 0;
  let hitFlash = 0;
  const trailLast = new Map(); // playerId -> {x,y}

  function spawnParticles(x, y, count, color, speed, life, size) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life, maxLife: life,
        color,
        size: size * (0.6 + Math.random() * 0.6),
      });
    }
  }

  // 3-way particle/trail/tint color helper (me / ally / boss-enemy) — every one of these
  // color decisions used to be a plain binary "is this me" check, which reads an ally's
  // bullets/trail/bomb as enemy-colored in the new 2-player co-op mode. `p` may be null/
  // undefined (e.g. a bullet whose owner already left the room) — falls back to the enemy
  // color in that case, matching each call site's original binary-else behavior. Only
  // splits into ally/enemy when actually in a co-op room (checked via the module-level
  // latestState, not a param, since every call site already has it in scope implicitly) —
  // outside co-op, `p.isBoss` is undefined on every player (arena mode has no boss concept
  // at all), so without this guard a plain arena opponent would wrongly read as "ally".
  function sideColor(p, meColor, allyColor, enemyColor) {
    if (!p) return enemyColor;
    if (p.id === myId) return meColor;
    const coop = !!(latestState && latestState.storyCoop);
    return coop && !p.isBoss ? allyColor : enemyColor;
  }

  // The single source of truth for "what colour is this character", matching exactly what
  // drawShip() paints its uniform. Per explicit request, a character's bullets and sword arc now
  // take their OWN colour rather than a generic gold/white or a 3-way me/ally/enemy bucket — so
  // in a hard-mode pair you can tell at a glance which of the two bosses is shooting at you.
  // Bosses key off their own bossIndex (not the stage), same rule as drawShip.
  function characterColor(p) {
    if (!p) return '#ffe28a';
    const cpu = !!(latestState && latestState.isCpuMatch);
    if (p.isBoss && cpu) {
      if (p.bossIndex === BOSS_TIER_THEME.length + 1 || (latestState && latestState.exBossActive)) return '#f5e6b8';
      const stage = (latestState && latestState.storyStage) || 1;
      return BOSS_TIER_THEME[Math.min(Math.max(1, p.bossIndex || stage), BOSS_TIER_THEME.length) - 1].uniform;
    }
    if (p.id === myId) return '#4d78d9';
    const coop = !!(latestState && latestState.storyCoop);
    return coop && !p.isBoss ? '#3fb36e' : '#c9524a';
  }
  // Same colour as an "r,g,b" triplet, for the rgba() strings the slash fan builds.
  function characterColorRgb(p) {
    const hex = characterColor(p);
    const n = parseInt(hex.slice(1), 16);
    return `${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff}`;
  }

  function audioReady() {
    if (!window.GameAudio) return;
    window.GameAudio.resume();
    // The very first user gesture on any title-family screen is also the earliest legal
    // moment (autoplay policy) to start the ambient title theme — harmless to call this
    // repeatedly since startTitleBgm() is a no-op while already playing, and this check
    // correctly stays false once gameScreen is showing, so in-game button clicks (fire/
    // sword/bomb, which also call audioReady()) never re-trigger it mid-match.
    const onTitleScreen = !modeSelect.classList.contains('hidden') || !lobby.classList.contains('hidden') || !storyIntro.classList.contains('hidden') || !story2pLobby.classList.contains('hidden');
    if (onTitleScreen) window.GameAudio.startTitleBgm();
  }

  // Gunshot feedback for the pre-game selection buttons specifically (mode choice, story
  // 1P/2P choice, create/join a room) — reuses the same playShoot() SFX the in-match fire
  // button uses, per explicit request that these "starting the game" buttons sound like a
  // gunshot rather than the (previously silent) plain click.
  function playSelectSfx() {
    if (window.GameAudio) window.GameAudio.playShoot();
  }

  // ---- sound mute toggle ----
  muteBtn.addEventListener('click', () => {
    audioReady();
    const muted = window.GameAudio.toggleMuted();
    muteBtn.textContent = muted ? '🔇' : '🔊';
  });

  // The canvas was purely width-driven (CSS width:100%; height:auto, fixed 800x600 aspect
  // ratio) — on a typical tall phone that leaves a lot of vertical space below/around it
  // unused, since the actual constraint should be "whichever of width or height is tighter",
  // not "always scale from width". This measures the real, current per-device available
  // space (HUD + hint text + gaps + padding all vary — by story mode vs arena, 1P vs 2P co-op,
  // and by the phone's own OS/browser-chrome behavior) and sets .arena-wrap's max-width so the
  // canvas grows to fill whichever dimension is actually the tighter fit, letterboxing only
  // the other one. Pure JS measurement rather than a CSS-only aspect-ratio trick, since the
  // latter doesn't reliably clamp both dimensions at once across browsers and this needs to
  // be exactly right, not approximate.
  function fitArena() {
    if (!arenaWrap || gameScreen.classList.contains('hidden')) return;
    arenaWrap.style.maxWidth = ''; // reset first so this measurement isn't biased by the last result
    const viewportH = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    const viewportW = (window.visualViewport && window.visualViewport.width) || window.innerWidth;
    const gameStyle = getComputedStyle(gameScreen);
    const padTop = parseFloat(gameStyle.paddingTop) || 0;
    const padBottom = parseFloat(gameStyle.paddingBottom) || 0;
    const padLeft = parseFloat(gameStyle.paddingLeft) || 0;
    const padRight = parseFloat(gameStyle.paddingRight) || 0;
    const gap = parseFloat(gameStyle.rowGap) || parseFloat(gameStyle.gap) || 0;
    let usedHeight = padTop + padBottom;
    let visibleSiblings = 0;
    for (const kid of gameScreen.children) {
      if (kid === arenaWrap) { visibleSiblings++; continue; }
      const cs = getComputedStyle(kid);
      if (cs.display === 'none') continue;
      if (cs.position === 'absolute' || cs.position === 'fixed') continue; // doesn't take flow space (e.g. downed-banner)
      usedHeight += kid.getBoundingClientRect().height;
      visibleSiblings++;
    }
    usedHeight += gap * Math.max(0, visibleSiblings - 1);
    // The fire/sword/bomb action buttons are position:fixed, anchored to the *true* viewport
    // bottom — the loop above deliberately skips them (they take no flex-flow space), but that
    // also means nothing here was reserving their footprint at all. That was invisible as long
    // as the arena ended up height-bound (sized to exactly fill availableHeight, landing .hint
    // flush against the reserved gap below it) — but a width-bound arena (the common case on a
    // tall phone: the arena's width, not height, is what's actually the tighter constraint,
    // especially now that the arena itself is taller/portrait-shaped) leaves the whole
    // HUD+arena+hint stack sitting at a FIXED absolute height regardless of the real viewport
    // height, so on a moderately-short real viewport (visible browser address-bar chrome,
    // smaller phones) the buttons crept upward into the hint text with nothing accounting for
    // it. Measuring the highest button's live position (rather than a guessed constant) also
    // naturally captures whatever safe-area-inset is actually in effect on this device.
    // The fire/sword/bomb row and the pause/help stack (bottom-left) are two independent
    // fixed-position clusters — since the action buttons moved into one row (was a 2-tier
    // stack, taller than this), the bottom-left pause+help stack can now be the taller of the
    // two on some layouts, so both are checked and whichever reaches higher up the screen
    // wins, rather than assuming the sword button is always the tallest.
    let topMostButtonY = viewportH;
    for (const id of ['swordBtn', 'pauseToggleBtn']) {
      const el = document.getElementById(id);
      if (el && getComputedStyle(el).display !== 'none') {
        topMostButtonY = Math.min(topMostButtonY, el.getBoundingClientRect().top);
      }
    }
    const buttonFootprint = Math.max(0, viewportH - topMostButtonY);
    usedHeight += buttonFootprint;
    // Slightly larger safety margin than a bare 6px — OS/browser-chrome quirks (address bar
    // show/hide, safe-area insets not fully reflected in visualViewport on some browsers)
    // mean the real available space can come in a bit smaller than this calculation expects;
    // erring on the side of a slightly smaller arena is far better than clipping the HUD.
    const availableHeight = Math.max(160, viewportH - usedHeight - 16);
    const availableWidth = Math.max(240, viewportW - padLeft - padRight);
    const ratio = arena.w / arena.h; // derived from the live world size, not hardcoded, so this stays correct if the arena's dimensions ever change again
    let w = Math.min(arena.w, availableWidth);
    if (w / ratio > availableHeight) w = availableHeight * ratio; // height is the tighter constraint
    arenaWrap.style.maxWidth = `${Math.round(w)}px`;
  }
  // Delayed re-runs on top of the immediate one, matching this project's established PWA-
  // standalone-resize pattern: layout (address bar show/hide, safe-area insets, orientation
  // settle, home-screen-launch sizing) can still be shifting for a beat after these events
  // fire, especially in installed-PWA standalone mode.
  function fitArenaSoon() {
    fitArena();
    fitAllBossIntroCards();
    setTimeout(() => { fitArena(); fitAllBossIntroCards(); }, 60);
    setTimeout(() => { fitArena(); fitAllBossIntroCards(); }, 300);
    setTimeout(() => { fitArena(); fitAllBossIntroCards(); }, 1200); // catches slower devices/connections still settling fonts/layout well after the first two checks
  }
  window.addEventListener('resize', fitArenaSoon);
  window.addEventListener('orientationchange', fitArenaSoon);
  window.addEventListener('pageshow', fitArenaSoon);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fitArenaSoon);

  // Boss-intro/-defeat/wave-intro cards (see showBossIntro/showBossDefeat/showWaveIntro below)
  // used to rely purely on static CSS breakpoints (pointer:coarse, max-height:600px) to guess a
  // size that keeps the セリフ text on screen on a "short phone" — real device viewports vary
  // enough (per an explicit report that the line was still cut off on some phone OSes even after
  // that tuning) that no fixed set of breakpoints reliably covers all of them. This instead
  // measures the overlay's actual rendered space and the card's actual natural content height
  // every time, and scales the whole card down (uniformly, via CSS transform so layout/centering
  // is untouched) by exactly however much is needed to guarantee it fits — a real fit for the
  // real device, not a guess. Floored at 0.55x so it never shrinks to unreadable; overflow-y:auto
  // on the overlay (see style.css) remains as a last-resort escape hatch past that floor, and is
  // itself now actually reachable via touch since isButtonTouch() excludes overlay elements.
  function fitBossIntroCard(overlay) {
    if (overlay.classList.contains('hidden')) return;
    const card = overlay.querySelector('.boss-intro-card');
    if (!card) return;
    const cs = getComputedStyle(overlay);
    const padV = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availableH = overlay.clientHeight - padV;
    const neededH = card.scrollHeight;
    const scale = neededH > 0 && availableH > 0 ? Math.min(1, Math.max(0.55, availableH / neededH)) : 1;
    card.style.transform = scale < 0.999 ? `scale(${scale})` : '';
  }
  function fitAllBossIntroCards() {
    fitBossIntroCard(bossIntroOverlay);
    fitBossIntroCard(bossDefeatOverlay);
    fitBossIntroCard(waveIntroOverlay);
  }
  // .boss-intro-card's own entrance animation (boss-intro-pop) drives `transform` itself for
  // its ~0.45s duration and wins over an inline style set at the same moment — calling
  // fitBossIntroCard() again once it's done (rather than only right at show-time) is what makes
  // the scale-down actually stick once the pop-in settles.
  function fitBossIntroCardSoon(overlay) {
    fitBossIntroCard(overlay);
    setTimeout(() => fitBossIntroCard(overlay), 500);
  }

  function randomRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  // Room codes are only ever *typed* by the joining side — the creator's is always
  // machine-generated half-width (randomRoomCode() above). A phone's default text-input
  // keyboard commonly defaults to full-width (全角) characters for Japanese users, and
  // "ＡＢ１２" LOOKS identical to "AB12" at a glance but is a completely different string —
  // .toUpperCase() alone only affects case, not width, so it silently never matched. This
  // exactly matches the reported symptom (both sides stuck "waiting for opponent", works only
  // sometimes depending on which input mode happened to be active when typing) far better
  // than the earlier cold-start theory alone did. Normalizes full-width alphanumerics (and
  // the full-width space some IMEs insert) down to their half-width equivalents before the
  // existing trim/uppercase/room-lookup.
  function normalizeRoomCode(raw) {
    return raw
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, ' ')
      .trim()
      .toUpperCase();
  }

  const connectingBanner = $('#connectingBanner');
  const connectingText = $('#connectingText');
  let connectRetryTimer = null;
  let connectAttempt = 0;
  const CONNECT_RETRY_MS = 4000;
  // ~80s of retrying — comfortably covers a free-tier host (e.g. Render) waking from sleep
  // after being idle, without retrying forever if the server is genuinely unreachable.
  const CONNECT_MAX_ATTEMPTS = 20;

  function hideConnectingBanner() {
    connectingBanner.classList.add('hidden');
  }
  // Cancels any in-flight connection attempt/retry loop and closes whatever ws exists —
  // needed on every "back" button reachable while a connect() might still be retrying (a
  // cold-start retry can now take up to ~80s), so a user who gives up and navigates away
  // doesn't get silently, jarringly dropped into gameScreen minutes later if the connection
  // happens to succeed after they've already left.
  function cancelPendingConnect() {
    if (connectRetryTimer) { clearTimeout(connectRetryTimer); connectRetryTimer = null; }
    hideConnectingBanner();
    leavingIntentionally = true;
    if (ws) { ws.close(); ws = null; }
  }

  function connect(room, name, wantsStoryCpu, roulette, wantsCoop, wantsHard) {
    audioReady();
    if (connectRetryTimer) { clearTimeout(connectRetryTimer); connectRetryTimer = null; }
    connectAttempt = 0;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const cpuParam = wantsStoryCpu ? '&cpu=story' : '';
    const rouletteParam = roulette ? '&roulette=1' : '';
    const coopParam = wantsCoop ? '&coop=1' : '';
    const hardParam = wantsHard ? '&hard=1' : '';
    const url = `${proto}://${location.host}/?room=${encodeURIComponent(room)}&name=${encodeURIComponent(name)}${cpuParam}${rouletteParam}${coopParam}${hardParam}`;
    leavingIntentionally = false;
    attemptConnect(url, room);
  }

  function attemptConnect(url, room) {
    let opened = false;
    ws = new WebSocket(url);
    // Identity of THIS socket. Every listener below checks it, because closing a socket does not
    // detach its listeners and its close/message events keep arriving afterwards — and any path
    // that swaps connections (the game-over retry, the co-op lobby, a fresh story) does
    // `ws.close()` and then immediately `connect()`, which resets `leavingIntentionally` to
    // false BEFORE the old socket's close event has fired. The old socket then failed its
    // "was this intentional?" test and started its own reconnect loop to the OLD room, taking
    // over the module-level `ws`; meanwhile its in-flight state messages were still being fed
    // into handleState alongside the new room's. Two rooms' player lists alternating through the
    // same diffing logic makes every frame look like a huge hp change, which fires the hit/
    // pickup cues continuously — the reported "sound effects just kept playing".
    const sock = ws;
    const isCurrent = () => ws === sock;

    ws.addEventListener('open', () => {
      if (!isCurrent()) return;
      opened = true;
      connectAttempt = 0;
      hideConnectingBanner();
      if (window.GameAudio) window.GameAudio.stopTitleBgm();
      modeSelect.classList.add('hidden');
      lobby.classList.add('hidden');
      storyIntro.classList.add('hidden');
      story2pLobby.classList.add('hidden');
      gameScreen.classList.remove('hidden');
      homeBtn.classList.remove('hidden');
      helpToggleBtn.classList.remove('hidden');
      pauseToggleBtn.classList.remove('hidden');
      roomLabel.textContent = room;
      roomLabel2.textContent = room;
      fitArenaSoon();
    });

    ws.addEventListener('message', (ev) => {
      if (!isCurrent()) return; // a superseded socket's in-flight messages must never reach handleState
      // Wrapped so a bug anywhere in here (JSON.parse on a malformed payload, or any of the
      // branches below) can't throw uncaught and silently stop this listener from ever firing
      // again for the rest of the session — which, since draw()/updateHud() render purely off
      // state this listener updates, would look exactly like the game freezing.
      try {
      const data = JSON.parse(ev.data);
      if (data.type === 'welcome') {
        myId = data.id;
        arena = data.arena;
        isCpuMatch = !!data.isCpuMatch;
        storyStage = data.storyStage || 1;
        storyStageCount = data.storyStageCount || 5;
        // arena size is server-driven — keep the canvas's actual pixel dimensions (which
        // define the drawing coordinate space) in sync rather than trusting the HTML
        // width/height attributes to already match.
        if (arena.w) canvas.width = arena.w;
        if (arena.h) canvas.height = arena.h;
        regenerateDebris();
      } else if (data.type === 'walls') {
        arena = { ...arena, walls: data.walls, trees: data.trees || [], houses: data.houses || [] };
        regenerateDebris();
      } else if (data.type === 'full') {
        alert('この部屋は満員です。別の部屋コードを試してください。');
        leavingIntentionally = true;
        ws.close();
        gameScreen.classList.add('hidden');
        homeBtn.classList.add('hidden');
        helpToggleBtn.classList.add('hidden');
        pauseToggleBtn.classList.add('hidden');
        lobby.classList.remove('hidden');
        if (window.GameAudio) window.GameAudio.startTitleBgm();
      } else if (data.type === 'state') {
        handleState(data);
      }
      } catch (err) {
        console.error('message handler error:', err);
      }
    });

    ws.addEventListener('close', () => {
      // A socket that has already been replaced must not stop the NEW connection's music, and
      // must never fall through to the reconnect logic below and hijack `ws` back to its own
      // (old) room. See the `sock` comment at the top of attemptConnect.
      if (!isCurrent()) return;
      if (window.GameAudio) window.GameAudio.stopBgm();
      // An intentional close (goToTitle()/a fresh connect()/cancelPendingConnect()) already
      // sets this, which cancels everything below — but an unexpected drop (server hiccup,
      // network loss) reaches this path without it, so a roulette spin still mid-flight would
      // otherwise keep ticking in the background under the "connection lost" message.
      if (rouletteSpinTimer) { clearTimeout(rouletteSpinTimer); rouletteSpinTimer = null; }
      if (leavingIntentionally) return;
      // Retry with the same room/url whether this connection never opened at all (cold-start —
      // e.g. a sleeping free-tier host waking up, confirmed live via a direct 503) or it opened
      // fine and then dropped mid-session (a flaky mobile network blip while sitting on "waiting
      // for opponent" is common and was previously unrecoverable: this same 'close' path used to
      // just tell the player to reload, silently losing the room). The server now also holds an
      // empty room's code reserved for a short grace period after a disconnect (see
      // EMPTY_ROOM_GRACE_MS in game.js) specifically so this reconnect has a room to come back to.
      connectAttempt++;
      if (connectAttempt > CONNECT_MAX_ATTEMPTS) {
        hideConnectingBanner();
        if (!opened) {
          alert('サーバーに接続できませんでした。しばらくしてからもう一度お試しください。');
        } else {
          statusLabel.textContent = '接続が切れました。ページを再読み込みしてください。';
          waitOverlay.classList.remove('hidden');
        }
        return;
      }
      connectingBanner.classList.remove('hidden');
      if (!opened) {
        connectingText.textContent = connectAttempt <= 1
          ? 'サーバーに接続中…'
          : 'サーバーを起動しています。少々お待ちください…';
      } else {
        connectingText.textContent = '接続が切れました。再接続しています…';
      }
      connectRetryTimer = setTimeout(() => attemptConnect(url, room), CONNECT_RETRY_MS);
    });
  }

  function resetClientState() {
    // The battle BGM is a self-rescheduling setInterval, and the ONLY thing that ever stopped
    // it was the `lastPhase === 'playing' -> something else` transition edge a few hundred
    // lines down. Every teardown path here (the game-over retry button, the 2P co-op connect,
    // any fresh connection) nulls `lastPhase` two lines below — destroying that edge — while
    // leaving the scheduler running, so the battle music kept playing forever underneath the
    // next screen with nothing able to stop it, and `startBgm()`'s own `if (bgmPlaying) return`
    // guard then meant the next match never got clean music either. Reported as "負けたときの
    // 音が永遠に続く". Stopping it here covers every teardown path at once, and is idempotent.
    if (window.GameAudio) window.GameAudio.stopBgm();
    // Screen-shake/hit-flash are pure view state driven by frame-to-frame hp diffs; they were
    // never cleared on teardown, so a shake in flight when a match ended carried across into
    // whatever screen came next.
    shakeMag = 0;
    hitFlash = 0;
    myId = null;
    isCpuMatch = false;
    lastArenaFitSignature = '';
    latestState = null;
    prevState = null;
    lastPhase = null;
    lastCountdown = null;
    seenBulletIds = new Set();
    bulletPos.clear();
    shipMotion.clear(); // keyed by player id, and ids are regenerated on reconnect — stale entries would carry a dead soldier's gait/recoil onto whoever inherits the id
    particles = [];
    laserBeams = [];
    shockwaves = [];
    introShownForStage = 0;
    introShownForWave = 0;
    if (bossIntroHideTimer) { clearTimeout(bossIntroHideTimer); bossIntroHideTimer = null; }
    bossIntroOverlay.classList.add('hidden');
    if (waveIntroHideTimer) { clearTimeout(waveIntroHideTimer); waveIntroHideTimer = null; }
    waveIntroOverlay.classList.add('hidden');
    if (bossDefeatHideTimer) { clearTimeout(bossDefeatHideTimer); bossDefeatHideTimer = null; }
    bossDefeatOverlay.classList.add('hidden');
    if (bossVictoryHideTimer) { clearTimeout(bossVictoryHideTimer); bossVictoryHideTimer = null; }
    bossVictoryOverlay.classList.add('hidden');
    storyEndingOverlay.classList.add('hidden');
    trueEndingOverlay.classList.add('hidden');
    trueEndingOverlay.classList.remove('ready');
    trueEndingTapReady = false;
    if (trueEndingRevealTimer) { clearTimeout(trueEndingRevealTimer); trueEndingRevealTimer = null; }
    bossPresentationDone = false;
    // Stray crumble tiles (see crumbleImage()) if the player navigated away mid-animation —
    // they're appended to <body> directly (not inside anything this function already hides),
    // so they'd otherwise keep floating over whatever screen comes next for up to ~2s.
    document.querySelectorAll('.crumble-tile').forEach((el) => el.remove());
    gameOverRetryReady = false;
    if (gameOverTimer) { clearTimeout(gameOverTimer); gameOverTimer = null; }
    roundPauseReady = false;
    if (roundPauseTimer) { clearTimeout(roundPauseTimer); roundPauseTimer = null; }
    gameOverOverlay.classList.add('hidden');
    gameOverScore.classList.add('hidden');
    clearToasts();
    lowHpVignette.classList.add('hidden');
    roundStakes.classList.add('hidden');
    lowHpActive = false;
    lastStakesKey = ''; // wave-specific line; must not carry into a boss-loss card later
    downedMine.classList.add('hidden');
    downedTheirs.classList.add('hidden');
    downedBanner.classList.add('hidden');
    lastStoryLevel = 1;
    if (levelUpHideTimer) { clearTimeout(levelUpHideTimer); levelUpHideTimer = null; }
    levelUpToast.classList.add('hidden');
    // The roulette reveal chains itself via a recursive setTimeout (up to 18 steps, ~2.5s
    // total) with its own tick sound each step — every other in-flight SFX timer here gets
    // cancelled on reset, but this one didn't, so a spin still mid-flight when the match
    // ends and the player navigates away (home button, story-ending transition, a fresh
    // connection) kept firing its tick sound in the background with nothing left on screen
    // still showing the spin, reading as "the sound effect won't stop".
    if (rouletteSpinTimer) { clearTimeout(rouletteSpinTimer); rouletteSpinTimer = null; }
    rouletteReel.classList.remove('spinning');
    rouletteBlock.classList.add('hidden');
  }

  function goToTitle() {
    cancelPendingConnect();
    if (window.GameAudio) window.GameAudio.stopBgm();
    resetClientState();
    gameScreen.classList.add('hidden');
    homeBtn.classList.add('hidden');
    helpToggleBtn.classList.add('hidden');
    pauseToggleBtn.classList.add('hidden');
    lobby.classList.add('hidden');
    storyIntro.classList.add('hidden');
    story2pLobby.classList.add('hidden');
    modeSelect.classList.remove('hidden');
    renderStorySilhouettes();
    if (window.GameAudio) window.GameAudio.startTitleBgm();
  }

  homeBtn.addEventListener('click', () => {
    audioReady();
    goToTitle();
  });

  modeArenaBtn.addEventListener('click', () => {
    audioReady();
    playSelectSfx();
    modeSelect.classList.add('hidden');
    lobby.classList.remove('hidden');
  });

  lobbyBackBtn.addEventListener('click', () => {
    audioReady();
    cancelPendingConnect();
    lobby.classList.add('hidden');
    modeSelect.classList.remove('hidden');
    renderStorySilhouettes();
  });

  // Undefeated bosses on the story-intro screen are dimmed to grayscale — same treatment as
  // the certificate's .cert-portrait.locked, per explicit request to match that look — until
  // the player has actually beaten that stage at least once; re-run every time this screen
  // becomes visible (not just once) so a boss defeated mid-session immediately shows its real
  // face in color the next time the player returns here.
  // There are two of these rows now — the title screen and the story-intro screen — so this
  // collects EVERY row and locks each one by its own 0-based index. A querySelector for a single
  // row would silently only ever update the first one on the page.
  const storySilhouetteRows = Array.from(document.querySelectorAll('.boss-silhouette-row'))
    .map((row) => Array.from(row.querySelectorAll('.boss-portrait')));
  function renderStorySilhouettes() {
    storySilhouetteRows.forEach((els) => {
      els.forEach((el, i) => el.classList.toggle('locked', i + 1 > bestBossDefeated));
    });
  }
  renderStorySilhouettes(); // the title screen is visible from load, so paint it right away

  modeStoryBtn.addEventListener('click', () => {
    audioReady();
    playSelectSfx();
    modeSelect.classList.add('hidden');
    storyIntro.classList.remove('hidden');
    renderStorySilhouettes();
    refreshHardModeUnlock();
  });

  storyIntroBackBtn.addEventListener('click', () => {
    audioReady();
    cancelPendingConnect();
    storyIntro.classList.add('hidden');
    modeSelect.classList.remove('hidden');
    renderStorySilhouettes();
  });

  createBtn.addEventListener('click', () => {
    audioReady();
    playSelectSfx();
    const room = randomRoomCode();
    const name = nameInput.value.trim() || 'プレイヤー';
    connect(room, name, null, rouletteToggle.checked);
  });

  const helpBtn = $('#helpBtn');
  const helpOverlay = $('#helpOverlay');
  const helpCloseBtn = $('#helpCloseBtn');
  const helpMenu = $('#helpMenu');
  const helpSections = document.querySelectorAll('.help-section');
  // Always reset to the topic list on open — otherwise reopening mid-battle (via
  // helpToggleBtn) could land back on whatever detail page was open last time.
  function showHelpMenu() {
    helpMenu.classList.remove('hidden');
    helpSections.forEach((el) => el.classList.add('hidden'));
  }
  function openHelp() {
    showHelpMenu();
    helpOverlay.classList.remove('hidden');
  }
  helpMenu.querySelectorAll('.help-menu-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      audioReady();
      playSelectSfx();
      helpMenu.classList.add('hidden');
      helpSections.forEach((el) => el.classList.toggle('hidden', el.dataset.helpSection !== btn.dataset.help));
    });
  });
  helpSections.forEach((el) => {
    el.querySelector('.help-back-btn').addEventListener('click', () => { audioReady(); showHelpMenu(); });
  });
  helpBtn.addEventListener('click', () => { audioReady(); playSelectSfx(); openHelp(); });
  helpToggleBtn.addEventListener('click', () => { audioReady(); openHelp(); });

  // Sends a toggle request to the server — it decides whether that means pause or resume
  // (room.paused is server-side, shared state), so both buttons just send the same message
  // rather than each client tracking/guessing the current state itself.
  function requestPauseToggle() {
    audioReady();
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'pause' }));
  }
  pauseToggleBtn.addEventListener('click', requestPauseToggle);
  resumeBtn.addEventListener('click', requestPauseToggle);
  helpCloseBtn.addEventListener('click', () => helpOverlay.classList.add('hidden'));
  helpOverlay.addEventListener('click', (e) => { if (e.target === helpOverlay) helpOverlay.classList.add('hidden'); });

  const certOpenBtn = $('#certOpenBtn');
  const certOverlay = $('#certOverlay');
  const certCloseBtn = $('#certCloseBtn');
  const certCard = $('#certCard');
  const certLabel = $('#certLabel');
  const certSub = $('#certSub');
  const certSeal = $('#certSeal');
  const certBossIcon = $('#certBossIcon');
  const certTitleBadge = $('#certTitleBadge');
  const certSilhouetteEls = Array.from($('#certSilhouetteRow').querySelectorAll('.cert-portrait:not(#certPortraitEx)'));
  const certModeBadgeEls = Array.from($('#certSilhouetteRow').querySelectorAll('.cert-mode-badge'));
  const certPortraitEx = $('#certPortraitEx');
  const certPortraitExWrap = $('#certPortraitExWrap');
  const certTimeList = $('#certTimeList');
  const certAchvCount = $('#certAchvCount');
  const certAchvGrid = $('#certAchvGrid');
  function renderRecords() {
    const rows = [];
    const push = (label, key) => { if (bestTimes[key]) rows.push({ label, ms: bestTimes[key] }); };
    for (let st = 1; st <= 5; st++) push(`1P ${st}面`, `solo-${st}`);
    push('1P 通し', 'solo-run');
    for (let st = 1; st <= 5; st++) push(`2P ${st}面`, `coop-${st}`);
    push('2P 通し', 'coop-run');
    push('裏ボス', 'ex');
    for (let st = 1; st <= 3; st++) push(`ハード ${st}`, `hard-${st}`);
    push('ハード 通し', 'hard-run');
    certTimeList.innerHTML = rows.length
      ? rows.map((r) => `<div class="cert-time-row"><span>${r.label}</span><b>${formatMs(r.ms)}</b></div>`).join('')
      : '<div class="cert-time-empty">まだ記録がありません。ボスを倒すとタイムが残ります。</div>';

    certAchvCount.textContent = `${unlockedAchv.size} / ${ACHIEVEMENTS.length}`;
    // Secret badges stay masked until earned so the list can't spoil the hidden boss or hard mode.
    certAchvGrid.innerHTML = ACHIEVEMENTS.map((a) => {
      const got = unlockedAchv.has(a.id);
      const masked = a.secret && !got;
      return `<div class="cert-achv${got ? '' : ' locked'}">`
        + `<span class="cert-achv-icon">${masked ? '❓' : a.icon}</span>`
        + `<span class="cert-achv-name">${masked ? '???' : a.name}</span>`
        + `<span class="cert-achv-desc">${masked ? '隠された実績' : a.desc}</span></div>`;
    }).join('');
  }
  // The full-body shot, matching the five .cert-portrait images beside it — the face crop this
  // used to point at was the odd one out in a row of standing figures. The tight boss6-face.jpg
  // is still what the pre-battle dialogue card wants (see BOSS_TIER_THEME), so both stay.
  certPortraitEx.src = 'images/bosses/boss6.jpg';
  function renderCertificate() {
    // Display tier is 0-6: 0-5 mirror bestBossDefeated exactly, 6 only once the hidden EX
    // boss has also fallen (which requires bestBossDefeated===5 already, so this can't be
    // reached "early"). CERT_TITLES/HONORIFICS/certCard's tier class all use this, not
    // bestBossDefeated directly, so the true-ending tier gets its own distinct card styling.
    // Tier 7 = hard mode all-cleared, which sits above the true-ending tier 6 (hard mode is only
    // unlockable after 6, so this can never be reached early).
    const tier = hardCleared ? 7 : exBossDefeated ? 6 : bestBossDefeated;
    certCard.className = 'certificate' + (tier > 0 ? ` cert-tier-${tier}` : '');
    certLabel.textContent = CERT_TITLES[tier];
    certSub.textContent = hardCleared ? 'ハードモード全制覇——二体同時の猛攻を、すべて退けた。'
      : exBossDefeated ? 'すべてを統べる者を、討った。'
      : bestBossDefeated > 0 ? `あなたは${bestBossDefeated}面のボスまで撃破しました` : 'まずは1面のボスを倒そう';
    certSeal.classList.toggle('visible', bestBossDefeated >= 5);
    certBossIcon.textContent = hardCleared ? '🔥' : exBossDefeated ? '🌌' : bestBossDefeated > 0 ? BOSS_TIER_THEME[bestBossDefeated - 1].icon : '❔';
    certTitleBadge.textContent = CERT_HONORIFICS[tier];
    certTitleBadge.style.display = tier > 0 ? 'inline-block' : 'none';
    // certSilhouetteEls[0] is stage1's silhouette, so tier (i+1) is unlocked once that
    // many bosses have been defeated — same off-by-one convention as CERT_TITLES/HONORIFICS.
    certSilhouetteEls.forEach((el, i) => el.classList.toggle('locked', i + 1 > bestBossDefeated));
    // Per-boss 👤(solo)/🤝(co-op) badges — independently lit per mode, so a boss cleared in
    // both shows both icons active, one cleared in only one mode shows just that icon.
    certModeBadgeEls.forEach((badge, i) => {
      const stage = i + 1;
      const soloIcon = badge.querySelector('[data-mode="solo"]');
      const coopIcon = badge.querySelector('[data-mode="coop"]');
      if (soloIcon) soloIcon.classList.toggle('achieved', clearedSolo.has(stage));
      if (coopIcon) coopIcon.classList.toggle('achieved', clearedCoop.has(stage));
    });
    // The EX slot doesn't exist pre-unlock (no "locked" dim state like the other 5) — it's
    // simply absent until earned, preserving the "hidden boss" surprise.
    // Hide the whole column, not just the image: a display:none <img> inside a still-present
    // wrapper leaves a zero-width flex item behind, which the row's gap then pads either side of,
    // nudging the five visible portraits off-centre.
    certPortraitEx.classList.toggle('hidden', !exBossDefeated);
    certPortraitExWrap.classList.toggle('hidden', !exBossDefeated);
    renderRecords();
  }
  // Both entry points — the title screen and the story-intro screen — open the one modal.
  const openCertificate = () => { audioReady(); renderCertificate(); certOverlay.classList.remove('hidden'); };
  certOpenBtn.addEventListener('click', openCertificate);
  $('#certOpenBtnTitle').addEventListener('click', openCertificate);
  certCloseBtn.addEventListener('click', () => { audioReady(); certOverlay.classList.add('hidden'); });
  certOverlay.addEventListener('click', (e) => { if (e.target === certOverlay) certOverlay.classList.add('hidden'); });

  joinBtn.addEventListener('click', () => {
    audioReady();
    const room = normalizeRoomCode(roomInput.value);
    if (!room) {
      alert('部屋コードを入力してください');
      return;
    }
    playSelectSfx();
    const name = nameInput.value.trim() || 'プレイヤー';
    connect(room, name);
  });

  // Pre-battle dramatic pause: shows the boss's portrait/name/セリフ (line/name from the
  // server, see game.js's STORY_BOSSES; portrait from BOSS_TIER_THEME) tinted per stage,
  // then auto-hides itself — doesn't block or delay the actual countdown/round underneath,
  // purely a presentation overlay.
  // `partner` is the second boss of a hard-mode pair (null everywhere else): its portrait is
  // shown alongside the first and both names go on the name line, so the card introduces the
  // encounter rather than only half of it.
  function showBossIntro(stage, boss, isEx, partner) {
    introShownForStage = isEx ? 'EX' : stage;
    // Portrait for a boss is chosen by its OWN index in hard mode (a pair mixes stages, and
    // stage 3 pairs a numbered boss with the EX boss), not by the stage number.
    const artFor = (b) => {
      if (!b) return null;
      if (b.bossIndex === BOSS_TIER_THEME.length + 1) return { src: 'images/bosses/boss6-face.jpg', pos: 'center top' };
      const t = BOSS_TIER_THEME[Math.min(Math.max(1, b.bossIndex || stage), BOSS_TIER_THEME.length) - 1];
      return { src: t.image, pos: t.facePos };
    };
    if (partner) {
      const a1 = artFor(boss);
      const a2 = artFor(partner);
      bossIntroOverlay.style.setProperty('--boss-color', '#ff8a5a');
      bossIntroStage.textContent = `🔥ハード 第${stage}ステージ`;
      bossIntroPortrait.src = a1.src;
      bossIntroPortrait.style.objectPosition = a1.pos;
      bossIntroPortrait2.src = a2.src;
      bossIntroPortrait2.style.objectPosition = a2.pos;
      bossIntroPortrait2.classList.remove('hidden');
      bossIntroName.textContent = `${boss.name} ＆ ${partner.name}`;
      bossIntroLine.textContent = boss.line ? `「${boss.line}」` : '';
      bossIntroRule.textContent = `⚔️ ${MATCH_WIN_TARGET}本先取で勝利 ／ 2体とも倒す`;
      bossIntroOverlay.classList.remove('hidden');
      fitBossIntroCardSoon(bossIntroOverlay);
      if (bossIntroHideTimer) clearTimeout(bossIntroHideTimer);
      bossIntroHideTimer = setTimeout(() => {
        bossIntroOverlay.classList.add('hidden');
        bossIntroHideTimer = null;
      }, 5000);
      return;
    }
    bossIntroPortrait2.classList.add('hidden');
    if (isEx) {
      bossIntroOverlay.style.setProperty('--boss-color', '#ffe9a8');
      bossIntroStage.textContent = 'EX';
      bossIntroPortrait.src = 'images/bosses/boss6-face.jpg';
      bossIntroPortrait.style.objectPosition = 'center top';
    } else {
      const theme = BOSS_TIER_THEME[Math.min(Math.max(1, stage), BOSS_TIER_THEME.length) - 1];
      bossIntroOverlay.style.setProperty('--boss-color', theme.uniform);
      bossIntroStage.textContent = `第${stage}面`;
      bossIntroPortrait.src = theme.image;
      bossIntroPortrait.style.objectPosition = theme.facePos;
    }
    bossIntroName.textContent = boss.name;
    bossIntroLine.textContent = boss.line ? `「${boss.line}」` : '';
    // Per explicit request: state the win condition right before the fight. Nothing in-game ever
    // said a boss is a best-of-N — the score badge just counted up silently — so losing one round
    // looked like it could be the end of the run. Built from MATCH_WIN_TARGET rather than a fixed
    // "3" so the wording can't drift from the rule if that constant is ever retuned.
    bossIntroRule.textContent = `⚔️ ${MATCH_WIN_TARGET}本先取で勝利`;
    bossIntroOverlay.classList.remove('hidden');
    fitBossIntroCardSoon(bossIntroOverlay);
    if (bossIntroHideTimer) clearTimeout(bossIntroHideTimer);
    bossIntroHideTimer = setTimeout(() => {
      bossIntroOverlay.classList.add('hidden');
      bossIntroHideTimer = null;
    }, 5000); // ~5s dramatic pause before battle, per explicit request
  }

  // Pre-wave dramatic pause — same timing/mechanism as showBossIntro (5s, matches server's
  // STORY_INTRO_WAIT_MS via pendingMobWaveIntro), but shows fixed narration text instead of a
  // specific boss's portrait/line, since a grunt swarm has no single character to introduce.
  function showWaveIntro(index) {
    introShownForWave = index;
    const i = Math.min(Math.max(1, index), MOB_WAVE_NARRATION.length) - 1;
    // Hard mode counts STAGES, not 面 — saying "第1面" there described a stage the mode does
    // not have. Its grunts are also drawn from the hardest table (see spawnWaveMob), so the
    // title says so rather than implying this is an early, easy wave.
    const hard = !!(latestState && latestState.hardMode);
    waveIntroStage.textContent = hard ? `🔥ハード 第${index}ステージ 突破イベント` : `第${index}面 突破イベント`;
    waveIntroTitle.textContent = hard ? '⚔️ ザコモンスター大群襲来！' : '⚔️ ザコモンスター襲来！';
    waveIntroLine.textContent = MOB_WAVE_NARRATION[i];
    waveIntroOverlay.classList.remove('hidden');
    fitBossIntroCardSoon(waveIntroOverlay);
    if (waveIntroHideTimer) clearTimeout(waveIntroHideTimer);
    waveIntroHideTimer = setTimeout(() => {
      waveIntroOverlay.classList.add('hidden');
      waveIntroHideTimer = null;
    }, 5000);
  }

  // Story-mode level-up notice — unlike the boss-intro/wave-intro cards above, this can fire
  // mid-fight (right after a wave-mob or boss kill bumps room.storyLevel), so it's a small
  // auto-hiding toast rather than a full-screen dramatic-pause overlay.
  function showLevelUpToast(level) {
    levelUpValue.textContent = `Lv.${level}`;
    levelUpToast.classList.remove('hidden');
    if (levelUpHideTimer) clearTimeout(levelUpHideTimer);
    levelUpHideTimer = setTimeout(() => {
      levelUpToast.classList.add('hidden');
      levelUpHideTimer = null;
    }, 2200);
  }

  // The very first beat after defeating a story boss — a brief, purely triumphant "勝利！！"
  // flash (own fanfare sfx, played by the caller) before anything else (the boss's own
  // defeat-quote card, or the story/true-ending overlays) gets its turn. `onDone` is called
  // once the flash auto-hides, so callers chain whatever should happen next through it
  // instead of racing a second independent timer against this one.
  function showBossVictory(onDone) {
    bossVictoryOverlay.classList.remove('hidden');
    if (bossVictoryHideTimer) clearTimeout(bossVictoryHideTimer);
    bossVictoryHideTimer = setTimeout(() => {
      bossVictoryOverlay.classList.add('hidden');
      bossVictoryHideTimer = null;
      if (onDone) onDone();
    }, 1600);
  }

  // Post-victory dramatic pause: the just-defeated boss gets a defiant 捨てセリフ before the
  // "次の面へ" button appears. Called once, on the 'finished' phase-transition edge (see
  // handleState()) — stage/boss here are the JUST-CLEARED stage's, since the server only
  // advances room.storyStage once the player actually clicks that button and sends 'rematch'.
  // `onDone` (added alongside bossPresentationDone below) fires once this card actually hides
  // itself, so callers have a real completion signal instead of inferring "done" from current
  // visibility.
  // `partner` is the second boss of a hard-mode pair: per explicit request, beating a pair shows
  // BOTH of the bosses you just put down, not only the one carrying the line. Portrait art is
  // chosen per boss from its own bossIndex (a pair can mix stages, and hard stage 3 pairs a
  // numbered boss with the EX boss), falling back to the stage number for the normal campaign.
  function bossPortraitArt(b, stage) {
    if (b && b.bossIndex === BOSS_TIER_THEME.length + 1) return { src: 'images/bosses/boss6-face.jpg', pos: 'center top', uniform: '#f5e6b8' };
    const t = BOSS_TIER_THEME[Math.min(Math.max(1, (b && b.bossIndex) || stage), BOSS_TIER_THEME.length) - 1];
    return { src: t.image, pos: t.facePos, uniform: t.uniform };
  }

  function showBossDefeat(stage, boss, onDone, partner) {
    const art = bossPortraitArt(boss, stage);
    bossDefeatOverlay.style.setProperty('--boss-color', art.uniform);
    bossDefeatPortrait.style.filter = ''; // in case showExBossDefeat() last set this to 'none' — falls back to the normal dulled-grayscale CSS rule
    bossDefeatPortrait.src = art.src;
    bossDefeatPortrait.style.objectPosition = art.pos;
    if (partner) {
      const art2 = bossPortraitArt(partner, stage);
      bossDefeatPortrait2.style.filter = '';
      bossDefeatPortrait2.src = art2.src;
      bossDefeatPortrait2.style.objectPosition = art2.pos;
      bossDefeatPortrait2.classList.remove('hidden');
    } else {
      bossDefeatPortrait2.classList.add('hidden');
    }
    bossDefeatName.textContent = partner ? `${boss.name} ＆ ${partner.name}` : boss.name;
    bossDefeatLine.textContent = boss.defeatLine ? `「${boss.defeatLine}」` : '';
    bossDefeatOverlay.classList.remove('hidden');
    fitBossIntroCardSoon(bossDefeatOverlay);
    if (bossDefeatHideTimer) clearTimeout(bossDefeatHideTimer);
    bossDefeatHideTimer = setTimeout(() => {
      bossDefeatOverlay.classList.add('hidden');
      bossDefeatHideTimer = null;
      if (onDone) onDone();
    }, 5000); // per explicit request (was 4.5s)
  }

  // Slices an <img> into a grid of small tiles (each a div with the same background-image,
  // offset to show just its own slice — a classic CSS sprite trick, no canvas needed) and
  // animates them tumbling away with a per-tile random delay/direction/rotation, revealing
  // the dark card behind as they fall and fade — reads as the portrait crumbling apart. Tiles
  // are positioned `fixed` at the image's own live on-screen rect (viewport-relative) and
  // appended straight to <body> — NOT to the boss-defeat card itself, which fitBossIntroCard()
  // can give an inline `transform:scale(...)` on short viewports, and any transformed ancestor
  // becomes the containing block for `position:fixed` descendants, silently making these
  // coordinates wrong relative to the real viewport.
  function crumbleImage(imgEl, onDone) {
    const rect = imgEl.getBoundingClientRect();
    const cols = 8;
    const rows = 10;
    const tileW = rect.width / cols;
    const tileH = rect.height / rows;
    const container = document.createElement('div');
    container.className = 'crumble-container';
    const tiles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = document.createElement('div');
        tile.className = 'crumble-tile';
        tile.style.left = `${rect.left + c * tileW}px`;
        tile.style.top = `${rect.top + r * tileH}px`;
        tile.style.width = `${tileW + 0.5}px`;
        tile.style.height = `${tileH + 0.5}px`;
        tile.style.backgroundImage = `url("${imgEl.src}")`;
        tile.style.backgroundSize = `${rect.width}px ${rect.height}px`;
        tile.style.backgroundPosition = `-${c * tileW}px -${r * tileH}px`;
        tile.style.transitionDelay = `${Math.random() * 0.4}s`;
        container.appendChild(tile);
        tiles.push(tile);
      }
    }
    imgEl.style.visibility = 'hidden';
    document.body.appendChild(container);
    // Two rAFs (not one) so the tiles' initial position/opacity is actually painted before the
    // transitioned end-state is applied — with only one, browsers can coalesce both into the
    // same frame and the "fall" never visibly plays, jumping straight to the end state.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tiles.forEach((tile) => {
          const dx = (Math.random() - 0.5) * 150;
          const dy = 70 + Math.random() * 170;
          const rot = (Math.random() - 0.5) * 300;
          tile.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
          tile.style.opacity = '0';
        });
      });
    });
    setTimeout(() => {
      container.remove();
      imgEl.style.visibility = 'visible'; // restored hidden so a later reuse of this <img> starts clean
      if (onDone) onDone();
    }, 1900); // longest per-tile transition (1.1s) + longest random delay (0.4s) + margin
  }

  // The hidden EX boss's own defeat beat — distinct from showBossDefeat() above (which every
  // other boss uses): holds on the intact portrait+セリフ long enough to read, THEN crumbles
  // the portrait apart via crumbleImage() before calling onDone (the true ending overlay),
  // per explicit request for "a proper final line, and a wait while the boss's image collapses"
  // rather than the plain fade every other boss gets. Reuses bossDefeatOverlay's elements
  // (same card, no separate overlay needed) — EX_BOSS.defeatLine (game.js) already existed but
  // was never actually shown anywhere, since showBossDefeat() is deliberately never called for
  // the EX fight (see its own caller's comment); this is what finally displays it.
  function showExBossDefeat(boss, onDone) {
    bossDefeatOverlay.style.setProperty('--boss-color', '#ffe9a8');
    bossDefeatStage.textContent = '撃破！';
    bossDefeatPortrait.src = 'images/bosses/boss6-face.jpg';
    bossDefeatPortrait.style.objectPosition = 'center top';
    bossDefeatPortrait.style.visibility = 'visible';
    // Full color, not the usual dulled grayscale every other boss's defeat card applies (see
    // .boss-defeat-overlay .boss-intro-portrait) — this one's about to visibly crumble apart,
    // which reads better against its real colors than an already-desaturated image.
    bossDefeatPortrait.style.filter = 'none';
    bossDefeatName.textContent = boss.name;
    bossDefeatLine.textContent = boss.defeatLine ? `「${boss.defeatLine}」` : '';
    bossDefeatOverlay.classList.remove('hidden');
    fitBossIntroCardSoon(bossDefeatOverlay);
    if (bossDefeatHideTimer) { clearTimeout(bossDefeatHideTimer); bossDefeatHideTimer = null; }
    setTimeout(() => {
      crumbleImage(bossDefeatPortrait, () => {
        // A beat on the now-empty frame before the card itself goes away, so the crumble's
        // last falling tile doesn't cut straight into the true-ending overlay appearing.
        setTimeout(() => {
          bossDefeatOverlay.classList.add('hidden');
          if (onDone) onDone();
        }, 500);
      });
    }, 3000);
  }

  // ---- story mode: a single button starts a fresh 5-stage boss-rush campaign; the same
  // helper is reused by the game-over "retry" button so losing just restarts cleanly with
  // a brand new room rather than needing any server-side "reset to stage 1" round-trip ----
  function startStoryMode() {
    hardModeRequested = false; // the normal-mode entry point, and the game-over retry, are never hard
    const name = storyNameInput.value.trim() || 'プレイヤー';
    const room = 'CPU' + randomRoomCode();
    // storyRetryBtn can fire while a previous (just-finished) connection is still open —
    // close it first so the old room's messages can't keep arriving and interleave with
    // the new one (connect() itself never closes a prior ws, since every other caller of
    // it has only ever run from the lobby, where there was nothing left open already).
    if (ws) {
      leavingIntentionally = true;
      ws.close();
      ws = null;
    }
    resetClientState();
    connect(room, name, true, storyRouletteToggle.checked);
  }
  story1pBtn.addEventListener('click', () => { audioReady(); playSelectSfx(); startStoryMode(); });
  // In 2P co-op, retrying must restart the co-op story IN THE SAME ROOM for both players.
  // startStoryMode() always builds a fresh 'CPU'+randomRoomCode() room and connects WITHOUT
  // wantsCoop, so using it here silently dumped the clicker into a solo 1P campaign and
  // stranded their partner alone in the old room — co-op quietly became two separate games the
  // moment anyone lost. The server's 'rematch' handler already has the correct behaviour for a
  // lost story (reset to stage 1, clear matchWins/matchOver, re-intro the boss); it just needs
  // the room to still hold all three participants, which is exactly the case when nobody has
  // dropped. If the room ISN'T intact (partner already gone) co-op is impossible anyway, so
  // fall back to the original solo restart rather than leaving the button doing nothing.
  storyRetryBtn.addEventListener('click', () => {
    audioReady();
    const st = latestState;
    // Count ALLIES, not total players. This used to test `players.length === 3`, which is only
    // right for a normal co-op room (2 allies + 1 boss) — a hard-mode co-op room holds 4 (2
    // allies + 2 bosses), so the test failed and retry fell through to startStoryMode(), which
    // silently dropped the pair into a brand-new SOLO NORMAL campaign. That is exactly the
    // reported "lost the mini-game and it turned into a one-boss story".
    const allies = st && st.players ? st.players.filter((p) => !p.isBoss).length : 0;
    const bossesPresent = !!(st && st.players && st.players.some((p) => p.isBoss));
    const coopIntact = !!(st && st.storyCoop) && allies === 2 && bossesPresent;
    if (coopIntact && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'rematch' }));
    } else if (st && st.hardMode) {
      // Hard 1P (or a hard co-op room that has lost a player): restart HARD, not the normal
      // campaign — retrying must never quietly downgrade the mode the player chose.
      startHardMode1p();
    } else {
      startStoryMode();
    }
  });
  storyEndingTitleBtn.addEventListener('click', () => { audioReady(); goToTitle(); });

  // ---- story mode, 2-player co-op: same overall connect flow as startStoryMode(), just
  // room-code-based (create-or-join, like the plain arena lobby) since it needs exactly 2
  // real humans to rendezvous in the same room rather than starting solo instantly. The
  // server only actually spawns the boss once both have joined — see joinRoom()'s
  // humanTargetForCpu in game.js.
  function connectStory2p(room, name, roulette) {
    if (ws) {
      leavingIntentionally = true;
      ws.close();
      ws = null;
    }
    resetClientState();
    connect(room, name, true, roulette, true, hardModeRequested);
  }

  // ---- hard mode ----
  // Unlocked by beating the hidden EX boss, which the client already records in localStorage for
  // the certificate (exBossDefeated). `hardModeRequested` is what every connect path reads, so
  // both the 1P button and the 2P lobby flow carry the flag through without separate plumbing.
  let hardModeRequested = false;
  function refreshHardModeUnlock() {
    hardModeBlock.classList.toggle('hidden', !exBossDefeated);
  }
  function startHardMode1p() {
    hardModeRequested = true;
    const name = storyNameInput.value.trim() || 'プレイヤー';
    const room = 'HARD' + randomRoomCode();
    if (ws) { leavingIntentionally = true; ws.close(); ws = null; }
    resetClientState();
    connect(room, name, true, storyRouletteToggle.checked, false, true);
  }
  hard1pBtn.addEventListener('click', () => { audioReady(); playSelectSfx(); startHardMode1p(); });
  hard2pBtn.addEventListener('click', () => {
    audioReady();
    playSelectSfx();
    hardModeRequested = true; // consumed by connectStory2p() when the lobby finally connects
    if (storyNameInput.value.trim() && !story2pNameInput.value.trim()) {
      story2pNameInput.value = storyNameInput.value;
    }
    storyIntro.classList.add('hidden');
    story2pLobby.classList.remove('hidden');
  });
  story2pBtn.addEventListener('click', () => {
    audioReady();
    playSelectSfx();
    // Carry over whatever name was already typed on #storyIntro — story2pNameInput is a
    // separate <input> (2P co-op has its own lobby screen/layout), so without this the name
    // silently resets to blank and had to be retyped every time.
    if (storyNameInput.value.trim() && !story2pNameInput.value.trim()) {
      story2pNameInput.value = storyNameInput.value;
    }
    storyIntro.classList.add('hidden');
    story2pLobby.classList.remove('hidden');
  });
  story2pBackBtn.addEventListener('click', () => {
    audioReady();
    cancelPendingConnect();
    story2pLobby.classList.add('hidden');
    storyIntro.classList.remove('hidden');
  });
  story2pCreateBtn.addEventListener('click', () => {
    audioReady();
    playSelectSfx();
    const room = randomRoomCode();
    const name = story2pNameInput.value.trim() || 'プレイヤー';
    connectStory2p(room, name, story2pRouletteToggle.checked);
  });
  story2pJoinBtn.addEventListener('click', () => {
    audioReady();
    const room = normalizeRoomCode(story2pRoomInput.value);
    if (!room) {
      alert('部屋コードを入力してください');
      return;
    }
    playSelectSfx();
    const name = story2pNameInput.value.trim() || 'プレイヤー';
    connectStory2p(room, name, story2pRouletteToggle.checked);
  });
  challengeExBtn.addEventListener('click', () => {
    audioReady();
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'startExStage' }));
  });
  // Explicit タイトルへ戻る button (per explicit request — was a whole-screen tap-anywhere
  // hint with no visible button) — see trueEndingTapReady below, set true only after the 10s
  // "let the ending sit" timer elapses. The whole overlay stays clickable too as a convenience,
  // same guard.
  trueEndingTitleBtn.addEventListener('click', () => {
    if (!trueEndingTapReady) return;
    audioReady();
    goToTitle();
  });
  trueEndingOverlay.addEventListener('click', () => {
    if (!trueEndingTapReady) return;
    audioReady();
    goToTitle();
  });

  rematchBtn.addEventListener('click', () => {
    audioReady();
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'rematch' }));
  });

  // ---- bombs ----
  function placeBomb() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const me = latestState && latestState.players.find((p) => p.id === myId);
    if (me && (me.bombs || 0) > 0 && window.GameAudio) window.GameAudio.playBombPlace();
    ws.send(JSON.stringify({ type: 'placeBomb' }));
  }
  function detonateBombs() {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'detonateBomb' }));
  }
  placeBombBtn.addEventListener('click', () => { audioReady(); placeBomb(); });
  detonateBombBtn.addEventListener('click', () => { audioReady(); detonateBombs(); });

  // ---- firing: holding the button/key fires continuously (rate-limited server-side by
  // the normal cooldown), matching how the CPU has always fired via inp.shooting ----
  let shooting = false;
  fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); audioReady(); shooting = true; }, { passive: false });
  fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); shooting = false; }, { passive: false });
  fireBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); shooting = false; }, { passive: false });
  fireBtn.addEventListener('mousedown', () => { audioReady(); shooting = true; });
  fireBtn.addEventListener('mouseleave', () => { shooting = false; });

  // ---- sword: same hold-to-attack pattern as firing, independent button/key so both can
  // be held at once (server just runs whichever checks pass each tick) ----
  let swording = false;
  swordBtn.addEventListener('touchstart', (e) => { e.preventDefault(); audioReady(); swording = true; swordBtn.classList.add('active'); }, { passive: false });
  swordBtn.addEventListener('touchend', (e) => { e.preventDefault(); swording = false; swordBtn.classList.remove('active'); }, { passive: false });
  swordBtn.addEventListener('touchcancel', (e) => { e.preventDefault(); swording = false; swordBtn.classList.remove('active'); }, { passive: false });
  swordBtn.addEventListener('mousedown', () => { audioReady(); swording = true; swordBtn.classList.add('active'); });
  swordBtn.addEventListener('mouseleave', () => { swording = false; swordBtn.classList.remove('active'); });
  window.addEventListener('mouseup', () => { swording = false; swordBtn.classList.remove('active'); });

  // ---- keyboard ----
  window.addEventListener('keydown', (e) => {
    if (setKey(e.code, true)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Space') audioReady();
    if (e.code === 'KeyQ') audioReady();
    if (e.code === 'KeyE') placeBomb();
    if (e.code === 'KeyF') detonateBombs();
  });
  window.addEventListener('keyup', (e) => {
    setKey(e.code, false);
  });
  function setKey(code, val) {
    if (code === 'KeyW' || code === 'ArrowUp') { keys.up = val; return true; }
    if (code === 'KeyS' || code === 'ArrowDown') { keys.down = val; return true; }
    if (code === 'KeyA' || code === 'ArrowLeft') { keys.left = val; return true; }
    if (code === 'KeyD' || code === 'ArrowRight') { keys.right = val; return true; }
    if (code === 'Space') { shooting = val; return true; }
    if (code === 'KeyQ') { swording = val; swordBtn.classList.toggle('active', val); return true; }
    return false;
  }

  // ---- mouse aim (PC: free-look independent of movement) + hold to fire ----
  canvas.addEventListener('mousemove', (e) => {
    if (usingTouchAim) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = arena.w / rect.width;
    const scaleY = arena.h / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const me = latestState && latestState.players.find((p) => p.id === myId);
    if (me) aimAngle = Math.atan2(my - me.y, mx - me.x);
  });
  canvas.addEventListener('mousedown', () => { audioReady(); shooting = true; });
  window.addEventListener('mouseup', () => { shooting = false; });

  // ---- floating joystick: movement only — no separate aim stick anymore. Wherever the
  // player first touches (anywhere on the game screen, except on top of a <button>)
  // becomes the stick's center; the ship's facing direction follows the drag direction
  // and is retained (not reset) once the touch ends, so firing still aims the last way
  // you moved even while standing still. ----
  const JOYSTICK_RADIUS = 55;
  let joystickTouchId = null;
  let joystickOrigin = { x: 0, y: 0 };

  function isButtonTouch(el) {
    // Also excludes the top HUD (.hud) — dragging from your own HP bar to move was never a
    // real use pattern anyway, and this doubles as a genuine scroll-fallback escape hatch:
    // #game's touch-action:none + this handler's own preventDefault() below are what actually
    // block native touch-scroll (not the CSS property alone), so a touch that never reaches
    // preventDefault (because it started on the excluded HUD) can still scroll the page
    // normally if fitArena()'s sizing is ever off by enough to matter on some OS/browser.
    // Also excludes every *-overlay element (game-over, boss-intro/-defeat/-victory, story-
    // ending, wait/pause/result, the modal help/certificate overlays — all consistently named
    // "...overlay" in index.html, matched by substring so a new one added later is covered for
    // free) — these can be taller than the space they're shown in (see .game-over-overlay's
    // overflow-y:auto) and rely on a real touch-scroll to bring a below-the-fold button (e.g.
    // the retry button after dying) into reach; without this exclusion, a touch starting on the
    // overlay's background instead got captured as a joystick drag with its own preventDefault,
    // silently blocking that scroll and leaving the button visible-but-unreachable. Confirmed
    // as the actual mechanism behind a real "the retry button is cut off and I can't press it"
    // report, not just a theoretical concern.
    return !!(el && el.closest && (
      el.closest('button') || el.closest('.hud') || el.closest('[class*="overlay"]')
    ));
  }

  function joystickUpdate(clientX, clientY) {
    const dx = clientX - joystickOrigin.x;
    const dy = clientY - joystickOrigin.y;
    const dist = Math.min(JOYSTICK_RADIUS, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * dist;
    const ky = Math.sin(angle) * dist;
    floatJoystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    const active = dist > JOYSTICK_RADIUS * 0.15;
    keys.left = active && Math.cos(angle) < -0.35;
    keys.right = active && Math.cos(angle) > 0.35;
    keys.up = active && Math.sin(angle) < -0.35;
    keys.down = active && Math.sin(angle) > 0.35;
    if (active) {
      usingTouchAim = true;
      aimAngle = angle;
    }
  }

  gameScreen.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (joystickTouchId !== null) continue;
      if (isButtonTouch(t.target)) continue;
      joystickTouchId = t.identifier;
      audioReady();
      joystickOrigin = { x: t.clientX, y: t.clientY };
      floatJoystick.style.left = `${t.clientX}px`;
      floatJoystick.style.top = `${t.clientY}px`;
      floatJoystick.classList.remove('hidden');
      floatJoystickKnob.style.transform = 'translate(-50%, -50%)';
      joystickUpdate(t.clientX, t.clientY);
      e.preventDefault();
    }
  }, { passive: false });

  gameScreen.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === joystickTouchId) {
        joystickUpdate(t.clientX, t.clientY);
        e.preventDefault();
      }
    }
  }, { passive: false });

  function joystickEnd(e) {
    for (const t of e.changedTouches) {
      if (t.identifier === joystickTouchId) {
        joystickTouchId = null;
        floatJoystick.classList.add('hidden');
        keys.left = keys.right = keys.up = keys.down = false;
      }
    }
  }
  gameScreen.addEventListener('touchend', joystickEnd);
  gameScreen.addEventListener('touchcancel', joystickEnd);

  // ---- send input to server (held fire state included — server rate-limits by cooldown) ----
  setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'input',
        up: keys.up, down: keys.down, left: keys.left, right: keys.right,
        angle: aimAngle,
        shooting,
        swording,
      }));
    }
  }, 1000 / 30);

  // Was "my side" (me, or in co-op my ally) the winner of this round/match? Needed because
  // in co-op mode state.winnerId/matchWinnerId is always a stable *representative ally* id
  // (see game.js's win-condition comment) — could be my teammate's id even when my own team
  // won, so a plain `resultId === myId` comparison would wrongly read as a loss for whichever
  // ally isn't that representative. For every non-coop mode this is exactly the original
  // `resultId === myId` comparison, unchanged.
  function humanSideWon(state, resultId) {
    if (!state.storyCoop) return resultId === myId;
    const winner = state.players.find((p) => p.id === resultId);
    return !!winner && !winner.isBoss;
  }

  // ---- state handling: diff against previous state to trigger sfx/fx ----
  function handleState(state) {
    // Assigned first, before any of the diff/sfx logic below — draw()/updateHud() render
    // purely off latestState, so if a bug anywhere later in this function throws, the visible
    // game still gets this frame's fresh position/hp/etc. instead of silently freezing on the
    // last frame that happened to fully succeed (which would look exactly like a hung game,
    // with the WebSocket still receiving data underneath). prevState (used for diffing against
    // the previous frame) is intentionally set separately, at the very end of this function —
    // moving it here too would make every diff check below compare state against itself.
    latestState = state;
    const audio = window.GameAudio;

    // Resync the module-level isCpuMatch on every broadcast, not just the one-time 'welcome'
    // message — in 2P co-op specifically, the room's FIRST joiner's 'welcome' is sent before
    // the boss/CPU is added (addCpuPlayer only runs once both humans have joined, see
    // joinRoom's humanTargetForCpu), so their welcome payload's isCpuMatch is still false at
    // that point and would otherwise stay stuck false for their whole session — silently
    // breaking drawShip()'s isAlly calc (isAlly requires isCpuMatch) and making their ally
    // render in the enemy color instead of green for that player only.
    isCpuMatch = !!state.isCpuMatch;
    if (state.isCpuMatch) {
      storyStage = state.storyStage || storyStage;
      storyStageCount = state.storyStageCount || storyStageCount;
      // Fires once per stage (not once per round within that stage's best-of-3) — the
      // 'waiting'->'countdown' transition happens both for the very first connection and
      // for every subsequent rematch/stage-advance, so gating on storyStage having actually
      // changed since the last time we showed the card is what keeps this from re-popping
      // on round 2/3 of the same boss's series. The EX boss fight keeps storyStage frozen at
      // its pre-EX value (5), so it needs its own guard key ('EX', a string — always !==
      // whatever numeric stage was last shown) rather than reusing the plain stage number.
      const introKey = state.exBossActive ? 'EX' : state.storyStage;
      if (state.phase === 'countdown' && state.storyStage && !state.mobWaveActive && introKey !== introShownForStage) {
        const bs = state.players.filter((p) => p.isBoss);
        if (bs[0]) showBossIntro(state.storyStage, bs[0], state.exBossActive, bs[1] || null);
      }
      // Grunt-wave narration — same "fires once per transition, gated by a remembered key"
      // pattern as the boss intro above, keyed by mobWaveIndex instead of storyStage.
      if (state.phase === 'countdown' && state.mobWaveActive && state.mobWaveIndex !== introShownForWave) {
        showWaveIntro(state.mobWaveIndex);
      }
      // Level-up toast — fires the instant storyLevel actually increases (checked on every
      // broadcast, not just phase transitions, since a level-up can land mid-fight). Always
      // resyncs lastStoryLevel either way (up with a toast, or silently down on a story
      // restart) so a later re-level-up after a restart isn't suppressed by a stale high
      // watermark from the previous run.
      // Levels are per player now (see game.js's addStoryXp), so this watches MY OWN level off
      // the players array rather than a room-wide field. The toast/fanfare deliberately fires
      // only for my own level-up — in co-op an ally levelling is their moment, and firing the
      // full-screen toast for both would mean interruptions I didn't earn.
      const meForLevel = state.players.find((p) => p.id === myId);
      if (meForLevel && typeof meForLevel.storyLevel === 'number') {
        if (meForLevel.storyLevel > lastStoryLevel) {
          showLevelUpToast(meForLevel.storyLevel);
          if (audio) audio.playLevelUp();
        }
        lastStoryLevel = meForLevel.storyLevel;
      }
    }

    // countdown ticks
    if (state.phase === 'countdown' && state.countdown !== lastCountdown) {
      if (audio) audio.playCountdownTick(false);
      lastCountdown = state.countdown;
    }

    // phase transitions
    if (state.phase !== lastPhase) {
      if (state.phase === 'playing') {
        if (audio) { audio.playCountdownTick(true); audio.startBgm(); }
      }
      if (lastPhase === 'playing' && state.phase !== 'playing') {
        if (audio) audio.stopBgm();
      }
      if (state.phase === 'finished') {
        if (audio) {
          if (humanSideWon(state, state.winnerId)) audio.playWin(); else audio.playLose();
        }
        // storyStage still holds the just-cleared stage number here (the server only
        // increments it once a 'rematch' is actually sent, same timing this file's other
        // finalStageClear logic already relies on) — fires exactly once per real boss kill
        // since this whole block only runs on the 'finished' phase-transition edge, not on
        // every repeated broadcast while sitting in that phase.
        if (isCpuMatch && state.matchOver && humanSideWon(state, state.matchWinnerId)) {
          // A wave-clear also reaches matchOver/humanSideWon (see game.js's mobWaveActive
          // win-check), but it isn't a boss kill — the boss was already recorded when the
          // *previous* round (the actual boss fight) finished, so skip re-recording here and
          // skip the boss's defeat-quote card below (there's no boss on screen to have said it).
          // Hard mode is excluded: its stage numbers are 1-3 and mean "boss pair 1-3", not
          // "normal campaign stage 1-3". Recording them here wrote into the normal campaign's
          // per-stage clear sets, so clearing hard stage 1 in co-op lit the 🤝 badge for normal
          // stage 1 the player might never have cleared that way. Hard mode has its own
          // certificate record (hardCleared / tier 7).
          if (!state.mobWaveActive && !state.hardMode) recordBossDefeated(storyStage, !!state.storyCoop);
          if (state.exBossActive) recordExBossDefeated();
          // Time records and achievement badges. Same edge, same "this is a real boss kill"
          // test — a wave clear reaches here too and gets its own, much smaller, evaluation.
          if (state.mobWaveActive) evaluateWaveRecords(state);
          else evaluateRecords(state, storyStage);
          bossPresentationDone = false; // reset for this kill — flipped true once whichever branch below actually finishes
          // The boss's whole dramatic presentation (fanfare + "勝利！！" flash + defeat-quote
          // card) per explicit request must wait for the roulette to fully finish first — the
          // flash/card overlays sit at a much higher z-index than `.roulette-block` and used to
          // fire in parallel with it, effectively covering the spin for its whole duration.
          // storyStage < storyStageCount here means there's a next stage to advance to —
          // storyStageCount reflects the freshly-received state, same as everywhere else.
          // Chained through showBossVictory's onDone rather than fired in parallel, so the
          // two dramatic pauses play out one after another, not stacked/racing.
          const playBossVictorySequence = () => {
            if (audio) audio.playBossVictory();
            showBossVictory(() => {
              if (state.exBossActive) {
                // The true ending (trueEndingClear in updateHud()) waits on
                // bossPresentationDone specifically so it can't appear before this finishes.
                const boss = state.players.find((p) => p.isBoss);
                if (boss) {
                  showExBossDefeat(boss, () => { bossPresentationDone = true; });
                } else {
                  bossPresentationDone = true;
                }
              } else if (!state.mobWaveActive && storyStage < storyStageCount) {
                const bs = state.players.filter((p) => p.isBoss);
                const boss = bs[0];
                if (boss) {
                  showBossDefeat(storyStage, boss, () => { bossPresentationDone = true; }, bs[1] || null);
                } else {
                  bossPresentationDone = true;
                }
              } else {
                // waveCleared (no defeat-quote card for a wave-clear — see the guard above),
                // or finalStageClear (storyEndingOverlay handles its own reveal timing off
                // bossVictoryOverlay directly, doesn't read this flag) — either way, the
                // dramatic sequence for THIS kill is done the instant the flash itself ends.
                bossPresentationDone = true;
              }
            });
          };
          if (state.rouletteEnabled && state.rouletteResult) {
            runRoulette(state.rouletteResult, state, () => {
              setTimeout(playBossVictorySequence, 1000); // explicit 1s breathing room after the roulette settles
            });
          } else {
            rouletteBlock.classList.add('hidden');
            playBossVictorySequence();
          }
        } else if (state.rouletteEnabled && state.rouletteResult) {
          // No boss-victory sequence to wait for this round (mid-series round, arena PvP, etc.)
          // — the roulette just runs on its own, same as before.
          runRoulette(state.rouletteResult, state);
        } else {
          rouletteBlock.classList.add('hidden');
        }
        // Boss won the whole series — let the "GAME OVER" moment sit for a few seconds
        // before the retry button appears (see gameOverRetryReady), rather than offering
        // an instant one-click retry that would undercut the defeat.
        if (isCpuMatch && state.matchOver && !humanSideWon(state, state.matchWinnerId)) {
          gameOverRetryReady = false;
          if (gameOverTimer) clearTimeout(gameOverTimer);
          gameOverTimer = setTimeout(() => {
            gameOverRetryReady = true;
            gameOverTimer = null;
          }, 3000);
        }
        // Every OTHER round end (an ordinary 1-of-3 decision, either way) gets its own 3s beat
        // before the next-round button, per explicit request — started here on the phase edge so
        // it runs once, not restarted by each of the ~30Hz broadcasts that follow.
        roundPauseReady = false;
        if (roundPauseTimer) clearTimeout(roundPauseTimer);
        roundPauseTimer = setTimeout(() => {
          roundPauseReady = true;
          roundPauseTimer = null;
        }, 3000);
      }
      if (lastPhase === 'finished' && state.phase !== 'finished') {
        rouletteBlock.classList.add('hidden');
      }
      if (state.phase === 'waiting') {
        seenBulletIds = new Set();
        particles = [];
        laserBeams = [];
        swordSlashes = [];
        shockwaves = [];
        bulletPos.clear();
      }
      lastPhase = state.phase;
    }

    // new bullets -> shoot sfx + muzzle flash
    for (const b of state.bullets) {
      if (!seenBulletIds.has(b.id)) {
        seenBulletIds.add(b.id);
        if (audio) audio.playShoot();
        const owner = state.players.find((p) => p.id === b.ownerId);
        // Muzzle sparks share the bullet's colour — they are part of the same shot, and leaving
        // them on the old 3-way me/ally/enemy palette would have them disagree with the round
        // that just left the barrel.
        spawnParticles(b.x, b.y, 5, shadeAnyColor(characterColor(owner), 1.35), 90, 0.22, 4);
        triggerShotRecoil(owner); // rifle kick + muzzle flash + ejected casing on the shooter
      }
    }
    // prune seen bullet ids that are gone, to avoid unbounded growth
    if (seenBulletIds.size > 400) {
      const alive = new Set(state.bullets.map((b) => b.id));
      seenBulletIds = alive;
    }

    // bullets that vanished (wall hit or went out of bounds) -> small impact spark
    const currentBulletIds = new Set(state.bullets.map((b) => b.id));
    for (const [id, pos] of bulletPos) {
      if (!currentBulletIds.has(id)) {
        spawnParticles(pos.x, pos.y, 5, '#c9d3ff', 80, 0.22, 3);
      }
    }
    bulletPos.clear();
    for (const b of state.bullets) bulletPos.set(b.id, { x: b.x, y: b.y });

    // laser shots are instantaneous (hitscan) — render/play them the moment they arrive
    for (const laser of state.lasers || []) {
      if (audio) audio.playLaser();
      const laserOwner = state.players.find((p) => p.id === laser.ownerId);
      const color = sideColor(laserOwner, '#9dbaff', '#7dffb0', '#ff8080');
      laserBeams.push({ x1: laser.x1, y1: laser.y1, x2: laser.x2, y2: laser.y2, life: 0.18, maxLife: 0.18, color });
      if (laser.hit) spawnParticles(laser.x2, laser.y2, 8, ITEM_META.laser.color, 120, 0.3, 4);
    }

    // sword swings are also instantaneous (server resolves the hit synchronously) — same
    // fresh-every-tick pattern as lasers, render/play them the moment they arrive
    for (const swing of state.swordSwings || []) {
      if (audio) audio.playSword(swing.hit);
      // Tinted to match the swinging player's own ship color (same 3-way me/ally/enemy split
      // and exact hex values as drawShip's uniform/drawBomb's ring), computed once here at
      // creation time rather than re-looked-up every frame in drawSwordSlashes.
      const swingOwner = state.players.find((p) => p.id === swing.ownerId);
      triggerSwordSwing(swingOwner); // put the swinger's own body into the blade pose, not just the arc
      // The swinger's OWN colour, per explicit request — this used to be a 3-way me/ally/enemy
      // bucket, so every boss's arc was the same red regardless of which boss swung it.
      const color = characterColorRgb(swingOwner);
      swordSlashes.push({ x: swing.x, y: swing.y, angle: swing.angle, hit: swing.hit, range: swing.range, life: 0.24, maxLife: 0.24, color });
      if (swing.hit) {
        const reach = swing.range || SWORD_RANGE_VISUAL;
        const hx = swing.x + Math.cos(swing.angle) * reach;
        const hy = swing.y + Math.sin(swing.angle) * reach;
        spawnParticles(hx, hy, 10, '#d8e6ff', 150, 0.3, 4);
      }
    }

    // bomb explosions are transient (server clears/rebuilds the list every tick), so
    // every entry received here is by definition new this tick — no id-diffing needed
    for (const ex of state.explosions || []) {
      if (audio) audio.playExplosion();
      spawnParticles(ex.x, ex.y, 34, '#ffb347', 230, 0.6, 7);
      shockwaves.push({ x: ex.x, y: ex.y, life: 0.45, maxLife: 0.45, maxRadius: ex.radius || 90 });
      const me2 = state.players.find((p) => p.id === myId);
      if (me2 && Math.hypot(me2.x - ex.x, me2.y - ex.y) < (ex.radius || 90) + 40) {
        shakeMag = Math.max(shakeMag, 20);
        hitFlash = Math.max(hitFlash, 1);
      }
    }

    // destroyed blocks: present in prevState but gone now -> break effect + sound
    if (prevState && prevState.blocks) {
      for (const pb of prevState.blocks) {
        if (!(state.blocks || []).some((b) => b.id === pb.id)) {
          const cx = pb.x + pb.w / 2;
          const cy = pb.y + pb.h / 2;
          if (audio) audio.playBlockBreak();
          spawnParticles(cx, cy, 18, '#c9a05a', 160, 0.4, 5);
        }
      }
    }

    // defeated monsters: same id-diffing pattern as blocks — present before, gone now.
    // A proper explosion (shockwave ring + bigger burst + shake near the player), not
    // just a particle puff, so defeating one actually feels like a kill — same visual
    // language as a bomb blast, just green-tinted and smaller-radius.
    if (prevState && prevState.monsters) {
      for (const pm of prevState.monsters) {
        if (!(state.monsters || []).some((m) => m.id === pm.id)) {
          if (audio) audio.playMonsterDefeat();
          spawnParticles(pm.x, pm.y, 34, '#9dff6b', 240, 0.55, 7);
          shockwaves.push({ x: pm.x, y: pm.y, life: 0.4, maxLife: 0.4, maxRadius: 75, color: '#9dff6b' });
          const meMonster = state.players.find((p) => p.id === myId);
          if (meMonster && Math.hypot(meMonster.x - pm.x, meMonster.y - pm.y) < 75 + 40) {
            shakeMag = Math.max(shakeMag, 14);
            hitFlash = Math.max(hitFlash, 0.5);
          }
        }
      }
    }

    // gold monster ranged attack pulses — fresh every tick (same pattern as lasers/sword
    // swings), so every entry here is by definition a new attack this tick
    for (const atk of state.monsterAttacks || []) {
      if (audio) audio.playMonsterAttack();
      shockwaves.push({ x: atk.x, y: atk.y, life: 0.4, maxLife: 0.4, maxRadius: atk.range || 160, color: '#ffd35b' });
      if (atk.hit) {
        const me3 = state.players.find((p) => p.id === myId);
        if (me3 && Math.hypot(me3.x - atk.x, me3.y - atk.y) < (atk.range || 160)) {
          shakeMag = Math.max(shakeMag, 12);
          hitFlash = Math.max(hitFlash, 0.6);
        }
      }
    }

    // hp loss / death detection
    if (prevState) {
      for (const p of state.players) {
        const prev = prevState.players.find((q) => q.id === p.id);
        if (prev && p.hp < prev.hp) {
          if (audio) audio.playHit();
          spawnParticles(p.x, p.y, 10, '#ff8a9e', 140, 0.4, 5);
          if (p.id === myId) {
            shakeMag = 14;
            hitFlash = 1;
          }
        } else if (prev && p.hp > prev.hp) {
          // a heal item grants +35hp in one tick; passive house-regen only trickles in a
          // fraction of an hp per tick — a small delta means the latter, and needs a much
          // quieter, throttled cue instead of the full pickup jingle firing every ~33ms
          if (p.hp - prev.hp > 2) {
            if (audio) audio.playPickup('heal');
            spawnParticles(p.x, p.y, 16, ITEM_META.heal.color, 140, 0.5, 5);
          } else {
            const nowMs = performance.now();
            if (nowMs - lastHouseHealSfxAt > 1200) {
              lastHouseHealSfxAt = nowMs;
              if (audio) audio.playHouseHealTick();
            }
            if (Math.random() < 0.3) spawnParticles(p.x, p.y, 2, ITEM_META.heal.color, 40, 0.4, 3);
          }
        }
        if (prev && prev.alive && !p.alive) {
          spawnParticles(p.x, p.y, 26, sideColor(p, '#9dbaff', '#a8ffcf', '#ffd0da'), 200, 0.6, 6);
        }
        if (prev && p.shieldAmount < prev.shieldAmount) {
          if (audio) audio.playShieldHit();
          spawnParticles(p.x, p.y, 12, '#6de3ff', 150, 0.35, 4);
        }
        if (prev) {
          for (const type of Object.keys(BUFF_META)) {
            const before = prev.buffs ? prev.buffs[type] : 0;
            const after = p.buffs ? p.buffs[type] : 0;
            if (!before && after) {
              if (audio) audio.playPickup(type);
              spawnParticles(p.x, p.y, 18, ITEM_META[type].color, 160, 0.5, 5);
            }
          }
        }
      }
    }

    prevState = state;
  }

  // ---- rendering (independent rAF loop for smooth particle/shake motion) ----
  let lastFrameTime = performance.now();

  function updateEffects(dt) {
    shakeMag = Math.max(0, shakeMag - dt * 60);
    hitFlash = Math.max(0, hitFlash - dt * 2.2);
    particles = particles.filter((pt) => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.92;
      pt.vy *= 0.92;
      pt.life -= dt;
      return pt.life > 0;
    });
    laserBeams = laserBeams.filter((l) => {
      l.life -= dt;
      return l.life > 0;
    });
    swordSlashes = swordSlashes.filter((s) => {
      s.life -= dt;
      return s.life > 0;
    });
    shockwaves = shockwaves.filter((s) => {
      s.life -= dt;
      return s.life > 0;
    });
  }

  function spawnTrails() {
    if (!latestState) return;
    for (const p of latestState.players) {
      if (!p.alive) continue;
      const last = trailLast.get(p.id);
      // Sparser and much smaller than it used to be (every 9px instead of 5, size 3 instead of
      // 6, ~half the alpha). At the old weight this read as a string of soft bubbles following
      // each soldier, which fought the grounded battlefield look the rest of the character work
      // is going for — and the footfall dust in updateShipMotion() now covers "something is
      // moving here" far better. Kept, at a whisper, purely for the side-colour identity cue
      // that matters in 2P co-op.
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 9) {
        particles.push({
          x: p.x, y: p.y, vx: 0, vy: 0,
          life: 0.3, maxLife: 0.3,
          color: sideColor(p, 'rgba(91,140,255,0.26)', 'rgba(125,255,176,0.26)', 'rgba(255,91,122,0.26)'),
          size: 3,
        });
        trailLast.set(p.id, { x: p.x, y: p.y });
      }
    }
  }

  // ---- per-soldier animation state (client-only, derived purely from the state stream) ----
  // The server sends only position + aim angle per player. Everything that makes a soldier read
  // as *human* — the walk cycle, which way they're actually stepping, lean, rifle recoil, muzzle
  // flash — is derived here from how those two numbers change between frames, so none of it
  // needs a protocol change or costs any bandwidth. Keyed by player id, and since ids are
  // regenerated on reconnect (see the reconnect notes elsewhere in this file) this is swept in
  // resetClientState() rather than being trusted to stay valid across rounds.
  const shipMotion = new Map();
  const MUZZLE_FLASH_MS = 70;
  // Mirrors game.js's SWORD_ARC_HALF_ANGLE, and the 0.24s life the slash fan is spawned with —
  // the soldier's own blade is animated off the SAME numbers as that effect, so the blade the
  // character is holding stays glued to the leading edge of the arc instead of drifting out of
  // step with it.
  const SWORD_ARC_HALF_ANGLE = Math.PI / 4;
  const SWORD_SWING_MS = 240;
  // Per explicit request, characters (and their hitbox — see game.js's PLAYER_RADIUS, raised
  // 16 -> 19.2 to match) are 1.2x bigger. Kept as `1.25 * SIZE_UP` rather than folded into one
  // number so the two factors stay readable: 1.25 is the original "draw the soldier nearer its
  // true collision radius than the old ~10px torso" figure, SIZE_UP is this request.
  const SIZE_UP = 1.2;
  const BODY_SCALE = 1.25 * SIZE_UP;
  const STRIDE_LENGTH = 26; // px travelled per full two-step gait cycle
  const GAIT_FULL_SPEED = 200; // ~BASE_PLAYER_SPEED(220) — the speed at which the run animation is at full amplitude

  function getShipMotion(id) {
    let m = shipMotion.get(id);
    if (!m) {
      m = {
        x: null, y: null, // last seen position, for the per-frame delta
        mx: 1, my: 0, // unit movement direction in world space (kept from the last real move, so it doesn't snap on stop)
        speed: 0, // smoothed px/sec
        stride: 0, // radians; advanced by DISTANCE, not time, so feet never slide
        lastFootfall: 0,
        recoil: 0, // 1 right as a shot leaves, decaying to 0 — set by triggerShotRecoil()
        lastFireAt: -1e9,
        lastSwordAt: -1e9, // set by triggerSwordSwing(); drives the blade pose in drawShip()
      };
      shipMotion.set(id, m);
    }
    return m;
  }

  function updateShipMotion(dt, now) {
    if (!latestState) return;
    for (const p of latestState.players) {
      const m = getShipMotion(p.id);
      if (m.x === null) { m.x = p.x; m.y = p.y; }
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const dist = Math.hypot(dx, dy);
      m.x = p.x;
      m.y = p.y;

      if (dist > 0.01) {
        m.stride += (dist / STRIDE_LENGTH) * Math.PI * 2;
        m.mx = dx / dist;
        m.my = dy / dist;
      }
      const instSpeed = dt > 0 ? dist / dt : 0;
      // Smoothed so one dropped or duplicated state frame doesn't visibly hitch the gait — the
      // state stream is ~30Hz while this runs at display rate, so raw per-frame deltas are lumpy.
      m.speed += (instSpeed - m.speed) * Math.min(1, dt * 12);
      m.recoil = Math.max(0, m.recoil - dt * 7);

      // One dust puff per footfall (half a stride cycle) while genuinely running, kicked up
      // behind the soldier — the cheapest possible "these boots are on dirt" cue.
      if (p.alive && m.speed > 45) {
        const half = Math.floor(m.stride / Math.PI);
        if (half !== m.lastFootfall) {
          m.lastFootfall = half;
          particles.push({
            x: p.x - m.mx * 8 + (Math.random() - 0.5) * 4,
            y: p.y - m.my * 8 + (Math.random() - 0.5) * 4,
            vx: -m.mx * 14 + (Math.random() - 0.5) * 12,
            vy: -m.my * 14 + (Math.random() - 0.5) * 12,
            life: 0.42, maxLife: 0.42,
            color: 'rgba(150,128,92,0.5)',
            size: 3.4,
          });
        }
      }
    }
  }

  // Puts the soldier into the sword pose for SWORD_SWING_MS. Until now a swing only ever drew
  // the detached arc effect (drawSwordSlashes) while the character underneath went on calmly
  // holding their rifle — so the slash read as something happening NEAR the soldier rather than
  // something they did. Driven from the same per-tick swordSwings list that spawns that arc, so
  // the two are guaranteed to start on the same frame.
  // ---- monster animation state ----
  // Same derive-it-from-the-position-stream approach as shipMotion: the server sends monsters as
  // bare {x,y} with no facing and no animation, so which way a grunt is looking and whether it is
  // walking are both worked out here from frame-to-frame movement. Keyed by monster id, swept
  // whenever the monster list no longer contains that id so a long wave cannot leak entries.
  const mobMotion = new Map();
  const MOB_STRIDE_LENGTH = 15; // px travelled per full two-step cycle — shorter than a soldier's, so grunts read as scurrying
  function updateMobMotion(dt) {
    if (!latestState) return;
    const live = new Set();
    for (const m of latestState.monsters || []) {
      live.add(m.id);
      let s = mobMotion.get(m.id);
      if (!s) {
        // Starts facing 'down' so a monster that has not moved yet faces the camera, rather than
        // showing you the back of something you have never seen the front of.
        s = { x: m.x, y: m.y, dir: 'down', stride: 0, speed: 0 };
        mobMotion.set(m.id, s);
      }
      const dx = m.x - s.x;
      const dy = m.y - s.y;
      const dist = Math.hypot(dx, dy);
      s.x = m.x;
      s.y = m.y;
      if (dist > 0.01) {
        s.stride += (dist / MOB_STRIDE_LENGTH) * Math.PI * 2;
        // Dominant axis picks the sprite, biased toward KEEPING the current facing (the 1.25 vs
        // 0.8 asymmetry): a monster homing diagonally sits right on the axis boundary and would
        // otherwise flip between two sprites every few frames.
        const horizBias = (s.dir === 'left' || s.dir === 'right') ? 0.8 : 1.25;
        if (Math.abs(dx) > Math.abs(dy) * horizBias) s.dir = dx < 0 ? 'left' : 'right';
        else s.dir = dy < 0 ? 'up' : 'down';
      }
      const inst = dt > 0 ? dist / dt : 0;
      s.speed += (inst - s.speed) * Math.min(1, dt * 10);
    }
    if (mobMotion.size > live.size) {
      for (const id of [...mobMotion.keys()]) if (!live.has(id)) mobMotion.delete(id);
    }
  }

  function triggerSwordSwing(p) {
    if (!p) return;
    getShipMotion(p.id).lastSwordAt = performance.now();
  }

  // Kicks the shooter's rifle back, lights the muzzle flash drawn in drawShip(), and flicks a
  // brass casing out of the ejection port. Driven from handleState()'s existing "this bullet id
  // is new" pass (which already owns the shoot sfx and muzzle sparks) rather than from a second
  // id-diffing pass of its own — that loop fires exactly once per bullet and already prunes
  // itself, so it's the one true "a shot was just taken" edge on the client.
  function triggerShotRecoil(p) {
    if (!p) return;
    const m = getShipMotion(p.id);
    m.recoil = 1;
    m.lastFireAt = performance.now();
    const rightX = -Math.sin(p.angle);
    const rightY = Math.cos(p.angle);
    particles.push({
      x: p.x + Math.cos(p.angle) * 8 + rightX * 2,
      y: p.y + Math.sin(p.angle) * 8 + rightY * 2,
      vx: rightX * 55 + (Math.random() - 0.5) * 25,
      vy: rightY * 55 + (Math.random() - 0.5) * 25,
      life: 0.32, maxLife: 0.32,
      color: 'rgba(226,182,88,0.95)',
      size: 1.9,
    });
  }

  // ---- battlefield decoration: scattered craters/rubble, regenerated whenever the wall
  // layout changes (i.e. once per round) so it doesn't visibly shift mid-match ----
  let debris = [];
  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }
  function regenerateDebris() {
    debris = [];
    for (let i = 0; i < 22; i++) {
      debris.push({
        x: randRange(20, arena.w - 20),
        y: randRange(20, arena.h - 20),
        size: randRange(6, 16),
        type: Math.random() < 0.4 ? 'crater' : 'rock',
        rot: Math.random() * Math.PI * 2,
      });
    }
  }

  function drawDebris() {
    for (const d of debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      if (d.type === 'crater') {
        ctx.fillStyle = 'rgba(20,16,10,0.35)';
        ctx.beginPath();
        ctx.ellipse(0, 0, d.size, d.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,50,35,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(90,80,65,0.5)';
        ctx.fillRect(-d.size / 2, -d.size / 3, d.size, d.size * 0.6);
      }
      ctx.restore();
    }
  }

  // Per-stage battlefield art. Keyed by the BOSS's OWN index rather than room.storyStage, so a
  // hard-mode stage (whose numbers are 1-3 and mean "boss pair", see the bossIndex note in
  // updateHud) shows the battlefield those bosses actually belong to. Any stage with no entry
  // here simply falls through to the painted gradient below — this is additive, not a
  // replacement, so partial art coverage is a supported state.
  // `dim` is a per-stage darkening pass, chosen from each image's MEASURED luminance rather than
  // by eye (medians, on 0-255: s1 35, s2 36, s3 39, s4 20, s5 21, s6 19 — against the ~40-60 of
  // the painted background these replace). The first three sit near that level and take a real
  // scrim; the last three are already much darker, and dimming them further would only turn the
  // art to mud without helping the sprites, which already stand well clear of a 20-median field.
  const STAGE_BG = {
    1: { src: 'images/stage1-bg.jpg', dim: 0.18 }, // 荒野 — has a bright sky band (p99 106)
    2: { src: 'images/stage2-bg.jpg', dim: 0.14 }, // 焦土
    3: { src: 'images/stage3-bg.jpg', dim: 0.20 }, // 廃墟の市街 — the brightest of the six
    4: { src: 'images/stage4-bg.jpg', dim: 0 },    // 夜の塹壕
    5: { src: 'images/stage5-bg.jpg', dim: 0 },    // 血の戦場
    6: { src: 'images/stage6-bg.jpg', dim: 0 },    // 異界 (EX boss)
  };
  const stageBgCache = new Map();
  function stageBgEntry() {
    const st = latestState;
    if (!st || !st.players) return null;
    const lead = st.players.find((p) => p.isBoss);
    if (!lead) return null; // arena PvP has no campaign stage to theme
    return STAGE_BG[lead.bossIndex || st.storyStage] || null;
  }
  function stageBgImage(entry) {
    let img = stageBgCache.get(entry.src);
    if (!img) { img = new Image(); img.src = entry.src; stageBgCache.set(entry.src, img); }
    // Never draw a half-loaded image — the gradient stands in for the one or two frames it takes.
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  // cover-fit, overdrawn by 40px on every side so the screen-shake translate can never expose an
  // edge (the same margin the painted background below uses, and for the same reason).
  function drawStageBg(img, dim) {
    const bw = arena.w + 80;
    const bh = arena.h + 80;
    const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.drawImage(img, -40 + (bw - w) / 2, -40 + (bh - h) / 2, w, h);
    if (dim > 0) {
      ctx.fillStyle = `rgba(8, 6, 4, ${dim})`;
      ctx.fillRect(-40, -40, bw, bh);
    }
  }

  function drawBackground(t) {
    const bgEntry = stageBgEntry();
    const bgArt = bgEntry && stageBgImage(bgEntry);
    if (bgArt) {
      drawStageBg(bgArt, bgEntry.dim);
      drawDebris(); // kept: the drifting motes are what stop a still photo reading as a frozen frame
      return; // deliberately no grid lines over photographic art — they read as a UI overlay
    }
    // dusty warzone ground — warm dirt tones instead of the old cool sci-fi blue
    const g = ctx.createLinearGradient(0, 0, 0, arena.h);
    g.addColorStop(0, '#2a2620');
    g.addColorStop(0.55, '#3c3527');
    g.addColorStop(1, '#4d4230');
    ctx.fillStyle = g;
    ctx.fillRect(-40, -40, canvas.width + 80, canvas.height + 80);

    const haze = ctx.createRadialGradient(arena.w * 0.5, arena.h * 0.12, 10, arena.w * 0.5, arena.h * 0.12, arena.w * 0.9);
    haze.addColorStop(0, 'rgba(140,115,80,0.18)');
    haze.addColorStop(1, 'rgba(140,115,80,0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawDebris();

    const pulse = 0.05 + 0.02 * Math.sin(t / 1100);
    ctx.strokeStyle = `rgba(90,75,50,${pulse + 0.05})`;
    ctx.lineWidth = 1;
    for (let x = 0; x <= arena.w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, arena.h);
      ctx.stroke();
    }
    for (let y = 0; y <= arena.h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(arena.w, y);
      ctx.stroke();
    }
  }

  function drawWalls() {
    // ruined town buildings — concrete/brick blocks instead of glowing sci-fi slabs
    const walls = arena.walls || [];
    for (const w of walls) {
      ctx.save();
      const g = ctx.createLinearGradient(w.x, w.y, w.x, w.y + w.h);
      g.addColorStop(0, '#9c8a72');
      g.addColorStop(1, '#544a3c');
      ctx.fillStyle = g;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 8;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.shadowBlur = 0;

      // sunlit rooftop edge
      ctx.fillStyle = 'rgba(255,238,205,0.3)';
      ctx.fillRect(w.x, w.y, w.w, Math.min(4, w.h));

      // brick/panel seams
      ctx.strokeStyle = 'rgba(35,28,20,0.35)';
      ctx.lineWidth = 1;
      if (w.w >= w.h) {
        for (let lx = w.x + 12; lx < w.x + w.w - 6; lx += 16) {
          ctx.beginPath();
          ctx.moveTo(lx, w.y + 4);
          ctx.lineTo(lx, w.y + w.h - 4);
          ctx.stroke();
        }
      } else {
        for (let ly = w.y + 12; ly < w.y + w.h - 6; ly += 16) {
          ctx.beginPath();
          ctx.moveTo(w.x + 4, ly);
          ctx.lineTo(w.x + w.w - 4, ly);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = 'rgba(20,15,10,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
      ctx.restore();
    }
  }

  const CLIENT_BLOCK_HP = 20; // mirrors game.js's BLOCK_HP — only used to compute the damage fraction for cracks

  function drawBlock(b) {
    const frac = Math.max(0, Math.min(1, b.hp / (b.maxHp || CLIENT_BLOCK_HP)));
    ctx.save();
    // Gold takes priority over red — the two are mutually exclusive server-side (a block
    // is rolled as at most one variant), this is just the client's draw-order convention.
    const goldPulse = b.gold ? 1 + Math.sin(performance.now() / 220) * 0.25 : 1;
    ctx.shadowColor = b.gold ? 'rgba(255,211,91,0.75)' : b.red ? 'rgba(255,60,40,0.55)' : 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = b.gold ? 12 * goldPulse : b.red ? 9 : 6;
    const g = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    if (b.gold) {
      g.addColorStop(0, '#fff3c2');
      g.addColorStop(1, '#d9a02a');
    } else if (b.red) {
      g.addColorStop(0, '#e0503c');
      g.addColorStop(1, '#7a1f16');
    } else {
      g.addColorStop(0, '#c9a05a');
      g.addColorStop(1, '#8a6a35');
    }
    ctx.fillStyle = g;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;

    ctx.strokeStyle = b.gold ? 'rgba(255,243,194,0.9)' : b.red ? 'rgba(255,140,110,0.75)' : 'rgba(255,200,60,0.6)';
    ctx.lineWidth = b.gold ? 2.5 : 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

    // cracks appear as it takes damage — visual feedback for remaining hp
    ctx.strokeStyle = 'rgba(20,15,10,0.75)';
    ctx.lineWidth = 1.5;
    if (frac < 0.66) {
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.3, b.y + 2);
      ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.5);
      ctx.lineTo(b.x + b.w * 0.35, b.y + b.h - 2);
      ctx.stroke();
    }
    if (frac < 0.33) {
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.7, b.y + 2);
      ctx.lineTo(b.x + b.w * 0.55, b.y + b.h * 0.6);
      ctx.lineTo(b.x + b.w * 0.75, b.y + b.h - 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBlocks() {
    const blocks = (latestState && latestState.blocks) || [];
    for (const b of blocks) drawBlock(b);
  }

  function drawBullet(b) {
    const r = b.radius || 6; // fallback mirrors game.js's BULLET_RADIUS (raised 5 -> 6 with the 1.2x size pass)
    // EX boss bullets: a fixed color per bullet (picked by id, not time) from the same
    // RAINBOW_RING_COLORS palette as its ship's aura rings — many bullets on screen at once
    // read as a rainbow *spread* this way, consistent with the ship's own rainbow (a static
    // multi-color design, explicitly not a per-object color-cycling animation).
    let fillColor, glowColor, strokeAlpha;
    if (b.ownerIsEx) {
      fillColor = glowColor = RAINBOW_RING_COLORS[b.id % RAINBOW_RING_COLORS.length];
      strokeAlpha = 0.6;
    } else if (b.big) {
      // The big-bullet powerup keeps its own unmistakable purple — it is a temporary buff the
      // player needs to read instantly, so identity of the shooter is secondary there.
      fillColor = '#e4d4ff'; glowColor = '#c9a8ff'; strokeAlpha = 0.6;
    } else {
      // Ordinary rounds carry the SHOOTER's colour (per explicit request) instead of a single
      // gold shared by everyone on the field — with two bosses firing at once, one gold stream
      // gave no clue which of them it came from.
      const owner = latestState && latestState.players.find((p) => p.id === b.ownerId);
      glowColor = characterColor(owner);
      fillColor = shadeAnyColor(glowColor, 1.45); // brighter core over its own glow, so it still reads as hot
      strokeAlpha = 0.55;
    }
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = b.ownerIsEx ? 24 : (b.big ? 22 : 14);
    ctx.globalAlpha = strokeAlpha;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = Math.max(3, r * 0.8);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawLasers() {
    for (const l of laserBeams) {
      const a = Math.max(0, l.life / l.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = l.color;
      ctx.shadowColor = l.color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 4 * a + 1.5;
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSwordSlashes() {
    const halfArc = SWORD_ARC_HALF_ANGLE; // shared with the blade pose in drawShip, so the two stay in step
    for (const s of swordSlashes) {
      const range = s.range || SWORD_RANGE_VISUAL;
      const t = 1 - Math.max(0, Math.min(1, s.life / s.maxLife)); // 0 -> 1 over the swing's life
      // the blade sweeps open across the first ~45% of the lifetime, then holds briefly
      // and fades — a filled sector "growing" like this reads as an actual swing instead
      // of a static bracket-shaped line appearing all at once
      const sweep = Math.min(1, t / 0.45);
      const fade = t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.45);
      if (sweep <= 0 || fade <= 0) continue;

      const startAngle = s.angle - halfArc;
      const endAngle = startAngle + halfArc * 2 * sweep;
      // Base hue always follows the owner's own color (see the swordSwings loop above); a
      // hit still reads as more impactful via a brighter/hotter blade-edge tint, it just no
      // longer overrides the fan/glow color to a generic gold regardless of who swung.
      const rgb = s.color || '157,186,255';
      const bladeColor = s.hit ? '#fff6d8' : '#ffffff';

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(s.x, s.y);

      // filled fan sweeping out from the pivot, bright near the blade edge and
      // transparent near the character, like a sector opening rather than a flat line
      const grad = ctx.createRadialGradient(0, 0, range * 0.1, 0, 0, range);
      grad.addColorStop(0, `rgba(${rgb},0)`);
      grad.addColorStop(0.75, `rgba(${rgb},0.28)`);
      grad.addColorStop(1, `rgba(${rgb},0.55)`);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, range, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // bright leading edge — the "blade" itself, at the front of the sweep
      ctx.shadowColor = `rgba(${rgb},1)`;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = bladeColor;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(endAngle) * range, Math.sin(endAngle) * range);
      ctx.stroke();

      // outer rim highlight along the swept arc
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, range, startAngle, endAngle);
      ctx.stroke();

      ctx.restore();
    }
  }

  function drawBomb(b, t) {
    // Once placed, a bomb is tinted to match its owner's ship color (same blue/red split
    // as drawShip's uniform colors) so it's clear at a glance whose bomb is whose.
    const bombOwner = latestState && latestState.players.find((p) => p.id === b.ownerId);
    const isMine = b.ownerId === myId;
    // Only classify as "ally" in an actual co-op room — otherwise a plain arena-mode
    // opponent (isBoss also undefined there) would wrongly render in the ally color.
    const isAlly = !isMine && latestState && latestState.storyCoop && bombOwner && !bombOwner.isBoss;
    const glow = isMine ? '#4d78d9' : isAlly ? '#3fb36e' : '#c9524a';
    const fill = isMine ? '#1c2a40' : isAlly ? '#1c3324' : '#401c20';
    const ringR = isMine ? '77,120,217' : isAlly ? '63,179,110' : '201,82,74';
    const pulse = 0.7 + 0.3 * Math.sin(t / 140);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14 * pulse;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${ringR},${0.5 + 0.4 * pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', 0, 1);
    ctx.restore();
  }

  // A walking grunt, drawn as an UPRIGHT little figure with four facings (front / back / both
  // profiles) rather than the single static 🧟 emoji it replaces. Upright, not top-down like the
  // soldiers, because that is what "前姿・後ろ姿・横向き" means and because the emoji it replaces
  // was upright too — so this keeps the monsters' existing visual language, it doesn't introduce
  // a new one. Everything is expressed relative to `radius` so the gold variant's bigger body
  // scales with it for free.
  function drawMobSprite(m, radius, glow, waveTheme) {
    const s = mobMotion.get(m.id);
    const dir = s ? s.dir : 'down';
    const stride = s ? s.stride : 0;
    // Walk amplitude fades out when a monster is stationary (blocked, or mid-attack pause), so
    // it settles into a stand rather than marching on the spot.
    const gait = s ? Math.min(1, s.speed / 60) : 0;
    const swing = Math.sin(stride) * gait;
    const bob = Math.abs(Math.sin(stride)) * 1.1 * gait;

    const k = radius / 20; // 20 = MONSTER_RADIUS_VISUAL, the size these numbers were drawn at
    const skin = waveTheme ? glow : '#9dff6b';
    // These sit on top of the monster's own dark body disc, so both tones have to stay clearly
    // ABOVE that background, not just below the head. A first pass at 0.42/0.22 left the torso
    // and limbs reading as one dark blob against the disc with no anatomy visible at all.
    const cloth = shadeAnyColor(skin, 0.62);
    const dark = shadeAnyColor(skin, 0.44);
    const outline = shadeAnyColor(skin, 0.2);
    const side = dir === 'left' || dir === 'right';

    ctx.save();
    ctx.scale(k, k);
    if (dir === 'left') ctx.scale(-1, 1); // one profile drawn, mirrored for the other
    ctx.translate(0, -bob);

    // legs — swing along the travel axis: front-to-back reads as up/down steps on the profile
    // and side views, and as a left/right stride when walking toward or away from the camera.
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    for (const sgn of [1, -1]) {
      const sw = swing * sgn * (side ? 4.5 : 3.2);
      ctx.beginPath();
      if (side) {
        ctx.moveTo(0, 5);
        ctx.lineTo(sw, 13);
      } else {
        ctx.moveTo(sgn * 2.6, 5);
        ctx.lineTo(sgn * 2.6 + sw * 0.35, 13);
      }
      ctx.stroke();
    }

    // torso — outlined so the limbs drawn in the same family of tones still separate from it
    ctx.fillStyle = cloth;
    ctx.beginPath();
    ctx.ellipse(0, 1, side ? 3.6 : 5.2, 6.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // arms — a grunt shambles with them reaching toward whatever it is chasing, so on the front
    // and profile views they hang forward; on the back view they trail behind the body instead.
    ctx.strokeStyle = dark;
    ctx.lineWidth = 2.8;
    for (const sgn of [1, -1]) {
      const sw = -swing * sgn * (side ? 4 : 2.4);
      ctx.beginPath();
      if (side) {
        ctx.moveTo(0.5, -1.5);
        ctx.quadraticCurveTo(5, 0.5 + sw * 0.3, 8.5, 2 + sw * 0.5);
      } else {
        ctx.moveTo(sgn * 4.4, -1.5);
        ctx.quadraticCurveTo(sgn * 6.4, 2 + sw * 0.4, sgn * 6.6, 6 + sw * 0.6);
      }
      ctx.stroke();
    }

    // head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(side ? 0.8 : 0, -9.5, 5.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // The face is the whole point of having four sprites, so it is the one thing that differs
    // per direction: two eyes looking at you from the front, one eye on the profile, and
    // nothing at all from behind — just the back of the head.
    if (dir === 'down') {
      ctx.fillStyle = '#1a1a22';
      ctx.beginPath();
      ctx.ellipse(-2, -10, 1.15, 1.5, 0, 0, Math.PI * 2);
      ctx.ellipse(2, -10, 1.15, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(26,26,34,0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2.2, -6.9);
      ctx.lineTo(2.2, -6.9);
      ctx.stroke();
    } else if (side) {
      // hair covering the REAR of the skull, so the profile has a clear front and back
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0.8, -9.5, 5.4, Math.PI * 0.55, Math.PI * 1.45);
      ctx.fill();
      ctx.fillStyle = '#1a1a22';
      ctx.beginPath();
      ctx.ellipse(2.6, -10, 1.1, 1.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // snout/jaw nub, so the profile has an actual front to it
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(5.4, -8.4, 1.7, 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Back view: the head is almost entirely hair, with just a sliver of nape showing at the
      // bottom. A first pass drew only a top cap, which left a bright lower half that read as a
      // visor — i.e. it looked like a FRONT view wearing a helmet, the exact opposite of intent.
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.arc(0, -9.9, 5.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.ellipse(0, -5.6, 2.5, 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMonster(m, t) {
    const gold = !!m.gold;
    const chicken = !!m.chicken;
    // Wave-mob color tier (white/blue/green/red/gold, see game.js's MOB_WAVE_COLOR_STATS) —
    // a visual readout of that mob's rolled speed/damage strength, distinct from the
    // ambient-monster gold/chicken variants above (which only ever occur outside a wave).
    const waveTheme = m.wave ? (WAVE_COLOR_THEME[m.waveColor] || WAVE_COLOR_THEME.blue) : null;
    // Mirrors game.js's monsterRadius() branch-for-branch — the gold wave tier is the strongest
    // of the five and is drawn (and collided) 1.2x, so its size reads as a warning too.
    const goldWaveTier = !!m.wave && m.waveColor === 'gold';
    const radius = chicken ? GOLDEN_CHICKEN_RADIUS_VISUAL
      : gold ? GOLD_MONSTER_RADIUS_VISUAL
        : goldWaveTier ? GOLD_WAVE_MOB_RADIUS_VISUAL
          : MONSTER_RADIUS_VISUAL;
    const glow = waveTheme ? waveTheme.glow : chicken ? '#fff59d' : gold ? '#ffd35b' : '#9dff6b';
    const fill = waveTheme ? waveTheme.fill : chicken ? '#4a3c10' : gold ? '#3a2c14' : '#241c34';
    const ring = waveTheme ? waveTheme.ring : chicken ? '255,245,157' : '255,211,91'; // only gold/chicken/wave get a ring at all
    const pulse = 0.8 + 0.2 * Math.sin(t / (chicken ? 90 : gold ? 130 : 220)); // chicken pulses fastest — reads as skittish
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.shadowColor = glow;
    ctx.shadowBlur = (chicken ? 18 : gold ? 20 : waveTheme ? 16 : 14) * pulse;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    if (gold || chicken || waveTheme) {
      // the base monster's ring border was removed per user request; gold/chicken/wave-tier
      // keep theirs since it wasn't the one called out ("緑の囲い" = specifically the green one)
      ctx.strokeStyle = `rgba(${ring},${0.5 + 0.3 * pulse})`;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    if (chicken) {
      // The chicken stays an emoji — it's a deliberate comedy variant, and a hand-drawn bird
      // would lose that read — but it now hops and flips to face its travel direction instead
      // of sliding around frozen.
      const cs = mobMotion.get(m.id);
      const hop = cs ? Math.abs(Math.sin(cs.stride)) * 3.5 : 0;
      ctx.save();
      if (cs && cs.dir === 'left') ctx.scale(-1, 1);
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐔', 0, 1 - hop);
      ctx.restore();
    } else {
      drawMobSprite(m, radius, glow, waveTheme);
    }
    ctx.restore();

    // small hp bar overhead, same idea as a player's but miniature
    const frac = Math.max(0, Math.min(1, m.hp / (m.maxHp || 1)));
    ctx.save();
    ctx.translate(m.x, m.y - radius - 10);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-16, -3, 32, 6);
    ctx.fillStyle = chicken ? '#fff59d' : gold ? '#ffd35b' : frac > 0.5 ? '#9dff6b' : frac > 0.25 ? '#ffcf5c' : '#ff5b5b';
    ctx.fillRect(-16, -3, 32 * frac, 6);
    ctx.restore();
  }

  function drawShockwaves() {
    for (const s of shockwaves) {
      const frac = 1 - s.life / s.maxLife;
      const r = s.maxRadius * frac;
      const alpha = Math.max(0, s.life / s.maxLife);
      const color = s.color || '#ffb347';
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 5 * alpha + 1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  const ITEM_RADIUS_VISUAL = 22;

  function drawItem(item, t) {
    const meta = ITEM_META[item.type] || ITEM_META.speed;
    const bob = Math.sin(t / 260 + item.id) * 4;
    const y = item.y + bob;
    ctx.save();
    ctx.translate(item.x, y);
    ctx.rotate(t / 1400);
    ctx.strokeStyle = meta.color;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, ITEM_RADIUS_VISUAL, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(item.x, y);
    ctx.shadowColor = meta.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(38,30,20,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.icon, 0, 1);
    ctx.restore();
  }

  function drawShip(p, isMe) {
    // top-down soldier: shadow, boots, torso, helmeted head (offset toward facing), rifle.
    // In story mode, the opponent is always the current stage's boss — escalate its look
    // (color/scale/glow/aura rings) by BOSS_TIER_THEME so a returning player can feel each
    // stage getting visibly tougher, not just read it from harder AI numbers.
    // isBoss (not just "!isMe && isCpuMatch") specifically identifies the boss — in the new
    // 2-player co-op mode, a non-me, non-boss player in a CPU match is my ally, who must NOT
    // get the boss's escalating tier look. isAlly can't misfire in 1P story (there the one
    // non-me player always IS the boss) or in arena mode (isCpuMatch is false there).
    const isBoss = !!p.isBoss;
    const isAlly = !isMe && !isBoss && isCpuMatch;
    // Colour comes from the boss's OWN identity (p.bossIndex) rather than the room's current
    // stage number. In hard mode a stage fields two different bosses at once, so keying off the
    // stage painted BOTH of them the same colour — hard stage 1 showed two white soldiers
    // instead of the rookie's white and the mercenary's bronze. Falls back to storyStage for
    // any boss without an index (normal mode is unaffected either way, since there the single
    // boss's index and the stage number are the same number).
    const bossTier = p.bossIndex || storyStage;
    const tier = isBoss && isCpuMatch ? Math.min(Math.max(1, bossTier), BOSS_TIER_THEME.length) : 0;
    const theme = tier > 0 ? BOSS_TIER_THEME[tier - 1] : null;
    // 2P co-op bosses now use the same per-stage BOSS_TIER_THEME color as 1P (per explicit
    // request) — this used to be forced to a fixed red instead, back when stage1's color was
    // a muted olive too close to the ally's green; stage1 is white now, so that clash no
    // longer exists and the per-stage color can just be used everywhere uniformly.
    const themeColor = theme ? theme.uniform : null;
    let uniform = themeColor || (isMe ? '#4d78d9' : isAlly ? '#3fb36e' : '#c9524a');
    let uniformDark = themeColor ? shadeColor(themeColor, 0.45) : (isMe ? '#2b4a94' : isAlly ? '#1f6b40' : '#8a2e2a');
    let helmet = themeColor ? shadeColor(themeColor, 0.28) : (isMe ? '#25396b' : isAlly ? '#164f2f' : '#5c211e');
    // Hidden EX boss ("戦神") — a fixed pale gold-white body (not a per-stage BOSS_TIER_THEME
    // color, and not a color-cycling animation either — that was tried first and explicitly
    // rejected in favor of a single static design with multiple differently-colored rings, see
    // RAINBOW_RING_COLORS and the aura section below).
    // exBossActive covers the normal-campaign EX fight; the bossIndex check covers hard stage 3,
    // where the EX boss appears as one half of a pair and that room-wide flag is never set.
    const isExBoss = isBoss && isCpuMatch
      && (!!(latestState && latestState.exBossActive) || p.bossIndex === BOSS_TIER_THEME.length + 1);
    if (isExBoss) {
      uniform = '#f5e6b8';
      uniformDark = shadeColor(uniform, 0.45);
      helmet = shadeColor(uniform, 0.28);
    }
    const scale = theme ? [1, 1.06, 1.12, 1.18, 1.26][tier - 1] : 1;
    const glowBlur = theme ? [14, 17, 20, 24, 30][tier - 1] : 14;

    if (p.hp <= 0 && !p.alive) {
      // fallen soldier: prone silhouette, no glow
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.scale(SIZE_UP, SIZE_UP); // matches the living body's 1.2x, so a soldier doesn't shrink as they fall
      ctx.fillStyle = uniformDark;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = helmet;
      ctx.beginPath();
      ctx.arc(9, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // ---- gait / recoil, derived per frame in updateShipMotion() ----
    const now = performance.now();
    const m = shipMotion.get(p.id);
    const gait = m ? Math.min(1, m.speed / GAIT_FULL_SPEED) : 0;
    const stride = m ? m.stride : 0;
    const recoil = m ? m.recoil : 0;
    // Movement direction expressed in the soldier's OWN frame (+x = where they're aiming), by
    // rotating the world-space direction by -p.angle. This is what separates a person from a
    // sprite here: aim and movement are independent server-side (see game.js — `inp.angle` is
    // set from the aim/target, movement from the direction keys), so a soldier can advance,
    // backpedal or strafe while keeping the rifle on target, and the legs need to show which.
    const ca = Math.cos(p.angle);
    const sa = Math.sin(p.angle);
    const moveF = m ? m.mx * ca + m.my * sa : 0; // +1 advancing, -1 backpedalling
    const moveR = m ? -m.mx * sa + m.my * ca : 0; // +1 strafing to their right

    // Breathing when still, a heavier bounce when running — one number driving several parts
    // below so they stay in phase with each other instead of looking independently animated.
    const bob = gait > 0.05
      ? Math.sin(stride * 2) * 0.9 * gait
      : Math.sin(now / 900) * 0.35;

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    // Shadow stretches slightly along the facing axis and tightens as the body rises in the
    // bounce, so the soldier reads as actually lifting off the ground rather than sliding.
    // Drawn in UNSCALED space (this block runs before the body's own ctx.scale), so it needs
    // SIZE_UP applied by hand or it would stay puddled under a now-larger soldier.
    ctx.ellipse(p.x, p.y + 4 * SIZE_UP, (12.5 - bob * 0.5) * SIZE_UP, (6 - bob * 0.35) * SIZE_UP, p.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    // The collision radius is 16 (game.js's PLAYER_RADIUS) but the body used to be drawn at
    // roughly a 10px torso, so a soldier occupied about half the space it actually takes up and
    // limbs had nowhere to read at phone size. Drawing nearer the true hitbox is free — no
    // gameplay value moves — and is most of what makes the anatomy legible at all here.
    ctx.scale(scale * BODY_SCALE, scale * BODY_SCALE);

    // Glow as an underlay rather than a per-shape shadow. Canvas shadows are painted around
    // each filled shape *as it is drawn*, so the old "shadowBlur on every part" approach laid
    // fresh haze over the parts drawn before it — legs and arms were being erased by the
    // torso's own glow. Laying one soft radial pool down first keeps the "these soldiers are
    // lit" read while leaving every silhouette below it at full contrast.
    const glowR = 17 + glowBlur * 0.55;
    const glowGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, glowR);
    glowGrad.addColorStop(0, withAlpha(uniform, 0.5));
    glowGrad.addColorStop(0.55, withAlpha(uniform, 0.2));
    glowGrad.addColorStop(1, withAlpha(uniform, 0));
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Long coat, drawn under everything and only for the heavier bosses — trails behind them,
    // catching the run's rhythm. Pure silhouette work: it's what makes a tier-4/5 boss read as
    // a commander striding across the field rather than a recolour of the same trooper.
    if (tier >= 2 || isExBoss) {
      const flutter = Math.sin(now / 150 + stride) * (1.4 + gait * 3.2);
      const drag = 7 + gait * 6; // the faster they move, the further it streams out behind
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = uniformDark;
      ctx.beginPath();
      ctx.moveTo(-2, -8);
      ctx.quadraticCurveTo(-10 - drag * 0.4, -9 + flutter, -8 - drag, -5 + flutter * 1.6);
      ctx.quadraticCurveTo(-9 - drag * 0.9, 0, -8 - drag, 5 - flutter * 1.6);
      ctx.quadraticCurveTo(-10 - drag * 0.4, 9 - flutter, -2, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Every part below is drawn with NO canvas shadow (the glow pool above already covers that
    // job) and in deliberately separated tones — limb, torso and helmet each read as a distinct
    // value. At the size a soldier actually occupies on a phone, that value separation is what
    // makes the anatomy visible; fine interior linework is not.
    const legTone = shadeAnyColor(uniform, 0.2);
    const bootTone = shadeAnyColor(uniform, 0.34);
    const armTone = shadeAnyColor(uniform, 0.6);

    // ---- legs ----
    // Feet swing along the ACTUAL movement axis, in antiphase, amplitude scaled by speed — so a
    // strafing soldier side-steps and a retreating one walks backwards, instead of every
    // direction sharing one canned forward jog. At a standstill they settle into a staggered
    // braced stance (front foot inside the aim line, rear foot planted back) rather than the
    // symmetric pair this used to draw, which is most of what made it read as an object before.
    // The stance is deliberately wider than the torso so the boots clear its silhouette —
    // tucked underneath, a top-down walk cycle is invisible no matter how well it's animated.
    const swing = Math.sin(stride) * 7 * gait;
    const legs = [
      { bx: -6, by: -7, ph: 1 }, // front-ish foot
      { bx: -8.5, by: 7, ph: -1 }, // rear foot, planted back
    ];
    for (const leg of legs) {
      const s = swing * leg.ph;
      const fx = leg.bx + moveF * s;
      const fy = leg.by + moveR * s;
      // thigh: hip -> boot, so the leg visibly extends and gathers rather than the boot floating
      ctx.strokeStyle = legTone;
      ctx.lineWidth = 4.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1, leg.by * 0.42);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      // boot, angled along the direction of travel
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(Math.atan2(moveR, moveF) * Math.min(1, gait * 1.5));
      ctx.fillStyle = bootTone;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.9, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---- upper body ----
    // Leans into the direction of travel and rocks with the stride; the recoil kick shoves it
    // back along the aim line. Everything from here up sits in this one transform, so torso,
    // arms, rifle and head all move together as one body instead of as separate decals.
    ctx.save();
    ctx.translate(moveF * gait * 1.6 - recoil * 1.5, moveR * gait * 1.6);
    ctx.rotate(Math.sin(stride) * 0.05 * gait);

    // Shoulders: WIDER across than deep, i.e. squashed along the aim axis. This is the whole
    // trick for a top-down soldier — the camera is above them, so what you see is the span of
    // the shoulders with the helmet capping it, not a body seen side-on. Drawing this the other
    // way round (long in the facing direction, head pushed out in front) is what made the old
    // silhouette read as a vehicle: one continuous nose-forward lozenge with no shoulder line.
    ctx.fillStyle = uniform;
    ctx.beginPath();
    ctx.ellipse(-0.5, 0, 7 + bob * 0.2, 9 + bob * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = legTone;
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // pack slung on the back — pushes the mass behind the shoulders, so the body has a front
    ctx.fillStyle = shadeAnyColor(uniform, 0.5);
    ctx.beginPath();
    ctx.ellipse(-5, 0, 3.4, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- weapon: rifle at the ready, or a blade mid-swing ----
    const swordAge = m ? now - m.lastSwordAt : Infinity;
    const swinging = swordAge < SWORD_SWING_MS;

    if (swinging) {
      // The blade tracks the leading edge of the slash fan exactly (same sweep curve as
      // drawSwordSlashes), so the weapon in the soldier's hands and the arc on the ground are
      // one motion. The rifle is dropped to the off hand for the duration rather than left
      // floating on target, which is what made a swing read as "someone else's effect" before.
      const t = swordAge / SWORD_SWING_MS;
      const sweep = Math.min(1, t / 0.45);
      const bladeAngle = -SWORD_ARC_HALF_ANGLE + SWORD_ARC_HALF_ANGLE * 2 * sweep;

      // rifle lowered across the body in the off hand while the blade is out
      ctx.save();
      ctx.rotate(0.9);
      ctx.strokeStyle = '#2a2a28';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(-3, 4);
      ctx.lineTo(13, 4);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.rotate(bladeAngle);
      // both hands together on the hilt — a two-handed grip is what makes a swing look committed
      ctx.strokeStyle = armTone;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1, -6.5);
      ctx.quadraticCurveTo(4, -4, 7.5, -0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.5, 6.5);
      ctx.quadraticCurveTo(4.5, 4, 7.5, 0.6);
      ctx.stroke();
      // guard + hilt
      ctx.strokeStyle = '#6b5a3a';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(6, -2.6);
      ctx.lineTo(6, 2.6);
      ctx.stroke();
      // blade: a tapered steel wedge, brightest along its leading edge
      const bladeLen = 15 + 13 * sweep;
      const bladeGrad = ctx.createLinearGradient(7, 0, 7 + bladeLen, 0);
      bladeGrad.addColorStop(0, '#9fb0c8');
      bladeGrad.addColorStop(0.55, '#eef4ff');
      bladeGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = bladeGrad;
      ctx.beginPath();
      ctx.moveTo(7, -2.2);
      ctx.lineTo(7 + bladeLen * 0.82, -1.5);
      ctx.lineTo(7 + bladeLen, 0);
      ctx.lineTo(7 + bladeLen * 0.82, 1.5);
      ctx.lineTo(7, 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      // Shouldered on the soldier's left of the aim line (local -y), both hands on the weapon,
      // the whole assembly kicking back on recoil. The crossing front arm is the shape that
      // sells "braced against the shoulder" from a top-down camera.
      ctx.save();
      ctx.translate(-recoil * 4, 0);

      ctx.strokeStyle = '#2a2a28';
      ctx.lineWidth = 3;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(-4, -3.5); // stock, tucked behind the shoulder
      ctx.lineTo(23, -2.5);
      ctx.stroke();
      ctx.fillStyle = '#1a1a18';
      ctx.fillRect(19, -4.5, 6, 3.4); // muzzle/foresight block
      ctx.fillStyle = '#232320';
      ctx.fillRect(6, -2, 3.6, 5); // magazine, hanging below the receiver

      // Arms reach forward from the shoulder span and OUTSIDE the body outline, so they read as
      // limbs rather than shading on the torso: rear hand back on the grip, front hand stretched
      // across to the foregrip. That asymmetric reach is the pose the eye recognises as someone
      // holding a rifle up, and it's the clearest single cue that this is a person.
      ctx.strokeStyle = armTone;
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-1, -7.5);
      ctx.quadraticCurveTo(3, -7, 5, -3.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-0.5, 7);
      ctx.quadraticCurveTo(9.5, 6.5, 14.5, -1.6);
      ctx.stroke();

      // muzzle flash — brief, so it lands as a "crack" rather than a constant glow
      const flashAge = m ? now - m.lastFireAt : Infinity;
      if (flashAge < MUZZLE_FLASH_MS) {
        const f = 1 - flashAge / MUZZLE_FLASH_MS;
        ctx.save();
        ctx.translate(26, -2.5);
        ctx.globalAlpha = f;
        ctx.shadowColor = '#ffd98a';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#fff3c4';
        // four-point star: a long horizontal spike down the barrel line, a short vertical one
        ctx.beginPath();
        ctx.moveTo(9 * f, 0);
        ctx.lineTo(0, 3.4 * f);
        ctx.lineTo(-3 * f, 0);
        ctx.lineTo(0, -3.4 * f);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 2.6 * f, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore(); // rifle/arms recoil transform
    }

    // ---- helmet, seen from directly above ----
    // Sits at the CENTRE of the shoulders, not out in front of them: looking straight down at
    // someone, the helmet is the top of the stack and caps the body rather than leading it.
    // It's also the brightest value on the figure — it's the surface facing the sky — which is
    // what separates the head from the uniform at a glance. It counter-bobs slightly so the
    // head stays level while the body works underneath.
    ctx.save();
    ctx.translate(0.5, -bob * 0.3);
    ctx.fillStyle = shadeAnyColor(uniform, 1.14);
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = legTone;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    // VISOR: a dark band wrapping the front ~130° of the helmet, with a bright glint along it.
    // From directly above a helmet is otherwise a circle — perfectly symmetric, so the head
    // alone gave no clue which way the soldier was facing, and the small offset brim this
    // replaces was too subtle to read at actual play size. A hard dark-to-light band across one
    // side is unambiguous at a glance, and it points exactly where the rifle does.
    // Kept deliberately THIN (outer 4.4 down to 3.2 only, ~±57°): a deeper band eats most of the
    // dome and the head stops reading as a helmet at all — it turns into a camera lens with a
    // bright pupil in the middle. A narrow rim at the leading edge is enough to point the head.
    ctx.beginPath();
    ctx.arc(0, 0, 4.4, -1.0, 1.0);
    ctx.arc(0, 0, 3.2, 1.0, -1.0, true);
    ctx.closePath();
    ctx.fillStyle = '#1b2233';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 3.85, -0.75, 0.2);
    ctx.strokeStyle = 'rgba(150,205,255,0.9)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // a short muzzle-side nose wedge past the visor — pushes the silhouette itself off-centre,
    // so facing survives even when the visor's colours wash out against a pale boss uniform
    ctx.fillStyle = shadeAnyColor(uniform, 0.72);
    ctx.beginPath();
    ctx.moveTo(4.1, -2);
    ctx.lineTo(6.6, 0);
    ctx.lineTo(4.1, 2);
    ctx.closePath();
    ctx.fill();
    // specular kick off the crown
    ctx.fillStyle = 'rgba(255,255,255,0.26)';
    ctx.beginPath();
    ctx.ellipse(-1.6, -1.4, 1.6, 1.1, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore(); // upper-body lean/bob transform
    ctx.restore();

    // Boss aura. EX boss: one ring per RAINBOW_RING_COLORS entry, each its own fixed color —
    // the "色々な色の枠がある" design the user asked for in place of the color-cycling body.
    // Every other CPU-match boss: escalating same-color ring count (1 at tier3 up to 3 at
    // tier5) — the visual "this one's dangerous" cue that plain color/scale alone doesn't
    // convey as clearly.
    if (isExBoss) {
      ctx.save();
      ctx.translate(p.x, p.y);
      // The aura/shield rings below all live in UNSCALED space (drawn after the body's own
      // transform is restored), so they need SIZE_UP applied here too — otherwise they'd stay
      // at their old radii and cut straight through the now-larger body.
      ctx.scale(SIZE_UP, SIZE_UP);
      const pulse = 1 + Math.sin(performance.now() / 220) * 0.05;
      RAINBOW_RING_COLORS.forEach((color, i) => {
        ctx.beginPath();
        ctx.arc(0, 0, (16 + i * 6) * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.stroke();
      });
      ctx.restore();
    } else if (tier >= 3) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(SIZE_UP, SIZE_UP); // same unscaled-space reason as the EX aura above
      const pulse = 1 + Math.sin(performance.now() / 220) * 0.05;
      const ringCount = tier - 2;
      for (let i = 0; i < ringCount; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, (16 + i * 6) * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = uniform;
        ctx.globalAlpha = 0.5 - i * 0.12;
        ctx.lineWidth = 2;
        ctx.shadowColor = uniform;
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
      ctx.restore();
    }

    if (p.buffs && p.buffs.shield > 0 && p.shieldAmount > 0) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(SIZE_UP, SIZE_UP); // shield bubble, same unscaled-space reason as the aura rings
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.04;
      ctx.beginPath();
      ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(109,227,255,0.85)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#6de3ff';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.fillStyle = 'rgba(109,227,255,0.12)';
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = theme ? uniform : 'rgba(255,255,255,0.85)';
    ctx.font = `${12 + tier}px sans-serif`;
    ctx.textAlign = 'center';
    if (theme) {
      ctx.shadowColor = uniform;
      ctx.shadowBlur = 6;
    }
    // p.name is the full "1面ボス「見習い兵士」" form (shared with the HUD's own name label,
    // which still wants the stage number/brackets per an earlier request) — too long to float
    // legibly above the character during battle, so just the bare name goes here. EX_BOSS's
    // name ('戦神') was never wrapped this way and passes through the replace() untouched.
    const floatingName = isBoss ? p.name.replace(/^\d+面ボス「(.+)」$/, '$1') : p.name;
    // Lifted by SIZE_UP so the label clears the taller body instead of sitting on its shoulders
    // (the font itself is deliberately NOT scaled — it's a readability element, not anatomy).
    ctx.fillText(floatingName, p.x, p.y - (26 + tier * 1.5) * SIZE_UP);
    ctx.restore();
  }

  // Decoy afterimage from the clone item — purely visual (no server-side hitbox at all,
  // see game.js's CLONE_OFFSET comment for why that alone makes it "無敵"): just the same
  // ship reused at the clone's offset position/angle, dimmed so it reads as a translucent
  // duplicate rather than a second real player.
  function drawCloneShip(p, isMe) {
    ctx.save();
    ctx.globalAlpha = 0.45;
    drawShip({ ...p, x: p.clone.x, y: p.clone.y, angle: p.clone.angle }, isMe);
    ctx.restore();
  }

  function drawParticles() {
    for (const pt of particles) {
      const a = Math.max(0, pt.life / pt.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Large trees, drawn dead last (on top of items/bullets/players) so their canopy
  // visually hides whatever happens to be underneath — purely a rendering-order trick,
  // there is no occlusion/fog-of-war in the actual game state.
  const TREE_BLOB_LAYOUT = [
    { dx: 0, dy: 0, rf: 1.0, color: '#2f4a2a' },
    { dx: -0.45, dy: -0.3, rf: 0.62, color: '#3a5c33' },
    { dx: 0.5, dy: -0.22, rf: 0.58, color: '#35542e' },
    { dx: -0.25, dy: 0.4, rf: 0.56, color: '#456e3d' },
    { dx: 0.35, dy: 0.35, rf: 0.5, color: '#3d5f36' },
  ];

  function drawTree(tr) {
    ctx.save();
    ctx.fillStyle = '#4a3423';
    ctx.beginPath();
    ctx.ellipse(tr.x, tr.y + tr.r * 0.55, tr.r * 0.18, tr.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 14;
    for (const b of TREE_BLOB_LAYOUT) {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(tr.x + b.dx * tr.r, tr.y + b.dy * tr.r, b.rf * tr.r, b.rf * tr.r * 0.9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.ellipse(tr.x - tr.r * 0.25, tr.y - tr.r * 0.3, tr.r * 0.35, tr.r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawTrees() {
    for (const tr of arena.trees || []) drawTree(tr);
  }

  // Houses: 3 real, colliding wall segments (already drawn generically by drawWalls(),
  // since the server pushed them straight into room.walls) plus one open side. This layer
  // only draws the two things drawWalls() can't: a dusty interior floor tint (drawn BEFORE
  // walls so the 3 wall segments read as enclosing it) and a bright glowing entrance
  // marker with a directional arrow, drawn AFTER walls so it's never occluded — the whole
  // point is making the one enterable side "分かりやすく" (clearly marked) rather than
  // leaving the player to infer it from a gap in the brickwork.
  function drawHouseFloor(house) {
    ctx.save();
    ctx.fillStyle = 'rgba(120,100,70,0.35)';
    ctx.fillRect(house.x + 3, house.y + 3, house.size - 6, house.size - 6);
    ctx.restore();
  }

  const HOUSE_WALL_THICKNESS_FALLBACK = 18;

  function drawHouseEntrance(house) {
    const t = house.wallThickness || HOUSE_WALL_THICKNESS_FALLBACK;
    const s = house.size;
    let gx, gy, gw, gh, arrowAngle;
    if (house.opening === 'up') {
      gx = house.x; gy = house.y; gw = s; gh = t; arrowAngle = Math.PI / 2;
    } else if (house.opening === 'down') {
      gx = house.x; gy = house.y + s - t; gw = s; gh = t; arrowAngle = -Math.PI / 2;
    } else if (house.opening === 'left') {
      gx = house.x; gy = house.y; gw = t; gh = s; arrowAngle = 0;
    } else {
      gx = house.x + s - t; gy = house.y; gw = t; gh = s; arrowAngle = Math.PI;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(125,255,160,0.55)';
    ctx.shadowColor = '#7dffa0';
    ctx.shadowBlur = 14;
    ctx.fillRect(gx, gy, gw, gh);
    ctx.shadowBlur = 0;

    ctx.translate(gx + gw / 2, gy + gh / 2);
    ctx.rotate(arrowAngle);
    ctx.strokeStyle = '#e8ffef';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(9, 0);
    ctx.lineTo(3, -6);
    ctx.moveTo(9, 0);
    ctx.lineTo(3, 6);
    ctx.stroke();
    ctx.restore();
  }

  // Opaque roof — drawn dead last (after players/items/bullets, same trick as drawTrees())
  // so it visually hides whoever is standing inside, just like a tree canopy. Always
  // rendered regardless of occupancy (same as trees) so looking at it can't tell you
  // whether someone's actually hiding in there. Inset by the wall thickness so it doesn't
  // paint over the entrance marker or the wall brickwork itself — only the interior.
  function drawHouseRoof(house) {
    const t = house.wallThickness || HOUSE_WALL_THICKNESS_FALLBACK;
    const rx = house.x + t;
    const ry = house.y + t;
    const rw = house.size - t * 2;
    const rh = house.size - t * 2;
    if (rw <= 0 || rh <= 0) return;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    const g = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    g.addColorStop(0, '#6b3f30');
    g.addColorStop(1, '#4a2a20');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.shadowBlur = 0;

    // roof-tile seams — fixed pattern, not randomized per frame
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let lx = rx + 8; lx < rx + rw - 4; lx += 14) {
      ctx.beginPath();
      ctx.moveTo(lx, ry + 2);
      ctx.lineTo(lx, ry + rh - 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(20,15,12,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.restore();
  }

  function drawHouseFloors() {
    for (const h of arena.houses || []) drawHouseFloor(h);
  }
  function drawHouseEntrances() {
    for (const h of arena.houses || []) drawHouseEntrance(h);
  }
  function drawHouseRoofs() {
    for (const h of arena.houses || []) drawHouseRoof(h);
  }

  function draw(t) {
    ctx.save();
    if (shakeMag > 0.3) {
      ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
    }
    drawBackground(t);
    drawHouseFloors();
    drawWalls();
    drawBlocks();
    drawHouseEntrances();
    drawParticles();
    drawLasers();
    drawSwordSlashes();
    drawShockwaves();
    if (latestState) {
      for (const item of latestState.items) drawItem(item, t);
      for (const bomb of latestState.bombs || []) drawBomb(bomb, t);
      for (const m of latestState.monsters || []) drawMonster(m, t);
      for (const b of latestState.bullets) drawBullet(b);
      for (const p of latestState.players) {
        if (latestState.mobWaveActive && p.isBoss) continue; // inert/off-screen during a wave
        drawShip(p, p.id === myId);
        if (p.clone) drawCloneShip(p, p.id === myId);
      }
    }
    drawTrees();
    drawHouseRoofs();
    ctx.restore();

    if (hitFlash > 0) {
      ctx.save();
      const g = ctx.createRadialGradient(arena.w / 2, arena.h / 2, arena.w * 0.2, arena.w / 2, arena.h / 2, arena.w * 0.7);
      g.addColorStop(0, 'rgba(255,50,70,0)');
      g.addColorStop(1, `rgba(255,30,50,${hitFlash * 0.55})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  // `level` null/undefined hides the badge entirely — used for the boss slot (bosses have no
  // level at all) and for every non-co-op mode.
  function setLvBadge(el, level) {
    if (typeof level !== 'number') {
      el.classList.add('hidden');
      return;
    }
    el.textContent = `⭐Lv.${level}`;
    el.classList.remove('hidden');
  }

  function renderBuffBadges(container, player) {
    if (!player || !player.buffs) {
      container.innerHTML = '';
      return;
    }
    let html = '';
    for (const type of Object.keys(BUFF_META)) {
      const remain = player.buffs[type];
      if (remain > 0) {
        const meta = BUFF_META[type];
        const label = type === 'shield' ? Math.max(0, Math.round(player.shieldAmount || 0)) : Math.ceil(remain / 1000);
        html += `<span class="buff-badge ${type}">${meta.icon} ${label}</span>`;
      }
    }
    container.innerHTML = html;
  }

  // Server already decided the outcome (result.hit / result.itemType) at round-end time —
  // this only plays a slot-machine-style reveal of that predetermined result, it never
  // rolls anything client-side.
  let rouletteSpinTimer = null;
  // onDone fires once the reel has actually settled on its result (not before) — callers use
  // this to hold off anything that would visually compete with the roulette (the boss-victory
  // flash/defeat-quote card are a much higher z-index than `.roulette-block` and used to fire in
  // parallel, effectively covering the spin for its whole ~6s combined duration; per explicit
  // request the boss's セリフ now always waits for the roulette to fully finish first).
  function runRoulette(result, state, onDone) {
    if (rouletteSpinTimer) {
      clearTimeout(rouletteSpinTimer);
      rouletteSpinTimer = null;
    }
    const winner = state.players.find((p) => p.id === result.winnerId);
    const winnerName = winner ? winner.name : '相手';
    // A co-op ally-side win now grants the roulette to BOTH allies (see game.js's
    // resetPositions — winnerId there is always one *representative* ally, matching
    // room.matchWins' own single-stable-id convention, but the actual item now goes to
    // whoever isn't the boss) — "仲間全員" reads correctly for both allies at once, instead
    // of naming just the representative one while silently leaving the other guessing why
    // they also got an item they weren't "the winner" of.
    const isCoopAllyWin = !!(state.storyCoop && winner && !winner.isBoss);
    const amIWinner = result.winnerId === myId;
    const who = isCoopAllyWin ? '仲間全員' : (amIWinner ? 'あなた' : winnerName);

    rouletteBlock.classList.remove('hidden');
    rouletteReel.classList.remove('settled');
    rouletteReel.classList.add('spinning');
    rouletteLabel.textContent = `🎰 ${who}のルーレット中…`;

    const icons = Object.values(ITEM_META).map((m) => m.icon);
    const totalSteps = 18;
    let step = 0;
    function spinStep() {
      if (step >= totalSteps) {
        rouletteReel.classList.remove('spinning');
        rouletteReel.classList.add('settled');
        if (result.hit) {
          rouletteReel.textContent = ITEM_META[result.itemType].icon;
          rouletteLabel.textContent = `🎉 ${who}が「${ITEM_LABEL[result.itemType]}」獲得!`;
          if (window.GameAudio) window.GameAudio.playPickup(result.itemType);
        } else {
          rouletteReel.textContent = '💢';
          rouletteLabel.textContent = `${who}はハズレ…`;
          if (window.GameAudio) window.GameAudio.playRouletteMiss();
        }
        rouletteSpinTimer = null;
        if (onDone) onDone();
        return;
      }
      rouletteReel.textContent = icons[Math.floor(Math.random() * icons.length)];
      if (window.GameAudio) window.GameAudio.playRouletteTick();
      step++;
      const delay = 60 + (step / totalSteps) * 200; // decelerates toward the end, like a slot reel settling
      rouletteSpinTimer = setTimeout(spinStep, delay);
    }
    spinStep();
  }

  function isInsideAnyHouse(x, y) {
    return (arena.houses || []).some((h) => x >= h.x && x <= h.x + h.size && y >= h.y && y <= h.y + h.size);
  }

  const STORY_BASE_MAX_HP = 100; // must match game.js's MAX_HP — the un-leveled baseline

  // Two stacked 0-100 tiers, not one bar rescaled to fit: fillEl is exactly the first 100 HP,
  // bonusEl exactly the next 100 HP above that (a leveled player — storyLevelHpMult now goes
  // 110 at level1 up to 200 at level10, +10/level — or a 2P co-op boss's hp multiplier). Per
  // explicit request, this is deliberately NOT a percentage-of-current-max fill (that would
  // always render bonusEl as "100% full" at full HP regardless of level, which never visually
  // reads as "the 2nd bar is still small at low levels and only reaches full at level 10") —
  // bonusEl's width is bonusHp itself (capped at 100), so at level1 (bonusMaxHp=10) even a
  // full-HP bar only fills the 2nd row 10% of the way, and only a maxed-out level10 character
  // (or boss) shows it genuinely full. bonusEl is a later DOM sibling (paints on top of fillEl,
  // same 0-100%-of-track box) — while any bonus HP remains it covers fillEl, which itself is
  // permanently just `min(hp,100)` and genuinely unaffected by damage while hp>100 — so the
  // front (bonus) bar visibly drains first, and only once it's fully gone does the base bar
  // start moving (same "front bar must fully deplete before the back one moves" behavior as
  // before, just derived from a formula that also makes the *idle* fill level mean something).
  // The min(100, bonusHp) cap matters for a boss whose bonus can exceed 100 (a stage-5 2P boss's
  // hpMult goes up to 2.6x = 160 bonus HP) — that extra amount just keeps the 2nd row reading as
  // "full" a little longer before it starts visibly draining, rather than overflowing the track.
  function renderHpBar(fillEl, bonusEl, p) {
    const maxHp = (p && p.maxHp) || STORY_BASE_MAX_HP;
    const hp = Math.max(0, Math.min((p && p.hp) || 0, maxHp));
    const baseWidthPct = Math.min(hp, STORY_BASE_MAX_HP);
    fillEl.style.left = '0%';
    fillEl.style.width = `${baseWidthPct}%`;
    if (!bonusEl) return;
    const bonusHp = Math.max(0, hp - STORY_BASE_MAX_HP);
    const bonusWidthPct = Math.min(STORY_BASE_MAX_HP, bonusHp);
    bonusEl.style.left = '0%';
    bonusEl.style.width = `${bonusWidthPct}%`;
  }

  function updateHud(state) {
    const me = state.players.find((p) => p.id === myId);
    // "boss" always means the boss specifically (found via isBoss, not "not me") — in co-op
    // mode "not me" would be ambiguous between the boss and my ally. Non-coop modes never
    // have an isBoss player at all outside a CPU match, so this correctly falls back to "the
    // other human" there via the isBoss-less arena-mode player objects (isBoss is simply
    // undefined on them, and .find(p=>p.isBoss) only ever matches the CPU token).
    const isCoop = !!state.storyCoop;
    // The HUD's actual row count (and so its height, and so how much room is left for the
    // arena) only ever changes at these few event boundaries, not every tick — re-measure
    // fitArena() just on those, rather than every ~33ms broadcast (which would mean constant
    // layout thrashing for no visual benefit).
    // bossCount is in the signature because a two-boss stage moves a bar out of the top row and
    // into the bottom one, which changes the HUD's height and so the arena's available space.
    const bossCount = state.players.reduce((n, p) => n + (p.isBoss ? 1 : 0), 0);
    const arenaFitSignature = `${isCpuMatch}|${isCoop}|${!!state.mobWaveActive}|${bossCount}`;
    if (arenaFitSignature !== lastArenaFitSignature) {
      lastArenaFitSignature = arenaFitSignature;
      fitArenaSoon();
    }
    // A hard-mode stage fields TWO bosses at once, so the slots are worked out from the real
    // boss list rather than from "the one player who isn't me".
    const bossList = state.players.filter((p) => p.isBoss);
    const boss = isCoop ? bossList[0] : (bossList[0] || state.players.find((p) => p.id !== myId));
    const ally = isCoop ? state.players.find((p) => p.id !== myId && !p.isBoss) : null;
    // Top row is reserved for the two human players in co-op (per explicit request) — the
    // top-right slot shows the ally there instead of the boss, and the boss's bar moves to
    // the bottom row (allyHpBlock, repurposed — see index.html's comment on it).
    // Layout by mode:
    //   normal 1P  : me | boss              (bottom row hidden)
    //   normal 2P  : me | ally              | boss
    //   hard   1P  : me | (empty)           | boss1 + boss2
    //   hard   2P  : me | ally              | boss1 + boss2
    // A two-boss stage always puts BOTH bosses in the bottom row, whether or not there is an
    // ally — so hard 1P shows the pair in exactly the same place hard 2P does (explicit
    // request). In hard 1P that leaves the top-right slot with nothing to show, so it is
    // hidden outright rather than left displaying a stale "waiting for opponent" placeholder.
    const multiBoss = bossList.length > 1;
    const topRight = isCoop ? ally : (multiBoss ? null : boss);
    const bottomBosses = (isCoop || multiBoss) ? bossList : [];

    if (me) {
      nameMine.textContent = me.name;
      renderHpBar(hpMine, hpBonusMine, me);
      hpMine.classList.toggle('house-healing', me.hp < (me.maxHp || 100) && isInsideAnyHouse(me.x, me.y));
      // Downed-but-match-still-going only happens in 2P co-op (every other mode ends the
      // round the instant either side has a casualty, so this state can't occur there).
      const meDowned = isCoop && !me.alive && state.phase === 'playing';
      downedMine.classList.toggle('hidden', !meDowned);
      downedBanner.classList.toggle('hidden', !meDowned);
    }
    hpTheirs.classList.toggle('color-boss', !isCoop);
    hpTheirs.classList.toggle('color-ally', isCoop);
    if (topRight) {
      // The boss stays present-but-inert (untargetable, full hp) during a mob wave — see
      // game.js's mobWaveActive damage exclusion — so its hp bar never actually moves here;
      // swapping just the label to "討伐中" reads as "on hold" instead of a stray full-hp
      // boss bar that looks like nothing's happening.
      nameTheirs.textContent = state.mobWaveActive && !isCoop ? 'ザコモンスター討伐中…' : topRight.name;
      renderHpBar(hpTheirs, hpBonusTheirs, topRight);
      hpTheirs.classList.toggle('house-healing', topRight.hp < (topRight.maxHp || 100) && isInsideAnyHouse(topRight.x, topRight.y));
      // Only ever relevant for the ally slot (co-op) — the boss "downed" is just the round
      // ending, no ambiguous mid-round state to flag here the way a fallen ally has.
      downedTheirs.classList.toggle('hidden', !(isCoop && !topRight.alive && state.phase === 'playing'));
    } else {
      // Two different things reach here. Genuinely waiting for someone to arrive — say so. Or a
      // two-boss 1P stage, where this slot has no occupant *by design* (both bosses live in the
      // bottom row) and the block is blanked: that one carries no text at all, rather than
      // leaving a stale "waiting for an opponent" line sitting in the DOM behind the blanking.
      const blankedByDesign = multiBoss && !isCoop;
      nameTheirs.textContent = blankedByDesign ? '' : (isCoop ? '仲間を待っています…' : '相手を待っています…');
      hpTheirs.style.width = '100%';
      hpBonusTheirs.style.width = '0%';
      downedTheirs.classList.add('hidden');
    }
    // The mob-wave mini-game is cleared by kill count, not by beating the boss down — its hp
    // bar is irrelevant (and stays static/full the whole time, since the boss is untargetable
    // during a wave, see game.js) — so hide it entirely for the duration, rather than just
    // relabeling it, per explicit request. Only applies where this slot actually shows the
    // boss: in 2P co-op, hpTheirs shows the ally (a human teammate), who stays relevant.
    hpBlockTheirs.classList.toggle('hidden', !isCoop && !!state.mobWaveActive);
    // A two-boss 1P stage leaves this slot with no occupant (both bosses moved to the bottom
    // row, see the layout table above). Blank its CONTENTS rather than removing the block:
    // .hud is justify-content:space-between, so display:none-ing it would drag the centre
    // column (room code, stage, score) over to the right edge.
    hpBlockTheirs.classList.toggle('hp-block-empty', !isCoop && multiBoss);
    // Per-player level badges beside each human's name. Only in co-op: with two allies levelling
    // independently there is no single "the level" to show, and a lone centre number would be
    // ambiguous about whose it is. In 1P the centre ⭐Lv label below stays the one place to read
    // it, exactly as before.
    // Also used for a two-boss 1P stage: the centre ⭐Lv line is an extra row in the middle
    // column, which would push the bosses' bottom row 16px lower than the identical 2P layout
    // puts it. Moving it to a badge beside my own name (the co-op treatment) makes the two
    // layouts line up exactly, which is the whole point of the two-boss row placement.
    const showLvBadges = isCpuMatch && (isCoop || multiBoss);
    setLvBadge(lvMine, showLvBadges && me ? me.storyLevel : null);
    setLvBadge(lvTheirs, showLvBadges && topRight && !topRight.isBoss ? topRight.storyLevel : null);
    renderBuffBadges(buffMine, me);
    renderBuffBadges(buffTheirs, topRight);

    // allyHpBlock shows the boss in co-op (see index.html's comment on it) — hidden outside
    // co-op as before, and now also hidden during a wave for the same reason as hpBlockTheirs.
    // Bottom row: driven by `bottomBosses` (see above) so it holds one boss in 2P co-op, the
    // second boss in hard 1P, and both of them in hard 2P. Hidden entirely during a mob wave —
    // the bosses are inert and untargetable then, so their static bars are just noise.
    const showBottom = bottomBosses.length > 0 && !state.mobWaveActive;
    bottomHpRow.classList.toggle('hidden', !showBottom);
    const bottomSlots = [
      { block: allyHpBlock, name: nameAlly, bar: hpAlly, bonus: hpBonusAlly, buffs: buffAlly },
      { block: boss2HpBlock, name: nameBoss2, bar: hpBoss2, bonus: hpBonusBoss2, buffs: buffBoss2 },
    ];
    bottomSlots.forEach((slot, i) => {
      const b = showBottom ? bottomBosses[i] : null;
      slot.block.classList.toggle('hidden', !b);
      if (!b) { renderBuffBadges(slot.buffs, null); return; }
      slot.name.textContent = b.name;
      renderHpBar(slot.bar, slot.bonus, b);
      slot.bar.classList.toggle('house-healing', b.hp < (b.maxHp || 100) && isInsideAnyHouse(b.x, b.y));
      renderBuffBadges(slot.buffs, b);
    });

    const wins = state.matchWins || {};
    // CPU matches (1P story and 2P co-op alike) key room.matchWins by the stable 'ally'/'boss'
    // strings, not a player id — ids are volatile (a reconnect regenerates both the human's and
    // the boss's, see game.js's win-check comment), so reading by id here would silently show
    // 0 for whichever side just reconnected mid-series even though the server-side tally is
    // still intact. Arena PvP has no ally/boss concept, so it still reads by the (there, stable
    // enough for now) raw player id.
    const myWins = isCpuMatch ? (wins.ally || 0) : (me ? wins[me.id] || 0 : 0);
    const oppWins = isCpuMatch ? (wins.boss || 0) : (boss ? wins[boss.id] || 0 : 0);
    matchScoreEl.textContent = `${myWins} - ${oppWins}`;
    // The mob-wave mini-game isn't part of the best-of-MATCH_WIN_TARGET series at all (see
    // game.js's mobWaveActive win-check, which deliberately never touches room.matchWins) —
    // showing a "N - N" score during it would misleadingly suggest the wave counts toward
    // that tally, so hide the badge for the duration instead.
    matchScoreEl.classList.toggle('hidden', !!state.mobWaveActive);
    if (isCpuMatch) {
      // Kept short deliberately. .room-tag is white-space:nowrap and sits between the two
      // hp-blocks in the HUD's flex row, so a long centre label cannot shrink and instead
      // starves the side blocks — a first pass ("🔥ハード 第1/3ステージ") squeezed the
      // top-right name so hard that a 5-letter player name wrapped mid-word as "B / ravo".
      storyStageLabel.textContent = state.hardMode
        ? `🔥ハード ${storyStage}/${storyStageCount}`
        : `第${storyStage}面 / 全${storyStageCount}面`;
      storyStageLabel.classList.remove('hidden');
    } else {
      storyStageLabel.classList.add('hidden');
    }
    if (state.mobWaveActive) {
      const remaining = Math.max(0, (state.mobWaveCount || 0) - (state.mobWaveKilled || 0));
      mobWaveLabel.textContent = `⚔️ 残りザコ ${remaining}/${state.mobWaveCount || 0}`;
      mobWaveLabel.classList.remove('hidden');
    } else {
      mobWaveLabel.classList.add('hidden');
    }
    // ---- near-death tension ----
    // Only for MY own hp, only while the round is actually live: the vignette and heartbeat are
    // about how much trouble *I* am in, so they must not fire while dead, paused, or sitting on
    // a result screen. Rate tightens as hp falls, and the CSS animation reads the same number,
    // so the pulse and the heartbeat stay locked together.
    const meLow = state.phase === 'playing' && !state.paused && me && me.alive
      ? me.hp / (me.maxHp || 100)
      : 1;
    lowHpActive = meLow <= LOW_HP_THRESHOLD;
    lowHpIntensity = lowHpActive ? Math.max(0, Math.min(1, 1 - meLow / LOW_HP_THRESHOLD)) : 0;
    lowHpVignette.classList.toggle('hidden', !lowHpActive);
    if (lowHpActive) {
      lowHpVignette.style.setProperty('--lowhp-rate', `${(HEARTBEAT_SLOW_MS - (HEARTBEAT_SLOW_MS - HEARTBEAT_FAST_MS) * lowHpIntensity) / 1000}s`);
    }

    // ---- match-point / deciding-round banner ----
    // Shown during the pre-round countdown only. "王手" = someone can take the match with this
    // round; the 2-2 case is the decider and gets its own hotter treatment.
    const target = MATCH_WIN_TARGET;
    const stakesMine = isCpuMatch ? (wins.ally || 0) : (me ? wins[me.id] || 0 : 0);
    const stakesTheirs = isCpuMatch ? (wins.boss || 0) : (boss ? wins[boss.id] || 0 : 0);
    let stakesText = '', stakesDecider = false;
    if (state.phase === 'countdown' && !state.mobWaveActive) {
      if (stakesMine === target - 1 && stakesTheirs === target - 1) { stakesText = '⚔️ 最終ラウンド'; stakesDecider = true; }
      else if (stakesMine === target - 1) stakesText = '🔥 王手 ─ 勝てば決着';
      else if (stakesTheirs === target - 1) stakesText = '⚠ 後がない ─ 負ければ終わり';
    }
    roundStakes.classList.toggle('hidden', !stakesText);
    roundStakes.classList.toggle('decider', stakesDecider);
    if (stakesText) roundStakes.textContent = stakesText;
    // Sting fires once per countdown, on the transition into a stakes round — not on every
    // broadcast, and not again if the same countdown keeps ticking.
    const stakesKey = stakesText ? `${state.storyStage}|${stakesMine}-${stakesTheirs}|${stakesText}` : '';
    if (stakesKey && stakesKey !== lastStakesKey) {
      lastStakesKey = stakesKey;
      if (window.GameAudio) window.GameAudio.playFinalRound();
    } else if (!stakesKey) {
      lastStakesKey = '';
    }

    // Boss signature-move warning: shown only during the move's wind-up. `specialUntil` is a
    // server clock reading, so it is compared against the server's own `now` carried on the
    // state rather than the browser's clock, which would drift.
    const warning = state.phase === 'playing'
      ? state.players.find((p) => p.isBoss && p.specialName && p.specialUntil > (state.serverNow || 0))
      : null;
    bossSpecialWarn.classList.toggle('hidden', !warning);
    if (warning) bossSpecialName.textContent = warning.specialName;
    // 1P only: reads MY level off the players array (levels are per player now — there is no
    // room-wide state.storyLevel any more). In co-op this stays hidden and the two per-name
    // badges above carry it instead.
    if (isCpuMatch && !isCoop && !multiBoss && me && typeof me.storyLevel === 'number') {
      levelLabel.textContent = `⭐ Lv.${me.storyLevel}`;
      levelLabel.classList.remove('hidden');
    } else {
      levelLabel.classList.add('hidden');
    }

    const myBombCount = me ? me.bombs || 0 : 0;
    const myPlacedBombs = (state.bombs || []).filter((b) => b.ownerId === myId).length;
    // Both buttons are only ever shown while relevant — place while holding an unspent
    // bomb, detonate while one is actually placed — rather than always-visible+dimmed,
    // so there's no dead-looking button cluttering the screen most of the time.
    bombControls.classList.toggle('hidden', myBombCount <= 0);
    detonateBombBtn.classList.toggle('hidden', myPlacedBombs <= 0);
    bombStatusCount.textContent = myBombCount;
    bombStatus.classList.toggle('hidden', myBombCount <= 0);

    // Independent of the phase dispatch below (server only ever sets paused during 'playing',
    // but this reads the flag directly rather than assuming that) — either player's toggle
    // affects state.paused for the whole room, so both screens show/hide this together.
    pauseOverlay.classList.toggle('hidden', !state.paused);

    // storyEndingOverlay/trueEndingOverlay/gameOverOverlay are only ever shown from inside the
    // 'finished' branch below, which only runs while state.phase === 'finished' — that branch
    // hides them again at its own top on every re-run, but nothing previously hid them once
    // phase actually left 'finished' for a NEW fight. That's invisible for a normal rematch
    // (the next round's 'countdown'/'playing' already hides resultOverlay, which is the only
    // overlay a normal round-clear uses), but the stage-5 "戦場の深部へ進む" button is the one
    // path where a 'finished'-phase overlay (storyEndingOverlay) needs to go away for a
    // *different* fight (the EX boss) that reuses the SAME phase cycle — without this, it sat
    // there permanently on top of the arena (z-index above the boss-intro card, so even the EX
    // boss's own portrait/セリフ rendered invisibly underneath it), visually blocking the fight
    // and swallowing input. Confirmed as the actual mechanism behind "pressing the challenge
    // button just leaves the ending screen up, can't fight, no EX boss portrait/line visible."
    if (state.phase !== 'finished') {
      storyEndingOverlay.classList.add('hidden');
      trueEndingOverlay.classList.add('hidden');
      gameOverOverlay.classList.add('hidden');
    }
    // Same idea, one step further: bossIntroOverlay/bossVictoryOverlay/bossDefeatOverlay/
    // waveIntroOverlay are all "pre-battle or between-round" narration cards, each with its own
    // independent auto-hide timer (5s/1.6s/5s/5s) — every one of them should always be long
    // gone by the time the round actually reaches 'playing'. Per an explicit "the battle
    // sometimes becomes invisible behind a conversation screen" report, this force-clears all
    // four (and their pending timers, so a stray one firing later can't re-trigger anything)
    // the instant real combat starts, as a hard guarantee independent of whether each one's own
    // timer actually fired correctly — the same class of bug as the storyEndingOverlay fix
    // above, applied to every remaining "narration overlay that outlives its own phase" case.
    if (state.phase === 'playing') {
      if (bossIntroHideTimer) { clearTimeout(bossIntroHideTimer); bossIntroHideTimer = null; }
      bossIntroOverlay.classList.add('hidden');
      if (bossVictoryHideTimer) { clearTimeout(bossVictoryHideTimer); bossVictoryHideTimer = null; }
      bossVictoryOverlay.classList.add('hidden');
      if (bossDefeatHideTimer) { clearTimeout(bossDefeatHideTimer); bossDefeatHideTimer = null; }
      bossDefeatOverlay.classList.add('hidden');
      if (waveIntroHideTimer) { clearTimeout(waveIntroHideTimer); waveIntroHideTimer = null; }
      waveIntroOverlay.classList.add('hidden');
    }

    if (state.phase === 'waiting') {
      statusLabel.textContent = '相手を待っています…';
      waitOverlay.classList.remove('hidden');
      shareHint.classList.remove('hidden');
      resultOverlay.classList.add('hidden');
    } else if (state.phase === 'countdown') {
      statusLabel.textContent = `開始まで ${state.countdown}`;
      waitOverlay.classList.remove('hidden');
      shareHint.classList.add('hidden');
      resultOverlay.classList.add('hidden');
    } else if (state.phase === 'playing') {
      waitOverlay.classList.add('hidden');
      resultOverlay.classList.add('hidden');
    } else if (state.phase === 'finished') {
      waitOverlay.classList.add('hidden');
      resultOverlay.classList.remove('hidden');

      // Story-mode branching only matters once the whole best-of-N series is decided
      // (matchOver) — mid-series it's just a plain "next round" continue, same as a
      // human match. "Is there a next stage" is computed from storyStage/storyStageCount
      // directly (both already reflect the stage that was just won, not yet incremented —
      // the server only bumps storyStage once a 'rematch' is actually sent) rather than
      // state.storyComplete, which the server doesn't set until that same click — using
      // it here would misjudge stage 5's win as "more stages available" for one frame.
      const humanWonMatch = isCpuMatch && state.matchOver && humanSideWon(state, state.matchWinnerId);
      const bossWon = isCpuMatch && state.matchOver && !humanSideWon(state, state.matchWinnerId);
      const exBossActive = !!state.exBossActive;
      // Beating the EX boss also satisfies storyStage>=storyStageCount (storyStage stays
      // frozen at 5 throughout that fight), so finalStageClear explicitly excludes it — the
      // two endings are mutually exclusive, trueEndingClear takes priority.
      const trueEndingClear = humanWonMatch && exBossActive;
      const finalStageClear = humanWonMatch && storyStage >= storyStageCount && !exBossActive;
      // A wave-clear reaches humanWonMatch too (see game.js's mobWaveActive win-check) but
      // isn't a boss kill, so it gets its own branch below rather than falling into
      // stageAdvance's boss-defeat-quote-gated flow — there's no boss dialogue to wait on.
      const waveCleared = humanWonMatch && !!state.mobWaveActive;
      const stageAdvance = humanWonMatch && !state.mobWaveActive && storyStage < storyStageCount;

      rematchBtn.classList.add('hidden');
      storyEndingOverlay.classList.add('hidden');
      trueEndingOverlay.classList.add('hidden');
      storyRetryBtn.classList.add('hidden');
      gameOverOverlay.classList.add('hidden');
      if (bossWon) {
        // A boss series loss and a failed ザコ戦 both end the run here, and used to show the
        // exact same card — so a player wiped out by the mini-game got a generic "力尽きた"
        // with no sign of which fight had just ended, and the only number left on screen was
        // the HUD's "残りザコ N/10" (how many were LEFT, not how far they got). The wave gets
        // its own wording plus a 撃破 tally, which is the mini-game's real score.
        if (state.mobWaveActive) {
          gameOverText.innerHTML = 'ザコの群れに飲み込まれた――。<br />ボスの元へ辿り着くことは、叶わなかった。';
          const total = state.mobWaveCount || 0;
          const killed = Math.min(total, state.mobWaveKilled || 0);
          gameOverScore.innerHTML = `ザコ戦 撃破 <b>${killed}</b> / ${total}`;
          gameOverScore.classList.remove('hidden');
        } else {
          gameOverText.innerHTML = '力尽き、戦場に崩れ落ちた――。<br />ここが、あなたの物語の終着点となった。';
          gameOverScore.classList.add('hidden');
        }
        gameOverOverlay.classList.remove('hidden');
        // Only reveal the retry button once the dramatic-pause timer (started once, on the
        // 'finished' phase-transition edge above) has actually elapsed — this branch itself
        // re-runs on every ~33ms broadcast while sitting in 'finished', so it must keep
        // deferring to that flag rather than unhiding the button unconditionally every tick.
        if (gameOverRetryReady) storyRetryBtn.classList.remove('hidden');
      } else if (trueEndingClear) {
        // Waits on both the victory flash AND the EX boss's own defeat-quote-then-crumble beat
        // (showExBossDefeat, chained from showBossVictory's onDone above) — the true ending
        // shouldn't appear stacked underneath/racing either of them.
        if (bossPresentationDone) {
          // This branch re-runs on every ~33ms broadcast while sitting in 'finished' — only
          // start the 8s reveal timer once, on the actual hidden->visible transition, not on
          // every tick after that.
          if (trueEndingOverlay.classList.contains('hidden')) {
            trueEndingTapReady = false;
            if (trueEndingRevealTimer) clearTimeout(trueEndingRevealTimer);
            trueEndingRevealTimer = setTimeout(() => {
              trueEndingTapReady = true;
              trueEndingOverlay.classList.add('ready');
              trueEndingRevealTimer = null;
            }, 10000); // per explicit request (was 8s)
          }
          trueEndingOverlay.classList.remove('hidden');
        }
      } else if (finalStageClear) {
        if (bossVictoryOverlay.classList.contains('hidden')) {
          // Hard mode ends on its own third stage, so it reuses this same overlay with its own
          // wording — and hides the "go deeper" button, since the EX boss has already been part
          // of the fight the player just won rather than being something still ahead of them.
          const isHard = !!state.hardMode;
          if (isHard) recordHardCleared();
          storyEndingTag.textContent = isHard ? 'HARD MODE ALL CLEAR' : 'ALL STAGES CLEAR';
          storyEndingTitle.textContent = isHard ? '🔥 二つの影も、断ち切った' : '🏆 戦場に、静寂が訪れた';
          // The last stage goes straight from the kill to this screen without a defeat card
          // (same as the normal campaign's stage 5), so the final pair's parting words live
          // here instead of being written and never shown.
          storyEndingText.innerHTML = isHard
            ? '地獄の底から這い上がった狼たちが、二匹ずつ束になって牙を剥いた。<br />その夢のタッグを、三度とも噛み砕いた。<br /><br />「――認めよう。真の『戦場の狼』は、貴様だ。」<br /><br />もはやこの戦場に、あなたの前へ立てる影はない。'
            : '立ちはだかった５人の強敵、そのすべてを打ち破った。<br /><br />すべての戦場の敵は、倒した。<br />だが、戦いはまだ終わらない――。';
          challengeExBtn.classList.toggle('hidden', isHard);
          storyEndingOverlay.classList.remove('hidden');
        }
      } else if (waveCleared) {
        // No boss-defeat-quote card plays for a wave-clear (see handleState's guard), so
        // bossPresentationDone flips true right as the "勝利！！" flash itself ends.
        if (bossPresentationDone) rematchBtn.classList.remove('hidden');
        rematchBtn.textContent = 'ボスへ進む';
      } else {
        // For a stage-clear specifically, keep rematchBtn hidden until the WHOLE post-victory
        // sequence (roulette wait if any -> "勝利！！" flash -> boss's defeat line) has
        // genuinely finished — bossPresentationDone (set in handleState's phase-transition
        // edge, above) is a real completion signal, not an inference from current overlay
        // visibility. That inference used to be wrong: with a roulette wait queued in front of
        // the flash/defeat-quote, both overlays read "currently hidden" for the ~1-2.6s before
        // the sequence even starts, which let rematchBtn (and so the next mob-wave mini-game)
        // appear while the flash/defeat-quote were still queued behind it — confirmed live via
        // a timing test, matching an explicit "画面がめちゃくちゃ" report.
        // A plain mid-series round (1 of 3 decided, match still going) has no dramatic sequence
        // to wait on, so its button used to appear the instant the round ended — the result
        // flashed past with no beat to register who won. Per explicit request it now gets the
        // same 3s pause the GAME OVER screen has (roundPauseReady, started once on the
        // 'finished' edge in handleState).
        const waitingOnDefeatLine = stageAdvance ? !bossPresentationDone : !roundPauseReady;
        if (!waitingOnDefeatLine) rematchBtn.classList.remove('hidden');
        rematchBtn.textContent = stageAdvance ? '次の面へ' : (isCpuMatch ? '次のラウンドへ' : 'もう一度対戦する');
      }

      if (bossWon) {
        resultBanner.textContent = state.mobWaveActive ? 'ザコモンスターの猛攻に敗れた…' : 'GAME OVER…';
        resultBanner.className = 'result-banner result-lose';
      } else if (trueEndingClear) {
        resultBanner.textContent = '🌌 真のエンディング到達！';
        resultBanner.className = 'result-banner result-win';
      } else if (finalStageClear) {
        resultBanner.textContent = '🏆 ストーリークリア！';
        resultBanner.className = 'result-banner result-win';
      } else if (waveCleared) {
        resultBanner.textContent = '⚔️ ザコモンスター全滅！ 突破！';
        resultBanner.className = 'result-banner result-win';
      } else if (stageAdvance) {
        resultBanner.textContent = `ボス撃破！ 第${storyStage}面クリア！`;
        resultBanner.className = 'result-banner result-win';
      } else if (state.matchOver) {
        if (humanSideWon(state, state.matchWinnerId)) {
          resultBanner.textContent = `${MATCH_WIN_TARGET}本先取！マッチ勝利！ 🏆`;
          resultBanner.className = 'result-banner result-win';
        } else {
          resultBanner.textContent = `${MATCH_WIN_TARGET}本先取されました…`;
          resultBanner.className = 'result-banner result-lose';
        }
      } else if (state.winnerId && humanSideWon(state, state.winnerId)) {
        resultBanner.textContent = 'あなたの勝ち! ⚔️';
        resultBanner.className = 'result-banner result-win';
      } else if (state.winnerId) {
        resultBanner.textContent = 'あなたの負け…';
        resultBanner.className = 'result-banner result-lose';
      } else {
        resultBanner.textContent = '引き分け';
        resultBanner.className = 'result-banner';
      }
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;
    updateEffects(dt);
    updateShipMotion(dt, now); // must run before draw() — drawShip() reads this frame's gait/recoil
    updateMobMotion(dt); // ditto for drawMonster()'s facing/walk cycle
    // Heartbeat while nearly dead. Scheduled off the frame clock rather than a setInterval so it
    // stops the instant the condition clears (death, pause, round end) with no timer to cancel.
    if (lowHpActive) {
      const interval = HEARTBEAT_SLOW_MS - (HEARTBEAT_SLOW_MS - HEARTBEAT_FAST_MS) * lowHpIntensity;
      if (now - lastHeartbeatAt >= interval) {
        lastHeartbeatAt = now;
        if (window.GameAudio) window.GameAudio.playHeartbeat(lowHpIntensity);
      }
    } else {
      lastHeartbeatAt = 0;
    }
    spawnTrails();
    draw(now);
    if (latestState) updateHud(latestState);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
