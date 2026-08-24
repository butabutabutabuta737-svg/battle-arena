// Authoritative game/room logic shared by all WebSocket connections.
const WebSocket = require('ws');

const ARENA_W = 800;
// Taller than the original 600 (portrait-ish, matches how phones are actually held) — every
// y-placement in this file already reads ARENA_H symbolically (spawn points, wall/tree/house
// bounds, monster clamping), so this is a clean size-only change with no other constant to
// rescale. ARENA_W stays untouched so horizontal spawn separation / boss preferredRange tuning
// (all X-axis) is unaffected.
const ARENA_H = 1000;
const BASE_PLAYER_SPEED = 220; // px/sec
// Player/boss and ordinary bullets were both scaled up 1.2x per explicit request — hitbox
// included, not just the drawing (client.js's BODY_SCALE carries the matching visual change).
// Every collision, spawn-clamp, dodge-prediction and melee-reach check reads these constants
// rather than hardcoding a size, so the whole simulation follows from these two numbers.
const PLAYER_RADIUS = 19.2; // was 16
const BULLET_SPEED = 480; // px/sec
const BULLET_RADIUS = 6; // was 5
const BASE_FIRE_COOLDOWN_MS = 250;
const MAX_HP = 100;
const BASE_BULLET_DAMAGE = 12;
const TICK_MS = 1000 / 30;
// How long an empty room's code stays reserved after its last player disconnects, before it's
// actually torn down — covers a brief mobile-network drop (WiFi hiccup, tab backgrounded, phone
// locked) while someone sits alone on "waiting for opponent": without this, that room vanished
// the instant the drop happened, so a friend typing in the still-correct-looking room code a few
// seconds later silently created a brand new empty room instead of joining theirs, and both sides
// were stuck waiting forever with no error shown. See the 'close' handler and joinRoom() below.
const EMPTY_ROOM_GRACE_MS = 45000;

// Melee sword attack: short-range, narrow forward cone in the direction the player is
// currently aiming/firing (not a separate independent facing), higher single-hit damage
// than a bullet to reward closing the distance instead of always kiting at range.
const SWORD_RANGE = 70;
const SWORD_ARC_HALF_ANGLE = Math.PI / 4; // 45 deg either side of aim = 90 deg total cone
const SWORD_DAMAGE = Math.round(BASE_BULLET_DAMAGE * 1.5);
const SWORD_COOLDOWN_MS = 450;
const SWORD_RANGE_BUFF_MULT = 1.8; // timed pickup: reach 70 -> 126px while active

const ITEM_RADIUS = 16;
// bomb is weighted heavier than the rest so it shows up noticeably more often; laser is
// weighted lighter so it shows up less often
const ITEM_WEIGHTS = { speed: 1, rapid: 1, power: 1, heal: 1, big: 1, laser: 0.5, bomb: 3, shield: 1, swordRange: 1, clone: 1 };
const ITEM_WEIGHT_TOTAL = Object.values(ITEM_WEIGHTS).reduce((sum, w) => sum + w, 0);
const BUFF_DURATION_MS = 10000;
const ITEM_SPAWN_MIN_MS = 3000;
const ITEM_SPAWN_MAX_MS = 6000;
const DOUBLE_SPAWN_CHANCE = 0.3;
const SPEED_BUFF_MULT = 1.6;
const RAPID_BUFF_DIVISOR = 2.2;
const POWER_BUFF_MULT = 1.7;
const HEAL_AMOUNT = 35;
const BIG_BULLET_MULT = 4.4;
const LASER_COOLDOWN_MS = 500;
const LASER_DAMAGE = 14;
const LASER_RANGE = Math.hypot(ARENA_W, ARENA_H);
const MAX_BOMBS_HELD = 3;
const BOMB_RADIUS = 220;
const BOMB_DAMAGE = 45;
const MATCH_WIN_TARGET = 3; // first to this many round-wins takes the whole match
const HOUSE_MAX_COUNT = 2;
// Scaled 1.2x alongside PLAYER_RADIUS. A house's "opening" side is a whole missing wall, so
// its doorway width is size - 2*HOUSE_WALL_THICKNESS = 44px at the old minimum — against the
// new 38.4px player diameter that left only 5.6px of total clearance to walk through (and to
// move around in once inside, which matters because houses passively heal). Keeping the houses
// at their old size would have made the smallest ones effectively impassable.
const HOUSE_SIZE_MIN = 96; // was 80
const HOUSE_SIZE_MAX = 144; // was 120
const HOUSE_WALL_THICKNESS = 18;
const HOUSE_ITEM_CHANCE = 0.8; // each house independently has an 80% chance of a hidden item at round start
const BLOCK_HP = 20; // ~2 base-damage bullets, or 1 power-buffed shot
const BLOCK_TO_WALL_RATIO = 2; // blocks are ~2x as common as permanent wall pieces (1:2)
const BLOCK_ITEM_DROP_CHANCE = 0.2; // destroying a block has a ~20% chance to drop an item
const RED_BLOCK_CHANCE = 0.1; // ~10% of block pieces are the tougher red variant
const RED_BLOCK_HP_MULT = 2; // 2x a normal block's hp
// red blocks always drop an item on destruction, bypassing BLOCK_ITEM_DROP_CHANCE entirely
const GOLD_BLOCK_CHANCE = 0.03; // ~3% of block pieces are the rarer, much tougher gold variant
const GOLD_BLOCK_HP_MULT = 5; // 5x a normal block's hp
const GOLD_BLOCK_ITEM_COUNT = 3; // drops 3 independently-rolled items on destruction (can repeat a type)
const SHIELD_AMOUNT = 40; // absorbs this much raw damage before breaking, whichever comes first vs. the timer
// Neutral roaming monster: slowly homes in on whichever player is nearest, deals contact
// damage on touch (rate-limited per victim so standing in it doesn't melt them instantly),
// and drops an item on death. Deliberately ignores walls when moving (a real pathfinder
// isn't worth the complexity here, and ghosting through walls avoids the same getting-stuck
// problem already seen with the CPU's own heuristic movement in this densely-obstacled arena).
const MONSTER_MAX_HP = Math.round(MAX_HP / 4); // 25
const MONSTER_RADIUS = 20;
const MONSTER_SPEED = 70; // px/sec — well under BASE_PLAYER_SPEED(220), meant to be outrun
const MONSTER_CONTACT_DAMAGE = 10;
const MONSTER_CONTACT_COOLDOWN_MS = 700;
const MONSTER_MAX_COUNT = 2;
const MONSTER_SPAWN_MIN_MS = 8000;
const MONSTER_SPAWN_MAX_MS = 14000;
// Gold monster: a rare, stronger, faster elite variant of the regular monster, rolled at
// spawn time rather than being a separate spawn timer. On top of the same (boosted) contact
// damage, it also periodically pulses a ranged attack that hits every player within range at
// once — "見境なく" (indiscriminate) — rather than singling one out, unlike contact damage
// which naturally only ever affects whoever happens to be touching it.
const GOLD_MONSTER_CHANCE = 0.06; // "極まれに" — about 1 in 17 spawns
const GOLD_MONSTER_HP_MULT = 3;
const GOLD_MONSTER_SPEED = 150; // faster than the base monster(70), still under a player(220)
const GOLD_MONSTER_CONTACT_DAMAGE_MULT = 1.5;
const GOLD_MONSTER_RADIUS = 26; // slightly bigger, reads as a tougher variant
const GOLD_MONSTER_ATTACK_RANGE = 160;
const GOLD_MONSTER_ATTACK_DAMAGE = 16;
const GOLD_MONSTER_ATTACK_COOLDOWN_MS = 1300;
// Golden chicken: a third, mutually-exclusive spawn variant (rolled separately from, and
// before, the aggressive gold roll) — flees whichever player is nearest instead of homing
// in, deals no contact damage at all (purely an evasion target, not a threat), but has the
// same hp as a regular monster ("HPはモンスターと同じ") so it's genuinely killable if
// caught, rewarding the chase with 3 distinct items instead of the usual single drop.
const GOLDEN_CHICKEN_CHANCE = 0.08; // "そこまで高くない" — modest, not "極まれに" rare
const GOLDEN_CHICKEN_SPEED = 160; // faster than the base monster, deliberately hard to run down
const GOLDEN_CHICKEN_RADIUS = 18;
// The gold WAVE tier (the strongest of the five mini-game tiers — see MOB_WAVE_COLOR_STATS) is
// 1.2x the base grunt, per explicit request. Until now every wave grunt was exactly the same
// size and only its colour hinted at the tier; this gives the most dangerous one a silhouette
// cue as well. Distinct from GOLD_MONSTER_RADIUS above, which is the ambient gold monster that
// only spawns OUTSIDE waves.
const GOLD_WAVE_MOB_RADIUS = Math.round(MONSTER_RADIUS * 1.2 * 10) / 10; // 24
const GOLDEN_CHICKEN_ITEM_COUNT = 3;
// Mob wave: a mini-game inserted between story-mode boss fights ("ボス→ミニゲーム→ボス…").
// 10 grunt monsters must be wiped out. Each individual mob rolls a color tier — 白(white,
// weakest) → 青(blue) → 緑(green) → 赤(red) → 金(gold, strongest) — that sets its own
// speed/damage multiplier, so a single wave has real variety rather than every mob being
// identical. The escalation across waves comes from shifting *which tiers are likely*
// (MOB_WAVE_COLOR_WEIGHTS below), not a flat per-wave multiplier — a low-numbered wave can
// still rarely roll a gold mob, but it's mostly white/blue, and vice versa for a late wave.
const MOB_WAVE_COUNT = 10;
const MOB_WAVE_SPAWN_INTERVAL_MS = 550; // staggered arrival, not all 10 at once
const MOB_WAVE_COLOR_STATS = {
  white: { speedMult: 0.85, damageMult: 0.75 },
  blue: { speedMult: 1.0, damageMult: 1.0 },
  green: { speedMult: 1.15, damageMult: 1.2 },
  red: { speedMult: 1.35, damageMult: 1.45 },
  gold: { speedMult: 1.6, damageMult: 1.75 },
};
// Index 0 = wave 1 (right after stage1's boss, easiest) through index 3 = wave 4 (right
// after stage4's boss, hardest) — "低いステージほど弱いザコモンスターが出るように".
const MOB_WAVE_COLOR_WEIGHTS = [
  { white: 45, blue: 35, green: 14, red: 5, gold: 1 },
  { white: 22, blue: 32, green: 26, red: 15, gold: 5 },
  { white: 8, blue: 20, green: 30, red: 28, gold: 14 },
  { white: 3, blue: 10, green: 22, red: 35, gold: 30 },
];
function pickMobWaveColorTier(waveIndex) {
  const weights = MOB_WAVE_COLOR_WEIGHTS[Math.min(Math.max(1, waveIndex), MOB_WAVE_COLOR_WEIGHTS.length) - 1];
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let r = Math.random() * total;
  for (const [tier, w] of Object.entries(weights)) {
    if (r < w) return tier;
    r -= w;
  }
  return 'blue';
}
// Story-mode leveling (story mode only — never touches arena/PvP rooms): every wave-mob or
// boss kill grants XP toward that player's own storyXp, and the level derived from it only grants a
// max-HP bonus — nothing else about the player changes. Two balance knobs, per explicit
// request ("レベルは徐々に上がりにくくなり強い敵ほどキルが高いように"):
//   1. Tougher kills are worth more XP — MOB_WAVE_COLOR_XP scales 1(white)->5(gold) with the
//      same color tier that already drives a wave mob's speed/damage, and bossKillXp(stage)
//      scales 10->30 across the 5 story bosses — so a late-stage gold mob or the final boss
//      is worth noticeably more than an early white grunt, not a flat "1 kill = 1 kill".
//   2. Each level costs progressively more XP than the last (STORY_LEVEL_THRESHOLDS, a +4-per-
//      step arithmetic ramp: 8, 12, 16, ... 40 XP to clear each successive level) rather than
//      a flat kills-per-level, so leveling visibly slows down over a run instead of ticking by
//      at a constant rate.
// The two together were tuned so a flawless full 1P clear (10 mobs/wave across the expected
// color-weight mix per wave, +5 scaled boss kills) still lands almost exactly on the level cap
// by the last boss — same "最終面でレベル10くらい" pacing as before, just via a curve that
// actually slows down and rewards harder kills more, instead of a flat linear count.
const STORY_LEVEL_CAP = 10;
const STORY_LEVEL_THRESHOLDS = [0, 8, 20, 36, 56, 80, 108, 140, 176, 216]; // cumulative XP to REACH level i+1 (index0 = level1's free 0-XP threshold)
const MOB_WAVE_COLOR_XP = { white: 1, blue: 2, green: 3, red: 4, gold: 5 };
function bossKillXp(stage) {
  const s = Math.min(Math.max(1, stage || 1), STORY_BOSSES.length);
  return 10 + (s - 1) * 5; // stage1=10 ... stage5=30
}
// Per explicit request, clean and exact: level1=100, level2=110, level3=120, ... +10 per level,
// so level10=190. (An earlier version of this asked for "200 at level10" too, which doesn't
// mathematically fit alongside "level1=100, +10/level" over only 10 levels — clarified in favor
// of the exact level1=100/level2=110/level3=120 sequence given here, so the cap is 190, not 200.)
// Expressed as a *mult* (not a flat add) since the two call sites already do
// `Math.round(MAX_HP * storyLevelHpMult(level))` — MAX_HP is always 100 in practice, so this
// reduces to exactly `100 + (level-1)*10` either way.
function storyLevelHpMult(level) {
  const l = Math.min(Math.max(1, level), STORY_LEVEL_CAP);
  return (100 + (l - 1) * 10) / 100;
}
// XP and level live on the PLAYER, not the room — per explicit request, 2P co-op levels each
// ally independently ("レベルはプレイヤーごとに表記してレベル向上もわけて") rather than pooling
// every kill into one shared room-wide level. Wave-mob XP goes to whoever actually landed the
// killing blow (see `lastHitById` on the monster); a boss kill is a shared objective and is paid
// to every ally. 1P behaviour is unchanged — one human means one level either way.
function addStoryXp(player, amount) {
  if (!player || player.isBoss) return;
  player.storyXp = (player.storyXp || 0) + amount;
  let level = 1;
  for (let i = 1; i < STORY_LEVEL_THRESHOLDS.length; i++) {
    if (player.storyXp >= STORY_LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  player.storyLevel = Math.min(STORY_LEVEL_CAP, level);
}
function resetStoryProgress(room) {
  for (const pl of room.players.values()) {
    if (pl.isBoss) continue;
    pl.storyLevel = 1;
    pl.storyXp = 0;
  }
}
// Whoever last damaged this monster, if they're still in the room. Monster deaths are collected
// once per tick (rather than at each of the four damage sites), so the killer has to be recorded
// on the monster at damage time for the XP to be attributable at all.
function killerOf(room, m) {
  if (!m.lastHitById) return null;
  return [...room.players.values()].find((pl) => pl.id === m.lastHitById) || null;
}
// Clone: a purely visual, non-collidable decoy offset to the player's side (mirrors the
// existing trees/houses "visual-only, no server-side hitbox" pattern) — it's untargetable
// by construction since bullets/laser/sword/bombs only ever check room.players, never a
// clone position, so no separate invincibility logic is needed for it to be "無敵". It also
// doubles the player's own attack damage while active ("分身も本体に合わせて攻撃する") —
// the clone doesn't actually fire anything itself, this is just how that's expressed
// mechanically without a second real attacking entity.
const CLONE_OFFSET = 45;
const CLONE_ATTACK_MULT = 2;
// Houses passively heal whoever's standing inside their footprint — "少しずつ" (a little
// at a time), a slow trickle rather than a burst, to reward holding the position rather
// than instantly topping someone off.
const HOUSE_HEAL_PER_SEC = 4;

function freshBuffs() {
  return { speed: 0, rapid: 0, power: 0, big: 0, laser: 0, shield: 0, swordRange: 0, clone: 0 };
}

// Applies damage to a player, draining an active shield first — shield is a numeric pool
// (p.shieldAmount) capped by a timer (buffs.shield) just like every other buff, but unlike
// the multiplier buffs it needs to be centralized here since three different attack types
// (bullets, laser, bombs) all need to respect it identically rather than each re-deriving
// "is the shield still up" themselves.
function applyDamage(room, targetWs, p, amount, now) {
  const buffs = room.buffs.get(targetWs);
  let remaining = amount;
  if (buffs && now < buffs.shield && p.shieldAmount > 0) {
    const absorbed = Math.min(p.shieldAmount, remaining);
    p.shieldAmount -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0) {
    p.hp -= remaining;
    if (p.hp <= 0) {
      p.hp = 0;
      p.alive = false;
    }
  }
}

// Shared by live item pickups (tick()'s items filter) and the roulette grant (applied at
// the start of the next round in resetPositions()) — both just need "give player p the
// effect of item type X right now," so the heal/bomb/shield special-casing lives in one
// place instead of being duplicated.
function applyItemEffect(room, ws, p, itemType, now) {
  if (itemType === 'heal') {
    p.hp = Math.min(p.maxHp || MAX_HP, p.hp + HEAL_AMOUNT);
  } else if (itemType === 'bomb') {
    p.bombs = Math.min(MAX_BOMBS_HELD, p.bombs + 1);
  } else if (itemType === 'shield') {
    p.shieldAmount = SHIELD_AMOUNT;
    const buffs = room.buffs.get(ws);
    if (buffs) buffs.shield = now + BUFF_DURATION_MS;
  } else {
    const buffs = room.buffs.get(ws);
    if (buffs) buffs[itemType] = now + BUFF_DURATION_MS;
  }
}

function closestPointOnRect(px, py, rect) {
  return {
    x: Math.max(rect.x, Math.min(px, rect.x + rect.w)),
    y: Math.max(rect.y, Math.min(py, rect.y + rect.h)),
  };
}

function circleHitsRect(px, py, radius, rect) {
  const c = closestPointOnRect(px, py, rect);
  const dx = px - c.x;
  const dy = py - c.y;
  return dx * dx + dy * dy < radius * radius;
}

function rectsOverlap(a, b, pad) {
  return !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

// A single straight bar, horizontal or vertical.
function makeBarPiece() {
  const horizontal = Math.random() < 0.5;
  const w = Math.round(horizontal ? rand(70, 140) : rand(16, 24));
  const h = Math.round(horizontal ? rand(16, 24) : rand(70, 140));
  const x = Math.round(rand(150, 340 - w));
  const y = Math.round(rand(50, ARENA_H - 50 - h));
  return [{ x, y, w, h }];
}

// Two bars sharing a corner, forming an L (four possible rotations via vertDir/horizDir),
// as two independent rects — the collision code doesn't need to know they're "one" shape.
function makeLPiece() {
  const thickness = Math.round(rand(16, 24));
  const armV = Math.round(rand(70, 130));
  const armH = Math.round(rand(70, 130));
  const cx = Math.round(rand(170, 340));
  const cy = Math.round(rand(90, ARENA_H - 90));
  const vertDir = Math.random() < 0.5 ? 1 : -1;
  const horizDir = Math.random() < 0.5 ? 1 : -1;
  const vertRect = {
    x: Math.round(cx - thickness / 2),
    y: vertDir === 1 ? cy : cy - armV,
    w: thickness,
    h: armV,
  };
  const horizRect = {
    x: horizDir === 1 ? cx : cx - armH,
    y: Math.round(cy - thickness / 2),
    w: armH,
    h: thickness,
  };
  return [vertRect, horizRect];
}

// A single small destructible square — simpler than wall pieces (no bars/L-shapes),
// matching a "crate" mental model: one hit-box, one health pool, gone when destroyed.
function makeBlockPiece() {
  const size = Math.round(rand(28, 42));
  const x = Math.round(rand(150, 340 - size));
  const y = Math.round(rand(50, ARENA_H - 50 - size));
  return [{ x, y, w: size, h: size }];
}

// Rolls whether this piece is a permanent wall (bar or L-shape) or a destructible block.
// BLOCK_TO_WALL_RATIO=2 means blocks come up roughly twice as often as walls (1:2).
function makePiece() {
  const isBlock = Math.random() < BLOCK_TO_WALL_RATIO / (BLOCK_TO_WALL_RATIO + 1);
  if (isBlock) return { destructible: true, rects: makeBlockPiece() };
  return { destructible: false, rects: Math.random() < 0.45 ? makeLPiece() : makeBarPiece() };
}

// Two spawn points (arena vs 1P-story vs EX) or three (the new 2-human co-op story mode —
// both allies clustered on the left, the boss alone on the right, so idx 0/1/2 in Map
// insertion order — ally1/ally2/boss, since the CPU is always added last in that flow —
// lines up directly with this array with no isBoss special-casing needed anywhere it's used).
function getSpawnPoints(room) {
  if (room && room.storyCoop) {
    return [
      { x: 120, y: ARENA_H / 2 - 100 },
      { x: 120, y: ARENA_H / 2 + 100 },
      { x: ARENA_W - 120, y: ARENA_H / 2 },
    ];
  }
  return [
    { x: 120, y: ARENA_H / 2 },
    { x: ARENA_W - 120, y: ARENA_H / 2 },
  ];
}

// Generates a fresh, symmetric layout of permanent walls (bars/L-shapes) and destructible
// blocks (roughly 1 wall : 2 blocks) — left-half pieces are mirrored to the right half so
// neither spawn side gets an advantage. Sometimes returns no obstacles at all. Blocks and
// walls share one placement pass (and one overlap-avoidance check against each other)
// since they need to avoid each other regardless of type, but are returned as two
// separate lists: permanent `walls` (immutable this round) and destructible `blocks`
// (each carries its own `hp`, mutated/removed as it takes damage during play).
function generateWallsAndBlocks(room) {
  if (Math.random() < 0.03) return { walls: [], blocks: [] };

  const spawnPoints = getSpawnPoints(room);
  const spawnBuffer = 95;

  // 12-18 (was 6-9, doubled per explicit request once the arena itself got taller/bigger —
  // see ARENA_H — so the same piece count no longer filled the extra space) mirrored pieces
  // total (walls+blocks), split via makePiece()'s fixed BLOCK_TO_WALL_RATIO, so this scales
  // both proportionally rather than just blocks alone.
  const pieceCount = (6 + Math.floor(Math.random() * 4)) * 2;
  const walls = [];
  const blocks = [];
  const allPlaced = [];
  let blockId = 0;
  let placed = 0;
  let attempts = 0;

  while (placed < pieceCount && attempts < 640) {
    attempts++;
    const piece = makePiece();
    const rects = piece.rects;

    // 376, not 380: left-half pieces are mirrored to the right half, so this cap sets the
    // narrowest possible corridor straight up the middle of the arena at ARENA_W - 2*cap. At
    // 380 that corridor is 40px, which left only 1.6px of clearance once the player diameter
    // went from 32 to 38.4 — a squeeze tight enough to read as getting stuck. 376 puts it back
    // to a comfortable ~9.6px, matching the clearance the layout was originally tuned around.
    const inBounds = rects.every(
      (r) => r.x >= 20 && r.x + r.w <= 376 && r.y >= 20 && r.y + r.h <= ARENA_H - 20
    );
    if (!inBounds) continue;

    const mirrored = rects.map((r) => ({ x: ARENA_W - r.x - r.w, y: r.y, w: r.w, h: r.h }));
    const allNew = [...rects, ...mirrored];

    const tooCloseToSpawn = allNew.some((r) =>
      spawnPoints.some((s) => circleHitsRect(s.x, s.y, spawnBuffer, r))
    );
    if (tooCloseToSpawn) continue;

    const overlapsExisting = allNew.some((r) => allPlaced.some((w2) => rectsOverlap(r, w2, 24)));
    if (overlapsExisting) continue;

    if (piece.destructible) {
      // Rolled once per piece (not per rect) so a mirrored left/right pair is either both
      // the same variant or both normal, matching how the pair was placed as a single
      // symmetric piece. A single partitioned roll (not two independent rolls) keeps the
      // two chances exactly as stated — 3% gold, 10% red — rather than 10% of the 97%
      // non-gold remainder.
      const roll = Math.random();
      const isGold = roll < GOLD_BLOCK_CHANCE;
      const isRed = !isGold && roll < GOLD_BLOCK_CHANCE + RED_BLOCK_CHANCE;
      const hp = isGold ? BLOCK_HP * GOLD_BLOCK_HP_MULT : isRed ? BLOCK_HP * RED_BLOCK_HP_MULT : BLOCK_HP;
      for (const r of allNew) blocks.push({ id: blockId++, x: r.x, y: r.y, w: r.w, h: r.h, hp, maxHp: hp, red: isRed, gold: isGold });
    } else {
      walls.push(...allNew);
    }
    allPlaced.push(...allNew);
    placed++;
  }

  return { walls, blocks };
}

// Large decorative trees, scattered anywhere in the arena (no left/right mirroring needed
// since they're purely visual — see below — not a collider, so there's no fairness
// concern to balance). Deliberately overlaps freely with where items can spawn: the whole
// point is that a tree can visually hide a player or item standing under its canopy.
// Client renders canopies on top of everything else; there is no server-side collision or
// line-of-sight system involved — a tree hides something from the human eye on screen,
// not from the other player's game state, which is broadcast in full either way.
function generateTrees(walls, blocks, room) {
  const spawnPoints = getSpawnPoints(room);
  const count = 3 + Math.floor(Math.random() * 3); // 3-5 trees
  const trees = [];
  let attempts = 0;

  while (trees.length < count && attempts < 200) {
    attempts++;
    const r = Math.round(rand(38, 60));
    const x = Math.round(rand(r + 20, ARENA_W - r - 20));
    const y = Math.round(rand(r + 20, ARENA_H - r - 20));

    const tooCloseToSpawn = spawnPoints.some((s) => Math.hypot(s.x - x, s.y - y) < 90 + r);
    if (tooCloseToSpawn) continue;

    const overlapsWall = walls.some((w) => circleHitsRect(x, y, r, w));
    if (overlapsWall) continue;

    const overlapsBlock = blocks.some((b) => circleHitsRect(x, y, r, b));
    if (overlapsBlock) continue;

    const overlapsTree = trees.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r + 20);
    if (overlapsTree) continue;

    trees.push({ id: trees.length, x, y, r });
  }

  return trees;
}

// A "house": 3 solid wall segments forming a square footprint with exactly one side left
// open as the only way in — unlike trees (which are purely visual, no collision at all),
// a house's 3 walls are real colliders. They're built as ordinary rects and pushed
// straight into the room's normal `walls` array, so the existing wall collision/rendering
// code handles them automatically with zero special-casing — a house is just 3 walls that
// happen to be arranged in a U. Only the 4th (open) side and the house's overall
// footprint/opening direction are tracked separately, purely so the client can draw a
// clear entrance marker there.
function makeHouseWallRects(x, y, size, thickness, opening) {
  const top = { x, y, w: size, h: thickness };
  const bottom = { x, y: y + size - thickness, w: size, h: thickness };
  const left = { x, y, w: thickness, h: size };
  const right = { x: x + size - thickness, y, w: thickness, h: size };
  const rects = [];
  if (opening !== 'up') rects.push(top);
  if (opening !== 'down') rects.push(bottom);
  if (opening !== 'left') rects.push(left);
  if (opening !== 'right') rects.push(right);
  return rects;
}

// Mutates `walls` in place (appending each house's 3 wall segments) and returns the
// house metadata list. At most HOUSE_MAX_COUNT (0, 1, or 2, uniformly) per round.
function generateHouses(walls, trees, blocks, room) {
  const count = Math.floor(Math.random() * (HOUSE_MAX_COUNT + 1));
  const spawnPoints = getSpawnPoints(room);
  const houses = [];
  let attempts = 0;

  while (houses.length < count && attempts < 200) {
    attempts++;
    const size = Math.round(rand(HOUSE_SIZE_MIN, HOUSE_SIZE_MAX));
    const x = Math.round(rand(20, ARENA_W - size - 20));
    const y = Math.round(rand(20, ARENA_H - size - 20));
    const footprint = { x, y, w: size, h: size };

    const tooCloseToSpawn = spawnPoints.some((s) => circleHitsRect(s.x, s.y, 90, footprint));
    if (tooCloseToSpawn) continue;

    const overlapsWall = walls.some((w) => rectsOverlap(footprint, w, 15));
    if (overlapsWall) continue;

    const overlapsBlock = blocks.some((b) => rectsOverlap(footprint, b, 15));
    if (overlapsBlock) continue;

    const overlapsTree = trees.some(
      (t) => Math.hypot(t.x - (x + size / 2), t.y - (y + size / 2)) < t.r + size / 2 + 15
    );
    if (overlapsTree) continue;

    const overlapsHouse = houses.some((h) => rectsOverlap(footprint, { x: h.x, y: h.y, w: h.size, h: h.size }, 30));
    if (overlapsHouse) continue;

    const opening = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)];
    walls.push(...makeHouseWallRects(x, y, size, HOUSE_WALL_THICKNESS, opening));
    houses.push({ id: houses.length, x, y, size, opening, wallThickness: HOUSE_WALL_THICKNESS });
  }

  return houses;
}

