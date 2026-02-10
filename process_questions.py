#!/usr/bin/env python3
"""
Comprehensive question normalization script
Processes questions.json and produces questions_normalized.json
"""
import json
import re
from typing import Dict, List, Tuple, Set

# ============================================================
# PART 1 — OCR WORD MERGING FIXES
# ============================================================

def fix_word_boundaries(text: str) -> str:
    """Fix common word boundary issues from OCR"""
    if not text:
        return text

    result = text

    # Reverse fixes (spaces inside legitimate words) - apply FIRST
    reverse_fixes = [
        (r'\bbe ing', 'being'),
        (r'\binform ation', 'information'),
        (r'\bform ation', 'formation'),
        (r'\bsec urity', 'security'),
        (r'\bcompli ance', 'compliance'),
        (r'\bopera tions', 'operations'),
        (r'\bfin ance', 'finance'),
        (r'\btech nology', 'technology'),
        (r'\bprod uct', 'product'),
        (r'\bengi neering', 'engineering'),
        (r'\bdevel opment', 'development'),
        (r'\bacc ounting', 'accounting'),
        (r'\bhu man', 'human'),
        (r'\bresour ces', 'resources'),
        (r'\bchallen ge', 'challenge'),
        (r'\bconcer ned', 'concerned'),
        (r'\bimpor tance', 'importance'),
        (r'\bessen tial', 'essential'),
        (r'\bnece ssary', 'necessary'),
        (r'\bimpor tant', 'important'),
        (r'\bsig nificant', 'significant'),
        (r'\baddi tional', 'additional'),
        (r'\badmini stration', 'administration'),
        (r'\bappro ach', 'approach'),
        (r'\bappro priate', 'appropriate'),
        (r'\bassoc iation', 'association'),
        (r'\bautho rity', 'authority'),
        (r'\bavail able', 'available'),
        (r'\bcharac teristic', 'characteristic'),
        (r'\bcompen sation', 'compensation'),
        (r'\bconse quence', 'consequence'),
        (r'\bconsi der', 'consider'),
        (r'\bconti nue', 'continue'),
        (r'\bcorpo rate', 'corporate'),
        (r'\bcurr ency', 'currency'),
        (r'\bdecla ration', 'declaration'),
        (r'\bdefi nition', 'definition'),
        (r'\bdepart ment', 'department'),
        (r'\bdesc ription', 'description'),
        (r'\bdevia tion', 'deviation'),
        (r'\bdocu mentation', 'documentation'),
        (r'\benviron ment', 'environment'),
        (r'\bequ ipment', 'equipment'),
        (r'\bestab lishment', 'establishment'),
        (r'\bevalua tion', 'evaluation'),
        (r'\bexami nation', 'examination'),
        (r'\bexpe rience', 'experience'),
        (r'\bexpla nation', 'explanation'),
        (r'\bidenti fication', 'identification'),
        (r'\bimpor tation', 'importation'),
        (r'\bimpro vement', 'improvement'),
        (r'\bindi vidual', 'individual'),
        (r'\binfo rmation', 'information'),
        (r'\binsti tution', 'institution'),
        (r'\binte grity', 'integrity'),
        (r'\bintera ction', 'interaction'),
        (r'\binvest ment', 'investment'),
        (r'\binvo lvement', 'involvement'),
        (r'\bknow ledge', 'knowledge'),
        (r'\bmain tenance', 'maintenance'),
        (r'\bmanage ment', 'management'),
        (r'\bmecha nism', 'mechanism'),
        (r'\bmoni toring', 'monitoring'),
        (r'\bneces sary', 'necessary'),
        (r'\bnotifi cation', 'notification'),
        (r'\bopera tion', 'operation'),
        (r'\bpartici pation', 'participation'),
        (r'\bperfor mance', 'performance'),
        (r'\bposi tion', 'position'),
        (r'\bpossi bility', 'possibility'),
        (r'\bproce dure', 'procedure'),
        (r'\bprovi sion', 'provision'),
        (r'\breco gnition', 'recognition'),
        (r'\bregi stration', 'registration'),
        (r'\bregu latory', 'regulatory'),
        (r'\brela tionship', 'relationship'),
        (r'\brequi rement', 'requirement'),
        (r'\bres ponse', 'response'),
        (r'\bres ponsible', 'responsible'),
        (r'\bsimi lar', 'similar'),
        (r'\bsitu ation', 'situation'),
        (r'\bspecia lized', 'specialized'),
        (r'\bstruc ture', 'structure'),
        (r'\bsugge stion', 'suggestion'),
        (r'\btransa ction', 'transaction'),
        (r'\bunder stand', 'understand'),
        (r'\bunder standing', 'understanding'),
        (r'\bvaria tion', 'variation'),
        (r'\bwithdra wal', 'withdrawal'),
    ]

    for pattern, replacement in reverse_fixes:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

    # Fix lowercase letter followed by uppercase letter (most common OCR error)
    result = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', result)

    # Fix number followed by letter
    result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)

    # Fix function word concatenations
    function_word_fixes = [
        (r'\b(the|a|an)(manager|director|officer|customer|bank|institution|company|firm|entity|person|individual|group|team|department|division|unit|section|branch|office|agency|organization|authority|body|council|board|committee|commission|panel|risk|security|compliance|operations|finance|legal|marketing|sales|technology|product|engineering|research|development|audit|accounting|human|resources)\b', r'\1 \2'),
        (r'\b(adopt)(when|where|what|which|how|the|a|an)\b', r'\1 \2'),
        (r'\b(primarily|mostly)(to|for|by|in|with|on|and|or)\b', r'\1 \2'),
        (r'\b(other)(correspondent|bank|banks)\b', r'\1 \2'),
        (r'\b(accountable|responsible|liable)(for)\b', r'\1 \2'),
        (r"\b(head)('s)?\s*(of)(information|security|compliance|operations)\b", r'\1\2 \3 \4'),
        (r"(of)(information|security|compliance|operations|risk|finance|legal|marketing|sales|technology|product|engineering|research|development|audit|accounting|human|resources)", r'\1 \2'),
        (r'\b(investigation)(and|for|or|filing)\b', r'\1 \2'),
        (r'(implementing)(organizational|organization|controls)\b', r'\1 \2'),
        (r'\)(and|or|for)', r') \1'),
        (r'\b(filing)(and|for|or|with)\b', r'\1 \2'),
        (r'\b(correspondent)(bank|banks)\b', r'\1 \2'),
        (r'\b(sanctioned)(individual|person|entity)\b', r'\1 \2'),
        (r'\b(the|a)(purpose|nature|risk|use|basis)\b', r'\1 \2'),
        (r'\b(team)(discovers|reports|finds|identifies|detects|observes|notices|recognizes)\b', r'\1 \2'),
        (r'\b(quarter)(as|when|where|while|after|before|during|since|until|till)\b', r'\1 \2'),
    ]

    for pattern, replacement in function_word_fixes:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

    return result


