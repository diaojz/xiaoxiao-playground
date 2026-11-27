// 素材只在加载时缩放一次。保留原图比例，接缝留窄搭边供轻微旋转。
function sliceHero(tile, makeCanvas) {
  const a = Hunter.HERO_ANIM,
    n = tile.height;
  const cuts = [0, Math.round(n * a.headEnd), Math.round(n * a.legsStart), n];
  return cuts.slice(0, 3).map((top, i) => {
    const layer = makeCanvas();
    layer.width = n;
    layer.height = Math.min(n, cuts[i + 1] + a.seam) - top;
    layer
      .getContext("2d")
      .drawImage(tile, 0, top, n, layer.height, 0, 0, n, layer.height);
    return { layer, top };
  });
}
function paintHero(g, h, sets, x, y, soft) {
  const n = Hunter.HERO_ANIM.size,
    [stretch, lift, legX, legY, twist, attack, dizzy, sway, flash, jump] =
      h.pose;
  g.save();
  g.translate(x, y + n * 0.46);
  g.fillStyle = "#537b6059";
  g.beginPath();
  g.ellipse(
    0,
    0,
    32 * (1 - jump * 0.24 - stretch),
    8 * (1 - jump * 0.18),
    0,
    0,
    Math.PI * 2,
  );
  g.fill();
  g.translate(0, -lift);
  g.scale(h.flip, 1 + stretch);
  g.rotate(h.lean + sway);
  function draw(layers, alpha) {
    if (!layers || alpha <= 0) return;
    g.globalAlpha = alpha;
    for (const i of [2, 1, 0]) {
      const { top, layer } = layers[i],
        pivot = top + layer.height - n;
      g.save();
      g.translate(i === 2 ? legX : 0, pivot - (i === 2 ? legY : 0));
      g.rotate(i === 0 ? h.head : i === 1 ? twist + attack * 0.055 : -twist);
      g.drawImage(layer, -n / 2, -layer.height);
      g.restore();
    }
  }
  const idle = sets.hero_idle || sets.kid;
  draw(idle, 1 - Math.max(attack, dizzy));
  draw(sets.hero_attack || idle, attack);
  draw(sets.hero_dizzy || idle, dizzy);
  if (!soft) draw(sets.hero_idle_flash, flash);
  g.restore();
}
function bakeMap(land, makeCanvas) {
  const tile = makeCanvas();
  tile.width = tile.height = 640;
  const g = tile.getContext("2d");
  g.drawImage(land, 0, 0, 640, 640);
  g.globalCompositeOperation = "multiply";
  for (let y = 0; y < 640; y++) {
    g.fillStyle = Hunter.MAP.zones[Hunter.zone(y * 5)].color;
    g.fillRect(0, y, 640, 1);
  }
  return tile;
}
function paintMap(canvas, base, model, full) {
  const { p, hero, cam, width, height, free, boss, time, drops, mobs } = model;
  const v = Hunter.view(p.x, p.y, full),
    n = canvas.width,
    g = canvas.getContext("2d");
  const point = (x, y) => Hunter.project(x, y, v, n);
  const icon = (s, x, y, size) => {
    g.font = "bold " + size + "px system-ui";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(s, x, y);
  };
  g.clearRect(0, 0, n, n);
  g.globalAlpha = full ? 1 : 0.55;
  const scale = base.width / Hunter.MAP.world;
  g.drawImage(
    base,
    v.x * scale,
    v.y * scale,
    v.size * scale,
    v.size * scale,
    0,
    0,
    n,
    n,
  );
  g.globalAlpha = 1;
  if (full)
    Hunter.MAP.zones.forEach((z, i) => {
      g.fillStyle = "#31504b";
      icon(
        z.icon + " " + z.name,
        ...point(1600, [500, 1450, 2520][i]),
        Math.max(22, n * 0.042),
      );
    });
  const [cx, cy] = point(cam.x - width / 2, cam.y - height / 2);
  g.strokeStyle = "white";
  g.lineWidth = 2;
  g.strokeRect(cx, cy, (width * n) / v.size, (height * n) / v.size);
  for (const m of Hunter.markers(drops, mobs, free, v)) {
    const [x, y] = point(m.x, m.y);
    if (m.icon === "star" || m.icon === "elite") {
      g.fillStyle = m.icon === "star" ? "#f6bc26" : "#8932cc";
      g.beginPath();
      g.arc(x, y, m.icon === "star" ? 2.5 : 5, 0, Math.PI * 2);
      g.fill();
    } else {
      if (m.icon === "👑") {
        g.fillStyle = "#ce344b";
        g.beginPath();
        g.arc(x, y, 14, 0, 2 * Math.PI);
        g.fill();
      }
      icon(m.icon, x, y, full ? 30 : 19);
    }
  }
  if (!free && !boss) {
    g.fillStyle = "#b42d49";
    g.beginPath();
    g.arc(n - 21, 21, 16, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#ffe884";
    g.lineWidth = 3;
    g.beginPath();
    g.arc(
      n - 21,
      21,
      14,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * Math.max(0.005, 1 - time / 210),
    );
    g.stroke();
    g.fillStyle = "white";
    icon("?", n - 21, 21, 20);
  }
  // 镜头不旋转，地图始终朝北，只有玩家箭头按实际速度转动。
  g.save();
  g.translate(...point(p.x, p.y));
  g.rotate(hero.heading);
  g.fillStyle = "#fff8cb";
  g.beginPath();
  g.arc(0, 0, 10 + 2 * Math.sin(time * 3), 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(11, 0);
  g.lineTo(-7, -6);
  g.lineTo(-4, 0);
  g.lineTo(-7, 6);
  g.closePath();
  g.fillStyle = "#087f82";
  g.fill();
  g.restore();
}
