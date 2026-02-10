#!/usr/bin/env python3
import json

# Load the question
with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find question 149
for q in data:
    if q.get('id') == 149:
        print(f"Before: {repr(q['options']['F'][:80])}")
        # Fix manually
        q['options']['F'] = q['options']['F'].replace('inform ation', 'information')
        print(f"After:  {repr(q['options']['F'][:80])}")
        break

# Save to test file
with open('test_output.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Verify
with open('test_output.json', 'r', encoding='utf-8') as f:
    content = f.read()

print(f"\nFile contains 'information': {'information' in content}")
print(f"File contains 'inform ation': {'inform ation' in content}")
