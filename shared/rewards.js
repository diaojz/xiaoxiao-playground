// 七款游戏共用的奖励存档。纯逻辑可用独立存储和时钟测试。
(function (root) {
  'use strict';
  const outfits = ['crown', 'party', 'star', 'bear', 'cap', 'wizard'];
  const dayKey = date => [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map(value => String(value).padStart(2, '0')).join('-');
  const dayNumber = key => Date.parse(key + 'T00:00:00Z') / 86400000;
  const tasks = { learn: 1, read: 5, review: 1 };
  const count = value => Number.isSafeInteger(value) && value > 0 ? value : 0;

  function createRewards({ storage, key = 'kidRewards', now = () => new Date(), random = Math.random } = {}) {
    let memory;
    function read() {
      let raw;
      try { raw = JSON.parse(storage?.getItem(key)); } catch (_) {}
      return JSON.parse(JSON.stringify(memory ?? raw ?? {}));
    }
    function state() {
      const raw = read();
      const owned = outfits.filter(id => Array.isArray(raw.outfits) && raw.outfits.includes(id));
      const date = dayKey(now());
      return {
        flowers: count(raw.flowers), chestsOpened: count(raw.chestsOpened),
        bonusChests: count(raw.bonusChests), outfits: owned,
        outfit: owned.includes(raw.outfit) ? raw.outfit : null,
        medals: raw.medals && typeof raw.medals === 'object' ? { ...raw.medals } : {},
        streak: { last: raw.streak?.last || '', days: count(raw.streak?.days) },
        daily: { date, tasks: Object.fromEntries(Object.entries(tasks).map(([id, goal]) =>
          [id, Math.min(goal, raw.daily?.date === date ? count(raw.daily.tasks?.[id]) : 0)])) },
        migrations: raw.migrations && typeof raw.migrations === 'object' ? { ...raw.migrations } : {}
      };
    }
    function update(change) {
      const next = state();
      const result = change(next);
      if (result === false || result === null) return result;
      try {
        if (storage) { storage.setItem(key, JSON.stringify(next)); memory = undefined; }
        else memory = next;
      } catch (_) { memory = next; }
      return result;
    }
    const available = value => Math.max(0, Math.floor(value.flowers / 10) + value.bonusChests - value.chestsOpened);
    function add(value, n) { value.flowers = Math.min(Number.MAX_SAFE_INTEGER, value.flowers + count(n)); }
    return {
      getState: state,
      availableChests: () => available(state()),
      addFlowers(n, from) {
        return update(value => { add(value, n); return value.flowers; });
      },
      migrateFlowers(id, n) {
        return update(value => {
          if (Object.hasOwn(value.migrations, id)) return false;
          add(value, n);
          value.migrations[id] = true;
          return true;
        });
      },
      equipOutfit(id) {
        return update(value => {
          if (id !== null && !value.outfits.includes(id)) return false;
          value.outfit = id;
          return true;
        });
      },
      openChest() {
        return update(value => {
          if (!available(value)) return null;
          const locked = outfits.filter(id => !value.outfits.includes(id));
          const pool = locked.length ? locked : outfits;
          const id = pool[Math.floor(random() * pool.length)];
          if (locked.length) value.outfits.push(id);
          value.chestsOpened++;
          return id;
        });
      },
      awardMedal(id) {
        return update(value => {
          if (Object.hasOwn(value.medals, id)) return false;
          Object.defineProperty(value.medals, id, { value: true, enumerable: true });
          return true;
        });
      },
      touchStreak() {
        return update(value => {
          const today = dayKey(now());
          const delta = dayNumber(today) - dayNumber(value.streak.last);
          if (delta <= 0) return value.streak.days;
          value.streak = { last: today, days: delta === 1 ? value.streak.days + 1 : 1 };
          return value.streak.days;
        });
      },
      advanceDaily(id) {
        if (!Object.hasOwn(tasks, id)) return false;
        return update(value => {
          const progress = value.daily.tasks;
          if (progress[id] >= tasks[id]) return false;
          progress[id]++;
          const completed = progress[id] === tasks[id];
          if (completed) {
            add(value, 2);
            if (Object.keys(tasks).every(task => progress[task] === tasks[task])) value.bonusChests++;
          }
          return completed ? 2 : 0;
        });
      }
    };
  }

  function flyFlower(fromEl) {
    const target = root.document.querySelector('[data-flower-counter]');
    if (!target || !fromEl || root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.document.querySelectorAll('.flying-flower').forEach(node => node.remove());
    const from = fromEl.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const x = from.x + from.width / 2;
    const y = from.y + from.height / 2;
    const dx = to.x + to.width / 2 - x;
    const dy = to.y + to.height / 2 - y;
    const flower = root.document.createElement('span');
    flower.className = 'flying-flower';
    flower.setAttribute('aria-hidden', 'true');
    Object.assign(flower.style, {
      position: 'fixed', left: x + 'px', top: y + 'px', pointerEvents: 'none',
      zIndex: 20, fontSize: 'clamp(56px, 11vmin, 112px)', lineHeight: 1
    });
    const image = root.document.querySelector('[data-flower-counter] img');
    flower.textContent = '🌺';
    if (image?.complete && image.naturalWidth) {
      const copy = image.cloneNode();
      copy.style.cssText = 'display:block;width:1em;height:1em;object-fit:contain';
      flower.replaceChildren(copy);
    }
    const trail = root.document.createElement('span');
    trail.textContent = '✦ ⋆';
    trail.style.cssText = 'position:absolute;left:-.45em;top:.55em;color:#ffed86;font-size:.6em;text-shadow:0 0 8px #ff8f24';
    flower.append(trail);
    root.document.body.append(flower);
    flower.animate([
      { transform: 'translate(-50%, -50%) scale(.85)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * .36}px), calc(-50% + ${dy * .38 - 65}px)) scale(1.1) rotate(15deg)`, opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.22)`, opacity: .7 }
    ], { duration: 850, easing: 'ease-in-out' }).finished.then(() => flower.remove(), () => flower.remove());
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createRewards };
  if (root?.document) {
    let storage;
    try { storage = root.localStorage; } catch (_) {}
    const key = new URLSearchParams(root.location.search).has('qa') ? 'kidRewardsQA' : 'kidRewards';
    root.KidRewards = { ...createRewards({ storage, key }), flyFlower };
  }
})(typeof window === 'undefined' ? null : window);
