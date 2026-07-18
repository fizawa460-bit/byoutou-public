// DEBUG専用: 病院内から退院していく主人公を見る、約30秒のASCII背景試作。
const DEBUG_STAFF_ROLL_DURATION_MS = 30000;
let debugStaffRollAnimationFrame = null;

function stopDebugStaffRoll() {
  if (debugStaffRollAnimationFrame !== null) {
    cancelAnimationFrame(debugStaffRollAnimationFrame);
    debugStaffRollAnimationFrame = null;
  }
}

function putDebugStaffRollText(grid, row, column, value) {
  if (row < 0 || row >= grid.length) return;
  [...value].forEach((character, index) => {
    const x = column + index;
    if (x >= 0 && x < grid[row].length) {
      grid[row][x] = character;
    }
  });
}

function drawDebugStaffRollTree(grid, baseRow, centerColumn, size = 1) {
  const crowns = size === 2
    ? ["  /\\  ", " /  \\ ", "/_.._\\", "  ||  "]
    : [" /\\ ", "/  \\", " || "];
  const topRow = baseRow - crowns.length + 1;
  crowns.forEach((line, index) => {
    putDebugStaffRollText(grid, topRow + index, centerColumn - Math.floor(line.length / 2), line);
  });
}

function getDebugStaffRollSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const x = ax + dx * t;
  const y = ay + dy * t;
  return Math.hypot(px - x, py - y);
}

function getDebugStaffRollPersonCharacter(x, y, progress, center) {
  const walkingProgress = Math.min(progress / 0.93, 1);
  const eased = 1 - Math.pow(1 - walkingProgress, 1.15);
  const personHeight = 60 + (5.5 - 60) * eased;
  const scale = personHeight / 40;
  const top = 1 + 8 * eased;
  const seconds = progress * DEBUG_STAFF_ROLL_DURATION_MS / 1000;
  const gait = Math.sin(seconds * Math.PI * 2.2);
  const bodySway = Math.sin(seconds * Math.PI * 2.2 + Math.PI / 2);
  const personCenter = center + bodySway * scale * 0.12;
  const px = (x - personCenter) / scale;
  const py = (y - top) / scale;
  const outlineThickness = Math.max(0.36, 0.7 / Math.max(scale, 0.45));

  // 輪郭を中心に描き、顔・服の内側は空白として残す。
  const headValue = (px / 4.25) ** 2 + ((py - 5) / 5.1) ** 2;
  if (Math.abs(headValue - 1) <= outlineThickness * 0.28) {
    return py < 6.4 ? "@" : "#";
  }
  // 後頭部には輪郭を崩さない程度の、まばらな髪の線だけを置く。
  if (headValue < 0.82 && py < 5.8) {
    const hairPattern = Math.abs(Math.round(px * 2 + py * 3)) % 7;
    if (hairPattern === 0) return ".";
  }
  if (headValue < 1) return " ";

  if (py >= 9.2 && py <= 12.7) {
    if (Math.abs(Math.abs(px) - 2.15) <= outlineThickness) return "|";
  }

  // 肩と胴体。中央は塗らず、外周とわずかな服のしわだけにする。
  if (py >= 11.8 && py <= 25.7) {
    const halfWidth = 8.35 - (py - 11.8) * 0.2;
    if (Math.abs(Math.abs(px) - halfWidth) <= outlineThickness) {
      return px < 0 ? "/" : "\\";
    }
    if (py < 13.2 && Math.abs(Math.abs(px) - 5.2) <= outlineThickness) {
      return "_";
    }
    if (Math.abs(px) < 0.45 && py > 17 && py < 23 && Math.round(py) % 4 === 0) {
      return ".";
    }
    if (Math.abs(px) < halfWidth) return " ";
  }

  // 腕は横へ振らず、片方を長く濃く、もう片方を短く薄くして前後運動を表す。
  const leftNear = gait >= 0;
  const leftReach = leftNear ? 27.2 : 22.8;
  const rightReach = leftNear ? 22.8 : 27.2;
  const leftElbowY = leftNear ? 19.3 : 18.1;
  const rightElbowY = leftNear ? 18.1 : 19.3;
  const leftArmDistance = Math.min(
    getDebugStaffRollSegmentDistance(px, py, -7.15, 13.1, -7.0, leftElbowY),
    getDebugStaffRollSegmentDistance(px, py, -7.0, leftElbowY, -6.65, leftReach)
  );
  const rightArmDistance = Math.min(
    getDebugStaffRollSegmentDistance(px, py, 7.15, 13.1, 7.0, rightElbowY),
    getDebugStaffRollSegmentDistance(px, py, 7.0, rightElbowY, 6.65, rightReach)
  );
  if (leftArmDistance <= outlineThickness * (leftNear ? 1.05 : 0.72)) {
    return leftNear ? "#" : ".";
  }
  if (rightArmDistance <= outlineThickness * (leftNear ? 0.72 : 1.05)) {
    return leftNear ? "." : "#";
  }

  // 脚も左右へ開かず、奥側を短く胴体へ隠して前後の一歩に見せる。
  const leftFootY = leftNear ? 40 : 36.4;
  const rightFootY = leftNear ? 36.4 : 40;
  const leftKneeY = leftNear ? 32.2 : 30.2;
  const rightKneeY = leftNear ? 30.2 : 32.2;
  const leftLegDistance = Math.min(
    getDebugStaffRollSegmentDistance(px, py, -2.45, 24.2, -2.35, leftKneeY),
    getDebugStaffRollSegmentDistance(px, py, -2.35, leftKneeY, -2.15, leftFootY)
  );
  const rightLegDistance = Math.min(
    getDebugStaffRollSegmentDistance(px, py, 2.45, 24.2, 2.35, rightKneeY),
    getDebugStaffRollSegmentDistance(px, py, 2.35, rightKneeY, 2.15, rightFootY)
  );
  if (leftLegDistance <= outlineThickness * (leftNear ? 1.1 : 0.72)) {
    return leftNear ? "#" : ".";
  }
  if (rightLegDistance <= outlineThickness * (leftNear ? 0.72 : 1.1)) {
    return leftNear ? "." : "#";
  }

  // 腰と靴底だけを短い横線で結び、輪郭の読みやすさを保つ。
  if (py >= 24 && py <= 25.1 && Math.abs(px) <= 3.1) return "_";
  if (leftNear && Math.abs(py - leftFootY) <= outlineThickness && px >= -3.5 && px <= -1.1) return "_";
  if (!leftNear && Math.abs(py - rightFootY) <= outlineThickness && px >= 1.1 && px <= 3.5) return "_";

  return null;
}

