#!/usr/bin/env python3
"""
Fix word boundary issues in questions.json
Finds and fixes concatenated words like "regulationoverridethe", "imposeadditional"
"""
import json
import re
from pathlib import Path

def fix_word_boundaries(text):
    """Fix word boundaries by adding spaces between lowercase+uppercase, number+letter patterns"""
    if not text:
        return text

    # Pattern 1: lowercase letter followed by uppercase letter (most common)
    result = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', text)

    # Pattern 2: number followed by letter
    result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)

    # Pattern 3: Fix specific OCR errors
    fixes = {
        'seperate': 'separate',  # Common typo
    }
    for wrong, correct in fixes.items():
        result = re.sub(wrong, correct, result, flags=re.IGNORECASE)

    return result

def scan_for_concatenations(data):
    """Scan all questions for word concatenation issues"""
    issues = []

    for q in data:
        question_id = q.get('id')
        domain = q.get('domain', '')[:50]

        # Check all text fields
        fields_to_check = {
            'question': q.get('question', ''),
            'explanation': q.get('explanation', ''),
            'explanation_ai_en': q.get('explanation_ai_en', ''),
            'explanation_ai_ch': q.get('explanation_ai_ch', ''),
            'domain': q.get('domain', ''),
        }

        # Check options
        for opt_letter, opt_text in q.get('options', {}).items():
            fields_to_check[f'option_{opt_letter}'] = opt_text

        # Scan each field
        for field_name, text in fields_to_check.items():
            if not text:
                continue

            # Look for patterns that indicate concatenation
            # lowercase followed by uppercase without space
            matches = re.finditer(r'[a-z]{2,}[A-Z][a-z]', text)

            for match in matches:
                context = text[max(0, match.start()-20):match.end()+20]
                issues.append({
                    'id': question_id,
                    'field': field_name,
                    'match': match.group(),
                    'context': context
                })

    return issues

def fix_all_concatenations(data):
    """Fix all word concatenation issues in the dataset"""
    fixed_count = 0

    for q in data:
        changed = False

        # Fix all text fields
        if 'question' in q:
            original = q['question']
            q['question'] = fix_word_boundaries(q['question'])
            if q['question'] != original:
                changed = True

        if 'domain' in q:
            original = q['domain']
            q['domain'] = fix_word_boundaries(q['domain'])
            if q['domain'] != original:
                changed = True

        if 'explanation' in q:
            original = q['explanation']
            q['explanation'] = fix_word_boundaries(q['explanation'])
            if q['explanation'] != original:
                changed = True

        if 'explanation_ai_en' in q:
            original = q['explanation_ai_en']
            q['explanation_ai_en'] = fix_word_boundaries(q['explanation_ai_en'])
            if q['explanation_ai_en'] != original:
                changed = True

        if 'explanation_ai_ch' in q:
            original = q['explanation_ai_ch']
            q['explanation_ai_ch'] = fix_word_boundaries(q['explanation_ai_ch'])
            if q['explanation_ai_ch'] != original:
                changed = True

        # Fix options
        if 'options' in q:
            for opt_letter in q['options']:
                original = q['options'][opt_letter]
                q['options'][opt_letter] = fix_word_boundaries(q['options'][opt_letter])
                if q['options'][opt_letter] != original:
                    changed = True

        if changed:
            fixed_count += 1

    return data, fixed_count

def main():
    # Load questions.json
    json_path = Path('questions.json')
    print(f"Loading questions from: {json_path}")

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Total questions: {len(data)}")

    # Scan for issues first
    print("\nScanning for word concatenation issues...")
    issues = scan_for_concatenations(data)

    print(f"Found {len(issues)} potential concatenation issues")

    if issues:
        print(f"\nFirst 20 issues:")
        for issue in issues[:20]:
            print(f"  Question {issue['id']} - {issue['field']}: '{issue['match']}'")
            print(f"    Context: ...{issue['context']}...")

    # Fix all issues
    print(f"\nFixing all word concatenation issues...")
    data, fixed_count = fix_all_concatenations(data)

    print(f"Fixed {fixed_count} questions")

    # Save the fixed data
    print(f"\nSaving to {json_path}...")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Saved!")

if __name__ == '__main__':
    main()
