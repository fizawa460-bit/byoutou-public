const APP_VERSION = "ver1.21";
const DEBUG = true;

// ============================================================
// script.js 目次
// ============================================================
// 1. 基本設定・状態
// 2. 画面表示と共通UI
// 3. タイトル・デバッグ
// 4. 初回編
// 5. シーン本体
// 6. 旧function名からシーンIDへの橋渡し
// 7. ドア解除・足運び・車イベントの補助
// 8. 死亡・ルール・実績・ループ処理
//
// 今は公開前なので script.js 一本で管理する。
// 今後ファイル分割するときは、この見出し単位で分ける。

// ============================================================
// 1. 基本設定・状態
// ============================================================

const STORY = {
  INITIAL_DAY: 0,
  SOFT_ROOM: {
    START: 1,
    LOOP_AWARE: 2,
    NURSE_Z_ROUTE: 3,
    ESCAPE_READY: 4
  }
};

// storyは章や物語の大きな進行だけを持つ。
// 細かいイベント既読はflags側で管理する。
const story = {
  progress: STORY.INITIAL_DAY
};

const flags = {
  loopButtonLocked: false,
  paperCupPlacedThisLoop: false,
  metNurseZOnPatrol: false,
  nameRegistered: false
};

let playerName = "〇〇";

// 数が増えていくものだけをまとめる。
// true/falseの状態はflags、物語の大きな進行はstoryに分ける。
const counters = {
  deaths: 0,
  hiddenLoopClicks: 0,
  waterDeaths: 0,
  cleanings: 0,
  patrols: 0,
  nurseCalls: 0,
  nurseZDoorTalks: 0,
  mealDeaths: 0
};

// セリフ本文は texts.js に分離。


// 文字を1文字ずつ表示する処理の管理用。
// 次の文章を表示するとき、前の文字送りを止めるために使う。
let typingTimer = null;

// ナースコール後にドアまで来る看護師。
let pendingDoorNurse = null;

// ドア解除イベント用。
// 解除率はループ保存せず、イベントに入るたびに最初からやり直す。
const doorUnlock = {
  step: 0,
  progress: 0,
  patrolHandled: false,
  enemyLearned: false,
  patternChanged: false,
  hour: 20
};

// 足運びイベント用。
const footwork = {
  step: 0,
  unlocked5: false,
  unlocked6: false,
  unlocked7: false
};
// タイマーIDはセーブ/デバッグ対象にできないため、状態オブジェクトの外に置く。
let footworkWaitTimer = null;

// タイトル画面で表示待ちのルール/実績ポップアップ。
let pendingRulePopups = [];
let rulePopupTimer = null;

// デバッグ用の一つ前へ戻る履歴。
// 画面表示と主要フラグをまとめて戻す。通常プレイ用のセーブではない。
let debugHistory = [];
let currentChoiceItems = [];
let currentSceneId = null;
let isEnteringScene = false;

// ルール帳に表示する内容。
// 最初は？？？にしておき、イベントを見たら少しずつ開放する。
const rules = [
  { id: "deathLoops", text: "死亡すると白い病室へ戻る。", found: false },
  { id: "loopChanges", text: "死亡回数や調査によって、選択肢が変化することがある。", found: false },
  { id: "findOwnWay", text: "自分で生きる道を探せ。", found: false },
  { id: "doNotAnswerBroadcast", text: "放送には返事をしない。", found: false },
  { id: "doNotDrinkWater", text: "出された水をすぐ飲んではいけない。", found: false },
  { id: "waterCanReveal", text: "水は飲む以外にも使える。", found: false },
  { id: "nightIsDangerous", text: "夜は、寝れば安全とは限らない。", found: false },
  { id: "toiletLight", text: "夜はトイレの明かりだけが残る。", found: false },
  { id: "doNotLookDoor", text: "ドアを見てはいけない。", found: false },
  { id: "morningDanger", text: "朝の音がしたら、もう遅い。", found: false },
  { id: "someNursesDiffer", text: "すべての看護師が同じではない。", found: false },
  { id: "nurseZCanHelp", text: "看護師Zは、脱出に関係している。", found: false },
  { id: "enemyLearns", text: "一度通じたやり方が、次も通じるとは限らない。", found: false }
];

const baseDoorUnlockRoute = ["push", "pull", "wait", "pull", "push", "push"];
const footworkRoute = ["1", "2", "1", "2", "wait", "1", "2", "3", "3", "1", "1", "5", "1", "4", "2", "2", "2", "1", "2", "6", "7", "1"];

const title = document.getElementById("title");
const text = document.getElementById("text");
const choices = document.getElementById("choices");
const rulePopup = document.getElementById("rule-popup");

// ============================================================
// 2. 画面表示と共通UI
// ============================================================

function advanceStoryProgress(nextProgress) {
  story.progress = Math.max(story.progress, nextProgress);
}

function isStoryProgressAtLeast(progress) {
  return story.progress >= progress;
}

function getStoryProgressLabel() {
  return story.progress;
}

// messageを1文字ずつ表示する。
// 表示が終わったらcallbackを実行して、選択肢などを出す。
function typeText(message, callback) {
  clearInterval(typingTimer);
  text.textContent = "";
  choices.innerHTML = "";
  message = formatText(message);
  let i = 0;
  typingTimer = setInterval(() => {
    text.textContent += message[i];
    i++;
    if (i >= message.length) {
      clearInterval(typingTimer);
      typingTimer = null;
      if (callback) callback();
    }
  }, 35);
}

function formatText(message) {
  return String(message)
    .replaceAll("〇〇〇", playerName)
    .replaceAll("〇〇", playerName);
}

// 選択肢ボタンをまとめて作る。
// itemsには { label: "表示する文", action: 押したときの処理 } を入れる。
function setChoices(items) {
  choices.innerHTML = "";
  currentChoiceItems = items;
  items.forEach(item => {
    const button = document.createElement("button");
    button.textContent = item.label;
    if (item.holdAction) {
      let holdTimer = null;
      let holdTriggered = false;
      const startHold = () => {
        holdTriggered = false;
        clearTimeout(holdTimer);
        holdTimer = setTimeout(() => {
          holdTriggered = true;
          if (DEBUG && !item.noHistory) {
            saveDebugHistory();
          }
          item.holdAction();
        }, item.holdMs || 1200);
      };
      const cancelHold = () => {
        clearTimeout(holdTimer);
      };
      button.onmousedown = startHold;
      button.onmouseup = cancelHold;
      button.onmouseleave = cancelHold;
      button.ontouchstart = startHold;
      button.ontouchend = cancelHold;
      button.ontouchcancel = cancelHold;
      button.onclick = () => {
        if (!holdTriggered) runChoiceAction(item);
      };
    } else {
      button.onclick = () => runChoiceAction(item);
    }
    choices.appendChild(button);
  });
  if (DEBUG && debugHistory.length > 0) {
    const backButton = document.createElement("button");
    backButton.textContent = "デバッグ 一個前に戻る";
    backButton.onclick = restoreDebugHistory;
    choices.appendChild(backButton);
  }
}

function runChoiceAction(item) {
  if (DEBUG && !item.noHistory) {
    saveDebugHistory();
  }
  item.action();
}

function getDebugStateSnapshot() {
  return {
    storyProgress: story.progress,
    flags: { ...flags },
    counters: { ...counters },
    playerName,
    currentSceneId,
    pendingDoorNurse,
    doorUnlock: { ...doorUnlock },
    footwork: { ...footwork },
    pendingRulePopups: [...pendingRulePopups],
    rulesFound: rules.map(rule => rule.found)
  };
}