function createDebugStaffRollFrame(progress) {
  const width = 57;
  const height = 38;
  const center = Math.floor(width / 2);
  const grid = Array.from({ length: height }, () => Array(width).fill(" "));

  putDebugStaffRollText(grid, 0, 0, "+" + "-".repeat(width - 2) + "+");
  putDebugStaffRollText(grid, 1, 1, "                     HOSPITAL EXIT                     ");
  putDebugStaffRollText(grid, 2, 2, "+" + "=".repeat(width - 6) + "+");
  for (let y = 3; y < height - 1; y++) {
    grid[y][2] = "#";
    grid[y][width - 3] = "#";
  }
  putDebugStaffRollText(grid, height - 1, 0, "+" + "-".repeat(width - 2) + "+");

  // 屋外の一本道と、街路の左右にある少数の木。人物より先に描く。
  const horizon = 11;
  putDebugStaffRollText(grid, horizon - 1, 3, "##########                                 ##########");
  drawDebugStaffRollTree(grid, horizon, 8, 1);
  drawDebugStaffRollTree(grid, horizon, 15, 2);
  drawDebugStaffRollTree(grid, horizon, width - 16, 2);
  drawDebugStaffRollTree(grid, horizon, width - 9, 1);
  for (let y = horizon; y < height - 1; y++) {
    const distance = y - horizon;
    const spread = Math.min(24, 1 + Math.floor(distance * 0.95));
    grid[y][center - spread] = "/";
    grid[y][center + spread] = "\\";
    if (distance % 3 === 0) grid[y][center] = ".";
  }

  for (let y = 3; y < height - 1; y++) {
    for (let x = 3; x < width - 3; x++) {
      const character = getDebugStaffRollPersonCharacter(x, y, progress, center);
      if (character) grid[y][x] = character;
    }
  }

  // 20秒ごろから閉まり始め、24秒で人物と外景を完全に隠す。
  const closingProgress = Math.max(0, Math.min(1, (progress - 0.67) / 0.13));
  if (closingProgress > 0) {
    const leftPanel = 3 + Math.round((center - 4) * closingProgress);
    const rightPanel = width - 4 - Math.round((center - 4) * closingProgress);
    for (let y = 3; y < height - 1; y++) {
      for (let x = 3; x < leftPanel; x++) grid[y][x] = " ";
      for (let x = rightPanel + 1; x < width - 3; x++) grid[y][x] = " ";
      grid[y][leftPanel] = "|";
      grid[y][rightPanel] = "|";
    }
    if (closingProgress >= 0.98) {
      for (let y = 3; y < height - 1; y++) {
        for (let x = 3; x < width - 3; x++) {
          grid[y][x] = " ";
        }
        grid[y][center - 1] = "|";
        grid[y][center] = "|";
      }
      for (const bandRow of [12, 25]) {
        putDebugStaffRollText(grid, bandRow, 3, "=".repeat(center - 4));
        putDebugStaffRollText(grid, bandRow, center + 1, "=".repeat(center - 4));
        grid[bandRow][center - 1] = "|";
        grid[bandRow][center] = "|";
      }
      putDebugStaffRollText(grid, 18, center - 1, "][");
    }
  }

  return grid.map(row => row.join("")).join("\n");
}

