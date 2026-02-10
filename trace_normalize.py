#!/usr/bin/env python3
import json
import re
import sys

def fix_word_boundaries_traced(text: str) -> str:
    """Fix word boundaries with detailed tracing"""
    if not text:
        return text

    result = text
    print(f"  Input: {result[:80]}...")

    # Reverse fixes
    reverse_fixes = [
        (r'\binform ation', 'information'),
    ]

    for i, (pattern, replacement) in enumerate(reverse_fixes):
        old = result
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        if old != result:
            print(f"  After reverse_fixes[{i}]: {result[:80]}...")

    # Pattern 1: lowercase + uppercase
    old = result
    result = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', result)
    if old != result:
        print(f"  After pattern1: {result[:80]}...")

    # Pattern 2: number + letter
    old = result
    result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)
    if old != result:
        print(f"  After pattern2: {result[:80]}...")

    print(f"  Output: {result[:80]}...")
    return result

# Load question
with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for q in data:
    if q.get('id') == 149:
        print(f"Question {q['id']}:")
        print(f"Option F:")
        result_f = fix_word_boundaries_traced(q['options']['F'])
        print(f"  Fixed: {'information' in result_f}")

        print(f"\nExplanation (first 100 chars):")
        result_exp = fix_word_boundaries_traced(q['explanation'][:100])
        print(f"  Fixed: {'information' in result_exp}")
        break