function restoreDebugStateSnapshot(state) {
  story.progress = state.storyProgress;
  Object.assign(flags, state.flags);
  Object.assign(counters, state.counters);
  playerName = state.playerName || "〇〇";
  currentSceneId = state.currentSceneId || null;
  pendingDoorNurse = state.pendingDoorNurse;
  Object.assign(doorUnlock, state.doorUnlock);
  Object.assign(footwork, state.footwork);
  pendingRulePopups = [...state.pendingRulePopups];
  rules.forEach((rule, index) => {
    rule.found = state.rulesFound[index];
  });
}

function saveDebugHistory() {
  debugHistory.push({
    state: getDebugStateSnapshot(),
    bodyClassName: document.body.className,
    titleText: title.textContent,
    textContent: text.textContent,
    choiceItems: currentChoiceItems
  });
  if (debugHistory.length > 50) {
    debugHistory.shift();
  }
}

function restoreDebugHistory() {
  const snapshot = debugHistory.pop();
  if (!snapshot) return;
  clearInterval(typingTimer);
  clearTimeout(rulePopupTimer);
  clearTimeout(footworkWaitTimer);
  typingTimer = null;
  hideRulePopup();
  restoreDebugStateSnapshot(snapshot.state);
  document.body.className = snapshot.bodyClassName;
  title.textContent = snapshot.titleText;
  text.textContent = snapshot.textContent;
  setChoices(snapshot.choiceItems);
}

// 文章を読ませてから、ボタンで次のイベントへ進める。
// ラベルは後で場面ごとに差し替えやすいようにしている。
function waitForContinue(nextAction, label = "次に進む") {
  setChoices([
    { label, action: nextAction }
  ]);
}

function waitForInitialContinue(nextAction, label = "次に進む") {
  setInitialChoices([
    { label, action: nextAction }
  ]);
}

function setInitialChoices(items) {
  const initialChoices = [...items];

  if (DEBUG) {
    initialChoices.push({
      label: "タイトルへ戻る",
      action: startTitle,
      noHistory: true
    });
  }

  setChoices(initialChoices);
}

// ============================================================
// 3. タイトル・デバッグ
// ============================================================

// タイトル画面。
// ゲーム開始前の状態を毎回ここで整える。
function startTitle() {
  document.body.className = "";
  title.textContent = getTitleText();
  text.textContent = `死亡回数: ${counters.deaths}\n`;
  counters.hiddenLoopClicks = 0;
  flags.loopButtonLocked = false;
  const titleChoices = [
    { label: "はじめる", action: startGame },
    { label: "ルール", action: showRules }
  ];
  if (DEBUG) {
    titleChoices.push({ label: "デバッグ", action: showDebugMenu });
  }
  setChoices(titleChoices);
  showQueuedRulePopup();
}

// 開発用メニュー。
// 本番ではDEBUGをfalseにすればタイトルから消える。
function showDebugMenu() {
  document.body.className = "";
  hideRulePopup();
  title.textContent = "デバッグ";
  text.textContent = TEXT.UI.DEBUG_STATUS({
    version: APP_VERSION,
    deaths: counters.deaths,
    progress: getStoryProgressLabel(),
    nurseZDoorTalks: counters.nurseZDoorTalks
  });
  setChoices([
    { label: "初回編", action: showInitialDayIntro },
    { label: "白い病室", action: startLoop },
    { label: "ナースコール", action: debugNurseCall },
    { label: "ナースコール2回目", action: debugSecondNurseCall },
    { label: "ナースコールZ", action: debugNurseCallZ },
    { label: "紙コップ", action: showPaperCupEvent },
    { label: "水イベント", action: showWaterEvent },
    { label: "食事イベント", action: showMealEvent },
    { label: "夜イベント", action: showNightPreview },
    { label: "夜のトイレ", action: moveToNightToilet },
    { label: "掃除ループ", action: showCleaningPreview },
    { label: "巡回イベント", action: waitForPatrol },
    { label: "巡回Z初接触", action: debugPatrolZ },
    { label: "Zドア会話3回済み", action: debugZDoorTalksDone },
    { label: "脱出イベント", action: showEscapeProposal },
    { label: "ドア解除イベント", action: debugDoorUnlock },
    { label: "足運びイベント", action: showFootworkEvent },
    { label: "車イベント", action: showCarEvent },
    { label: "第一部完", action: showSoftRoomAfterFin },
    { label: "タイトルへ戻る", action: startTitle }
  ]);
}

function debugNurseCall() {
  advanceStoryProgress(STORY.SOFT_ROOM.LOOP_AWARE);
  handleNurseCall();
}

function debugSecondNurseCall() {
  advanceStoryProgress(STORY.SOFT_ROOM.NURSE_Z_ROUTE);
  counters.nurseCalls = 1;
  showNurseCallResponderEvent();
}

function debugNurseCallZ() {
  advanceStoryProgress(STORY.SOFT_ROOM.NURSE_Z_ROUTE);
  counters.nurseCalls = 2;
  showNurseCallResponderEvent();
}

function debugPatrolZ() {
  advanceStoryProgress(STORY.SOFT_ROOM.LOOP_AWARE);
  talkToPatrolNurse({ id: "z", name: "看護師Z" });
}

function debugZDoorTalksDone() {
  advanceStoryProgress(STORY.SOFT_ROOM.ESCAPE_READY);
  counters.nurseZDoorTalks = Math.max(counters.nurseZDoorTalks, 3);
  findRule("nurseZCanHelp");
  showDebugMenu();
}

function debugDoorUnlock() {
  advanceStoryProgress(STORY.SOFT_ROOM.ESCAPE_READY);
  counters.nurseZDoorTalks = Math.max(counters.nurseZDoorTalks, 3);
  showDoorUnlockEvent();
}

// 物語上のループ進行度によって、タイトルを少しだけ変える。
// 数字では出さず、違和感として見せるための場所。
function getTitleText() {
  if (counters.deaths > 0) return "病棟物語";
  if (isStoryProgressAtLeast(STORY.SOFT_ROOM.START)) return "病棟物語。";
  return "病棟物語";
}

function startGame() {
  if (story.progress === STORY.INITIAL_DAY) {
    if (!flags.nameRegistered) {
      showNameInput();
      return;
    }

    showInitialDayIntro();
    return;
  }
  startLoop();
}

// ============================================================
// 4. 初回編
// ============================================================

function showNameInput() {
  document.body.className = "";
  hideRulePopup();
  title.textContent = "";
  text.textContent = TEXT.UI.NAME_PROMPT;
  choices.innerHTML = "";
  currentChoiceItems = [];

  const input = document.createElement("input");
  input.id = "player-name-input";
  input.type = "text";
  input.maxLength = 12;
  input.autocomplete = "off";
  input.placeholder = TEXT.UI.NAME_PLACEHOLDER;
  input.setAttribute("aria-label", TEXT.UI.NAME_ARIA_LABEL);

  const button = document.createElement("button");
  button.textContent = "登録";

  const registerName = () => {
    const value = input.value.trim();
    playerName = value || TEXT.UI.NAME_PLACEHOLDER;
    flags.nameRegistered = true;
    showNameRegistered();
  };

  input.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      registerName();
    }
  });
  button.onclick = registerName;

  choices.appendChild(input);
  choices.appendChild(button);
  input.focus();
}

