import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import matplotlib.image as mpimg
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
import numpy as np
import os

BASE_DIR = "/Users/federico_samyndowie/Documents/Python Shared/VAIR"

# ── Data ──────────────────────────────────────────────────────────────────────
oliver = {
    "name": "Michael Oliver",
    "age": 41,
    "matches": 50,                    # CSV dataset
    "fouls_per_match": 24.02,         # 1201/50 from CSV
    "cards_total_per_match": 4.58,    # 229/50 from CSV
    "yc_per_match": 4.42,             # 221/50 from CSV
    "rc_per_match": 0.16,             # 8/50 from CSV
    "fouls_per_yc": 5.43,             # CSV Total row
    "fouls_per_card": 5.24,           # CSV Total row
    "home_fouls_per_match": 11.72,    # 586/50 from CSV
    "away_fouls_per_match": 12.30,    # 615/50 from CSV
    "home_yc_per_match": 1.92,        # 96/50 from CSV
    "away_yc_per_match": 2.50,        # 125/50 from CSV
    "home_rc_per_match": 0.04,        # 2/50 from CSV
    "away_rc_per_match": 0.12,        # 6/50 from CSV
    "penalties_per_match": 0.27,      # FootyMetrics career average
    "avg_dist_goals_m": 8.67,         # CSV Total row
    "avg_dist_fouls_cards_m": 6.34,   # CSV Total row
}

taylor = {
    "name": "Anthony Taylor",
    "age": 47,
    "matches": 54,                    # CSV dataset
    "fouls_per_match": 21.91,         # 1183/54 from CSV
    "cards_total_per_match": 3.96,    # 214/54 from CSV
    "yc_per_match": 3.70,             # 200/54 from CSV
    "rc_per_match": 0.26,             # 14/54 from CSV
    "fouls_per_yc": 5.92,             # CSV Total row
    "fouls_per_card": 5.53,           # CSV Total row
    "ball_in_play_pct": 59,
    "ball_out_play_pct": 41,
    "home_goals_per_match": 1.46,
    "away_goals_per_match": 1.74,
    "home_fouls_per_match": 10.85,    # 586/54 from CSV
    "away_fouls_per_match": 11.06,    # 597/54 from CSV
    "home_yc_per_match": 1.74,        # 94/54 from CSV
    "away_yc_per_match": 1.96,        # 106/54 from CSV
    "home_rc_per_match": 0.15,        # 8/54 from CSV
    "away_rc_per_match": 0.11,        # 6/54 from CSV
    "penalties_per_match": 0.25,      # KickoffScore career average
    "avg_dist_goals_m": 7.27,         # CSV Total row
    "avg_dist_fouls_cards_m": 6.0,    # CSV Total row
}

# ── Colors ────────────────────────────────────────────────────────────────────
OLIVER_COLOR = "#2563EB"
TAYLOR_COLOR = "#DC2626"
BG_COLOR = "#0F172A"
CARD_BG = "#1E293B"
TEXT_COLOR = "#F8FAFC"
SUBTLE_TEXT = "#94A3B8"
GRID_COLOR = "#334155"

# ── Figure layout: photos + 4 chart rows + distance row + footer ─────────────
fig = plt.figure(figsize=(20, 28), facecolor=BG_COLOR)

# Main title
fig.suptitle("REFEREE COMPARISON", fontsize=32, fontweight="bold",
             color=TEXT_COLOR, y=0.975, fontfamily="monospace")

# Use GridSpec: row 0 photos, rows 1-4 charts, row 5 footer
gs = gridspec.GridSpec(6, 2, hspace=0.5, wspace=0.35,
                       left=0.08, right=0.92, top=0.95, bottom=0.03,
                       height_ratios=[1.4, 1.1, 1.1, 1.1, 1.1, 0.15])


def style_ax(ax, title):
    ax.set_facecolor(CARD_BG)
    ax.set_title(title, fontsize=13, fontweight="bold", color=TEXT_COLOR,
                 pad=12, fontfamily="monospace")
    ax.tick_params(colors=SUBTLE_TEXT, labelsize=9)
    for spine in ax.spines.values():
        spine.set_color(GRID_COLOR)
    ax.grid(axis="y", color=GRID_COLOR, alpha=0.3, linestyle="--")


# ── 0. REFEREE PHOTOS ────────────────────────────────────────────────────────
# Oliver photo (left)
ax_oliver = fig.add_subplot(gs[0, 0])
ax_oliver.set_facecolor(CARD_BG)
ax_oliver.axis("off")
try:
    img_oliver = mpimg.imread(os.path.join(BASE_DIR, "oliver_photo.jpg"))
    ax_oliver.imshow(img_oliver, aspect="equal")
