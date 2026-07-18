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
  const eased = 1 - Math.pow(1 - walkingProgress, 1.35);
  const personHeight = 60 + (5.5 - 60) * eased;
  const scale = personHeight / 40;
  const top = 1 + 8 * eased;
  const seconds = progress * DEBUG_STAFF_ROLL_DURATION_MS / 1000;
  const gait = Math.sin(seconds * Math.PI * 3.2);
  const shoulderSway = Math.sin(seconds * Math.PI * 3.2 + Math.PI / 2);
  const personCenter = center + shoulderSway * scale * 0.35;
  const px = (x - personCenter) / scale;
  const py = (y - top) / scale;

  // 後頭部。中央を少し明るくし、髪の密度に丸みを付ける。
  const headValue = (px / 4.25) ** 2 + ((py - 5) / 5.1) ** 2;
  if (headValue <= 1) {
    if (py < 5.8 || Math.abs(px) > 3.15) return "@";
    return Math.abs(px) < 1.35 ? "#" : "%";
  }

  // 首。
  if (py >= 9 && py <= 13 && Math.abs(px) <= 2.25) {
    return Math.abs(px) < 0.8 ? "*" : "#";
  }

  // 肩から腰まで。最初は下半身が画面外なので、腰から上だけが大きく映る。
  if (py >= 11.5 && py <= 25.5) {
    const halfWidth = 8.4 - (py - 11.5) * 0.2;
    if (Math.abs(px) <= halfWidth) {
      const edge = Math.abs(px) / halfWidth;
      if (py < 14 && edge > 0.72) return "%";
      if (edge > 0.84) return "+";
      if (Math.abs(px) < 1.1) return "*";
      return edge < 0.48 ? "#" : "%";
    }
  }

  // 腕は歩行に合わせて前後へ振る。背面なので動きは小さくする。
  const leftHandX = -6.1 + gait * 2.2;
  const rightHandX = 6.1 - gait * 2.2;
  const leftArm = getDebugStaffRollSegmentDistance(px, py, -7.2, 13, leftHandX, 25.5);
  const rightArm = getDebugStaffRollSegmentDistance(px, py, 7.2, 13, rightHandX, 25.5);
  if (leftArm <= 1.15 || rightArm <= 1.15) {
    return edgeCharacterForDebugStaffRoll(px);
  }

  // 腰から先は、人物が遠ざかって全身が画面へ収まった後に見えてくる。
  const leftKneeX = -2.1 + gait * 1.5;
  const rightKneeX = 2.1 - gait * 1.5;
  const leftFootX = -3.2 + gait * 3.2;
  const rightFootX = 3.2 - gait * 3.2;
  const leftUpperLeg = getDebugStaffRollSegmentDistance(px, py, -2.7, 24, leftKneeX, 32);
  const leftLowerLeg = getDebugStaffRollSegmentDistance(px, py, leftKneeX, 32, leftFootX, 40);
  const rightUpperLeg = getDebugStaffRollSegmentDistance(px, py, 2.7, 24, rightKneeX, 32);
  const rightLowerLeg = getDebugStaffRollSegmentDistance(px, py, rightKneeX, 32, rightFootX, 40);
  if (Math.min(leftUpperLeg, leftLowerLeg, rightUpperLeg, rightLowerLeg) <= 1.35) {
    return "#";
  }

  return null;
}

function edgeCharacterForDebugStaffRoll(value) {
  return Math.abs(value) < 3 ? "#" : "%";
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

  // 屋外の一本道。人物より先に描き、人物をその上へ重ねる。
  const horizon = 11;
  putDebugStaffRollText(grid, horizon - 1, 3, "##########                                 ##########");
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
    const cameraX = Math.sin(closedProgress * Math.PI * 4.6) * 0.9 * closedProgress;
    const cameraY = Math.sin(closedProgress * Math.PI * 3.2) * 0.55 * closedProgress;
    const cameraScale = 1 + closedProgress * 0.0015;
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
