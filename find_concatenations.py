#!/usr/bin/env python3
"""
Find word concatenations in questions.json
Focus on actual concatenations, not legitimate words
"""

import json
import re
from collections import defaultdict

with open('questions.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

concatenations = defaultdict(list)

# Common words that should have spaces after them
prepositions = ['the', 'a', 'an', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'and', 'or', 'as', 'when', 'where', 'which', 'that', 'this', 'be', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'not', 'no', 'yes']

# Common nouns/verbs that often get concatenated
common_targets = ['number', 'customer', 'bank', 'institution', 'company', 'firm', 'entity', 'person', 'individual', 'group', 'team', 'department', 'division', 'unit', 'manager', 'director', 'officer', 'official', 'representative', 'agent', 'advisor', 'consultant', 'risk', 'security', 'compliance', 'operations', 'finance', 'legal', 'information', 'report', 'activity', 'transaction', 'account', 'relationship', 'service', 'product', 'business', 'system', 'process', 'procedure', 'policy', 'program', 'project', 'plan', 'review', 'assessment', 'analysis', 'investigation', 'examination', 'audit', 'check', 'verification', 'monitoring', 'detection', 'prevention', 'control', 'measure', 'action', 'step', 'requirement', 'obligation', 'responsibility', 'duty', 'function', 'role', 'purpose', 'objective', 'goal', 'target', 'standard', 'level', 'amount', 'quantity', 'period', 'time', 'date', 'year', 'month', 'quarter', 'week', 'day']

for idx, item in enumerate(data):
    for key, value in item.items():
        if isinstance(value, str):
            # Find all lowercase + uppercase patterns (most reliable)
            for match in re.finditer(r'([a-z]{2,})([A-Z][a-z]{2,})', value):
                word1, word2 = match.groups()
                combined = word1 + word2
                # Only include if word1 ends a common word (not "Acc" from "According")
                if word1.lower() in prepositions or word1.lower() in common_targets:
                    concatenations[combined].append((idx, key))

            # Find specific function word + word patterns
            # Look for actual concatenations like "ofinformation", "numberof", etc.
            for func_word in ['of', 'to', 'for', 'in', 'on', 'at', 'by', 'with', 'from', 'and', 'or', 'as', 'the', 'a', 'an']:
                # Match function word directly followed by another word (no space)
                pattern = r'\b' + func_word + r'([a-z]{4,})'
                for match in re.finditer(pattern, value, re.IGNORECASE):
                    word2 = match.group(1)
                    combined = func_word.lower() + word2
                    # Check if word2 is a common word (likely concatenation)
                    if word2.lower() in common_targets or len(word2) >= 6:
                        concatenations[combined].append((idx, key))

# Print results
print(f"Found {len(concatenations)} unique concatenations:\n")
for concat, occurrences in sorted(concatenations.items())[:200]:
    print(f"{concat} ({len(occurrences)} occurrences)")
