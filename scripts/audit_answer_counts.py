"""Audit: every question's (Select/Choose N) marker must match its answer count.

A question with no marker is treated as single-answer. Run after editing
questions.json:

  python scripts/audit_answer_counts.py
"""
import json
import re
import sys

WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
         "1": 1, "2": 2, "3": 3, "4": 4, "5": 5}
MARKER = re.compile(r"\((?:select|choose)\s+([a-z0-9]+)\.?\s*\)", re.I)
LOOSE = re.compile(r"\b(?:select|choose)\s+\d|\banswers\b|\{select", re.I)


def main():
    with open("questions.json", encoding="utf-8") as fh:
        data = json.load(fh)

    problems = []
    for q in data:
        text = q["question"]
        m = MARKER.search(text)
        if m:
            expected = WORDS.get(m.group(1).lower())
            if expected is None:
                problems.append((q["id"], f"unparseable marker {m.group(0)!r}"))
                continue
        else:
            if LOOSE.search(text):
                problems.append((q["id"], f"malformed marker near: ...{text[-60:]!r}"))
                continue
            expected = 1
        actual = len(q["correct_answers"])
        if expected != actual:
            problems.append((q["id"], f"marker says {expected}, answer key has {actual} {q['correct_answers']}"))
        if actual > len(q["options"]):
            problems.append((q["id"], "more correct answers than options"))
        if any(a not in q["options"] for a in q["correct_answers"]):
            problems.append((q["id"], f"answer letter not among options {sorted(q['options'])}"))

    if problems:
        print(f"{len(problems)} problem(s):")
        for qid, msg in problems:
            print(f"  id {qid}: {msg}")
        sys.exit(1)
    print(f"OK: all {len(data)} questions have matching markers and answer keys.")


if __name__ == "__main__":
    main()