// Same footprint bounding-box check tick()'s passive house-healing uses ("close enough to
// 'inside' given walls already keep the player from overlapping the 3 solid sides") — reused
// here so the CPU can tell whether a player (itself or the human) is currently inside a house,
// and if so, which one.
function houseContainingPoint(houses, x, y) {
  for (const house of houses) {
    if (x >= house.x && x <= house.x + house.size && y >= house.y && y <= house.y + house.size) return house;
  }
  return null;
}

// A point just past the doorway (not right at the threshold) so a CPU heading here actually
// steps into the interior rather than stalling at the boundary between the two wall segments
// flanking the opening.
function houseEntrancePoint(house) {
  const margin = 14;
  const cx = house.x + house.size / 2;
  const cy = house.y + house.size / 2;
  if (house.opening === 'up') return { x: cx, y: house.y + margin };
  if (house.opening === 'down') return { x: cx, y: house.y + house.size - margin };
  if (house.opening === 'left') return { x: house.x + margin, y: cy };
  return { x: house.x + house.size - margin, y: cy }; // 'right'
}

function resolveWallCollisions(p, walls) {
  for (const wall of walls) {
    const c = closestPointOnRect(p.x, p.y, wall);
    let dx = p.x - c.x;
    let dy = p.y - c.y;
    let dist = Math.hypot(dx, dy);
    if (dist < PLAYER_RADIUS) {
      if (dist === 0) {
        dx = 1;
        dy = 0;
        dist = 1;
      }
      const push = PLAYER_RADIUS - dist;
      p.x += (dx / dist) * push;
      p.y += (dy / dist) * push;
    }
  }
}

// A clone in play doesn't just boost damage on a single shot anymore — it fires/swings a
// second, independent attack from its own offset position ("分身も本体と共に攻撃" — the
// clone attacks alongside the real body). Each attack function loops over these origins,
// running its normal single-origin logic once per origin, at normal (undoubled) damage —
// landing both is what adds up to double, rather than one shot dealing double on its own.
function attackOrigins(room, ws, p, now) {
  const origins = [{ x: p.x, y: p.y }];
  const buffs = room.buffs.get(ws);
  if (buffs && now < buffs.clone) {
    const offAngle = p.angle + Math.PI / 2;
    origins.push({ x: p.x + Math.cos(offAngle) * CLONE_OFFSET, y: p.y + Math.sin(offAngle) * CLONE_OFFSET });
  }
  return origins;
}

// Instant hitscan shot that ignores walls entirely — computes the closest point of
// approach between the ray and the opponent's circle to decide a hit, then reports a
// beam from the origin out to either the hit point or the ray's max range for rendering.
// originX/originY is either the shooter's own position or (if their clone is active) the
// clone's offset position — attemptFire calls this once per attack origin.
function fireLaser(room, shooterWs, shooter, now, originX, originY) {
  const dirX = Math.cos(shooter.angle);
  const dirY = Math.sin(shooter.angle);
  let hitT = LASER_RANGE;
  let hitTarget = null;
  let hitTargetWs = null;
  let hitMonster = null;

  for (const [ows, op] of room.players) {
    if (ows === shooterWs || !op.alive) continue;
    if (room.isCpuMatch && !!shooter.isBoss === !!op.isBoss) continue; // story rooms have sides: never friendly fire
    if (room.mobWaveActive && op.isBoss) continue; // boss is inert/hidden during a wave
    const toX = op.x - originX;
    const toY = op.y - originY;
    const t = toX * dirX + toY * dirY;
    if (t < 0) continue;
    const closestX = originX + dirX * t;
    const closestY = originY + dirY * t;
    const dist = Math.hypot(op.x - closestX, op.y - closestY);
    if (dist <= PLAYER_RADIUS && t < hitT) {
      hitT = t;
      hitTarget = op;
      hitTargetWs = ows;
      hitMonster = null;
    }
  }

  for (const m of room.monsters) {
    if (m.hp <= 0) continue;
    const toX = m.x - originX;
    const toY = m.y - originY;
    const t = toX * dirX + toY * dirY;
    if (t < 0) continue;
    const closestX = originX + dirX * t;
    const closestY = originY + dirY * t;
    const dist = Math.hypot(m.x - closestX, m.y - closestY);
    if (dist <= monsterRadius(m) && t < hitT) {
      hitT = t;
      hitMonster = m;
      hitTarget = null;
      hitTargetWs = null;
    }
  }

  if (hitTarget) {
    const atkMult = isBossWs(room, shooterWs) ? cpuAttackMult(room, shooter) : 1;
    applyDamage(room, hitTargetWs, hitTarget, LASER_DAMAGE * atkMult, now);
  } else if (hitMonster) {
    hitMonster.hp -= LASER_DAMAGE;
    hitMonster.lastHitById = shooter.id;
  }

  room.lasers.push({
    ownerId: shooter.id,
    x1: originX,
    y1: originY,
    x2: originX + dirX * hitT,
    y2: originY + dirY * hitT,
    hit: !!(hitTarget || hitMonster),
  });
}

