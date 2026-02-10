#!/usr/bin/env python3
"""
Fix merged options in questions.json
Where option E contains both E and F content separated by "F."
"""
import json
import re

def split_option_by_letter(text: str, letter: str) -> tuple:
    """
    Split an option when it contains the next option's letter label
    Returns (current_option_text, next_option_text) or (original_text, None) if no split needed
    """
    # Look for "X." pattern where X is the letter (F, G, etc.)
    # Pattern: either ". X." or just "X." (no period before)
    pattern = rf'(\.|\s)\s*{letter}\.'
    match = re.search(pattern, text)

    if match:
        split_pos = match.start() + 1  # Include the character before the letter
        current_option = text[:split_pos].strip()
        next_option = text[split_pos + 1:].strip()  # Skip the period/space, get everything after

        # Clean up next_option - remove the letter prefix if still there
        next_option = re.sub(rf'^{letter}\.\s*', '', next_option).strip()

        return current_option, next_option

    return text, None

def split_all_merged_options(options: dict) -> dict:
    """
    Recursively split all merged options in the options dictionary
    """
    result = {}
    letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

    for letter in letters:
        if letter not in options:
            break

        text = options[letter]
        next_letter = chr(ord(letter) + 1)

        # Keep splitting while there are more merged options
        while True:
            new_text, next_option = split_option_by_letter(text, next_letter)
            if next_option:
                result[letter] = new_text
                result[next_letter] = next_option
                text = next_option
                next_letter = chr(ord(next_letter) + 1)
            else:
                if letter not in result:  # Only set if not already set by a previous split
                    result[letter] = text
                break

    return result

def main():
    # Load questions
    with open('questions.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    fixed_count = 0

    for q in data:
        if 'options' not in q:
            continue

        changed = False
        options = q['options']

        # Check each existing option for embedded next option labels
        for letter in ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']:
            if letter not in options:
                continue

            text = options[letter]
            next_letter = chr(ord(letter) + 1)

            # Check if this option contains the next option's label
            # Look for pattern like ". B." or just " B." in the middle of text
            pattern = rf'(\.|\s)\s*{next_letter}\.'
            if re.search(pattern, text):
                # Check if it's at the end (just a label with no content) or in the middle
                match = re.search(pattern, text)
                if match and match.end() >= len(text) - 2:  # Label at or near end with minimal content
                    # Remove the trailing label from this option
                    options[letter] = text[:match.start()].strip()
                    changed = True
                    print(f"Fixed Question {q.get('id')}: Removed trailing '{next_letter}.' from option {letter}")
                elif len(text) > 20:  # Ensure it's not just starting with it
                    # Split this option
                    new_text, next_option = split_option_by_letter(text, next_letter)
                    if next_option:
                        options[letter] = new_text
                        options[next_letter] = next_option
                        changed = True
                        print(f"Fixed Question {q.get('id')}: Split {letter} -> {next_letter}")

        # Also check for sequential merges in the entire option set
        original_count = len(options)
        new_options = split_all_merged_options(options)

        if set(new_options.keys()) != set(options.keys()) or len(new_options) > len(options):
            q['options'] = new_options
            changed = True

        if changed:
            fixed_count += 1
            print(f"  Final options for Question {q.get('id')}:")
            for key in sorted(q['options'].keys()):
                print(f"    {key}: {q['options'][key][:60]}...")

    # Save fixed data
    with open('questions.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\nFixed {fixed_count} questions.")

if __name__ == '__main__':
    main()
