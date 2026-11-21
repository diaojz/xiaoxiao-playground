(() => {
  // 可选素材加载成功后才替换回退内容，整个素材目录缺席时也能直接玩。
  const base = new URL('../assets/hub/', document.currentScript.src);
  function load(slot) {
    const image = new Image();
    image.alt = '';
    image.onload = () => slot.replaceChildren(image);
    image.src = new URL(slot.dataset.parkArt, base).href;
  }
  const selector = '[data-park-art]';
  document.querySelectorAll(selector).forEach(load);
  // 关卡切换时生成的按钮，仍用相同的可选素材。
  for (const stage of document.querySelectorAll('[data-park-art-stage]')) {
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(selector)) load(node);
        node.querySelectorAll(selector).forEach(load);
      }
    }).observe(stage, { childList:true, subtree:true });
  }
  for (const slot of document.querySelectorAll('[data-park-background]')) {
    const portrait = matchMedia('(orientation: portrait), (max-width: 680px)');
    function update() {
      slot.replaceChildren();
      const image = new Image();
      const narrow = portrait.matches;
      image.alt = '';
      image.onload = () => {
        if (portrait.matches === narrow) slot.replaceChildren(image);
      };
      image.src = new URL(narrow ? 'bg_park_portrait.jpg' : 'bg_park_landscape.jpg', base).href;
    }
    portrait.addEventListener('change', update);
    update();
  }
})();