// Shared by the CPU's continuous-hold-while-inp.shooting tick-loop path and the human
// one-shot 'fireOnce' WS message — both just need "try to fire from p right now,
// respecting cooldown and whichever buffs are active."
function attemptFire(room, ws, p, now) {
  if (!p.alive) return;
  const buffs = room.buffs.get(ws);
  // The final-stage boss (and the hidden EX boss past it, which is meant to be strictly harder
  // and would otherwise end up firing SLOWER than the stage it follows) always shoots at the
  // 連射 powerup's rate, per explicit request — an intrinsic property of those fights rather
  // than a buff they have to pick up off the field. Same "embed it in the shooter, don't grant
  // a timed buff" approach as isExShooter/bigMult just below, and likewise combined rather than
  // overridden: Math.min so a genuinely-held rapid buff on top can never come out slower than
  // this floor. Note the stage-5 boss already had fireChance 1.0 (it always *wants* to shoot),
  // so the cooldown was the only thing actually rate-limiting it.
  const isAlwaysRapidBoss = isBossWs(room, ws) && (room.exBossActive || p.bossIndex >= STORY_BOSSES.length || room.storyStage === STORY_BOSSES.length);
  const rapidCooldown = BASE_FIRE_COOLDOWN_MS / RAPID_BUFF_DIVISOR;
  const fireCooldown = Math.min(
    buffs && now < buffs.rapid ? rapidCooldown : BASE_FIRE_COOLDOWN_MS,
    isAlwaysRapidBoss ? rapidCooldown : Infinity
  );
  const dmgMult = buffs && now < buffs.power ? POWER_BUFF_MULT : 1;
  // The hidden EX boss's own bullets are always the "big" size, per explicit request — not
  // just while it happens to be holding the same timed buff a human would need to pick up.
  // Math.max (not an outright override) so a genuinely-held big buff on top of it doesn't
  // shrink anything back down; in practice the two never stack to more than BIG_BULLET_MULT
  // itself since neither multiplier ever exceeds it, but max is the correct, obviously-safe
  // combination regardless.
  const isExShooter = isBossWs(room, ws) && (room.exBossActive || p.bossIndex === STORY_BOSSES.length + 1);
  const bigMult = Math.max(
    buffs && now < buffs.big ? BIG_BULLET_MULT : 1,
    isExShooter ? BIG_BULLET_MULT : 1
  );
  const laserActive = buffs && now < buffs.laser;
  const atkMult = isBossWs(room, ws) ? cpuAttackMult(room, p) : 1;

  const last = room.lastFire.get(ws) || 0;
  if (laserActive) {
    if (now - last >= LASER_COOLDOWN_MS) {
      room.lastFire.set(ws, now);
      for (const origin of attackOrigins(room, ws, p, now)) {
        fireLaser(room, ws, p, now, origin.x, origin.y);
      }
    }
  } else if (now - last >= fireCooldown) {
    room.lastFire.set(ws, now);
    for (const origin of attackOrigins(room, ws, p, now)) {
      room.bullets.push({
        id: room.bulletId++,
        ownerId: p.id,
        ownerIsBoss: !!p.isBoss, // embedded at creation, not looked up per-tick — see the
          // bullet-vs-player collision loop in tick() for why (bullets outlive the shooter's
          // own live player-object lookup by many ticks, but this is a plain snapshot).
        ownerIsEx: isExShooter, // client-only: picks the rainbow render instead of the plain gold/big-purple bullet look
        x: origin.x + Math.cos(p.angle) * PLAYER_RADIUS,
        y: origin.y + Math.sin(p.angle) * PLAYER_RADIUS,
        vx: Math.cos(p.angle) * BULLET_SPEED,
        vy: Math.sin(p.angle) * BULLET_SPEED,
        damage: BASE_BULLET_DAMAGE * dmgMult * atkMult,
        radius: BULLET_RADIUS * bigMult,
        powered: dmgMult > 1,
        big: bigMult > 1,
      });
    }
  }
}

// Melee counterpart to attemptFire, driven by the same continuous inp.swording flag
// (mirrors inp.shooting) so it's only ever called synchronously from within tick() —
// deliberately no one-shot WS-message path, which sidesteps the explosion-broadcast
// race we hit earlier (see room.explosions' comment): room.swordSwings can safely be
// cleared at the top of tick() every frame since it's only ever populated from inside
// that same tick, never asynchronously between ticks.
function attemptSword(room, ws, p, now) {
  if (!p.alive) return;
  const last = room.lastSword.get(ws) || 0;
  if (now - last < SWORD_COOLDOWN_MS) return;
  room.lastSword.set(ws, now);

  const buffs = room.buffs.get(ws);
  const rangeActive = buffs && now < buffs.swordRange;
  // Stage4's boss (血刃の暗殺者, a sword specialist — see its melee-focused preferredRange
  // tuning elsewhere) always fights at the item's buffed reach, not just while it happens to
  // hold the pickup — per explicit request. room.storyStage stays frozen at its pre-EX value
  // during the EX fight (see EX boss handling elsewhere), so this naturally excludes EX
  // without needing its own separate guard. Covers both 1P and 2P co-op, since both use the
  // same room.storyStage numbering.
  // Keyed off the boss's OWN index, not the stage number: in hard mode the knife specialist is
  // boss 4 fighting on hard STAGE 2, so a stage-number test silently stripped its signature
  // extended reach there. Falls back to the stage for any boss without an index.
  const stage4BossMelee = room.isCpuMatch && p.isBoss && (p.bossIndex ? p.bossIndex === 4 : room.storyStage === 4);
  const range = (rangeActive || stage4BossMelee) ? SWORD_RANGE * SWORD_RANGE_BUFF_MULT : SWORD_RANGE;

  for (const origin of attackOrigins(room, ws, p, now)) {
    let hitTarget = null;
    let hitTargetWs = null;
    for (const [ows, op] of room.players) {
      if (ows === ws || !op.alive) continue;
      if (room.isCpuMatch && !!p.isBoss === !!op.isBoss) continue; // story rooms have sides: never friendly fire
      if (room.mobWaveActive && op.isBoss) continue; // boss is inert/hidden during a wave
      const dx = op.x - origin.x;
      const dy = op.y - origin.y;
      const d = Math.hypot(dx, dy);
      if (d > range + PLAYER_RADIUS) continue;
      let diff = Math.atan2(dy, dx) - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) <= SWORD_ARC_HALF_ANGLE) {
        hitTarget = op;
        hitTargetWs = ows;
        break;
      }
    }

    // Monster and block checks only run if no player was hit, and block only runs if no
    // monster was hit either — same "one swing, one target" model as a bullet (which is
    // likewise consumed by whichever it meets first), with the roaming monster prioritized
    // over static terrain as the more relevant target.
    let hitMonster = null;
    if (!hitTarget) {
      for (const m of room.monsters) {
        if (m.hp <= 0) continue;
        const dx = m.x - origin.x;
        const dy = m.y - origin.y;
        const d = Math.hypot(dx, dy);
        if (d > range + monsterRadius(m)) continue;
        let diff = Math.atan2(dy, dx) - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) <= SWORD_ARC_HALF_ANGLE) {
          hitMonster = m;
          break;
        }
      }
    }

    let hitBlock = null;
    if (!hitTarget && !hitMonster) {
      for (const block of room.blocks) {
        if (block.hp <= 0) continue;
        const cx = block.x + block.w / 2;
        const cy = block.y + block.h / 2;
        const dx = cx - origin.x;
        const dy = cy - origin.y;
        const d = Math.hypot(dx, dy);
        if (d > range + Math.max(block.w, block.h) / 2) continue;
        let diff = Math.atan2(dy, dx) - p.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        if (Math.abs(diff) <= SWORD_ARC_HALF_ANGLE) {
          hitBlock = block;
          break;
        }
      }
    }

    room.swordSwings.push({ ownerId: p.id, x: origin.x, y: origin.y, angle: p.angle, hit: !!(hitTarget || hitMonster || hitBlock), range });
    if (hitTarget) {
      const atkMult = isBossWs(room, ws) ? cpuAttackMult(room, p) * cpuSwordMult(room, p) : 1;
      applyDamage(room, hitTargetWs, hitTarget, SWORD_DAMAGE * atkMult, now);
    } else if (hitMonster) { hitMonster.hp -= SWORD_DAMAGE; hitMonster.lastHitById = p.id; }
    else if (hitBlock) hitBlock.hp -= SWORD_DAMAGE;
  }
}

// Explodes a single placed bomb — everyone within blast radius takes damage, including
// the bomb's own owner if they're still standing close (deliberate risk/reward, not a bug).
// Also instantly destroys any destructible block caught in the blast, regardless of its
// remaining hp — a bomb is a lot more powerful than a single bullet, so no partial damage.
// `opts.sparesOwner` is set by the artillery signature move: that is a strike the boss CALLS IN
// on a position, not a device it walked up and planted, so blowing itself up with it is not the
// same deliberate risk/reward a placed bomb carries.
function explodeBomb(room, bomb, now, opts) {
  // Any of the room's bosses could have placed this, not just the first one — matching on a
  // single cpuPlayer would have made the second hard-mode boss's bombs deal unscaled damage.
  const bombOwnerBoss = room.isCpuMatch ? bossPlayers(room).find((b) => b.id === bomb.ownerId) : null;
  const isCpuBomb = !!bombOwnerBoss;
  for (const [pws, pl] of room.players) {
    if (!pl.alive) continue;
    const isSelf = pl.id === bomb.ownerId;
    // Co-op: a human's own bomb never hurts their ally — but self-damage (isSelf) and the
    // boss's own bomb hitting a human are both untouched, same "deliberate risk/reward for
    // the owner" as always. Only reachable when room.storyCoop, so 1P/arena bomb behavior
    // (where !isCpuBomb just means "a human's bomb" and there's no ally to protect) is
    // completely unaffected.
    if (room.storyCoop && !isSelf && !isCpuBomb && !pl.isBoss) continue;
    // The boss-side mirror of that ally rule: a boss's blast never damages ANOTHER boss. Only
    // reachable in hard mode, where a stage fields two — and it mattered a lot there, because
    // both bosses chase the same player, so the squad leader's called-in artillery landed on
    // its own partner nearly every time (measured: partner 160hp -> 25hp in one fight).
    if (isCpuBomb && pl.isBoss && !isSelf) continue;
    if (isCpuBomb && isSelf && opts && opts.sparesOwner) continue;
    if (room.mobWaveActive && pl.isBoss) continue; // boss is inert/hidden during a wave
    const d = Math.hypot(pl.x - bomb.x, pl.y - bomb.y);
    if (d < BOMB_RADIUS + PLAYER_RADIUS) {
      // Only the boss's outgoing blast against the human is scaled — a boss caught in its
      // own bomb (pws === room.cpuToken) still takes the full hit, same as always.
      const dmg = isCpuBomb && !isBossWs(room, pws) ? BOMB_DAMAGE * cpuAttackMult(room, bombOwnerBoss) : BOMB_DAMAGE;
      applyDamage(room, pws, pl, dmg, now);
    }
  }
  for (const m of room.monsters) {
    if (m.hp <= 0) continue;
    const d = Math.hypot(m.x - bomb.x, m.y - bomb.y);
    if (d < BOMB_RADIUS + monsterRadius(m)) {
      m.hp -= BOMB_DAMAGE; // one-shots a regular monster (exceeds its 25 max hp); a gold
      // monster's boosted hp pool (75) survives a single blast, needing a second hit
      m.lastHitById = bomb.ownerId;
    }
  }
  room.blocks = room.blocks.filter((bl) => {
    const cx = bl.x + bl.w / 2;
    const cy = bl.y + bl.h / 2;
    const destroyed = Math.hypot(cx - bomb.x, cy - bomb.y) < BOMB_RADIUS;
    if (destroyed) dropBlockItems(room, bl, cx, cy);
    return !destroyed;
  });
  room.explosions.push({ x: bomb.x, y: bomb.y, ownerId: bomb.ownerId, radius: BOMB_RADIUS });
}

function placeBombFor(room, p) {
  if (!p.alive || p.bombs <= 0) return;
  p.bombs -= 1;
  room.bombs.push({ id: room.bombId++, ownerId: p.id, x: p.x, y: p.y });
}

function detonateBombsFor(room, p) {
  const mine = room.bombs.filter((b) => b.ownerId === p.id);
  if (mine.length === 0) return;
  room.bombs = room.bombs.filter((b) => b.ownerId !== p.id);
  const now = gnow(room);
  for (const b of mine) explodeBomb(room, b, now);
}

// ---- CPU opponent ----
// A CPU "player" is a plain object used as a Map key everywhere a real WebSocket would
// go (room.players / room.inputs / room.buffs / room.lastFire). Since it's never a real
// WebSocket, `ws.readyState === WebSocket.OPEN` checks in broadcast helpers naturally
// evaluate false for it and skip sending — no special-casing needed there. Its per-tick
// "input" is computed by updateCpuAI() instead of arriving over the wire, then flows
// through the exact same movement/shooting/item/wall code every other player uses.
// Story mode replaces the old イージー/ノーマル/ハード difficulty picker entirely — a CPU
// match is now always a 5-stage boss-rush campaign, each stage a named boss with AI
// parameters interpolated from (and stretching a bit beyond, for stage 5) the old
// easy→hard range. Winning a stage's best-of-3 advances room.storyStage; there is no
// standalone "difficulty" concept left anywhere in the server.
// atkMult scales down the boss's own outgoing damage (bullets/laser/sword/bombs it deals
// to the human) only — it does not touch the boss's AI aggressiveness (reactionMs/fireChance/
// etc. above) or how much damage the boss itself takes. Stage 1-2 are deliberately softened
// (50%/75%) per an explicit user request that the early stages go easier on a new player;
// stage 3 onward is unscaled (100% = the bullet/sword/laser/bomb damage constants as-is).
// swordMult additionally scales *only* the boss's sword-vs-player hits, stacking on top of
// atkMult — used to give stage 4's boss ("血刃の暗殺者", a knife specialist) a real
// mechanical edge in melee specifically, not just flavor text; every other boss leaves it at 1.
const STORY_BOSSES = [
  { name: '見習い兵士', line: '容赦はしない。この戦場で、貴様を叩き潰してやる!', defeatLine: 'ば……馬鹿な……この俺が……こんな所で……!', reactionMs: 620, aimJitter: 0.68, fireChance: 0.40, dodgeChance: 0.08, itemSeekChance: 0.25, preferredRange: 270, moveJitter: 0.62, atkMult: 0.5, swordMult: 1.0 },
  { name: '歴戦の傭兵', line: 'ここまで来たとは大したものだ。だが、俺がここで止めてやる。', defeatLine: 'ちっ……まだ甘かったか。だが、この先で待つ者たちは、こんなものじゃないぞ。', reactionMs: 460, aimJitter: 0.48, fireChance: 0.60, dodgeChance: 0.28, itemSeekChance: 0.42, preferredRange: 250, moveJitter: 0.42, atkMult: 0.75, swordMult: 1.0 },
  { name: '精鋭部隊長', line: '前線に立つには…まだ早い。ここで終わらせてやろう。', defeatLine: '……見事だ。だが俺はまだ、本隊を守る壁の一枚に過ぎん。この先、後悔するなよ。', reactionMs: 320, aimJitter: 0.30, fireChance: 0.78, dodgeChance: 0.48, itemSeekChance: 0.60, preferredRange: 233, moveJitter: 0.28, atkMult: 1.0, swordMult: 1.0 },
  // preferredRange dropped to well inside melee reach (SWORD_RANGE+PLAYER_RADIUS=86) — every
  // other boss's preferredRange keeps it at ranged/kiting distance, but this one is a sword
  // specialist (already had the highest swordMult) and should actually fight like one: the
  // existing "close in / back off / strafe" movement logic in updateCpuAI aims to sit at
  // preferredRange, so setting it to melee range makes swording (not shooting) the boss's
  // default state, per explicit request. inp.shooting is already unconditionally suppressed
  // whenever inp.swording is true (see updateCpuAI's `inp.shooting = st.firing && !inp.swording`),
  // so gunfire naturally only happens while still closing the distance or briefly repositioned
  // by a dodge — "必要な時は銃撃も" — with zero extra logic needed beyond this one number.
  { name: '血刃の暗殺者', line: '無駄な足掻きだ。闇に潜むこの一振りが、貴様の命を刈り取る。', defeatLine: 'くっ……この闇より深い一撃とはな。だが、あの御方の前ではまだ児戯に等しい。', reactionMs: 200, aimJitter: 0.16, fireChance: 0.90, dodgeChance: 0.68, itemSeekChance: 0.78, preferredRange: 60, moveJitter: 0.16, atkMult: 1.0, swordMult: 1.5 },
  { name: '戦場の覇者', line: 'よくぞここまで生き延びた…だがこの戦場に立つ資格があるのは、俺だけだ!', defeatLine: 'ば……馬鹿な……この俺が……戦場の狼に……敗れると……は……。', reactionMs: 100, aimJitter: 0.05, fireChance: 1.00, dodgeChance: 0.92, itemSeekChance: 0.95, preferredRange: 208, moveJitter: 0.06, atkMult: 1.0, swordMult: 1.0 },
];

// Hidden EX boss — deliberately NOT part of STORY_BOSSES (keeps STORY_BOSSES.length === 5
// everywhere it's already used as "how many main stages", no renumbering needed). Reachable
// only via the new 'startExStage' message, sent from a dedicated button on the normal-ending
// screen after clearing stage 5 — see room.exBossActive below, which every stage-lookup site
// (updateCpuAI/cpuAttackMult/cpuSwordMult) checks *before* falling back to STORY_BOSSES. Every
// stat here is pushed at or beyond stage 5's own already-maxed values, per explicit request
// for "an absurdly strong one" — most notably atkMult/swordMult go past 1.0, which no main
// boss ever does.
const EX_BOSS = {
  name: '戦神',
  line: '……５つの影を退けたか。人間にしては、大したものだ。だが貴様が本当に挑むべき相手は、まだ姿を見せていない。この戦場そのものを生み出した力——それが、俺だ。ここで終わりにしてやろう。',
  defeatLine: 'ば……馬鹿な……この戦場を生み出し、支配してきたこの俺が……ただの一介の戦士に……敗れるというのか……。……いいだろう。今この瞬間から、この戦場に刻まれる伝説は、貴様のものだ——真の「戦場の狼」よ。',
  reactionMs: 40, aimJitter: 0.02, fireChance: 1.0, dodgeChance: 1.0, itemSeekChance: 1.0,
  preferredRange: 200, moveJitter: 0.03, atkMult: 1.35, swordMult: 1.35,
};

// Boss max HP by stage, per explicit request — a flat +20/stage curve shared by 1P AND 2P
// co-op alike (1P bosses previously had no HP scaling at all, always a flat MAX_HP regardless
// of stage; 2P co-op previously used a separate hpMult curve on top of MAX_HP — both replaced
// by this single absolute-HP table). Index 0-4 = stages 1-5; the hidden EX boss (stage "6")
// isn't part of this array since it's not counted in STORY_BOSSES.length anywhere — see
// EX_BOSS_HP below and its own application in the 'startExStage' handler.
const STORY_BOSS_HP = [100, 120, 140, 160, 180];
const EX_BOSS_HP = 200;

