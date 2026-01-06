import json

# Load questions
with open('questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

total = len(questions)
processed = sum(1 for q in questions if 'explanation_ai_en' in q and 'explanation_ai_ch' in q)
has_en = sum(1 for q in questions if 'explanation_ai_en' in q)
has_ch = sum(1 for q in questions if 'explanation_ai_ch' in q)

print(f"Total questions: {total}")
print(f"Fully processed (both EN and CH): {processed}/{total} ({processed*100/total:.1f}%)")
print(f"Has English explanation: {has_en}/{total}")
print(f"Has Chinese explanation: {has_ch}/{total}")
print(f"Remaining: {total - processed}")


