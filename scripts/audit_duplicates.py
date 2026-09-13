"""Audit: duplicate questions must not disagree on the correct answer.

Questions are grouped by their (normalized) option texts; within a group,
the CONTENT of the keyed correct answers must match across copies —
letters may differ when options are ordered differently. Groups whose
question texts are actually different (generic option sets like
"1, 2, and 3 only") are skipped.

  python scripts/audit_duplicates.py
"""
import json
import re
import sys
import collections


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def main():
    with open("questions.json", encoding="utf-8") as fh:
        data = json.load(fh)

    groups = collections.defaultdict(list)
    for q in data:
        sig = "|".join(sorted(norm(v)[:60] for v in q["options"].values()))
        groups[sig].append(q)

    conflicts = 0
    for qs in groups.values():
        if len(qs) < 2:
            continue
        # generic option sets (e.g. "1, 2, and 3 only") pair unrelated questions;
        # require the question texts themselves to be similar
        texts = {norm(q["question"])[:80] for q in qs}
        if len(texts) == len(qs) and len({t[:40] for t in texts}) == len(qs):
            continue
        keysets = {
            frozenset(norm(q["options"][a])[:60] for a in q["correct_answers"] if a in q["options"])
            for q in qs
        }
        if len(keysets) > 1:
            conflicts += 1
            print("CONFLICT:", [q["id"] for q in qs], "|", qs[0]["question"][:80])
            for q in qs:
                keyed = [q["options"][a][:60] for a in q["correct_answers"] if a in q["options"]]
                print(f"   id {q['id']} {q['correct_answers']} -> {keyed}")

    if conflicts:
        print(f"\n{conflicts} conflicting duplicate group(s).")
        sys.exit(1)
    print("OK: no duplicate questions with conflicting answers.")


if __name__ == "__main__":
    main()
