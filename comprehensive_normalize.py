#!/usr/bin/env python3
"""
Comprehensive OCR Text Normalization for questions.json

Handles BOTH fragmentation and concatenation errors in the correct order:
1. Fix fragmentation (merge split words)
2. Fix concatenation (split merged words)
"""

import json
import re
from pathlib import Path


class ComprehensiveOCRNormalizer:
    """Fix all OCR text errors comprehensively"""

    def __init__(self):
        # Fragmentation patterns (space INSIDE valid words)
        self.fragmentation_patterns = [
            # Single letter suffixes
            (r'(\w{3,})\s+s\b', r'\1s'),  # word s → words
            (r'(\w{3,})\s+ed\b', r'\1ed'),  # word ed → worded
            (r'(\w{3,})\s+ing\b', r'\1ing'),  # word ing → wording
            (r'(\w{3,})\s+ion\b', r'\1ion'),  # word ion → wordion
            (r'(\w{3,})\s+er\b', r'\1er'),  # word er → worder
            (r'(\w{3,})\s+est\b', r'\1est'),  # word est → wordest
            (r'(\w{3,})\s+ly\b', r'\1ly'),  # word ly → wordly
            (r'(\w{3,})\s+ty\b', r'\1ty'),  # word ty → wordty
            (r'(\w{3,})\s+al\b', r'\1al'),  # word al → wordal
            (r'(\w{3,})\s+ial\b', r'\1ial'),  # word ial → wordial
            (r'(\w{3,})\s+ary\b', r'\1ary'),  # word ary → wordary
            (r'(\w{3,})\s+ory\b', r'\1ory'),  # word ory → wordory
            (r'(\w{3,})\s+ive\b', r'\1ive'),  # word ive → wordive
            (r'(\w{3,})\s+ous\b', r'\1ous'),  # word ous → wordous
            (r'(\w{3,})\s+ism\b', r'\1ism'),  # word ism → wordism
            (r'(\w{3,})\s+ist\b', r'\1ist'),  # word ist → wordist
            (r'(\w{3,})\s+ment\b', r'\1ment'),  # word ment → wordment
            (r'(\w{3,})\s+ness\b', r'\1ness'),  # word ness → wordness
            (r'(\w{3,})\s+ful\b', r'\1ful'),  # word ful → wordful
            (r'(\w{3,})\s+less\b', r'\1less'),  # word less → wordless
            (r'(\w{3,})\s+able\b', r'\1able'),  # word able → wordable
            (r'(\w{3,})\s+ible\b', r'\1ible'),  # word ible → wordible
            (r'(\w{3,})\s+ance\b', r'\1ance'),  # word ance → wordance
            (r'(\w{3,})\s+ence\b', r'\1ence'),  # word ence → wordence
            (r'(\w{3,})\s+ant\b', r'\1ant'),  # word ant → wordant
            (r'(\w{3,})\s+ent\b', r'\1ent'),  # word ent → wordent
            (r'(\w{3,})\s+ate\b', r'\1ate'),  # word ate → wordate
            (r'(\w{3,})\s+ize\b', r'\1ize'),  # word ize → wordize
            (r'(\w{3,})\s+ure\b', r'\1ure'),  # word ure → wordure
            (r'(\w{3,})\s+dom\b', r'\1dom'),  # word dom → worddom
            (r'(\w{3,})\s+ship\b', r'\1ship'),  # word ship → wordship
            (r'(\w{3,})\s+hood\b', r'\1hood'),  # word hood → wordhood
            (r'(\w{3,})\s+tion\b', r'\1tion'),  # word tion → wordtion
            (r'(\w{3,})\s+sion\b', r'\1sion'),  # word sion → wordsion
            (r'(\w{3,})\s+ity\b', r'\1ity'),  # word ity → wordity

            # Specific common fragmentations
            (r'action\s+s\b', 'actions'),
            (r'involve\s+d\b', 'involved'),
            (r'freeze\s+e\b', 'freeze'),
            (r'froze\s+n\b', 'frozen'),
            (r'asset\s+s\b', 'assets'),
            (r'account\s+s\b', 'accounts'),
            (r'geographica\s+l\b', 'geographical'),
            (r'precautionar\s+y\b', 'precautionary'),
            (r'identica\s+l\b', 'identical'),
            (r'additiona\s+l\b', 'additional'),
            (r'originall\s+y\b', 'originally'),
            (r'financia\s+l\b', 'financial'),
            (r'commercia\s+l\b', 'commercial'),
            (r'industria\s+l\b', 'industrial'),
            (r'essentia\s+l\b', 'essential'),
            (r'materia\s+l\b', 'material'),
            (r'potentia\s+l\b', 'potential'),
            (r'benefic\s+iari\s+es\b', 'beneficiaries'),
            (r'compl\s+y\b', 'comply'),
            (r'difficul\s+t\b', 'difficult'),
            (r'comple\s+x\b', 'complex'),
            (r'affidavi\s+t\b', 'affidavit'),
            (r'institutio\s+n\b', 'institution'),
            (r'obta\s+i\s+n\b', 'obtain'),
            (r'prosecuto\s+r\b', 'prosecutor'),
            (r'instruc\s+t\s+s\b', 'instructs'),
            (r'membe\s+r\b', 'member'),
            (r'author\s+it\s+ies\b', 'authorities'),
            (r'regula\s+r\s+ly\b', 'regularly'),
            (r'essentia\s+l\s+y\b', 'essentially'),
            (r'genera\s+l\s+y\b', 'generally'),
            (r'usua\s+l\s+y\b', 'usually'),
            (r'actua\s+l\s+y\b', 'actually'),
            (r'eventua\s+l\s+y\b', 'eventually'),
            (r'specia\s+l\s+y\b', 'specially'),
            (r'technica\s+l\s+y\b', 'technically'),
            (r'specifica\s+l\s+y\b', 'specifically'),
            (r'practica\s+l\s+y\b', 'practically'),
            (r'logica\s+l\s+y\b', 'logically'),
            (r'financia\s+l\s+y\b', 'financially'),
            (r'globa\s+l\s+y\b', 'globally'),
            (r'lega\s+l\s+y\b', 'legally'),
            (r'forma\s+l\s+y\b', 'formally'),
            (r'operationa\s+l\s+y\b', 'operationally'),
            (r'identifica\s+t\s+ion\b', 'identification'),
            (r'appropria\s+t\s+e\b', 'appropriate'),
            (r'correspo\s+n\s+d\b', 'correspond'),
            (r'correspo\s+n\s+dence\b', 'correspondence'),
            (r'correspo\s+n\s+dent\b', 'correspondent'),
            (r'implementa\s+t\s+ion\b', 'implementation'),
            (r'investiga\s+t\s+ion\b', 'investigation'),
            (r'investiga\s+t\s+or\b', 'investigator'),
            (r'investiga\s+t\s+e\b', 'investigate'),
            (r'organiza\s+t\s+ion\b', 'organization'),
            (r'organiza\s+t\s+e\b', 'organize'),
            (r'authori\s+z\s+e\b', 'authorize'),
            (r'regula\s+t\s+ion\b', 'regulation'),
            (r'regula\s+t\s+e\b', 'regulate'),
            (r'informa\s+t\s+ion\b', 'information'),
            (r'applica\s+t\s+ion\b', 'application'),
            (r'communica\s+t\s+ion\b', 'communication'),
            (r'communica\s+t\s+e\b', 'communicate'),
            (r'departme\s+n\s+t\b', 'department'),
            (r'govername\s+n\s+t\b', 'government'),
            (r'enforceme\s+n\s+t\b', 'enforcement'),
            (r'requireme\s+n\s+t\b', 'requirement'),
            (r'orienta\s+t\s+ion\b', 'orientation'),
            (r'directi\s+v\s+e\b', 'directive'),
            (r'jurisdictio\s+n\b', 'jurisdiction'),
            (r'transactio\s+n\b', 'transaction'),
            (r'relatio\s+n\s+ship\b', 'relationship'),
            (r'jurisdictio\s+n\b', 'jurisdiction'),
            (r'executi\s+v\s+e\b', 'executive'),
            (r'legisla\s+t\s+ive\b', 'legislative'),
            (r'detecti\s+v\s+e\b', 'detective'),
            (r'negati\s+v\s+e\b', 'negative'),
            (r'positi\s+v\s+e\b', 'positive'),
            (r'acti\s+v\s+e\b', 'active'),
            (r'effecti\s+v\s+e\b', 'effective'),
            (r'informa\s+t\s+ional\b', 'informational'),
            (r'educatio\s+n\s+al\b', 'educational'),
            (r'operatio\s+n\s+al\b', 'operational'),
            (r'nationa\s+l\b', 'national'),
            (r'interna\s+t\s+ional\b', 'international'),
            (r'functio\s+n\s+al\b', 'functional'),
            (r'conventio\s+n\s+al\b', 'conventional'),
            (r'technica\s+l\b', 'technical'),
            (r'analytica\s+l\b', 'analytical'),
            (r'critica\s+l\b', 'critical'),
            (r'politica\s+l\b', 'political'),
            (r'economica\s+l\b', 'economical'),
            (r'practica\s+l\b', 'practical'),
            (r'tactica\s+l\b', 'tactical'),
            (r'logica\s+l\b', 'logical'),
            (r'medica\s+l\b', 'medical'),
            (r'lega\s+l\b', 'legal'),
            (r'genera\s+l\b', 'general'),
            (r'origi\s+n\s+a\s+l\b', 'original'),
            (r'usua\s+l\b', 'usual'),
            (r'actua\s+l\b', 'actual'),
            (r'individua\s+l\b', 'individual'),
            (r'visua\s+l\b', 'visual'),
            (r'globa\s+l\b', 'global'),
            (r'loca\s+l\b', 'local'),
            (r'socia\s+l\b', 'social'),
            (r'specia\s+l\b', 'special'),
            (r'norma\s+l\b', 'normal'),
            (r'fina\s+l\b', 'final'),
            (r'forma\s+l\b', 'formal'),
            (r'persona\s+l\b', 'personal'),
            (r'busines\s+s\b', 'business'),
            (r'witness\s+s\b', 'witness'),
            (r'addres\s+s\b', 'address'),
            (r'acces\s+s\b', 'access'),
            (r'succes\s+s\b', 'success'),
            (r'interes\s+t\b', 'interest'),
            (r'differe\s+n\s+ce\b', 'difference'),
            (r'importa\s+n\s+ce\b', 'importance'),
            (r'significa\s+n\s+ce\b', 'significance'),
            (r'proces\s+s\b', 'process'),
        ]

    def fix_fragmentation(self, text):
        """Fix fragmentation errors (spaces inside valid words)"""
        if not text:
            return text

        result = text
        for pattern, replacement in self.fragmentation_patterns:
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        return result

    def fix_concatenation(self, text):
        """Fix concatenation errors (missing spaces between words)"""
        if not text:
            return text

        result = text

        # Pattern 1: lowercase + uppercase (most common)
        result = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', result)

        # Pattern 2: Multiple uppercase + lowercase
        result = re.sub(r'([A-Z]{2,})([a-z])', r'\1 \2', result)

        # Pattern 3: Number + letter
        result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)

        # Pattern 4: Specific corrections
        corrections = {
            'seperate': 'separate',
            'recieve': 'receive',
            'occured': 'occurred',
            'untill': 'until',
            'form ats': 'formats',
            'form at': 'format',
        }
        for wrong, correct in corrections.items():
            result = re.sub(wrong, correct, result, flags=re.IGNORECASE)

        return result

    def normalize(self, text):
        """Apply all normalization in correct order"""
        if not text:
            return text

        result = text

        # Order matters: fix fragmentation first, then concatenation
        result = self.fix_fragmentation(result)
        result = self.fix_concatenation(result)

        # Final whitespace cleanup
        result = re.sub(r'\s+', ' ', result).strip()

        return result


