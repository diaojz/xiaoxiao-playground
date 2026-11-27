// 猎人专用的运动与地图几何；浏览器和节点测试共用同一份实现。
const Hunter = (() => {
  const HERO_ANIM = {
    size: 116,
    headEnd: 0.54,
    legsStart: 0.78,
    seam: 2,
    speed: 225,
    acceleration: 1050,
    braking: 1320,
    blend: 0.1,
    turn: 0.1,
    stiffness: 170,
    damping: 17,
    maxLean: Math.PI / 18,
    breathPeriod: 2.4,
    breathScale: 0.025,
    bob: 1.6,
    nodMin: 4,
    nodMax: 7,
    strideHz: 2.7,
    hurt: 0.32,
    cheer: 0.65,
    attack: 0.35,
  };
  const A = HERO_ANIM;
  const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
  function velocity(vx, vy, dx, dy, speed, dt) {
    const length = Math.max(1, Math.hypot(dx, dy));
    const x = (dx / length) * speed - vx,
      y = (dy / length) * speed - vy;
    const k = Math.min(
      1,
      (dt * (dx || dy ? A.acceleration : A.braking)) / (Math.hypot(x, y) || 1),
    );
    return [vx + x * k, vy + y * k];
  }
  function spring(x, v, target, dt) {
    v += ((target - x) * A.stiffness - v * A.damping) * dt;
    return [x + v * dt, v];
  }
  function blend(age, duration = A.blend) {
    const u = clamp(age / duration, 0, 1);
    return u * u * (3 - 2 * u);
  }
  function createHero() {
    return {
      state: "IDLE",
      age: 0,
      clock: 0,
      nod: A.nodMin + Math.random() * (A.nodMax - A.nodMin),
      phase: 0,
      vx: 0,
      vy: 0,
      heading: 0,
      facing: 1,
      flip: 1,
      lean: 0,
      leanV: 0,
      head: 0,
      headV: 0,
      hurt: 0,
      cheer: 0,
      recoil: 0,
      moving: false,
      pose: Array(10).fill(0),
    };
  }
  // 姿态分量包含三层偏移、缩放和原图权重。中途打断时从已经显示的姿态继续混合。
  function animate(h, speed, swing, dizzy, dt) {
    const rate = Math.hypot(h.vx, h.vy) / speed;
    const state = dizzy
      ? "DIZZY"
      : h.hurt > 0
        ? "HURT"
        : h.cheer > 0
          ? "LEVELUP"
          : swing > 0
            ? "ATTACK"
            : !h.moving
              ? rate > 0.005
                ? "DECEL"
                : "IDLE"
              : rate + 0.02 < h.target
                ? "ACCEL"
                : "RUN";
    if (state !== h.state) {
      h.from = h.pose.slice();
      h.age = 0;
      h.state = state;
    }
    h.age += dt;
    h.clock += dt;
    h.phase += dt * 2 * Math.PI * A.strideHz * rate;
    if (h.clock > h.nod + 0.55)
      h.nod = h.clock + A.nodMin + Math.random() * (A.nodMax - A.nodMin);
    const nod = Math.sin(Math.PI * clamp((h.clock - h.nod) / 0.55, 0, 1));
    if (Math.abs(h.vx) > 3) h.facing = Math.sign(h.vx);
    h.flip += clamp(h.facing - h.flip, (-2 * dt) / A.turn, (2 * dt) / A.turn);
    if (rate > 0.01) h.heading = Math.atan2(h.vy, h.vx);
    const breath = Math.sin((h.clock * 2 * Math.PI) / A.breathPeriod);
    const stride = Math.sin(h.phase) * rate;
    const recoil = h.recoil * h.facing;
    const lean =
      state === "HURT"
        ? recoil
        : state === "DECEL"
          ? 0.95
          : state === "ACCEL"
            ? 0.95
            : state === "ATTACK"
              ? 0.85
              : 0.32 * rate;
    [h.lean, h.leanV] = spring(h.lean, h.leanV, lean * A.maxLean, dt);
    [h.head, h.headV] = spring(
      h.head,
      h.headV,
      -h.lean * 0.42 + stride * 0.035 + nod * 0.05,
      dt,
    );
    const jump =
      state === "LEVELUP"
        ? Math.sin(Math.PI * clamp(1 - h.cheer / A.cheer, 0, 1))
        : 0;
    const pose = [
      state === "IDLE"
        ? breath * A.breathScale
        : state === "ACCEL"
          ? -0.04
          : jump * 0.07,
      jump * 17 + (state === "IDLE" ? breath * A.bob : Math.abs(stride) * 2),
      stride * 2,
      Math.abs(stride) * 2,
      -stride * 0.025 + jump * 0.045,
      state === "ATTACK" ? 1 : 0,
      state === "DIZZY" ? 1 : 0,
      state === "DIZZY" ? Math.sin(h.clock * 4) * 0.09 : 0,
      state === "HURT" ? (0.5 * h.hurt) / A.hurt : 0,
      jump,
    ];
    const k = blend(h.age);
    h.pose =
      h.from && k < 1
        ? pose.map((v, i) => h.from[i] + (v - h.from[i]) * k)
        : pose;
    h.hurt = Math.max(0, h.hurt - dt);
    h.cheer = Math.max(0, h.cheer - dt);
  }
  const MAP = {
    world: 3200,
    local: 1200,
    hz: 20,
    stars: 26,
    zones: [
      {
        name: "奶油河谷",
        icon: "🌊",
        color: "#a9dbdf",
        voice: "hunter_valley",
      },
      {
        name: "糖果森林",
        icon: "🌳",
        color: "#b7dfa7",
        voice: "hunter_forest",
      },
      {
        name: "彩虹高地",
        icon: "🌈",
        color: "#e1c6ee",
        voice: "hunter_heights",
      },
    ],
  };
  const zone = (y) => (y < 1300 ? 0 : y < 2180 ? 1 : 2);
  function view(x, y, full) {
    const size = full ? MAP.world : MAP.local;
    return {
      x: clamp(x - size / 2, 0, MAP.world - size),
      y: clamp(y - size / 2, 0, MAP.world - size),
      size,
    };
  }
  const project = (x, y, v, n) => [
    ((x - v.x) * n) / v.size,
    ((y - v.y) * n) / v.size,
  ];
  function markers(drops, mobs, free, v) {
    const points = [];
    let stars = 0;
    function add(item, icon) {
      if (
        item.x >= v.x &&
        item.x <= v.x + v.size &&
        item.y >= v.y &&
        item.y <= v.y + v.size
      )
        points.push({ x: item.x, y: item.y, icon });
    }
    for (const d of drops)
      if (d.on) {
        if (d.type === "chest") add(d, "🎁");
        if (
          d.type === "star" &&
          stars < MAP.stars &&
          d.x >= v.x &&
          d.x <= v.x + v.size &&
          d.y >= v.y &&
          d.y <= v.y + v.size
        ) {
          add(d, "star");
          stars++;
        }
      }
    if (!free)
      for (const m of mobs)
        if (m.on && m.kind >= 7) {
          // 王冠在局部图外时贴边显示，打开全图即可看到精确位置。
          if (m.kind === 9)
            points.push({
              x:
                v.size === MAP.world
                  ? m.x
                  : clamp(m.x, v.x + v.size * 0.07, v.x + v.size * 0.93),
              y:
                v.size === MAP.world
                  ? m.y
                  : clamp(m.y, v.y + v.size * 0.07, v.y + v.size * 0.93),
              icon: "👑",
            });
          else add(m, "elite");
        }
    add({ x: 1460, y: 1550 }, "🏠");
    return points;
  }
  const poses = {
    IDLE: ["idle", 4, 6],
    ATTACK: ["attack", 6, A.attack],
    HURT: ["hurt", 2, A.hurt],
    LEVELUP: ["cheer", 3, A.cheer],
    DIZZY: ["faint", 3, 0.7],
  };
  const enemyAnim = {
    rate: [7, 3, 9, 5, 4, 17, 8, 3, 5, 3],
    squash: [0.09, 0.035, 0.025, 0.12, 0.02, 0.055, 0.11, 0.095, 0.035, 0.045],
    entrance: 0.45,
    leap: 0.36,
    leapHeight: 90,
  };
  return {
    HERO_ANIM,
    enemyAnim,
    xp: (level) => 8 + 6 * level,
    choiceDue: (level, count, pending) =>
      level % 3 === 0 && count < 4 && !pending,
    choiceExpired: (now, born) => now - born >= 12,
    frame(state, age, phase) {
      if (!poses[state])
        return ["run", Math.floor((phase / (2 * Math.PI)) * 8) % 8];
      const [name, count, duration] = poses[state];
      // 眨眼只占一瞬，挥手后让表情回到静息。
      if (state === "IDLE") {
        const beat = age % duration;
        return [
          name,
          beat < 2.0
            ? 0
            : beat < 2.14
              ? 1
              : beat < 4.6
                ? 3
                : beat < 5.25
                  ? 2
                  : 0,
        ];
      }
      const index = Math.floor((age / duration) * count);
      return [name, Math.min(count - 1, index)];
    },
    MAP,
    velocity,
    spring,
    blend,
    createHero,
    animate,
    zone,
    view,
    project,
    markers,
  };
})();
if (typeof module === "object") module.exports = Hunter;