except Exception:
    ax_oliver.text(0.5, 0.5, "[Photo not found]", ha="center", va="center",
                   color=SUBTLE_TEXT, fontsize=14, transform=ax_oliver.transAxes)

ax_oliver.set_title("MICHAEL OLIVER", fontsize=18, fontweight="bold",
                     color=OLIVER_COLOR, pad=15, fontfamily="monospace")
# Info text below image
ax_oliver.text(0.5, -0.08, "Born: 20 Feb 1985  |  Ashington, England",
               ha="center", va="top", fontsize=10, color=SUBTLE_TEXT,
               transform=ax_oliver.transAxes, fontfamily="monospace")
ax_oliver.text(0.5, -0.15, "FIFA badge: 2012  |  UEFA Elite: 2018",
               ha="center", va="top", fontsize=10, color=SUBTLE_TEXT,
               transform=ax_oliver.transAxes, fontfamily="monospace")
ax_oliver.text(0.5, -0.22, f"Dataset: {oliver['matches']} matches (24.10.2025 CSV)",
               ha="center", va="top", fontsize=9, color=OLIVER_COLOR,
               transform=ax_oliver.transAxes, fontfamily="monospace")

# Taylor photo (right)
ax_taylor = fig.add_subplot(gs[0, 1])
ax_taylor.set_facecolor(CARD_BG)
ax_taylor.axis("off")
try:
    img_taylor = mpimg.imread(os.path.join(BASE_DIR, "taylor_photo.jpg"))
    ax_taylor.imshow(img_taylor, aspect="equal")
except Exception:
    ax_taylor.text(0.5, 0.5, "[Photo not found]", ha="center", va="center",
                   color=SUBTLE_TEXT, fontsize=14, transform=ax_taylor.transAxes)

ax_taylor.set_title("ANTHONY TAYLOR", fontsize=18, fontweight="bold",
                     color=TAYLOR_COLOR, pad=15, fontfamily="monospace")
ax_taylor.text(0.5, -0.08, "Born: 20 Oct 1978  |  Wythenshawe, England",
               ha="center", va="top", fontsize=10, color=SUBTLE_TEXT,
               transform=ax_taylor.transAxes, fontfamily="monospace")
ax_taylor.text(0.5, -0.15, "FIFA badge: 2013  |  PL Select Group: 2010",
               ha="center", va="top", fontsize=10, color=SUBTLE_TEXT,
               transform=ax_taylor.transAxes, fontfamily="monospace")
ax_taylor.text(0.5, -0.22, f"Dataset: {taylor['matches']} matches (24.10.2025 CSV)",
               ha="center", va="top", fontsize=9, color=TAYLOR_COLOR,
               transform=ax_taylor.transAxes, fontfamily="monospace")

# ── 1. Key Averages Per Game ──────────────────────────────────────────────────
ax1 = fig.add_subplot(gs[1, 0])
style_ax(ax1, "KEY AVERAGES PER GAME")
metrics = ["Fouls", "Yellow Cards", "Red Cards", "Penalties"]
o_vals = [oliver["fouls_per_match"], oliver["yc_per_match"],
          oliver["rc_per_match"], oliver["penalties_per_match"]]
t_vals = [taylor["fouls_per_match"], taylor["yc_per_match"],
          taylor["rc_per_match"], taylor["penalties_per_match"]]

x = np.arange(len(metrics))
width = 0.35
bars1 = ax1.bar(x - width/2, o_vals, width, color=OLIVER_COLOR, label="Oliver", alpha=0.85)
bars2 = ax1.bar(x + width/2, t_vals, width, color=TAYLOR_COLOR, label="Taylor", alpha=0.85)
ax1.set_xticks(x)
ax1.set_xticklabels(metrics, fontsize=9, color=SUBTLE_TEXT)
ax1.legend(fontsize=9, facecolor=CARD_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)

for bar in bars1:
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.15,
             f"{bar.get_height():.2f}", ha="center", va="bottom",
             color=OLIVER_COLOR, fontsize=8, fontweight="bold")
for bar in bars2:
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.15,
             f"{bar.get_height():.2f}", ha="center", va="bottom",
             color=TAYLOR_COLOR, fontsize=8, fontweight="bold")

# ── 2. Fouls per Card Ratios ─────────────────────────────────────────────────
ax2 = fig.add_subplot(gs[1, 1])
style_ax(ax2, "FOUL-TO-CARD RATIOS")
metrics2 = ["Fouls per YC", "Fouls per Card"]
o_vals2 = [oliver["fouls_per_yc"], oliver["fouls_per_card"]]
t_vals2 = [taylor["fouls_per_yc"], taylor["fouls_per_card"]]

