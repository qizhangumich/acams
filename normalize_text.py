#!/usr/bin/env python3
"""
Text normalization script for ACAMS questions.json
Fixes word concatenation errors from OCR/copy-paste while preserving legitimate compound words.
"""

import json
import re
import sys
from typing import Dict, List, Set

# Legitimate domain terms that should NOT be split
DOMAIN_TERMS = {
    'moneylaundering', 'laundering', 'anti-money', 'counter-terrorist',
    'whistleblowing', 'correspondentbanking', 'trade-based',
    'cybersecurity', 'know-your', 'politicallyexposed', 'sanctioned',
    'non-financial', 'cross-border', 'knowyour', 'antimoney',
    'counterterrorist', 'counterfinancing', 'non-bank'
}

# Common legitimate compound words in financial compliance
LEGITIMATE_COMPOUNDS = {
    'whistleblowing', 'moneylaundering', 'correspondentbanking',
    'cybersecurity', 'counterterrorism', 'counter-financing',
    'know-your', 'knowyour', 'due-diligence', 'duediligence'
}


def load_json(file_path: str) -> Dict:
    """Load JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(data: Dict, file_path: str) -> None:
    """Save JSON file with proper formatting"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def is_valid_english_word(word: str) -> bool:
    """Check if a word is valid English (basic check)"""
    # Basic checks for common English word patterns
    if len(word) < 2:
        return False
    if word.isdigit():
        return False
    return True


def should_skip_splitting(text: str) -> bool:
    """Check if text contains domain terms that shouldn't be split"""
    text_lower = text.lower()
    for term in DOMAIN_TERNS:
        if term in text_lower:
            return True
    return False


def split_concatenated_words(text: str) -> str:
    """
    Split concatenated words while preserving legitimate compounds.
    Uses pattern matching to identify where spaces should be inserted.
    """
    if not text:
        return text

    # Skip if contains domain terms
    if should_skip_splitting(text):
        return text

    # Common patterns to fix
    replacements = [
        # Article/noun + word patterns
        (r'\b(adopt|implement|conduct|perform|detect|assess|review|update|inform|notify|establish)(when|where|what|which|how|the|a|an|and|or|to|for|with|by|in|of|on|at|from)\b', r'\1 \2'),
        (r'\b(the|a|an|this|that|these|those)(purpose|nature|extent|scope|basis|use|case|fact|matter|issue|question|problem|concern|risk|threat|challenge|approach|method|technique|process|procedure|practice|action|activity|function|role|responsibility|obligation|requirement|standard|principle|rule|regulation|law|act|bill|statute|legislation|directive|guideline|recommendation|decision|judgment|ruling|order|decree|mandate)\b', r'\1 \2'),

        # Word + and/but/or + word
        (r'\b(\w{3,})(and|but|or)(the|a|an|to|for|with|by|in|of|on|at|from|its|their|our|your)\b', r'\1 \2 \3'),
        (r'\b(the|a|an|to|for|with|by|in|of|on|at|from)(and|but|or)(\w{3,})\b', r'\1 \2 \3'),

        # Lowercase + Uppercase patterns (most common OCR error)
        (r'([a-z])([A-Z])', r'\1 \2'),

        # Specific common concatenations
        (r'\binvestigation(and|or|for|to|by|in|of)\b', r'investigation \1'),
        (r'\bfiling(and|or|for|to|by|in|of|with)\b', r'filing \1'),
        (r'\bimplementation(and|or|for|to|by|in|of)\b', r'implementation \1'),
        (r'\borganization(and|or|for|to|by|in|of|al)\b', r'organization \1'),
        (r'\boperational(and|or|for|to|by|in|of)\b', r'operational \1'),
        (r'\bcorrespondent(and|or|for|to|by|in|of)\b', r'correspondent \1'),
        (r'\bsanctioned(and|or|for|to|by|in|of|individual|person|entity)\b', r'sanctioned \1'),
        (r'\bprimarily(to|for|by|in|with|on)\b', r'primarily \1'),
        (r'\bmostly(to|for|by|in|with|on)\b', r'mostly \1'),
    ]

    result = text

    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result)

    return result