function showNameRegistered() {
  typeText(
    TEXT.UI.NAME_REGISTERED(playerName),
    () => waitForInitialContinue(showInitialDayIntro)
  );
}

function showInitialDayIntro() {
  document.body.className = "";
  hideRulePopup();
  title.textContent = "";
  counters.hiddenLoopClicks = 0;
  flags.loopButtonLocked = false;
  typeText(TEXT.INITIAL_DAY.INTRO, () => waitForInitialContinue(showInitialNurseZ));
}

function showInitialNurseZ() {
  typeText(TEXT.INITIAL_DAY.NURSE_Z_ENTERS, () => waitForInitialContinue(showInitialNurseZLeaves));
}

function showInitialNurseZLeaves() {
  typeText(TEXT.INITIAL_DAY.NURSE_Z_LEAVES, showInitialDayChoices);
}

function showInitialDayChoices() {
  setInitialChoices([
    { label: "窓を見る", action: showInitialWindow },
    { label: "トイレをする", action: showInitialToilet },
    { label: "ナースコールを押す", action: showInitialNurseCall },
    { label: "ねる", action: showInitialBed }
  ]);
}

function showInitialWindow() {
  typeText(TEXT.INITIAL_DAY.WINDOW, showInitialDayChoices);
}

function showInitialToilet() {
  typeText(TEXT.INITIAL_DAY.TOILET, showInitialDayChoices);
}

function showInitialNurseCall() {
  typeText(TEXT.INITIAL_DAY.NURSE_CALL, showInitialDayChoices);
}

function showInitialBed() {
  typeText(TEXT.INITIAL_DAY.BED, () => waitForInitialContinue(showInitialDinner));
}

function showInitialDinner() {
  typeText(
    TEXT.INITIAL_DAY.DINNER,
    () => {
      setInitialChoices([
        { label: "食べる", action: showInitialDinnerAfterMeal }
      ]);
    }
  );
}

function showInitialDinnerAfterMeal() {
  typeText(TEXT.INITIAL_DAY.DINNER_AFTER_MEAL, () => waitForInitialContinue(showInitialWaterChoices, "紙コップを見る"));
}

function showInitialWaterChoices() {
  typeText(
    TEXT.INITIAL_DAY.WATER_CHOICES,
    () => {
      setInitialChoices([
        { label: "水を飲む", action: showInitialDrinkWater },
        { label: "飲まない", action: showInitialSkipWater }
      ]);
    }
  );
}

function showInitialDrinkWater() {
  typeText(TEXT.INITIAL_DAY.DRINK_WATER, () => waitForInitialContinue(showInitialToothbrush));
}

function showInitialSkipWater() {
  typeText(TEXT.INITIAL_DAY.SKIP_WATER, () => waitForInitialContinue(showInitialToothbrush));
}

function showInitialToothbrush() {
  typeText(TEXT.INITIAL_DAY.TOOTHBRUSH, () => waitForInitialContinue(showInitialMedicine));
}

function showInitialMedicine() {
  typeText(TEXT.INITIAL_DAY.MEDICINE, () => waitForInitialContinue(showInitialSleep));
}

function showInitialSleep() {
  typeText(TEXT.INITIAL_DAY.SLEEP, () => waitForInitialContinue(showInitialSecondMorning));
}

function showInitialSecondMorning() {
  typeText(TEXT.INITIAL_DAY.SECOND_MORNING, () => waitForInitialContinue(showInitialDoctor));
}

function showInitialDoctor() {
  typeText(TEXT.INITIAL_DAY.DOCTOR, () => waitForInitialContinue(showInitialDischargeTalk));
}

function showInitialDischargeTalk() {
  typeText(TEXT.INITIAL_DAY.DISCHARGE_TALK, () => waitForInitialContinue(showInitialDischarge));
}

function showInitialDischarge() {
  typeText(
    TEXT.INITIAL_DAY.DISCHARGE,
    () => {
      setInitialChoices([
        { label: "タイトルへ戻る", action: completeInitialDay }
      ]);
    }
  );
}

function completeInitialDay() {
  advanceStoryProgress(STORY.SOFT_ROOM.START);
  unlockAchievement("退院");
  startTitle();
}

// ============================================================
// 5. シーン本体
// ============================================================

function goScene(sceneId, params = {}) {
  const scene = SCENES[sceneId];
  if (!scene) {
    throw new Error(`Unknown sceneId: ${sceneId}`);
  }
  currentSceneId = sceneId;
  const wasEnteringScene = isEnteringScene;
  isEnteringScene = true;
  try {
    scene(params);
  } finally {
    isEnteringScene = wasEnteringScene;
  }
}