// ---- 2-player co-op story mode ----
// Same 5 named bosses/story text as 1P (name/line/defeatLine reused verbatim from
// STORY_BOSSES so the certificate/narrative stay unified — this is the same campaign, not a
// different one), but with freshly-designed AI behavior for facing 2 humans at once instead
// of 1: somewhat sharper reflexes/evasion than the 1P curve at the same stage number,
// reflecting "juggling two attackers demands it." HP no longer differs from 1P at all (see
// STORY_BOSS_HP above) — evasion/reaction speed are the levers for "harder because there are
// two of you" now, not a bigger health pool. atkMult/swordMult are deliberately NOT overridden
// here either (inherited as-is from STORY_BOSSES via the spread below) — per-hit damage
// against any one ally doesn't need to go up just because there's a second ally elsewhere.
const STORY_BOSSES_2P_TUNING = [
  { reactionMs: 520, aimJitter: 0.58, fireChance: 0.45, dodgeChance: 0.18, itemSeekChance: 0.25, preferredRange: 280, moveJitter: 0.55 },
  { reactionMs: 380, aimJitter: 0.40, fireChance: 0.65, dodgeChance: 0.38, itemSeekChance: 0.42, preferredRange: 260, moveJitter: 0.38 },
  { reactionMs: 260, aimJitter: 0.26, fireChance: 0.82, dodgeChance: 0.58, itemSeekChance: 0.60, preferredRange: 240, moveJitter: 0.25 },
  { reactionMs: 170, aimJitter: 0.14, fireChance: 0.92, dodgeChance: 0.76, itemSeekChance: 0.78, preferredRange: 65, moveJitter: 0.14 }, // same melee-focus override as the 1P STORY_BOSSES entry — this table overrides preferredRange too, so it needed its own change
  { reactionMs: 85, aimJitter: 0.04, fireChance: 1.00, dodgeChance: 0.95, itemSeekChance: 0.95, preferredRange: 214, moveJitter: 0.05 },
];
const STORY_BOSSES_2P = STORY_BOSSES.map((b, i) => ({ ...b, ...STORY_BOSSES_2P_TUNING[i] }));

function bossNameForStage(stage) {
  const s = Math.min(Math.max(1, stage || 1), STORY_BOSSES.length);
  return `${s}面ボス「${STORY_BOSSES[s - 1].name}」`;
}

// ---- Hard mode ----------------------------------------------------------------------------
// Unlocked once the player has beaten the hidden EX boss (the client gates the button on its
// own localStorage record and passes ?hard=1; the server just honours the flag). Three stages,
// each a SIMULTANEOUS two-boss fight, at each boss's normal HP — no scaling, per explicit
// request, so a hard stage is roughly double the health and double the incoming fire.
// Boss index 1-5 are the numbered STORY_BOSSES; index 6 is the EX boss, which is why every
// lookup below goes through bossSpec() rather than indexing STORY_BOSSES directly.
const HARD_STAGES = [[1, 2], [3, 4], [5, 6]];
const HARD_MOB_WAVE_COUNT = 20; // vs MOB_WAVE_COUNT (10) in the normal campaign, per explicit request
// Hard mode's pre-battle taunts and defeat lines, per explicit request: the bosses you already
// buried have clawed their way back out of hell and paired up to come for you — and the later
// pairings are billed as dream tag-teams, matchups that should never have been possible.
// One line per stage; syncBosses() hands the taunt to the lead boss and the defeat line to the
// partner, so the intro card and the defeat card each read as one scene rather than two halves.
const HARD_STAGE_LINES = [
  '地獄の底で、俺たち二匹は手を取った。――もう一度、貴様を喰い殺すためだけにな。',
  '正面から叩き潰す男と、影から喉を裂く男。決して並び立たぬはずの二人だ。……夢のタッグと呼べ。',
  '戦場を統べた覇者と、戦場を創り出した神。二つの伝説が、いま初めて肩を並べた。これ以上の夢は、どこにも無い。',
];
// Index 2 is deliberately kept for symmetry but is NOT currently shown: clearing the last stage
// jumps straight to the ending screen with no defeat card in between (exactly as the normal
// campaign's stage 5 does), so the final pair's parting words are written into that ending text
// instead — see client.js's finalStageClear branch.
const HARD_STAGE_DEFEAT_LINES = [
  '馬鹿な……地獄から這い上がってなお、二匹がかりで……まだ届かんのか……!',
  'この夢のタッグが……たった一匹の狼に、喰い破られるというのか……!',
  '二つの伝説を束にして、なお超えていったか。……認めよう。真の「戦場の狼」は、貴様だ。',
];
// The whole per-boss identity in one place: index 1-5 from STORY_BOSSES, 6 = the EX boss.
// Used by hard mode (which mixes numbered bosses and the EX boss freely in one fight) and by
// the AI, which now needs each boss's own cfg rather than one room-wide "current stage" cfg.
function bossSpec(index, coop) {
  const i = Math.min(Math.max(1, index || 1), STORY_BOSSES.length + 1);
  if (i === STORY_BOSSES.length + 1) {
    return { index: i, isEx: true, name: EX_BOSS.name, line: EX_BOSS.line, defeatLine: EX_BOSS.defeatLine, hp: EX_BOSS_HP, cfg: EX_BOSS };
  }
  const table = coop ? STORY_BOSSES_2P : STORY_BOSSES;
  return {
    index: i,
    isEx: false,
    name: bossNameForStage(i),
    line: STORY_BOSSES[i - 1].line,
    defeatLine: STORY_BOSSES[i - 1].defeatLine,
    hp: STORY_BOSS_HP[i - 1],
    cfg: table[i - 1],
  };
}
// Which boss indices should be alive right now. Normal mode: exactly one (the current stage, or
// the EX boss once it's active). Hard mode: the pair for the current hard stage.
function bossIndicesFor(room) {
  if (room.hardMode) return HARD_STAGES[Math.min(Math.max(1, room.storyStage || 1), HARD_STAGES.length) - 1];
  if (room.exBossActive) return [STORY_BOSSES.length + 1];
  return [Math.min(Math.max(1, room.storyStage || 1), STORY_BOSSES.length)];
}
function hardStageCount() { return HARD_STAGES.length; }
function mobWaveTarget(room) { return room.hardMode ? HARD_MOB_WAVE_COUNT : MOB_WAVE_COUNT; }
// True for any of the room's boss connections. Replaces the old `ws === room.cpuToken` identity
// test, which silently only ever recognised the FIRST boss once a room could hold two.
function isBossWs(room, ws) {
  return !!room.cpuTokens && room.cpuTokens.includes(ws);
}
function bossPlayers(room) {
  return [...room.players.values()].filter((p) => p.isBoss);
}

// ---- Boss signature moves ------------------------------------------------------------------
// Every boss ran the exact same AI with different numbers, so they were only distinguishable by
// colour and stats. Each now has ONE move of its own, fired below a health threshold on a
// cooldown, built entirely out of primitives that already exist (bullets / the laser / the bomb
// blast / a position change) rather than any new weapon system.
// Fairness: a move never fires instantly. `windupMs` passes first with the move's name published
// on the boss (see specialName/specialUntil in the state), so the player gets a readable warning.
const BOSS_SPECIAL_HP_TRIGGER = 0.6; // only once a boss is under 60% — a desperation move, not an opener
const BOSS_SPECIALS = {
  1: { name: 'がむしゃら乱射', windupMs: 700, cooldownMs: 7000 },
  2: { name: '制圧掃射', windupMs: 750, cooldownMs: 7000 },
  3: { name: '砲撃要請', windupMs: 1000, cooldownMs: 8500 },
  4: { name: '瞬影', windupMs: 600, cooldownMs: 7500 },
  5: { name: '覇王弾幕', windupMs: 850, cooldownMs: 7000 },
  6: { name: '神威', windupMs: 900, cooldownMs: 6500 },
};

// One boss bullet, matching attemptFire()'s own bullet shape so every downstream collision,
// render and XP path treats it identically to an ordinary shot.
function pushBossBullet(room, boss, angle, opts) {
  const o = opts || {};
  const speed = BULLET_SPEED * (o.speedMult || 1);
  room.bullets.push({
    id: room.bulletId++,
    ownerId: boss.id,
    ownerIsBoss: true,
    ownerIsEx: boss.bossIndex === STORY_BOSSES.length + 1,
    x: boss.x + Math.cos(angle) * PLAYER_RADIUS,
    y: boss.y + Math.sin(angle) * PLAYER_RADIUS,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    damage: BASE_BULLET_DAMAGE * (o.damageMult || 1) * cpuAttackMult(room, boss),
    radius: BULLET_RADIUS * (o.bigMult || 1),
    powered: false,
    big: !!o.big,
  });
}

// Runs the actual move. Kept separate from the trigger bookkeeping so each boss's behaviour
// reads as one short, self-contained script.
function fireBossSpecial(room, ws, boss, target, now) {
  const aim = Math.atan2(target.y - boss.y, target.x - boss.x);
  switch (boss.bossIndex) {
    case 1: { // rookie: panicked wide spray — lots of bullets, badly aimed
      for (let i = -4; i <= 4; i++) pushBossBullet(room, boss, aim + i * 0.14, { speedMult: 0.85, damageMult: 0.7 });
      break;
    }
    case 2: { // veteran: a disciplined tight volley
      for (let i = -1; i <= 1; i++) pushBossBullet(room, boss, aim + i * 0.06, { speedMult: 1.15 });
      for (let i = -2; i <= 2; i++) pushBossBullet(room, boss, aim + i * 0.13, { speedMult: 1.0 });
      break;
    }
    case 3: { // squad leader: artillery on the target's position — area denial, not aimed fire
      const spots = [{ dx: 0, dy: 0 }, { dx: -130, dy: -90 }, { dx: 130, dy: 90 }];
      for (const s of spots) {
        explodeBomb(room, { x: target.x + s.dx, y: target.y + s.dy, ownerId: boss.id }, now, { sparesOwner: true });
      }
      break;
    }
    case 4: { // assassin: blink to the target's back and cut
      const behind = aim + Math.PI;
      boss.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, target.x + Math.cos(behind) * 46));
      boss.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, target.y + Math.sin(behind) * 46));
      resolveWallCollisions(boss, room.walls);
      resolveWallCollisions(boss, room.blocks);
      boss.angle = Math.atan2(target.y - boss.y, target.x - boss.x);
      const inp = room.inputs.get(ws);
      if (inp) inp.angle = boss.angle;
      room.lastSword.delete(ws); // the blink is the wind-up; don't let a stale cooldown eat the strike
      attemptSword(room, ws, boss, now);
      break;
    }
    case 5: { // conqueror: a full ring, nowhere is safe except the gaps
      for (let i = 0; i < 16; i++) pushBossBullet(room, boss, (i / 16) * Math.PI * 2, { speedMult: 0.9 });
      break;
    }
    default: { // war god: a big rainbow ring plus a lance straight down the aim line
      for (let i = 0; i < 20; i++) pushBossBullet(room, boss, (i / 20) * Math.PI * 2, { speedMult: 0.95, bigMult: BIG_BULLET_MULT, big: true });
      fireLaser(room, ws, boss, now, boss.x, boss.y);
      break;
    }
  }
}

// Trigger bookkeeping: decide whether to start a wind-up, and fire when it elapses.
function updateBossSpecial(room, ws, boss, target, now, st) {
  const spec = BOSS_SPECIALS[boss.bossIndex];
  if (!spec || !boss.alive || !target || !target.alive) return;
  if (st.specialFiresAt) {
    if (now >= st.specialFiresAt) {
      st.specialFiresAt = 0;
      fireBossSpecial(room, ws, boss, target, now);
    }
    return;
  }
  if (boss.hp / (boss.maxHp || MAX_HP) > BOSS_SPECIAL_HP_TRIGGER) return;
  if (now < (st.specialReadyAt || 0)) return;
  st.specialReadyAt = now + spec.cooldownMs;
  st.specialFiresAt = now + spec.windupMs;
  // Published to the client so it can put the move's name on screen for the wind-up — a move
  // that lands with no warning reads as an unfair spike rather than a boss doing something.
  boss.specialName = spec.name;
  boss.specialUntil = now + spec.windupMs;
}
// How many connections a fully-populated room of this type holds: humans + however many bosses
// the current mode fields. Every "is the room full / still intact" test goes through this, since
// the old hardcoded `storyCoop ? 3 : 2` is simply wrong once a stage can field two bosses.
function humanTarget(room) {
  return room.storyCoop ? 2 : 1;
}
function expectedRoomSize(room) {
  if (!room.isCpuMatch) return 2; // arena PvP
  return humanTarget(room) + bossIndicesFor(room).length;
}

// 1 outside story mode (or for the human's own attacks); the current stage boss's atkMult
// when the attacker is the CPU — the single point every CPU-dealt-damage site reads from.
// `bossPlayer` is optional and only matters in hard mode, where two DIFFERENT bosses are alive
// at once and each must hit for its own strength — reading a single room-wide "current stage"
// multiplier there would give both bosses the same (wrong) damage. Normal mode passes nothing
// and keeps the exact previous behaviour.
function cpuAttackMult(room, bossPlayer) {
  if (!room.isCpuMatch) return 1;
  if (bossPlayer && bossPlayer.bossIndex) return bossSpec(bossPlayer.bossIndex, room.storyCoop).cfg.atkMult;
  if (room.exBossActive) return EX_BOSS.atkMult;
  const s = Math.min(Math.max(1, room.storyStage || 1), STORY_BOSSES.length);
  return STORY_BOSSES[s - 1].atkMult;
}

// Same idea as cpuAttackMult but for the sword-specific bonus (stage 4's knife specialist).
function cpuSwordMult(room, bossPlayer) {
  if (!room.isCpuMatch) return 1;
  if (bossPlayer && bossPlayer.bossIndex) return bossSpec(bossPlayer.bossIndex, room.storyCoop).cfg.swordMult;
  if (room.exBossActive) return EX_BOSS.swordMult;
  const s = Math.min(Math.max(1, room.storyStage || 1), STORY_BOSSES.length);
  return STORY_BOSSES[s - 1].swordMult;
}

function bossLineForStage(stage) {
  const s = Math.min(Math.max(1, stage || 1), STORY_BOSSES.length);
  return STORY_BOSSES[s - 1].line;
}

function bossDefeatLineForStage(stage) {
  const s = Math.min(Math.max(1, stage || 1), STORY_BOSSES.length);
  return STORY_BOSSES[s - 1].defeatLine;
}

// Adds ONE boss by its index (1-5 = numbered stage bosses, 6 = the EX boss). `slot` shifts its
// spawn point so a hard-mode pair doesn't stack on the same spot.
function addBossByIndex(room, index, slot) {
  const spec = bossSpec(index, room.storyCoop);
  const cpuToken = { cpu: true };
  const points = getSpawnPoints(room);
  const base = points[points.length - 1] || { x: ARENA_W - 120, y: ARENA_H / 2 };
  const sp = (slot || 0) === 0 ? base : { x: base.x, y: Math.max(90, Math.min(ARENA_H - 90, base.y + (slot % 2 === 1 ? -170 : 170))) };
  const player = {
    id: 'cpu-' + Math.random().toString(36).slice(2, 8),
    name: spec.name,
    line: spec.line,
    defeatLine: spec.defeatLine,
    bossIndex: spec.index, // every per-boss lookup (AI cfg, damage mults, EX-only bullet rules) keys off this
    x: sp.x,
    y: sp.y,
    angle: 0,
    hp: spec.hp,
    maxHp: spec.hp,
    isBoss: true,
    alive: true,
    bombs: 0,
    shieldAmount: 0,
  };
  room.players.set(cpuToken, player);
  room.inputs.set(cpuToken, { up: false, down: false, left: false, right: false, angle: 0, shooting: false, swording: false });
  room.buffs.set(cpuToken, freshBuffs());
  room.cpuTokens.push(cpuToken);
  if (!room.cpuToken) room.cpuToken = cpuToken; // primary boss, kept for the single-boss paths
  room.cpuStates.set(cpuToken, null);
  return cpuToken;
}

// Removes every boss currently in the room. Used whenever the boss line-up has to change (a
// stage transition, a hard-mode pair swap) — rebuilding is far safer than mutating identities
// in place now that a room can hold two of them.
function removeAllBosses(room) {
  for (const token of room.cpuTokens || []) {
    room.players.delete(token);
    room.inputs.delete(token);
    room.lastFire.delete(token);
    room.buffs.delete(token);
    if (room.cpuStates) room.cpuStates.delete(token);
  }
  room.cpuTokens = [];
  room.cpuToken = null;
}

// Rebuilds the room's boss line-up to whatever the current stage calls for (one boss normally,
// a pair in hard mode). Replaces the old "rename the single cpuPlayer in place" approach, which
// cannot express a stage whose boss COUNT differs from the last one's.
function syncBosses(room) {
  removeAllBosses(room);
  const indices = bossIndicesFor(room);
  indices.forEach((idx, i) => addBossByIndex(room, idx, i));
  room.isCpuMatch = true;
  if (room.hardMode) {
    // A hard stage is a PAIR, so its dialogue belongs to the encounter rather than to either
    // boss individually: the lead boss carries the stage's taunt and the partner carries the
    // stage's defeat line, so the intro and the defeat card each read as one scene.
    // BOTH lines go on the lead boss: the client's intro and defeat cards each render
    // `players.find(p => p.isBoss)`, i.e. the first one. Putting the defeat line on the partner
    // instead meant the card fell back to that boss's own numbered-stage line — the stage-1 pair
    // signed off with the rookie's solo "ば……馬鹿な……この俺が……こんな所で……!" instead of
    // the tag-team line, which is exactly what showed up on screen.
    const hs = Math.min(Math.max(1, room.storyStage || 1), HARD_STAGES.length) - 1;
    const lead = bossPlayers(room)[0];
    if (lead) {
      lead.line = HARD_STAGE_LINES[hs];
      lead.defeatLine = HARD_STAGE_DEFEAT_LINES[hs];
    }
  }
}

function addCpuPlayer(room, stage) {
  const s = Math.min(Math.max(1, stage || 1), room.hardMode ? HARD_STAGES.length : STORY_BOSSES.length);
  room.isCpuMatch = true;
  room.storyStage = s;
  syncBosses(room);
  room.pendingStoryIntro = true; // consumed by the next startCountdown() — see its comment
}

// Dispatcher: a room can now hold more than one boss (hard mode's pairs), so each one is
// stepped independently with its own scratch state. Normal mode has exactly one entry here and
// behaves precisely as before.
function updateCpuAI(room, now) {
  for (const token of room.cpuTokens) {
    if (room.storyCoop) updateCpuAICoop(room, now, token);
    else updateCpuAIOne(room, now, token);
  }
}

