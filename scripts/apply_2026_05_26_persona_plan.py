import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "data" / "content-system.sqlite"

PLANS = [
    ("p20260526-ai-doubt-01", "2026-05-26", "周二", "09:00", "X", "AI Doubt：第一个 AI 负面事件分析帖", "AI Doubt Notes", "建立冷静怀疑者人设，先保守分析 AI 负面事件", "待领取", None),
    ("p20260526-thinking-lab-01", "2026-05-26", "周二", "09:00", "X", "Thinking Lab：第一个思维模型图解", "Thinking Lab", "建立视觉化分析账号人设", "待领取", None),
    ("p20260526-milo-01", "2026-05-26", "周二", "09:00", "X", "Milo：新技术点评或项目开发吐槽总结", "Milo Reed", "建立真实 builder / 工程师视角", "待领取", None),
    ("p20260526-thinking-tree-01", "2026-05-26", "周二", "09:00", "X", "The Thinking Tree：每日打卡长叶子或掉枝杈", "The Thinking Tree", "建立强记忆点和拟人化账号声音", "待领取", None),
    ("p20260526-nora-01", "2026-05-26", "周二", "09:00", "X", "Nora：热帖模仿", "Nora Blake", "建立普通人试用 / 跟帖观察人设", "待领取", None),
    ("p20260526-franc-01", "2026-05-26", "周二", "09:00", "X", "franc_chan：深度思考时事点评", "franc_chan", "建立慢概念 / 思想性账号人设", "待领取", None),
]


def main() -> None:
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute("BEGIN")

    cur.execute("DELETE FROM activities")
    cur.execute("DELETE FROM contents")
    cur.execute("DELETE FROM plans")
    cur.executemany(
        """
        INSERT INTO plans (id, date, day, slot, channel, theme, owner, goal, status, content_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        PLANS,
    )

    con.commit()
    print(f"synced {len(PLANS)} plans; contents and activities cleared")


if __name__ == "__main__":
    main()
