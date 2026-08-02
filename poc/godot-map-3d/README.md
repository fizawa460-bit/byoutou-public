# 病棟マップ JSON → Godot 3D PoC

既存2DマップJSONを手作業で再制作せず、Godot 4の3D空間へ変換して歩行確認する独立技術検証。既存ゲーム・publicマップエディタ・元JSONは変更しない。

## 起動

### PC（Godot）

1. Godot 4.3以降でこのフォルダの `project.godot` を開く。
2. `F6` ではなく `F5` で実行する。
3. WASDまたは矢印キーで移動、マウスで視点操作、Escでマウスを解放する。

### スマホ／ブラウザ

PRをmainへマージするとGitHub ActionsがWeb版を書き出し、既存Pagesサイト内の `poc/godot-map-3d/build/web/` へ公開する。スマホでは横画面を推奨。

- 画面左側のスティック：移動
- 画面右側のスワイプ：視点移動
- PCブラウザでは従来どおりWASD＋マウス操作

Web版はCompatibilityレンダラーとシングルスレッド書き出しを使用する。Pages全体には既存サイトも一緒に含めるため、現在のマップエディタを消す構成ではない。リポジトリのPagesソースがGitHub Actionsでない場合は、初回だけSettings → Pages → Sourceを「GitHub Actions」に切り替える必要がある。

Godot本体以外の有料／外部アセットは不要。床・壁・ドア・窓・鉄格子・家具はプリミティブ形状で生成する。

## 変換仕様

- JSONの1マスを既定1mへ変換し、`x`をGodotのX、`y`をZへ対応させる。
- `width` / `height` がある配置は矩形寸法を維持し、未指定時は現行タイル定義の標準寸法を使う。
- `floor`, `floorDark`, `wallTop`, `wallSide`, `door`, `doorSmall`, `window`, `peekWindow`, `bars`, `curtain`, `futon`, `table`, `partition`, `cabinet`, `toiletSinkCombo`, `toiletPaperDispenser`, `rail`, `railEdge`, `mealHatch*` を変換する。
- `toiletSinkCombo` は保護室向けの金属製便器・手洗い一体型設備を示す。JSONは3D形状ではなく、設備の種類と材質を渡す設計図として扱う。
- CC0モデルはOpenGameArtの「Toilets」から便器1個と洗面台1個だけを `tools/curate_toilet_glb.py` で抽出し、圧縮済み原本をリポジトリで管理する。`bash prepare_models.sh` が `assets/models/toilet_sink/toilet_sink.glb` へ展開してGodotへ渡す。読込失敗時のみ軽量な簡易形状へ戻す。原作はCC0（https://opengameart.org/content/toilets）。
- `toiletPaperDispenser` は便器後方ではなく、便器に座ったときの横壁へ埋め込む。JSONの `side: toilet_lateral` と `refill: staff_side` は配置意図だけを3D側へ渡す。
- 床、壁、ドア、鉄格子、主要家具に衝突判定を付ける。
- `grime`, `shadow`, `mealTray` は2D装飾のため初期PoCでは無視する。
- 未知のタイルは停止せず、画面左上に警告する。

## 照明の扱い

現行2Dエディタの日光は、時刻から方向・長さ・色・強さを補間する演出用近似。JSONへ保存されるのは `appearance` までで、プレビュー時刻・日光強度・長さ補正・夕日色は現時点では保存されない。そのためPoCは12時を既定値とし、`MapBuilder.preview_hour` で7〜17時の方向近似を試せる。

人工照明は部屋中央の天井灯、日光は影付き平行光として反映する。カーテンと鉄格子は実際の3D遮蔽物として配置するが、薄いカーテン越しの拡散光や鉄格子の半影幅はGodotレンダラー依存で、2D Canvasの数値をそのまま移植したものではない。

## 次段階

1. 複数の実マップJSONで変換テストを追加する。
2. ドアの開閉状態・目線高・壁厚など、JSONにない3D補完値を設定ファイルへ分離する。
3. JSON側へ照明設定が保存されるようになった場合のみ、時刻・強度・夕日色を自動読込する。
4. プリミティブで空間検証後、無料ライセンスが明確な素材だけを任意差し替えする。

## 既知の限界

- 2D JSONには壁の高さ、厚み、窓の上下位置、ドアの開き角がないため、PoC既定値で補完する。
- 45度の壁・レールは2D占有マスが簡易近似のため、3Dでも厳密な端点一致を保証しない。
- iPhoneを含むスマホWeb版は端末性能とブラウザのWebGL実装に影響される。まずPoCとして軽量プリミティブ構成を維持する。
- これは本編組込みではなく、JSON変換可能性を確認するPoCである。
