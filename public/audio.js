// Procedural sound engine — everything is synthesized with Web Audio, no audio files needed.
window.GameAudio = (() => {
  let ctx = null;
  let master, sfxGain, bgmGain, titleGain;
  let muted = false;
  let bgmTimer = null;
  let bgmPlaying = false;
  let step = 0;
  let nextNoteTime = 0;

  let titleBgmTimer = null;
  let titleBgmPlaying = false;
  let titleStep = 0;
  let titleNextChordTime = 0;
  let titleNextHowlTime = 0;
  let titleNextDrumTime = 0;

  const TEMPO = 128;
  const stepDur = () => 60 / TEMPO / 2; // 8th notes
  const BASS = [110, 110, 146.83, 110, 130.81, 110, 146.83, 98];
  const ARP = [440, 523.25, 659.25, 523.25];

  function ensureCtx() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.9;
    sfxGain.connect(master);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = 0.32;
    bgmGain.connect(master);
    // Dedicated bus for the title theme only, so stopTitleBgm() can silence it instantly —
    // notes are scheduled up to ~3.5s ahead (see titleBgmScheduler's look-ahead window), so a
    // chord/howl that was already scheduled when stop is called would otherwise keep ringing
    // out its full envelope well after the match starts. Ramping this gain to 0 cuts off
    // whatever's currently sounding immediately, regardless of when each note was scheduled.
    titleGain = ctx.createGain();
    titleGain.gain.value = 1;
    titleGain.connect(bgmGain);
    return ctx;
  }

  function resume() {
    ensureCtx();
    if (ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(v) {
    muted = v;
    if (master) master.gain.value = muted ? 0 : 0.8;
  }
  function toggleMuted() {
    setMuted(!muted);
    return muted;
  }

  function beep(freq, dur, t, vol, type) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noiseBurst(t, dur, vol, filterType, filterFreq, dest) {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(filter).connect(gain).connect(dest);
    noise.start(t);
  }

  function playShoot() {
    ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(760, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.09);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  function playLaser() {
    ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(240, t + 0.2);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.23);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(2200, t);
    osc2.frequency.exponentialRampToValueAtTime(600, t + 0.15);
    gain2.gain.setValueAtTime(0.08, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc2.connect(gain2).connect(sfxGain);
    osc2.start(t);
    osc2.stop(t + 0.17);
  }

  function playHit() {
    ensureCtx();
    noiseBurst(ctx.currentTime, 0.15, 0.5, 'lowpass', 1400, sfxGain);
  }

  function playSword(hit) {
    ensureCtx();
    const t = ctx.currentTime;
    noiseBurst(t, 0.1, hit ? 0.45 : 0.3, 'highpass', 3200, sfxGain);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hit ? 1100 : 900, t);
    osc.frequency.exponentialRampToValueAtTime(hit ? 320 : 260, t + 0.09);
    gain.gain.setValueAtTime(hit ? 0.26 : 0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.11);
  }

  function playExplosion() {
    ensureCtx();
    const t = ctx.currentTime;
    noiseBurst(t, 0.5, 0.6, 'lowpass', 900, sfxGain);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.46);
  }

  function playBlockBreak() {
    ensureCtx();
    const t = ctx.currentTime;
    noiseBurst(t, 0.22, 0.4, 'bandpass', 1800, sfxGain);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.18);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.21);
  }

  function playMonsterDefeat() {
    ensureCtx();
    const t = ctx.currentTime;
    noiseBurst(t, 0.28, 0.35, 'lowpass', 1200, sfxGain);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    gain.gain.setValueAtTime(0.24, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.33);
  }

  function playMonsterAttack() {
    ensureCtx();
    const t = ctx.currentTime;
    noiseBurst(t, 0.18, 0.32, 'bandpass', 900, sfxGain);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  function playBombPlace() {
    ensureCtx();
    const t = ctx.currentTime;
    beep(180, 0.08, t, 0.2, 'square');
    beep(120, 0.1, t + 0.05, 0.16, 'square');
  }

  function playCountdownTick(isGo) {
    ensureCtx();
    beep(isGo ? 880 : 440, isGo ? 0.35 : 0.12, ctx.currentTime, 0.35, 'square');
  }

  function playHouseHealTick() {
    ensureCtx();
    beep(920, 0.05, ctx.currentTime, 0.06, 'sine'); // deliberately much quieter than playPickup — this repeats every ~1.2s while healing, not a one-off jingle
  }

  function playRouletteTick() {
    ensureCtx();
    beep(1000 + Math.random() * 300, 0.04, ctx.currentTime, 0.14, 'square');
  }

  function playRouletteMiss() {
    ensureCtx();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.39);
  }

  const PICKUP_BASE_FREQ = { speed: 660, rapid: 550, power: 480, heal: 740, bomb: 400, shield: 600, swordRange: 520, clone: 580 };

  function playShieldHit() {
    ensureCtx();
    const t = ctx.currentTime;
    noiseBurst(t, 0.12, 0.3, 'bandpass', 2200, sfxGain);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.15);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain).connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.17);
  }

  function playPickup(type) {
    ensureCtx();
    const t = ctx.currentTime;
    const base = PICKUP_BASE_FREQ[type] || 600;
    [0, 1, 2].forEach((i) => beep(base * Math.pow(1.26, i), 0.14, t + i * 0.06, 0.22, 'triangle'));
  }

  function playWin() {
    ensureCtx();
    const t = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => beep(f, 0.5, t + i * 0.11, 0.28, 'triangle'));
  }

  function playLose() {
    ensureCtx();
    const t = ctx.currentTime;
    [392, 349.23, 293.66, 246.94].forEach((f, i) => beep(f, 0.5, t + i * 0.13, 0.25, 'sawtooth'));
  }

  // Bigger, more triumphant fanfare than the plain playWin() jingle used for an ordinary
  // round win — reserved specifically for actually defeating a story-mode boss, which the
  // player explicitly asked to feel more momentous: a low "impact" hit, a rising 6-note run
  // doubled across two timbres (triangle lead + a brighter square layer) for fullness, then
  // a sustained 4-note major chord that rings out under the "勝利！！" card.
  function playBossVictory() {
    ensureCtx();
    const t = ctx.currentTime;
    noiseBurst(t, 0.18, 0.35, 'lowpass', 700, sfxGain);
    beep(90, 0.3, t, 0.4, 'sine');

    const run = [392, 523.25, 659.25, 783.99, 987.77, 1174.66];
    run.forEach((f, i) => {
      const nt = t + 0.15 + i * 0.08;
      beep(f, 0.45, nt, 0.24, 'triangle');
      beep(f, 0.3, nt, 0.1, 'square');
    });

    const chordAt = t + 0.15 + run.length * 0.08 + 0.05;
    [783.99, 987.77, 1174.66, 1567.98].forEach((f) => beep(f, 1.1, chordAt, 0.22, 'triangle'));
  }

  // Story-mode level-up cue — a bright 5-note ascending run, quicker/lighter than
  // playBossVictory's fanfare since this fires mid-combat and shouldn't feel like a big pause.
  function playLevelUp() {
    ensureCtx();
    const t = ctx.currentTime;
    const run = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    run.forEach((f, i) => beep(f, 0.22, t + i * 0.07, 0.26, 'triangle'));
  }

  function scheduleNote(freq, t, dur, type, vol) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(bgmGain);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function bgmScheduler() {
    if (!bgmPlaying) return;
    while (nextNoteTime < ctx.currentTime + 0.15) {
      scheduleNote(BASS[step % BASS.length], nextNoteTime, stepDur() * 0.9, 'sawtooth', 0.16);
      if (step % 2 === 0) noiseBurst(nextNoteTime, 0.03, 0.12, 'highpass', 6000, bgmGain);
      if (step % 4 === 2) scheduleNote(ARP[(step >> 2) % ARP.length], nextNoteTime, stepDur() * 0.5, 'square', 0.08);
      nextNoteTime += stepDur();
      step++;
    }
  }

  function startBgm() {
    ensureCtx();
    resume();
    if (bgmPlaying) return;
    bgmPlaying = true;
    step = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    bgmTimer = setInterval(bgmScheduler, 50);
  }

  function stopBgm() {
    bgmPlaying = false;
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = null;
  }

  // ---- Title-screen theme: slow, moody "戦場の狼達" atmosphere — deliberately built from
  // long sustained tones with slow linear attack/release (not the battle BGM's fast 8th-note
  // pattern) so there's nothing short/percussive enough to read as a glitch or dropout, and
  // a much sparser scheduler interval (chords are seconds apart, not fractions of a beat) so
  // ordinary setInterval jitter is never audible the way it could be on a tight rhythm track.
  // A driving rhythm-layer version of this was tried and reverted per explicit feedback ("前に
  // 戻してください") — back to this pad-only version, just louder (see the boosted vol/gain
  // constants below vs. this theme's original values — bumped ~1.8-2x, title-theme-local only,
  // NOT via bgmGain itself since that node is shared with the in-match battle BGM).
  const TITLE_CHORD_SEC = 3.4;
  const TITLE_CHORDS = [
    [82.41, 130.81, 164.81],  // E2 C3 E3 — dark open voicing
    [73.42, 110.0, 146.83],   // D2 A3 D3 — lower, heavier
    [87.31, 130.81, 174.61],  // F2 C3 F3
    [65.41, 98.0, 130.81],    // C2 G2 C3 — deepest, resolves the phrase
  ];

  function scheduleTitlePad(freq, t, dur, vol) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + dur * 0.4); // slow swell in, no attack click
    gain.gain.linearRampToValueAtTime(vol * 0.75, t + dur * 0.75);
    gain.gain.linearRampToValueAtTime(0, t + dur); // slow fade out, no release click
    osc.connect(filter).connect(gain).connect(titleGain);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  // Distant wolf-howl swell — a slow rising-then-falling pitch bend, tying the ambient theme
  // directly to "戦場の狼達" without leaning on any sample/audio file.
  function scheduleHowl(t) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sine';
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    const base = 420 + Math.random() * 90;
    osc.frequency.setValueAtTime(base * 0.55, t);
    osc.frequency.linearRampToValueAtTime(base, t + 1.1);
    osc.frequency.linearRampToValueAtTime(base * 0.7, t + 3.0);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 1.0);
    gain.gain.linearRampToValueAtTime(0, t + 3.2);
    osc.connect(filter).connect(gain).connect(titleGain);
    osc.start(t);
    osc.stop(t + 3.3);
  }

  // Distant war-drum pulse under the pad, reinforcing "battlefield" tension without competing
  // with the chord pads for attention.
  function scheduleTitleDrum(t) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(70, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.5);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain).connect(titleGain);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  function titleBgmScheduler() {
    if (!titleBgmPlaying) return;
    while (titleNextChordTime < ctx.currentTime + 0.5) {
      const chord = TITLE_CHORDS[titleStep % TITLE_CHORDS.length];
      chord.forEach((f, i) => scheduleTitlePad(f, titleNextChordTime, TITLE_CHORD_SEC * 1.05, 0.18 - i * 0.035));
      titleNextChordTime += TITLE_CHORD_SEC;
      titleStep++;
    }
    if (titleNextDrumTime < ctx.currentTime + 0.5) {
      scheduleTitleDrum(titleNextDrumTime);
      titleNextDrumTime = ctx.currentTime + 6.5 + Math.random() * 3;
    }
    if (titleNextHowlTime < ctx.currentTime + 0.5) {
      scheduleHowl(titleNextHowlTime);
      titleNextHowlTime = ctx.currentTime + 10 + Math.random() * 8;
    }
  }

  function startTitleBgm() {
    ensureCtx();
    resume();
    if (titleBgmPlaying) return;
    titleBgmPlaying = true;
    titleStep = 0;
    titleNextChordTime = ctx.currentTime + 0.2;
    titleNextDrumTime = ctx.currentTime + 3 + Math.random() * 2;
    titleNextHowlTime = ctx.currentTime + 4 + Math.random() * 4;
    // Un-mute the title bus in case a previous stopTitleBgm() ramped it to 0 — without this,
    // restarting after a stop would schedule new notes into a still-silenced bus.
    titleGain.gain.cancelScheduledValues(ctx.currentTime);
    titleGain.gain.setValueAtTime(1, ctx.currentTime);
    titleBgmTimer = setInterval(titleBgmScheduler, 250);
  }

  function stopTitleBgm() {
    titleBgmPlaying = false;
    if (titleBgmTimer) clearInterval(titleBgmTimer);
    titleBgmTimer = null;
    // Hard-cut whatever's currently sounding, not just future scheduling — chords/howls are
    // scheduled up to ~3.5s ahead (see titleBgmScheduler's look-ahead window), so without this
    // a note already in flight when the match starts would keep audibly ringing over the
    // battle BGM for several seconds. Ramping this dedicated bus to 0 silences it immediately
    // regardless of when each individual oscillator was scheduled to start/stop.
    if (ctx && titleGain) {
      const now = ctx.currentTime;
      titleGain.gain.cancelScheduledValues(now);
      titleGain.gain.setValueAtTime(titleGain.gain.value, now);
      titleGain.gain.linearRampToValueAtTime(0, now + 0.08);
    }
  }

  return {
    resume,
    playShoot,
    playLaser,
    playHit,
    playSword,
    playExplosion,
    playBombPlace,
    playMonsterDefeat,
    playMonsterAttack,
    playBlockBreak,
    playShieldHit,
    playPickup,
    playCountdownTick,
    playHouseHealTick,
    playRouletteTick,
    playRouletteMiss,
    playWin,
    playLose,
    playBossVictory,
    playLevelUp,
    startBgm,
    stopBgm,
    startTitleBgm,
    stopTitleBgm,
    toggleMuted,
    setMuted,
    isMuted: () => muted,
  };
})();
