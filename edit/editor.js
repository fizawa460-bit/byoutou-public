(() => {
  "use strict";

  const CELL = 64;
  const LAYERS = ["floor", "structure", "fixture", "overlay"];
  const $ = (id) => document.getElementById(id);
  const canvas = $("map-canvas");
  const ctx = canvas.getContext("2d");

  const tiles = {
    floor: { name: "床", layer: "floor", w: 1, h: 1, draw: drawFloor },
    floorDark: { name: "暗い床", layer: "floor", w: 1, h: 1, draw: drawFloorDark },
    wallTop: { name: "上壁", layer: "structure", w: 1, h: 1, draw: drawWallTop },
    wallSide: { name: "側壁", layer: "structure", w: 1, h: 1, draw: drawWallSide },
    bars: { name: "鉄格子窓", layer: "structure", w: 3, h: 1, draw: drawBars },
    rail: { name: "レール", layer: "structure", w: 3, h: 1, draw: drawRailH, rotations: [0, 45, 90, 135] },
    door: { name: "保護室ドア", layer: "structure", w: 2, h: 1, draw: drawDoor },
    futon: { name: "布団", layer: "fixture", w: 2, h: 3, draw: drawFuton },
    table: { name: "食事台", layer: "fixture", w: 1, h: 2, draw: drawTable },
    toilet: { name: "トイレ", layer: "fixture", w: 1, h: 1, draw: drawToilet },
    partition: { name: "低い仕切り", layer: "fixture", w: 1, h: 2, draw: drawPartition },
    cabinet: { name: "小設備", layer: "fixture", w: 1, h: 1, draw: drawCabinet },
    grime: { name: "床の汚れ", layer: "overlay", w: 1, h: 1, draw: drawGrime },
    shadow: { name: "境界の影", layer: "overlay", w: 1, h: 1, draw: drawShadow }
  };

  const sample = {
    version: 1,
    name: "ソフト監禁室・見本",
    cellSize: CELL,
    width: 12,
    height: 11,
    placements: [
      ...Array.from({ length: 12 * 11 }, (_, i) => ({ tile: "floor", x: i % 12, y: Math.floor(i / 12), layer: "floor" })),
      ...Array.from({ length: 12 }, (_, x) => ({ tile: "wallTop", x, y: 0, layer: "structure" })),
      ...Array.from({ length: 12 }, (_, x) => ({ tile: "wallTop", x, y: 10, layer: "structure" })),
      ...Array.from({ length: 9 }, (_, i) => ({ tile: "wallSide", x: 0, y: i + 1, layer: "structure" })),
      ...Array.from({ length: 9 }, (_, i) => ({ tile: "wallSide", x: 11, y: i + 1, layer: "structure" })),
      { tile: "bars", x: 5, y: 0, layer: "structure" },
      { tile: "door", x: 5, y: 10, layer: "structure" },
      { tile: "rail", x: 1, y: 1, layer: "structure", rotation: 0 },
      { tile: "rail", x: 4, y: 1, layer: "structure", rotation: 0 },
      { tile: "rail", x: 7, y: 1, layer: "structure", rotation: 0 },
      { tile: "rail", x: 1, y: 2, layer: "structure", rotation: 90 },
      { tile: "rail", x: 1, y: 5, layer: "structure", rotation: 90 },
      { tile: "rail", x: 10, y: 2, layer: "structure", rotation: 90 },
      { tile: "rail", x: 10, y: 5, layer: "structure", rotation: 90 },
      { tile: "futon", x: 4, y: 3, layer: "fixture" },
      { tile: "table", x: 9, y: 3, layer: "fixture" },
      { tile: "partition", x: 8, y: 7, layer: "fixture" },
      { tile: "toilet", x: 9, y: 8, layer: "fixture" },
      { tile: "cabinet", x: 1, y: 8, layer: "fixture" },
      { tile: "grime", x: 3, y: 7, layer: "overlay" },
      { tile: "grime", x: 7, y: 5, layer: "overlay" },
      { tile: "shadow", x: 0, y: 9, layer: "overlay" },
      { tile: "shadow", x: 11, y: 9, layer: "overlay" }
    ]
  };

  let map = clone(sample);
  let selectedTile = "futon";
  let mode = "paint";
  let dragging = false;
  let history = [];
  let future = [];
  let showGrid = true;
  let visibleLayers = new Set(LAYERS);
  let selectedRotation = 0;

  buildPalette();
  bindControls();
  syncFields();
  render();

  function buildPalette() {
    const palette = $("palette");
    Object.entries(tiles).forEach(([id, tile]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tile-button";
      button.dataset.tile = id;
      const preview = document.createElement("canvas");
      preview.width = 64;
      preview.height = 64;
      preview.className = "tile-preview";
      tile.draw(preview.getContext("2d"), 0, 0, 64, 64, true);
      const label = document.createElement("span");
      label.textContent = tile.name;
      button.append(preview, label);
      button.addEventListener("click", () => selectTile(id));
      palette.append(button);
    });
    selectTile(selectedTile);
  }

  function bindControls() {
    canvas.addEventListener("pointerdown", (event) => { dragging = true; canvas.setPointerCapture(event.pointerId); applyPointer(event, true); });
    canvas.addEventListener("pointermove", (event) => { if (dragging) applyPointer(event, false); });
    canvas.addEventListener("pointerup", () => { dragging = false; });
    canvas.addEventListener("pointercancel", () => { dragging = false; });
    $("eraser").addEventListener("click", () => setMode("erase"));
    $("picker").addEventListener("click", () => setMode("pick"));
    $("undo").addEventListener("click", undo);
    $("redo").addEventListener("click", redo);
    $("show-grid").addEventListener("change", (event) => { showGrid = event.target.checked; render(); });
    $("layer-select").addEventListener("change", (event) => { showLayer(event.target.value); setStatus(`${layerName(event.target.value)}を編集中`); });
    $("rotation-select").addEventListener("change", (event) => { selectedRotation = Number(event.target.value); setStatus(`レールの向き：${selectedRotation}°`); });
    $("show-all-layers").addEventListener("click", showAllLayers);
    $("show-only-active").addEventListener("click", showOnlyActiveLayer);
    document.querySelectorAll(".layer-eye").forEach((button) => button.addEventListener("click", () => toggleLayer(button.dataset.layer)));
    $("load-sample").addEventListener("click", () => replaceMap(sample, "見本を復元しました"));
    $("new-map").addEventListener("click", newMap);
    $("resize-map").addEventListener("click", resizeMap);
    $("map-name").addEventListener("change", (event) => { map.name = event.target.value.trim() || "名称未設定"; refreshJson(); });
    $("save-json").addEventListener("click", saveJson);
    $("open-json").addEventListener("click", () => $("json-file").click());
    $("json-file").addEventListener("change", loadJsonFile);
    $("apply-json").addEventListener("click", () => importJson($("json-text").value));
    $("export-png").addEventListener("click", exportPng);
    window.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
    });
  }

  function selectTile(id) {
    selectedTile = id;
    setMode("paint");
    $("layer-select").value = tiles[id].layer;
    const canRotate = Array.isArray(tiles[id].rotations);
    $("rotation-select").disabled = !canRotate;
    if (!canRotate) selectedRotation = 0;
    $("rotation-select").value = String(selectedRotation);
    showLayer(tiles[id].layer);
    document.querySelectorAll(".tile-button").forEach((button) => button.classList.toggle("active", button.dataset.tile === id));
    setStatus(`${tiles[id].name}を選択中`);
  }

  function setMode(next) {
    mode = next;
    $("eraser").classList.toggle("active", mode === "erase");
    $("picker").classList.toggle("active", mode === "pick");
  }

  function applyPointer(event, start) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((event.clientX - rect.left) * scaleX) / CELL);
    const y = Math.floor(((event.clientY - rect.top) * scaleY) / CELL);
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    const activeLayer = $("layer-select").value;
    if (mode !== "pick" && !visibleLayers.has(activeLayer)) return setStatus(`${layerName(activeLayer)}は非表示のため編集できません`);
    if (start) remember();
    if (mode === "pick") return pickAt(x, y);
    if (mode === "erase") removeAt(x, y, $("layer-select").value);
    else placeAt(selectedTile, x, y);
    render();
    refreshJson();
  }

  function placeAt(tileId, x, y) {
    const tile = tiles[tileId];
    const next = { tile: tileId, x, y, layer: tile.layer, ...(tileId === "rail" ? { rotation: selectedRotation } : {}) };
    const size = footprint(next);
    if (x + size.w > map.width || y + size.h > map.height) return setStatus("マップの外には配置できません");
    map.placements = map.placements.filter((p) => p.layer !== tile.layer || !overlaps(p, next));
    map.placements.push(next);
    setStatus(`${tile.name}：${x}, ${y}${tileId === "rail" ? ` / ${selectedRotation}°` : ""}`);
  }

  function removeAt(x, y, layer) {
    const before = map.placements.length;
    map.placements = map.placements.filter((p) => !(p.layer === layer && contains(p, x, y)));
    setStatus(before === map.placements.length ? "このレイヤーにはパーツがありません" : "削除しました");
  }

  function pickAt(x, y) {
    for (const layer of [...LAYERS].reverse().filter((id) => visibleLayers.has(id))) {
      const found = [...map.placements].reverse().find((p) => p.layer === layer && contains(p, x, y));
      if (found) { selectedRotation = Number(found.rotation || 0); selectTile(found.tile); $("rotation-select").value = String(selectedRotation); return; }
    }
  }

  function contains(p, x, y) {
    const size = footprint(p);
    return size && x >= p.x && x < p.x + size.w && y >= p.y && y < p.y + size.h;
  }

  function overlaps(a, b) {
    const ta = footprint(a);
    const tb = footprint(b);
    return a.x < b.x + tb.w && a.x + ta.w > b.x && a.y < b.y + tb.h && a.y + ta.h > b.y;
  }

  function footprint(placement) {
    const tile = tiles[placement.tile];
    if (!tile) return null;
    if (placement.tile !== "rail") return { w: tile.w, h: tile.h };
    const rotation = Number(placement.rotation || 0);
    if (rotation === 90) return { w: 1, h: 3 };
    if (rotation === 45 || rotation === 135) return { w: 3, h: 3 };
    return { w: 3, h: 1 };
  }

  function render(target = ctx, includeGrid = showGrid) {
    canvas.width = map.width * CELL;
    canvas.height = map.height * CELL;
    target.clearRect(0, 0, canvas.width, canvas.height);
    target.fillStyle = "#141414";
    target.fillRect(0, 0, canvas.width, canvas.height);
    LAYERS.filter((layer) => visibleLayers.has(layer)).forEach((layer) => map.placements.filter((p) => p.layer === layer).forEach((p) => {
      drawPlacement(target, p);
    }));
    if (includeGrid) drawGrid(target);
  }

  function drawPlacement(target, placement) {
    const tile = tiles[placement.tile];
    const size = footprint(placement);
    if (!tile || !size) return;
    const x = placement.x * CELL;
    const y = placement.y * CELL;
    const w = size.w * CELL;
    const h = size.h * CELL;
    if (placement.tile === "rail") drawRailRotated(target, x, y, w, h, Number(placement.rotation || 0));
    else tile.draw(target, x, y, w, h, false);
  }

  function drawGrid(target) {
    target.save();
    target.strokeStyle = "rgba(238,235,222,.13)";
    target.lineWidth = 1;
    for (let x = 0; x <= map.width; x++) { target.beginPath(); target.moveTo(x * CELL + .5, 0); target.lineTo(x * CELL + .5, canvas.height); target.stroke(); }
    for (let y = 0; y <= map.height; y++) { target.beginPath(); target.moveTo(0, y * CELL + .5); target.lineTo(canvas.width, y * CELL + .5); target.stroke(); }
    target.restore();
  }

  function layerName(layer) {
    return ({ floor: "床", structure: "壁・構造", fixture: "設備", overlay: "装飾・影" })[layer] || layer;
  }
  function showLayer(layer) {
    if (!visibleLayers.has(layer)) visibleLayers.add(layer);
    syncLayerButtons();
    render();
  }
  function showAllLayers() {
    visibleLayers = new Set(LAYERS);
    syncLayerButtons();
    render();
    setStatus("全レイヤーを重ねて表示中");
  }
  function showOnlyActiveLayer() {
    const active = $("layer-select").value;
    visibleLayers = new Set([active]);
    syncLayerButtons();
    render();
    setStatus(`${layerName(active)}のみ表示中`);
  }
  function toggleLayer(layer) {
    if (visibleLayers.has(layer)) visibleLayers.delete(layer); else visibleLayers.add(layer);
    syncLayerButtons();
    render();
    setStatus(`${layerName(layer)}を${visibleLayers.has(layer) ? "表示" : "非表示"}にしました`);
  }
  function syncLayerButtons() {
    document.querySelectorAll(".layer-eye").forEach((button) => {
      const shown = visibleLayers.has(button.dataset.layer);
      button.classList.toggle("active", shown);
      button.setAttribute("aria-pressed", String(shown));
      button.textContent = `${shown ? "◉" : "○"} ${layerName(button.dataset.layer).replace("・構造", "").replace("・影", "")}`;
    });
    $("show-all-layers").classList.toggle("active", visibleLayers.size === LAYERS.length);
    const active = $("layer-select").value;
    $("show-only-active").classList.toggle("active", visibleLayers.size === 1 && visibleLayers.has(active));
  }

  function remember() { history.push(clone(map)); if (history.length > 50) history.shift(); future = []; }
  function undo() { if (!history.length) return; future.push(clone(map)); map = history.pop(); syncFields(); render(); }
  function redo() { if (!future.length) return; history.push(clone(map)); map = future.pop(); syncFields(); render(); }

  function replaceMap(next, message) { remember(); map = validateMap(clone(next)); syncFields(); render(); setStatus(message); }
  function newMap() {
    const width = clamp(Number($("map-width").value), 6, 40);
    const height = clamp(Number($("map-height").value), 6, 40);
    const placements = Array.from({ length: width * height }, (_, i) => ({ tile: "floor", x: i % width, y: Math.floor(i / width), layer: "floor" }));
    replaceMap({ version: 1, name: "新規マップ", cellSize: CELL, width, height, placements }, "新規マップを作成しました");
  }
  function resizeMap() {
    remember();
    map.width = clamp(Number($("map-width").value), 6, 40);
    map.height = clamp(Number($("map-height").value), 6, 40);
    map.placements = map.placements.filter((p) => p.x < map.width && p.y < map.height);
    syncFields(); render(); setStatus("マップサイズを変更しました");
  }

  function syncFields() {
    $("map-name").value = map.name;
    $("map-width").value = map.width;
    $("map-height").value = map.height;
    refreshJson();
  }
  function refreshJson() { $("json-text").value = JSON.stringify(map, null, 2); }
  function saveJson() { download(new Blob([JSON.stringify(map, null, 2)], { type: "application/json" }), `${safeName(map.name)}.json`); }
  async function loadJsonFile(event) {
    const file = event.target.files[0];
    if (file) importJson(await file.text());
    event.target.value = "";
  }
  function importJson(text) {
    try { replaceMap(validateMap(JSON.parse(text)), "JSONを読み込みました"); }
    catch (error) { setStatus(`読込失敗：${error.message}`); }
  }
  function validateMap(value) {
    if (!value || !Number.isInteger(value.width) || !Number.isInteger(value.height) || !Array.isArray(value.placements)) throw new Error("マップ形式が正しくありません");
    value.width = clamp(value.width, 6, 40); value.height = clamp(value.height, 6, 40); value.cellSize = CELL; value.version = 1;
    value.name = String(value.name || "名称未設定");
    value.placements = value.placements.map((p) => {
      if (p.tile === "railH") return { ...p, tile: "rail", rotation: 0 };
      if (p.tile === "railV") return { ...p, tile: "rail", rotation: 90 };
      return p;
    }).filter((p) => tiles[p.tile] && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0).map((p) => {
      const rotation = tiles[p.tile].rotations?.includes(Number(p.rotation)) ? Number(p.rotation) : 0;
      return { tile: p.tile, x: p.x, y: p.y, layer: tiles[p.tile].layer, ...(p.tile === "rail" ? { rotation } : {}) };
    });
    if (value.floorFill && !value.placements.some((p) => p.layer === "floor")) {
      value.placements.unshift(...Array.from({ length: value.width * value.height }, (_, i) => ({ tile: "floor", x: i % value.width, y: Math.floor(i / value.width), layer: "floor" })));
    }
    delete value.floorFill;
    return value;
  }
  function exportPng() {
    const output = document.createElement("canvas"); output.width = map.width * CELL; output.height = map.height * CELL;
    const out = output.getContext("2d"); out.fillStyle = "#141414"; out.fillRect(0, 0, output.width, output.height);
    LAYERS.filter((layer) => visibleLayers.has(layer)).forEach((layer) => map.placements.filter((p) => p.layer === layer).forEach((p) => drawPlacement(out, p)));
    output.toBlob((blob) => download(blob, `${safeName(map.name)}.png`), "image/png");
  }
  function download(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function safeName(name) { return name.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-|-$/g, "") || "map"; }
  function setStatus(text) { $("status").textContent = text; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, Math.round(value || min))); }

  function rect(g, x, y, w, h, fill, stroke = null, line = 1) { g.fillStyle = fill; g.fillRect(x, y, w, h); if (stroke) { g.strokeStyle = stroke; g.lineWidth = line; g.strokeRect(x + line / 2, y + line / 2, w - line, h - line); } }
  function drawFloor(g, x, y, w, h) { rect(g, x, y, w, h, "#77736b", "#59564f", 2); g.fillStyle = "rgba(255,255,255,.035)"; for (let i = 0; i < 8; i++) g.fillRect(x + (i * 19 + y) % w, y + (i * 31 + x) % h, 2, 2); }
  function drawFloorDark(g, x, y, w, h) { rect(g, x, y, w, h, "#55534e", "#42413d", 2); }
  function drawWallTop(g, x, y, w, h) { const grad = g.createLinearGradient(x, y, x, y + h); grad.addColorStop(0, "#a09b91"); grad.addColorStop(.18, "#6c6963"); grad.addColorStop(1, "#393a39"); rect(g, x, y, w, h, grad, "#222", 2); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x + 3, y + 4, w - 6, 5); }
  function drawWallSide(g, x, y, w, h) { const grad = g.createLinearGradient(x, y, x + w, y); grad.addColorStop(0, "#302f2e"); grad.addColorStop(.5, "#77736c"); grad.addColorStop(1, "#3a3937"); rect(g, x, y, w, h, grad, "#222", 2); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 8, y + 3, 5, h - 6); }
  function drawBars(g, x, y, w, h) { drawWallTop(g, x, y, w, h); rect(g, x + 8, y + 10, w - 16, h - 18, "#171819", "#aaa49a", 3); for (let i = 0; i < 8; i++) { const bx = x + 19 + i * ((w - 38) / 7); g.fillStyle = "#c8c7c1"; g.fillRect(bx - 3, y + 15, 6, h - 28); g.fillStyle = "#4a4b4c"; g.fillRect(bx + 2, y + 15, 3, h - 28); } }
  function drawRailH(g, x, y, w, h) { g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x + 7, y + h * .54, w - 14, 8); g.fillStyle = "#dedbd2"; g.fillRect(x + 6, y + h * .45, w - 12, 6); g.fillStyle = "#6b6964"; g.fillRect(x + 6, y + h * .45 + 6, w - 12, 3); }
  function drawRailV(g, x, y, w, h) { g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x + w * .54, y + 7, 8, h - 14); g.fillStyle = "#dedbd2"; g.fillRect(x + w * .45, y + 6, 6, h - 12); g.fillStyle = "#6b6964"; g.fillRect(x + w * .45 + 6, y + 6, 3, h - 12); }
  function drawRailRotated(g, x, y, w, h, rotation) {
    if (rotation === 0) return drawRailH(g, x, y, w, h);
    if (rotation === 90) return drawRailV(g, x, y, w, h);
    const inset = 14;
    const fromLeft = rotation === 135;
    const x1 = fromLeft ? x + inset : x + inset;
    const y1 = fromLeft ? y + inset : y + h - inset;
    const x2 = x + w - inset;
    const y2 = fromLeft ? y + h - inset : y + inset;
    g.save();
    g.lineCap = "round";
    g.strokeStyle = "rgba(0,0,0,.28)";
    g.lineWidth = 13;
    g.beginPath(); g.moveTo(x1 + 4, y1 + 5); g.lineTo(x2 + 4, y2 + 5); g.stroke();
    g.strokeStyle = "#6b6964";
    g.lineWidth = 10;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = "#dedbd2";
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(x1 - 1, y1 - 1); g.lineTo(x2 - 1, y2 - 1); g.stroke();
    g.restore();
  }
  function drawDoor(g, x, y, w, h) { drawWallTop(g, x, y, w, h); rect(g, x + 12, y + 7, w - 24, h - 10, "#343536", "#151515", 3); rect(g, x + w * .38, y + 14, w * .24, 12, "#151515", "#9b968d", 2); }
  function drawFuton(g, x, y, w, h) { g.save(); g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 9; g.shadowOffsetY = 5; rect(g, x + 12, y + 8, w - 24, h - 16, "#c8c3b8", "#5c5953", 3); g.shadowColor = "transparent"; rect(g, x + 18, y + 14, w - 36, h * .27, "#ddd8cd", "#7d7971", 2); g.strokeStyle = "rgba(104,99,91,.28)"; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(x + 20, y + h * .38 + i * 14); g.quadraticCurveTo(x + w * .5, y + h * .34 + i * 15, x + w - 20, y + h * .39 + i * 14); g.stroke(); } g.restore(); }
  function drawTable(g, x, y, w, h) { g.save(); g.shadowColor = "#111"; g.shadowBlur = 8; g.shadowOffsetX = 4; rect(g, x + 10, y + 5, w - 20, h - 10, "#5a3d22", "#26190e", 3); g.strokeStyle = "rgba(219,166,102,.28)"; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + 14 + i * 9, y + 9); g.lineTo(x + 14 + i * 9, y + h - 9); g.stroke(); } g.restore(); }
  function drawToilet(g, x, y, w, h) { g.save(); g.shadowColor = "#222"; g.shadowBlur = 6; g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w * .3, h * .39, 0, 0, Math.PI * 2); g.fillStyle = "#aaa79f"; g.fill(); g.strokeStyle = "#4a4946"; g.lineWidth = 3; g.stroke(); g.beginPath(); g.ellipse(x + w / 2, y + h / 2, w * .18, h * .25, 0, 0, Math.PI * 2); g.fillStyle = "#4d504f"; g.fill(); g.strokeStyle = "#d0ccc1"; g.stroke(); g.restore(); }
  function drawPartition(g, x, y, w, h) { g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 8; g.shadowOffsetX = 5; const grad = g.createLinearGradient(x, y, x + w, y); grad.addColorStop(0, "#4b4a46"); grad.addColorStop(.5, "#89857b"); grad.addColorStop(1, "#4a4946"); rect(g, x + 20, y + 3, w - 40, h - 6, grad, "#2b2b29", 2); g.restore(); }
  function drawCabinet(g, x, y, w, h) { g.save(); g.shadowColor = "#111"; g.shadowBlur = 7; rect(g, x + 6, y + 13, w - 12, h - 19, "#3e3124", "#17120d", 3); g.fillStyle = "#806040"; g.fillRect(x + 10, y + 17, w - 20, 5); g.restore(); }
  function drawGrime(g, x, y, w, h) { g.save(); for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(38,31,22,${.05 + (i % 3) * .04})`; g.beginPath(); g.arc(x + (i * 23 + 13) % w, y + (i * 17 + 20) % h, 2 + (i % 4) * 2, 0, Math.PI * 2); g.fill(); } g.restore(); }
  function drawShadow(g, x, y, w, h) { const grad = g.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * .7); grad.addColorStop(0, "rgba(0,0,0,.38)"); grad.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = grad; g.fillRect(x, y, w, h); }
})();
