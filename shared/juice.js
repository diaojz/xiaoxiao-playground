// 固定容量的对象复用池。清空时只回收槽位，避免战斗时频繁分配。
(() => {
  class Pool {
    constructor(limit) {
      this.items = Array.from({ length: limit }, () => ({ on: false }));
    }
    take(data) {
      const slot = this.items.find((item) => !item.on);
      if (slot) Object.assign(slot, data, { on: true });
      return slot;
    }
    clear() {
      for (const item of this.items) item.on = false;
    }
    count() {
      return this.items.reduce((n, item) => n + Number(item.on), 0);
    }
  }
  class Grid {
    constructor() {
      this.cells = new Map();
    }
    rebuild(items) {
      this.cells.clear();
      for (const item of items)
        if (item.on) {
          const key = Math.floor(item.x / 128) + "," + Math.floor(item.y / 128);
          if (!this.cells.has(key)) this.cells.set(key, []);
          this.cells.get(key).push(item);
        }
    }
    near(x, y, r) {
      const hits = [];
      for (
        let i = Math.floor((x - r) / 128);
        i <= Math.floor((x + r) / 128);
        i++
      )
        for (
          let j = Math.floor((y - r) / 128);
          j <= Math.floor((y + r) / 128);
          j++
        )
          for (const e of this.cells.get(i + "," + j) || [])
            if (e.on && (x - e.x) ** 2 + (y - e.y) ** 2 <= r * r) hits.push(e);
      return hits;
    }
  }
  const attack = (bonus, upgrades) => (10 + bonus) * (1 + 0.15 * upgrades);
  function damage(
    atk,
    def,
    level,
    spread = Math.random(),
    roll = Math.random(),
  ) {
    const critical = roll < Math.min(1, 0.15 + 0.01 * (level - 1));
    return {
      critical,
      value:
        Math.max(1, Math.round(atk * (0.9 + 0.2 * spread) - def * 0.5)) *
        (critical ? 2 : 1),
    };
  }
  const wave = (seconds, base = 20, rank = 1) => ({
    hp: base * (1 + (0.12 * seconds) / 60) * rank,
    rate: 0.5 + (0.15 * seconds) / 60,
    hit: 3 + seconds / 60,
  });
  const colors = ["#ff79a3", "#ffda58", "#61d6cb", "#ab98fb", "#fff7cf"];
  function burst(pool, x, y, n, limit = 300) {
    n = Math.min(n, limit - pool.count());
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        speed = 55 + Math.random() * 160;
      pool.take({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 60,
        life: 0.45 + Math.random() * 0.55,
        color: colors[i % 5],
        r: 3 + Math.random() * 6,
      });
    }
  }
  const api = {
    Pool,
    Grid,
    attack,
    damage,
    wave,
    burst,
    colors,
    maxEnemies: 80,
    xp: (l) => 5 + 4 * l,
    hp: (l) => 100 + 10 * l,
  };
  if (typeof module === "object") module.exports = api;
  if (typeof window === "object") window.KidJuice = api;
})();
