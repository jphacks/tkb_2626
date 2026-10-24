# python -m streamlit run c:\Users\izmr3\github\tkb_2626\src\001_日程.py

import time
from datetime import datetime, timedelta
import streamlit as st

st.set_page_config(
    page_title="返信スピード感・日程調整プロトタイプ", page_icon="⚡", layout="centered"
)

# --- カスタムCSS（吹き出しの脈動アニメーション＆ステータス表現） ---
st.markdown(
    """
    <style>
    @keyframes pulse-border {
        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 75, 0.4); }
        70% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(255, 75, 75, 0); }
        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 75, 75, 0); }
    }
    
    .pulsing-bubble {
        animation: pulse-border 1.5s infinite;
        border: 2px solid #ff4b4b !important;
        border-radius: 12px;
        padding: 10px;
        background-color: #fff5f5;
    }
    
    .normal-bubble {
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 10px;
        background-color: #f9f9f9;
    }
    </style>
""",
    unsafe_allow_html=True,
)

# セッション状態の初期化
if "chat_history" not in st.session_state:
  st.session_state.chat_history = [
      {
          "sender": "水谷航己",
          "text": "明日の作業、何時ならいける？",
          "thinking_time": "熱中中・57s",
          "is_pulsing": True,
          "expected_time": "22:00 ごろ返す",
      }
  ]

if "candidates" not in st.session_state:
  st.session_state.candidates = {
      "10月25日(日) 20:00〜": 1,
      "10月26日(月) 21:00〜": 0,
      "10月27日(火) 19:30〜": 2,
  }

st.title("⚡ 日程調整 × リアルタイム思考・脈動チャット")
st.markdown(
    "相手がどれくらい真剣に考えているか（脈動・熱量）、いつ返信するかを可視化し、日程調整の滞りを解消するシステムです。"
)

# --- タブによる機能切り替え ---
tab1, tab2 = st.tabs(["💬 チャット・脈動ビュー", "📅 日程調整ボード"])

with tab1:
  st.subheader("タイムライン（吹き出しの脈動・返信スピード感）")

  # チャット表示ループ
  for msg in st.session_state.chat_history:
    bubble_class = "pulsing-bubble" if msg["is_pulsing"] else "normal-bubble"
    pulse_icon = "🔥" if msg["is_pulsing"] else "💬"

    st.markdown(
        f"""
        <div class="{bubble_class}">
            <b>{pulse_icon} {msg['sender']}</b><br>
            <span style="font-size: 1.1em;">{msg['text']}</span><br>
            <div style="font-size: 0.85em; color: #666; margin-top: 5px;">
                ⏱️ 返信にかかる時間/ステータス: <b>{msg['thinking_time']}</b> | 予定: {msg['expected_time']}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.write("")

  # メッセージ・ステータス投稿フォーム
  with st.form("reply_form"):
    st.markdown("### 返信とステータス送信")
    user_text = st.text_input("メッセージ", "今日なら21時以降いけます！")

    col1, col2 = st.columns(2)
    with col1:
      thinking_status = st.selectbox(
          "返信スピード感・状態",
          ["即レス可能", "考え中 (熱中中・45s)", "じっくり考え中", "睡眠中・7:00頃"],
      )
    with col2:
      is_pulse_on = st.checkbox(
          "⚠️ 吹き出しを脈動させる（急ぎのシグナル）", value=True
      )

    submitted = st.form_submit_button("送信する")
    if submitted:
      st.session_state.chat_history.append({
          "sender": "自分",
          "text": user_text,
          "thinking_time": thinking_status,
          "is_pulsing": is_pulse_on,
          "expected_time": "今すぐ返す",
      })
      st.rerun()

with tab2:
  st.subheader("📅 日程調整・候補日投票システム")
  st.markdown("候補日を選んで、自分の空き状況を同期できます。")

  # 候補日一覧の表示と投票
  for slot, count in st.session_state.candidates.items():
    col_a, col_b = st.columns([3, 1])
    with col_a:
      st.write(f"📌 **{slot}** （参加予定: {count}名）")
    with col_b:
      if st.button("参加する", key=slot):
        st.session_state.candidates[slot] += 1
        st.success(f"{slot} に投票しました！")
        st.rerun()

  # 新規候補日の追加
  with st.form("add_schedule"):
    st.markdown("### 新しい日程候補を追加")
    new_slot = st.text_input("候補日時", placeholder="例: 10月28日(水) 21:00〜")
    if st.form_submit_button("候補を追加") and new_slot:
      st.session_state.candidates[new_slot] = 1
      st.rerun()