const SCENES = {
  "soft.start": () => {
    document.body.className = "";
    hideRulePopup();
    title.textContent = "";
    counters.hiddenLoopClicks = 0;
    flags.loopButtonLocked = false;
    advanceStoryProgress(STORY.SOFT_ROOM.START);
    typeText(TEXT.SOFT_ROOM.START, () => goScene("soft.choices"));
  },
  "soft.choices": () => {
    const baseChoices = [
      { label: "トイレをする", action: () => die("TOILET") },
      { label: "ナースコールを押す", action: () => goScene("soft.nurseCall") },
      { label: "ねる", action: () => die("SLEEP") }
    ];
    if (counters.deaths >= 1) {
      baseChoices.push({
        label: "……",
        action: handleHiddenLoopButton
      });
    }
    setChoices(baseChoices);
  },
  "soft.return": () => {
    title.textContent = "";
    counters.hiddenLoopClicks = 0;
    flags.loopButtonLocked = false;
    typeText(TEXT.SOFT_ROOM.RETURN, () => goScene("soft.choices"));
  },
  "soft.nurseCall": () => {
    if (!isStoryProgressAtLeast(STORY.SOFT_ROOM.LOOP_AWARE)) {
      die("EARLY_NURSE_CALL");
      return;
    }
    if (isStoryProgressAtLeast(STORY.SOFT_ROOM.NURSE_Z_ROUTE)) {
      goScene("soft.nurseCallResponder");
      return;
    }
    typeText(TEXT.SOFT_ROOM.NURSE_CALL_LOOP1, () => goScene("soft.broadcastChoices"));
  },
  "soft.nurseCallResponder": () => {
    const nurse = getNextNurseCallResponder();
    typeText(TEXT.SOFT_ROOM.NURSE_CALL_LOOP2(nurse), () => showNurseCallResponderChoices(nurse));
  },
  "soft.broadcastChoices": () => {
    setChoices([
      { label: "返事する", action: () => die("BROADCAST_REPLY") },
      { label: "返事しない", action: () => goScene("soft.doorKnock") }
    ]);
  },
  "soft.doorKnock": () => {
    findRule("doNotAnswerBroadcast");
    const nurse = pendingDoorNurse || { id: "normal", name: "看護師A" };
    typeText(TEXT.SOFT_ROOM.DOOR_KNOCK(nurse), () => showDoorKnockChoices(nurse));
  },
  "soft.paperCup": ({ nurseName = "看護師A" } = {}) => {
    if (typeof nurseName !== "string") {
      nurseName = "看護師A";
    }
    pendingDoorNurse = null;
    if (flags.paperCupPlacedThisLoop) {
      typeText(
        TEXT.SOFT_ROOM.PAPER_CUP_ALREADY,
        () => {
          setChoices([
            { label: "紙コップを見る", action: () => goScene("soft.water") },
            { label: "白い病室へ戻る", action: () => goScene("soft.return") }
          ]);
        }
      );
      return;
    }
    flags.paperCupPlacedThisLoop = true;
    typeText(
      `${nurseName}「紙コップ置いてませんでしたね。」\n\n水を入れる用のドアから、日付の書かれた紙コップが二つ入れられた。`,
      () => {
        setChoices([
          { label: "紙コップを見る", action: () => goScene("soft.water") },
          { label: "白い病室へ戻る", action: () => goScene("soft.return") }
        ]);
      }
    );
  },
  "soft.water": () => {
    typeText(TEXT.SOFT_ROOM.WATER.LOOK, showWaterChoices);
  },
  "soft.meal": () => {
    const mealText =
      counters.mealDeaths > 0
        ? TEXT.SOFT_ROOM.MEAL.AFTER_DEATH
        : TEXT.SOFT_ROOM.MEAL.BEFORE_DEATH;
    typeText(mealText, showMealChoices);
  },
  "soft.nightPreview": () => {
    typeText(TEXT.SOFT_ROOM.MEAL.NIGHT_PREVIEW, () => waitForContinue(() => goScene("soft.toothbrush")));
  },
  "soft.toothbrush": () => {
    typeText(TEXT.SOFT_ROOM.TOOTHBRUSH_EVENT, showToothbrushChoices);
  },
  "soft.lightsOut": () => {
    findRule("toiletLight");
    typeText(TEXT.SOFT_ROOM.LIGHTS_OUT, () => goScene("soft.nightChoices"));
  },
  "soft.nightChoices": () => {
    setChoices([
      { label: "寝る", action: sleepAtNight },
      { label: "トイレへ移動", action: () => goScene("soft.nightToilet") }
    ]);
  },
  "soft.nightToilet": () => {
    typeText(
      TEXT.SOFT_ROOM.NIGHT_TOILET_ENTER,
      () => {
        setChoices([
          { label: "用を足す", action: () => goScene("soft.toiletPaper") },
          { label: "ドアを見る", action: lookAtDoor },
          { label: "白い病室へ戻る", action: () => goScene("soft.nightChoices") }
        ]);
      }
    );
  },
  "soft.toiletPaper": () => {
    typeText(
      TEXT.SOFT_ROOM.TOILET_PAPER,
      () => {
        setChoices([
          { label: "そのまま流す", action: () => die("TOILET_PAPER_FLUSH") },
          { label: "細かく砕いて流す", action: () => goScene("soft.cleaningPreview") }
        ]);
      }
    );
  },
  "soft.cleaningPreview": () => {
    typeText(
      TEXT.SOFT_ROOM.CLEANING_PREVIEW,
      () => {
        setChoices([
          { label: "トイレを磨く", action: () => goScene("soft.cleaningResult") },
          { label: "布団へ戻る", action: () => die("DARK_ROOM_RETURN") }
        ]);
      }
    );
  },
  "soft.cleaningResult": () => {
    counters.cleanings++;
    typeText(
      TEXT.SOFT_ROOM.CLEANING_RESULT,
      () => {
        setChoices([
          { label: "さらに磨く", action: () => goScene("soft.cleaningResult") },
          { label: "巡回を待つ", action: () => goScene("soft.patrol") },
          { label: "ドアを見る", action: lookAtDoor },
          { label: "夜明けを待つ", action: showMorningWarning }
        ]);
      }
    );
  },
  "soft.patrol": () => {
    counters.patrols++;
    const nurse = getPatrolNurse();
    typeText(
      TEXT.SOFT_ROOM.PATROL_APPROACH(nurse.name),
      () => showPatrolChoices(nurse)
    );
  },
  "soft.patrolSurvive": ({ nurse }) => {
    typeText(
      TEXT.SOFT_ROOM.PATROL_SURVIVE(nurse.name),
      () => {
        setChoices([
          { label: "トイレを磨く", action: () => goScene("soft.cleaningResult") },
          { label: "巡回を待つ", action: () => goScene("soft.patrol") },
          { label: "夜明けを待つ", action: showMorningWarning }
        ]);
      }
    );
  },
  "soft.nurseZMeet": () => {
    if (!flags.metNurseZOnPatrol) {
      flags.metNurseZOnPatrol = true;
      advanceStoryProgress(STORY.SOFT_ROOM.NURSE_Z_ROUTE);
    }
    if (isStoryProgressAtLeast(STORY.SOFT_ROOM.ESCAPE_READY)) {
      goScene("soft.escapeProposal");
      return;
    }
    typeText(
      TEXT.SOFT_ROOM.NURSE_Z_MEET,
      () => {
        setChoices([
          { label: "トイレを磨く", action: () => goScene("soft.cleaningResult") },
          { label: "巡回を待つ", action: () => goScene("soft.patrol") },
          { label: "夜明けを待つ", action: showMorningWarning }
        ]);
      }
    );
  },
  "soft.escapeProposal": () => {
    typeText(
      TEXT.SOFT_ROOM.ESCAPE_PROPOSAL,
      () => {
        setChoices([
          { label: "ドア解除を行う", action: showDoorUnlockEvent },
          { label: "やめる", action: showMorningWarning }
        ]);
      }
    );
  },
  "door.start": () => {
    doorUnlock.step = 0;
    doorUnlock.progress = 0;
    doorUnlock.patrolHandled = false;
    doorUnlock.patternChanged = doorUnlock.enemyLearned;
    doorUnlock.hour = 20;
    typeText(
      TEXT.SOFT_ROOM.DOOR_UNLOCK_START,
      () => waitForContinue(() => goScene("door.status"))
    );
  },
  "door.status": ({ extraText = "" } = {}) => {
    const message = TEXT.SOFT_ROOM.DOOR_UNLOCK_STATUS({
      time: getDoorUnlockTimeText(),
      progress: doorUnlock.progress,
      gauge: getDoorUnlockGauge(),
      patternChanged: doorUnlock.patternChanged,
      extraText
    });
    typeText(message, () => {
      setChoices([
        { label: "押す", action: () => goScene("door.action", { action: "push" }) },
        { label: "引く", action: () => goScene("door.action", { action: "pull" }) },
        { label: "待つ", action: () => goScene("door.action", { action: "wait" }) },
        { label: "Zに合図する", action: () => goScene("door.signal") }
      ]);
    });
  },
  "door.action": ({ action }) => {
    if (shouldDoorUnlockPatrolArrive()) {
      goScene("door.patrol", { action });
      return;
    }
    const route = getDoorUnlockRoute();
    const expected = route[doorUnlock.step];
    if (action !== expected) {
      rewindDoorUnlockStep(1);
      advanceDoorUnlockTime();
      if (isDoorUnlockMorning()) {
        goScene("door.morning");
        return;
      }
      goScene("door.status", { extraText: TEXT.SOFT_ROOM.DOOR_UNLOCK_WRONG_ACTION });
      return;
    }
    doorUnlock.step++;
    advanceDoorUnlockTime();
    syncDoorUnlockProgress();
    if (isDoorUnlockMorning()) {
      goScene("door.morning");
      return;
    }
    if (doorUnlock.step >= route.length) {
      goScene("door.complete");
      return;
    }
    goScene("door.status", { extraText: TEXT.SOFT_ROOM.DOOR_UNLOCK_PROGRESS });
  },
  "door.signal": () => {
    if (shouldDoorUnlockPatrolArrive()) {
      goScene("door.patrol", { action: "signal" });
      return;
    }
    goScene("door.fail", { reason: TEXT.SOFT_ROOM.DOOR_UNLOCK_EARLY_SIGNAL });
  },
  "door.patrol": ({ action }) => {
    doorUnlock.patrolHandled = true;
    const patrolText = doorUnlock.enemyLearned
      ? TEXT.SOFT_ROOM.DOOR_UNLOCK_PATROL_LEARNED
      : TEXT.SOFT_ROOM.DOOR_UNLOCK_PATROL_FIRST;
    if (action === "signal") {
      goScene("door.avoidPatrol", { prefixText: patrolText });
      return;
    }
    typeText(
      patrolText + "\n\n" + TEXT.SOFT_ROOM.DOOR_UNLOCK_PATROL_PROMPT,
      () => {
        setChoices([
          { label: "息を止めて", action: () => goScene("door.avoidPatrol", { prefixText: TEXT.SOFT_ROOM.DOOR_UNLOCK_PATROL_SIGNAL }) },
          { label: "そのまま", action: () => goScene("door.fail", { reason: TEXT.SOFT_ROOM.DOOR_UNLOCK_PATROL_STAY }) },
          { label: "急いで", action: () => goScene("door.fail", { reason: TEXT.SOFT_ROOM.DOOR_UNLOCK_PATROL_HURRY }) },
          { label: "黙る", action: () => goScene("door.fail", { reason: TEXT.SOFT_ROOM.DOOR_UNLOCK_PATROL_SILENT }) }
        ]);
      }
    );
  },
  "door.avoidPatrol": ({ prefixText }) => {
    doorUnlock.enemyLearned = true;
    doorUnlock.patternChanged = true;
    rewindDoorUnlockStep(2);
    findRule("enemyLearns");
    advanceDoorUnlockTime();
    typeText(
      prefixText + "\n\n" + TEXT.SOFT_ROOM.DOOR_UNLOCK_AVOID,
      () => {
        if (isDoorUnlockMorning()) {
          waitForContinue(() => goScene("door.morning"));
          return;
        }
        waitForContinue(() => goScene("door.status", { extraText: TEXT.SOFT_ROOM.DOOR_UNLOCK_RETRY }));
      }
    );
  },
  "door.fail": ({ reason }) => {
    typeText(
      reason + "\n\n" + TEXT.SOFT_ROOM.DOOR_UNLOCK_FAIL,
      () => {
        setChoices([
          { label: "トイレを磨く", action: () => goScene("soft.cleaningResult") },
          { label: "巡回を待つ", action: () => goScene("soft.patrol") },
          { label: "夜明けを待つ", action: showMorningWarning }
        ]);
      }
    );
  },
  "door.complete": () => {
    typeText(
      TEXT.SOFT_ROOM.DOOR_UNLOCK_COMPLETE,
      () => {
        setChoices([
          { label: "目を閉じる", action: showFootworkEvent },
          { label: "目を開ける", action: () => die("OPEN_EYES_ESCAPE") }
        ]);
      }
    );
  },
  "door.morning": () => {
    typeText(
      TEXT.SOFT_ROOM.DOOR_UNLOCK_MORNING,
      () => waitForContinue(showMorningWarning)
    );
  },
  "footwork.start": () => {
    footwork.step = 0;
    clearTimeout(footworkWaitTimer);
    typeText(TEXT.SOFT_ROOM.FOOTWORK_START, () => goScene("footwork.choices"));
  },
  "footwork.choices": () => {
    const expected = footworkRoute[footwork.step];
    if (expected === "wait") {
      goScene("footwork.wait");
      return;
    }
    const progress = `${footwork.step}/${footworkRoute.length}`;
    const footworkChoices = [
      { label: "左前", action: () => goScene("footwork.input", { input: "1" }) },
      { label: "右前", action: () => goScene("footwork.input", { input: "2" }) },
      { label: "左後", action: () => goScene("footwork.input", { input: "3" }) },
      { label: "右後", action: () => goScene("footwork.input", { input: "4" }) }
    ];
    if (expected === "5" && footwork.unlocked5) {
      footworkChoices.push({ label: "ジャンプ", action: () => goScene("footwork.input", { input: "5" }) });
    }
    if (expected === "6" && footwork.unlocked6) {
      footworkChoices.push({ label: "会計お願いします。", action: () => goScene("footwork.input", { input: "6" }) });
    }
    if (expected === "7" && footwork.unlocked7) {
      footworkChoices.push({ label: "募金はこちらへ。", action: () => goScene("footwork.input", { input: "7" }) });
    }
    typeText(
      TEXT.SOFT_ROOM.FOOTWORK_STATUS(progress),
      () => setChoices(footworkChoices)
    );
  },
  "footwork.wait": () => {
    typeText(
      TEXT.SOFT_ROOM.FOOTWORK_WAIT,
      () => {
        setChoices([
          { label: "左前", action: failFootworkDuringWait },
          { label: "右前", action: failFootworkDuringWait },
          { label: "左後", action: failFootworkDuringWait },
          { label: "右後", action: failFootworkDuringWait }
        ]);
        clearTimeout(footworkWaitTimer);
        footworkWaitTimer = setTimeout(() => {
          footwork.step++;
          goScene("footwork.choices");
        }, 5000);
      }
    );
  },
  "footwork.input": ({ input }) => {
    const expected = footworkRoute[footwork.step];
    clearTimeout(footworkWaitTimer);
    if (input !== expected) {
      unlockFootworkSpecialIfNeeded(expected);
      die({ type: "FOOTWORK_FAIL", expected });
      return;
    }
    footwork.step++;
    if (footwork.step >= footworkRoute.length) {
      goScene("footwork.complete");
      return;
    }
    if (expected === "5" || expected === "6" || expected === "7") {
      goScene("footwork.specialSuccess", { expected });
      return;
    }
    goScene("footwork.choices");
  },
  "footwork.specialSuccess": ({ expected }) => {
    const messages = {
      "5": TEXT.SOFT_ROOM.FOOTWORK_SPECIAL_5,
      "6": TEXT.SOFT_ROOM.FOOTWORK_SPECIAL_6,
      "7": TEXT.SOFT_ROOM.FOOTWORK_SPECIAL_7
    };
    typeText(messages[expected], () => waitForContinue(() => goScene("footwork.choices")));
  },
  "footwork.complete": () => {
    showCarApproach();
  }
};

