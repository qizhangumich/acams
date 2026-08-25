"""Clean OCR artifacts in questions.json.

Fixes, in order:
  1. Junk fields left over from OCR processing (`normalized`, `raw_block`).
  2. Missing space around parentheses: "deadlines(e.g." -> "deadlines (e.g.".
  3. Stray possessive space: "member' s" -> "member's".
  4. Merged words: "sanctionsmay" -> "sanctions may".

Merged-word detection uses the AI-generated explanation fields
(explanation_ai_en) as a clean-vocabulary reference: a token is only split
if its lowercase form never occurs in the AI corpus, and it divides into
exactly one plausible pair of frequent vocabulary words. This keeps real
words like "counterpart" or "ascertain" intact.

Usage:
  python scripts/clean_questions.py           # dry run: report planned fixes
  python scripts/clean_questions.py --apply   # write questions.json in place
"""
import json
import re
import sys
import collections

APPLY = "--apply" in sys.argv
PATH = "questions.json"

OCR_FIELDS = ["question", "explanation", "normalized_question"]  # OCR-derived text
JUNK_FIELDS = ["normalized", "raw_block"]

# Function words the AI corpus might use rarely but that are safe split halves.
COMMON = set("""a an and are as at be but by can do does for from has have if in is it its may
must no nor not of off on only or should so than that the their them then these they this to
was were will with would""".split())

# Never split these even if the heuristic fires (real English words the
# AI-corpus vocabulary happens to miss).
NEVER_SPLIT = set("""artwork inactivity onboard onboarding overreach depositor processor
countrywide undercover understate understates unexpected anyone ascertain counterpart
counterparts overdue nonfinancial unidentified counterterrorism acton checklist workplace
thereto thereof borderless casework dataset counterintelligence infrequent infrequently
nonproliferation offline overprice overprices underprice underprices undertake undertakes
recordkeeping dowell""".split())

# Targeted OCR fixes that the generic splitter would get wrong.
TARGETED = [
    ("Acton Task Force", "Action Task Force"),
    ("John Mc Dowell", "John McDowell"),
]

# Canonical domain names (whitespace is normalized first, then aliases applied).
DOMAIN_ALIASES = {
    "Compliance Standards for AML and CFT":
        "Compliance Standards for Anti-Money Laundering (AML) and Combating the Financing of Terrorism (CFT)",
}


def text_fields(q):
    for f in OCR_FIELDS:
        if isinstance(q.get(f), str):
            yield f, None
    for k in (q.get("options") or {}):
        if isinstance(q["options"][k], str):
            yield "options", k


def get(q, f, k):
    return q[f] if k is None else q[f][k]


def put(q, f, k, v):
    if k is None:
        q[f] = v
    else:
        q[f][k] = v


def main():
    with open(PATH, encoding="utf-8") as fh:
        data = json.load(fh)

    # --- Build clean vocabulary from AI-generated English text ---
    ai_freq = collections.Counter()
    for q in data:
        t = q.get("explanation_ai_en")
        if isinstance(t, str):
            ai_freq.update(w.lower() for w in re.findall(r"[A-Za-z]+", t))
    vocab = {w for w, c in ai_freq.items()} | COMMON

    def is_frequent(w):
        return w in COMMON or ai_freq[w] >= 20

    split_cache = {}

    def try_split(token):
        lw = token.lower()
        if lw in split_cache:
            return split_cache[lw]
        result = None
        # ai_freq <= 1 tolerates AI explanations that quoted the OCR typo verbatim
        if len(lw) >= 5 and ai_freq[lw] <= 1 and lw not in COMMON and lw not in NEVER_SPLIT:
            candidates = []
            for i in range(2, len(lw) - 1):
                a, b = lw[:i], lw[i:]
                if b == "or":  # "depositor" -> "deposit or" class of false positive
                    continue
                # short halves must be genuine function words ("Nor th", "un freeze")
                if (len(a) < 3 and a not in COMMON) or (len(b) < 3 and b not in COMMON):
                    continue
                if a in vocab and b in vocab and is_frequent(a) and is_frequent(b):
                    candidates.append((min(ai_freq[a] + (10**6 if a in COMMON else 0),
                                           ai_freq[b] + (10**6 if b in COMMON else 0)), a, b))
            if candidates:
                candidates.sort(reverse=True)
                _, a, b = candidates[0]
                result = (a, b)
        split_cache[lw] = result
        return result

    stats = collections.Counter()
    split_log = []

    def clean(text, qid, field):
        for old, new in TARGETED:
            if old in text:
                stats["targeted"] += text.count(old)
                text = text.replace(old, new)
        # spacing around parentheses
        text, n = re.subn(r"([A-Za-z,.;:])\(", r"\1 (", text)
        stats["paren_before"] += n
        text, n = re.subn(r"\)([A-Za-z])", r") \1", text)
        stats["paren_after"] += n
        # stray possessive space
        text, n = re.subn(r"([A-Za-z])' s\b", r"\1's", text)
        stats["possessive"] += n

        # merged words (skip ALL-CAPS acronyms and mixed-case tokens)
        def repl(m):
            token = m.group(0)
            if token.isupper() or (any(c.isupper() for c in token[1:])):
                return token
            sp = try_split(token)
            if not sp:
                return token
            a, b = sp
            fixed = (token[0] + a[1:] if token[0].isupper() else a) + " " + b
            stats["merged"] += 1
            split_log.append((qid, field, token, fixed))
            return fixed

        text = re.sub(r"\b[A-Za-z]{5,}\b", repl, text)
        # collapse doubled spaces introduced by fixes
        text = re.sub(r"  +", " ", text)
        return text

    for q in data:
        for f in JUNK_FIELDS:
            if f in q:
                del q[f]
                stats["junk_field"] += 1
        if isinstance(q.get("domain"), str):
            domain = re.sub(r"\s+", " ", q["domain"]).strip()
            domain = DOMAIN_ALIASES.get(domain, domain)
            if domain != q["domain"]:
                q["domain"] = domain
                stats["domain_normalized"] += 1
        for f, k in text_fields(q):
            put(q, f, k, clean(get(q, f, k), q["id"], f if k is None else f + ":" + k))

    print("Planned fixes:" if not APPLY else "Applied fixes:")
    for k, v in stats.most_common():
        print(f"  {k}: {v}")
    print("\nMerged-word splits:")
    for qid, field, before, after in split_log:
        print(f"  q{qid} [{field}] {before} -> {after}")

    if APPLY:
        with open(PATH, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
        print(f"\nWrote {PATH}")
    else:
        print("\nDry run only. Re-run with --apply to write.")


if __name__ == "__main__":
    main()