function updateCpuAIOne(room, now, cpuToken) {
  const cpu = room.players.get(cpuToken);
  const inp = room.inputs.get(cpuToken);
  if (!cpu || !inp) return;
  if (room.mobWaveActive) {
    // Boss stays inert (but present, so existing loss/state machinery keeps working
    // untouched) while the grunt wave mini-game is being fought instead.
    inp.up = inp.down = inp.left = inp.right = false;
    inp.shooting = false;
    inp.swording = false;
    return;
  }
  if (!cpu.alive) {
    inp.up = inp.down = inp.left = inp.right = false;
    inp.shooting = false;
    inp.swording = false;
    return;
  }

  // Explicitly the non-boss player. The previous `p !== cpu` happened to work only because
  // humans join before bosses, so the first non-self entry was the human — with two bosses in
  // the room that is a latent "boss targets its partner" bug waiting on Map ordering.
  const human = [...room.players.values()].find((p) => !p.isBoss);
  if (!human || !human.alive) {
    inp.up = inp.down = inp.left = inp.right = false;
    inp.shooting = false;
    inp.swording = false;
    return;
  }

  // Per-boss cfg (via cpu.bossIndex) rather than one room-wide "current stage" lookup: hard
  // mode has two different bosses alive at once and each must behave as itself.
  const cfg = cpu.bossIndex ? bossSpec(cpu.bossIndex, false).cfg
    : (room.exBossActive ? EX_BOSS : STORY_BOSSES[Math.min(Math.max(1, room.storyStage || 1), STORY_BOSSES.length) - 1]);
  if (!room.cpuStates.get(cpuToken)) {
    room.cpuStates.set(cpuToken, {
      lastDecisionAt: 0,
      targetDx: 0,
      targetDy: 0,
      aimJitterVal: 0,
      firing: false,
      strafeSign: Math.random() < 0.5 ? 1 : -1,
      lastPos: { x: cpu.x, y: cpu.y },
    });
  }
  const st = room.cpuStates.get(cpuToken);
  // Signature move gets first refusal each tick — it can reposition the boss (the assassin's
  // blink), so it must resolve before the normal movement/aim logic below runs for this frame.
  updateBossSpecial(room, cpuToken, cpu, human, now, st);

  if (now - st.lastDecisionAt >= cfg.reactionMs) {
    st.lastDecisionAt = now;
    st.aimJitterVal = (Math.random() * 2 - 1) * cfg.aimJitter;
    st.firing = Math.random() < cfg.fireChance;

    const movedSince = Math.hypot(cpu.x - st.lastPos.x, cpu.y - st.lastPos.y);
    st.lastPos = { x: cpu.x, y: cpu.y };
    const stuck = movedSince < 4;

    if (Math.random() < 0.3) st.strafeSign *= -1;

    const toHumanX = human.x - cpu.x;
    const toHumanY = human.y - cpu.y;
    const dist = Math.hypot(toHumanX, toHumanY) || 1;
    const dirX = toHumanX / dist;
    const dirY = toHumanY / dist;

    let target = null;
    const wantsHeal = cpu.hp < 45;

    // Stage 3+: if the human has retreated into a house to passively heal (see
    // HOUSE_HEAL_PER_SEC in tick()), camping there would otherwise be a free, uncontested
    // "easy mode" — nothing else in this game can reach inside. Route the CPU through the
    // actual doorway instead of just heading straight for the human's raw x/y, since a plain
    // direct-vector chase would just stall against the house's solid walls (this is heuristic
    // movement, not real pathfinding — see updateCpuAI's other movement decisions below).
    // Takes priority over item-seeking below; stops applying once the CPU is inside the same
    // house, at which point the normal chase/kite logic already works fine unobstructed.
    if (room.storyStage >= 3) {
      const humanHouse = houseContainingPoint(room.houses, human.x, human.y);
      if (humanHouse && houseContainingPoint(room.houses, cpu.x, cpu.y) !== humanHouse) {
        target = houseEntrancePoint(humanHouse);
      }
    }

    if (!target) {
      const item = room.items[0];
      if (item && (wantsHeal ? item.type === 'heal' || Math.random() < 0.5 : Math.random() < cfg.itemSeekChance)) {
        target = item;
      }
    }

    let tx, ty;
    if (target) {
      tx = target.x - cpu.x;
      ty = target.y - cpu.y;
    } else if (dist > cfg.preferredRange + 40) {
      tx = dirX;
      ty = dirY;
    } else if (dist < cfg.preferredRange - 40) {
      tx = -dirX;
      ty = -dirY;
    } else {
      tx = -dirY * st.strafeSign;
      ty = dirX * st.strafeSign;
    }

    if (stuck || Math.random() < cfg.moveJitter) {
      const a = Math.random() * Math.PI * 2;
      const jitterStrength = stuck ? 1 : cfg.moveJitter;
      tx += Math.cos(a) * jitterStrength;
      ty += Math.sin(a) * jitterStrength;
    }

    st.targetDx = tx;
    st.targetDy = ty;
  }

  // Dodge check runs every tick (not just on the decision interval) for responsiveness,
  // and overrides the movement decided above when a bullet is on a collision course.
  let dodgeX = 0;
  let dodgeY = 0;
  let dodging = false;
  for (const b of room.bullets) {
    if (b.ownerId === cpu.id) continue;
    const bx = b.x - cpu.x;
    const by = b.y - cpu.y;
    const distNow = Math.hypot(bx, by);
    if (distNow > 140) continue;
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const bvx = b.vx / speed;
    const bvy = b.vy / speed;
    const approach = -(bx * bvx + by * bvy);
    if (approach <= 0) continue;
    const cross = bx * bvy - by * bvx;
    const perpDist = Math.abs(cross);
    if (perpDist < PLAYER_RADIUS + (b.radius || BULLET_RADIUS) + 18 && Math.random() < cfg.dodgeChance) {
      const side = cross >= 0 ? 1 : -1;
      dodgeX += bvy * side;
      dodgeY += -bvx * side;
      dodging = true;
    }
  }

  const moveX = dodging ? dodgeX : st.targetDx;
  const moveY = dodging ? dodgeY : st.targetDy;
  if (Math.hypot(moveX, moveY) > 0.15) {
    inp.left = moveX < -0.25;
    inp.right = moveX > 0.25;
    inp.up = moveY < -0.25;
    inp.down = moveY > 0.25;
  } else {
    inp.left = inp.right = inp.up = inp.down = false;
  }

  inp.angle = Math.atan2(human.y - cpu.y, human.x - cpu.x) + st.aimJitterVal;
  // Sword out-damages a bullet and needs no cooldown/buff bookkeeping, so once the human
  // is already point-blank (aim is already locked onto them above) just prefer it over
  // shooting instead of running a whole separate decision cycle for it. Stage4's boss
  // (always-extended reach — see attemptSword()) needs this threshold extended to match, or
  // it would never actually attempt a swing from beyond the plain SWORD_RANGE despite being
  // able to land one from further out.
  const distToHumanNow = Math.hypot(human.x - cpu.x, human.y - cpu.y);
  // Same per-boss keying as attemptSword's stage4BossMelee — see its comment.
  const swordReach = (cpu.bossIndex ? cpu.bossIndex === 4 : room.storyStage === 4) ? SWORD_RANGE * SWORD_RANGE_BUFF_MULT : SWORD_RANGE;
  inp.swording = distToHumanNow <= swordReach + PLAYER_RADIUS;
  inp.shooting = st.firing && !inp.swording;

  // Stage 1's rookie boss never bothers with bombs. Stage 2+ opportunistically drop one
  // when close enough that it would also catch the human, then — since bombs no longer
  // have an auto-fuse, only the button detonates them — watch its own placed bombs and
  // trigger them once the human actually wanders into blast range.
  if (room.storyStage >= 2) {
    const distToHuman = Math.hypot(human.x - cpu.x, human.y - cpu.y);
    const myPlacedBombs = room.bombs.filter((b) => b.ownerId === cpu.id);
    if (myPlacedBombs.length > 0) {
      const humanInRange = myPlacedBombs.some((b) => Math.hypot(human.x - b.x, human.y - b.y) < BOMB_RADIUS);
      if (humanInRange && Math.random() < 0.15) {
        detonateBombsFor(room, cpu);
      }
    } else if (cpu.bombs > 0 && distToHuman < BOMB_RADIUS * 0.7 && Math.random() < 0.05) {
      placeBombFor(room, cpu);
    }
  }
}

// Co-op AI: same overall shape as updateCpuAI above (decision-interval movement/aim/fire,
// per-tick dodge, stage 2+ bomb opportunism, stage 3+ house-chase against whichever ally is
// camping), but must pick a target between two living allies instead of assuming there's
// exactly one human. Target selection: mostly whoever's nearest (keeps the boss engaging
// whoever's actually in its face) with a chance each decision tick to instead focus whichever
// ally has the lower HP (a bit of "smart, finishes off the weak one" pressure without full
// omniscience). The locked-on ally persists between decision ticks — re-rolled only on each
// decision (or immediately if it died) — so the boss doesn't visibly flicker its aim between
// two targets every reactionMs.
function updateCpuAICoop(room, now, cpuToken) {
  const cpu = room.players.get(cpuToken);
  const inp = room.inputs.get(cpuToken);
  if (!cpu || !inp) return;
  if (room.mobWaveActive) {
    inp.up = inp.down = inp.left = inp.right = false;
    inp.shooting = false;
    inp.swording = false;
    return;
  }
  if (!cpu.alive) {
    inp.up = inp.down = inp.left = inp.right = false;
    inp.shooting = false;
    inp.swording = false;
    return;
  }

  const allies = [...room.players.values()].filter((p) => !p.isBoss && p.alive);
  if (allies.length === 0) {
    inp.up = inp.down = inp.left = inp.right = false;
    inp.shooting = false;
    inp.swording = false;
    return;
  }

  // Per-boss cfg, same reason as the 1P path — and the co-op tuning table only covers the five
  // numbered bosses, so the EX boss (hard stage 3's partner) falls back to its own cfg.
  const cfg = cpu.bossIndex ? bossSpec(cpu.bossIndex, true).cfg
    : STORY_BOSSES_2P[Math.min(Math.max(1, room.storyStage || 1), STORY_BOSSES_2P.length) - 1];
  if (!room.cpuStates.get(cpuToken)) {
    room.cpuStates.set(cpuToken, {
      lastDecisionAt: 0,
      targetDx: 0,
      targetDy: 0,
      aimJitterVal: 0,
      firing: false,
      strafeSign: Math.random() < 0.5 ? 1 : -1,
      lastPos: { x: cpu.x, y: cpu.y },
      targetAllyId: null,
    });
  }
  const st = room.cpuStates.get(cpuToken);
  let human = allies.find((p) => p.id === st.targetAllyId);
  // Same first-refusal as the 1P path. Falls back to any living ally so a boss whose chosen
  // target just went down still gets to use its move.
  updateBossSpecial(room, cpuToken, cpu, human || allies[0], now, st);

  if (now - st.lastDecisionAt >= cfg.reactionMs) {
    st.lastDecisionAt = now;

    if (!human || Math.random() < 0.35) {
      const lowHp = [...allies].sort((a, b) => a.hp - b.hp)[0];
      const nearest = [...allies].sort((a, b) => Math.hypot(a.x - cpu.x, a.y - cpu.y) - Math.hypot(b.x - cpu.x, b.y - cpu.y))[0];
      human = Math.random() < 0.35 ? lowHp : nearest;
    }
    st.targetAllyId = human.id;

    st.aimJitterVal = (Math.random() * 2 - 1) * cfg.aimJitter;
    st.firing = Math.random() < cfg.fireChance;

    const movedSince = Math.hypot(cpu.x - st.lastPos.x, cpu.y - st.lastPos.y);
    st.lastPos = { x: cpu.x, y: cpu.y };
    const stuck = movedSince < 4;

    if (Math.random() < 0.3) st.strafeSign *= -1;

    const toHumanX = human.x - cpu.x;
    const toHumanY = human.y - cpu.y;
    const dist = Math.hypot(toHumanX, toHumanY) || 1;
    const dirX = toHumanX / dist;
    const dirY = toHumanY / dist;

    let target = null;
    const wantsHeal = cpu.hp < (cpu.maxHp || MAX_HP) * 0.45;

    if (room.storyStage >= 3) {
      const humanHouse = houseContainingPoint(room.houses, human.x, human.y);
      if (humanHouse && houseContainingPoint(room.houses, cpu.x, cpu.y) !== humanHouse) {
        target = houseEntrancePoint(humanHouse);
      }
    }

    if (!target) {
      const item = room.items[0];
      if (item && (wantsHeal ? item.type === 'heal' || Math.random() < 0.5 : Math.random() < cfg.itemSeekChance)) {
        target = item;
      }
    }

    let tx, ty;
    if (target) {
      tx = target.x - cpu.x;
      ty = target.y - cpu.y;
    } else if (dist > cfg.preferredRange + 40) {
      tx = dirX;
      ty = dirY;
    } else if (dist < cfg.preferredRange - 40) {
      tx = -dirX;
      ty = -dirY;
    } else {
      tx = -dirY * st.strafeSign;
      ty = dirX * st.strafeSign;
    }

    if (stuck || Math.random() < cfg.moveJitter) {
      const a = Math.random() * Math.PI * 2;
      const jitterStrength = stuck ? 1 : cfg.moveJitter;
      tx += Math.cos(a) * jitterStrength;
      ty += Math.sin(a) * jitterStrength;
    }

    st.targetDx = tx;
    st.targetDy = ty;
  }

  if (!human) human = allies[0]; // locked-on ally died between decision ticks — fall back to
  // whichever other ally is left rather than freezing until the next decision interval

  let dodgeX = 0;
  let dodgeY = 0;
  let dodging = false;
  for (const b of room.bullets) {
    if (b.ownerId === cpu.id) continue;
    const bx = b.x - cpu.x;
    const by = b.y - cpu.y;
    const distNow = Math.hypot(bx, by);
    if (distNow > 140) continue;
    const speed = Math.hypot(b.vx, b.vy) || 1;
    const bvx = b.vx / speed;
    const bvy = b.vy / speed;
    const approach = -(bx * bvx + by * bvy);
    if (approach <= 0) continue;
    const cross = bx * bvy - by * bvx;
    const perpDist = Math.abs(cross);
    if (perpDist < PLAYER_RADIUS + (b.radius || BULLET_RADIUS) + 18 && Math.random() < cfg.dodgeChance) {
      const side = cross >= 0 ? 1 : -1;
      dodgeX += bvy * side;
      dodgeY += -bvx * side;
      dodging = true;
    }
  }

  const moveX = dodging ? dodgeX : st.targetDx;
  const moveY = dodging ? dodgeY : st.targetDy;
  if (Math.hypot(moveX, moveY) > 0.15) {
    inp.left = moveX < -0.25;
    inp.right = moveX > 0.25;
    inp.up = moveY < -0.25;
    inp.down = moveY > 0.25;
  } else {
    inp.left = inp.right = inp.up = inp.down = false;
  }

  inp.angle = Math.atan2(human.y - cpu.y, human.x - cpu.x) + st.aimJitterVal;
  const distToHumanNow = Math.hypot(human.y - cpu.y, human.x - cpu.x);
  // Stage4's boss (always-extended reach — see attemptSword()) needs this threshold extended
  // to match, same reasoning as updateCpuAI's 1P version above.
  // Same per-boss keying as attemptSword's stage4BossMelee — see its comment.
  const swordReach = (cpu.bossIndex ? cpu.bossIndex === 4 : room.storyStage === 4) ? SWORD_RANGE * SWORD_RANGE_BUFF_MULT : SWORD_RANGE;
  inp.swording = distToHumanNow <= swordReach + PLAYER_RADIUS;
  inp.shooting = st.firing && !inp.swording;

  if (room.storyStage >= 2) {
    const distToHuman = Math.hypot(human.x - cpu.x, human.y - cpu.y);
    const myPlacedBombs = room.bombs.filter((b) => b.ownerId === cpu.id);
    if (myPlacedBombs.length > 0) {
      const humanInRange = myPlacedBombs.some((b) => Math.hypot(human.x - b.x, human.y - b.y) < BOMB_RADIUS);
      if (humanInRange && Math.random() < 0.15) {
        detonateBombsFor(room, cpu);
      }
    } else if (cpu.bombs > 0 && distToHuman < BOMB_RADIUS * 0.7 && Math.random() < 0.05) {
      placeBombFor(room, cpu);
    }
  }
}

const rooms = new Map();
let nextPid = 1;

function getRoom(id) {
  let room = rooms.get(id);
  if (!room) {
    room = {
      id,
      players: new Map(), // ws -> playerState
      inputs: new Map(), // ws -> input state
      lastFire: new Map(), // ws -> timestamp
      lastSword: new Map(), // ws -> timestamp
      buffs: new Map(), // ws -> { speed: expiresAtMs, rapid: expiresAtMs, power: expiresAtMs }
      bullets: [],
      bulletId: 0,
      items: [],
      itemId: 0,
      nextItemSpawnAt: 0,
      walls: [],
      blocks: [],
      trees: [],
      houses: [],
      lasers: [],
      swordSwings: [],
      bombs: [],
      bombId: 0,
      explosions: [],
      monsters: [],
      monsterId: 0,
      nextMonsterSpawnAt: 0,
      monsterAttacks: [],
      isCpuMatch: false,
      cpuToken: null, // primary boss (hard mode's first of the pair) — single-boss paths still read this
      cpuTokens: [], // EVERY boss connection; hard mode holds two at once
      cpuStates: new Map(), // per-boss AI scratch state, keyed by token (was one room-wide cpuState)
      hardMode: false,
      storyStage: 1,
      storyComplete: false,
      exBossActive: false,
      storyCoop: false, // true only for the new 2-human co-op story room type — set once,
        // by the very first joiner, in joinRoom() below. Every other CPU-match code path
        // (1P story, the EX boss) leaves this false and is completely unaffected by it.
      pendingStoryIntro: false,
      mobWaveActive: false, // true while fighting the between-boss grunt wave mini-game
      mobWaveIndex: 0, // 1-based: which wave (maps into MOB_WAVE_COLOR_WEIGHTS)
      mobWaveSpawned: 0,
      mobWaveKilled: 0,
      mobWaveNextSpawnAt: 0,
      pendingMobWaveIntro: false, // mirrors pendingStoryIntro's extended-countdown-wait trick
      cpuState: null,
      phase: 'waiting', // waiting | countdown | playing | finished
      countdownEndsAt: 0,
      winnerId: null,
      matchWins: {},
      matchOver: false,
      matchWinnerId: null,
      rouletteEnabled: false,
      rouletteResult: null,
      loop: null,
      emptyRoomTimer: null, // see EMPTY_ROOM_GRACE_MS — pending "actually delete this room" timeout
      lastTick: Date.now(),
      paused: false, // either player can toggle — see the 'pause' message handler below;
        // gnow()/pauseOffsetMs (below) keep every timer (spawns, buffs, cooldowns, the
        // countdown) frozen for the whole room while paused, not just movement/combat.
      pauseOffsetMs: 0,
      pauseStartedAtVirtual: 0,
      pauseStartedAtReal: 0,
    };
    rooms.set(id, room);
  }
  return room;
}

