#!/usr/bin/env python3
"""
OCR Text Normalization Script for questions.json

Cleans OCR-extracted English text including:
- Word concatenation (missing spaces)
- Common OCR errors
- Hyphenation issues
- Whitespace problems
"""

import json
import re
from pathlib import Path


class OCRNormalizer:
    """Normalize OCR-extracted text"""

    def __init__(self):
        # Common English words that should never be split
        self.valid_compound_words = {
            'therefore', 'however', 'moreover', 'furthermore', 'nevertheless',
            'nonetheless', 'although', 'though', 'although', 'whereas',
            'framework', 'workshop', 'workflow', 'background', 'playground',
            'understand', 'understanding', 'understood', 'undergo', 'undergone',
            'outbound', 'outweigh', 'outcome', 'outlook', 'outline', 'output',
            'income', 'incoming', 'inbound', 'indeed', 'instead', 'inform',
            'information', 'informant', 'informed', 'informing', 'formation',
            'transaction', 'transform', 'transformation', 'transfer',
            'transmission', 'transmit', 'transport', 'transportation',
            'authority', 'authorities', 'authorize', 'authorized', 'authorizing',
            'regulation', 'regulatory', 'regulate', 'regulated', 'regulating',
            'requirement', 'require', 'required', 'requiring', 'acquire',
            'acquired', 'acquisition', 'acquires', 'compliance', 'compliant',
            'committee', 'commit', 'committed', 'committing', 'commission',
            'commissioner', 'relationship', 'relation', 'relate', 'related',
            'communicate', 'communication', 'community', 'territory', 'terrorist',
            'terrorism', 'territorial', 'financial', 'finance', 'financing',
            'sanctioned', 'sanction', 'sanctions', 'suspicious', 'suspicion',
            'suspiciously', 'necessary', 'necessarily', 'necessity', 'business',
            'assistance', 'assistant', 'assist', 'assisted', 'assisting',
            'guidelines', 'guideline', 'guidance', 'compliance', 'compliant',
            'according', 'account', 'accounting', 'accountable', 'accountability',
            'organization', 'organize', 'organized', 'organizing', 'organizational',
            'correspondent', 'corresponding', 'correspondence', 'correspond',
            'detection', 'detect', 'detected', 'detecting', 'detective',
            'investigation', 'investigate', 'investigating', 'investigative',
            'investigator', 'proceed', 'proceeding', 'proceeds', 'procedure',
            'procedural', 'process', 'processing', 'processed', 'assistance',
            'assistant', 'assessment', 'assess', 'assessed', 'assessing',
            'assistance', 'assistant', 'separate', 'separated', 'separating',
            'separation', 'otherwise', 'whenever', 'wherever', 'whatever',
            'whatsoever', 'meanwhile', 'wherein', 'therein', 'whereby',
            'hereby', 'herein', 'thereof', 'whereof', 'what', 'which',
            'information', 'technology', 'department', 'apartment', 'departure',
            'knowledge', 'acknowledged', 'acknowledge', 'acknowledging',
        }

        # Common OCR-specific corrections
        self.ocr_corrections = {
            # Common word concatenations to split
            'alaw': 'a law',
            'investigationandfiling': 'investigation and filing',
            'implementingorganization': 'implementing organization',
            'thepurpose': 'the purpose',
            'sanctionalindividual': 'sanctioned individual',
            'originalcorrespondant': 'original correspondent',
            'detectchanges': 'detect changes',
            'launderingconcern': 'laundering concern',

            # Common OCR typos
            'seperate': 'separate',
            'seperation': 'separation',
            'recieve': 'receive',
            'occured': 'occurred',
            'occurence': 'occurrence',
            'untill': 'until',
            'usefull': 'useful',
            ' succesfull': 'successful',
            'accomodation': 'accommodation',
            'acheive': 'achieve',
            'acheived': 'achieved',
            ' goverment': 'government',
            'occassion': 'occasion',
            'occasionaly': 'occasionally',
            'persistant': 'persistent',
            'beleive': 'believe',
            'concious': 'conscious',
            'conciousness': 'consciousness',
            'definately': 'definitely',
            'existance': 'existence',
            'existant': 'existent',
            'guage': 'gauge',
            'happend': 'happened',
            'humourous': 'humorous',
            'independant': 'independent',
            'knowlege': 'knowledge',
            'liason': 'liaison',
            'maintainance': 'maintenance',
            'millenium': 'millennium',
            'miniscule': 'minuscule',
            'mischievious': 'mischievous',
            'neccessary': 'necessary',
            'noticable': 'noticeable',
            'occassionally': 'occasionally',
            'oficial': 'official',
            'oppertunity': 'opportunity',
            'paralel': 'parallel',
            'particulary': 'particularly',
            'pavillion': 'pavilion',
            'percieve': 'perceive',
            'percieve': 'perceived',
            'perseverence': 'perseverance',
            'personel': 'personnel',
            'posession': 'possession',
            'posess': 'possess',
            'prefered': 'preferred',
            'previlege': 'privilege',
            'profesion': 'profession',
            'pronounciation': 'pronunciation',
            'publically': 'publicly',
            'reccomend': 'recommend',
            'reccommend': 'recommend',
            'refered': 'referred',
            'relevent': 'relevant',
            'relevently': 'relevantly',
            'reminiscant': 'reminiscent',
            'resistence': 'resistance',
            'resistent': 'resistant',
            'responsability': 'responsibility',
            'rythm': 'rhythm',
            'sacrilegious': 'sacrilegious',
            'sargeant': 'sergeant',
            'sargent': 'sergeant',
            'scede': 'cede',
            'sucessful': 'successful',
            'sucessfully': 'successfully',
            'supercede': 'supersede',
            'superintendant': 'superintendent',
            'tendancy': 'tendency',
            'therefor': 'therefore',
            'thoroughfare': 'thorough',
            'tommorrow': 'tomorrow',
            'tounge': 'tongue',
            'truely': 'truly',
            'unfortunatly': 'unfortunately',
            'untill': 'until',
            'unusuall': 'unusual',
            'upholstry': 'upholstery',
            'usible': 'usable',
            'withold': 'withhold',
            'witholding': 'withholding',
        }

    def fix_word_boundaries(self, text):
        """Fix word boundaries by inserting spaces between concatenated words"""
        if not text:
            return text

        result = text

        # Pattern 1: lowercase letter followed by uppercase letter (most common)
        # This handles cases like "investigationAndFiling" → "investigation And Filing"
        result = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', result)

        # Pattern 2: Multiple uppercase letters followed by lowercase (word boundary)
        # Handles "AMLCompliance" → "AML Compliance"
        result = re.sub(r'([A-Z]{2,})([a-z])', r'\1 \2', result)

        # Pattern 3: Number followed by letter
        result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)

        # Pattern 4: Letter followed by number
        result = re.sub(r'([A-Za-z])(\d)', r'\1 \2', result)

        # Pattern 5: Fix specific concatenation patterns
        # "theword" → "the word" (3+ lowercase letters + lowercase)
        result = re.sub(r'([a-z]{3,})([a-z])', lambda m: f"{m.group(1)} {m.group(2)}" if len(m.group(1)) > 3 and m.group(2).islower() and m.group(1)[-1] != ' ' else m.group(0), result)

        return result

    def apply_ocr_corrections(self, text):
        """Apply known OCR corrections"""
        if not text:
            return text

        result = text

        for wrong, correct in self.ocr_corrections.items():
            result = re.sub(wrong, correct, result, flags=re.IGNORECASE)

        return result

    def fix_whitespace(self, text):
        """Fix whitespace issues"""
        if not text:
            return text

        # Remove excessive whitespace
        result = re.sub(r'\s+', ' ', text)

        # Fix line breaks within words (common in PDF extraction)
        result = re.sub(r'([a-z])-\s+([a-z])', r'\1\2', result)

        # Trim leading/trailing whitespace
        result = result.strip()

        return result

    def normalize(self, text):
        """Apply all normalization steps"""
        if not text:
            return text

        result = text

        # Apply fixes in order
        result = self.fix_whitespace(result)
        result = self.apply_ocr_corrections(result)
        result = self.fix_word_boundaries(result)

        # Final cleanup
        result = self.fix_whitespace(result)

        return result