// ============================================================
// 6. 旧function名からシーンIDへの橋渡し
// ============================================================
// HTMLや古い処理から呼ばれても動くように、外側の名前は残している。
// 新しくイベントを増やすときは、基本的に SCENES へ本体を書く。

// ルール帳画面。
// foundがtrueのルールだけ本文を表示し、未発見のものは？？？にする。
function showRules() {
  document.body.className = "";
  hideRulePopup();
  title.textContent = "ルール";
  const ruleText = rules
    .map((rule, index) => `${index + 1}. ${rule.found ? rule.text : "？？？"}\n`)
    .join("\n");
  typeText(ruleText, () => {
    setChoices([
      { label: "タイトルへ戻る", action: startTitle }
    ]);
  });
}

// 白い病室から始まる本編の入口。
// story.progressの進行度によって、今後ここで文章や選択肢を変えていく。
function startLoop() {
  goScene("soft.start");
}

// 白い病室で出す基本選択肢。
// 1回以上死亡した後、隠し選択肢「……」を追加している。
function showChoices() {
  goScene("soft.choices");
}

// イベント途中から白い病室へ戻るとき、前のイベント文を残さず初期状態へ戻す。
function returnToWhiteRoom() {
  goScene("soft.return");
}

// ナースコール。
// 物語上のループ進行度が足りない間は、まだ調べ方が分からず死亡する。
function handleNurseCall() {
  goScene("soft.nurseCall");
}