def fix_question_data(q, normalizer):
    """Fix all text fields in a question"""
    changed = False

    fields_to_fix = [
        'question',
        'domain',
        'explanation',
        'explanation_ai_en',
        'explanation_ai_ch',
    ]

    for field in fields_to_fix:
        if field in q:
            original = q[field]
            q[field] = normalizer.normalize(q[field])
            if q[field] != original:
                changed = True

    # Fix options
    if 'options' in q:
        for opt_letter in q['options']:
            original = q['options'][opt_letter]
            q['options'][opt_letter] = normalizer.normalize(q['options'][opt_letter])
            if q['options'][opt_letter] != original:
                changed = True

    return q, changed


def main():
    json_path = Path('questions.json')

    print("=" * 60)
    print("Comprehensive OCR Text Normalization")
    print("Fixing fragmentation + concatenation errors")
    print("=" * 60)

    # Load questions
    print(f"\nLoading questions from: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Total questions: {len(data)}")

    # Initialize normalizer
    normalizer = ComprehensiveOCRNormalizer()

    # Fix all questions
    print("\nNormalizing questions (fragmentation → concatenation)...")
    fixed_count = 0

    for i, q in enumerate(data):
        q, changed = fix_question_data(q, normalizer)
        data[i] = q
        if changed:
            fixed_count += 1

    # Save fixed data
    print(f"\n{'=' * 60}")
    print(f"Fixed {fixed_count} questions")
    print(f"{'=' * 60}")

    print(f"\nSaving to: {json_path}")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Done!")


if __name__ == '__main__':
    main()
