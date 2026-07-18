// DEBUG専用: texts.jsを正本のまま、ソフト監禁室編の文章を場面別に通読する。
// 本文をここへ複製せず、必ずTEXTを参照する。
(function setupSoftRoomDialogueViewer() {
  if (typeof DEBUG === "undefined" || !DEBUG) return;
  if (showDebugMenu.__hasDialogueViewer) return;

  const scene = (id, label, getText) => ({ id, label, getText });
  const fixed = (id, label, value) => scene(id, label, () => value);
  const soft = TEXT.SOFT_ROOM;
  const death = TEXT.DEATH;

  const sections = [
    {
      id: "loop-start",
      label: "目覚め・ループ導入",
      scenes: [
        fixed("SOFT_ROOM.START.FULL", "白い病室で目覚める・0回", soft.START.FULL),
        fixed("SOFT_ROOM.START.COMPRESSED", "冒頭説明・3回", soft.START.COMPRESSED),
        fixed("SOFT_ROOM.START.ESSENTIAL", "冒頭説明・6回", soft.START.ESSENTIAL),
        fixed("SOFT_ROOM.START.MINIMAL", "冒頭説明・9回", soft.START.MINIMAL),
        fixed("SOFT_ROOM.RETURN", "白い病室へ戻る", soft.RETURN),
        fixed("DEATH.LOOP_QUESTION", "ループへの気づき", death.LOOP_QUESTION),
        fixed("DEATH.TOILET", "トイレで死亡", death.TOILET),
        fixed("DEATH.SLEEP", "眠って死亡", death.SLEEP)
      ]
    },
    {
      id: "nurse-call",
      label: "ナースコール・紙コップ",
      scenes: [
        fixed("SOFT_ROOM.NURSE_CALL_LOOP1", "最初のナースコール", soft.NURSE_CALL_LOOP1),
        scene("SOFT_ROOM.NURSE_CALL_LOOP2", "看護師Aの応答", () => soft.NURSE_CALL_LOOP2({ name: "看護師A" })),
        scene("SOFT_ROOM.NURSE_CALL_LOOP2", "看護師Cの応答", () => soft.NURSE_CALL_LOOP2({ name: "看護師C" })),
        scene("SOFT_ROOM.NURSE_CALL_LOOP2", "看護師Zの応答", () => soft.NURSE_CALL_LOOP2({ name: "看護師Z" })),
        scene("SOFT_ROOM.DOOR_KNOCK", "看護師Aがドアへ来る", () => soft.DOOR_KNOCK({ name: "看護師A" })),
        scene("SOFT_ROOM.PAPER_CUP_PLACED", "紙コップを置く", () => soft.PAPER_CUP_PLACED("看護師A")),
        fixed("SOFT_ROOM.PAPER_CUP_ALREADY", "紙コップ設置済み", soft.PAPER_CUP_ALREADY),
        fixed("DEATH.EARLY_NURSE_CALL", "早すぎるナースコール", death.EARLY_NURSE_CALL),
        fixed("DEATH.BROADCAST_REPLY", "放送へ返事する", death.BROADCAST_REPLY),
        fixed("DEATH.TALK_THROUGH_DOOR", "ドア越しに話す", death.TALK_THROUGH_DOOR)
      ]
    },
    {
      id: "water-meal",
      label: "水・食事",
      scenes: [
        fixed("SOFT_ROOM.WATER.LOOK", "紙コップを見る", soft.WATER.LOOK),
        fixed("SOFT_ROOM.WATER.REFUSE", "水を飲まない", soft.WATER.REFUSE),
        fixed("SOFT_ROOM.WATER.SCATTER", "水を撒く", soft.WATER.SCATTER),
        fixed("SOFT_ROOM.WATER.DRINK_DEATH", "水を飲んで死亡", soft.WATER.DRINK_DEATH),
        fixed("SOFT_ROOM.WATER.INVISIBLE_LINE_DEATH", "見えない線を追う", soft.WATER.INVISIBLE_LINE_DEATH),
        fixed("SOFT_ROOM.WATER.Z_FIRST_DRINK", "Zの水・一杯目", soft.WATER.Z_FIRST_DRINK),
        scene("SOFT_ROOM.WATER.Z_CUP_HINT", "Zの水・二杯目", () => soft.WATER.Z_CUP_HINT(getDoorUnlockHintSequence())),
        fixed("SOFT_ROOM.MEAL.BEFORE_DEATH", "最初の食事", soft.MEAL.BEFORE_DEATH),
        fixed("SOFT_ROOM.MEAL.FIRST_DEATH", "食事で死亡", soft.MEAL.FIRST_DEATH),
        fixed("SOFT_ROOM.MEAL.AFTER_DEATH", "死亡後の食事", soft.MEAL.AFTER_DEATH),
        fixed("SOFT_ROOM.MEAL.AFTER_DEATH_DEATH", "再び食べて死亡", soft.MEAL.AFTER_DEATH_DEATH),
        fixed("SOFT_ROOM.MEAL.REFUSE", "食事を拒否", soft.MEAL.REFUSE),
        fixed("SOFT_ROOM.MEAL.NIGHT_PREVIEW", "野菜ジュースだけ飲む", soft.MEAL.NIGHT_PREVIEW)
      ]
    },
    {
      id: "night-patrol",
      label: "消灯・トイレ・巡回",
      scenes: [
        fixed("SOFT_ROOM.TOOTHBRUSH_EVENT", "歯磨き", soft.TOOTHBRUSH_EVENT),
        fixed("SOFT_ROOM.LIGHTS_OUT", "消灯", soft.LIGHTS_OUT),
        fixed("SOFT_ROOM.NIGHT_TOILET_ENTER", "夜のトイレ", soft.NIGHT_TOILET_ENTER),
        fixed("SOFT_ROOM.TOILET_PAPER", "トイレットペーパー", soft.TOILET_PAPER),
        fixed("SOFT_ROOM.CLEANING_PREVIEW", "掃除を始める", soft.CLEANING_PREVIEW),
        scene("SOFT_ROOM.CLEANING_RESULT", "掃除・1回目（息を呑む音）", () => soft.CLEANING_RESULT(1)),
        scene("SOFT_ROOM.CLEANING_RESULT", "掃除・2回目（ドアが動く音）", () => soft.CLEANING_RESULT(2)),
        scene("SOFT_ROOM.CLEANING_RESULT", "掃除・3・4回目（通常）", () => soft.CLEANING_RESULT(3)),
        scene("SOFT_ROOM.CLEANING_RESULT", "掃除・5回目（倒れる音）", () => soft.CLEANING_RESULT(5)),
        scene("SOFT_ROOM.CLEANING_RESULT", "掃除・6回目以降（通常）", () => soft.CLEANING_RESULT(6)),
        scene("SOFT_ROOM.PATROL_APPROACH", "看護師Aの巡回", () => soft.PATROL_APPROACH("看護師A")),
        scene("SOFT_ROOM.PATROL_SURVIVE", "巡回をやり過ごす", () => soft.PATROL_SURVIVE("看護師A")),
        fixed("SOFT_ROOM.NURSE_Z_MEET", "巡回中にZと会う", soft.NURSE_Z_MEET),
        fixed("SOFT_ROOM.MORNING_WARNING", "朝の警告", soft.MORNING_WARNING),
        fixed("DEATH.MORNING_STILL", "朝まで動かない", death.MORNING_STILL),
        fixed("DEATH.MORNING_CLEANING", "朝まで掃除する", death.MORNING_CLEANING),
        scene("DEATH.DOOR_WATCHERS", "ドアを見る・初回", () => death.DOOR_WATCHERS(0)),
        scene("DEATH.DOOR_WATCHERS", "ドアを見る・複数", () => death.DOOR_WATCHERS(3))
      ]
    },
    {
      id: "escape-door",
      label: "Z・脱出・ドア解除",
      scenes: [
        scene("SOFT_ROOM.NURSE_Z_DOOR_TALK", "Zとのドア越し会話・1回目", () => soft.NURSE_Z_DOOR_TALK(1)),
        scene("SOFT_ROOM.NURSE_Z_DOOR_TALK", "Zとのドア越し会話・2回目", () => soft.NURSE_Z_DOOR_TALK(2)),
        scene("SOFT_ROOM.NURSE_Z_DOOR_TALK", "Zとのドア越し会話・3回目", () => soft.NURSE_Z_DOOR_TALK(3)),
        scene("SOFT_ROOM.NURSE_Z_DOOR_TALK", "Zとのドア越し会話・4回目（ジャンプ）", () => soft.NURSE_Z_DOOR_TALK(4, "5")),
        scene("SOFT_ROOM.NURSE_Z_DOOR_TALK", "Zとのドア越し会話・5回目（支払い）", () => soft.NURSE_Z_DOOR_TALK(5, "6")),
        scene("SOFT_ROOM.NURSE_Z_DOOR_TALK", "Zとのドア越し会話・6回目（募金）", () => soft.NURSE_Z_DOOR_TALK(6, "7")),
        fixed("SOFT_ROOM.NURSE_C_SHORTCUT_HINT", "看護師Cの近道ヒント", soft.NURSE_C_SHORTCUT_HINT),
      fixed("SOFT_ROOM.NURSE_C_SHORTCUT_WARP", "看護師Cの猫騙し", soft.NURSE_C_SHORTCUT_WARP),
      fixed("SOFT_ROOM.ESCAPE_PROPOSAL", "脱出の提案", soft.ESCAPE_PROPOSAL),
        fixed("SOFT_ROOM.DOOR_UNLOCK_START", "ドア解除開始", soft.DOOR_UNLOCK_START),
        fixed("SOFT_ROOM.DOOR_UNLOCK_RETRY", "もう一度触れる", soft.DOOR_UNLOCK_RETRY),
        scene("SOFT_ROOM.DOOR_UNLOCK_STATUS", "解除状況", () => soft.DOOR_UNLOCK_STATUS({ time: "20:00", progress: 33, gauge: "■■■□□□□□□□" })),
        fixed("SOFT_ROOM.DOOR_UNLOCK_PROGRESS", "正しい操作", soft.DOOR_UNLOCK_PROGRESS),
        fixed("SOFT_ROOM.DOOR_UNLOCK_WRONG_ACTION", "誤った操作", soft.DOOR_UNLOCK_WRONG_ACTION),
        fixed("SOFT_ROOM.DOOR_UNLOCK_PATROL_FIRST", "最初の巡回", soft.DOOR_UNLOCK_PATROL_FIRST),
        fixed("SOFT_ROOM.DOOR_UNLOCK_PATROL_PROMPT", "巡回時の判断", soft.DOOR_UNLOCK_PATROL_PROMPT),
        fixed("SOFT_ROOM.DOOR_UNLOCK_AVOID", "巡回を回避", soft.DOOR_UNLOCK_AVOID),
        fixed("SOFT_ROOM.DOOR_UNLOCK_EARLY_SIGNAL", "早すぎる合図", soft.DOOR_UNLOCK_EARLY_SIGNAL),
        fixed("SOFT_ROOM.DOOR_UNLOCK_PATROL_STAY", "巡回失敗・そのまま", soft.DOOR_UNLOCK_PATROL_STAY),
        fixed("SOFT_ROOM.DOOR_UNLOCK_PATROL_HURRY", "巡回失敗・急いで", soft.DOOR_UNLOCK_PATROL_HURRY),
        fixed("SOFT_ROOM.DOOR_UNLOCK_PATROL_SILENT", "巡回失敗・黙る", soft.DOOR_UNLOCK_PATROL_SILENT),
        fixed("SOFT_ROOM.DOOR_UNLOCK_FAIL", "解除失敗・共通", soft.DOOR_UNLOCK_FAIL),
        fixed("SOFT_ROOM.DOOR_UNLOCK_MORNING", "朝が来る", soft.DOOR_UNLOCK_MORNING),
        fixed("SOFT_ROOM.DOOR_UNLOCK_COMPLETE", "解除完了", soft.DOOR_UNLOCK_COMPLETE)
      ]
    },
    {
      id: "footwork-car",
      label: "足運び・車・第一部完",
      scenes: [
        fixed("SOFT_ROOM.FOOTWORK_START", "足運び開始", soft.FOOTWORK_START),
        scene("SOFT_ROOM.FOOTWORK_STATUS", "足運び状況", () => soft.FOOTWORK_STATUS("1 / 22")),
        fixed("SOFT_ROOM.FOOTWORK_WAIT", "待つ", soft.FOOTWORK_WAIT),
        fixed("SOFT_ROOM.FOOTWORK_SPECIAL_5", "ジャンプ", soft.FOOTWORK_SPECIAL_5),
        fixed("SOFT_ROOM.FOOTWORK_SPECIAL_6", "会計", soft.FOOTWORK_SPECIAL_6),
        fixed("SOFT_ROOM.FOOTWORK_SPECIAL_7", "募金", soft.FOOTWORK_SPECIAL_7),
        fixed("SOFT_ROOM.CAR_APPROACH", "車へ到着", soft.CAR_APPROACH),
        fixed("SOFT_ROOM.CAR_START", "車で出発", soft.CAR_START),
        fixed("SOFT_ROOM.CAR_ROAD1", "道路1", soft.CAR_ROAD1),
        fixed("SOFT_ROOM.CAR_ROAD2", "道路2", soft.CAR_ROAD2),
        fixed("SOFT_ROOM.CROSSWALK", "横断歩道", soft.CROSSWALK),
        fixed("SOFT_ROOM.CROSSWALK_PASSED", "横断歩道を待つ", soft.CROSSWALK_PASSED),
        fixed("SOFT_ROOM.BEFORE_SIGNAL", "信号機へ向かう", soft.BEFORE_SIGNAL),
        fixed("SOFT_ROOM.GREEN_LIGHT", "青信号", soft.GREEN_LIGHT),
        fixed("SOFT_ROOM.RED_LIGHT", "赤信号", soft.RED_LIGHT),
        fixed("SOFT_ROOM.CAR_TALK1", "車内会話1", soft.CAR_TALK1),
        fixed("SOFT_ROOM.CAR_TALK2", "車内会話2", soft.CAR_TALK2),
        fixed("SOFT_ROOM.CAR_TALK3", "車内会話3", soft.CAR_TALK3),
        fixed("SOFT_ROOM.CAR_CONVERSATION", "脱出後の会話", soft.CAR_CONVERSATION),
        fixed("SOFT_ROOM.AFTER_FIN", "第一部完", soft.AFTER_FIN)
      ]
    }
  ];

  function renderSection(section) {
    return section.scenes.map(entry => {
      let body;
      try {
        body = formatText(entry.getText());
      } catch (error) {
        body = `[表示エラー: ${error.message}]`;
      }
      return `【${entry.label}】\n[${entry.id}]\n${body}`;
    }).join("\n\n――――――――――\n\n");
  }

  function showSoftRoomDialogueSection(section) {
    clearInterval(typingTimer);
    typingTimer = null;
    clearTextSkip();
    hideRulePopup();
    document.body.className = "debug-dialogue-viewer";
    contentWarning.hidden = true;
    if (saveInspector) saveInspector.hidden = true;
    title.textContent = section.label;
    text.textContent = renderSection(section);
    setChoices([
      { label: "場面一覧へ戻る", action: showSoftRoomDialogueMenu, noHistory: true },
      { label: "デバッグへ戻る", action: showDebugMenu, noHistory: true }
    ]);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showSoftRoomDialogueMenu() {
    document.body.className = "debug-dialogue-viewer";
    hideRulePopup();
    contentWarning.hidden = true;
    if (saveInspector) saveInspector.hidden = true;
    title.textContent = "ソフト監禁室・台本確認";
    text.textContent = "場面を選ぶと、texts.jsの現在の本文をまとめて表示します。\nこの画面では進行・死亡回数・セーブ値を変更しません。";
    setChoices([
      ...sections.map(section => ({
        label: section.label,
        action: () => showSoftRoomDialogueSection(section),
        noHistory: true
      })),
      { label: "デバッグへ戻る", action: showDebugMenu, noHistory: true }
    ]);
  }

  const originalShowDebugMenu = showDebugMenu;
  showDebugMenu = function showDebugMenuWithDialogueViewer() {
    originalShowDebugMenu();
    const button = document.createElement("button");
    button.textContent = "ソフト監禁室・台本確認";
    button.onclick = showSoftRoomDialogueMenu;
    const returnButton = choices.lastElementChild;
    choices.insertBefore(button, returnButton);
  };
  showDebugMenu.__hasDialogueViewer = true;
})();