// loopが進むと、ナースコールの向こうにいる看護師も分岐する。
function showNurseCallResponderEvent() {
  goScene("soft.nurseCallResponder");
}

function getNextNurseCallResponder() {
  const nurses = [
    { id: "normal", name: "看護師A" },
    { id: "c", name: "看護師C" },
    { id: "z", name: "看護師Z" }
  ];
  counters.nurseCalls++;
  return nurses[(counters.nurseCalls - 1) % nurses.length];
}

function showNurseCallResponderChoices(nurse) {
  setChoices([
    { label: "話しかける", action: () => talkToNurseCallResponder(nurse) },
    { label: "返事しない", action: () => waitForDoorNurse(nurse) }
  ]);
}

function talkToNurseCallResponder(nurse) {
  if (nurse.id === "z") {
    findRule("someNursesDiffer");
    waitForDoorNurse(nurse);
    return;
  }
  if (nurse.id === "c") {
    die("NURSE_C_BROADCAST");
    return;
  }
  die({ type: "NORMAL_NURSE_CALL_TALK", nurseName: nurse.name });
}

function waitForDoorNurse(nurse) {
  pendingDoorNurse = nurse;
  goScene("soft.doorKnock");
}

// 室内放送への返事。
// ここで返事をすると死亡し、返事しないことで次の観察へ進む。
function showBroadcastChoices() {
  goScene("soft.broadcastChoices");
}

// 放送に返事をしないと、今度はドアの向こうから声が来る。
function showDoorKnock() {
  goScene("soft.doorKnock");
}

// ドア越しの会話。
// 今は会話すると死亡、黙ると紙コップイベントへ進む。
function showDoorKnockChoices(nurse) {
  setChoices([
    { label: "会話する", action: () => talkThroughDoor(nurse) },
    { label: "会話しない", action: () => goScene("soft.paperCup", { nurseName: nurse.name }) }
  ]);
}

function talkThroughDoor(nurse) {
  if (nurse.id === "z") {
    talkToNurseZAtDoor();
    return;
  }
  pendingDoorNurse = null;
  die("TALK_THROUGH_DOOR");
}

function talkToNurseZAtDoor() {
  counters.nurseZDoorTalks++;
  pendingDoorNurse = null;
  if (counters.nurseZDoorTalks >= 3) {
    advanceStoryProgress(STORY.SOFT_ROOM.ESCAPE_READY);
    findRule("nurseZCanHelp");
  }
  const line =
    counters.nurseZDoorTalks >= 3 ? "今夜ドアの前で待っていてください。" :
    counters.nurseZDoorTalks === 2 ? "もう少し待ってください。" :
    "今はまだ、開けられません。";
  typeText(
    `看護師Zは、ドアの向こうで少しだけ声を落とした。\n\n看護師Z「${line}」\n\nそれだけ言って、足音は遠ざかった。\n\n生きている。`,
    () => waitForContinue(() => goScene("soft.paperCup", { nurseName: "看護師Z" }))
  );
}

// 日付入り紙コップのイベント。
// 水イベントや食事イベントへつなぐための仮の到達点。
function showPaperCupEvent(nurseName = "看護師A") {
  goScene("soft.paperCup", { nurseName });
}

// 水イベントの入口。
// 内容は後で決めるため、今は選択肢だけを置いておく。
function showWaterEvent() {
  goScene("soft.water");
}

// 水イベントの選択肢。
// 何度か調べると「周囲へ撒く」が増える。
function showWaterChoices() {
  const waterChoices = [
    { label: "飲む", action: drinkWater },
    { label: "飲まない", action: refuseWater }
  ];
  if (counters.waterDeaths > 0) {
    waterChoices.push({
      label: "周囲へ撒く",
      action: scatterWater
    });
  }
  setChoices(waterChoices);
}

// 水を飲むと死亡する。
function drinkWater() {
  findRule("doNotDrinkWater");
  counters.waterDeaths++;
  die({ type: "GENERIC", reason: TEXT.SOFT_ROOM.WATER.DRINK_DEATH });
}

// 飲まない場合は、いったん食事イベントへ進む。
function refuseWater() {
  findRule("doNotDrinkWater");
  typeText(TEXT.SOFT_ROOM.WATER.REFUSE, () => waitForContinue(() => goScene("soft.meal")));
}

// 水を撒くと、床や部屋の違和感を見つける。
function scatterWater() {
  findRule("waterCanReveal");
  typeText(
    TEXT.SOFT_ROOM.WATER.SCATTER,
    () => {
      setChoices([
        { label: "線を見続ける", action: () => die({ type: "GENERIC", reason: TEXT.SOFT_ROOM.WATER.INVISIBLE_LINE_DEATH }) },
        { label: "見なかったことにする", action: () => goScene("soft.meal") }
      ]);
    }
  );
}

// 食事イベントの仮実装。
// 後でセリフや死亡演出を肉付けする。
function showMealEvent() {
  goScene("soft.meal");
}

function eatMeal() {
  const alreadyDiedFromMeal = counters.mealDeaths > 0;
  counters.mealDeaths++;
  die({
    type: "GENERIC",
    reason: alreadyDiedFromMeal
      ? TEXT.SOFT_ROOM.MEAL.AFTER_DEATH_DEATH
      : TEXT.SOFT_ROOM.MEAL.FIRST_DEATH
  });
}

function showMealChoices() {
  setChoices([
    { label: "食べる", action: eatMeal },
    { label: "食べない", action: refuseMeal },
    { label: "野菜ジュースだけ飲む", action: () => goScene("soft.nightPreview") }
  ]);
}

function refuseMeal() {
  typeText(TEXT.SOFT_ROOM.MEAL.REFUSE, () => waitForContinue(() => goScene("soft.return")));
}

// 夜イベントの入口。
function showNightPreview() {
  goScene("soft.nightPreview");
}

// 歯磨きイベント。
// 看護師Cはまだ説明せず、瞬きだけを不自然な合図として見せる。
function showToothbrushEvent() {
  goScene("soft.toothbrush");
}

function showToothbrushChoices() {
  setChoices([
    { label: "気づかないふりをする", action: () => goScene("soft.lightsOut") },
    { label: "意味を聞く", action: () => die("NURSE_C_MEANING_ASK") },
    { label: "同じように瞬きする", action: () => goScene("soft.lightsOut") }
  ]);
}

// 消灯イベント。
// トイレだけ照明が残る。
function showLightsOutEvent() {
  goScene("soft.lightsOut");
}

function showNightChoices() {
  goScene("soft.nightChoices");
}

// 夜に寝ると死亡する。
function sleepAtNight() {
  findRule("nightIsDangerous");
  die("SLEEP");
}

// 夜のトイレイベント入口。
// 本体は次以降で作る。
function moveToNightToilet() {
  goScene("soft.nightToilet");
}

// トイレ本体の仮入口。
function showToiletPaperEvent() {
  goScene("soft.toiletPaper");
}

// 掃除イベントへ進む前の仮到達点。
function showCleaningPreview() {
  goScene("soft.cleaningPreview");
}

function showCleaningResult() {
  goScene("soft.cleaningResult");
}

// ドアを見ると死亡する。
// 掃除回数によって、見える監視人数が少し変わる。
function lookAtDoor() {
  findRule("doNotLookDoor");
  die({ type: "DOOR_WATCHERS", count: counters.cleanings });
}

