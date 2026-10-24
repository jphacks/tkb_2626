import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import random
import time

# ページ設定
st.set_page_config(
    page_title="めんどうくさくない日程調整アプリ",
    page_icon="📅",
    layout="wide"
)

# セッション状態の初期化
if "events" not in st.session_state:
    st.session_state.events = [
        {
            "id": 1,
            "title": "Q3  प्रोजेक्ट キックオフ会議",
            "creator": "田中 (送り手)",
            "recipient": "佐藤 (受け手)",
            "dates": ["10/28 (水) 14:00〜", "10/29 (木) 10:00〜", "10/30 (金) 16:00〜"],
            "status": "未回答",
            "ai_suggestions": {"10/28 (水) 14:00〜": "〇 (カレンダー空き)", "10/29 (木) 10:00〜": "△ (直前予定あり)", "10/30 (金) 16:00〜": "✕ (会議被り)"},
            "deadline": "明日 18:00 までに返信予定",
            "spam_messages": [],
            "spam_count": 0
        }
    ]

if "current_role" not in st.session_state:
    st.session_state.current_role = "送り手 (Sender)"

# サイドバー：モード切替
st.sidebar.title("👥 モード切替")
mode = st.sidebar.radio(
    "あなたの役割を選んでください：",
    ["送り手 (Sender) 視点", "受け手 (Recipient) 視点"]
)

st.sidebar.markdown("---")
st.sidebar.info(
    "💡 **アプリのコンセプト**\n\n"
    "LINEやSlackでの非同期日程調整のストレスを軽減！\n"
    "• 送り手：カレンダー連携状況の可視化 ＆ **連打による催促メッセージ**\n"
    "• 受け手：**AIによる自動回答案** ＆ 期限の意思表明"
)

# ==========================================
# 1. 送り手 (Sender) モードフロー (S1〜S4)
# ==========================================
if mode == "送り手 (Sender) 視点":
    st.title("📤 送り手ダッシュボード")
    
    tabs = st.tabs(["📋 S3: 回答状況一覧", "✨ S1: イベント作成", "🚀 S4: 催促・連打ルーム"])
    
    # S3: 回答状況一覧
    with tabs[0]:
        st.subheader("作成したイベントの回答状況")
        
        for ev in st.session_state.events:
            with st.expander(f"📌 {ev['title']} (宛先: {ev['recipient']}) - ステータス: **{ev['status']}**", expanded=True):
                col1, col2 = st.columns(2)
                with col1:
                    st.markdown(f"**候補日時:**")
                    for d in ev["dates"]:
                        st.write(f"- {d}")
                    st.markdown(f"**受け手の返信予定:** `{ev['deadline']}`")
                with col2:
                    st.markdown(f"**カレンダー連携状況:** `🟢 相手は回答可能な状態です`")
                    st.markdown(f"**現在の連打カウンター:** 🔥 `{ev['spam_count']}連打`")
                    if ev['spam_count'] >= 100:
                        st.success("🎉 100連超え達成！相手の画面にレア演出が発動中！")
                
                st.markdown("---")
                if st.button(f"🚀 このイベントの催促・連打ルームを開く (ID: {ev['id']})", key=f"btn_{ev['id']}"):
                    st.session_state.active_event_id = ev['id']
                    st.rerun()

    # S1: イベント作成
    with tabs[1]:
        st.subheader("新しい日程調整を作成 (S1)")
        
        with st.form("create_event_form"):
            event_title = st.text_input("イベント名", "新規プロジェクト定例")
            recipient_name = st.text_input("受け手のお名前 / 連絡先", "鈴木さん (Slack)")
            
            st.markdown("候補日時を入力 (最大3つ)")
            date1 = st.text_input("候補 1", "11/1 (月) 13:00〜14:00")
            date2 = st.text_input("候補 2", "11/2 (火) 15:00〜16:00")
            date3 = st.text_input("候補 3", "11/4 (木) 11:00〜12:00")
            
            submitted = st.form_submit_button("リンクを作成して発行 (S2)")
            if submitted:
                new_id = len(st.session_state.events) + 1
                new_ev = {
                    "id": new_id,
                    "title": event_title,
                    "creator": "あなた",
                    "recipient": recipient_name,
                    "dates": [date1, date2, date3],
                    "status": "未回答",
                    "ai_suggestions": {date1: "〇", date2: "△", date3: "✕"},
                    "deadline": "未設定",
                    "spam_messages": [],
                    "spam_count": 0
                }
                st.session_state.events.append(new_ev)
                st.success(f"✅ 調整リンクを作成しました！ (共有用URL: `https://nittei.app/share/{new_id}`)シームレスにコピーされました。")

    # S4: 催促・連打ルーム
    with tabs[2]:
        st.subheader("🔥 送り手のストレス解消：メッセージ連打催促ルーム")
        
        # 選択中のイベント
        event_ids = [e['id'] for e in st.session_state.events]
        selected_id = st.selectbox("対象のイベント選択", event_ids, format_func=lambda x: next(e['title'] for e in st.session_state.events if e['id'] == x))
        target_event = next(e for e in st.session_state.events if e['id'] == selected_id)
        
        st.markdown(f"現在選択中: **{target_event['title']}** (宛先: `{target_event['recipient']}`)")
        
        col_msg, col_tap = st.columns([2, 1])
        with col_msg:
            custom_msg = st.text_input("送るメッセージ（短い一言）", "お疲れ様です！お時間あるときにお願いします🙏")
            if st.button("💬 通常メッセージ送信"):
                target_event["spam_messages"].append(custom_msg)
                st.success("メッセージを送信しました！")
        
        with col_tap:
            st.markdown("### ⚡ 連打アタック")
            if st.button("🔥 连打する！（タップ！）", use_container_width=True):
                target_event["spam_count"] += 1
                target_event["spam_messages"].append(f"🔥 催促連打 ({target_event['spam_count']}回目): {custom_msg}")
                if target_event["spam_count"] == 100:
                    st.balloons()
                    st.success("🌟 100連打達成！【伝説の催促エフェクト】が発動しました！")

        st.metric(label="累計連打数", value=f"{target_event['spam_count']} 回")
        if target_event['spam_count'] >= 100:
            st.info("🎁 100連超えボーナス：受け手側の画面に専用ギフト・特殊演出が降るようになっています！")