x2 = np.arange(len(metrics2))
bars1 = ax2.barh(x2 - width/2, o_vals2, width, color=OLIVER_COLOR, alpha=0.85, label="Oliver")
bars2 = ax2.barh(x2 + width/2, t_vals2, width, color=TAYLOR_COLOR, alpha=0.85, label="Taylor")
ax2.set_yticks(x2)
ax2.set_yticklabels(metrics2, fontsize=10, color=SUBTLE_TEXT)
ax2.legend(fontsize=9, facecolor=CARD_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)

for bar in bars1:
    ax2.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
             f"{bar.get_width():.2f}", va="center", color=OLIVER_COLOR, fontsize=10, fontweight="bold")
for bar in bars2:
    ax2.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height()/2,
             f"{bar.get_width():.2f}", va="center", color=TAYLOR_COLOR, fontsize=10, fontweight="bold")

# ── 3. Home vs Away Yellow Cards ─────────────────────────────────────────────
ax3 = fig.add_subplot(gs[2, 0])
style_ax(ax3, "HOME vs AWAY YELLOW CARDS (per match)")
categories = ["Home YC", "Away YC"]
o_vals3 = [oliver["home_yc_per_match"], oliver["away_yc_per_match"]]
t_vals3 = [taylor["home_yc_per_match"], taylor["away_yc_per_match"]]

x3 = np.arange(len(categories))
bars1 = ax3.bar(x3 - width/2, o_vals3, width, color=OLIVER_COLOR, alpha=0.85, label="Oliver")
bars2 = ax3.bar(x3 + width/2, t_vals3, width, color=TAYLOR_COLOR, alpha=0.85, label="Taylor")
ax3.set_xticks(x3)
ax3.set_xticklabels(categories, fontsize=10, color=SUBTLE_TEXT)
ax3.legend(fontsize=9, facecolor=CARD_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)

for bar in bars1:
    ax3.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
             f"{bar.get_height():.2f}", ha="center", va="bottom",
             color=OLIVER_COLOR, fontsize=10, fontweight="bold")
for bar in bars2:
    ax3.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
             f"{bar.get_height():.2f}", ha="center", va="bottom",
             color=TAYLOR_COLOR, fontsize=10, fontweight="bold")

# ── 4. Home vs Away Red Cards ────────────────────────────────────────────────
ax4 = fig.add_subplot(gs[2, 1])
style_ax(ax4, "HOME vs AWAY RED CARDS (per match)")
o_vals4 = [oliver["home_rc_per_match"], oliver["away_rc_per_match"]]
t_vals4 = [taylor["home_rc_per_match"], taylor["away_rc_per_match"]]

bars1 = ax4.bar(x3 - width/2, o_vals4, width, color=OLIVER_COLOR, alpha=0.85, label="Oliver")
bars2 = ax4.bar(x3 + width/2, t_vals4, width, color=TAYLOR_COLOR, alpha=0.85, label="Taylor")
ax4.set_xticks(x3)
ax4.set_xticklabels(["Home RC", "Away RC"], fontsize=10, color=SUBTLE_TEXT)
ax4.legend(fontsize=9, facecolor=CARD_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)

for bar in bars1:
    ax4.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.003,
             f"{bar.get_height():.3f}", ha="center", va="bottom",
             color=OLIVER_COLOR, fontsize=10, fontweight="bold")
for bar in bars2:
    ax4.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.003,
             f"{bar.get_height():.3f}", ha="center", va="bottom",
             color=TAYLOR_COLOR, fontsize=10, fontweight="bold")

# ── 5. Home vs Away Fouls ────────────────────────────────────────────────────
ax5 = fig.add_subplot(gs[3, 0])
style_ax(ax5, "HOME vs AWAY FOULS (per match)")
o_vals5 = [oliver["home_fouls_per_match"], oliver["away_fouls_per_match"]]
t_vals5 = [taylor["home_fouls_per_match"], taylor["away_fouls_per_match"]]

bars1 = ax5.bar(x3 - width/2, o_vals5, width, color=OLIVER_COLOR, alpha=0.85, label="Oliver")
bars2 = ax5.bar(x3 + width/2, t_vals5, width, color=TAYLOR_COLOR, alpha=0.85, label="Taylor")
ax5.set_xticks(x3)
ax5.set_xticklabels(["Home Fouls", "Away Fouls"], fontsize=10, color=SUBTLE_TEXT)
ax5.legend(fontsize=9, facecolor=CARD_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)

for bar in bars1:
    ax5.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
             f"{bar.get_height():.2f}", ha="center", va="bottom",
             color=OLIVER_COLOR, fontsize=10, fontweight="bold")
for bar in bars2:
    ax5.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
             f"{bar.get_height():.2f}", ha="center", va="bottom",
             color=TAYLOR_COLOR, fontsize=10, fontweight="bold")

