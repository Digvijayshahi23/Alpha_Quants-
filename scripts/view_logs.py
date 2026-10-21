#!/usr/bin/env python3
"""High-visibility colorizer and live-tail stream for Alpha Harness logs."""

import os
import re
import sys
import time

# Vibrant ANSI 256 Colors
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_DIM = "\033[2m"

C_TIME = "\033[38;5;245m"
C_INFO = "\033[1;38;5;48m"        # Neon Spring Green
C_WARN = "\033[1;38;5;214m"       # Amber Orange
C_ERR = "\033[1;38;5;196m"        # Bright Red
C_CRIT = "\033[1;38;5;231;48;5;196m"

C_EVT_ENG = "\033[1;38;5;51m"     # Neon Cyan
C_EVT_SIM = "\033[1;38;5;207m"    # Electric Magenta / Pink
C_EVT_OPT = "\033[1;38;5;118m"    # Chartreuse Lime
C_EVT_TSK = "\033[1;38;5;220m"    # Gold
C_EVT_VLT = "\033[1;38;5;147m"    # Lavender Blue
C_EVT_WS  = "\033[1;38;5;45m"     # Turquoise

C_KEY = "\033[38;5;75m"           # Slate Cyan
C_VAL_NUM = "\033[38;5;222m"      # Warm Butter Yellow
C_VAL_STR = "\033[38;5;158m"      # Pale Mint
C_VAL_ID = "\033[38;5;177m"       # Lilac
C_BADGE_ERR = "\033[1;38;5;231;48;5;160m"  # High-vis red badge
C_BADGE_OK  = "\033[1;38;5;231;48;5;28m"   # High-vis green badge


def colorize_line(line: str) -> str:
    # 1. Level badges
    line = line.replace("[info     ]", f"{C_INFO}[INFO]{C_RESET}   ")
    line = line.replace("[warning  ]", f"{C_WARN}[WARN]{C_RESET}   ")
    line = line.replace("[error    ]", f"{C_ERR}[ERROR]{C_RESET}  ")
    line = line.replace("[critical ]", f"{C_CRIT}[CRIT]{C_RESET}  ")

    # 2. Status badges
    line = re.sub(
        r"\b(status=)(5\d\d|ERROR)\b",
        rf"\1{C_BADGE_ERR} \2 {C_RESET}",
        line,
    )
    line = re.sub(
        r"\b(status=)(2\d\d|OK)\b",
        rf"\1{C_BADGE_OK} \2 {C_RESET}",
        line,
    )

    # 3. Domain Event names
    line = re.sub(r"\b(engine\.[a-z_]+)\b", rf"{C_EVT_ENG}\1{C_RESET}", line)
    line = re.sub(r"\b(sim\.[a-z_]+)\b", rf"{C_EVT_SIM}\1{C_RESET}", line)
    line = re.sub(r"\b(optimize\.[a-z_]+)\b", rf"{C_EVT_OPT}\1{C_RESET}", line)
    line = re.sub(r"\b(tasks\.[a-z_]+)\b", rf"{C_EVT_TSK}\1{C_RESET}", line)
    line = re.sub(r"\b(vault\.[a-z_]+)\b", rf"{C_EVT_VLT}\1{C_RESET}", line)
    line = re.sub(r"\b(WebSocket\s+/ws)\b", rf"{C_EVT_WS}\1{C_RESET}", line)

    # 4. Key-Value pairs: key=
    line = re.sub(r"(\b[a-z_]+)=", rf"{C_KEY}\1={C_RESET}", line)

    # 5. Numerical values
    line = re.sub(r"(=)(\d+)\b", rf"\1{C_VAL_NUM}\2{C_RESET}", line)

    # 6. Quoted string values
    line = re.sub(r"('[^']*')", rf"{C_VAL_STR}\1{C_RESET}", line)

    # 7. Platform IDs and Alpha IDs
    line = re.sub(r"\b(platform_id=)([a-zA-Z0-9_-]+)", rf"\1{C_VAL_ID}\2{C_RESET}", line)
    line = re.sub(r"\b(alpha_id=)([a-zA-Z0-9_-]+)", rf"\1{C_VAL_ID}\2{C_RESET}", line)

    # 8. Timestamps (HH:MM:SS)
    line = re.sub(r"^(\d{2}:\d{2}:\d{2})", rf"{C_TIME}\1{C_RESET}", line)

    return line


def follow_file(filepath: str, initial_lines: int = 40):
    header = (
        f"\n\033[1;38;5;147m╭──────────────────────────────────────────────────────────────╮\n"
        f"│ \033[1;38;5;231m✦ Alpha Harness Live Quantitative Telemetry Stream ✦\033[1;38;5;147m         │\n"
        f"│ \033[38;5;245mWatching: {os.path.basename(filepath):<43} \033[1;38;5;147m│\n"
        f"│ \033[38;5;245mPress Ctrl+C to detach at any time                          \033[1;38;5;147m│\n"
        f"╰──────────────────────────────────────────────────────────────╯\033[0m\n"
    )
    print(header)

    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            # Show last N lines
            lines = f.readlines()
            for line in lines[-initial_lines:]:
                sys.stdout.write(colorize_line(line))
            sys.stdout.flush()

            # Follow new lines
            while True:
                line = f.readline()
                if line:
                    sys.stdout.write(colorize_line(line))
                    sys.stdout.flush()
                else:
                    time.sleep(0.15)
    except KeyboardInterrupt:
        print(f"\n\033[38;5;245m[Detached from {os.path.basename(filepath)}]\033[0m\n")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else None
    if not target or not os.path.exists(target):
        # Look for default candidates
        repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        candidates = [
            "/Users/digvijayshahi/.gemini/antigravity-ide/brain/8a1beb96-3971-4fd2-83e8-6e8d8fbcfc31/.system_generated/tasks/task-173.log",
            os.path.join(repo_root, "backend", "backend.log"),
        ]
        target = next((c for c in candidates if os.path.exists(c)), None)

    if not target:
        print("\033[1;31mError: No active log file found.\033[0m")
        sys.exit(1)

    follow_file(target)