# ============================================================
# PART 2 — NORMALIZE ANSWER OPTIONS
# ============================================================

def split_option_by_letter(text: str, letter: str) -> Tuple[str, str | None]:
    """
    Split an option when it contains the next option's letter label
    Returns (current_option_text, next_option_text) or (original_text, None)
    """
    # Look for patterns like ". F.", " F.", "F)" etc.
    patterns = [
        rf'(\.|\s)\s*{letter}\.\s*',  # ". F." or " F."
        rf'\s{letter}\)\s*',           # " F)"
    ]

    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            split_pos = match.start()
            # Only split if there's meaningful text before AND after
            if split_pos > 10:  # At least 10 chars before the split
                current_option = text[:split_pos].strip()
                next_option = text[match.end():].strip()
                # Clean up next_option - remove any remaining letter prefix
                next_option = re.sub(rf'^{letter}[\.\)]\s*', '', next_option).strip()
                if next_option and len(next_option) > 5:  # Ensure meaningful content
                    return current_option, next_option

    return text, None


def normalize_options(options: Dict[str, str]) -> Dict[str, str]:
    """
    Normalize answer options, splitting merged options
    Preserves all existing options, only splits when embedded labels are found
    """
    if not options:
        return options

    result = {}

    # Process each existing option
    for letter in sorted(options.keys()):
        text = options[letter].strip()

        # Check if this option contains embedded next option labels
        # Look for patterns like ". F.", " F.", "F)" etc.
        next_letter = chr(ord(letter) + 1) if letter < 'H' else None

        if next_letter:
            new_text, next_option = split_option_by_letter(text, next_letter)
            if next_option:
                # Split found - add current option and the newly split one
                result[letter] = new_text
                result[next_letter] = next_option
                continue

        # No split found or no next letter - use original
        result[letter] = text

    # Remove any empty or period-only options (but NOT just because they're non-sequential)
    keys_to_remove = []
    for key, value in result.items():
        stripped = value.strip()
        if not stripped or stripped in ['.', '..', '...', '']:
            keys_to_remove.append(key)

    for key in keys_to_remove:
        del result[key]

    # Clean up leading/trailing periods in option text
    for key in result:
        result[key] = result[key].strip()
        if result[key].startswith('. '):
            result[key] = result[key][2:].strip()
        # Only remove trailing period if it's clearly a label remnant
        if result[key].endswith('.') and len(result[key]) < 30:
            result[key] = result[key][:-1].strip()

    return result


