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

function createDebugStaffRollFrame(progress) {
  const width = 39;
  const height = 25;
  const center = Math.floor(width / 2);
  const grid = Array.from({ length: height }, () => Array(width).fill(" "));

  // 病院内と自動ドアの枠は固定し、外の一本道だけに奥行きを付ける。
  putDebugStaffRollText(grid, 0, 0, "+" + "-".repeat(width - 2) + "+");
  putDebugStaffRollText(grid, 1, 1, "             HOSPITAL EXIT             ");
  putDebugStaffRollText(grid, 2, 2, "+" + "=".repeat(width - 6) + "+");
  for (let y = 3; y < height - 1; y++) {
    grid[y][2] = "#";
    grid[y][width - 3] = "#";
  }
  putDebugStaffRollText(grid, height - 1, 0, "+" + "-".repeat(width - 2) + "+");

  const horizon = 8;
  putDebugStaffRollText(grid, horizon - 1, 3, "*****                       *****");
  for (let y = horizon; y < height - 1; y++) {
    const distance = y - horizon;
    const spread = Math.min(15, 1 + distance);
    grid[y][center - spread] = "/";
    grid[y][center + spread] = "\\";
    if (distance % 2 === 0) {
      grid[y][center] = ".";
    }
  }

  const walkingProgress = Math.min(progress / 0.87, 1);
  const eased = 1 - Math.pow(1 - walkingProgress, 2);
  const personBaseline = 22 - Math.floor(eased * 13);
  const walkFrame = Math.floor(
    progress * DEBUG_STAFF_ROLL_DURATION_MS / 220
  ) % 4;

  // 近景は背中・髪・肩・服・足を8行で描き、4コマで歩かせる。
  if (walkingProgress < 0.3) {
    const legs = [
      ["   | |   ", "  /   \\  "],
      ["   | |   ", "   /| \\ "],
      ["   | |   ", "  /   \\  "],
      ["   | |   ", "  / |\\  "]
    ][walkFrame];
    const arms = walkFrame % 2 === 0
      ? [" \\ | | / ", "  \\| |/  "]
      : [" / | | \\", "  /| |\\  "];
    const sprite = [
      "  .---.  ",
      " /     \\ ",
      "| ///// |",
      " \\_____/ ",
      arms[0],
      arms[1],
      legs[0],
      legs[1]
    ];
    sprite.forEach((line, index) => {
      putDebugStaffRollText(
        grid,
        personBaseline - sprite.length + 1 + index,
        center - 4,
        line
      );
    });
  } else if (walkingProgress < 0.6) {
    const legs = walkFrame % 2 === 0 ? " / \\ " : " /|\\ ";
    const sprite = [" .-. ", "(///)", " /|\\ ", "  |  ", legs];
    sprite.forEach((line, index) => {
      putDebugStaffRollText(
        grid,
        personBaseline - sprite.length + 1 + index,
        center - 2,
        line
      );
    });
  } else if (walkingProgress < 0.82) {
    const legs = walkFrame % 2 === 0 ? "/ \\" : "/|";
    const sprite = [" o ", " | ", legs];
    sprite.forEach((line, index) => {
      putDebugStaffRollText(
        grid,
        personBaseline - sprite.length + 1 + index,
        center - 1,
        line
      );
    });
  } else {
    putDebugStaffRollText(grid, personBaseline, center, ".");
  }

  // 終盤約4.5秒で左右のガラス戸が閉じ、視点だけ病院内に残る。
  const closingProgress = Math.max(0, Math.min(1, (progress - 0.85) / 0.15));
  if (closingProgress > 0) {
    const leftPanel = 3 + Math.round((center - 4) * closingProgress);
    const rightPanel = width - 4 - Math.round((center - 4) * closingProgress);
    for (let y = 3; y < height - 1; y++) {
      grid[y][leftPanel] = "|";
      grid[y][rightPanel] = "|";
    }
    if (closingProgress >= 0.98) {
      putDebugStaffRollText(grid, 13, center - 1, "][");
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
    if (progress < 1) {
      debugStaffRollAnimationFrame = requestAnimationFrame(renderFrame);
    } else {
      debugStaffRollAnimationFrame = null;
    }
  };
  debugStaffRollAnimationFrame = requestAnimationFrame(renderFrame);
}