# ==========================================
# 2. 受け手 (Recipient) モードフロー (R1〜R4)
# ==========================================
else:
    st.title("📥 受け手回答ダッシュボード")
    
    # どの日程調整に答えるか
    event_ids = [e['id'] for e in st.session_state.events]
    selected_id = st.selectbox("届いている日程調整を選択", event_ids, format_func=lambda x: f"{next(e['title'] for e in st.session_state.events if e['id'] == x)} (from {next(e['creator'] for e in st.session_state.events if e['id'] == x)})")
    target_event = next(e for e in st.session_state.events if e['id'] == selected_id)

    # R4: プレゼント開封演出（連打メッセージがある場合）
    if len(target_event["spam_messages"]) > 0:
        with st.container(border=True):
            st.markdown("### 🎁 届いた催促・メッセージボックス")
            st.warning(f"送り手からメッセージが届いています！（合計 {len(target_event['spam_messages'])} 件）")
            if target_event["spam_count"] >= 100:
                st.markdown("✨ **【特別演出】送り手からの熱量が限界突破しています！画面にメッセージの嵐が降っています！**")
            
            for m in target_event["spam_messages"][-3:]: # 直近3件
                st.info(m)

    tabs_r = st.tabs(["📝 R2: AI半自動回答画面", "✅ R3: 回答完了・確認", "📅 R1: カレンダー連携設定"])

    # R2: AI半自動回答画面
    with tabs_r[0]:
        st.subheader(f"イベント: {target_event['title']}")
        st.markdown("🤖 **AIがあなたのカレンダー空き状況を分析し、最適な回答案を自動入力しました。** 手動で微調整が可能です。")
        
        responses = {}
        for idx, date_str in enumerate(target_event["dates"]):
            default_val = target_event["ai_suggestions"].get(date_str, "〇")
            idx_map = {"〇 (カレンダー空き)": 0, "〇": 0, "△ (直前予定あり)": 1, "△": 1, "✕ (会議被り)": 2, "✕": 2}
            
            choice = st.radio(
                f"候補 {idx+1}: {date_str}",
                ["〇 (参加可能)", "△ (調整次第で可能)", "✕ (参加不可)"],
                index=0 if "〇" in default_val else (1 if "△" in default_val else 2),
                key=f"ans_{target_event['id']}_{idx}"
            )
            responses[date_str] = choice

        st.markdown("---")
        st.markdown("### ⏱️ いつまでに返信するか意思表明する")
        deadline_choice = st.selectbox(
            "この予定の返信・確定ステータスを意思表示",
            ["明日 18:00までに確定します", "本年中 / 今すぐ確定", "金曜日まで保留します"]
        )
        
        notes = st.text_area("備考・コメント（任意）", "AIの提案通りで問題ありません！よろしくお願いします。")

        if st.button("📤 回答を送信する", type="primary"):
            target_event["status"] = "回答済"
            target_event["deadline"] = deadline_choice
            st.success("🎉 回答を送信しました！送り手側に正常に同期されました。")
            st.balloons()

    # R3: 回答完了
    with tabs_r[1]:
        st.subheader("回答内容の確認・変更")
        st.write(f"現在のステータス: **{target_event['status']}**")
        st.write(f"あなたが設定した返信・意思表明: `{target_event['deadline']}`")
        if st.button("🔄 内容を変更して再提出する"):
            st.info("上の「R2: AI半自動回答画面」タブに戻って再設定してください。")

    # R1: カレンダー連携設定
    with tabs_r[2]:
        st.subheader("カレンダー連携 (OAuth / 連携管理)")
        st.write("Google Calendar / Outlook Calendar の連携状態:")
        
        is_connected = st.checkbox("Google Calendar と連携する (AI案の自動生成を有効化)", value=True)
        if is_connected:
            st.success("🟢 連携中：直近の予定を読み込んでAI半自動入力が利用可能です。")
        else:
            st.warning("⚠️ 連携オフ：AI案なしの通常の手動入力モードになります。")
