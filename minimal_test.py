#!/usr/bin/env python3
import json
import re

def minimal_normalize(text):
    """Only fix 'inform ation' -> 'information'"""
    result = text
    pattern = r'\binform ation'
    result = re.sub(pattern, 'information', result, flags=re.IGNORECASE)
    return result

# Load question
with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for q in data:
    if q.get('id') == 149:
        explanation = q['explanation']

        print(f'Before: {explanation[490:540]}...')

        normalized = minimal_normalize(explanation)

        print(f'After:  {normalized[490:540]}...')
        has_info = 'information' in normalized
        has_inform_ation = 'inform ation' in normalized
        print(f'Fixed: {has_info}')
        print(f'Still broken: {has_inform_ation}')
        break
