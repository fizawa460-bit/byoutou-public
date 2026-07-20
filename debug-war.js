// DEBUG専用: 数値を持つ二つの軍が自動で衝突する簡易戦争演出。
const DEBUG_WAR_DURATION_MS = 11000;
const DEBUG_WAR_IMPACTS = [2200, 3700, 5200, 6700, 8200];
const DEBUG_WAR_BLUE_VALUES = [10, 7, 4, 2, 0];
const DEBUG_WAR_RED_VALUES = [100, 100, 99, 99, 98];

let debugWarAnimationFrame = null;

function stopDebugWar() {
  if (debugWarAnimationFrame !== null) {
    cancelAnimationFrame(debugWarAnimationFrame);
    debugWarAnimationFrame = null;
  }
}

function easeDebugWar(value) {
  const t = Math.max(0, Math.min(1, value));
  return 1 - Math.pow(1 - t, 3);
}

function drawDebugWarArmy(ctx, x, y, radius, color, value, damage, flash) {
  if (value <= 0 || radius <= 1) return;

  ctx.save();
  ctx.shadowBlur = flash ? 30 : 14;
  ctx.shadowColor = color;
  ctx.fillStyle = flash ? "#ffffff" : color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 戦力が削られるほど、接触面の輪郭が欠ける。
  ctx.fillStyle = "#080b12";
  for (let index = 0; index < damage; index++) {
    const angle = -0.75 + index * 0.34;
    const biteX = x + Math.cos(angle) * radius * 0.92;
    const biteY = y + Math.sin(angle) * radius * 0.92;
    ctx.beginPath();
    ctx.arc(biteX, biteY, Math.max(3, radius * 0.13), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${Math.max(14, radius * 0.58)}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(value), x, y + 1);
  ctx.restore();
}

function spawnDebugWarFragments(particles, x, y, color, amount, force) {
  for (let index = 0; index < amount; index++) {
    const angle = Math.PI + (Math.random() - 0.5) * 1.8;
    const speed = force * (0.45 + Math.random() * 0.75);
    particles.push({
      x,
      y: y + (Math.random() - 0.5) * 34,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 5,
      color,
      life: 1
    });
  }
}

function updateDebugWarParticles(particles, deltaSeconds) {
  particles.forEach(particle => {
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;
    particle.vy += 42 * deltaSeconds;
    particle.life -= deltaSeconds * 0.85;
  });
  return particles.filter(particle => particle.life > 0);
}

function drawDebugWarParticles(ctx, particles) {
  particles.forEach(particle => {
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.globalAlpha = 1;
}

function getDebugWarPositions(elapsed, impactIndex, blueRadius, redRadius) {
  const previousImpact = impactIndex === 0 ? 700 : DEBUG_WAR_IMPACTS[impactIndex - 1];
  const nextImpact = DEBUG_WAR_IMPACTS[Math.min(impactIndex, DEBUG_WAR_IMPACTS.length - 1)];
  const phase = Math.max(0, Math.min(1, (elapsed - previousImpact) / (nextImpact - previousImpact)));
  const approach = impactIndex === 0
    ? easeDebugWar(phase)
    : phase < 0.24
      ? 1 - easeDebugWar(phase / 0.24) * 0.34
      : 0.66 + easeDebugWar((phase - 0.24) / 0.76) * 0.34;
  const contactX = 330;
  return {
    blueX: 105 + (contactX - blueRadius - 105) * approach,
    redX: 535 + (contactX + redRadius - 535) * approach
  };
}

function showDebugWarPrototype() {
  stopDebugWar();
  clearInterval(typingTimer);
  typingTimer = null;
  clearTextSkip();
  clearFootworkRhythm();
  stopTrialClock();
  hideRulePopup();
  debugHistory = [];

  document.body.className = "debug-war";
  contentWarning.hidden = true;
  if (saveInspector) saveInspector.hidden = true;
  title.textContent = "裏世界・戦争（仮）";
  text.innerHTML = "";

  const battlefield = document.createElement("div");
  battlefield.id = "debug-war-battlefield";

  const canvas = document.createElement("canvas");
  canvas.id = "debug-war-canvas";
  canvas.width = 640;
  canvas.height = 360;
  canvas.setAttribute("aria-label", "青の自軍10と赤の敵軍100が自動で衝突する戦争演出");
  battlefield.appendChild(canvas);

  const report = document.createElement("div");
  report.id = "debug-war-report";
  report.setAttribute("aria-live", "polite");
  battlefield.appendChild(report);
  text.appendChild(battlefield);

  setChoices([
    { label: "もう一度見る", action: showDebugWarPrototype, noHistory: true, advancesTime: false },
    {
      label: "デバッグへ戻る",
      action: () => {
        stopDebugWar();
        showDebugMenu();
      },
      noHistory: true,
      advancesTime: false
    }
  ]);

  const ctx = canvas.getContext("2d");
  const startedAt = performance.now();
  let previousTime = startedAt;
  let impactIndex = 0;
  let blueValue = 10;
  let redValue = 100;
  let shake = 0;
  let flashUntil = 0;
  let particles = [];

  const render = now => {
    const elapsed = Math.min(DEBUG_WAR_DURATION_MS, now - startedAt);
    const deltaSeconds = Math.min(0.05, (now - previousTime) / 1000);
    previousTime = now;

    while (
      impactIndex < DEBUG_WAR_IMPACTS.length &&
      elapsed >= DEBUG_WAR_IMPACTS[impactIndex]
    ) {
      blueValue = DEBUG_WAR_BLUE_VALUES[impactIndex];
      redValue = DEBUG_WAR_RED_VALUES[impactIndex];
      const blueRadiusBefore = 52 * Math.sqrt(Math.max(1, blueValue || 1) / 10);
      spawnDebugWarFragments(
        particles,
        330 - blueRadiusBefore * 0.2,
        180,
        "#3d8dff",
        impactIndex === DEBUG_WAR_IMPACTS.length - 1 ? 32 : 12 + impactIndex * 3,
        impactIndex === DEBUG_WAR_IMPACTS.length - 1 ? 150 : 95
      );
      if (impactIndex >= 2) {
        spawnDebugWarFragments(particles, 350, 180, "#ff4545", 3, 45);
      }
      shake = impactIndex === DEBUG_WAR_IMPACTS.length - 1 ? 15 : 8 + impactIndex;
      flashUntil = elapsed + 140;
      impactIndex++;
    }

    particles = updateDebugWarParticles(particles, deltaSeconds);
    shake *= Math.pow(0.035, deltaSeconds);
    const blueRadius = blueValue > 0 ? 52 * Math.sqrt(blueValue / 10) : 0;
    const redRadius = 92 * Math.sqrt(redValue / 100);
    const activeImpact = Math.min(impactIndex, DEBUG_WAR_IMPACTS.length - 1);
    const positions = blueValue > 0
      ? getDebugWarPositions(elapsed, activeImpact, blueRadius, redRadius)
      : { blueX: 330, redX: 330 + redRadius };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#121722");
    gradient.addColorStop(1, "#05070b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(
      shake ? (Math.random() - 0.5) * shake : 0,
      shake ? (Math.random() - 0.5) * shake * 0.55 : 0
    );

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(28, 180);
    ctx.lineTo(612, 180);
    ctx.stroke();

    const flash = elapsed < flashUntil;
    drawDebugWarArmy(
      ctx,
      positions.redX,
      180,
      redRadius,
      "#d93636",
      redValue,
      Math.max(0, 100 - redValue),
      flash
    );
    drawDebugWarArmy(
      ctx,
      positions.blueX,
      180,
      blueRadius,
      "#287de0",
      blueValue,
      impactIndex * 2,
      flash
    );
    drawDebugWarParticles(ctx, particles);
    ctx.restore();

    report.textContent = blueValue > 0
      ? `自軍戦力 ${blueValue}　／　敵軍戦力 ${redValue}`
      : elapsed < 9300
        ? "自軍戦力 0　／　敵軍戦力 98"
        : "自軍は消滅した。戦闘は継続されます。";

    if (elapsed < DEBUG_WAR_DURATION_MS) {
      debugWarAnimationFrame = requestAnimationFrame(render);
    } else {
      debugWarAnimationFrame = null;
    }
  };

  debugWarAnimationFrame = requestAnimationFrame(render);
}
