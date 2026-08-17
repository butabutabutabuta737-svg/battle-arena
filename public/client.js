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
  const storyRetryBtn = $('#storyRetryBtn');
  const modeStoryBtn = $('#modeStoryBtn');
  const storyIntro = $('#storyIntro');
  const storyIntroBackBtn = $('#storyIntroBackBtn');
  const storyNameInput = $('#storyNameInput');
  const storyRouletteToggle = $('#storyRouletteToggle');
  const story1pBtn = $('#story1pBtn');
  const story2pBtn = $('#story2pBtn');
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
  const trueEndingOverlay = $('#trueEndingOverlay');
  const trueEndingTitleBtn = $('#trueEndingTitleBtn');
  const gameOverOverlay = $('#gameOverOverlay');
  const bossIntroOverlay = $('#bossIntroOverlay');
  const bossIntroStage = $('#bossIntroStage');
  const bossIntroPortrait = $('#bossIntroPortrait');
  const bossIntroName = $('#bossIntroName');
  const bossIntroLine = $('#bossIntroLine');
  const bossDefeatOverlay = $('#bossDefeatOverlay');
  const bossDefeatPortrait = $('#bossDefeatPortrait');
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
  const levelUpValue = $('#levelUpValue');
  const floatJoystick = $('#floatJoystick');
  const floatJoystickKnob = $('#floatJoystickKnob');
  const fireBtn = $('#fireBtn');
  const swordBtn = $('#swordBtn');
  const buffMine = $('#buffMine');
  const buffTheirs = $('#buffTheirs');
  const allyHpBlock = $('#allyHpBlock');
  const nameAlly = $('#nameAlly');
  const hpAlly = $('#hpAlly');
  const buffAlly = $('#buffAlly');
  const downedMine = $('#downedMine');
  const downedTheirs = $('#downedTheirs');
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
    // facePos: object-position for the portrait <img> — the source crops are tall full-body
    // shots with varying amounts of sky/background above each head, so "top" alone doesn't
    // land on the face for all of them (calibrated by rendering each at actual display size
    // and eyeballing it — boss2's crop has a raised flag over its head needing extra offset).
    { uniform: '#8fae6b', icon: '🔰', image: 'images/bosses/boss1.jpg', facePos: 'center top' }, // stage1: rookie soldier, muted olive
    { uniform: '#d98a3d', icon: '🗡️', image: 'images/bosses/boss2.jpg', facePos: 'center 22%' }, // stage2: veteran mercenary, bronze
    { uniform: '#c0392b', icon: '🎖️', image: 'images/bosses/boss3.jpg', facePos: 'center top' }, // stage3: elite squad captain, deep red
    { uniform: '#6b5b95', icon: '🔪', image: 'images/bosses/boss4.jpg', facePos: 'center top' }, // stage4: knife specialist, stealthy purple
    { uniform: '#ffd35b', icon: '👑', image: 'images/bosses/boss5.jpg', facePos: 'center top' }, // stage5: battlefield champion, gold
  ];
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
  const CERT_TITLES = ['証明書なし', '1面 撃破証明書', '2面 撃破証明書', '3面 撃破証明書', '4面 撃破証明書', '全ボス撃破証明書', '真・撃破証明書'];
  const CERT_HONORIFICS = ['', '見習い戦士', '歴戦の戦士', '精鋭の戦士', '血刃を制する者', '戦場の狼', '戦場を統べし者'];
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

  // Hidden EX boss's own defeat flag — separate key/variable from bestBossDefeated (which stays
  // 0-5, unchanged semantics) since the EX boss isn't part of STORY_BOSSES/storyStageCount at all.
  const EX_STORAGE_KEY = 'battle-arena-ex-boss-defeated';
  let exBossDefeated = false;
  try { exBossDefeated = localStorage.getItem(EX_STORAGE_KEY) === '1'; } catch (e) { exBossDefeated = false; }
  function recordExBossDefeated() {
    if (exBossDefeated) return;
    exBossDefeated = true;
    try { localStorage.setItem(EX_STORAGE_KEY, '1'); } catch (e) { /* localStorage unavailable — certificate just won't persist */ }
  }

  // Drawn placeholder for the EX boss's portrait slots (boss-intro/defeat cards, certificate)
  // — there's no source photo for it (all 5 real photos are already claimed by the numbered
  // bosses), so a radiant golden eye/sigil stands in, fitting a mysterious "god of the
  // battlefield" reveal better than reusing an already-identified character's face anyway.
  const EX_BOSS_SIGIL_SRC = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
    '<defs><radialGradient id="g" cx="50%" cy="50%" r="60%">' +
    '<stop offset="0%" stop-color="#fff6d0"/><stop offset="35%" stop-color="#ffd35b"/><stop offset="100%" stop-color="#1a0800"/>' +
    '</radialGradient></defs>' +
    '<rect width="100" height="100" fill="#05030a"/>' +
    '<circle cx="50" cy="50" r="42" fill="url(#g)"/>' +
    '<ellipse cx="50" cy="50" rx="26" ry="12" fill="#0a0400"/>' +
    '<circle cx="50" cy="50" r="7" fill="#ffefc2"/>' +
    '</svg>'
  );

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
  let lastStoryLevel = 1; // last storyLevel we've shown a level-up toast for
  let levelUpHideTimer = null;
  let leavingIntentionally = false;
  let arena = { w: 800, h: 600, walls: [], trees: [], houses: [] };
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

  function randomRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  function connect(room, name, wantsStoryCpu, roulette, wantsCoop) {
    audioReady();
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const cpuParam = wantsStoryCpu ? '&cpu=story' : '';
    const rouletteParam = roulette ? '&roulette=1' : '';
    const coopParam = wantsCoop ? '&coop=1' : '';
    const url = `${proto}://${location.host}/?room=${encodeURIComponent(room)}&name=${encodeURIComponent(name)}${cpuParam}${rouletteParam}${coopParam}`;
    ws = new WebSocket(url);

    leavingIntentionally = false;
    ws.addEventListener('open', () => {
      if (window.GameAudio) window.GameAudio.stopTitleBgm();
      modeSelect.classList.add('hidden');
      lobby.classList.add('hidden');
      storyIntro.classList.add('hidden');
      story2pLobby.classList.add('hidden');
      gameScreen.classList.remove('hidden');
      homeBtn.classList.remove('hidden');
      roomLabel.textContent = room;
      roomLabel2.textContent = room;
    });

    ws.addEventListener('message', (ev) => {
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
      if (window.GameAudio) window.GameAudio.stopBgm();
      if (leavingIntentionally) return;
      statusLabel.textContent = '接続が切れました。ページを再読み込みしてください。';
      waitOverlay.classList.remove('hidden');
    });
  }

  function resetClientState() {
    myId = null;
    isCpuMatch = false;
    latestState = null;
    prevState = null;
    lastPhase = null;
    lastCountdown = null;
    seenBulletIds = new Set();
    bulletPos.clear();
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
    gameOverRetryReady = false;
    if (gameOverTimer) { clearTimeout(gameOverTimer); gameOverTimer = null; }
    gameOverOverlay.classList.add('hidden');
    downedMine.classList.add('hidden');
    downedTheirs.classList.add('hidden');
    downedBanner.classList.add('hidden');
    lastStoryLevel = 1;
    if (levelUpHideTimer) { clearTimeout(levelUpHideTimer); levelUpHideTimer = null; }
    levelUpToast.classList.add('hidden');
  }

  function goToTitle() {
    leavingIntentionally = true;
    if (ws) {
      ws.close();
      ws = null;
    }
    if (window.GameAudio) window.GameAudio.stopBgm();
    resetClientState();
    gameScreen.classList.add('hidden');
    homeBtn.classList.add('hidden');
    lobby.classList.add('hidden');
    storyIntro.classList.add('hidden');
    story2pLobby.classList.add('hidden');
    modeSelect.classList.remove('hidden');
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
    lobby.classList.add('hidden');
    modeSelect.classList.remove('hidden');
  });

  // Undefeated bosses on the story-intro screen are dimmed to grayscale — same treatment as
  // the certificate's .cert-portrait.locked, per explicit request to match that look — until
  // the player has actually beaten that stage at least once; re-run every time this screen
  // becomes visible (not just once) so a boss defeated mid-session immediately shows its real
  // face in color the next time the player returns here.
  const storySilhouetteEls = Array.from($('.boss-silhouette-row').querySelectorAll('.boss-portrait'));
  function renderStorySilhouettes() {
    storySilhouetteEls.forEach((el, i) => el.classList.toggle('locked', i + 1 > bestBossDefeated));
  }

  modeStoryBtn.addEventListener('click', () => {
    audioReady();
    playSelectSfx();
    modeSelect.classList.add('hidden');
    storyIntro.classList.remove('hidden');
    renderStorySilhouettes();
  });

  storyIntroBackBtn.addEventListener('click', () => {
    audioReady();
    storyIntro.classList.add('hidden');
    modeSelect.classList.remove('hidden');
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
  helpBtn.addEventListener('click', () => helpOverlay.classList.remove('hidden'));
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
  certPortraitEx.src = EX_BOSS_SIGIL_SRC;
  function renderCertificate() {
    // Display tier is 0-6: 0-5 mirror bestBossDefeated exactly, 6 only once the hidden EX
    // boss has also fallen (which requires bestBossDefeated===5 already, so this can't be
    // reached "early"). CERT_TITLES/HONORIFICS/certCard's tier class all use this, not
    // bestBossDefeated directly, so the true-ending tier gets its own distinct card styling.
    const tier = exBossDefeated ? 6 : bestBossDefeated;
    certCard.className = 'certificate' + (tier > 0 ? ` cert-tier-${tier}` : '');
    certLabel.textContent = CERT_TITLES[tier];
    certSub.textContent = exBossDefeated ? 'すべてを統べる者を、討った。'
      : bestBossDefeated > 0 ? `あなたは${bestBossDefeated}面のボスまで撃破しました` : 'まずは1面のボスを倒そう';
    certSeal.classList.toggle('visible', bestBossDefeated >= 5);
    certBossIcon.textContent = exBossDefeated ? '🌌' : bestBossDefeated > 0 ? BOSS_TIER_THEME[bestBossDefeated - 1].icon : '❔';
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
    certPortraitEx.classList.toggle('hidden', !exBossDefeated);
  }
  certOpenBtn.addEventListener('click', () => { audioReady(); renderCertificate(); certOverlay.classList.remove('hidden'); });
  certCloseBtn.addEventListener('click', () => { audioReady(); certOverlay.classList.add('hidden'); });
  certOverlay.addEventListener('click', (e) => { if (e.target === certOverlay) certOverlay.classList.add('hidden'); });

  joinBtn.addEventListener('click', () => {
    audioReady();
    const room = roomInput.value.trim().toUpperCase();
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
  function showBossIntro(stage, boss, isEx) {
    introShownForStage = isEx ? 'EX' : stage;
    if (isEx) {
      bossIntroOverlay.style.setProperty('--boss-color', '#ffe9a8');
      bossIntroStage.textContent = 'EX';
      bossIntroPortrait.src = EX_BOSS_SIGIL_SRC;
      bossIntroPortrait.style.objectPosition = 'center';
    } else {
      const theme = BOSS_TIER_THEME[Math.min(Math.max(1, stage), BOSS_TIER_THEME.length) - 1];
      bossIntroOverlay.style.setProperty('--boss-color', theme.uniform);
      bossIntroStage.textContent = `第${stage}面`;
      bossIntroPortrait.src = theme.image;
      bossIntroPortrait.style.objectPosition = theme.facePos;
    }
    bossIntroName.textContent = boss.name;
    bossIntroLine.textContent = boss.line ? `「${boss.line}」` : '';
    bossIntroOverlay.classList.remove('hidden');
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
    waveIntroStage.textContent = `第${index}面 突破イベント`;
    waveIntroTitle.textContent = '⚔️ ザコモンスター襲来！';
    waveIntroLine.textContent = MOB_WAVE_NARRATION[i];
    waveIntroOverlay.classList.remove('hidden');
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
  // updateHud() defers showing rematchBtn (for the stageAdvance case only) until this overlay
  // hides itself, so there's no separate ready-flag to keep in sync with this timer.
  function showBossDefeat(stage, boss) {
    const theme = BOSS_TIER_THEME[Math.min(Math.max(1, stage), BOSS_TIER_THEME.length) - 1];
    bossDefeatOverlay.style.setProperty('--boss-color', theme.uniform);
    bossDefeatPortrait.src = theme.image;
    bossDefeatPortrait.style.objectPosition = theme.facePos;
    bossDefeatName.textContent = boss.name;
    bossDefeatLine.textContent = boss.defeatLine ? `「${boss.defeatLine}」` : '';
    bossDefeatOverlay.classList.remove('hidden');
    if (bossDefeatHideTimer) clearTimeout(bossDefeatHideTimer);
    bossDefeatHideTimer = setTimeout(() => {
      bossDefeatOverlay.classList.add('hidden');
      bossDefeatHideTimer = null;
    }, 4500);
  }

  // ---- story mode: a single button starts a fresh 5-stage boss-rush campaign; the same
  // helper is reused by the game-over "retry" button so losing just restarts cleanly with
  // a brand new room rather than needing any server-side "reset to stage 1" round-trip ----
  function startStoryMode() {
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
  storyRetryBtn.addEventListener('click', () => { audioReady(); startStoryMode(); });
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
    connect(room, name, true, roulette, true);
  }
  story2pBtn.addEventListener('click', () => {
    audioReady();
    playSelectSfx();
    storyIntro.classList.add('hidden');
    story2pLobby.classList.remove('hidden');
  });
  story2pBackBtn.addEventListener('click', () => {
    audioReady();
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
    const room = story2pRoomInput.value.trim().toUpperCase();
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
  trueEndingTitleBtn.addEventListener('click', () => { audioReady(); goToTitle(); });

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
    return !!(el && el.closest && el.closest('button'));
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
        const boss = state.players.find((p) => p.isBoss);
        if (boss) showBossIntro(state.storyStage, boss, state.exBossActive);
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
      if (typeof state.storyLevel === 'number') {
        if (state.storyLevel > lastStoryLevel) {
          showLevelUpToast(state.storyLevel);
          if (audio) audio.playLevelUp();
        }
        lastStoryLevel = state.storyLevel;
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
        if (state.rouletteEnabled && state.rouletteResult) {
          runRoulette(state.rouletteResult, state);
        } else {
          rouletteBlock.classList.add('hidden');
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
          if (!state.mobWaveActive) recordBossDefeated(storyStage, !!state.storyCoop);
          if (state.exBossActive) recordExBossDefeated();
          // The "勝利！！" flash always plays first, before anything stage-specific — its own
          // fanfare sfx overrides the plain playWin() played just above for this same
          // 'finished' transition (both fire, but the fanfare is the one that's actually
          // audible/felt here; playWin() still matters for non-boss round wins, e.g. mid-
          // series rounds against a story boss that don't reach matchOver, or a human-vs-
          // human arena win, neither of which reach this branch at all).
          if (audio) audio.playBossVictory();
          // storyStage < storyStageCount here means there's a next stage to advance to —
          // storyStageCount reflects the freshly-received state, same as everywhere else.
          // Never true for the EX fight (storyStage stays frozen at 5 === storyStageCount
          // throughout it), so this naturally skips the "before advancing" defeat-line pause
          // for the EX win — that ending gets its own dedicated overlay instead (see
          // trueEndingClear in updateHud()), not a "next stage" pause with nothing to advance to.
          // Chained through showBossVictory's onDone rather than fired in parallel, so the
          // two dramatic pauses play out one after another, not stacked/racing.
          showBossVictory(() => {
            if (!state.mobWaveActive && storyStage < storyStageCount) {
              const boss = state.players.find((p) => p.isBoss);
              if (boss) showBossDefeat(storyStage, boss);
            }
          });
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
        const color = sideColor(owner, '#9dbaff', '#7dffb0', '#ffd35b');
        spawnParticles(b.x, b.y, 5, color, 90, 0.22, 4);
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
      const color = sideColor(swingOwner, '77,120,217', '63,179,110', '201,82,74');
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
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 5) {
        particles.push({
          x: p.x, y: p.y, vx: 0, vy: 0,
          life: 0.3, maxLife: 0.3,
          color: sideColor(p, 'rgba(91,140,255,0.5)', 'rgba(125,255,176,0.5)', 'rgba(255,91,122,0.5)'),
          size: 6,
        });
        trailLast.set(p.id, { x: p.x, y: p.y });
      }
    }
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

  function drawBackground(t) {
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
    const r = b.radius || 5;
    ctx.save();
    ctx.shadowColor = b.big ? '#c9a8ff' : '#ffd35b';
    ctx.shadowBlur = b.big ? 22 : 14;
    ctx.strokeStyle = b.big ? 'rgba(201,168,255,0.6)' : 'rgba(255,211,91,0.55)';
    ctx.lineWidth = Math.max(3, r * 0.8);
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.stroke();
    ctx.fillStyle = b.big ? '#e4d4ff' : '#ffe28a';
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
    const halfArc = Math.PI / 4; // mirrors game.js's SWORD_ARC_HALF_ANGLE
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

  function drawMonster(m, t) {
    const gold = !!m.gold;
    const chicken = !!m.chicken;
    // Wave-mob color tier (white/blue/green/red/gold, see game.js's MOB_WAVE_COLOR_STATS) —
    // a visual readout of that mob's rolled speed/damage strength, distinct from the
    // ambient-monster gold/chicken variants above (which only ever occur outside a wave).
    const waveTheme = m.wave ? (WAVE_COLOR_THEME[m.waveColor] || WAVE_COLOR_THEME.blue) : null;
    const radius = chicken ? GOLDEN_CHICKEN_RADIUS_VISUAL : gold ? GOLD_MONSTER_RADIUS_VISUAL : MONSTER_RADIUS_VISUAL;
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
    ctx.font = `${chicken ? 22 : gold ? 24 : 20}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(chicken ? '🐔' : '🧟', 0, 1);
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
    const isCoop = !!(latestState && latestState.storyCoop);
    const isAlly = !isMe && !isBoss && isCpuMatch;
    const tier = isBoss && isCpuMatch ? Math.min(Math.max(1, storyStage), BOSS_TIER_THEME.length) : 0;
    const theme = tier > 0 ? BOSS_TIER_THEME[tier - 1] : null;
    // In 2P co-op specifically, the boss is forced to a fixed enemy-red instead of its
    // per-stage BOSS_TIER_THEME color — some stages' tier colors (stage1's muted olive in
    // particular) read too close to the ally's green, undermining the clean 3-way me/ally/
    // boss split this mode needs. 1P story keeps the per-stage tier color as before (no
    // ally to be confused with there). Scale/glow escalation still always comes from the
    // theme regardless — only the color itself is overridden.
    const themeColor = isBoss && isCoop ? '#c9524a' : (theme ? theme.uniform : null);
    const uniform = themeColor || (isMe ? '#4d78d9' : isAlly ? '#3fb36e' : '#c9524a');
    const uniformDark = themeColor ? shadeColor(themeColor, 0.45) : (isMe ? '#2b4a94' : isAlly ? '#1f6b40' : '#8a2e2a');
    const helmet = themeColor ? shadeColor(themeColor, 0.28) : (isMe ? '#25396b' : isAlly ? '#164f2f' : '#5c211e');
    const scale = theme ? [1, 1.06, 1.12, 1.18, 1.26][tier - 1] : 1;
    const glowBlur = theme ? [14, 17, 20, 24, 30][tier - 1] : 14;

    if (p.hp <= 0 && !p.alive) {
      // fallen soldier: prone silhouette, no glow
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
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

    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 4, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (scale !== 1) ctx.scale(scale, scale);
    ctx.shadowColor = uniform;
    ctx.shadowBlur = glowBlur;

    // boots (trailing behind facing direction)
    ctx.fillStyle = uniformDark;
    ctx.beginPath();
    ctx.ellipse(-7, -5, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-7, 5, 4.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // torso
    ctx.fillStyle = uniform;
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = uniformDark;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // rifle
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#2a2a28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(3, -2);
    ctx.lineTo(23, -1);
    ctx.stroke();
    ctx.fillStyle = '#1a1a18';
    ctx.fillRect(19, -3, 6, 3);

    // helmeted head, offset toward facing direction
    ctx.fillStyle = helmet;
    ctx.beginPath();
    ctx.arc(6, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(4.5, -1.8, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Boss aura: escalating ring count (1 at tier3 up to 3 at tier5) — the visual "this
    // one's dangerous" cue that plain color/scale alone doesn't convey as clearly.
    if (tier >= 3) {
      ctx.save();
      ctx.translate(p.x, p.y);
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
    ctx.fillText(p.name, p.x, p.y - 26 - tier * 1.5);
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
  function runRoulette(result, state) {
    if (rouletteSpinTimer) {
      clearTimeout(rouletteSpinTimer);
      rouletteSpinTimer = null;
    }
    const winner = state.players.find((p) => p.id === result.winnerId);
    const winnerName = winner ? winner.name : '相手';
    const amIWinner = result.winnerId === myId;
    const who = amIWinner ? 'あなた' : winnerName;

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

  // fillEl always represents the un-leveled base 0-100 hp on the bg track's normal 100%-width
  // scale, exactly like before story-mode leveling existed. bonusEl (see .hp-bar-bonus in
  // style.css, anchored at left:100% of that same track) extends the bar further right by
  // however much hp exceeds that base 100, on the *same* per-hp scale — so the bar's total
  // rendered length actually grows with a level-up (a level-10 character at full health is
  // visibly ~2x the original track's length) instead of just recoloring part of a fixed-length
  // bar, which didn't read as an actual increase. A player who hasn't leveled (maxHp<=base) or
  // a boss (which never gains story-mode levels) simply never has hp exceed the base, so
  // bonusEl's width collapses to 0 and the display is pixel-identical to the original bar.
  function renderHpBar(fillEl, bonusEl, p) {
    const maxHp = (p && p.maxHp) || STORY_BASE_MAX_HP;
    const hp = Math.max(0, Math.min((p && p.hp) || 0, maxHp));
    const baseHp = Math.min(hp, STORY_BASE_MAX_HP);
    fillEl.style.width = `${(baseHp / STORY_BASE_MAX_HP) * 100}%`;
    if (!bonusEl) return;
    const bonusHp = Math.max(0, hp - STORY_BASE_MAX_HP);
    bonusEl.style.width = `${(bonusHp / STORY_BASE_MAX_HP) * 100}%`;
  }

  function updateHud(state) {
    const me = state.players.find((p) => p.id === myId);
    // "boss" always means the boss specifically (found via isBoss, not "not me") — in co-op
    // mode "not me" would be ambiguous between the boss and my ally. Non-coop modes never
    // have an isBoss player at all outside a CPU match, so this correctly falls back to "the
    // other human" there via the isBoss-less arena-mode player objects (isBoss is simply
    // undefined on them, and .find(p=>p.isBoss) only ever matches the CPU token).
    const isCoop = !!state.storyCoop;
    const boss = isCoop ? state.players.find((p) => p.isBoss) : state.players.find((p) => p.id !== myId);
    const ally = isCoop ? state.players.find((p) => p.id !== myId && !p.isBoss) : null;
    // Top row is reserved for the two human players in co-op (per explicit request) — the
    // top-right slot shows the ally there instead of the boss, and the boss's bar moves to
    // the bottom row (allyHpBlock, repurposed — see index.html's comment on it).
    const topRight = isCoop ? ally : boss;

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
      nameTheirs.textContent = isCoop ? '仲間を待っています…' : '相手を待っています…';
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
    renderBuffBadges(buffMine, me);
    renderBuffBadges(buffTheirs, topRight);

    // allyHpBlock shows the boss in co-op (see index.html's comment on it) — hidden outside
    // co-op as before, and now also hidden during a wave for the same reason as hpBlockTheirs.
    allyHpBlock.classList.toggle('hidden', !isCoop || !!state.mobWaveActive);
    if (isCoop) {
      if (boss) {
        nameAlly.textContent = state.mobWaveActive ? 'ザコモンスター討伐中…' : boss.name;
        renderHpBar(hpAlly, hpBonusAlly, boss);
        hpAlly.classList.toggle('house-healing', boss.hp < (boss.maxHp || 100) && isInsideAnyHouse(boss.x, boss.y));
      } else {
        nameAlly.textContent = '敵を待っています…';
        hpAlly.style.width = '100%';
        hpBonusAlly.style.width = '0%';
      }
      renderBuffBadges(buffAlly, boss);
    }

    const wins = state.matchWins || {};
    // Co-op: room.matchWins is keyed by a single stable representative id per side (see
    // game.js's win-condition comment) — could be either ally's id, so sum across both
    // rather than reading myId/boss.id directly (only one of the two ever holds a nonzero
    // value, so summing is safe and doesn't need to know which one it is).
    const myWins = isCoop
      ? state.players.filter((p) => !p.isBoss).reduce((sum, p) => sum + (wins[p.id] || 0), 0)
      : me ? wins[me.id] || 0 : 0;
    const oppWins = boss ? wins[boss.id] || 0 : 0;
    matchScoreEl.textContent = `${myWins} - ${oppWins}`;
    // The mob-wave mini-game isn't part of the best-of-MATCH_WIN_TARGET series at all (see
    // game.js's mobWaveActive win-check, which deliberately never touches room.matchWins) —
    // showing a "N - N" score during it would misleadingly suggest the wave counts toward
    // that tally, so hide the badge for the duration instead.
    matchScoreEl.classList.toggle('hidden', !!state.mobWaveActive);
    if (isCpuMatch) {
      storyStageLabel.textContent = `第${storyStage}面 / 全${storyStageCount}面`;
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
    if (isCpuMatch && typeof state.storyLevel === 'number') {
      levelLabel.textContent = `⭐ Lv.${state.storyLevel}`;
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
        gameOverOverlay.classList.remove('hidden');
        // Only reveal the retry button once the dramatic-pause timer (started once, on the
        // 'finished' phase-transition edge above) has actually elapsed — this branch itself
        // re-runs on every ~33ms broadcast while sitting in 'finished', so it must keep
        // deferring to that flag rather than unhiding the button unconditionally every tick.
        if (gameOverRetryReady) storyRetryBtn.classList.remove('hidden');
      } else if (trueEndingClear) {
        // Same "wait for the victory flash to auto-hide" deferral as the stage-clear branch
        // below — the true ending shouldn't appear stacked underneath/racing the flash.
        if (bossVictoryOverlay.classList.contains('hidden')) trueEndingOverlay.classList.remove('hidden');
      } else if (finalStageClear) {
        if (bossVictoryOverlay.classList.contains('hidden')) storyEndingOverlay.classList.remove('hidden');
      } else if (waveCleared) {
        // No boss-defeat-quote card plays for a wave-clear (see handleState's guard), so this
        // only needs to wait on the "勝利！！" flash itself, not bossDefeatOverlay too.
        if (bossVictoryOverlay.classList.contains('hidden')) rematchBtn.classList.remove('hidden');
        rematchBtn.textContent = 'ボスへ進む';
      } else {
        // For a stage-clear specifically, keep rematchBtn hidden until both the "勝利！！"
        // flash AND (chained after it) the boss's defeat line (see showBossDefeat) have each
        // finished their own dramatic-pause auto-hide — same "defer to a one-time-started
        // timer, re-checked every tick" pattern as gameOverReady above, just read directly
        // off each overlay's own hidden state instead of a separate flag.
        const waitingOnDefeatLine = stageAdvance && (!bossVictoryOverlay.classList.contains('hidden') || !bossDefeatOverlay.classList.contains('hidden'));
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
    spawnTrails();
    draw(now);
    if (latestState) updateHud(latestState);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