def fix_word_boundaries(text: str) -> str:
    """Fix common word boundary issues"""
    if not text:
        return text

    # Fix lowercase letter followed by uppercase letter (most common OCR error)
    # This catches things like "adoptWhen" → "adopt When"
    result = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', text)

    # Fix number followed by letter (e.g., "1The" → "1 The")
    result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)

    # Fix specific word concatenations (case-sensitive, word boundaries)
    # Only fix actual concatenations, not parts of larger words
    replacements = [
        # Function words (the/a/an) + common nouns (lowercase-lowercase)
        # Only add space after the function word when followed by common words
        (r'\b(the|a|an)(manager|director|officer|customer|bank|institution|company|firm|entity|person|individual|group|team|department|division|unit|section|branch|office|agency|organization|authority|body|council|board|committee|commission|panel|high|risk|low|medium|large|small|big|little|short|long|tall|wide|narrow|deep|shallow|thick|thin|heavy|light|strong|weak|hard|soft|hot|cold|warm|cool|dry|wet|full|empty|new|old|young|rich|poor|good|bad|right|wrong|true|false|real|fake|sure|certain|clear|unclear|open|closed|free|busy|safe|dangerous|important|significant|major|minor|main|key|primary|secondary|final|initial|first|last|next|previous|early|late|recent|current|past|future|present|absent|available|possible|impossible|likely|unlikely|necessary|essential|basic|simple|complex|easy|difficult|quick|slow|fast|steady|stable|variable|constant|regular|irregular|normal|abnormal|natural|artificial|public|private|general|specific|particular|special|common|typical|standard|average|ordinary|usual|unusual|rare|unique|different|similar|same|equal|equal|total|complete|whole|entire|full|partial|individual|personal|social|political|economic|financial|commercial|legal|official|formal|informal|direct|indirect|active|passive|positive|negative|successful|unsuccessful|effective|ineffective|efficient|inefficient|productive|unproductive|constructive|destructive|creative|original|traditional|conventional|modern|ancient|recent|current|present|future|past|historical|technical|practical|theoretical|academic|scientific|medical|clinical|professional|industrial|agricultural|environmental|global|international|national|regional|local|urban|rural|suburban|metropolitan|central|federal|state|local|military|civil|criminal|civil|judicial|legislative|executive|administrative|managerial|supervisory|operative|operative|operative)\b', r'\1 \2'),

        # adopt + when/where/etc
        (r'\b(adopt)(when|where|what|which|how)\b', r'\1 \2'),
        (r'\b(adopt)(the|a|an)\b', r'\1 \2'),

        # primarily + to
        (r'\b(primarily)(to)\b', r'\1 \2'),

        # mostly + commercial
        (r'\b(mostly)(commercial)\b', r'\1 \2'),

        # other + correspondent/bank
        (r'\b(other)(correspondent)\b', r'\1 \2'),
        (r'\b(other)(bank|banks)\b', r'\1 \2'),

        # head + of + information/security/etc
        (r"\b(head)('s\s+)?(of)(information|security|compliance|operations)\b", r'\1\2\3 \4'),
        # head + ofinformation/ofsecurity/etc (without space)
        (r"\b(head)('s\s+)?(of)(information|security|compliance|operations)\b", r'\1\2\3 \4'),
        # Fix "ofinformation" -> "of information" (no word boundary for concatenated case)
        (r"(of)(information|security|compliance|operations|risk|finance|legal|marketing|sales|technology|product|engineering|research|development|audit|accounting|human|resources)", r'\1 \2'),

        # investigation + and/for (including concatenated)
        (r'\b(investigation)(and|for|or)\b', r'\1 \2'),
        (r'(investigation)(and|for|or|filing)', r'\1 \2'),

        # implementing + organizational
        (r'(implementing)(organizational|organization|controls)', r'\1 \2'),

        # Fix ")and" -> ") and"
        (r'\)(and|or|for)', r') \1'),

        # filing + and/for/with
        (r'\b(filing)(and|for|or|with)\b', r'\1 \2'),

        # correspondent + bank/banks
        (r'\b(correspondent)(bank|banks)\b', r'\1 \2'),

        # sanctioned + individual/person/entity
        (r'\b(sanctioned)(individual|person|entity)\b', r'\1 \2'),

        # the + purpose/nature/etc (common OCR error)
        (r'\b(the)(purpose|nature|risk|use|basis)\b', r'\1 \2'),

        # a + purpose/nature/etc
        (r'\b(a)(purpose|nature|risk|use|basis)\b', r'\1 \2'),

        # team + discovers/reports/etc
        (r'\b(team)(discovers|reports|finds|identifies|detects|observes|notices|recognizes|sees|views|regards|considers|thinks|believes|assumes|expects|anticipates|predicts|forecasts|projects|estimates|calculates|computes|determines|decides|chooses|selects|picks|prefers|likes|loves|hates|dislikes|wants|needs|requires|demands|requests|asks|seeks|searches|looks|hopes|wishes|desires|intends|plans|prepares|organizes|arranges|manages|controls|directs|leads|guides|teaches|trains|educates|instructs|coaches|mentors|advises|consults|assists|helps|supports|serves|works|operates|functions|acts|behaves|performs|executes|implements|conducts|carries|does|makes|creates|produces|builds|constructs|develops|designs|plans|organizes|manages|administers|supervises|oversees|monitors|checks|tests|examines|inspects|investigates|analyzes|studies|researches|explores|discovers|finds|identifies|detects|observes|notices|recognizes|sees|views|regards|considers|thinks|believes|assumes|expects|anticipates|predicts|forecasts|projects|estimates|calculates|computes|determines|decides|chooses|selects|picks|prefers|likes|loves|hates|dislikes|wants|needs|requires|demands|requests|asks|seeks|searches|looks|hopes|wishes|desires|intends|plans|prepares)\b', r'\1 \2'),

        # quarter + as/when/etc
        (r'\b(quarter)(as|when|where|while|after|before|during|since|until|till)\b', r'\1 \2'),

        # Common noun + verb patterns (lowercase-lowercase)
        (r'\b(customer|client|user|member|employee|staff|worker|manager|director|officer|official|representative|agent|advisor|consultant|expert|specialist|analyst|researcher)(discovers|reports|finds|identifies|detects|observes|notices|recognizes|sees|views|regards|considers|thinks|believes|assumes|expects|anticipates|predicts|forecasts|projects|estimates|calculates|computes|determines|decides|chooses|selects|picks|prefers|likes|loves|hates|dislikes|wants|needs|requires|demands|requests|asks|seeks|searches|looks|hopes|wishes|desires|intends|plans|prepares|organizes|arranges|manages|controls|directs|leads|guides|teaches|trains|educates|instructs|coaches|mentors|advises|consults|assists|helps|supports|serves|works|operates|functions|acts|behaves|performs|executes|implements|conducts|carries|does|makes|creates|produces|builds|constructs|develops|designs)\b', r'\1 \2'),
    ]

    for pattern, replacement in replacements:
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

    return result


def normalize_question(question: Dict) -> Dict:
    """Normalize a single question object"""
    result = question.copy()

    # Normalize question text
    if 'question' in result:
        result['question'] = fix_word_boundaries(result['question'])

    # Normalize options
    if 'options' in result:
        normalized_options = {}
        for key, value in result['options'].items():
            normalized_options[key] = fix_word_boundaries(value)
        result['options'] = normalized_options

    # Normalize explanation
    if 'explanation' in result:
        result['explanation'] = fix_word_boundaries(result['explanation'])

    return result


def main():
    input_file = 'questions.json'
    output_file = 'questions_normalized.json'

    print(f"Loading {input_file}...")
    data = load_json(input_file)

    if isinstance(data, list):
        print(f"Processing {len(data)} questions...")
        normalized = [normalize_question(q) for q in data]
    else:
        print("Error: questions.json should be a list")
        sys.exit(1)

    print(f"Saving normalized output to {output_file}...")
    save_json(normalized, output_file)

    print("Normalization complete!")
    print(f"\nTo compare files:")
    print(f"  diff questions.json questions_normalized.json")
    print(f"\nTo replace the original:")
    print(f"  mv questions_normalized.json questions.json")


if __name__ == '__main__':
    main()
