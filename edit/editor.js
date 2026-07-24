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
  let selectedWidth = 2;
  let selectedHeight = 3;
  let selectedPlacements = new Set();

  buildPalette();
  bindControls();
  syncSelectionControls();
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
    $("select-objects").addEventListener("click", () => setMode("select"));
    $("select-visible").addEventListener("click", selectVisiblePlacements);
    $("clear-selection").addEventListener("click", () => clearSelection("選択を解除しました"));
    $("delete-selection").addEventListener("click", deleteSelectedPlacements);
    document.querySelectorAll(".move-selection").forEach((button) => button.addEventListener("click", () => {
      moveSelectedPlacements(Number(button.dataset.dx), Number(button.dataset.dy));
    }));
    $("undo").addEventListener("click", undo);
    $("redo").addEventListener("click", redo);
    $("show-grid").addEventListener("change", (event) => { showGrid = event.target.checked; render(); });
    $("layer-select").addEventListener("change", (event) => { showLayer(event.target.value); setStatus(`${layerName(event.target.value)}を編集中`); });
    $("rotation-select").addEventListener("change", (event) => { selectedRotation = Number(event.target.value); resetSelectedSize(); setStatus(`レールの向き：${selectedRotation}°`); });
    $("tile-width").addEventListener("change", syncSelectedSize);
    $("tile-height").addEventListener("change", syncSelectedSize);
    $("reset-tile-size").addEventListener("click", resetSelectedSize);
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
      if (mode === "select" && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        const moves = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
        moveSelectedPlacements(...moves[event.key]);
      }
      if (mode === "select" && (event.key === "Delete" || event.key === "Backspace")) {
        event.preventDefault();
        deleteSelectedPlacements();
      }
      if (event.key === "Escape") clearSelection("選択を解除しました");
    });
  }

  function selectTile(id, preserveSize = false) {
    selectedTile = id;
    setMode("paint");
    $("layer-select").value = tiles[id].layer;
    const canRotate = Array.isArray(tiles[id].rotations);
    $("rotation-select").disabled = !canRotate;
    if (!canRotate) selectedRotation = 0;
    $("rotation-select").value = String(selectedRotation);
    if (!preserveSize) resetSelectedSize();
    showLayer(tiles[id].layer);
    document.querySelectorAll(".tile-button").forEach((button) => button.classList.toggle("active", button.dataset.tile === id));
    setStatus(`${tiles[id].name}を選択中`);
  }

  function syncSelectedSize() {
    selectedWidth = clamp(Number($("tile-width").value), 1, 12);
    selectedHeight = clamp(Number($("tile-height").value), 1, 12);
    $("tile-width").value = selectedWidth;
    $("tile-height").value = selectedHeight;
    setStatus(`配置サイズ：${selectedWidth}×${selectedHeight}マス`);
  }

  function resetSelectedSize() {
    const size = defaultFootprint(selectedTile, selectedRotation);
    selectedWidth = size.w;
    selectedHeight = size.h;
    $("tile-width").value = selectedWidth;
    $("tile-height").value = selectedHeight;
  }

  function setMode(next) {
    mode = next;
    $("eraser").classList.toggle("active", mode === "erase");
    $("picker").classList.toggle("active", mode === "pick");
    $("select-objects").classList.toggle("active", mode === "select");
    if (mode !== "select" && selectedPlacements.size) clearSelection();
    if (mode === "select") setStatus("配置物をタップして複数選択できます");
  }

  function applyPointer(event, start) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cell = getCellSize();
    const x = Math.floor(((event.clientX - rect.left) * scaleX) / cell);
    const y = Math.floor(((event.clientY - rect.top) * scaleY) / cell);
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    const activeLayer = $("layer-select").value;
    if (mode !== "pick" && !visibleLayers.has(activeLayer)) return setStatus(`${layerName(activeLayer)}は非表示のため編集できません`);
    if (mode === "select") {
      if (start) toggleSelectionAt(x, y);
      return;
    }
    if (start) remember();
    if (mode === "pick") return pickAt(x, y);
    if (mode === "erase") removeAt(x, y, $("layer-select").value);
    else placeAt(selectedTile, x, y);
    render();
    refreshJson();
  }

  function placeAt(tileId, x, y) {
    const tile = tiles[tileId];
    const normal = defaultFootprint(tileId, selectedRotation);
    const customSize = selectedWidth !== normal.w || selectedHeight !== normal.h;
    const next = { tile: tileId, x, y, layer: tile.layer, ...(tileId === "rail" ? { rotation: selectedRotation } : {}), ...(customSize ? { width: selectedWidth, height: selectedHeight } : {}) };
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
      if (found) {
        selectedRotation = Number(found.rotation || 0);
        const size = footprint(found);
        selectedWidth = size.w; selectedHeight = size.h;
        selectTile(found.tile, true);
        $("rotation-select").value = String(selectedRotation);
        $("tile-width").value = selectedWidth; $("tile-height").value = selectedHeight;
        return;
      }
    }
  }

  function findTopPlacementAt(x, y) {
    for (const layer of [...LAYERS].reverse().filter((id) => visibleLayers.has(id))) {
      const found = [...map.placements].reverse().find((p) => p.layer === layer && contains(p, x, y));
      if (found) return found;
    }
    return null;
  }

  function toggleSelectionAt(x, y) {
    const found = findTopPlacementAt(x, y);
    if (!found) return setStatus("ここには選択できる配置物がありません");
    if (selectedPlacements.has(found)) selectedPlacements.delete(found);
    else selectedPlacements.add(found);
    syncSelectionControls();
    render();
    setStatus(`${selectedPlacements.size}個を選択中`);
  }

  function selectVisiblePlacements() {
    setMode("select");
    const activeLayer = $("layer-select").value;
    selectedPlacements = new Set(map.placements.filter((p) => p.layer === activeLayer));
    syncSelectionControls();
    render();
    setStatus(`${layerName(activeLayer)}の配置物を${selectedPlacements.size}個選択しました`);
  }

  function clearSelection(message = "") {
    selectedPlacements.clear();
    syncSelectionControls();
    render();
    if (message) setStatus(message);
  }

  function syncSelectionControls() {
    const count = selectedPlacements.size;
    $("selection-count").textContent = `選択 ${count}個`;
    document.querySelectorAll(".move-selection").forEach((button) => { button.disabled = count === 0; });
    $("clear-selection").disabled = count === 0;
    $("delete-selection").disabled = count === 0;
  }

  function moveSelectedPlacements(dx, dy) {
    if (!selectedPlacements.size) return setStatus("移動する配置物を選択してください");
    const selected = [...selectedPlacements];
    const moved = selected.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
    const outside = moved.some((p) => {
      const size = footprint(p);
      return p.x < 0 || p.y < 0 || p.x + size.w > map.width || p.y + size.h > map.height;
    });
    if (outside) return setStatus("マップの外へは移動できません");
    const unselected = map.placements.filter((p) => !selectedPlacements.has(p));
    const collision = moved.some((next) => unselected.some((p) => p.layer === next.layer && overlaps(p, next)));
    if (collision) return setStatus("同じレイヤーの別パーツと重なるため移動できません");
    remember();
    selected.forEach((p) => { p.x += dx; p.y += dy; });
    render();
    refreshJson();
    setStatus(`${selected.length}個を${dx < 0 ? "左" : dx > 0 ? "右" : dy < 0 ? "上" : "下"}へ1マス移動しました`);
  }

  function deleteSelectedPlacements() {
    if (!selectedPlacements.size) return setStatus("削除する配置物を選択してください");
    const count = selectedPlacements.size;
    if (count > 1 && !window.confirm(`選択中の配置物${count}個をマップから削除しますか？`)) {
      return setStatus("配置物の削除をキャンセルしました");
    }
    remember();
    map.placements = map.placements.filter((p) => !selectedPlacements.has(p));
    selectedPlacements.clear();
    syncSelectionControls();
    render();
    refreshJson();
    setStatus(`${count}個の配置物を削除しました`);
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
    if (Number.isInteger(placement.width) && Number.isInteger(placement.height)) return { w: clamp(placement.width, 1, 12), h: clamp(placement.height, 1, 12) };
    return defaultFootprint(placement.tile, Number(placement.rotation || 0));
  }

  function defaultFootprint(tileId, rotation = 0) {
    const tile = tiles[tileId];
    if (!tile) return { w: 1, h: 1 };
    if (tileId !== "rail") return { w: tile.w, h: tile.h };
    if (rotation === 90) return { w: 1, h: 3 };
    if (rotation === 45 || rotation === 135) return { w: 3, h: 3 };
    return { w: 3, h: 1 };
  }

  function render(target = ctx, includeGrid = showGrid) {
    const cell = getCellSize();
    canvas.width = map.width * cell;
    canvas.height = map.height * cell;
    target.clearRect(0, 0, canvas.width, canvas.height);
    target.fillStyle = "#141414";
    target.fillRect(0, 0, canvas.width, canvas.height);
    LAYERS.filter((layer) => visibleLayers.has(layer)).forEach((layer) => map.placements.filter((p) => p.layer === layer).forEach((p) => {
      drawPlacement(target, p);
    }));
    if (includeGrid) drawGrid(target);
    if (target === ctx && selectedPlacements.size) drawSelection(target);
  }

  function drawSelection(target) {
    const cell = getCellSize();
    target.save();
    target.strokeStyle = "#ffd477";
    target.fillStyle = "rgba(255,212,119,.12)";
    target.lineWidth = Math.max(2, cell / 24);
    target.setLineDash([Math.max(5, cell / 8), Math.max(3, cell / 12)]);
    selectedPlacements.forEach((p) => {
      if (!visibleLayers.has(p.layer)) return;
      const size = footprint(p);
      target.fillRect(p.x * cell, p.y * cell, size.w * cell, size.h * cell);
      target.strokeRect(p.x * cell + 2, p.y * cell + 2, size.w * cell - 4, size.h * cell - 4);
    });
    target.restore();
  }

  function drawPlacement(target, placement) {
    const tile = tiles[placement.tile];
    const size = footprint(placement);
    if (!tile || !size) return;
    const cell = getCellSize();
    const x = placement.x * cell;
    const y = placement.y * cell;
    const baseWidth = size.w * CELL;
    const baseHeight = size.h * CELL;
    target.save();
    target.translate(x, y);
    target.scale(cell / CELL, cell / CELL);
    if (placement.tile === "rail") drawRailRotated(target, 0, 0, baseWidth, baseHeight, Number(placement.rotation || 0));
    else tile.draw(target, 0, 0, baseWidth, baseHeight, false);
    target.restore();
  }

  function drawGrid(target) {
    target.save();
    target.strokeStyle = "rgba(238,235,222,.13)";
    target.lineWidth = 1;
    const cell = getCellSize();
    for (let x = 0; x <= map.width; x++) { target.beginPath(); target.moveTo(x * cell + .5, 0); target.lineTo(x * cell + .5, canvas.height); target.stroke(); }
    for (let y = 0; y <= map.height; y++) { target.beginPath(); target.moveTo(0, y * cell + .5); target.lineTo(canvas.width, y * cell + .5); target.stroke(); }
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
  function undo() { if (!history.length) return; future.push(clone(map)); map = history.pop(); selectedPlacements.clear(); syncSelectionControls(); syncFields(); render(); }
  function redo() { if (!future.length) return; history.push(clone(map)); map = future.pop(); selectedPlacements.clear(); syncSelectionControls(); syncFields(); render(); }

  function replaceMap(next, message) { remember(); map = validateMap(clone(next)); selectedPlacements.clear(); syncSelectionControls(); syncFields(); render(); setStatus(message); }
  function newMap() {
    const width = clamp(Number($("map-width").value), 6, 40);
    const height = clamp(Number($("map-height").value), 6, 40);
    const cellSize = clamp(Number($("cell-size").value), 16, 128);
    const placements = Array.from({ length: width * height }, (_, i) => ({ tile: "floor", x: i % width, y: Math.floor(i / width), layer: "floor" }));
    replaceMap({ version: 1, name: "新規マップ", cellSize, width, height, placements }, "新規マップを作成しました");
  }
  function resizeMap() {
    remember();
    map.width = clamp(Number($("map-width").value), 6, 40);
    map.height = clamp(Number($("map-height").value), 6, 40);
    map.cellSize = clamp(Number($("cell-size").value), 16, 128);
    map.placements = map.placements.filter((p) => p.x < map.width && p.y < map.height);
    syncFields(); render(); setStatus(`マップを${map.width}×${map.height}マス／1マス${map.cellSize}pxに変更しました`);
  }

  function syncFields() {
    $("map-name").value = map.name;
    $("map-width").value = map.width;
    $("map-height").value = map.height;
    $("cell-size").value = getCellSize();
    refreshJson();
  }
  function refreshJson() { $("json-text").value = formatMapJson(map); }
  function saveJson() { download(new Blob([formatMapJson(map)], { type: "application/json" }), `${safeName(map.name)}.json`); }
  function formatMapJson(value) {
    const { placements, ...meta } = value;
    const header = JSON.stringify(meta, null, 2).replace(/\n}$/, "");
    const rows = placements.map((placement, index) => {
      const fields = Object.entries(placement).map(([key, fieldValue]) => `${JSON.stringify(key)}: ${JSON.stringify(fieldValue)}`).join(", ");
      return `    { ${fields} }${index < placements.length - 1 ? "," : ""}`;
    }).join("\n");
    return `${header},\n  "placements": [\n${rows}\n  ]\n}`;
  }
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
    value.width = clamp(value.width, 6, 40); value.height = clamp(value.height, 6, 40); value.cellSize = clamp(Number(value.cellSize || CELL), 16, 128); value.version = 1;
    value.name = String(value.name || "名称未設定");
    value.placements = value.placements.map((p) => {
      if (p.tile === "railH") return { ...p, tile: "rail", rotation: 0 };
      if (p.tile === "railV") return { ...p, tile: "rail", rotation: 90 };
      return p;
    }).filter((p) => tiles[p.tile] && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0).map((p) => {
      const rotation = tiles[p.tile].rotations?.includes(Number(p.rotation)) ? Number(p.rotation) : 0;
      const normal = defaultFootprint(p.tile, rotation);
      const hasCustomSize = Number.isInteger(p.width) && Number.isInteger(p.height) && (p.width !== normal.w || p.height !== normal.h);
      return { tile: p.tile, x: p.x, y: p.y, layer: tiles[p.tile].layer, ...(p.tile === "rail" ? { rotation } : {}), ...(hasCustomSize ? { width: clamp(p.width, 1, 12), height: clamp(p.height, 1, 12) } : {}) };
    });
    if (value.floorFill && !value.placements.some((p) => p.layer === "floor")) {
      value.placements.unshift(...Array.from({ length: value.width * value.height }, (_, i) => ({ tile: "floor", x: i % value.width, y: Math.floor(i / value.width), layer: "floor" })));
    }
    delete value.floorFill;
    return value;
  }
  function exportPng() {
    const cell = getCellSize();
    const output = document.createElement("canvas"); output.width = map.width * cell; output.height = map.height * cell;
    const out = output.getContext("2d"); out.fillStyle = "#141414"; out.fillRect(0, 0, output.width, output.height);
    LAYERS.filter((layer) => visibleLayers.has(layer)).forEach((layer) => map.placements.filter((p) => p.layer === layer).forEach((p) => drawPlacement(out, p)));
    output.toBlob((blob) => download(blob, `${safeName(map.name)}.png`), "image/png");
  }
  function download(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function safeName(name) { return name.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-|-$/g, "") || "map"; }
  function setStatus(text) { $("status").textContent = text; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, Math.round(value || min))); }
  function getCellSize() { return clamp(Number(map.cellSize || CELL), 16, 128); }

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
