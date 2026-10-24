https://claude.ai/chat/ac9c3129-6e3c-4dc4-8fea-091bae250a55

# ポチッと日程（pochitto）— JPHACKS 2026

日程調整を、クスッと笑えるポップな作業に。Flask 製のプロトタイプです。

## 動かす

```bash
pip install -r requirements.txt
python app.py --demo
```

- 送り手（あやは）として見る → http://localhost:5000/demo
- 受け手（たなか）として見る → http://localhost:5000/demo/receiver

同じブラウザで切り替えると Cookie が上書きされるので、送り手と受け手はシークレットウィンドウなど別ブラウザで開くのがおすすめ。
データは `data.json` に保存されます。消せばリセット。

## 画面とファイル

| # | 画面 | ルート | テンプレート |
|---|---|---|---|
| C1 | ホーム | `/` | home.html |
| C2 | カレンダー連携（ユーザーごとに初回だけ） | `/connect` | connect.html |
| — | はじめに（名前入力） | `/welcome` | welcome.html |
| S1 | イベント作成 | `/new` | s1_create.html |
| S2 | リンク発行完了 | `/created/<admin_token>` | s2_created.html |
| S3 | 回答状況一覧 | `/admin/<admin_token>` | s3_status.html |
| S4 | 催促（連打・100連演出） | `/admin/<admin_token>/nudge/<rid\|all>` | s4_nudge.html |
| R0 | 名乗る（調整リンクの入口） | `/e/<event_id>` | r0_join.html |
| R2 | 回答（AI案入り○△×・返信宣言） | `/e/<event_id>/answer` | r2_answer.html |
| R3 | 回答完了 | `/e/<event_id>/done` | r3_done.html |
| R4 | プレゼント開封 → 言葉が降る → 自動で R2 | `/p/<present_id>` | r4_present.html |

```
app.py        ルーティング・画面遷移
store.py      データ層（JSON ファイル。DB に差し替えるならここだけ）
services.py   カレンダー読み取り・AI回答案・状況テキスト・集計
static/       style.css（デザインシステム）, app.js（コピー/共有/トースト）
templates/    各画面
```

## 要件定義の「未決」をこう決めた（変えてOK）

- **送り手の識別**：ログインなし。名前だけ入れて Cookie で覚える。管理画面は推測できない `admin_token` の URL（S2 でコピーできる）
- **カレンダー連携**：必須にしない。C2 をユーザー単位で1回だけ出し、スキップしたら R2 は AI 案なしで手入力
- **「いつまでに返すか」宣言**：R2 の上部（今すぐ無理なら…）。プレゼントを開けた後も R2 に来るので両方の動線をカバー
- **確定画面**：作らず、S3 に「いまのところ有力」と回答表を出す
- **受け手の把握**：S1 で「誰に聞く？」を任意入力。リンクを開いた人は名簿から自分を選ぶか、新しく名乗る

## 本物につなぐときの TODO

- **カレンダー**：`services.py` の `MockCalendar` が疑似予定を返している。`CalendarProvider.busy(day)` を実装した `GoogleCalendar` などを作り、`get_provider()` で返せば画面はそのまま動く。OAuth は `app.py` の `connect()` の TODO 部分
- **AI**：`suggest_marks()`（○△×）と `summarize()`（要約）はルールベース。LLM に置き換えても戻り値の形を守れば OK
- **時刻**：サーバーのローカル時刻（JST 想定）を naive datetime で扱っている
- **本番運用**：`SECRET_KEY` 環境変数、`debug=False`、JSON ストアを DB に