// 看護師の巡回を待つ。
// 基本は話しかけると死亡。物語が進んでいると看護師Zが混ざる。
function waitForPatrol() {
  goScene("soft.patrol");
}

function getPatrolNurse() {
  if (isStoryProgressAtLeast(STORY.SOFT_ROOM.LOOP_AWARE) && counters.patrols % 3 === 0) {
    return { id: "z", name: "看護師Z" };
  }
  if (counters.patrols % 2 === 0) {
    return { id: "c", name: "看護師C" };
  }
  return { id: "normal", name: "看護師A" };
}

function showPatrolChoices(nurse) {
  if (nurse.id === "z") {
    setChoices([
      { label: "話しかける", action: () => talkToPatrolNurse(nurse) },
      { label: "狂ったふりをする", action: () => goScene("soft.patrolSurvive", { nurse }) },
      { label: "普通にいる", action: () => goScene("soft.patrolSurvive", { nurse }) },
      { label: "ドアを見る", action: () => goScene("soft.patrolSurvive", { nurse }) }
    ]);
    return;
  }
  setChoices([
    { label: "話しかける", action: () => talkToPatrolNurse(nurse) },
    { label: "狂ったふりをする", action: () => goScene("soft.patrolSurvive", { nurse }) },
    { label: "普通にいる", action: () => die({ type: "PATROL_NORMAL_SURVIVE_FAIL", nurseName: nurse.name }) },
    { label: "ドアを見る", action: lookAtDoor }
  ]);
}

function talkToPatrolNurse(nurse) {
  if (nurse.id === "z") {
    findRule("someNursesDiffer");
    goScene("soft.nurseZMeet");
    return;
  }
  if (nurse.id === "c") {
    die("PATROL_C_TALK");
    return;
  }
  die({ type: "PATROL_NORMAL_TALK", nurseName: nurse.name });
}

function survivePatrol(nurse) {
  goScene("soft.patrolSurvive", { nurse });
}

// 看護師Zは現時点で唯一、話しかけて生存できる巡回者。
function meetNurseZ() {
  goScene("soft.nurseZMeet");
}

// 仮脱出イベント。
// ドア解除、足運び、車運転は後で肉付けするため、今はいったん成功する骨だけ通す。
function showEscapeProposal() {
  goScene("soft.escapeProposal");
}

// ============================================================
// 7. ドア解除・足運び・車イベントの補助
// ============================================================

function showDoorUnlockEvent() {
  goScene("door.start");
}

function getDoorUnlockRoute() {
  if (!doorUnlock.patternChanged) return baseDoorUnlockRoute;
  return baseDoorUnlockRoute.map(action => {
    if (action === "push") return "pull";
    if (action === "pull") return "push";
    return action;
  });
}

function getDoorUnlockGauge() {
  const filled = Math.round(doorUnlock.progress / 10);
  return "■".repeat(filled) + "□".repeat(10 - filled);
}

function syncDoorUnlockProgress() {
  const route = getDoorUnlockRoute();
  doorUnlock.progress = Math.min(100, Math.round((doorUnlock.step / route.length) * 100));
}

function rewindDoorUnlockStep(amount = 1) {
  doorUnlock.step = Math.max(0, doorUnlock.step - amount);
  syncDoorUnlockProgress();
}

function getDoorUnlockTimeText() {
  return `${String(doorUnlock.hour).padStart(2, "0")}:00\n`;
}

function advanceDoorUnlockTime() {
  doorUnlock.hour = (doorUnlock.hour + 1) % 24;
}

function isDoorUnlockMorning() {
  return doorUnlock.hour === 6;
}

function endDoorUnlockByMorning() {
  goScene("door.morning");
}

function handleDoorUnlockAction(action) {
  goScene("door.action", { action });
}

function shouldDoorUnlockPatrolArrive() {
  return !doorUnlock.patrolHandled && doorUnlock.step >= 3;
}

function triggerDoorUnlockPatrol(action) {
  goScene("door.patrol", { action });
}

function signalNurseZDuringUnlock() {
  goScene("door.signal");
}

function avoidDoorUnlockPatrol(prefixText) {
  goScene("door.avoidPatrol", { prefixText });
}

function failDoorUnlock(reason) {
  goScene("door.fail", { reason });
}

function completeDoorUnlock() {
  goScene("door.complete");
}

function showFootworkEvent() {
  goScene("footwork.start");
}

function showFootworkChoices() {
  goScene("footwork.choices");
}

function showFootworkWaitTurn() {
  goScene("footwork.wait");
}

function failFootworkDuringWait() {
  clearTimeout(footworkWaitTimer);
  die("FOOTWORK_WAIT_FAIL");
}

function handleFootworkInput(input) {
  goScene("footwork.input", { input });
}

function showFootworkSpecialSuccess(expected) {
  goScene("footwork.specialSuccess", { expected });
}

function unlockFootworkSpecialIfNeeded(expected) {
  if (expected === "5") footwork.unlocked5 = true;
  if (expected === "6") footwork.unlocked6 = true;
  if (expected === "7") footwork.unlocked7 = true;
}

function showCarApproach() {
  typeText(
    TEXT.SOFT_ROOM.CAR_APPROACH,
    () => waitForContinue(showCarEvent)
  );
}

function showCarEvent() {
  typeText(
    TEXT.SOFT_ROOM.CAR_START,
    () => waitForContinue(showCarRoad1, "進む")
  );
}

function showCarRoad1() {
  typeText(
    TEXT.SOFT_ROOM.CAR_ROAD1,
    () => setCarDriveChoices(showCarRoad2)
  );
}

function showCarRoad2() {
  typeText(
    TEXT.SOFT_ROOM.CAR_ROAD2,
    () => setCarDriveChoices(showCrosswalkEvent)
  );
}

function showCrosswalkEvent() {
  typeText(
    TEXT.SOFT_ROOM.CROSSWALK,
    () => {
      setChoices([
        { label: "進む", action: () => die("CROSSWALK_ADVANCE") },
        { label: "止まる", action: showCrosswalkPassedEvent },
        { label: "振り返る", action: lookBackInCar }
      ]);
    }
  );
}

function showCrosswalkPassedEvent() {
  typeText(
    TEXT.SOFT_ROOM.CROSSWALK_PASSED,
    () => {
      setChoices([
        { label: "進む", action: showBeforeSignalEvent },
        { label: "止まる", action: showCarCaughtByStopping },
        { label: "振り返る", action: lookBackInCar }
      ]);
    }
  );
}

function showBeforeSignalEvent() {
  typeText(
    TEXT.SOFT_ROOM.BEFORE_SIGNAL,
    () => setCarDriveChoices(showGreenLightEvent)
  );
}

function showGreenLightEvent() {
  typeText(
    TEXT.SOFT_ROOM.GREEN_LIGHT,
    () => {
      setChoices([
        { label: "進む", action: () => die("GREEN_LIGHT_CRASH") },
        { label: "止まる", action: showRedLightEvent },
        { label: "振り返る", action: lookBackInCar }
      ]);
    }
  );
}

function showRedLightEvent() {
  typeText(
    TEXT.SOFT_ROOM.RED_LIGHT,
    () => {
      setChoices([
        { label: "進む", action: showCarTalk1 },
        { label: "止まる", action: showCarCaughtByStopping },
        { label: "振り返る", action: lookBackInCar }
      ]);
    }
  );
}

