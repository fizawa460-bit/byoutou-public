// DEBUG専用: 病院内から退院していく主人公を見る、約30秒のASCII背景試作。
const DEBUG_STAFF_ROLL_DURATION_MS = 36000;
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
  const seconds = progress * DEBUG_STAFF_ROLL_DURATION_MS / 1000;

  // 11〜19秒は距離と歩行周期を止め、振り返りだけを行う。
  const journeyProgress = seconds <= 11
    ? (seconds / 11) * 0.42
    : seconds <= 19
      ? 0.42
      : 0.42 + Math.min(1, (seconds - 19) / 11) * 0.58;
  const gaitSeconds = seconds <= 11 ? seconds : seconds <= 19 ? 11 : 11 + (seconds - 19);
  const turnAmount = seconds < 13
    ? 0
    : seconds < 15
      ? (seconds - 13) / 2
      : seconds < 17
        ? 1
        : seconds < 19
          ? 1 - (seconds - 17) / 2
          : 0;

  const walkingProgress = Math.min(journeyProgress, 1);
  const eased = 1 - Math.pow(1 - walkingProgress, 1.15);
  const personHeight = 60 + (5.5 - 60) * eased;
  const scale = personHeight / 40;
  const top = 1 + 8 * eased;
  const gait = Math.sin(gaitSeconds * Math.PI * 2.2);
  const bodySway = Math.sin(gaitSeconds * Math.PI * 2.2 + Math.PI / 2);
  const personCenter = center + bodySway * scale * 0.12;
  const px = (x - personCenter) / scale;
  const py = (y - top) / scale;
  const outlineThickness = Math.max(0.36, 0.7 / Math.max(scale, 0.45));

  // 輪郭を中心に描き、顔・服の内側は空白として残す。
  const headPx = px - turnAmount * 0.7;
  const headWidth = 4.25 - turnAmount * 0.65;
  const headValue = (headPx / headWidth) ** 2 + ((py - 5) / 5.1) ** 2;

  // 肩越しに振り返った間だけ、右側へごく短い鼻先を出す。
  if (
    turnAmount > 0.45 &&
    py >= 4.6 && py <= 6.1 &&
    headPx >= headWidth - 0.15 &&
    headPx <= headWidth + turnAmount * 1.25
  ) {
    return py < 5.25 ? "_" : ">";
  }
  if (Math.abs(headValue - 1) <= outlineThickness * 0.28) {
    return py < 6.4 ? "@" : "#";
  }
  // 後頭部には輪郭を崩さない程度の、まばらな髪の線だけを置く。
  if (headValue < 0.82 && py < 5.8) {
    const hairPattern = Math.abs(Math.round(headPx * 2 + py * 3)) % 7;
    if (hairPattern === 0) return ".";
  }
  if (headValue < 1) return " ";

  if (py >= 9.2 && py <= 12.7) {
    if (Math.abs(Math.abs(px) - 2.15) <= outlineThickness) return "|";
  }

  // 肩と胴体。中央は塗らず、外周とわずかな服のしわだけにする。
  if (py >= 11.8 && py <= 25.7) {
    const torsoOffset = turnAmount * (py < 17 ? 0.85 : 0.25);
    const torsoPx = px - torsoOffset;
    const halfWidth = 8.35 - (py - 11.8) * 0.2;
    if (Math.abs(Math.abs(torsoPx) - halfWidth) <= outlineThickness) {
      return torsoPx < 0 ? "/" : "\\";
    }
    if (py < 13.2 && Math.abs(Math.abs(torsoPx) - 5.2) <= outlineThickness) {
      return "_";
    }
    if (Math.abs(px) < 0.45 && py > 17 && py < 23 && Math.round(py) % 4 === 0) {
      return ".";
    }
    if (Math.abs(torsoPx) < halfWidth) return " ";
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

  // 26秒から閉まり始め、30秒で人物と外景を完全に隠す。
  const seconds = progress * DEBUG_STAFF_ROLL_DURATION_MS / 1000;
  const closingProgress = Math.max(0, Math.min(1, (seconds - 26) / 4));
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


function getDebugStaffRollCredit(seconds) {
  if (seconds < 3) {
    return { text: "作者53", opacity: seconds / 3 };
  }
  if (seconds < 13) {
    return { text: "作者53", opacity: 1 };
  }
  if (seconds < 16) {
    return { text: "作者53", opacity: (16 - seconds) / 3 };
  }
  if (seconds < 18) {
    return { text: "", opacity: 0 };
  }
  if (seconds < 21) {
    return { text: "Special thank you: chatGPT", opacity: (seconds - 18) / 3 };
  }
  if (seconds < 31) {
    return { text: "Special thank you: chatGPT", opacity: 1 };
  }
  if (seconds < 34) {
    return { text: "Special thank you: chatGPT", opacity: (34 - seconds) / 3 };
  }
  return { text: "FIN", opacity: Math.min(1, (seconds - 34) / 2) };
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

  // 表示枠は固定し、その内側の文字レイヤーだけをカメラとして動かす。
  const cameraLayer = document.createElement("span");
  cameraLayer.id = "debug-staff-roll-camera";
  stage.appendChild(cameraLayer);
  text.appendChild(stage);

  const credit = document.createElement("div");
  credit.id = "debug-staff-roll-credit";
  credit.setAttribute("aria-live", "polite");
  text.appendChild(credit);

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
    const elapsedSeconds = progress * DEBUG_STAFF_ROLL_DURATION_MS / 1000;
    cameraLayer.textContent = createDebugStaffRollFrame(progress);
    const creditState = getDebugStaffRollCredit(elapsedSeconds);
    credit.textContent = creditState.text;
    credit.style.opacity = String(creditState.opacity);

    // 扉が閉じ切った後も、病院内から見送るカメラだけがごく小さく揺れ続ける。
    // 文字単位ではなくサブピクセルで動かし、扉の向こうを再表示しない。
    const closedProgress = Math.max(0, Math.min(1, (elapsedSeconds - 30) / 6));
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
    cameraLayer.style.transform =
      `translate3d(${cameraX.toFixed(2)}px, ${cameraY.toFixed(2)}px, 0) scale(${cameraScale.toFixed(4)})`;

    if (progress < 1) {
      debugStaffRollAnimationFrame = requestAnimationFrame(renderFrame);
    } else {
      debugStaffRollAnimationFrame = null;
    }
  };
  debugStaffRollAnimationFrame = requestAnimationFrame(renderFrame);
}