function showDebugStaffRoll() {
  stopDebugStaffRoll();
  clearInterval(typingTimer);
  typingTimer = null;
  clearTextSkip();
  clearFootworkRhythm();
  stopTrialClock();
  hideRulePopup();
  debugHistory = [];

  document.body.className = "debug-staff-roll";
  contentWarning.hidden = true;
  if (saveInspector) saveInspector.hidden = true;
  title.textContent = "スタッフロール背景・仮";
  text.innerHTML = "";

  const stage = document.createElement("pre");
  stage.id = "debug-staff-roll-stage";
  stage.setAttribute("aria-label", "病院内から遠ざかる主人公のASCIIアニメーション");
  text.appendChild(stage);

  setChoices([
    { label: "もう一度見る", action: showDebugStaffRoll, noHistory: true, advancesTime: false },
    {
      label: "デバッグへ戻る",
      action: () => {
        stopDebugStaffRoll();
        showDebugMenu();
      },
      noHistory: true,
      advancesTime: false
    }
  ]);

  const startedAt = performance.now();
  const renderFrame = now => {
    const progress = Math.min(1, (now - startedAt) / DEBUG_STAFF_ROLL_DURATION_MS);
    stage.textContent = createDebugStaffRollFrame(progress);

    // 扉が閉じ切った後も、病院内から見送るカメラだけがごく小さく揺れ続ける。
    // 文字単位ではなくサブピクセルで動かし、扉の向こうを再表示しない。
    const closedProgress = Math.max(0, Math.min(1, (progress - 0.8) / 0.2));
    // 閉鎖直後の約1秒だけ、扉が閉じた衝撃でカメラが一度強く動く。
    const impactProgress = Math.min(1, closedProgress / 0.18);
    const impact = closedProgress > 0 && closedProgress < 0.18
      ? Math.sin(impactProgress * Math.PI)
      : 0;
    const cameraX =
      Math.sin(closedProgress * Math.PI * 4.6) * 0.9 * closedProgress -
      impact * 3.8;
    const cameraY =
      Math.sin(closedProgress * Math.PI * 3.2) * 0.55 * closedProgress +
      impact * 2.4;
    const cameraScale = 1 + closedProgress * 0.0015 + impact * 0.002;
    stage.style.transform =
      `translate3d(${cameraX.toFixed(2)}px, ${cameraY.toFixed(2)}px, 0) scale(${cameraScale.toFixed(4)})`;

    if (progress < 1) {
      debugStaffRollAnimationFrame = requestAnimationFrame(renderFrame);
    } else {
      debugStaffRollAnimationFrame = null;
    }
  };
  debugStaffRollAnimationFrame = requestAnimationFrame(renderFrame);
}