// Every timestamp in this file (buff/spawn/cooldown deadlines, the countdown, etc.) is
// computed from this instead of a raw Date.now(), so pausing can freeze all of them at once
// without hunting down and individually shifting each one. While paused, gnow() returns the
// exact instant pause started, held constant no matter how long the pause actually lasts in
// real time; resuming (see the 'pause' handler) folds the real elapsed pause duration into
// pauseOffsetMs so gnow() picks up again right where it left off, seamlessly.
function gnow(room) {
  if (room.paused) return room.pauseStartedAtVirtual;
  return Date.now() - room.pauseOffsetMs;
}

function resetPositions(room) {
  const arr = [...room.players.values()];
  const spawnPoints = getSpawnPoints(room);
  // Bosses are placed off the LAST spawn point rather than by raw index: getSpawnPoints only
  // ever defines one boss-side position, so a hard-mode pair would otherwise both be handed the
  // same coordinates (or, worse, an ally's) and start the round stacked on top of each other.
  let bossSlot = 0;
  arr.forEach((p, idx) => {
    let sp;
    if (p.isBoss) {
      const base = spawnPoints[spawnPoints.length - 1];
      const offset = bossSlot === 0 ? 0 : (bossSlot % 2 === 1 ? -170 : 170);
      sp = { x: base.x, y: Math.max(90, Math.min(ARENA_H - 90, base.y + offset)) };
      bossSlot++;
    } else {
      sp = spawnPoints[idx] || spawnPoints[spawnPoints.length - 1];
    }
    p.x = sp.x;
    p.y = sp.y;
    // Story-mode leveling only ever grants a max-HP bonus, and only to the human player(s) —
    // the boss's own maxHp is set separately (see addCpuPlayer/STORY_BOSSES_2P_TUNING) and
    // must stay untouched here. Recomputed every round so it always reflects the current
    // level, including immediately after a level-up mid-run.
    if (room.isCpuMatch && !p.isBoss) {
      p.maxHp = Math.round(MAX_HP * storyLevelHpMult(p.storyLevel || 1)); // this player's OWN level, not a shared room one
    }
    p.hp = p.maxHp || MAX_HP;
    p.alive = true;
    p.bombs = 0;
    p.shieldAmount = 0;
  });
  room.bullets = [];
  room.items = [];
  room.nextItemSpawnAt = gnow(room) + 3000;
  const generated = generateWallsAndBlocks(room);
  room.walls = generated.walls;
  room.blocks = generated.blocks;
  room.trees = generateTrees(room.walls, room.blocks, room);
  // No healing buildings during the grunt-wave mini-game, per explicit request — keeps that
  // event a pure "clear the horde" arena rather than one with hiding/healing spots in it.
  room.houses = room.mobWaveActive ? [] : generateHouses(room.walls, room.trees, room.blocks, room); // mutates room.walls in place, appending each house's 3 wall segments
  for (const house of room.houses) {
    if (Math.random() < HOUSE_ITEM_CHANCE) {
      room.items.push({
        id: room.itemId++,
        type: pickWeightedItemType(),
        x: house.x + house.size / 2,
        y: house.y + house.size / 2,
      });
    }
  }
  room.bombs = [];
  room.explosions = [];
  room.monsters = [];
  room.nextMonsterSpawnAt = gnow(room) + MONSTER_SPAWN_MIN_MS + Math.random() * (MONSTER_SPAWN_MAX_MS - MONSTER_SPAWN_MIN_MS);
  for (const ws of room.buffs.keys()) {
    room.buffs.set(ws, freshBuffs());
  }
  // A pending roulette win from the round that just ended is granted now, at the start of
  // the round it actually gets to be used in — applied after the buffs reset above so it
  // isn't immediately wiped by it. In 2P co-op, room.rouletteResult.winnerId is always a
  // single *representative* ally id (see the win-condition comment elsewhere in this file —
  // same reason room.matchWins/winnerId use one stable id rather than "whichever ally is
  // alive"), so matching only that exact id gave the item to just one of the two humans even
  // though the whole team won it together. Per explicit request, an ally-side win in co-op
  // now grants it to both allies; a boss win (or non-coop) still grants it to the single
  // actual winner, unchanged.
  if (room.rouletteResult && room.rouletteResult.hit) {
    const rouletteWinner = [...room.players.values()].find((p) => p.id === room.rouletteResult.winnerId);
    const grantToAllAllies = room.storyCoop && rouletteWinner && !rouletteWinner.isBoss;
    for (const [ws, p] of room.players) {
      if (grantToAllAllies ? !p.isBoss : p.id === room.rouletteResult.winnerId) {
        applyItemEffect(room, ws, p, room.rouletteResult.itemType, gnow(room));
        if (!grantToAllAllies) break;
      }
    }
  }
  room.rouletteResult = null;
}

