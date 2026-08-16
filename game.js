// Authoritative game/room logic shared by all WebSocket connections.
const WebSocket = require('ws');

const ARENA_W = 800;
const ARENA_H = 600;
const BASE_PLAYER_SPEED = 220; // px/sec
const PLAYER_RADIUS = 16;
const BULLET_SPEED = 480; // px/sec
const BULLET_RADIUS = 5;
const BASE_FIRE_COOLDOWN_MS = 250;
const MAX_HP = 100;
const BASE_BULLET_DAMAGE = 12;
const TICK_MS = 1000 / 30;

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
const HOUSE_SIZE_MIN = 80;
const HOUSE_SIZE_MAX = 120;
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
const GOLDEN_CHICKEN_ITEM_COUNT = 3;
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

  const pieceCount = 6 + Math.floor(Math.random() * 4); // 6-9 mirrored pieces total (walls+blocks)
  const walls = [];
  const blocks = [];
  const allPlaced = [];
  let blockId = 0;
  let placed = 0;
  let attempts = 0;

  while (placed < pieceCount && attempts < 320) {
    attempts++;
    const piece = makePiece();
    const rects = piece.rects;

    const inBounds = rects.every(
      (r) => r.x >= 20 && r.x + r.w <= 380 && r.y >= 20 && r.y + r.h <= ARENA_H - 20
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
    if (room.storyCoop && !!shooter.isBoss === !!op.isBoss) continue; // co-op: never friendly fire
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
    const atkMult = shooterWs === room.cpuToken ? cpuAttackMult(room) : 1;
    applyDamage(room, hitTargetWs, hitTarget, LASER_DAMAGE * atkMult, now);
  } else if (hitMonster) {
    hitMonster.hp -= LASER_DAMAGE;
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
  const fireCooldown = buffs && now < buffs.rapid ? BASE_FIRE_COOLDOWN_MS / RAPID_BUFF_DIVISOR : BASE_FIRE_COOLDOWN_MS;
  const dmgMult = buffs && now < buffs.power ? POWER_BUFF_MULT : 1;
  const bigMult = buffs && now < buffs.big ? BIG_BULLET_MULT : 1;
  const laserActive = buffs && now < buffs.laser;
  const atkMult = ws === room.cpuToken ? cpuAttackMult(room) : 1;

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
  const range = rangeActive ? SWORD_RANGE * SWORD_RANGE_BUFF_MULT : SWORD_RANGE;

  for (const origin of attackOrigins(room, ws, p, now)) {
    let hitTarget = null;
    let hitTargetWs = null;
    for (const [ows, op] of room.players) {
      if (ows === ws || !op.alive) continue;
      if (room.storyCoop && !!p.isBoss === !!op.isBoss) continue; // co-op: never friendly fire
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
      const atkMult = ws === room.cpuToken ? cpuAttackMult(room) * cpuSwordMult(room) : 1;
      applyDamage(room, hitTargetWs, hitTarget, SWORD_DAMAGE * atkMult, now);
    } else if (hitMonster) hitMonster.hp -= SWORD_DAMAGE;
    else if (hitBlock) hitBlock.hp -= SWORD_DAMAGE;
  }
}

// Explodes a single placed bomb — everyone within blast radius takes damage, including
// the bomb's own owner if they're still standing close (deliberate risk/reward, not a bug).
// Also instantly destroys any destructible block caught in the blast, regardless of its
// remaining hp — a bomb is a lot more powerful than a single bullet, so no partial damage.
function explodeBomb(room, bomb, now) {
  const cpuPlayer = room.isCpuMatch ? room.players.get(room.cpuToken) : null;
  const isCpuBomb = cpuPlayer && bomb.ownerId === cpuPlayer.id;
  for (const [pws, pl] of room.players) {
    if (!pl.alive) continue;
    const isSelf = pl.id === bomb.ownerId;
    // Co-op: a human's own bomb never hurts their ally — but self-damage (isSelf) and the
    // boss's own bomb hitting a human are both untouched, same "deliberate risk/reward for
    // the owner" as always. Only reachable when room.storyCoop, so 1P/arena bomb behavior
    // (where !isCpuBomb just means "a human's bomb" and there's no ally to protect) is
    // completely unaffected.
    if (room.storyCoop && !isSelf && !isCpuBomb && !pl.isBoss) continue;
    const d = Math.hypot(pl.x - bomb.x, pl.y - bomb.y);
    if (d < BOMB_RADIUS + PLAYER_RADIUS) {
      // Only the boss's outgoing blast against the human is scaled — a boss caught in its
      // own bomb (pws === room.cpuToken) still takes the full hit, same as always.
      const dmg = isCpuBomb && pws !== room.cpuToken ? BOMB_DAMAGE * cpuAttackMult(room) : BOMB_DAMAGE;
      applyDamage(room, pws, pl, dmg, now);
    }
  }
  for (const m of room.monsters) {
    if (m.hp <= 0) continue;
    const d = Math.hypot(m.x - bomb.x, m.y - bomb.y);
    if (d < BOMB_RADIUS + monsterRadius(m)) {
      m.hp -= BOMB_DAMAGE; // one-shots a regular monster (exceeds its 25 max hp); a gold
      // monster's boosted hp pool (75) survives a single blast, needing a second hit
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
  const now = Date.now();
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
  { name: '血刃の暗殺者', line: '無駄な足掻きだ。闇に潜むこの一振りが、貴様の命を刈り取る。', defeatLine: 'くっ……この闇より深い一撃とはな。だが、あの御方の前ではまだ児戯に等しい。', reactionMs: 200, aimJitter: 0.16, fireChance: 0.90, dodgeChance: 0.68, itemSeekChance: 0.78, preferredRange: 220, moveJitter: 0.16, atkMult: 1.0, swordMult: 1.5 },
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

// ---- 2-player co-op story mode ----
// Same 5 named bosses/story text as 1P (name/line/defeatLine reused verbatim from
// STORY_BOSSES so the certificate/narrative stay unified — this is the same campaign, not a
// different one), but with freshly-designed AI behavior for facing 2 humans at once instead
// of 1: a per-stage HP multiplier (a boss with only MAX_HP would fall in seconds against
// double the firepower, so it needs a genuinely bigger health pool, not just tougher AI) plus
// somewhat sharper reflexes/evasion than the 1P curve at the same stage number, reflecting
// "juggling two attackers demands it." atkMult/swordMult are deliberately NOT overridden here
// (inherited as-is from STORY_BOSSES via the spread below) — per-hit damage against any one
// ally doesn't need to go up just because there's a second ally elsewhere; HP/evasion are the
// right levers for "harder because there are two of you," not raw hit damage.
const STORY_BOSSES_2P_TUNING = [
  { hpMult: 1.7, reactionMs: 520, aimJitter: 0.58, fireChance: 0.45, dodgeChance: 0.18, itemSeekChance: 0.25, preferredRange: 280, moveJitter: 0.55 },
  { hpMult: 1.9, reactionMs: 380, aimJitter: 0.40, fireChance: 0.65, dodgeChance: 0.38, itemSeekChance: 0.42, preferredRange: 260, moveJitter: 0.38 },
  { hpMult: 2.1, reactionMs: 260, aimJitter: 0.26, fireChance: 0.82, dodgeChance: 0.58, itemSeekChance: 0.60, preferredRange: 240, moveJitter: 0.25 },
  { hpMult: 2.3, reactionMs: 170, aimJitter: 0.14, fireChance: 0.92, dodgeChance: 0.76, itemSeekChance: 0.78, preferredRange: 226, moveJitter: 0.14 },
  { hpMult: 2.6, reactionMs: 85, aimJitter: 0.04, fireChance: 1.00, dodgeChance: 0.95, itemSeekChance: 0.95, preferredRange: 214, moveJitter: 0.05 },
];
const STORY_BOSSES_2P = STORY_BOSSES.map((b, i) => ({ ...b, ...STORY_BOSSES_2P_TUNING[i] }));

function bossNameForStage(stage) {
  const s = Math.min(Math.max(1, stage || 1), STORY_BOSSES.length);
  return `${s}面ボス「${STORY_BOSSES[s - 1].name}」`;
}

// 1 outside story mode (or for the human's own attacks); the current stage boss's atkMult
// when the attacker is the CPU — the single point every CPU-dealt-damage site reads from.
function cpuAttackMult(room) {
  if (!room.isCpuMatch) return 1;
  if (room.exBossActive) return EX_BOSS.atkMult;
  const s = Math.min(Math.max(1, room.storyStage || 1), STORY_BOSSES.length);
  return STORY_BOSSES[s - 1].atkMult;
}

// Same idea as cpuAttackMult but for the sword-specific bonus (stage 4's knife specialist).
function cpuSwordMult(room) {
  if (!room.isCpuMatch) return 1;
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

function addCpuPlayer(room, stage) {
  const s = Math.min(Math.max(1, stage || 1), STORY_BOSSES.length);
  const cpuToken = { cpu: true };
  const idx = room.players.size;
  const sp = getSpawnPoints(room)[idx] || { x: ARENA_W - 120, y: ARENA_H / 2 };
  // Co-op boss gets a bigger health pool (see STORY_BOSSES_2P_TUNING's comment for why) —
  // maxHp is tracked per-player (not just the flat MAX_HP constant) so resetPositions()/the
  // heal item/house-heal caps all respect it instead of clamping a boosted-HP boss back down.
  const maxHp = room.storyCoop ? Math.round(MAX_HP * STORY_BOSSES_2P_TUNING[s - 1].hpMult) : MAX_HP;
  const player = {
    id: 'cpu-' + Math.random().toString(36).slice(2, 8),
    name: bossNameForStage(s),
    line: bossLineForStage(s),
    defeatLine: bossDefeatLineForStage(s),
    x: sp.x,
    y: sp.y,
    angle: 0,
    hp: maxHp,
    maxHp,
    isBoss: true,
    alive: true,
    bombs: 0,
    shieldAmount: 0,
  };
  room.players.set(cpuToken, player);
  room.inputs.set(cpuToken, { up: false, down: false, left: false, right: false, angle: 0, shooting: false, swording: false });
  room.buffs.set(cpuToken, freshBuffs());
  room.isCpuMatch = true;
  room.cpuToken = cpuToken;
  room.storyStage = s;
  room.cpuState = null;
  room.pendingStoryIntro = true; // consumed by the next startCountdown() — see its comment
}

function updateCpuAI(room, now) {
  // The 2-human co-op story mode needs genuinely different targeting (pick between two
  // allies) and gets its own dedicated function below rather than being folded into this
  // one — keeps every line below completely untouched for the existing 1P/EX-boss path.
  if (room.storyCoop) return updateCpuAICoop(room, now);

  const cpuToken = room.cpuToken;
  const cpu = room.players.get(cpuToken);
  const inp = room.inputs.get(cpuToken);
  if (!cpu || !inp) return;
  if (!cpu.alive) {
    inp.up = inp.down = inp.left = inp.right = false;
    inp.shooting = false;
    inp.swording = false;
    return;
  }

  const human = [...room.players.values()].find((p) => p !== cpu);
  if (!human || !human.alive) {
    inp.up = inp.down = inp.left = inp.right = false;
    inp.shooting = false;
    inp.swording = false;
    return;
  }

  const cfg = room.exBossActive ? EX_BOSS : STORY_BOSSES[Math.min(Math.max(1, room.storyStage || 1), STORY_BOSSES.length) - 1];
  if (!room.cpuState) {
    room.cpuState = {
      lastDecisionAt: 0,
      targetDx: 0,
      targetDy: 0,
      aimJitterVal: 0,
      firing: false,
      strafeSign: Math.random() < 0.5 ? 1 : -1,
      lastPos: { x: cpu.x, y: cpu.y },
    };
  }
  const st = room.cpuState;

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
  // shooting instead of running a whole separate decision cycle for it.
  const distToHumanNow = Math.hypot(human.x - cpu.x, human.y - cpu.y);
  inp.swording = distToHumanNow <= SWORD_RANGE + PLAYER_RADIUS;
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
function updateCpuAICoop(room, now) {
  const cpuToken = room.cpuToken;
  const cpu = room.players.get(cpuToken);
  const inp = room.inputs.get(cpuToken);
  if (!cpu || !inp) return;
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

  const cfg = STORY_BOSSES_2P[Math.min(Math.max(1, room.storyStage || 1), STORY_BOSSES_2P.length) - 1];
  if (!room.cpuState) {
    room.cpuState = {
      lastDecisionAt: 0,
      targetDx: 0,
      targetDy: 0,
      aimJitterVal: 0,
      firing: false,
      strafeSign: Math.random() < 0.5 ? 1 : -1,
      lastPos: { x: cpu.x, y: cpu.y },
      targetAllyId: null,
    };
  }
  const st = room.cpuState;
  let human = allies.find((p) => p.id === st.targetAllyId);

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
  inp.swording = distToHumanNow <= SWORD_RANGE + PLAYER_RADIUS;
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
      cpuToken: null,
      storyStage: 1,
      storyComplete: false,
      exBossActive: false,
      storyCoop: false, // true only for the new 2-human co-op story room type — set once,
        // by the very first joiner, in joinRoom() below. Every other CPU-match code path
        // (1P story, the EX boss) leaves this false and is completely unaffected by it.
      pendingStoryIntro: false,
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
      lastTick: Date.now(),
    };
    rooms.set(id, room);
  }
  return room;
}

function resetPositions(room) {
  const arr = [...room.players.values()];
  const spawnPoints = getSpawnPoints(room);
  arr.forEach((p, idx) => {
    const sp = spawnPoints[idx] || spawnPoints[spawnPoints.length - 1];
    p.x = sp.x;
    p.y = sp.y;
    p.hp = p.maxHp || MAX_HP;
    p.alive = true;
    p.bombs = 0;
    p.shieldAmount = 0;
  });
  room.bullets = [];
  room.items = [];
  room.nextItemSpawnAt = Date.now() + 3000;
  const generated = generateWallsAndBlocks(room);
  room.walls = generated.walls;
  room.blocks = generated.blocks;
  room.trees = generateTrees(room.walls, room.blocks, room);
  room.houses = generateHouses(room.walls, room.trees, room.blocks, room); // mutates room.walls in place, appending each house's 3 wall segments
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
  room.nextMonsterSpawnAt = Date.now() + MONSTER_SPAWN_MIN_MS + Math.random() * (MONSTER_SPAWN_MAX_MS - MONSTER_SPAWN_MIN_MS);
  for (const ws of room.buffs.keys()) {
    room.buffs.set(ws, freshBuffs());
  }
  // A pending roulette win from the round that just ended is granted now, at the start of
  // the round it actually gets to be used in — applied after the buffs reset above so it
  // isn't immediately wiped by it.
  if (room.rouletteResult && room.rouletteResult.hit) {
    for (const [ws, p] of room.players) {
      if (p.id === room.rouletteResult.winnerId) {
        applyItemEffect(room, ws, p, room.rouletteResult.itemType, Date.now());
        break;
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
  // Only the round that actually introduces a *new* stage gets the long wait — every other
  // round (round 2/3 of the same boss's best-of-3, or a plain human-vs-human rematch) keeps
  // the normal countdown, matching the client's own "show the boss card once per stage, not
  // once per round" rule (introShownForStage).
  const waitMs = room.isCpuMatch && room.pendingStoryIntro ? STORY_INTRO_WAIT_MS : 3000;
  room.countdownEndsAt = Date.now() + waitMs;
  room.pendingStoryIntro = false;
  resetPositions(room);
  broadcastWalls(room);
}

function ensureLoop(room) {
  if (room.loop) return;
  room.lastTick = Date.now();
  room.loop = setInterval(() => tick(room), TICK_MS);
}

function pickWeightedItemType() {
  let r = Math.random() * ITEM_WEIGHT_TOTAL;
  for (const [type, w] of Object.entries(ITEM_WEIGHTS)) {
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

function monsterRadius(m) {
  return m.chicken ? GOLDEN_CHICKEN_RADIUS : m.gold ? GOLD_MONSTER_RADIUS : MONSTER_RADIUS;
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
  const gold = !chicken && Math.random() < GOLD_MONSTER_CHANCE;
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

function tick(room) {
  const now = Date.now();
  const dt = Math.min(0.05, (now - room.lastTick) / 1000);
  room.lastTick = now;

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
      const speed = monster.chicken ? GOLDEN_CHICKEN_SPEED : monster.gold ? GOLD_MONSTER_SPEED : MONSTER_SPEED;
      const contactDamage = monster.gold ? Math.round(MONSTER_CONTACT_DAMAGE * GOLD_MONSTER_CONTACT_DAMAGE_MULT) : MONSTER_CONTACT_DAMAGE;

      let target = null;
      let bestDist = Infinity;
      for (const [, p] of room.players) {
        if (!p.alive) continue;
        const d = Math.hypot(p.x - monster.x, p.y - monster.y);
        if (d < bestDist) { bestDist = d; target = p; }
      }
      if (target) {
        // chicken runs from whoever's nearest instead of homing toward them — same
        // nearest-player targeting, just the opposite direction
        const sign = monster.chicken ? -1 : 1;
        let dx = (target.x - monster.x) * sign;
        let dy = (target.y - monster.y) * sign;
        let len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        if (monster.chicken) {
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
          const centerBias = 0.45 + edgeFactor * 0.45; // 0.45 at dead-center, up to 0.9 near an edge
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
          return false;
        }
      }
      for (const [pws, p] of room.players) {
        if (p.id === b.ownerId || !p.alive) continue;
        if (room.storyCoop && !!b.ownerIsBoss === !!p.isBoss) continue; // co-op: never friendly fire
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

    if (room.monsters.length < MONSTER_MAX_COUNT && now >= room.nextMonsterSpawnAt) {
      spawnMonster(room);
      room.nextMonsterSpawnAt = now + MONSTER_SPAWN_MIN_MS + Math.random() * (MONSTER_SPAWN_MAX_MS - MONSTER_SPAWN_MIN_MS);
    }
    // dying monsters drop an item where they fell — checked once per tick here rather than
    // at each individual damage site (bullet/laser/sword/bomb), since it needs to catch a
    // kill from any of those four sources uniformly without duplicating this logic 4 times
    for (const m of room.monsters) {
      if (m.hp <= 0) {
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

    if (room.storyCoop) {
      // 3-player win condition: the round ends when either the whole boss side or the
      // whole ally side is wiped out — "the other 2 total players, one of them dead" no
      // longer uniquely identifies a winner once there are 3 players in the room, so this
      // is a genuinely separate check from the else branch below, not a tweak to it.
      const allPlayers = [...room.players.values()];
      const boss = allPlayers.find((pl) => pl.isBoss);
      const allies = allPlayers.filter((pl) => !pl.isBoss);
      const bossDead = boss && !boss.alive;
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
          room.matchWins[winnerId] = (room.matchWins[winnerId] || 0) + 1;
          if (room.matchWins[winnerId] >= MATCH_WIN_TARGET) {
            room.matchOver = true;
            room.matchWinnerId = winnerId;
          }
          if (room.rouletteEnabled) {
            const hit = Math.random() < 0.5; // 50% miss, per spec
            room.rouletteResult = { winnerId, hit, itemType: hit ? pickWeightedItemType() : null };
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
          room.matchWins[winner.id] = (room.matchWins[winner.id] || 0) + 1;
          if (room.matchWins[winner.id] >= MATCH_WIN_TARGET) {
            room.matchOver = true;
            room.matchWinnerId = winner.id;
          }
          if (room.rouletteEnabled) {
            const hit = Math.random() < 0.5; // 50% miss, per spec
            room.rouletteResult = {
              winnerId: winner.id,
              hit,
              itemType: hit ? pickWeightedItemType() : null,
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
  const now = Date.now();
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
    countdown: room.phase === 'countdown' ? Math.max(0, Math.ceil((room.countdownEndsAt - Date.now()) / 1000)) : 0,
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
    storyStageCount: STORY_BOSSES.length,
    storyComplete: room.storyComplete,
    exBossActive: room.exBossActive,
    storyCoop: room.storyCoop,
  };
  const msg = JSON.stringify(state);
  for (const ws of room.players.keys()) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

function joinRoom(roomId, ws, name, wantsStoryCpu, roulette, wantsCoop) {
  const room = getRoom(roomId);
  // Decided once, by the very first joiner, same pattern as rouletteEnabled below — must
  // happen before the capacity check right after it, since that check needs to already know
  // whether this room targets 2 players (arena/1P story) or 3 (2-human co-op story).
  if (room.players.size === 0 && wantsStoryCpu && wantsCoop) {
    room.storyCoop = true;
  }
  const maxPlayers = room.storyCoop ? 3 : 2;
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
  const humanTargetForCpu = room.storyCoop ? 2 : 1;
  if (wantsStoryCpu && room.players.size === humanTargetForCpu) {
    addCpuPlayer(room, 1); // story mode always starts at stage 1
  }

  ws.send(JSON.stringify({
    type: 'welcome',
    id: pid,
    isCpuMatch: room.isCpuMatch,
    storyStage: room.storyStage,
    storyStageCount: STORY_BOSSES.length,
    storyCoop: room.storyCoop,
    rouletteEnabled: room.rouletteEnabled,
    arena: { w: ARENA_W, h: ARENA_H, walls: room.walls, trees: room.trees, houses: room.houses },
  }));
  broadcastState(room);

  if (room.players.size === maxPlayers && room.phase === 'waiting') startCountdown(room);
  ensureLoop(room);

  ws.on('message', (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
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
      if (p && room.phase === 'playing') attemptFire(room, ws, p, Date.now());
    } else if (data.type === 'placeBomb') {
      const p = room.players.get(ws);
      if (p && room.phase === 'playing') placeBombFor(room, p);
    } else if (data.type === 'detonateBomb') {
      const p = room.players.get(ws);
      if (p && room.phase === 'playing') detonateBombsFor(room, p);
    } else if (data.type === 'rematch') {
      if (room.phase === 'finished' && room.players.size === (room.storyCoop ? 3 : 2)) {
        // A finished match (someone already reached MATCH_WIN_TARGET) starts a brand new
        // best-of series on the next round; otherwise this is just the next round within
        // the current series, so the tally carries forward.
        if (room.matchOver) {
          if (room.isCpuMatch) {
            const cpuPlayer = room.players.get(room.cpuToken);
            const humanWon = cpuPlayer && room.matchWinnerId !== cpuPlayer.id;
            if (humanWon) {
              if (room.storyStage < STORY_BOSSES.length) {
                room.storyStage += 1;
                if (cpuPlayer) {
                  cpuPlayer.name = bossNameForStage(room.storyStage);
                  cpuPlayer.line = bossLineForStage(room.storyStage);
                  cpuPlayer.defeatLine = bossDefeatLineForStage(room.storyStage);
                }
                room.cpuState = null; // fresh AI decision cadence for the new boss's params
                room.pendingStoryIntro = true; // next startCountdown() gets the long wait
              } else {
                room.storyComplete = true;
              }
            } else {
              // The boss won the story — restart from stage 1. The client's primary
              // "retry" path is a fresh connection (see storyRetryBtn), but handle an
              // in-room rematch gracefully too rather than leaving story state stuck.
              room.storyStage = 1;
              if (cpuPlayer) {
                cpuPlayer.name = bossNameForStage(1);
                cpuPlayer.line = bossLineForStage(1);
                cpuPlayer.defeatLine = bossDefeatLineForStage(1);
              }
              room.cpuState = null;
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
      if (room.phase === 'finished' && room.players.size === (room.storyCoop ? 3 : 2) && room.isCpuMatch && room.matchOver
        && room.storyStage >= STORY_BOSSES.length && !room.exBossActive) {
        const cpuPlayer = room.players.get(room.cpuToken);
        const humanWon = cpuPlayer && room.matchWinnerId !== cpuPlayer.id;
        if (humanWon) {
          room.exBossActive = true;
          if (cpuPlayer) {
            cpuPlayer.name = EX_BOSS.name;
            cpuPlayer.line = EX_BOSS.line;
            cpuPlayer.defeatLine = EX_BOSS.defeatLine;
          }
          room.cpuState = null;
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
  });

  ws.on('close', () => {
    room.players.delete(ws);
    room.inputs.delete(ws);
    room.lastFire.delete(ws);
    room.buffs.delete(ws);
    if (room.isCpuMatch && room.cpuToken) {
      // CPU-match rooms are private/single-use — once the human leaves, tear the
      // whole room down rather than leaving an idle CPU token connected forever.
      room.players.delete(room.cpuToken);
      room.inputs.delete(room.cpuToken);
      room.lastFire.delete(room.cpuToken);
      room.buffs.delete(room.cpuToken);
    }
    if (room.players.size < 2) {
      room.phase = 'waiting';
      room.winnerId = null;
      room.bullets = [];
      room.items = [];
      room.bombs = [];
      room.explosions = [];
    }
    broadcastState(room);
    if (room.players.size === 0 && room.loop) {
      clearInterval(room.loop);
      room.loop = null;
      rooms.delete(room.id);
    }
  });
}

module.exports = { joinRoom };