def normalize_question_data(q, normalizer):
    """Normalize all text fields in a question"""
    changed = False

    # Normalize question text
    if 'question' in q:
        original = q['question']
        q['question'] = normalizer.normalize(q['question'])
        if q['question'] != original:
            changed = True

    # Normalize domain
    if 'domain' in q:
        original = q['domain']
        q['domain'] = normalizer.normalize(q['domain'])
        if q['domain'] != original:
            changed = True

    # Normalize explanation
    if 'explanation' in q:
        original = q['explanation']
        q['explanation'] = normalizer.normalize(q['explanation'])
        if q['explanation'] != original:
            changed = True

    # Normalize AI explanations
    if 'explanation_ai_en' in q:
        original = q['explanation_ai_en']
        q['explanation_ai_en'] = normalizer.normalize(q['explanation_ai_en'])
        if q['explanation_ai_en'] != original:
            changed = True

    if 'explanation_ai_ch' in q:
        original = q['explanation_ai_ch']
        q['explanation_ai_ch'] = normalizer.normalize(q['explanation_ai_ch'])
        if q['explanation_ai_ch'] != original:
            changed = True

    # Normalize options
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
    print("OCR Text Normalization for questions.json")
    print("=" * 60)

    # Load questions
    print(f"\nLoading questions from: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Total questions: {len(data)}")

    # Initialize normalizer
    normalizer = OCRNormalizer()

    # Normalize all questions
    print("\nNormalizing questions...")
    fixed_count = 0

    for i, q in enumerate(data):
        q, changed = normalize_question_data(q, normalizer)
        data[i] = q
        if changed:
            fixed_count += 1
            if fixed_count <= 10:  # Show first 10 fixes
                print(f"  Fixed question {q.get('id')}: {q.get('question', '')[:60]}...")

    # Save normalized data
    print(f"\n{'=' * 60}")
    print(f"Fixed {fixed_count} questions")
    print(f"{'=' * 60}")

    print(f"\nSaving to: {json_path}")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Done!")


if __name__ == '__main__':
    main()