function broadcastWalls(room) {
  const msg = JSON.stringify({ type: 'walls', walls: room.walls, trees: room.trees, houses: room.houses });
  for (const ws of room.players.keys()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// STORY_INTRO_WAIT_MS must match the client's showBossIntro() auto-hide delay (client.js) —
// the 'countdown' phase already does nothing but wait (tick()'s countdown branch is just
// "if now >= countdownEndsAt, go to 'playing'"), so stretching it to the same length as the
// client's pre-battle dialogue card is enough by itself to freeze all real game progression
// (movement/AI/combat) for the whole time that card is on screen — no separate "paused"
// state was needed, this reuses the phase machine that already existed.
const STORY_INTRO_WAIT_MS = 5000;

function startCountdown(room) {
  room.phase = 'countdown';
  // Only the round that actually introduces a *new* stage (or a new mob wave) gets the long
  // wait — every other round (round 2/3 of the same boss's best-of-3, or a plain
  // human-vs-human rematch) keeps the normal countdown, matching the client's own "show the
  // narration card once per transition, not once per round" rule (introShownForStage).
  const waitMs = room.isCpuMatch && (room.pendingStoryIntro || room.pendingMobWaveIntro) ? STORY_INTRO_WAIT_MS : 3000;
  room.countdownEndsAt = gnow(room) + waitMs;
  room.pendingStoryIntro = false;
  room.pendingMobWaveIntro = false;
  resetPositions(room);
  broadcastWalls(room);
}

function ensureLoop(room) {
  if (room.loop) return;
  room.lastTick = gnow(room);
  // An uncaught exception thrown inside a setInterval callback crashes the entire Node
  // process by default — not just this one room — taking down every connected player's game
  // until someone notices and manually restarts the server. Catching here means a bug in one
  // room's tick can, at worst, freeze that single room (its own loop keeps calling this catch
  // block every TICK_MS, so it doesn't even stop retrying) instead of the whole server.
  room.loop = setInterval(() => {
    try {
      tick(room);
    } catch (err) {
      console.error(`[room ${room.id}] tick() error:`, err);
    }
  }, TICK_MS);
}

function pickWeightedItemType() {
  let r = Math.random() * ITEM_WEIGHT_TOTAL;
  for (const [type, w] of Object.entries(ITEM_WEIGHTS)) {
    if (r < w) return type;
    r -= w;
  }
  return 'bomb';
}

// Same weighted pick as pickWeightedItemType(), but with 'heal' excluded — used only for the
// roulette (the post-round item gamble). A roulette-granted item gets applied at the very
// start of the next round, right after every player's hp is already reset to full in
// resetPositions() — a 'heal' result there would be a guaranteed no-op (Math.min caps it at
// already-full hp), i.e. a real "wasted win," not just a low-value one.
const ROULETTE_ITEM_WEIGHTS = Object.fromEntries(Object.entries(ITEM_WEIGHTS).filter(([type]) => type !== 'heal'));
const ROULETTE_ITEM_WEIGHT_TOTAL = Object.values(ROULETTE_ITEM_WEIGHTS).reduce((sum, w) => sum + w, 0);
function pickRouletteItemType() {
  let r = Math.random() * ROULETTE_ITEM_WEIGHT_TOTAL;
  for (const [type, w] of Object.entries(ROULETTE_ITEM_WEIGHTS)) {
    if (r < w) return type;
    r -= w;
  }
  return 'bomb';
}

// Used for the golden chicken's death drop — "アイテムが3種類" (3 distinct types), not
// just 3 rolls that could repeat the same type.
function pickDistinctItemTypes(count) {
  const types = new Set();
  let tries = 0;
  while (types.size < count && tries < 50) {
    types.add(pickWeightedItemType());
    tries++;
  }
  return [...types];
}

// Called from both places a block's destruction can trigger a drop — the bullet/sword-driven
// cleanup pass in tick() and explodeBomb()'s instant-destroy filter — so the gold/red/normal
// drop rules live in exactly one place rather than being duplicated at each call site.
// "ランダムで3つ" for gold — independent rolls, unlike the golden chicken's "3種類" (which
// deliberately forces 3 *distinct* types via pickDistinctItemTypes); a gold block's 3 rolls
// can repeat the same type.
function dropBlockItems(room, block, cx, cy) {
  if (block.gold) {
    for (let i = 0; i < GOLD_BLOCK_ITEM_COUNT; i++) {
      const angle = (i / GOLD_BLOCK_ITEM_COUNT) * Math.PI * 2;
      room.items.push({ id: room.itemId++, type: pickWeightedItemType(), x: cx + Math.cos(angle) * 30, y: cy + Math.sin(angle) * 30 });
    }
  } else if (block.red || Math.random() < BLOCK_ITEM_DROP_CHANCE) {
    room.items.push({ id: room.itemId++, type: pickWeightedItemType(), x: cx, y: cy });
  }
}

// Single source of truth for a monster's collision size — every hit test (bullets, laser, sword,
// bombs, contact damage) goes through this, so the gold wave tier's bigger hitbox follows from
// the one branch below rather than needing each of those sites touched.
function monsterRadius(m) {
  if (m.chicken) return GOLDEN_CHICKEN_RADIUS;
  if (m.gold) return GOLD_MONSTER_RADIUS;
  if (m.wave && m.waveColor === 'gold') return GOLD_WAVE_MOB_RADIUS;
  return MONSTER_RADIUS;
}

function spawnItem(room) {
  const margin = 70;
  let x, y, tries = 0;
  do {
    x = margin + Math.random() * (ARENA_W - margin * 2);
    y = margin + Math.random() * (ARENA_H - margin * 2);
    tries++;
  } while (
    tries < 20 &&
    (room.walls.some((w) => circleHitsRect(x, y, ITEM_RADIUS + 12, w)) ||
      room.blocks.some((b) => circleHitsRect(x, y, ITEM_RADIUS + 12, b)) ||
      room.items.some((it) => Math.hypot(it.x - x, it.y - y) < ITEM_RADIUS * 3))
  );
  room.items.push({
    id: room.itemId++,
    type: pickWeightedItemType(),
    x,
    y,
  });
}

// Picks a point on the arena's outer perimeter (one of the 4 sides, uniformly) rather
// than anywhere in the interior — "画面端から生成されてこちらに向かう" (spawn from the
// screen edge and head this way), so a monster's appearance now reads as "arriving from
// off-screen" rather than "materializing in the middle of the fight".
function pickEdgeSpawnPosition(radius) {
  const margin = radius + 12;
  const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
  if (side === 0) return { x: margin + Math.random() * (ARENA_W - margin * 2), y: margin };
  if (side === 1) return { x: ARENA_W - margin, y: margin + Math.random() * (ARENA_H - margin * 2) };
  if (side === 2) return { x: margin + Math.random() * (ARENA_W - margin * 2), y: ARENA_H - margin };
  return { x: margin, y: margin + Math.random() * (ARENA_H - margin * 2) };
}

function spawnMonster(room) {
  // Mutually exclusive: a spawn is chicken, or (failing that) gold, or (failing both) a
  // regular monster — never more than one variant at once.
  const chicken = Math.random() < GOLDEN_CHICKEN_CHANCE;
  // Gold ambient monsters (not the separate wave-mob gold *tier* — see spawnWaveMob/
  // pickMobWaveColorTier, deliberately untouched) are only allowed from stage 5 onward in
  // story mode, per explicit request — arena/PvP mode (not isCpuMatch) is unaffected, and
  // room.storyStage stays frozen at 5 during the EX boss fight too, so "5面以降" naturally
  // covers that as well.
  const goldAllowed = !room.isCpuMatch || room.storyStage >= 5;
  const gold = !chicken && goldAllowed && Math.random() < GOLD_MONSTER_CHANCE;
  const radius = chicken ? GOLDEN_CHICKEN_RADIUS : gold ? GOLD_MONSTER_RADIUS : MONSTER_RADIUS;
  const hp = gold ? MONSTER_MAX_HP * GOLD_MONSTER_HP_MULT : MONSTER_MAX_HP; // chicken uses the plain MONSTER_MAX_HP too — "HPはモンスターと同じ"
  const spawnPoints = getSpawnPoints(room);
  let x, y, tries = 0;
  do {
    ({ x, y } = pickEdgeSpawnPosition(radius));
    tries++;
  } while (
    tries < 20 &&
    (spawnPoints.some((s) => Math.hypot(s.x - x, s.y - y) < 140) ||
      room.walls.some((w) => circleHitsRect(x, y, radius + 10, w)) ||
      room.blocks.some((b) => circleHitsRect(x, y, radius + 10, b)))
  );
  room.monsters.push({
    id: room.monsterId++,
    x, y,
    hp, maxHp: hp,
    gold,
    chicken,
    lastHit: {},
    lastAttackAt: 0,
  });
}

// A single grunt for the between-boss wave mini-game — a plain monster with no gold/chicken
// rolls, tagged `wave` so tick()'s movement loop applies its rolled color tier's speed/damage
// multiplier and so the death-cleanup loop can count it toward mobWaveKilled.
function spawnWaveMob(room) {
  const tier = pickMobWaveColorTier(room.mobWaveIndex);
  const stats = MOB_WAVE_COLOR_STATS[tier];
  // Must match what monsterRadius() will report for this tier, or a gold grunt gets placed using
  // the smaller base radius and can spawn clipped into a wall it doesn't actually fit beside.
  const radius = tier === 'gold' ? GOLD_WAVE_MOB_RADIUS : MONSTER_RADIUS;
  const spawnPoints = getSpawnPoints(room);
  let x, y, tries = 0;
  do {
    ({ x, y } = pickEdgeSpawnPosition(radius));
    tries++;
  } while (
    tries < 20 &&
    (spawnPoints.some((s) => Math.hypot(s.x - x, s.y - y) < 140) ||
      room.walls.some((w) => circleHitsRect(x, y, radius + 10, w)) ||
      room.blocks.some((b) => circleHitsRect(x, y, radius + 10, b)))
  );
  room.monsters.push({
    id: room.monsterId++,
    x, y,
    hp: MONSTER_MAX_HP, maxHp: MONSTER_MAX_HP,
    gold: false,
    chicken: false,
    wave: true,
    waveColor: tier,
    waveSpeedMult: stats.speedMult,
    waveDamageMult: stats.damageMult,
    lastHit: {},
    lastAttackAt: 0,
  });
  room.mobWaveSpawned++;
}

function tick(room) {
  const now = gnow(room);
  const dt = Math.min(0.05, (now - room.lastTick) / 1000);
  room.lastTick = now;
  // Skip every bit of simulation (movement, combat, spawns, buff/cooldown expiry, the
  // countdown) while paused — gnow() already freezes `now` itself for the whole room, so
  // nothing here needs its own separate pause check, and dt stays tiny (no catch-up jump)
  // once resumed since lastTick was kept in lockstep with the frozen now above. Still
  // broadcasts every tick so the paused state itself (and who's in the room) stays live.
  if (room.paused) { broadcastState(room); return; }

  if (room.phase === 'countdown') {
    if (now >= room.countdownEndsAt) room.phase = 'playing';
  } else if (room.phase === 'playing') {
    // Bombs have no auto-fuse — they sit until the owner presses detonate (or the round
    // resets), so there's nothing to check here anymore.
    if (room.isCpuMatch) updateCpuAI(room, now);
    for (const [ws, p] of room.players) {
      if (!p.alive) continue;
      const inp = room.inputs.get(ws);
      const buffs = room.buffs.get(ws);
      const speedMult = buffs && now < buffs.speed ? SPEED_BUFF_MULT : 1;

      let dx = 0;
      let dy = 0;
      if (inp.up) dy -= 1;
      if (inp.down) dy += 1;
      if (inp.left) dx -= 1;
      if (inp.right) dx += 1;
      if (dx || dy) {
        const len = Math.hypot(dx, dy);
        p.x += (dx / len) * BASE_PLAYER_SPEED * speedMult * dt;
        p.y += (dy / len) * BASE_PLAYER_SPEED * speedMult * dt;
      }
      p.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, p.x));
      p.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, p.y));
      resolveWallCollisions(p, room.walls);
      resolveWallCollisions(p, room.blocks); // blocks are solid too, until destroyed
      p.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_W - PLAYER_RADIUS, p.x));
      p.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_H - PLAYER_RADIUS, p.y));
      p.angle = inp.angle;

      // passive house healing — footprint bounding box is close enough to "inside"
      // given walls already keep the player from overlapping the 3 solid sides
      for (const house of room.houses) {
        if (p.x >= house.x && p.x <= house.x + house.size && p.y >= house.y && p.y <= house.y + house.size) {
          p.hp = Math.min(p.maxHp || MAX_HP, p.hp + HOUSE_HEAL_PER_SEC * dt);
          break;
        }
      }

      // Humans no longer fire this way — they send a discrete 'fireOnce' message per
      // press (handled below in the WS message handler). This path now only matters
      // for the CPU, which still holds inp.shooting continuously like before.
      if (inp.shooting) attemptFire(room, ws, p, now);
      if (inp.swording) attemptSword(room, ws, p, now);
    }

    for (const monster of room.monsters) {
      const radius = monsterRadius(monster);
      const speed = monster.wave ? MONSTER_SPEED * monster.waveSpeedMult : monster.chicken ? GOLDEN_CHICKEN_SPEED : monster.gold ? GOLD_MONSTER_SPEED : MONSTER_SPEED;
      const contactDamage = monster.wave ? Math.round(MONSTER_CONTACT_DAMAGE * monster.waveDamageMult) : monster.gold ? Math.round(MONSTER_CONTACT_DAMAGE * GOLD_MONSTER_CONTACT_DAMAGE_MULT) : MONSTER_CONTACT_DAMAGE;

      let target = null;
      let bestDist = Infinity;
      for (const [, p] of room.players) {
        if (!p.alive) continue;
        // In any story-mode room (1P or 2P co-op — not just during the mob-wave mini-game),
        // monsters are wildlife roaming the battlefield, not the boss's own allies — they
        // should only ever threaten the human(s), never the boss, whether they're wave mobs
        // or an ordinary ambient spawn that happened to appear during a ordinary boss round.
        if (room.isCpuMatch && p.isBoss) continue;
        const d = Math.hypot(p.x - monster.x, p.y - monster.y);
        if (d < bestDist) { bestDist = d; target = p; }
      }
      if (target) {
        // chicken runs from whoever's nearest instead of homing toward them — same
        // nearest-player targeting, just the opposite direction. Used to be arena-mode-only
        // (story mode had every monster, chicken included, always approach) per an earlier
        // request, but per explicit follow-up the chicken should flee in every mode — it was
        // charging straight at the player in story mode instead, which doesn't match its own
        // description ("プレイヤーから逃げ回るだけで攻撃してこない", no story-mode carve-out).
        const fleeing = monster.chicken;
        const sign = fleeing ? -1 : 1;
        let dx = (target.x - monster.x) * sign;
        let dy = (target.y - monster.y) * sign;
        let len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        if (fleeing) {
          // Fleeing straight away from the player alone tends to run it into a corner or
          // screen edge, where it visually hides behind the fixed UI buttons — bias the
          // flee direction toward the arena center to counteract that, "無理して"
          // (forcibly). The bias strengthens the closer it already is to an edge, so it's
          // a soft nudge near the middle but a hard correction once it's actually
          // approaching the boundary, rather than overriding the flee behavior outright.
          const toCenterX = ARENA_W / 2 - monster.x;
          const toCenterY = ARENA_H / 2 - monster.y;
          const centerLen = Math.hypot(toCenterX, toCenterY) || 1;
          const edgeFactor = Math.max(Math.abs(monster.x - ARENA_W / 2) / (ARENA_W / 2), Math.abs(monster.y - ARENA_H / 2) / (ARENA_H / 2));
          // Was a flat 0.45 minimum (up to 0.9 near an edge) — diluted the actual flee-from-
          // player direction so heavily, even dead-center, that the chicken effectively just
          // walked toward the arena's center regardless of the player, reading as "charging
          // straight at" a player who happened to be standing between its spawn and the
          // center (confirmed live: a chicken spawned near a Y-edge closed 115px of distance
          // in 1.5s while the player stood still). Zero bias unless genuinely past the inner
          // half of the arena, only then ramping up toward the edge itself, so the flee
          // behavior actually dominates almost everywhere and the correction only kicks in
          // close to actually getting stuck against a wall.
          const centerBias = Math.max(0, edgeFactor - 0.5) * 0.9; // 0 until halfway to an edge, up to 0.45 right at the boundary
          dx = dx * (1 - centerBias) + (toCenterX / centerLen) * centerBias;
          dy = dy * (1 - centerBias) + (toCenterY / centerLen) * centerBias;
          len = Math.hypot(dx, dy) || 1;
          dx /= len;
          dy /= len;
        }

        monster.x += dx * speed * dt;
        monster.y += dy * speed * dt;
      }

      // Monsters otherwise ignore walls entirely (see the comment on MONSTER_SPEED),
      // but houses are specifically excluded — a hiding/healing spot shouldn't be
      // underminable by something that can just walk through the wall. Push back out
      // along whichever axis has the smallest penetration, same idea as
      // resolveWallCollisions but against the house's whole footprint rather than its
      // individual wall segments, since the goal is "never inside", not just "don't
      // overlap the thin wall line".
      for (const house of room.houses) {
        const left = house.x - radius;
        const right = house.x + house.size + radius;
        const top = house.y - radius;
        const bottom = house.y + house.size + radius;
        if (monster.x > left && monster.x < right && monster.y > top && monster.y < bottom) {
          const distLeft = monster.x - left;
          const distRight = right - monster.x;
          const distTop = monster.y - top;
          const distBottom = bottom - monster.y;
          const minDist = Math.min(distLeft, distRight, distTop, distBottom);
          if (minDist === distLeft) monster.x = left;
          else if (minDist === distRight) monster.x = right;
          else if (minDist === distTop) monster.y = top;
          else monster.y = bottom;
        }
      }

      monster.x = Math.max(radius, Math.min(ARENA_W - radius, monster.x));
      monster.y = Math.max(radius, Math.min(ARENA_H - radius, monster.y));

      if (!monster.chicken) {
        // the chicken is purely an evasion target — no threat, no contact damage at all
        for (const [pws, p] of room.players) {
          if (!p.alive) continue;
          if (room.isCpuMatch && p.isBoss) continue; // same story-mode-wide exclusion as the targeting loop above
          const d = Math.hypot(p.x - monster.x, p.y - monster.y);
          if (d < PLAYER_RADIUS + radius) {
            const last = monster.lastHit[p.id] || 0;
            if (now - last >= MONSTER_CONTACT_COOLDOWN_MS) {
              monster.lastHit[p.id] = now;
              applyDamage(room, pws, p, contactDamage, now);
            }
          }
        }
      }

      // gold monsters also periodically pulse a ranged attack that hits every player
      // within range at once, not just whichever one it's currently chasing
      if (monster.gold && now - monster.lastAttackAt >= GOLD_MONSTER_ATTACK_COOLDOWN_MS) {
        monster.lastAttackAt = now;
        let hitAny = false;
        for (const [pws, p] of room.players) {
          if (!p.alive) continue;
          if (room.isCpuMatch && p.isBoss) continue; // same story-mode-wide exclusion as the targeting/contact loops above — this one had no boss guard at all before
          const d = Math.hypot(p.x - monster.x, p.y - monster.y);
          if (d < GOLD_MONSTER_ATTACK_RANGE) {
            applyDamage(room, pws, p, GOLD_MONSTER_ATTACK_DAMAGE, now);
            hitAny = true;
          }
        }
        room.monsterAttacks.push({ x: monster.x, y: monster.y, range: GOLD_MONSTER_ATTACK_RANGE, hit: hitAny });
      }
    }

    room.bullets = room.bullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < 0 || b.x > ARENA_W || b.y < 0 || b.y > ARENA_H) return false;
      const bRadius = b.radius || BULLET_RADIUS;
      for (const wall of room.walls) {
        if (circleHitsRect(b.x, b.y, bRadius, wall)) return false;
      }
      for (const block of room.blocks) {
        if (block.hp > 0 && circleHitsRect(b.x, b.y, bRadius, block)) {
          block.hp -= b.damage || BASE_BULLET_DAMAGE;
          return false; // bullet is consumed by the block regardless of whether it broke
        }
      }
      for (const monster of room.monsters) {
        const mRadius = monsterRadius(monster);
        if (monster.hp > 0 && Math.hypot(monster.x - b.x, monster.y - b.y) < mRadius + bRadius) {
          monster.hp -= b.damage || BASE_BULLET_DAMAGE;
          monster.lastHitById = b.ownerId; // credits the wave-mob XP to whoever fired this — see addStoryXp
          return false;
        }
      }
      for (const [pws, p] of room.players) {
        if (p.id === b.ownerId || !p.alive) continue;
        // isCpuMatch, not storyCoop: "same side never hits itself" is about SIDES, and hard mode
        // puts two bosses in a 1P room where this guard used to be off entirely — so the pair
        // shot each other (measured: partner lost 18hp to stray fire in one short fight).
        // Arena PvP has no sides and is untouched (isCpuMatch is false there).
        if (room.isCpuMatch && !!b.ownerIsBoss === !!p.isBoss) continue;
        if (room.mobWaveActive && p.isBoss) continue; // boss is inert/hidden during a wave
        const d = Math.hypot(p.x - b.x, p.y - b.y);
        if (d < PLAYER_RADIUS + bRadius) {
          applyDamage(room, pws, p, b.damage || BASE_BULLET_DAMAGE, now);
          return false;
        }
      }
      return true;
    });
    for (const bl of room.blocks) {
      if (bl.hp <= 0) dropBlockItems(room, bl, bl.x + bl.w / 2, bl.y + bl.h / 2);
    }
    room.blocks = room.blocks.filter((bl) => bl.hp > 0);

    if (!room.mobWaveActive && room.monsters.length < MONSTER_MAX_COUNT && now >= room.nextMonsterSpawnAt) {
      spawnMonster(room);
      room.nextMonsterSpawnAt = now + MONSTER_SPAWN_MIN_MS + Math.random() * (MONSTER_SPAWN_MAX_MS - MONSTER_SPAWN_MIN_MS);
    }
    if (room.mobWaveActive && room.mobWaveSpawned < mobWaveTarget(room) && now >= room.mobWaveNextSpawnAt) {
      spawnWaveMob(room);
      room.mobWaveNextSpawnAt = now + MOB_WAVE_SPAWN_INTERVAL_MS;
    }
    // dying monsters drop an item where they fell — checked once per tick here rather than
    // at each individual damage site (bullet/laser/sword/bomb), since it needs to catch a
    // kill from any of those four sources uniformly without duplicating this logic 4 times
    for (const m of room.monsters) {
      if (m.hp <= 0) {
        if (m.wave) {
          room.mobWaveKilled++;
          // Paid to the ally who actually landed the kill, so the two levels genuinely diverge
          // by how each of them played. An unattributable kill (killer already disconnected)
          // simply awards nothing rather than defaulting to someone who didn't earn it.
          addStoryXp(killerOf(room, m), MOB_WAVE_COLOR_XP[m.waveColor] || MOB_WAVE_COLOR_XP.blue);
        }
        if (m.chicken) {
          // "周囲にアイテムが3種類獲得" — scattered around the death point, not stacked
          // exactly on top of each other
          const types = pickDistinctItemTypes(GOLDEN_CHICKEN_ITEM_COUNT);
          types.forEach((type, i) => {
            const angle = (i / types.length) * Math.PI * 2;
            room.items.push({
              id: room.itemId++,
              type,
              x: m.x + Math.cos(angle) * 30,
              y: m.y + Math.sin(angle) * 30,
            });
          });
        } else {
          room.items.push({ id: room.itemId++, type: pickWeightedItemType(), x: m.x, y: m.y });
        }
      }
    }
    room.monsters = room.monsters.filter((m) => m.hp > 0);

    if (room.items.length === 0 && now >= room.nextItemSpawnAt) {
      spawnItem(room);
      if (Math.random() < DOUBLE_SPAWN_CHANCE) spawnItem(room);
    }
    room.items = room.items.filter((item) => {
      for (const [ws, p] of room.players) {
        if (!p.alive) continue;
        const d = Math.hypot(p.x - item.x, p.y - item.y);
        if (d < PLAYER_RADIUS + ITEM_RADIUS) {
          applyItemEffect(room, ws, p, item.type, now);
          room.nextItemSpawnAt = now + ITEM_SPAWN_MIN_MS + Math.random() * (ITEM_SPAWN_MAX_MS - ITEM_SPAWN_MIN_MS);
          return false;
        }
      }
      return true;
    });

    if (room.mobWaveActive) {
      // Mob wave mini-game win/loss: cleared once all MOB_WAVE_COUNT grunts have both been
      // spawned and killed; failed if every human (non-boss) player dies first. Deliberately
      // does NOT touch room.matchWins/MATCH_WIN_TARGET — a wave isn't a best-of-3 round, it's
      // a gate between two boss rounds — and deliberately leaves room.mobWaveActive true even
      // after setting phase 'finished', since the rematch handler is the sole place that
      // reads (and then clears) it to tell "we just finished a wave" apart from "we just
      // finished a boss round".
      const allPlayers = [...room.players.values()];
      const boss = allPlayers.find((pl) => pl.isBoss);
      const humans = allPlayers.filter((pl) => !pl.isBoss);
      const humansDead = humans.length > 0 && humans.every((pl) => !pl.alive);
      const waveCleared = room.mobWaveSpawned >= mobWaveTarget(room) && room.monsters.filter((m) => m.wave).length === 0;
      if (humansDead) {
        room.phase = 'finished';
        room.winnerId = boss ? boss.id : null;
        room.matchOver = true;
        room.matchWinnerId = boss ? boss.id : null;
      } else if (waveCleared) {
        room.phase = 'finished';
        const rep = humans[0];
        room.winnerId = rep ? rep.id : null;
        room.matchOver = true;
        room.matchWinnerId = rep ? rep.id : null;
      }
    } else if (room.isCpuMatch) {
      // Side-based win condition, now used for EVERY story room (1P included), not just co-op.
      // The old 1P path in the else branch below asked "are there exactly 2 players and is one
      // of them dead", which silently stops being true the moment a room holds two bosses —
      // a hard-mode round would have ended the instant the FIRST boss fell. Side-based is
      // correct for 1-vs-1, 2-vs-1 and 1-vs-2 alike, and it already uses the same stable
      // 'ally'/'boss' tally keys the 1P client reads.
      // Round ends when either the whole boss side or the whole ally side is wiped out — "the
      // other 2 total players, one of them dead" no longer uniquely identifies a winner, so this
      // is a genuinely separate check from the else branch below, not a tweak to it.
      const allPlayers = [...room.players.values()];
      const bosses = allPlayers.filter((pl) => pl.isBoss);
      const boss = bosses[0];
      const allies = allPlayers.filter((pl) => !pl.isBoss);
      // EVERY boss must fall, not just the first one — hard mode fields two at once.
      const bossDead = bosses.length > 0 && bosses.every((pl) => !pl.alive);
      const alliesDead = allies.length > 0 && allies.every((pl) => !pl.alive);
      if (bossDead || alliesDead) {
        room.phase = 'finished';
        // Always allies[0] (stable Map-insertion-order id, i.e. the first ally who joined
        // the room) when allies win — NOT "whichever ally happens to be alive right now",
        // since that could differ round to round and would fragment room.matchWins across
        // two different keys instead of accumulating toward MATCH_WIN_TARGET on one.
        const winnerId = bossDead ? (allies[0] ? allies[0].id : null) : (boss ? boss.id : null);
        room.winnerId = winnerId;
        if (winnerId) {
          // 'ally'/'boss', not the volatile winnerId itself — a reconnect regenerates every
          // player's id (a fresh human pid, and a fresh cpuToken since the close handler always
          // drops the boss token too — see its own comment), which would otherwise silently
          // orphan the accumulated score under a since-deleted id the very next time either
          // side reconnects mid-series. Per explicit request that a reconnect keep the current
          // win/loss tally, not reset it.
          const winsKey = bossDead ? 'ally' : 'boss';
          room.matchWins[winsKey] = (room.matchWins[winsKey] || 0) + 1;
          if (room.matchWins[winsKey] >= MATCH_WIN_TARGET) {
            room.matchOver = true;
            room.matchWinnerId = winnerId;
          }
          if (room.rouletteEnabled) {
            const hit = Math.random() < 0.5; // 50% miss, per spec
            room.rouletteResult = { winnerId, hit, itemType: hit ? pickRouletteItemType() : null };
          }
        }
      }
    } else {
      const alive = [...room.players.values()];
      if (alive.length === 2 && alive.some((p) => !p.alive)) {
        room.phase = 'finished';
        const winner = alive.find((p) => p.alive);
        room.winnerId = winner ? winner.id : null;
        if (winner) {
          // Same reconnect-safe stable key as the storyCoop branch above — arena PvP has no
          // isBoss concept at all, so it keeps using the raw (still volatile) id there; that
          // mode's own reconnect-preserves-score behavior isn't part of what's fixed here.
          const winsKey = room.isCpuMatch ? (winner.isBoss ? 'boss' : 'ally') : winner.id;
          room.matchWins[winsKey] = (room.matchWins[winsKey] || 0) + 1;
          if (room.matchWins[winsKey] >= MATCH_WIN_TARGET) {
            room.matchOver = true;
            room.matchWinnerId = winner.id;
          }
          if (room.rouletteEnabled) {
            const hit = Math.random() < 0.5; // 50% miss, per spec
            room.rouletteResult = {
              winnerId: winner.id,
              hit,
              itemType: hit ? pickRouletteItemType() : null,
            };
          }
        }
      }
    }
  }

  broadcastState(room);
  // Transient per-tick event arrays — lasers/swordSwings/monsterAttacks are only ever
  // populated synchronously within the 'playing' branch above; explosions can also be
  // pushed asynchronously from the WS message handler (manual bomb detonation) between
  // ticks, which is why this clear has always had to happen *after* broadcastState, not
  // before it — otherwise an explosion pushed a few ms ago would get wiped before ever
  // being sent. Clearing all four here unconditionally (not gated on phase==='playing')
  // fixes a real bug: previously they were only cleared while still in 'playing', so
  // whatever was left in them at the moment a round ended (e.g. the winning sword swing
  // or laser shot) kept being rebroadcast completely unchanged through the entire
  // 'finished'/'countdown' phases — since every array entry is treated as "new this
  // tick" by the client (see attemptSword's comment on why that's normally safe), that
  // meant the last attack's sound effect replayed in an endless loop until the next
  // round actually started.
  room.lasers = [];
  room.swordSwings = [];
  room.monsterAttacks = [];
  room.explosions = [];
}