# ── 6. Radar / Spider Chart ──────────────────────────────────────────────────
ax6 = fig.add_subplot(gs[3, 1], polar=True)
ax6.set_facecolor(CARD_BG)
ax6.set_title("NORMALIZED PROFILE COMPARISON", fontsize=13, fontweight="bold",
              color=TEXT_COLOR, pad=20, fontfamily="monospace")

radar_labels = ["YC/match", "RC/match", "Fouls/match", "Fouls/YC",
                "Fouls/Card", "Home Fouls", "Away Fouls"]
o_radar_raw = [oliver["yc_per_match"], oliver["rc_per_match"], oliver["fouls_per_match"],
               oliver["fouls_per_yc"], oliver["fouls_per_card"],
               oliver["home_fouls_per_match"], oliver["away_fouls_per_match"]]
t_radar_raw = [taylor["yc_per_match"], taylor["rc_per_match"], taylor["fouls_per_match"],
               taylor["fouls_per_yc"], taylor["fouls_per_card"],
               taylor["home_fouls_per_match"], taylor["away_fouls_per_match"]]

maxes = [max(o, t) for o, t in zip(o_radar_raw, t_radar_raw)]
o_radar = [v / m if m > 0 else 0 for v, m in zip(o_radar_raw, maxes)]
t_radar = [v / m if m > 0 else 0 for v, m in zip(t_radar_raw, maxes)]

angles = np.linspace(0, 2 * np.pi, len(radar_labels), endpoint=False).tolist()
o_radar += o_radar[:1]
t_radar += t_radar[:1]
angles += angles[:1]

ax6.plot(angles, o_radar, "o-", color=OLIVER_COLOR, linewidth=2, label="Oliver")
ax6.fill(angles, o_radar, color=OLIVER_COLOR, alpha=0.15)
ax6.plot(angles, t_radar, "o-", color=TAYLOR_COLOR, linewidth=2, label="Taylor")
ax6.fill(angles, t_radar, color=TAYLOR_COLOR, alpha=0.15)
ax6.set_xticks(angles[:-1])
ax6.set_xticklabels(radar_labels, fontsize=8, color=SUBTLE_TEXT)
ax6.set_yticklabels([])
ax6.spines["polar"].set_color(GRID_COLOR)
ax6.grid(color=GRID_COLOR, alpha=0.3)
ax6.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1), fontsize=9,
           facecolor=CARD_BG, edgecolor=GRID_COLOR, labelcolor=TEXT_COLOR)

# ── 7. Average Distance Metrics ──────────────────────────────────────────────
ax9 = fig.add_subplot(gs[4, 0])
style_ax(ax9, "AVG DISTANCE TO GOALS (m)")
dist_cats = ["Oliver", "Taylor"]
dist_goals = [oliver["avg_dist_goals_m"], taylor["avg_dist_goals_m"]]
bars_dg = ax9.bar(dist_cats, dist_goals, width=0.5,
                  color=[OLIVER_COLOR, TAYLOR_COLOR], alpha=0.85)
for bar in bars_dg:
    ax9.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
             f"{bar.get_height():.2f}m", ha="center", va="bottom",
             color=TEXT_COLOR, fontsize=12, fontweight="bold")
ax9.set_ylabel("Meters", color=SUBTLE_TEXT, fontsize=10)

ax10 = fig.add_subplot(gs[4, 1])
style_ax(ax10, "AVG DISTANCE FOULS LEADING TO CARDS (m)")
dist_cards = [oliver["avg_dist_fouls_cards_m"], taylor["avg_dist_fouls_cards_m"]]
bars_dc = ax10.bar(dist_cats, dist_cards, width=0.5,
                   color=[OLIVER_COLOR, TAYLOR_COLOR], alpha=0.85)
for bar in bars_dc:
    ax10.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.1,
              f"{bar.get_height():.2f}m", ha="center", va="bottom",
              color=TEXT_COLOR, fontsize=12, fontweight="bold")
ax10.set_ylabel("Meters", color=SUBTLE_TEXT, fontsize=10)

# ── Sources footer ───────────────────────────────────────────────────────────
ax_footer = fig.add_subplot(gs[5, :])
ax_footer.axis("off")
ax_footer.set_facecolor(BG_COLOR)
ax_footer.text(0.5, 0.5,
               "Sources: FootyMetrics, Match CSV data (24.10.2025), playerstats.football  |  Photos: Wikimedia Commons (CC)",
               ha="center", va="center", fontsize=9, color=SUBTLE_TEXT, fontfamily="monospace",
               transform=ax_footer.transAxes)

plt.savefig(os.path.join(BASE_DIR, "referee_comparison.png"),
            dpi=150, bbox_inches="tight", facecolor=BG_COLOR)
print("Chart saved to referee_comparison.png")