function setCarDriveChoices(nextAction) {
  setChoices([
    { label: "進む", action: nextAction },
    { label: "止まる", action: showCarCaughtByStopping },
    { label: "振り返る", action: lookBackInCar }
  ]);
}

function showCarCaughtByStopping() {
  die("CAR_CAUGHT");
}

function lookBackInCar() {
  die("CAR_LOOK_BACK");
}

function showCarTalk1() {
  typeText(
    TEXT.SOFT_ROOM.CAR_TALK1,
    () => setCarTalkChoices(showCarTalk2)
  );
}

function showCarTalk2() {
  typeText(
    TEXT.SOFT_ROOM.CAR_TALK2,
    () => setCarTalkChoices(showCarTalk3)
  );
}

function showCarTalk3() {
  typeText(
    TEXT.SOFT_ROOM.CAR_TALK3,
    () => setCarTalkChoices(showCarConversation)
  );
}

function setCarTalkChoices(nextAction) {
  setChoices([
    { label: "進む", action: nextAction },
    { label: "止まる", action: showCarCaughtByStopping },
    { label: "振り返る", action: lookBackInCar }
  ]);
}

function showCarConversation() {
  typeText(
    TEXT.SOFT_ROOM.CAR_CONVERSATION,
    () => waitForContinue(showSoftRoomAfterFin, "進む")
  );
}

function showSoftRoomAfterFin() {
  typeText(
    TEXT.SOFT_ROOM.AFTER_FIN,
    () => {
      setChoices([
        { label: "タイトルへ戻る", action: completeWhiteRoom }
      ]);
    }
  );
}

function completeWhiteRoom() {
  unlockAchievement("白い病室クリア");
  startTitle();
}

function showMorningWarning() {
  findRule("morningDanger");
  typeText(
    TEXT.SOFT_ROOM.MORNING_WARNING,
    () => {
      setChoices([
        { label: "動かない", action: () => die("MORNING_STILL") },
        { label: "トイレを磨き続ける", action: () => die("MORNING_CLEANING") }
      ]);
    }
  );
}

// ============================================================
// 8. 死亡・ルール・実績・ループ処理
// ============================================================

// 死亡メッセージ解決関数。
// TEXT.DEATH のキーまたはオブジェクトを受け取り、表示用文字列を返す。
function resolveDeathMessage(reason) {
  if (typeof reason === "string") {
    // キーとして直接参照できる場合
    if (TEXT.DEATH[reason]) return TEXT.DEATH[reason];
    
    // 後方互換: 従来の生の文字列が渡された場合
    return TEXT.DEATH.GENERIC(reason);
  }
  
  // オブジェクトでパラメータ付き死亡の場合
  switch (reason.type) {
    case "NORMAL_NURSE_CALL_TALK":
      return TEXT.DEATH.NORMAL_NURSE_CALL_TALK(reason.nurseName);
    case "DOOR_WATCHERS":
      return TEXT.DEATH.DOOR_WATCHERS(reason.count);
    case "PATROL_NORMAL_TALK":
      return TEXT.DEATH.PATROL_NORMAL_TALK(reason.nurseName);
    case "PATROL_NORMAL_SURVIVE_FAIL":
      return TEXT.DEATH.PATROL_NORMAL_SURVIVE_FAIL(reason.nurseName);
    case "FOOTWORK_FAIL": {
      const e = reason.expected;
      if (e === "5") return TEXT.DEATH.FOOTWORK_JUMP_FAIL;
      if (e === "6") return TEXT.DEATH.FOOTWORK_PAY_FAIL;
      if (e === "7") return TEXT.DEATH.FOOTWORK_DONATE_FAIL;
      return TEXT.DEATH.FOOTWORK_TOUCH;
    }
    case "GENERIC":
      return TEXT.DEATH.GENERIC(reason.reason);
    default:
      return TEXT.DEATH.GENERIC(String(reason));
  }
}

// 隠し選択肢の処理。
// 何度か押すと表示が変わり、しばらく待つと死亡ルートとして押せるようになる。
function handleHiddenLoopButton() {
  if (flags.loopButtonLocked) return;
  counters.hiddenLoopClicks++;
  const buttons = choices.querySelectorAll("button");
  const button = buttons[3];
  if (!button) return;
  if (counters.hiddenLoopClicks < 5) {
    button.textContent = "4 " + "……".repeat(counters.hiddenLoopClicks + 1);
    return;
  }
  button.textContent = "4 ループしている？ ……";
  button.disabled = true;
  flags.loopButtonLocked = true;
  setTimeout(() => {
    button.textContent = "4 ループしている？";
    button.disabled = false;
    flags.loopButtonLocked = false;
    button.onclick = () => die("LOOP_QUESTION");
  }, 5000);
}

// 死亡イベント。
// reasonには TEXT.DEATH のキー、またはパラメータ付きオブジェクトを渡す。
function die(reason) {
  document.body.className = "dead";
  hideRulePopup();
  title.textContent = "";
  findRule("deathLoops");

  if (reason === "LOOP_QUESTION") {
    findRule("findOwnWay");
    advanceStoryProgress(STORY.SOFT_ROOM.LOOP_AWARE);
  }

  if (counters.deaths >= 1 || reason === "LOOP_QUESTION") {
    findRule("loopChanges");
  }
  const resolved = resolveDeathMessage(reason);
  const message =
    reason === "LOOP_QUESTION"
      ? TEXT.DEATH.LOOP_QUESTION
      : resolved.endsWith("\n\n死亡。") ? resolved : resolved + "\n\n死亡。";
  typeText(message, () => {
    setChoices([
      { label: "タイトルへ戻る", action: nextLoop }
    ]);
  });
}

// ルールを発見済みにする。
function findRule(id) {
  const rule = rules.find(item => item.id === id);
  if (rule && !rule.found) {
    rule.found = true;
    pendingRulePopups.push({
      label: "ルールが記載されました",
      text: rule.text
    });
  }
}

function unlockAchievement(name) {
  pendingRulePopups.push({
    label: "実績解除",
    text: name
  });
}

// タイトル画面で、発見したルールを実績通知のように表示する。
function showQueuedRulePopup() {
  if (!rulePopup || pendingRulePopups.length === 0) return;
  clearTimeout(rulePopupTimer);
  rulePopup.classList.remove("show");
  const popup = pendingRulePopups.shift();
  const popupLabel = typeof popup === "string" ? "ルールが記載されました" : popup.label;
  const popupText = typeof popup === "string" ? popup : popup.text;
  rulePopup.innerHTML =
    `<span class="popup-label">${popupLabel}</span>` +
    `<span class="popup-text">${popupText}</span>`;
  setTimeout(() => {
    rulePopup.classList.add("show");
  }, 150);
  rulePopupTimer = setTimeout(() => {
    rulePopup.classList.remove("show");
    setTimeout(() => {
      showQueuedRulePopup();
    }, 650);
  }, 3300);
}

// タイトル以外の画面へ移るとき、表示中のルール通知を消す。
function hideRulePopup() {
  if (!rulePopup) return;
  clearTimeout(rulePopupTimer);
  rulePopup.classList.remove("show");
}

// 死亡後にタイトルへ戻る。
// ここで死亡回数を増やしてから、タイトルへ戻す。
function nextLoop() {
  counters.deaths++;
  flags.paperCupPlacedThisLoop = false;
  counters.cleanings = 0;
  startTitle();
}

// 最初にタイトル画面を表示する。
startTitle();