function broadcastState(room) {
  const now = gnow(room); // frozen while paused, so buff-remaining-time display freezes too, not just the sim
  const players = [...room.players.entries()].map(([ws, p]) => {
    const b = room.buffs.get(ws) || freshBuffs();
    let clone = null;
    if (now < b.clone) {
      const offAngle = p.angle + Math.PI / 2;
      clone = {
        x: p.x + Math.cos(offAngle) * CLONE_OFFSET,
        y: p.y + Math.sin(offAngle) * CLONE_OFFSET,
        angle: p.angle,
      };
    }
    return {
      ...p,
      clone,
      buffs: {
        speed: Math.max(0, b.speed - now),
        rapid: Math.max(0, b.rapid - now),
        power: Math.max(0, b.power - now),
        big: Math.max(0, b.big - now),
        laser: Math.max(0, b.laser - now),
        shield: Math.max(0, b.shield - now),
        swordRange: Math.max(0, b.swordRange - now),
        clone: Math.max(0, b.clone - now),
      },
    };
  });
  const state = {
    type: 'state',
    phase: room.phase,
    paused: room.paused,
    countdown: room.phase === 'countdown' ? Math.max(0, Math.ceil((room.countdownEndsAt - now) / 1000)) : 0,
    players,
    bullets: room.bullets,
    items: room.items,
    bombs: room.bombs,
    blocks: room.blocks,
    monsters: room.monsters,
    monsterAttacks: room.monsterAttacks,
    lasers: room.lasers,
    swordSwings: room.swordSwings,
    explosions: room.explosions,
    winnerId: room.winnerId,
    matchWins: room.matchWins,
    matchOver: room.matchOver,
    matchWinnerId: room.matchWinnerId,
    rouletteEnabled: room.rouletteEnabled,
    rouletteResult: room.rouletteResult,
    isCpuMatch: room.isCpuMatch,
    storyStage: room.storyStage,
    storyStageCount: room.hardMode ? hardStageCount() : STORY_BOSSES.length,
    hardMode: room.hardMode,
    storyComplete: room.storyComplete,
    exBossActive: room.exBossActive,
    storyCoop: room.storyCoop,
    mobWaveActive: room.mobWaveActive,
    mobWaveIndex: room.mobWaveIndex,
    mobWaveCount: mobWaveTarget(room),
    mobWaveSpawned: room.mobWaveSpawned,
    mobWaveKilled: room.mobWaveKilled,
    // Level/XP now ride on each player object (see addStoryXp) and reach the client through the
    // `...p` spread in the players array above — there is no room-wide level any more.
    storyLevelCap: STORY_LEVEL_CAP,
    serverNow: now, // the room's own clock, so the client can time-box things like the boss special warning
  };
  const msg = JSON.stringify(state);
  for (const ws of room.players.keys()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function joinRoom(roomId, ws, name, wantsStoryCpu, roulette, wantsCoop, wantsHard) {
  const room = getRoom(roomId);
  // A player is (re)joining — cancel any pending grace-period teardown from a previous
  // occupant's disconnect (see EMPTY_ROOM_GRACE_MS) so this room doesn't get deleted out
  // from under them moments after they arrive.
  if (room.emptyRoomTimer) {
    clearTimeout(room.emptyRoomTimer);
    room.emptyRoomTimer = null;
  }
  // Decided once, by the very first joiner, same pattern as rouletteEnabled below — must
  // happen before the capacity check right after it, since that check needs to already know
  // whether this room targets 2 players (arena/1P story) or 3 (2-human co-op story).
  if (room.players.size === 0 && wantsStoryCpu) {
    if (wantsCoop) room.storyCoop = true;
    // Hard mode is a room-level rule fixed by its creator, same as co-op and the roulette.
    if (wantsHard) room.hardMode = true;
  }
  // NOT expectedRoomSize() here: that early-returns 2 for a non-CPU room, and room.isCpuMatch is
  // still false at this point on a brand-new story room (it is only set later, by syncBosses).
  // Using it here sized a hard room at 2, so the room reached 3 occupants, never equalled
  // maxPlayers, and sat in 'waiting' forever without ever starting the countdown.
  const storyRoom = wantsStoryCpu || room.isCpuMatch;
  const maxPlayers = storyRoom ? humanTarget(room) + bossIndicesFor(room).length : 2;
  if (room.players.size >= maxPlayers) {
    ws.send(JSON.stringify({ type: 'full' }));
    ws.close();
    return;
  }

  const pid = 'p' + nextPid++;
  const idx = room.players.size;
  const sp = getSpawnPoints(room)[idx] || { x: ARENA_W - 120, y: ARENA_H / 2 };
  const player = {
    id: pid,
    name: (name || 'プレイヤー').slice(0, 12),
    x: sp.x,
    y: sp.y,
    angle: 0,
    hp: MAX_HP,
    maxHp: MAX_HP,
    alive: true,
    bombs: 0,
    shieldAmount: 0,
    storyLevel: 1, // story-mode-only, PER PLAYER (1-10) — see STORY_LEVEL_CAP/storyLevelHpMult
    storyXp: 0, // this player's own wave-mob kills plus the shared boss-kill awards
  };
  room.players.set(ws, player);
  room.inputs.set(ws, { up: false, down: false, left: false, right: false, angle: 0, shooting: false, swording: false });
  room.buffs.set(ws, freshBuffs());

  // Only the room's first joiner (the creator) sets this — a rule chosen once for the
  // room, same as how CPU difficulty is only ever specified by that first connection.
  // Must run BEFORE addCpuPlayer() below — that call also inserts into room.players,
  // which would bump room.players.size up first and make a naive size-based check false
  // for every CPU match, silently leaving rouletteEnabled stuck at its default false
  // regardless of the checkbox. (This was a real bug, not a hypothetical.)
  if (room.players.size === 1) {
    room.rouletteEnabled = !!roulette;
  }
  // Non-coop story: the boss is added as soon as the single human joins (unchanged from
  // before). Co-op story: the boss waits until BOTH humans are present, so a room never ends
  // up with just one ally and an already-active boss.
  const humanTargetForCpu = humanTarget(room);
  if (wantsStoryCpu && room.players.size === humanTargetForCpu) {
    // room.storyStage (not a hardcoded 1) — this same trigger also fires on a RECONNECT: a
    // disconnect mid-fight removes the CPU token too (see the isCpuMatch branch in the 'close'
    // handler below), so the human rejoining a room that already has real progress hits this
    // exact "add the boss" path again. room.storyStage is never reset by a disconnect (only the
    // in-progress round's bullets/items are), so it's already sitting at the correct current
    // stage — a fresh room simply has it at its default 1, so this is a no-op change for that
    // case and a real fix for the reconnect case (was silently restarting the whole campaign
    // from stage 1 every time, per an explicit "reconnecting shouldn't be a do-over" report).
    // addCpuPlayer -> syncBosses builds the line-up from bossIndicesFor(), which already
    // accounts for exBossActive and for hard mode's pairs, so a reconnect mid-EX-fight or
    // mid-hard-stage restores the correct bosses with no special-casing here any more.
    addCpuPlayer(room, room.storyStage);
  }

  ws.send(JSON.stringify({
    type: 'welcome',
    id: pid,
    isCpuMatch: room.isCpuMatch,
    storyStage: room.storyStage,
    storyStageCount: room.hardMode ? hardStageCount() : STORY_BOSSES.length,
    storyCoop: room.storyCoop,
    hardMode: room.hardMode,
    rouletteEnabled: room.rouletteEnabled,
    arena: { w: ARENA_W, h: ARENA_H, walls: room.walls, trees: room.trees, houses: room.houses },
  }));
  broadcastState(room);

  // `!room.matchOver` belt-and-braces alongside the close handler's matching guard: a decided
  // series must never be auto-continued by the room simply refilling. Without this, a rejoin
  // after a lost match started a phantom extra round on top of the game-over state.
  if (room.players.size === maxPlayers && room.phase === 'waiting' && !room.matchOver) startCountdown(room);
  ensureLoop(room);

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    // Everything below dispatches on data.type — wrapped so a bug in any one branch (input,
    // rematch, etc.) can't throw uncaught and crash the whole Node process (which would drop
    // every connected player's game, not just this room's). Not re-indented to keep this a
    // minimal, low-risk diff over the existing dispatch logic.
    try {
    if (data.type === 'input') {
      const inp = room.inputs.get(ws);
      if (!inp) return;
      inp.up = !!data.up;
      inp.down = !!data.down;
      inp.left = !!data.left;
      inp.right = !!data.right;
      if (typeof data.angle === 'number') inp.angle = data.angle;
      inp.shooting = !!data.shooting;
      inp.swording = !!data.swording;
    } else if (data.type === 'fireOnce') {
      const p = room.players.get(ws);
      if (p && room.phase === 'playing' && !room.paused) attemptFire(room, ws, p, gnow(room));
    } else if (data.type === 'placeBomb') {
      const p = room.players.get(ws);
      if (p && room.phase === 'playing' && !room.paused) placeBombFor(room, p);
    } else if (data.type === 'detonateBomb') {
      const p = room.players.get(ws);
      if (p && room.phase === 'playing' && !room.paused) detonateBombsFor(room, p);
    } else if (data.type === 'pause') {
      // Either player can toggle — shared, room-scoped state, so this naturally pauses/resumes
      // for everyone in the room at once (per explicit request for 2P co-op), not just the
      // sender. Only meaningful mid-round; ignored elsewhere (waiting/countdown/finished all
      // have their own reasons nothing should be moving yet, and toggling paused there would
      // just be confusing state to reason about for no benefit).
      if (room.phase === 'playing') {
        if (room.paused) {
          room.paused = false;
          room.pauseOffsetMs += Date.now() - room.pauseStartedAtReal;
        } else {
          // gnow() must be read *before* flipping the flag below — once room.paused is true,
          // gnow() itself starts returning pauseStartedAtVirtual, so computing it after would
          // just read back whatever was already there instead of the current real moment.
          const virtualNow = gnow(room);
          room.paused = true;
          room.pauseStartedAtVirtual = virtualNow;
          room.pauseStartedAtReal = Date.now();
        }
        broadcastState(room);
      }
    } else if (data.type === 'rematch') {
      // Expected occupancy now depends on how many bosses this mode fields, not just on whether
      // it is co-op: hard mode adds a second boss, so a hard co-op room legitimately holds 4.
      if (room.phase === 'finished' && room.players.size === expectedRoomSize(room)) {
        // A finished match (someone already reached MATCH_WIN_TARGET) starts a brand new
        // best-of series on the next round; otherwise this is just the next round within
        // the current series, so the tally carries forward.
        if (room.matchOver) {
          if (room.isCpuMatch) {
            const bossIds = bossPlayers(room).map((b) => b.id);
            const humanWon = bossIds.length > 0 && !bossIds.includes(room.matchWinnerId);
            if (room.mobWaveActive) {
              // Just finished the grunt wave mini-game (clear or fail) — clear the flag and
              // either advance to the next boss or restart the story from stage 1, mirroring
              // the existing boss-clear/boss-loss branches below exactly.
              room.mobWaveActive = false;
              // syncBosses() rebuilds the whole line-up from the (new) stage rather than
              // renaming one boss in place — the old approach cannot express hard mode, where
              // a stage's boss COUNT and identities both change together.
              if (humanWon) {
                room.storyStage += 1;
                syncBosses(room);
                room.pendingStoryIntro = true;
              } else {
                room.storyStage = 1;
                resetStoryProgress(room);
                syncBosses(room);
                room.storyComplete = false;
                room.pendingStoryIntro = true;
              }
            } else if (humanWon) {
              // Boss kills are a SHARED objective — both allies fought the same 3-round series,
              // so both are paid, unlike wave mobs which go to the individual killer. Awarding
              // it on last-hit instead would swing a whole level on an arbitrary final bullet.
              // storyStage still holds the just-cleared stage here.
              for (const pl of room.players.values()) addStoryXp(pl, bossKillXp(room.storyStage));
              if (room.storyStage < (room.hardMode ? hardStageCount() : STORY_BOSSES.length)) {
                // Just cleared a boss and more stages remain — insert the grunt wave
                // mini-game before the next boss ("ボス→ミニゲーム→ボス…") instead of
                // advancing storyStage immediately; storyStage only advances once the wave
                // is later cleared (see the room.mobWaveActive branch above).
                room.mobWaveActive = true;
                room.mobWaveIndex = room.storyStage;
                room.mobWaveSpawned = 0;
                room.mobWaveKilled = 0;
                room.mobWaveNextSpawnAt = 0;
                room.monsters = [];
                room.pendingMobWaveIntro = true; // next startCountdown() gets the long wait
              } else {
                room.storyComplete = true;
              }
            } else {
              // The boss won the story — restart from stage 1. The client's primary
              // "retry" path is a fresh connection (see storyRetryBtn), but handle an
              // in-room rematch gracefully too rather than leaving story state stuck.
              room.storyStage = 1;
              resetStoryProgress(room);
              room.exBossActive = false; // a hard run must not carry a stale EX flag into stage 1
              syncBosses(room);
              room.storyComplete = false;
              room.pendingStoryIntro = true;
            }
          }
          room.matchWins = {};
          room.matchOver = false;
          room.matchWinnerId = null;
        }
        room.winnerId = null;
        startCountdown(room);
      }
    } else if (data.type === 'startExStage') {
      // Sent only from the normal-ending screen's "戦場の深部へ進む" button, i.e. right after
      // clearing stage 5 — deliberately re-derives "did they actually just clear stage 5" from
      // the same room fields the client's own finalStageClear check uses (matchOver/storyStage
      // vs STORY_BOSSES.length) rather than trusting room.storyComplete, which in the normal
      // flow never actually gets set server-side here (storyEndingOverlay shows without ever
      // sending 'rematch' — see the client's finalStageClear comment for why). !room.exBossActive
      // guards against a double-send re-triggering this mid-EX-fight.
      if (room.phase === 'finished' && room.players.size === expectedRoomSize(room) && room.isCpuMatch && room.matchOver
        && room.storyStage >= STORY_BOSSES.length && !room.exBossActive && !room.hardMode) {
        const bossIds = bossPlayers(room).map((b) => b.id);
        const humanWon = bossIds.length > 0 && !bossIds.includes(room.matchWinnerId);
        if (humanWon) {
          room.exBossActive = true;
          // syncBosses() reads exBossActive via bossIndicesFor() and rebuilds the line-up as
          // the EX boss (with its own EX_BOSS_HP), replacing the old rename-in-place.
          syncBosses(room);
          room.storyComplete = false;
          room.matchWins = {};
          room.matchOver = false;
          room.matchWinnerId = null;
          room.winnerId = null;
          room.pendingStoryIntro = true; // next startCountdown() gets the long dramatic wait
          startCountdown(room);
        }
      }
    }
    } catch (err) {
      console.error(`[room ${room.id}] message dispatch error (type=${data && data.type}):`, err);
    }
  });

  ws.on('close', () => {
    room.players.delete(ws);
    room.inputs.delete(ws);
    room.lastFire.delete(ws);
    room.buffs.delete(ws);
    if (room.isCpuMatch && room.cpuTokens.length) {
      // CPU-match rooms are private/single-use — once a human leaves, tear the bosses down
      // rather than leaving idle CPU tokens connected forever. ALL of them, not just the
      // first: a hard-mode room holds two, and leaving one behind would keep the room
      // permanently "full" and block the reconnect.
      removeAllBosses(room);
    }
    if (room.players.size < 2) {
      // A DECIDED match (someone already reached MATCH_WIN_TARGET) must stay decided. This
      // used to unconditionally revert the phase to 'waiting', which combined with joinRoom()'s
      // "room is full and waiting -> startCountdown" auto-start to produce a real, repeatedly
      // reported bug: lose the series, someone drops (in 2P co-op ANY human leaving also tears
      // out the boss token just above, so the room always falls under 2), then the moment the
      // room refills a brand-new round silently begins on top of an already-lost match — the
      // client's own "hide the finished-phase overlays once phase leaves 'finished'" sweep
      // pulls the GAME OVER screen away and play just resumes. Keeping the phase at 'finished'
      // preserves the game-over state across the drop, so the rejoining player still sees the
      // result and restarts deliberately via the retry button instead of being thrown into a
      // phantom extra round. matchOver/matchWins are deliberately NOT cleared here either —
      // reconnecting mid-series must keep the running tally (explicit earlier request).
      if (!room.matchOver) room.phase = 'waiting';
      room.winnerId = null; // the game-over screen reads matchWinnerId, not this, so clearing it is safe
      room.bullets = [];
      room.items = [];
      room.bombs = [];
      room.explosions = [];
      room.monsters = [];
    }
    broadcastState(room);
    if (room.players.size === 0) {
      if (room.loop) {
        clearInterval(room.loop);
        room.loop = null;
      }
      // Don't delete the room immediately — hold the code reserved for EMPTY_ROOM_GRACE_MS
      // in case this was just a brief drop and the same player (or a friend already holding
      // this code) reconnects/joins shortly. joinRoom() cancels this if anyone does.
      if (room.emptyRoomTimer) clearTimeout(room.emptyRoomTimer);
      room.emptyRoomTimer = setTimeout(() => {
        if (rooms.get(room.id) === room && room.players.size === 0) {
          rooms.delete(room.id);
        }
      }, EMPTY_ROOM_GRACE_MS);
    }
  });
}

module.exports = { joinRoom };
