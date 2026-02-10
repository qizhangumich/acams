#!/usr/bin/env python3
import json

# Load the question
with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find question 149
for q in data:
    if q.get('id') == 149:
        print(f"Question {q['id']}:")
        print(f"  Question text has 'inform ation': {'inform ation' in q.get('question', '')}")
        print(f"  Option F has 'inform ation': {'inform ation' in q['options']['F']}")
        print(f"  Explanation has 'inform ation': {'inform ation' in q.get('explanation', '')}")

        # Count all instances in the question
        question_str = json.dumps(q)
        count = question_str.count('inform ation')
        print(f"  Total 'inform ation' in question: {count}")

        # Show locations
        if 'inform ation' in q.get('question', ''):
            print(f"  Location: question text")
        if 'inform ation' in q['options']['F']:
            print(f"  Location: option F")
        if 'inform ation' in q.get('explanation', ''):
            print(f"  Location: explanation")
        break
