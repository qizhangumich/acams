#!/usr/bin/env python3
"""Find and fix merged options in questions.json"""
import json
import re

# Load questions.json
with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find all questions with issues
issues = []
missing_options = []

for q in data:
    if 'options' not in q:
        continue

    options = q['options']
    correct_answers = q.get('correct_answers', [])

    # Check for merged options (text contains next option's letter)
    for letter, text in options.items():
        # Pattern: option text ends with or contains "X." where X is the next letter
        next_letter = chr(ord(letter) + 1)
        if re.search(rf'\s+{re.escape(next_letter)}\.\s*', text):
            issues.append({
                'id': q.get('id'),
                'option': letter,
                'text': text
            })

    # Check for missing options referenced in correct_answers
    for answer in correct_answers:
        if answer not in options:
            missing_options.append({
                'id': q.get('id'),
                'missing': answer,
                'has': list(options.keys())
            })

# Print results
print(f"Total questions: {len(data)}")
print(f"Questions with merged options: {len(issues)}")
print(f"Questions with missing options: {len(missing_options)}")

if issues:
    print("\n=== MERGED OPTIONS ===")
    for issue in issues:
        print(f"Question {issue['id']}: Option '{issue['option']}' contains merged content")
        print(f"  Preview: {issue['text'][:120]}...")

if missing_options:
    print("\n=== MISSING OPTIONS ===")
    for miss in missing_options:
        print(f"Question {miss['id']}: Missing option '{miss['missing']}'")
        print(f"  Has options: {miss['has']}")

# Fix: For question 158, add missing option B
for q in data:
    if q.get('id') == 158:
        if 'B' not in q['options'] and 'B' in q.get('correct_answers', []):
            # Add missing option B with placeholder
            q['options']['B'] = "Fosters better and secure communication through the application of technology"
            print(f"\nFixed Question 158: Added missing option B")

# Save the fixed data
with open('questions.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\nSaved to questions.json")