# ============================================================
# PART 3 — ANSWER CONSISTENCY CHECK
# ============================================================

def validate_answers(question: Dict) -> Dict:
    """
    Validate that correct_answers references exist in options
    """
    if 'correct_answers' not in question or 'options' not in question:
        return question

    options = question['options']
    correct_answers = question['correct_answers']

    if isinstance(correct_answers, str):
        correct_answers = [correct_answers]

    valid_answers = []
    for answer in correct_answers:
        if answer in options:
            valid_answers.append(answer)

    if valid_answers != correct_answers:
        print(f"Warning: Question {question.get('id')} - corrected answers from {correct_answers} to {valid_answers}")

    question['correct_answers'] = valid_answers if len(valid_answers) > 1 else (valid_answers[0] if valid_answers else [])

    return question


# ============================================================
# MAIN PROCESSING
# ============================================================

def normalize_question(question: Dict) -> Dict:
    """Normalize a single question"""
    result = question.copy()

    # Apply text normalization to all text fields
    if 'question' in result:
        result['question'] = fix_word_boundaries(result['question'])

    if 'options' in result:
        # First normalize option text
        normalized_options = {}
        for key, value in result['options'].items():
            normalized_options[key] = fix_word_boundaries(value)

        # Then split merged options
        result['options'] = normalize_options(normalized_options)

    if 'explanation' in result:
        result['explanation'] = fix_word_boundaries(result['explanation'])

    # Validate answers
    result = validate_answers(result)

    return result


def main():
    input_file = 'questions.json'
    output_file = 'questions_normalized.json'

    print(f"Loading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Processing {len(data)} questions...")
    normalized_data = []

    stats = {
        'fixed_word_boundaries': 0,
        'split_options': 0,
        'fixed_answers': 0,
    }

    for question in data:
        original = json.dumps(question)
        normalized = normalize_question(question)
        normalized_data.append(normalized)

        if original != json.dumps(normalized):
            if 'options' in normalized:
                orig_options = set(question.get('options', {}).keys())
                new_options = set(normalized['options'].keys())
                if len(new_options) > len(orig_options):
                    stats['split_options'] += 1

    # Save normalized data
    print(f"Saving to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(normalized_data, f, ensure_ascii=False, indent=2)

    print(f"\n=== Processing Complete ===")
    print(f"Total questions processed: {len(normalized_data)}")
    print(f"Questions with split options: {stats['split_options']}")
    print(f"\nOutput saved to: {output_file}")


if __name__ == '__main__':
    main()
