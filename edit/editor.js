(() => {
  "use strict";

  const CELL = 64;
  const LAYERS = ["floor", "structure", "fixture", "overlay"];
  const DEFAULT_APPEARANCE = Object.freeze({
    hue: 0,
    brightness: 100,
    lineWidth: 100
  });
  const $ = (id) => document.getElementById(id);
  const canvas = $("map-canvas");
  const ctx = canvas.getContext("2d");
  const nurseSprite = new Image();
  nurseSprite.src = "assets/nurse-demo.png?v=20260726-3";

  const tiles = {
    floor: { name: "床", layer: "floor", w: 1, h: 1, draw: drawFloor },
    floorDark: { name: "暗い床", layer: "floor", w: 1, h: 1, draw: drawFloorDark },
    wallTop: { name: "上壁", layer: "structure", w: 1, h: 1, draw: drawWallTop },
    peekWindow: { name: "覗き小窓", layer: "structure", w: 1, h: 1, draw: drawPeekWindow },
    wallSide: { name: "側壁", layer: "structure", w: 1, h: 1, draw: drawWallSide, rotations: [0, 45, 90, 135] },
    bars: { name: "鉄格子窓", layer: "structure", w: 3, h: 1, draw: drawBars },
    rail: { name: "レール", layer: "structure", w: 3, h: 1, draw: drawRailH, rotations: [0, 45, 90, 135] },
    railEdge: { name: "端寄せレール", layer: "structure", w: 3, h: 1, draw: drawRailEdge, rotations: [0, 90, 180, 270] },
    door: { name: "保護室ドア", layer: "structure", w: 2, h: 1, draw: drawDoor, rotations: [0, 45, 90, 135] },
    doorSmall: { name: "1マスドア", layer: "structure", w: 1, h: 1, draw: drawDoorSmall, rotations: [0, 90, 180, 270] },
    mealHatchClosed: { name: "配膳口・閉", layer: "fixture", w: 1, h: 1, draw: drawMealHatchClosed, rotations: [0, 90, 180, 270] },
    mealHatchOpen: { name: "配膳口・開", layer: "fixture", w: 1, h: 1, draw: drawMealHatchOpen, rotations: [0, 90, 180, 270] },
    window: { name: "横長の窓", layer: "structure", w: 9, h: 1, draw: drawWindow },
    futon: { name: "布団", layer: "fixture", w: 2, h: 3, draw: drawFuton },
    table: { name: "食事台", layer: "fixture", w: 1, h: 2, draw: drawTable, rotations: [0, 45, 90, 135] },
    curtain: { name: "横長のカーテン", layer: "fixture", w: 9, h: 1, draw: drawCurtain },
    toilet: { name: "金属製トイレ", layer: "fixture", w: 1, h: 1, draw: drawToilet, rotations: [0, 45, 90, 135] },
    sink: { name: "金属製手洗い場", layer: "fixture", w: 1, h: 1, draw: drawSink, rotations: [0, 45, 90, 135] },
    mealTray: { name: "食事トレー", layer: "overlay", w: 1, h: 1, draw: drawMealTray, rotations: [0, 90, 180, 270] },
    partition: { name: "低い仕切り", layer: "fixture", w: 1, h: 2, draw: drawPartition },
    cabinet: { name: "小設備", layer: "fixture", w: 1, h: 1, draw: drawCabinet },
    grime: { name: "床の汚れ", layer: "overlay", w: 1, h: 1, draw: drawGrime },
    shadow: { name: "境界の影", layer: "overlay", w: 1, h: 1, draw: drawShadow }
  };

  const sample = {
    version: 1,
    name: "ハード監禁室ver1.0",
    cellSize: 64,
    appearance: {"hue":0,"brightness":100,"lineWidth":100},
    width: 12,
    height: 15,
    placements: [
      {"tile":"floor","x":0,"y":1,"layer":"floor"},
      {"tile":"floor","x":6,"y":1,"layer":"floor"},
      {"tile":"floor","x":7,"y":1,"layer":"floor"},
      {"tile":"floor","x":10,"y":1,"layer":"floor"},
      {"tile":"floor","x":11,"y":1,"layer":"floor"},
      {"tile":"floor","x":0,"y":2,"layer":"floor"},
      {"tile":"floor","x":1,"y":2,"layer":"floor"},
      {"tile":"floor","x":2,"y":2,"layer":"floor"},
      {"tile":"floor","x":3,"y":2,"layer":"floor"},
      {"tile":"floor","x":11,"y":2,"layer":"floor"},
      {"tile":"floor","x":0,"y":3,"layer":"floor"},
      {"tile":"floor","x":1,"y":3,"layer":"floor"},
      {"tile":"floor","x":2,"y":3,"layer":"floor"},
      {"tile":"floor","x":3,"y":3,"layer":"floor"},
      {"tile":"floor","x":4,"y":3,"layer":"floor"},
      {"tile":"floor","x":5,"y":3,"layer":"floor"},
      {"tile":"floor","x":6,"y":3,"layer":"floor"},
      {"tile":"floor","x":7,"y":3,"layer":"floor"},
      {"tile":"floor","x":8,"y":3,"layer":"floor"},
      {"tile":"floor","x":9,"y":3,"layer":"floor"},
      {"tile":"floor","x":10,"y":3,"layer":"floor"},
      {"tile":"floor","x":11,"y":3,"layer":"floor"},
      {"tile":"floor","x":0,"y":4,"layer":"floor"},
      {"tile":"floor","x":11,"y":4,"layer":"floor"},
      {"tile":"floor","x":0,"y":5,"layer":"floor"},
      {"tile":"floor","x":11,"y":5,"layer":"floor"},
      {"tile":"floor","x":0,"y":6,"layer":"floor"},
      {"tile":"floor","x":11,"y":6,"layer":"floor"},
      {"tile":"floor","x":0,"y":7,"layer":"floor"},
      {"tile":"floor","x":11,"y":7,"layer":"floor"},
      {"tile":"floor","x":0,"y":8,"layer":"floor"},
      {"tile":"floor","x":11,"y":8,"layer":"floor"},
      {"tile":"floor","x":0,"y":9,"layer":"floor"},
      {"tile":"floor","x":11,"y":9,"layer":"floor"},
      {"tile":"floor","x":0,"y":10,"layer":"floor"},
      {"tile":"floor","x":11,"y":10,"layer":"floor"},
      {"tile":"floor","x":0,"y":11,"layer":"floor"},
      {"tile":"floor","x":11,"y":11,"layer":"floor"},
      {"tile":"floor","x":0,"y":12,"layer":"floor"},
      {"tile":"floor","x":11,"y":12,"layer":"floor"},
      {"tile":"floor","x":0,"y":13,"layer":"floor"},
      {"tile":"floor","x":11,"y":13,"layer":"floor"},
      {"tile":"wallTop","x":0,"y":3,"layer":"structure"},
      {"tile":"wallTop","x":11,"y":3,"layer":"structure"},
      {"tile":"wallTop","x":0,"y":13,"layer":"structure"},
      {"tile":"wallTop","x":1,"y":13,"layer":"structure"},
      {"tile":"wallTop","x":7,"y":13,"layer":"structure"},
      {"tile":"wallTop","x":8,"y":13,"layer":"structure"},
      {"tile":"wallTop","x":10,"y":13,"layer":"structure"},
      {"tile":"wallTop","x":11,"y":13,"layer":"structure"},
      {"tile":"wallSide","x":0,"y":5,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":6,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":7,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":8,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":9,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":10,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":11,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":12,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":4,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":5,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":6,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":7,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":8,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":9,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":10,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":11,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":11,"y":12,"layer":"structure","rotation":0},
      {"tile":"door","x":2,"y":13,"layer":"structure","rotation":0},
      {"tile":"partition","x":8,"y":11,"layer":"fixture"},
      {"tile":"grime","x":3,"y":10,"layer":"overlay"},
      {"tile":"grime","x":7,"y":8,"layer":"overlay"},
      {"tile":"grime","x":9,"y":11,"layer":"overlay"},
      {"tile":"grime","x":10,"y":11,"layer":"overlay"},
      {"tile":"grime","x":10,"y":12,"layer":"overlay"},
      {"tile":"shadow","x":0,"y":12,"layer":"overlay"},
      {"tile":"shadow","x":11,"y":11,"layer":"overlay"},
      {"tile":"shadow","x":11,"y":12,"layer":"overlay"},
      {"tile":"toilet","x":10,"y":12,"layer":"fixture","rotation":90},
      {"tile":"bars","x":1,"y":3,"layer":"structure","width":2,"height":1},
      {"tile":"bars","x":3,"y":3,"layer":"structure","width":2,"height":1},
      {"tile":"bars","x":5,"y":3,"layer":"structure","width":2,"height":1},
      {"tile":"bars","x":7,"y":3,"layer":"structure","width":2,"height":1},
      {"tile":"bars","x":9,"y":3,"layer":"structure","width":2,"height":1},
      {"tile":"window","x":1,"y":0,"layer":"structure","width":10,"height":1},
      {"tile":"curtain","x":10,"y":0,"layer":"fixture","width":1,"height":1},
      {"tile":"curtain","x":1,"y":0,"layer":"fixture","width":1,"height":1},
      {"tile":"sink","x":10,"y":11,"layer":"fixture","rotation":90},
      {"tile":"wallTop","x":11,"y":0,"layer":"structure"},
      {"tile":"wallTop","x":0,"y":0,"layer":"structure"},
      {"tile":"doorSmall","x":0,"y":2,"layer":"structure","rotation":90},
      {"tile":"futon","x":5,"y":6,"layer":"fixture"},
      {"tile":"wallSide","x":11,"y":1,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":4,"layer":"structure","rotation":0},
      {"tile":"wallSide","x":0,"y":1,"layer":"structure","rotation":0},
      {"tile":"rail","x":10,"y":4,"layer":"structure","rotation":45,"width":1,"height":1},
      {"tile":"rail","x":1,"y":4,"layer":"structure","rotation":135,"width":1,"height":1},
      {"tile":"railEdge","x":2,"y":4,"layer":"structure","rotation":180,"width":8,"height":1},
      {"tile":"railEdge","x":1,"y":5,"layer":"structure","rotation":90,"width":1,"height":8},
      {"tile":"railEdge","x":10,"y":5,"layer":"structure","rotation":270,"width":1,"height":4},
      {"tile":"railEdge","x":10,"y":9,"layer":"structure","rotation":0,"width":1,"height":1},
      {"tile":"peekWindow","x":9,"y":13,"layer":"structure"},
      {"tile":"wallTop","x":6,"y":13,"layer":"structure"},
      {"tile":"wallTop","x":5,"y":13,"layer":"structure"},
      {"tile":"wallTop","x":4,"y":13,"layer":"structure"},
      {"tile":"mealHatchClosed","x":5,"y":13,"layer":"fixture","rotation":0},
      {"tile":"table","x":4,"y":12,"layer":"fixture","rotation":90,"width":3,"height":1},
      {"tile":"doorSmall","x":11,"y":2,"layer":"structure","rotation":270},
      {"tile":"floor","x":0,"y":14,"layer":"floor","width":3,"height":1},
      {"tile":"floor","x":3,"y":14,"layer":"floor","width":3,"height":1},
      {"tile":"floor","x":6,"y":14,"layer":"floor","width":3,"height":1},
      {"tile":"floor","x":9,"y":14,"layer":"floor","width":3,"height":1},
      {"tile":"floor","x":1,"y":1,"layer":"floor","width":5,"height":1},
      {"tile":"floor","x":4,"y":2,"layer":"floor","width":5,"height":1},
      {"tile":"floor","x":9,"y":2,"layer":"floor","width":2,"height":1},
      {"tile":"floor","x":8,"y":1,"layer":"floor","width":2,"height":1},
      {"tile":"floor","x":1,"y":7,"layer":"floor","width":6,"height":6},
      {"tile":"floor","x":1,"y":4,"layer":"floor","width":3,"height":3},
      {"tile":"floor","x":4,"y":4,"layer":"floor","width":3,"height":3},
      {"tile":"floor","x":7,"y":4,"layer":"floor","width":3,"height":3},
      {"tile":"floor","x":10,"y":4,"layer":"floor","width":1,"height":5},
      {"tile":"floor","x":7,"y":7,"layer":"floor","width":3,"height":1},
      {"tile":"floor","x":7,"y":8,"layer":"floor","width":3,"height":1},
      {"tile":"floor","x":7,"y":9,"layer":"floor","width":4,"height":2},
      {"tile":"floorDark","x":9,"y":11,"layer":"floor","width":2,"height":1},
      {"tile":"floorDark","x":9,"y":12,"layer":"floor","width":2,"height":1},
      {"tile":"floorDark","x":7,"y":11,"layer":"floor","width":2,"height":2}
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
  let nurseWalk = null;
  let nurseAnimationFrame = 0;
  let nurseHideTimer = 0;

  buildPalette();
  bindControls();
  syncSelectionControls();
  syncFields();
  render();
  nurseSprite.addEventListener("load", () => render());

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
      const label = document.createElement("span");
      label.textContent = tile.name;
      button.append(preview, label);
      button.addEventListener("click", () => selectTile(id));
      palette.append(button);
    });
    renderPalettePreviews();
    selectTile(selectedTile);
  }

  function renderPalettePreviews() {
    document.querySelectorAll(".tile-button").forEach((button) => {
      const tile = tiles[button.dataset.tile];
      const preview = button.querySelector(".tile-preview");
      if (!tile || !preview) return;
      const previewContext = preview.getContext("2d");
      previewContext.clearRect(0, 0, preview.width, preview.height);
      previewContext.save();
      previewContext.filter = appearanceFilter();
      tile.draw(createAppearanceContext(previewContext), 0, 0, 64, 64, true);
      previewContext.restore();
    });
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
    $("walk-nurse").addEventListener("click", startNurseWalk);
    $("show-grid").addEventListener("change", (event) => { showGrid = event.target.checked; render(); });
    $("layer-select").addEventListener("change", (event) => {
      showLayer(event.target.value);
      filterPaletteByLayer(event.target.value);
      setStatus(`${layerName(event.target.value)}を編集中`);
    });
    $("rotation-select").addEventListener("change", (event) => { selectedRotation = Number(event.target.value); resetSelectedSize(); setStatus(`${tiles[selectedTile].name}の向き：${selectedRotation}°`); });
    $("tile-width").addEventListener("change", syncSelectedSize);
    $("tile-height").addEventListener("change", syncSelectedSize);
    $("reset-tile-size").addEventListener("click", resetSelectedSize);
    ["appearance-hue", "appearance-brightness", "appearance-line-width"].forEach((id) => {
      $(id).addEventListener("input", updateAppearance);
    });
    $("reset-appearance").addEventListener("click", resetAppearance);
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

  function filterPaletteByLayer(layer) {
    let firstVisibleTile = null;
    document.querySelectorAll(".tile-button").forEach((button) => {
      const visible = tiles[button.dataset.tile].layer === layer;
      button.hidden = !visible;
      if (visible && !firstVisibleTile) firstVisibleTile = button.dataset.tile;
    });
    if (tiles[selectedTile].layer !== layer && firstVisibleTile) {
      selectTile(firstVisibleTile);
    }
  }

  function selectTile(id, preserveSize = false) {
    selectedTile = id;
    setMode("paint");
    $("layer-select").value = tiles[id].layer;
    filterPaletteByLayer(tiles[id].layer);
    const canRotate = Array.isArray(tiles[id].rotations);
    if (!canRotate || !tiles[id].rotations.includes(selectedRotation)) selectedRotation = 0;
    syncRotationOptions(tiles[id]);
    if (!preserveSize) resetSelectedSize();
    showLayer(tiles[id].layer);
    document.querySelectorAll(".tile-button").forEach((button) => button.classList.toggle("active", button.dataset.tile === id));
    setStatus(`${tiles[id].name}を選択中`);
  }

  function syncRotationOptions(tile) {
    const select = $("rotation-select");
    const rotations = Array.isArray(tile.rotations) ? tile.rotations : [0];
    const labels = {
      0: "横 0°",
      45: "斜め 45°",
      90: "縦 90°",
      135: "斜め 135°",
      180: "反転 180°",
      270: "反転 270°"
    };
    select.replaceChildren(...rotations.map((rotation) => {
      const option = document.createElement("option");
      option.value = String(rotation);
      option.textContent = labels[rotation] || `${rotation}°`;
      return option;
    }));
    select.disabled = !Array.isArray(tile.rotations);
    select.value = String(selectedRotation);
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
    const canRotate = Array.isArray(tile.rotations);
    const next = { tile: tileId, x, y, layer: tile.layer, ...(canRotate ? { rotation: selectedRotation } : {}), ...(customSize ? { width: selectedWidth, height: selectedHeight } : {}) };
    const size = footprint(next);
    if (x + size.w > map.width || y + size.h > map.height) return setStatus("マップの外には配置できません");
    map.placements = map.placements.filter((p) => p.layer !== tile.layer || !overlaps(p, next));
    map.placements.push(next);
    setStatus(`${tile.name}：${x}, ${y}${canRotate ? ` / ${selectedRotation}°` : ""}`);
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
    if (!Array.isArray(tile.rotations) || rotation === 0) return { w: tile.w, h: tile.h };
    if (tile.w === tile.h) return { w: tile.w, h: tile.h };
    if (rotation === 90 || rotation === 270) return { w: tile.h, h: tile.w };
    if (rotation === 45 || rotation === 135) {
      const span = Math.max(1, Math.ceil((tile.w + tile.h) / Math.SQRT2));
      return { w: span, h: span };
    }
    return { w: tile.w, h: tile.h };
  }

  function render(target = ctx, includeGrid = showGrid) {
    const cell = getCellSize();
    canvas.width = map.width * cell;
    canvas.height = map.height * cell;
    target.clearRect(0, 0, canvas.width, canvas.height);
    target.fillStyle = "#141414";
    target.fillRect(0, 0, canvas.width, canvas.height);
    target.save();
    target.filter = appearanceFilter();
    LAYERS.filter((layer) => visibleLayers.has(layer)).forEach((layer) => map.placements.filter((p) => p.layer === layer).forEach((p) => {
      drawPlacement(target, p);
    }));
    target.restore();
    if (includeGrid) drawGrid(target);
    if (target === ctx && nurseWalk) drawNurse(target);
    if (target === ctx && selectedPlacements.size) drawSelection(target);
  }

  function startNurseWalk() {
    cancelAnimationFrame(nurseAnimationFrame);
    clearTimeout(nurseHideTimer);
    const button = $("walk-nurse");
    button.disabled = true;
    nurseWalk = {
      startedAt: performance.now(),
      duration: Math.max(3200, map.width * 300),
      progress: 0,
      frame: 0
    };
    setStatus("看護師が最下段を左から右へ歩いています");
    nurseAnimationFrame = requestAnimationFrame(animateNurseWalk);
  }

  function animateNurseWalk(now) {
    if (!nurseWalk) return;
    const elapsed = now - nurseWalk.startedAt;
    nurseWalk.progress = Math.min(1, elapsed / nurseWalk.duration);
    nurseWalk.frame = Math.floor(elapsed / 170) % 3;
    render();
    if (nurseWalk.progress < 1) {
      nurseAnimationFrame = requestAnimationFrame(animateNurseWalk);
      return;
    }
    setStatus("看護師が右端まで歩きました");
    nurseHideTimer = window.setTimeout(() => {
      nurseWalk = null;
      $("walk-nurse").disabled = false;
      render();
    }, 450);
  }

  function drawNurse(target) {
    if (!nurseWalk || !nurseSprite.complete || !nurseSprite.naturalWidth) return;
    const cell = getCellSize();
    const size = cell * .92;
    const travel = Math.max(0, map.width - 1) * cell;
    const x = nurseWalk.progress * travel + (cell - size) / 2;
    const y = (map.height - 1) * cell + (cell - size) / 2;
    target.save();
    target.shadowColor = "rgba(0,0,0,.55)";
    target.shadowBlur = Math.max(3, cell * .08);
    target.shadowOffsetY = Math.max(2, cell * .04);
    target.drawImage(nurseSprite, nurseWalk.frame * 64, 0, 64, 64, x, y, size, size);
    target.restore();
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
    const drawingContext = createAppearanceContext(target);
    drawingContext.save();
    drawingContext.translate(x, y);
    drawingContext.scale(cell / CELL, cell / CELL);
    const rotation = Number(placement.rotation || 0);
    if (placement.tile === "rail") drawRailRotated(drawingContext, 0, 0, baseWidth, baseHeight, rotation);
    else if (placement.tile === "railEdge") drawRailEdgeRotated(drawingContext, 0, 0, baseWidth, baseHeight, rotation);
    else if (Array.isArray(tile.rotations)) drawTileRotated(drawingContext, tile, baseWidth, baseHeight, rotation);
    else tile.draw(drawingContext, 0, 0, baseWidth, baseHeight, false);
    drawingContext.restore();
  }

  function getAppearance() {
    const source = map.appearance || DEFAULT_APPEARANCE;
    return {
      hue: clampNumber(source.hue, -180, 180, DEFAULT_APPEARANCE.hue),
      brightness: clampNumber(source.brightness, 50, 150, DEFAULT_APPEARANCE.brightness),
      lineWidth: clampNumber(source.lineWidth, 50, 200, DEFAULT_APPEARANCE.lineWidth)
    };
  }

  function appearanceFilter() {
    const appearance = getAppearance();
    return `hue-rotate(${appearance.hue}deg) brightness(${appearance.brightness}%)`;
  }

  function createAppearanceContext(target) {
    const multiplier = getAppearance().lineWidth / 100;
    return new Proxy(target, {
      get(context, property) {
        const value = context[property];
        return typeof value === "function" ? value.bind(context) : value;
      },
      set(context, property, value) {
        context[property] = property === "lineWidth" && typeof value === "number"
          ? value * multiplier
          : value;
        return true;
      }
    });
  }

  function updateAppearance() {
    map.appearance = {
      hue: Number($("appearance-hue").value),
      brightness: Number($("appearance-brightness").value),
      lineWidth: Number($("appearance-line-width").value)
    };
    syncAppearanceControls();
    renderPalettePreviews();
    render();
    refreshJson();
  }

  function resetAppearance() {
    remember();
    map.appearance = { ...DEFAULT_APPEARANCE };
    syncAppearanceControls();
    renderPalettePreviews();
    render();
    refreshJson();
    setStatus("見た目を標準に戻しました");
  }

  function syncAppearanceControls() {
    const appearance = getAppearance();
    $("appearance-hue").value = appearance.hue;
    $("appearance-brightness").value = appearance.brightness;
    $("appearance-line-width").value = appearance.lineWidth;
    $("appearance-hue-value").textContent = `${appearance.hue}°`;
    $("appearance-brightness-value").textContent = `${appearance.brightness}%`;
    $("appearance-line-width-value").textContent = `${appearance.lineWidth}%`;
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
    replaceMap({ version: 1, name: "新規マップ", cellSize, appearance: { ...DEFAULT_APPEARANCE }, width, height, placements }, "新規マップを作成しました");
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
    syncAppearanceControls();
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
    const appearance = value.appearance || {};
    value.appearance = {
      hue: clampNumber(appearance.hue, -180, 180, DEFAULT_APPEARANCE.hue),
      brightness: clampNumber(appearance.brightness, 50, 150, DEFAULT_APPEARANCE.brightness),
      lineWidth: clampNumber(appearance.lineWidth, 50, 200, DEFAULT_APPEARANCE.lineWidth)
    };
    value.placements = value.placements.map((p) => {
      if (p.tile === "railH") return { ...p, tile: "rail", rotation: 0 };
      if (p.tile === "railV") return { ...p, tile: "rail", rotation: 90 };
      return p;
    }).filter((p) => tiles[p.tile] && Number.isInteger(p.x) && Number.isInteger(p.y) && p.x >= 0 && p.y >= 0).map((p) => {
      const rotation = tiles[p.tile].rotations?.includes(Number(p.rotation)) ? Number(p.rotation) : 0;
      const normal = defaultFootprint(p.tile, rotation);
      const hasCustomSize = Number.isInteger(p.width) && Number.isInteger(p.height) && (p.width !== normal.w || p.height !== normal.h);
      return { tile: p.tile, x: p.x, y: p.y, layer: tiles[p.tile].layer, ...(Array.isArray(tiles[p.tile].rotations) ? { rotation } : {}), ...(hasCustomSize ? { width: clamp(p.width, 1, 12), height: clamp(p.height, 1, 12) } : {}) };
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
    out.save();
    out.filter = appearanceFilter();
    LAYERS.filter((layer) => visibleLayers.has(layer)).forEach((layer) => map.placements.filter((p) => p.layer === layer).forEach((p) => drawPlacement(out, p)));
    out.restore();
    output.toBlob((blob) => download(blob, `${safeName(map.name)}.png`), "image/png");
  }
  function download(blob, filename) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function safeName(name) { return name.replace(/[\\/:*?"<>|\s]+/g, "-").replace(/^-|-$/g, "") || "map"; }
  function setStatus(text) { $("status").textContent = text; }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function clamp(value, min, max) { return Math.min(max, Math.max(min, Math.round(value || min))); }
  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.round(number))) : fallback;
  }
  function getCellSize() { return clamp(Number(map.cellSize || CELL), 16, 128); }

  function rect(g, x, y, w, h, fill, stroke = null, line = 1) { g.fillStyle = fill; g.fillRect(x, y, w, h); if (stroke) { g.strokeStyle = stroke; g.lineWidth = line; g.strokeRect(x + line / 2, y + line / 2, w - line, h - line); } }
  function drawFloor(g, x, y, w, h) { rect(g, x, y, w, h, "#77736b", "#59564f", 2); g.fillStyle = "rgba(255,255,255,.035)"; for (let i = 0; i < 8; i++) g.fillRect(x + (i * 19 + y) % w, y + (i * 31 + x) % h, 2, 2); }
  function drawFloorDark(g, x, y, w, h) { rect(g, x, y, w, h, "#55534e", "#42413d", 2); }
  function drawWallTop(g, x, y, w, h) { const grad = g.createLinearGradient(x, y, x, y + h); grad.addColorStop(0, "#a09b91"); grad.addColorStop(.18, "#6c6963"); grad.addColorStop(1, "#393a39"); rect(g, x, y, w, h, grad, "#222", 2); g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(x + 3, y + 4, w - 6, 5); }
  function drawPeekWindow(g, x, y, w, h) {
    drawWallTop(g, x, y, w, h);
    const frameX = x + w * .1;
    const frameY = y + h * .29;
    const frameW = w * .8;
    const frameH = h * .38;
    rect(g, frameX, frameY, frameW, frameH, "#292b2b", "#171818", Math.max(2, w * .035));
    const glass = g.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
    glass.addColorStop(0, "#8e9b9c");
    glass.addColorStop(.22, "#546163");
    glass.addColorStop(.62, "#20292b");
    glass.addColorStop(1, "#101516");
    rect(g, frameX + w * .07, frameY + h * .07, frameW - w * .14, frameH - h * .14, glass, "#aaa9a2", Math.max(1, w * .02));
    g.fillStyle = "rgba(235,240,235,.34)";
    g.fillRect(frameX + w * .12, frameY + h * .1, frameW * .45, Math.max(2, h * .035));
    g.fillStyle = "#76766f";
    g.fillRect(frameX + frameW * .47, frameY + h * .03, Math.max(2, w * .05), frameH - h * .06);
    g.fillStyle = "#242525";
    g.fillRect(x + w * .35, y + h * .73, w * .3, Math.max(2, h * .055));
  }
  function drawWallSide(g, x, y, w, h) { const grad = g.createLinearGradient(x, y, x + w, y); grad.addColorStop(0, "#302f2e"); grad.addColorStop(.5, "#77736c"); grad.addColorStop(1, "#3a3937"); rect(g, x, y, w, h, grad, "#222", 2); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x + 8, y + 3, 5, h - 6); }
  function drawBars(g, x, y, w, h) { drawWallTop(g, x, y, w, h); rect(g, x + 8, y + 10, w - 16, h - 18, "#171819", "#aaa49a", 3); for (let i = 0; i < 8; i++) { const bx = x + 19 + i * ((w - 38) / 7); g.fillStyle = "#c8c7c1"; g.fillRect(bx - 3, y + 15, 6, h - 28); g.fillStyle = "#4a4b4c"; g.fillRect(bx + 2, y + 15, 3, h - 28); } }
  function drawRailH(g, x, y, w, h) { g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(x + 7, y + h * .54, w - 14, 8); g.fillStyle = "#dedbd2"; g.fillRect(x + 6, y + h * .45, w - 12, 6); g.fillStyle = "#6b6964"; g.fillRect(x + 6, y + h * .45 + 6, w - 12, 3); }
  function drawRailEdge(g, x, y, w) {
    drawRailEdgeHorizontal(g, x, y, w, 1);
  }
  function drawRailEdgeHorizontal(g, x, y, w, railY) {
    g.fillStyle = "rgba(0,0,0,.22)";
    g.fillRect(x + 7, railY + 6, w - 14, 8);
    g.fillStyle = "#dedbd2";
    g.fillRect(x + 6, railY, w - 12, 6);
    g.fillStyle = "#6b6964";
    g.fillRect(x + 6, railY + 6, w - 12, 3);
  }
  function drawRailEdgeVertical(g, x, y, h, railX, faceLeft) {
    g.fillStyle = "rgba(0,0,0,.22)";
    g.fillRect(railX + (faceLeft ? 6 : -5), y + 7, 8, h - 14);
    g.fillStyle = "#dedbd2";
    g.fillRect(railX, y + 6, 6, h - 12);
    g.fillStyle = "#6b6964";
    g.fillRect(railX + 6, y + 6, 3, h - 12);
  }
  function drawRailEdgeRotated(g, x, y, w, h, rotation) {
    if (rotation === 90) return drawRailEdgeVertical(g, x, y, h, x + w - 10, false);
    if (rotation === 180) return drawRailEdgeHorizontal(g, x, y, w, y + h - 10);
    if (rotation === 270) return drawRailEdgeVertical(g, x, y, h, x + 1, true);
    return drawRailEdgeHorizontal(g, x, y, w, y + 1);
  }
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
  function drawTileRotated(g, tile, w, h, rotation) {
    if (rotation === 0) return tile.draw(g, 0, 0, w, h, false);
    const angle = rotation * Math.PI / 180;
    const nativeWidth = tile.w * CELL;
    const nativeHeight = tile.h * CELL;
    const cos = Math.abs(Math.cos(angle));
    const sin = Math.abs(Math.sin(angle));
    const rotatedWidth = nativeWidth * cos + nativeHeight * sin;
    const rotatedHeight = nativeWidth * sin + nativeHeight * cos;
    const scale = Math.min(w / rotatedWidth, h / rotatedHeight);
    const drawWidth = nativeWidth * scale;
    const drawHeight = nativeHeight * scale;
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(angle);
    tile.draw(g, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight, false);
    g.restore();
  }
  function drawDoor(g, x, y, w, h) {
    g.save();
    g.shadowColor = "rgba(0,0,0,.65)";
    g.shadowBlur = Math.max(5, h * .12);
    g.shadowOffsetY = Math.max(3, h * .06);

    const frame = g.createLinearGradient(x, y, x, y + h);
    frame.addColorStop(0, "#aaa79e");
    frame.addColorStop(.18, "#676763");
    frame.addColorStop(.55, "#3d3f3e");
    frame.addColorStop(1, "#232525");
    rect(g, x + w * .025, y + h * .04, w * .95, h * .92, frame, "#171818", Math.max(2, h * .045));
    g.shadowColor = "transparent";

    const slabX = x + w * .095;
    const slabY = y + h * .13;
    const slabW = w * .81;
    const slabH = h * .77;
    const steel = g.createLinearGradient(slabX, slabY, slabX + slabW, slabY + slabH);
    steel.addColorStop(0, "#5d605e");
    steel.addColorStop(.28, "#454846");
    steel.addColorStop(.58, "#555856");
    steel.addColorStop(1, "#303332");
    rect(g, slabX, slabY, slabW, slabH, steel, "#171918", Math.max(2, h * .04));

    g.fillStyle = "rgba(255,255,255,.13)";
    g.fillRect(slabX + h * .05, slabY + h * .045, slabW - h * .1, Math.max(2, h * .035));
    g.fillStyle = "rgba(0,0,0,.18)";
    g.fillRect(slabX + h * .04, slabY + slabH - h * .07, slabW - h * .08, Math.max(2, h * .035));

    const slotX = x + w * .36;
    const slotY = y + h * .28;
    const slotW = w * .28;
    const slotH = h * .19;
    rect(g, slotX, slotY, slotW, slotH, "#171a1a", "#a8a69e", Math.max(2, h * .04));
    const glass = g.createLinearGradient(slotX, slotY, slotX, slotY + slotH);
    glass.addColorStop(0, "#596264");
    glass.addColorStop(.42, "#242b2c");
    glass.addColorStop(1, "#0e1212");
    rect(g, slotX + h * .055, slotY + h * .05, slotW - h * .11, slotH - h * .1, glass, "#252726", Math.max(1, h * .02));
    g.fillStyle = "rgba(224,230,224,.22)";
    g.fillRect(slotX + h * .08, slotY + h * .065, slotW * .48, Math.max(1, h * .018));

    const ventX = x + w * .35;
    const ventY = y + h * .66;
    const ventW = w * .3;
    const ventH = h * .15;
    rect(g, ventX, ventY, ventW, ventH, "#242725", "#85847d", Math.max(2, h * .03));
    const slats = 10;
    for (let i = 0; i < slats; i++) {
      const px = ventX + ventW * (.08 + i * .084);
      g.fillStyle = i % 2 ? "#111313" : "#0b0d0d";
      g.fillRect(px, ventY + ventH * .18, Math.max(1, ventW * .026), ventH * .64);
      g.fillStyle = "rgba(210,211,204,.16)";
      g.fillRect(px + Math.max(1, ventW * .026), ventY + ventH * .18, Math.max(1, ventW * .012), ventH * .64);
    }

    const handleX = x + w * .205;
    const handleY = y + h * .53;
    g.strokeStyle = "#b7b6af";
    g.lineWidth = Math.max(3, h * .065);
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(handleX, handleY - h * .06);
    g.lineTo(handleX, handleY + h * .06);
    g.lineTo(handleX + w * .075, handleY + h * .06);
    g.stroke();
    g.strokeStyle = "#494b49";
    g.lineWidth = Math.max(1, h * .022);
    g.beginPath();
    g.moveTo(handleX + h * .02, handleY - h * .05);
    g.lineTo(handleX + h * .02, handleY + h * .045);
    g.lineTo(handleX + w * .072, handleY + h * .045);
    g.stroke();
    g.fillStyle = "#161817";
    g.beginPath();
    g.arc(handleX - h * .015, handleY + h * .115, Math.max(2, h * .035), 0, Math.PI * 2);
    g.fill();

    for (const hy of [.26, .5, .74]) {
      const hingeX = x + w * .855;
      const hingeY = y + h * hy;
      const hinge = g.createLinearGradient(hingeX, hingeY, hingeX + w * .035, hingeY);
      hinge.addColorStop(0, "#3a3c3a");
      hinge.addColorStop(.48, "#aaa9a2");
      hinge.addColorStop(1, "#303230");
      rect(g, hingeX, hingeY, w * .035, h * .14, hinge, "#202220", Math.max(1, h * .018));
    }

    g.fillStyle = "rgba(15,16,15,.22)";
    for (let i = 0; i < 18; i++) {
      const px = slabX + ((i * 37) % 83) / 83 * slabW;
      const py = slabY + ((i * 53) % 79) / 79 * slabH;
      g.beginPath();
      g.arc(px, py, Math.max(.6, h * .009), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  function drawDoorSmall(g, x, y, w, h) {
    g.save();
    g.shadowColor = "rgba(0,0,0,.55)";
    g.shadowBlur = Math.max(4, h * .08);
    g.shadowOffsetY = Math.max(2, h * .05);
    rect(g, x + w * .05, y + h * .22, w * .9, h * .56, "#393a3b", "#151515", Math.max(2, h * .04));
    g.shadowColor = "transparent";
    g.fillStyle = "rgba(255,255,255,.12)";
    g.fillRect(x + w * .09, y + h * .27, w * .82, Math.max(2, h * .05));
    rect(g, x + w * .36, y + h * .36, w * .28, h * .12, "#171819", "#aaa69d", Math.max(1, h * .025));
    g.fillStyle = "#aaa69d";
    g.beginPath();
    g.arc(x + w * .78, y + h * .57, Math.max(2, h * .045), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#70716e";
    g.fillRect(x + w * .08, y + h * .72, w * .84, Math.max(2, h * .045));
    g.restore();
  }
  function drawMealHatchBase(g, x, y, w, h) {
    g.save();
    g.shadowColor = "rgba(0,0,0,.55)";
    g.shadowBlur = Math.max(5, w * .08);
    g.shadowOffsetY = Math.max(3, h * .05);
    const frame = g.createLinearGradient(x, y, x + w, y + h);
    frame.addColorStop(0, "#9d9a92");
    frame.addColorStop(.28, "#555856");
    frame.addColorStop(.7, "#343635");
    frame.addColorStop(1, "#797871");
    rect(g, x + w * .07, y + h * .08, w * .86, h * .84, frame, "#191b1a", Math.max(2, w * .035));
    g.shadowColor = "transparent";
    rect(g, x + w * .14, y + h * .16, w * .72, h * .68, "#313432", "#151716", Math.max(2, w * .026));
    g.fillStyle = "rgba(255,255,255,.14)";
    g.fillRect(x + w * .11, y + h * .11, w * .78, Math.max(2, h * .035));
    g.restore();
  }
  function drawMealHatchClosed(g, x, y, w, h) {
    const compactW = w * .58;
    const compactH = h * .58;
    x += (w - compactW) / 2;
    y += (h - compactH) * .82;
    w = compactW;
    h = compactH;
    drawMealHatchBase(g, x, y, w, h);
    g.save();
    const panelX = x + w * .18;
    const panelY = y + h * .2;
    const panelW = w * .64;
    const panelH = h * .58;
    const panel = g.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
    panel.addColorStop(0, "#666964");
    panel.addColorStop(.45, "#424542");
    panel.addColorStop(1, "#2d302e");
    rect(g, panelX, panelY, panelW, panelH, panel, "#1a1c1b", Math.max(2, w * .032));
    g.fillStyle = "rgba(225,225,217,.12)";
    g.fillRect(panelX + w * .035, panelY + h * .035, panelW - w * .07, Math.max(2, h * .03));
    g.fillStyle = "#aaa9a1";
    g.fillRect(x + w * .39, y + h * .68, w * .22, Math.max(3, h * .055));
    g.fillStyle = "#303230";
    g.fillRect(x + w * .43, y + h * .69, w * .14, Math.max(1, h * .02));
    for (const hx of [.22, .72]) {
      const metal = g.createLinearGradient(x + w * hx, 0, x + w * (hx + .06), 0);
      metal.addColorStop(0, "#353735");
      metal.addColorStop(.5, "#aaa9a2");
      metal.addColorStop(1, "#292b29");
      rect(g, x + w * hx, y + h * .16, w * .06, h * .12, metal, "#202220", Math.max(1, w * .014));
    }
    g.restore();
  }
  function drawMealHatchOpen(g, x, y, w, h) {
    const compactW = w * .58;
    const compactH = h * .58;
    x += (w - compactW) / 2;
    y += (h - compactH) * .82;
    w = compactW;
    h = compactH;
    drawMealHatchBase(g, x, y, w, h);
    g.save();
    const openingX = x + w * .17;
    const openingY = y + h * .39;
    const openingW = w * .66;
    const openingH = h * .39;
    const dark = g.createLinearGradient(openingX, openingY, openingX, openingY + openingH);
    dark.addColorStop(0, "#070909");
    dark.addColorStop(.55, "#171b1a");
    dark.addColorStop(1, "#2b2e2c");
    rect(g, openingX, openingY, openingW, openingH, dark, "#9b9991", Math.max(2, w * .032));
    g.fillStyle = "rgba(235,233,223,.28)";
    g.fillRect(openingX + w * .025, openingY + openingH - h * .075, openingW - w * .05, Math.max(3, h * .055));

    g.shadowColor = "rgba(0,0,0,.58)";
    g.shadowBlur = Math.max(4, w * .065);
    g.shadowOffsetY = Math.max(2, h * .04);
    const flap = g.createLinearGradient(x, y + h * .08, x, y + h * .37);
    flap.addColorStop(0, "#777973");
    flap.addColorStop(.48, "#484b48");
    flap.addColorStop(1, "#292c2a");
    rect(g, x + w * .17, y + h * .12, w * .66, h * .23, flap, "#181a19", Math.max(2, w * .03));
    g.shadowColor = "transparent";
    g.fillStyle = "rgba(235,235,226,.16)";
    g.fillRect(x + w * .21, y + h * .15, w * .58, Math.max(2, h * .028));
    g.fillStyle = "#9c9b94";
    g.fillRect(x + w * .24, y + h * .345, w * .52, Math.max(2, h * .04));
    for (const hx of [.22, .72]) {
      rect(g, x + w * hx, y + h * .31, w * .06, h * .09, "#74756f", "#242624", Math.max(1, w * .014));
    }
    g.restore();
  }
  function drawMealTray(g, x, y, w, h) {
    g.save();
    g.shadowColor = "rgba(0,0,0,.55)";
    g.shadowBlur = Math.max(5, w * .08);
    g.shadowOffsetY = Math.max(3, h * .05);
    const tray = g.createLinearGradient(x, y, x + w, y + h);
    tray.addColorStop(0, "#b8ada0");
    tray.addColorStop(.42, "#847c73");
    tray.addColorStop(1, "#5b5650");
    rect(g, x + w * .07, y + h * .14, w * .86, h * .72, tray, "#2d2b29", Math.max(2, w * .035));
    g.shadowColor = "transparent";
    rect(g, x + w * .13, y + h * .2, w * .74, h * .6, "#aca398", "#dad3c8", Math.max(1, w * .02));

    g.fillStyle = "#e8e2d6";
    g.beginPath();
    g.ellipse(x + w * .34, y + h * .48, w * .17, h * .2, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#79746d";
    g.lineWidth = Math.max(1, w * .018);
    g.stroke();
    g.fillStyle = "#f2eee4";
    g.beginPath();
    g.ellipse(x + w * .34, y + h * .46, w * .12, h * .14, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(154,145,132,.35)";
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(x + w * (.29 + i * .025), y + h * (.43 + (i % 2) * .06), Math.max(1, w * .012), 0, Math.PI * 2);
      g.stroke();
    }

    g.fillStyle = "#d9d2c6";
    g.beginPath();
    g.ellipse(x + w * .68, y + h * .4, w * .14, h * .16, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#747069";
    g.stroke();
    g.fillStyle = "#75533a";
    g.beginPath();
    g.ellipse(x + w * .68, y + h * .41, w * .1, h * .105, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#b4a65c";
    g.beginPath();
    g.arc(x + w * .65, y + h * .39, Math.max(2, w * .025), 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#698055";
    g.beginPath();
    g.arc(x + w * .71, y + h * .43, Math.max(2, w * .022), 0, Math.PI * 2);
    g.fill();

    rect(g, x + w * .56, y + h * .62, w * .25, h * .11, "#ded7ca", "#77726a", Math.max(1, w * .016));
    g.fillStyle = "#ad7048";
    g.fillRect(x + w * .59, y + h * .65, w * .08, h * .055);
    g.fillStyle = "#7f925d";
    g.fillRect(x + w * .69, y + h * .65, w * .08, h * .055);
    g.restore();
  }
  function drawWindow(g, x, y, w, h) {
    const frame = Math.max(5, Math.min(w, h) * .12);
    rect(g, x, y, w, h, "#5d5f60", "#222", 3);
    const grad = g.createLinearGradient(x, y + frame, x, y + h - frame);
    grad.addColorStop(0, "#879ba1");
    grad.addColorStop(.55, "#37464b");
    grad.addColorStop(1, "#1c2428");
    rect(g, x + frame, y + frame, w - frame * 2, h - frame * 2, grad, "#a9aaa5", 2);
    g.strokeStyle = "rgba(220,225,220,.65)";
    g.lineWidth = Math.max(2, frame * .45);
    for (let i = 1; i < 3; i++) {
      const px = x + frame + (w - frame * 2) * i / 3;
      g.beginPath();
      g.moveTo(px, y + frame);
      g.lineTo(px, y + h - frame);
      g.stroke();
    }
  }
  function drawCurtain(g, x, y, w, h) {
    const grad = g.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, "#aaa59a");
    grad.addColorStop(1, "#5b5955");
    rect(g, x + 3, y + 4, w - 6, h - 8, grad, "#343331", 2);
    const folds = Math.max(4, Math.round(w / 42));
    for (let i = 1; i < folds; i++) {
      const px = x + w * i / folds;
      g.strokeStyle = i % 2 ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.25)";
      g.lineWidth = Math.max(2, h * .05);
      g.beginPath();
      g.moveTo(px, y + 7);
      g.quadraticCurveTo(px - 5, y + h / 2, px + 2, y + h - 7);
      g.stroke();
    }
  }
  function drawFuton(g, x, y, w, h) {
    const insetX = Math.max(5, w * .085);
    const insetY = Math.max(4, h * .035);
    const left = x + insetX;
    const top = y + insetY;
    const bedW = w - insetX * 2;
    const bedH = h - insetY * 2;
    const radius = Math.max(5, Math.min(bedW, bedH) * .06);
    const rounded = (rx, ry, rw, rh, rr) => {
      const r = Math.min(rr, rw / 2, rh / 2);
      g.beginPath();
      g.moveTo(rx + r, ry);
      g.arcTo(rx + rw, ry, rx + rw, ry + rh, r);
      g.arcTo(rx + rw, ry + rh, rx, ry + rh, r);
      g.arcTo(rx, ry + rh, rx, ry, r);
      g.arcTo(rx, ry, rx + rw, ry, r);
      g.closePath();
    };

    g.save();
    g.shadowColor = "rgba(0,0,0,.62)";
    g.shadowBlur = Math.max(8, w * .09);
    g.shadowOffsetX = Math.max(2, w * .025);
    g.shadowOffsetY = Math.max(4, h * .035);

    const mattress = g.createLinearGradient(left, top, left + bedW, top + bedH);
    mattress.addColorStop(0, "#6f8065");
    mattress.addColorStop(.28, "#87947a");
    mattress.addColorStop(.62, "#66745d");
    mattress.addColorStop(1, "#4b5845");
    rounded(left, top, bedW, bedH, radius);
    g.fillStyle = mattress;
    g.fill();
    g.strokeStyle = "#30392c";
    g.lineWidth = Math.max(2, w * .018);
    g.stroke();
    g.shadowColor = "transparent";

    g.strokeStyle = "rgba(218,226,207,.22)";
    g.lineWidth = Math.max(1, w * .009);
    rounded(left + bedW * .055, top + bedH * .035, bedW * .89, bedH * .93, radius * .65);
    g.stroke();
    for (let i = 1; i < 5; i++) {
      const sy = top + bedH * i / 5;
      g.strokeStyle = i % 2 ? "rgba(32,43,29,.2)" : "rgba(220,228,211,.13)";
      g.beginPath();
      g.moveTo(left + bedW * .08, sy);
      g.bezierCurveTo(left + bedW * .3, sy - bedH * .025, left + bedW * .7, sy + bedH * .025, left + bedW * .92, sy);
      g.stroke();
    }

    const blanketX = left + bedW * .06;
    const blanketY = top + bedH * .31;
    const blanketW = bedW * .88;
    const blanketH = bedH * .64;
    const blanket = g.createLinearGradient(blanketX, blanketY, blanketX + blanketW, blanketY + blanketH);
    blanket.addColorStop(0, "#d7d3c8");
    blanket.addColorStop(.38, "#bbb8ae");
    blanket.addColorStop(.72, "#d1cdc2");
    blanket.addColorStop(1, "#9c9a92");
    rounded(blanketX, blanketY, blanketW, blanketH, radius * .75);
    g.fillStyle = blanket;
    g.fill();
    g.strokeStyle = "#6f6d67";
    g.lineWidth = Math.max(1.5, w * .014);
    g.stroke();

    g.lineCap = "round";
    g.lineWidth = Math.max(1, w * .009);
    for (let i = 0; i < 7; i++) {
      const sy = blanketY + blanketH * (.12 + i * .12);
      const offset = i % 2 ? blanketH * .018 : -blanketH * .014;
      g.strokeStyle = i % 3 === 0 ? "rgba(90,87,81,.3)" : "rgba(245,241,231,.28)";
      g.beginPath();
      g.moveTo(blanketX + blanketW * .08, sy);
      g.bezierCurveTo(blanketX + blanketW * .28, sy + offset, blanketX + blanketW * .46, sy - offset, blanketX + blanketW * .62, sy);
      g.bezierCurveTo(blanketX + blanketW * .76, sy + offset, blanketX + blanketW * .84, sy - offset, blanketX + blanketW * .92, sy);
      g.stroke();
    }
    g.strokeStyle = "rgba(78,75,70,.24)";
    g.beginPath();
    g.moveTo(blanketX + blanketW * .22, blanketY + blanketH * .08);
    g.bezierCurveTo(blanketX + blanketW * .17, blanketY + blanketH * .36, blanketX + blanketW * .32, blanketY + blanketH * .62, blanketX + blanketW * .25, blanketY + blanketH * .93);
    g.moveTo(blanketX + blanketW * .73, blanketY + blanketH * .06);
    g.bezierCurveTo(blanketX + blanketW * .81, blanketY + blanketH * .33, blanketX + blanketW * .68, blanketY + blanketH * .64, blanketX + blanketW * .77, blanketY + blanketH * .92);
    g.stroke();

    const pillowX = left + bedW * .13;
    const pillowY = top + bedH * .055;
    const pillowW = bedW * .74;
    const pillowH = bedH * .245;
    const pillow = g.createRadialGradient(
      pillowX + pillowW * .44, pillowY + pillowH * .38, 1,
      pillowX + pillowW * .5, pillowY + pillowH * .5, pillowW * .62
    );
    pillow.addColorStop(0, "#eeebe2");
    pillow.addColorStop(.58, "#cbc7bc");
    pillow.addColorStop(1, "#99968e");
    rounded(pillowX, pillowY, pillowW, pillowH, radius);
    g.fillStyle = pillow;
    g.fill();
    g.strokeStyle = "#77746d";
    g.lineWidth = Math.max(1.5, w * .014);
    g.stroke();
    rounded(pillowX + pillowW * .075, pillowY + pillowH * .13, pillowW * .85, pillowH * .72, radius * .65);
    g.strokeStyle = "rgba(100,97,90,.3)";
    g.lineWidth = Math.max(1, w * .008);
    g.stroke();

    g.fillStyle = "rgba(255,255,255,.08)";
    rounded(left + bedW * .08, top + bedH * .025, bedW * .84, bedH * .035, radius * .3);
    g.fill();
    g.restore();
  }
  function drawTable(g, x, y, w, h) { g.save(); g.shadowColor = "#111"; g.shadowBlur = 8; g.shadowOffsetX = 4; rect(g, x + 10, y + 5, w - 20, h - 10, "#5a3d22", "#26190e", 3); g.strokeStyle = "rgba(219,166,102,.28)"; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x + 14 + i * 9, y + 9); g.lineTo(x + 14 + i * 9, y + h - 9); g.stroke(); } g.restore(); }
  function drawToilet(g, x, y, w, h) {
    g.save();
    g.shadowColor = "rgba(0,0,0,.6)";
    g.shadowBlur = Math.max(5, w * .09);
    g.shadowOffsetY = Math.max(2, h * .05);
    const steel = g.createLinearGradient(x, y, x + w, y + h);
    steel.addColorStop(0, "#55595a");
    steel.addColorStop(.28, "#c4c7c4");
    steel.addColorStop(.52, "#737777");
    steel.addColorStop(.78, "#d2d3cf");
    steel.addColorStop(1, "#4b4f50");
    g.beginPath();
    g.ellipse(x + w * .5, y + h * .56, w * .34, h * .38, 0, 0, Math.PI * 2);
    g.fillStyle = steel;
    g.fill();
    g.strokeStyle = "#303334";
    g.lineWidth = Math.max(2, w * .045);
    g.stroke();
    g.shadowColor = "transparent";
    g.beginPath();
    g.ellipse(x + w * .5, y + h * .57, w * .2, h * .25, 0, 0, Math.PI * 2);
    g.fillStyle = "#252b2d";
    g.fill();
    g.strokeStyle = "#d8d9d4";
    g.lineWidth = Math.max(2, w * .035);
    g.stroke();
    rect(g, x + w * .27, y + h * .08, w * .46, h * .2, steel, "#343738", Math.max(2, w * .035));
    g.fillStyle = "#bfc2bf";
    g.beginPath();
    g.arc(x + w * .5, y + h * .18, Math.max(2, w * .045), 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  function drawSink(g, x, y, w, h) {
    g.save();
    g.shadowColor = "rgba(0,0,0,.58)";
    g.shadowBlur = Math.max(5, w * .08);
    g.shadowOffsetY = Math.max(2, h * .05);
    const steel = g.createLinearGradient(x, y, x + w, y);
    steel.addColorStop(0, "#4a4e4f");
    steel.addColorStop(.2, "#c4c7c4");
    steel.addColorStop(.48, "#717676");
    steel.addColorStop(.76, "#d1d2ce");
    steel.addColorStop(1, "#4b4f50");
    rect(g, x + w * .08, y + h * .12, w * .84, h * .76, steel, "#303334", Math.max(2, w * .04));
    g.shadowColor = "transparent";
    g.beginPath();
    g.ellipse(x + w * .5, y + h * .55, w * .31, h * .24, 0, 0, Math.PI * 2);
    g.fillStyle = "#333a3c";
    g.fill();
    g.strokeStyle = "#e0e1dd";
    g.lineWidth = Math.max(2, w * .035);
    g.stroke();
    g.beginPath();
    g.arc(x + w * .5, y + h * .56, Math.max(2, w * .04), 0, Math.PI * 2);
    g.fillStyle = "#171b1c";
    g.fill();
    g.strokeStyle = "#929795";
    g.stroke();
    g.strokeStyle = "#d7d9d5";
    g.lineWidth = Math.max(3, w * .07);
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(x + w * .5, y + h * .2);
    g.lineTo(x + w * .5, y + h * .34);
    g.lineTo(x + w * .6, y + h * .39);
    g.stroke();
    g.fillStyle = "#858a89";
    g.fillRect(x + w * .22, y + h * .2, w * .1, h * .08);
    g.fillRect(x + w * .68, y + h * .2, w * .1, h * .08);
    g.restore();
  }
  function drawPartition(g, x, y, w, h) { g.save(); g.shadowColor = "rgba(0,0,0,.5)"; g.shadowBlur = 8; g.shadowOffsetX = 5; const grad = g.createLinearGradient(x, y, x + w, y); grad.addColorStop(0, "#4b4a46"); grad.addColorStop(.5, "#89857b"); grad.addColorStop(1, "#4a4946"); rect(g, x + 20, y + 3, w - 40, h - 6, grad, "#2b2b29", 2); g.restore(); }
  function drawCabinet(g, x, y, w, h) { g.save(); g.shadowColor = "#111"; g.shadowBlur = 7; rect(g, x + 6, y + 13, w - 12, h - 19, "#3e3124", "#17120d", 3); g.fillStyle = "#806040"; g.fillRect(x + 10, y + 17, w - 20, 5); g.restore(); }
  function drawGrime(g, x, y, w, h) { g.save(); for (let i = 0; i < 10; i++) { g.fillStyle = `rgba(38,31,22,${.05 + (i % 3) * .04})`; g.beginPath(); g.arc(x + (i * 23 + 13) % w, y + (i * 17 + 20) % h, 2 + (i % 4) * 2, 0, Math.PI * 2); g.fill(); } g.restore(); }
  function drawShadow(g, x, y, w, h) { const grad = g.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, w * .7); grad.addColorStop(0, "rgba(0,0,0,.38)"); grad.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = grad; g.fillRect(x, y, w, h); }
})();



