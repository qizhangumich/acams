#!/usr/bin/env python3
"""
OCR Cleaner for questions.json

Fixes OCR spacing errors:
1. Fragmentation (extra spaces inside words): unusual y → unusually
2. Concatenation (missing spaces between words): regulationsoverridethe → regulations override the
"""

import re
import json
import sys
from pathlib import Path

# ================================
# CONFIG
# ================================

MIN_WORD_FREQ = 2.0   # 控制词典置信度
MAX_WORD_LENGTH = 40  # 避免极长字符串误分割

# Try to import wordfreq, fallback to basic validation
try:
    from wordfreq import zipf_frequency
    HAS_WORDFREQ = True
except ImportError:
    HAS_WORDFREQ = False
    print("Warning: wordfreq not available, using basic word validation")

# Try to import tqdm, fallback to no progress bar
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    print("Warning: tqdm not available, progress bar disabled")

# ================================
# COMMON WORDS LIST (fallback)
# ================================

COMMON_WORDS = {
    # Most common English words
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
    'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go',
    'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
    'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
    'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
    'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
    'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
    'most', 'us', 'is', 'are', 'was', 'were', 'been', 'has', 'had', 'have', 'having',

    # Business/Financial terms common in AML context
    'financial', 'institution', 'bank', 'account', 'transaction', 'money',
    'laundering', 'compliance', 'regulation', 'authority', 'customer', 'client',
    'report', 'risk', 'assessment', 'monitor', 'suspicious', 'activity', 'cash',
    'transfer', 'international', 'requirement', 'procedure', 'policy', 'program',
    'investigation', 'enforcement', 'agency', 'government', 'criminal', 'offense',
    'sanction', 'terrorist', 'financing', 'organization', 'information', 'system',
    'record', 'maintain', 'provide', 'ensure', 'include', 'following', 'according',
    'regulation', 'supervision', 'oversight', 'jurisdiction', 'directive', 'standard',
    'guideline', 'principle', 'recommendation', 'implementation', 'application',
    'identification', 'verification', 'documentation', 'registration', 'license',
    'authorization', 'permission', 'approval', 'assessment', 'review', 'examination',
    'auditor', 'examiner', 'inspector', 'officer', 'director', 'manager', 'administrator',
    'executive', 'employee', 'representative', 'agent', 'broker', 'dealer', 'trader',
    'beneficial', 'owner', 'control', 'beneficiary', 'shareholder', 'partner', 'member',
    'institution', 'entity', 'enterprise', 'business', 'company', 'corporation', 'firm',
    'establishment', 'association', 'foundation', 'trust', 'fund', 'exchange', 'market',
    'security', 'commodity', 'currency', 'instrument', 'investment', 'asset', 'liability',
    'equity', 'debt', 'obligation', 'contract', 'agreement', 'arrangement', 'understanding',
    'relationship', 'connection', 'involvement', 'participation', 'contribution', 'provision',
    'requirement', 'condition', 'stipulation', 'obligation', 'responsibility', 'authority',
    'jurisdiction', 'territory', 'region', 'country', 'nation', 'state', 'province', 'city',
    'department', 'division', 'branch', 'office', 'headquarters', 'location', 'position',
    'situation', 'condition', 'circumstance', 'event', 'incident', 'occurrence', 'happening',
    'transaction', 'transfer', 'deposit', 'withdrawal', 'payment', 'settlement', 'clearance',
    'conversion', 'exchange', 'remittance', 'transmission', 'transportation', 'delivery',
    'receipt', 'acceptance', 'rejection', 'refusal', 'approval', 'authorization', 'permission',
    'license', 'registration', 'enrolment', 'subscription', 'membership', 'participation',
    'involvement', 'contribution', 'donation', 'grant', 'allowance', 'benefit', 'advantage',
    'privilege', 'right', 'entitlement', 'interest', 'stake', 'share', 'portion', 'percentage',
    'fraction', 'ratio', 'proportion', 'segment', 'section', 'part', 'piece', 'unit', 'element',
    'component', 'ingredient', 'factor', 'feature', 'characteristic', 'attribute', 'property',
    'quality', 'quantity', 'amount', 'number', 'figure', 'statistic', 'data', 'information',
    'knowledge', 'understanding', 'comprehension', 'awareness', 'consciousness', 'recognition',
    'identification', 'classification', 'categorization', 'organization', 'arrangement',
    'structuring', 'ordering', 'sequencing', 'scheduling', 'planning', 'preparation',
    'implementation', 'execution', 'completion', 'fulfillment', 'achievement', 'accomplishment',
    'attainment', 'realization', 'actualization', 'materialization', 'manifestation',
    'demonstration', 'illustration', 'explanation', 'description', 'representation',
    'presentation', 'communication', 'transmission', 'transportation', 'conveyance',
    'delivery', 'distribution', 'circulation', 'dissemination', 'propagation', 'spread',
    'extension', 'expansion', 'development', 'growth', 'improvement', 'enhancement',
    'advancement', 'progress', 'evolution', 'transformation', 'conversion', 'modification',
    'alteration', 'change', 'variation', 'deviation', 'difference', 'distinction', 'contrast',
    'comparison', 'analogy', 'similarity', 'resemblance', 'likeness', 'affinity', 'relation',
    'connection', 'association', 'correlation', 'link', 'tie', 'bond', 'attachment', 'union',
    'junction', 'joint', 'connection', 'relationship', 'interconnection', 'interdependence',
    'interaction', 'interrelation', 'correspondence', 'correlation', 'association', 'affiliation',
    'partnership', 'collaboration', 'cooperation', 'coordination', 'integration', 'unification',
    'consolidation', 'amalgamation', 'merger', 'acquisition', 'takeover', 'absorption', 'assimilation',
    'incorporation', 'inclusion', 'introduction', 'insertion', 'addition', 'supplementation',
    'complementation', 'completion', 'perfection', 'conclusion', 'termination', 'expiration',
    'cessation', 'discontinuation', 'suspension', 'abandonment', 'desertion', 'rejection', 'refusal',
    'denial', 'repudiation', 'disavowal', 'renunciation', 'abdication', 'resignation', 'retirement',
    'withdrawal', 'departure', 'exit', 'leaving', 'quitting', 'departure', 'absence', 'lack',
    'deficiency', 'shortage', 'scarcity', 'dearth', 'want', 'need', 'necessity', 'requirement',
    'demand', 'request', 'appeal', 'petition', 'plea', 'entreaty', 'prayer', 'supplication',
    'invocation', 'evocation', 'summoning', 'calling', 'demand', 'command', 'order', 'instruction',
    'direction', 'guidance', 'advice', 'counsel', 'recommendation', 'suggestion', 'proposal',
    'proposition', 'submission', 'presentation', 'proposal', 'offer', 'tender', 'bid',
    'application', 'request', 'appeal', 'petition', 'entreaty', 'supplication', 'invocation',
    'congregation', 'gathering', 'assembly', 'meeting', 'conference', 'convention', 'congress',
    'parliament', 'legislature', 'council', 'committee', 'commission', 'board', 'panel',
    'jury', 'tribunal', 'court', 'judiciary', 'judicature', 'bench', 'bar', 'legal',
    'judicial', 'juridical', 'forensic', 'legislative', 'executive', 'administrative',
    'bureaucratic', 'governmental', 'official', 'public', 'civil', 'political', 'social',
    'economic', 'financial', 'commercial', 'industrial', 'professional', 'technical',
    'technological', 'scientific', 'academic', 'educational', 'cultural', 'artistic',
    'literary', 'musical', 'theatrical', 'entertainment', 'recreational', 'leisure',
    'domestic', 'household', 'family', 'personal', 'individual', 'private', 'local',
    'regional', 'national', 'international', 'global', 'worldwide', 'universal',
    'cosmic', 'interstellar', 'interplanetary', 'intergalactic', 'metaphysical',
    'spiritual', 'religious', 'secular', 'profane', 'mundane', 'worldly', 'earthly',
    'heavenly', 'divine', 'angelic', 'demonic', 'satanic', 'infernal', 'hellish',
    'celestial', 'terrestrial', 'chthonian', 'elemental', 'elementary', 'fundamental',
    'essential', 'basic', 'primary', 'secondary', 'tertiary', 'quaternary', 'quinary',
    'sextary', 'septenary', 'octonary', 'novenary', 'decenary', 'centenary', 'millennial',
    'periodic', 'periodical', 'annual', 'biennial', 'triennial', 'quadrennial', 'quinquennial',
    'sexennial', 'septennial', 'octennial', 'novennial', 'centennial', 'millennial',
    'daily', 'weekly', 'monthly', 'quarterly', 'semiannual', 'biannual', 'triennial',
    'hourly', 'momentary', 'temporary', 'permanent', 'everlasting', 'eternal', 'infinite',
    'boundless', 'limitless', 'endless', 'timeless', 'spaceless', 'formless', 'shapeless',
    'structureless', 'featureless', 'characteristic', 'distinctive', 'distinguishing',
    'differentiating', 'discriminating', 'discerning', 'perceiving', 'sensing', 'feeling',
    'experiencing', 'undergoing', 'enduring', 'suffering', 'tolerating', 'accepting',
    'approving', 'approving', 'sanctioning', 'ratifying', 'confirming', 'verifying',
    'validating', 'certifying', 'guaranteeing', 'warranting', 'assuring', 'ensuring',
    'insuring', 'securing', 'protecting', 'defending', 'guarding', 'shielding', 'sheltering',
    'housing', 'accommodating', 'lodging', 'quartering', 'barracking', 'camping', 'encamping',
    'sheltering', 'protecting', 'defending', 'guarding', 'shielding', 'screening', 'covering',
    'hiding', 'concealing', 'withholding', 'keeping', 'retaining', 'maintaining', 'preserving',
    'conserving', 'saving', 'rescuing', 'delivering', 'liberating', 'freeing', 'releasing',
    'discharging', 'dismissal', 'firing', 'sacking', 'terminating', 'ending', 'finishing',
    'completing', 'concluding', 'finalizing', 'wrapping', 'rounding', 'closing', 'shutting',
    'locking', 'bolting', 'barring', 'blocking', 'obstructing', 'hindering', 'impeding',
    'preventing', 'stopping', 'halting', 'arresting', 'detaining', 'confining', 'imprisoning',
    'incarcerating', 'jailing', 'gaoling', 'confining', 'restricting', 'limiting', 'curtailing',
    'shortening', 'abbreviating', 'abridging', 'contracting', 'condensing', 'compressing',
    'compacting', 'reducing', 'decreasing', 'diminishing', 'lessening', 'lowering',
    'weakening', 'attenuating', 'diluting', 'thinning', 'slimming', 'narrowing', 'tightening',
    'loosening', 'relaxing', 'easing', 'facilitating', 'enabling', 'allowing', 'permitting',
    'authorizing', 'licensing', 'sanctioning', 'approving', 'accepting', 'admitting', 'acknowledging',
    'confessing', 'conceding', 'granting', 'awarding', 'bestowing', 'presenting', 'giving',
    'offering', 'proffering', 'tendering', 'volunteering', 'donating', 'contributing', 'giving',
    'devoting', 'dedicating', 'committing', 'pledging', 'vowing', 'promising', 'agreeing',
    'consenting', 'assenting', 'complying', 'observing', 'following', 'obeying', 'heeding',
    'respecting', 'honoring', 'upholding', 'supporting', 'sustaining', 'maintaining', 'backing',
    'endorsing', 'championing', 'advocating', 'promoting', 'furthering', 'advancing', 'pushing',
    'propelling', 'driving', 'steering', 'guiding', 'leading', 'conducting', 'directing',
    'managing', 'controlling', 'regulating', 'governing', 'ruling', 'commanding', 'ordering',
    'instructing', 'teaching', 'educating', 'training', 'schooling', 'tutoring', 'coaching',
    'mentoring', 'advising', 'counseling', 'guiding', 'leading', 'showing', 'demonstrating',
    'illustrating', 'explaining', 'describing', 'depicting', 'portraying', 'representing',
    'presenting', 'displaying', 'exhibiting', 'revealing', 'disclosing', 'unveiling', 'uncovering',
    'discovering', 'finding', 'locating', 'identifying', 'recognizing', 'knowing', 'understanding',
    'comprehending', 'grasping', 'apprehending', 'perceiving', 'discerning', 'distinguishing',
    'differentiating', 'discriminating', 'noticing', 'observing', 'seeing', 'witnessing',
    'watching', 'viewing', 'looking', 'beholding', 'observing', 'noticing', 'perceiving',
    'feeling', 'sensing', 'experiencing', 'undergoing', 'enduring', 'suffering', 'bearing',
    'standing', 'tolerating', 'withstanding', 'resisting', 'opposing', 'fighting', 'struggling',
    'competing', 'vying', 'contesting', 'disputing', 'debating', 'arguing', 'discussing',
    'negotiating', 'conferring', 'consulting', 'deliberating', 'considering', 'pondering',
    'reflecting', 'meditating', 'contemplating', 'thinking', 'reasoning', 'rationalizing',
    'analyzing', 'examining', 'investigating', 'exploring', 'probing', 'inquiring', 'questioning',
    'interrogating', 'interviewing', 'examining', 'scrutinizing', 'inspecting', 'checking',
    'testing', 'trying', 'attempting', 'endeavoring', 'striving', 'struggling', 'laboring',
    'working', 'toiling', 'slaving', 'drudging', 'grinding', 'plodding', 'trudging', 'marching',
    'walking', 'running', 'jogging', 'sprinting', 'racing', 'hastening', 'hurrying', 'rushing',
    'speeding', 'darting', 'dashing', 'sprinting', 'bolting', 'fleeing', 'escaping', 'avoiding',
    'evading', 'shunning', 'eschewing', 'dodging', 'ducking', 'sidestepping', 'bypassing',
    'circumventing', 'eluding', 'avoiding', 'preventing', 'thwarting', 'frustrating', 'blocking',
    'stopping', 'halting', 'arresting', 'detaining', 'confining', 'restraining', 'constraining',
    'limiting', 'restricting', 'curtailing', 'shortening', 'abbreviating', 'abridging', 'contracting',
    'condensing', 'compressing', 'compacting', 'reducing', 'decreasing', 'lessening', 'lowering',
    'dropping', 'falling', 'sinking', 'descending', 'dropping', 'plunging', 'diving', 'plummeting',
    'crashing', 'collapsing', 'failing', 'breaking', 'cracking', 'splitting', 'tearing', 'ripping',
    'shredding', 'crushing', 'smashing', 'bashing', 'crashing', 'breaking', 'smashing', 'crushing',
    'pressing', 'squeezing', 'pinching', 'gripping', 'grasping', 'clutching', 'holding',
    'keeping', 'retaining', 'maintaining', 'preserving', 'conserving', 'saving', 'rescuing',
    'protecting', 'defending', 'guarding', 'shielding', 'sheltering', 'housing', 'lodging',
    'quartering', 'barracking', 'camping', 'encamping', 'sheltering', 'protecting', 'defending',
    'guarding', 'shielding', 'screening', 'covering', 'hiding', 'concealing', 'withholding',
    'keeping', 'retaining', 'maintaining', 'preserving', 'conserving', 'saving', 'rescuing',
    'liberating', 'freeing', 'releasing', 'discharging', 'dismissing', 'firing', 'sacking',
    'terminating', 'ending', 'finishing', 'completing', 'concluding', 'finalizing', 'wrapping',
    'rounding', 'closing', 'shutting', 'locking', 'bolting', 'barring', 'blocking', 'obstructing',
    'hindering', 'impeding', 'preventing', 'stopping', 'halting', 'arresting', 'detaining',
    'confining', 'imprisoning', 'incarcerating', 'jailing', 'gaoling', 'confining', 'restricting',
    'limiting', 'curtailing', 'shortening', 'abbreviating', 'abridging', 'contracting', 'condensing',
    'compressing', 'compacting', 'reducing', 'decreasing', 'diminishing', 'lessening', 'lowering',
    'weakening', 'attenuating', 'diluting', 'thinning', 'slimming', 'narrowing', 'tightening',
    'loosening', 'relaxing', 'easing', 'facilitating', 'enabling', 'allowing', 'permitting',
    'authorizing', 'licensing', 'sanctioning', 'approving', 'accepting', 'admitting', 'acknowledging',
    'confessing', 'conceding', 'granting', 'awarding', 'bestowing', 'presenting', 'giving',
    'offering', 'proffering', 'tendering', 'volunteering', 'donating', 'contributing', 'giving',
    'devoting', 'dedicating', 'committing', 'pledging', 'vowing', 'promising', 'agreeing',
    'consenting', 'assenting', 'complying', 'observing', 'following', 'obeying', 'heeding',
    'respecting', 'honoring', 'upholding', 'supporting', 'sustaining', 'maintaining', 'backing',
    'endorsing', 'championing', 'advocating', 'promoting', 'furthering', 'advancing', 'pushing',
    'propelling', 'driving', 'steering', 'guiding', 'leading', 'conducting', 'directing',
    'managing', 'controlling', 'regulating', 'governing', 'ruling', 'commanding', 'ordering',
    'instructing', 'teaching', 'educating', 'training', 'schooling', 'tutoring', 'coaching',
    'mentoring', 'advising', 'counseling', 'guiding', 'leading', 'showing', 'demonstrating',
    'illustrating', 'explaining', 'describing', 'depicting', 'portraying', 'representing',
    'presenting', 'displaying', 'exhibiting', 'revealing', 'disclosing', 'unveiling', 'uncovering',
    'discovering', 'finding', 'locating', 'identifying', 'recognizing', 'knowing', 'understanding',
    'comprehending', 'grasping', 'apprehending', 'perceiving', 'discerning', 'distinguishing',
    'differentiating', 'discriminating', 'noticing', 'observing', 'seeing', 'witnessing',
    'watching', 'viewing', 'looking', 'beholding', 'observing', 'noticing', 'perceiving',
    'feeling', 'sensing', 'experiencing', 'undergoing', 'enduring', 'suffering', 'bearing',
    'standing', 'tolerating', 'withstanding', 'resisting', 'opposing', 'fighting', 'struggling',
    'competing', 'vying', 'contesting', 'disputing', 'debating', 'arguing', 'discussing',
    'negotiating', 'conferring', 'consulting', 'deliberating', 'considering', 'pondering',
    'reflecting', 'meditating', 'contemplating', 'thinking', 'reasoning', 'rationalizing',
    'analyzing', 'examining', 'investigating', 'exploring', 'probing', 'inquiring', 'questioning',
    'interrogating', 'interviewing', 'examining', 'scrutinizing', 'inspecting', 'checking',
    'testing', 'trying', 'attempting', 'endeavoring', 'striving', 'struggling', 'laboring',
    'working', 'toiling', 'slaving', 'drudging', 'grinding', 'plodding', 'trudging', 'marching',
    'walking', 'running', 'jogging', 'sprinting', 'racing', 'hastening', 'hurrying', 'rushing',
    'speeding', 'darting', 'dashing', 'sprinting', 'bolting', 'fleeing', 'escaping', 'avoiding',
    'evading', 'shunning', 'eschewing', 'dodging', 'ducking', 'sidestepping', 'bypassing',
    'circumventing', 'eluding', 'avoiding', 'preventing', 'thwarting', 'frustrating', 'blocking',
    'stopping', 'halting', 'arresting', 'detaining', 'confining', 'restraining', 'constraining',
    'limiting', 'restricting', 'curtailing', 'shortening', 'abbreviating', 'abridging', 'contracting',
    'condensing', 'compressing', 'compacting', 'reducing', 'decreasing', 'diminishing', 'lessening',
    'lowering', 'dropping', 'falling', 'sinking', 'descending', 'dropping', 'plunging', 'diving',
    'plummeting', 'crashing', 'collapsing', 'failing', 'breaking', 'cracking', 'splitting', 'tearing',
    'ripping', 'shredding', 'crushing', 'smashing', 'bashing', 'crashing', 'breaking', 'smashing',
    'crushing', 'pressing', 'squeezing', 'pinching', 'gripping', 'grasping', 'clutching', 'holding',
    'keeping', 'retaining', 'maintaining', 'preserving', 'conserving', 'saving', 'rescuing',
    'protecting', 'defending', 'guarding', 'shielding', 'sheltering', 'housing', 'lodging',
    'quartering', 'barracking', 'camping', 'encamping', 'sheltering', 'protecting', 'defending',
    'guarding', 'shielding', 'screening', 'covering', 'hiding', 'concealing', 'withholding',
    'keeping', 'retaining', 'maintaining', 'preserving', 'conserving', 'saving', 'rescuing',
    'liberating', 'freeing', 'releasing', 'discharging', 'dismissing', 'firing', 'sacking',
    'terminating', 'ending', 'finishing', 'completing', 'concluding', 'finalizing', 'wrapping',
    'rounding', 'closing', 'shutting', 'locking', 'bolting', 'barring', 'blocking', 'obstructing',
    'hindering', 'impeding', 'preventing', 'stopping', 'halting', 'arresting', 'detaining',
    'confining', 'imprisoning', 'incarcerating', 'jailing', 'gaoling', 'confining', 'restricting',
    'limiting', 'curtailing', 'shortening', 'abbreviating', 'abridging', 'contracting', 'condensing',
    'compressing', 'compacting', 'reducing', 'decreasing', 'diminishing', 'lessening', 'lowering',
    'weakening', 'attenuating', 'diluting', 'thinning', 'slimming', 'narrowing', 'tightening',
    'loosening', 'relaxing', 'easing', 'facilitating', 'enabling', 'allowing', 'permitting',
    'authorizing', 'licensing', 'sanctioning', 'approving', 'accepting', 'admitting', 'acknowledging',
    'confessing', 'conceding', 'granting', 'awarding', 'bestowing', 'presenting', 'giving',
    'offering', 'proffering', 'tendering', 'volunteering', 'donating', 'contributing', 'giving',
    'devoting', 'dedicating', 'committing', 'pledging', 'vowing', 'promising', 'agreeing',
    'consenting', 'assenting', 'complying', 'observing', 'following', 'obeying', 'heeding',
    'respecting', 'honoring', 'upholding', 'supporting', 'sustaining', 'maintaining', 'backing',
    'endorsing', 'championing', 'advocating', 'promoting', 'furthering', 'advancing', 'pushing',
    'propelling', 'driving', 'steering', 'guiding', 'leading', 'conducting', 'directing',
    'managing', 'controlling', 'regulating', 'governing', 'ruling', 'commanding', 'ordering',
    'instructing', 'teaching', 'educating', 'training', 'schooling', 'tutoring', 'coaching',
    'mentoring', 'advising', 'counseling', 'guiding', 'leading', 'showing', 'demonstrating',
    'illustrating', 'explaining', 'describing', 'depicting', 'portraying', 'representing',
    'presenting', 'displaying', 'exhibiting', 'revealing', 'disclosing', 'unveiling', 'uncovering',
    'discovering', 'finding', 'locating', 'identifying', 'recognizing', 'knowing', 'understanding',
    'comprehending', 'grasping', 'apprehending', 'perceiving', 'discerning', 'distinguishing',
    'differentiating', 'discriminating', 'noticing', 'observing', 'seeing', 'witnessing',
    'watching', 'viewing', 'looking', 'beholding', 'observing', 'noticing', 'perceiving',
    'feeling', 'sensing', 'experiencing', 'undergoing', 'enduring', 'suffering', 'bearing',
    'standing', 'tolerating', 'withstanding', 'resisting', 'opposing', 'fighting', 'struggling',
    'competing', 'vying', 'contesting', 'disputing', 'debating', 'arguing', 'discussing',
    'negotiating', 'conferring', 'consulting', 'deliberating', 'considering', 'pondering',
    'reflecting', 'meditating', 'contemplating', 'thinking', 'reasoning', 'rationalizing',
    'analyzing', 'examining', 'investigating', 'exploring', 'probing', 'inquiring', 'questioning',
    'interrogating', 'interviewing', 'examining', 'scrutinizing', 'inspecting', 'checking',
}

# ================================
# HELPER FUNCTIONS
# ================================

def is_valid_word(word):
    """
    判断是否是合法英文单词
    """
    if not word:
        return False

    word_lower = word.lower()

    # Single letters are valid
    if len(word) == 1:
        return True

    # Pure numbers are valid
    if word.isdigit():
        return True

    # Acronyms and abbreviations (all caps, 2+ chars) are valid
    if word.isupper() and len(word) >= 2:
        return True

    # Check with wordfreq if available
    if HAS_WORDFREQ:
        return zipf_frequency(word_lower, "en") > MIN_WORD_FREQ

    # Fallback: check common words list
    return word_lower in COMMON_WORDS or len(word) <= 2


# ================================
# STEP 1 — FIX FRAGMENTATION
# ================================

def fix_fragmentation(text):
    """
    修复 unusual y → unusually
    修复 action s → actions
    """
    if not text:
        return text

    tokens = text.split()
    i = 0
    result = []

    while i < len(tokens):
        # Try to merge with next token if it forms a valid word
        if i < len(tokens) - 1:
            # Don't merge across punctuation
            if not re.search(r'[^\w]', tokens[i][-1]):
                combined = tokens[i] + tokens[i+1]
                if is_valid_word(combined):
                    result.append(combined)
                    i += 2
                    continue

        result.append(tokens[i])
        i += 1

    return " ".join(result)


# ================================
# STEP 2 — SEGMENT CONCATENATED WORDS
# ================================

def segment_word(word):
    """
    使用动态规划分割拼接单词
    """
    if len(word) > MAX_WORD_LENGTH:
        return word

    # Don't split if it's a number
    if word.isdigit():
        return word

    # Don't split acronyms
    if word.isupper() and len(word) >= 2:
        return word

    n = len(word)

    # Try common patterns first for efficiency
    # lowercase + uppercase (most common concatenation pattern)
    lower_upper_matches = list(re.finditer(r'([a-z]+)([A-Z][a-z]+)', word))
    if lower_upper_matches:
        parts = []
        last_end = 0
        for match in lower_upper_matches:
            if match.start() > last_end:
                parts.append(word[last_end:match.start()])
            parts.append(match.group(1))
            parts.append(match.group(2))
            last_end = match.end()
        if last_end < n:
            parts.append(word[last_end:])
        if all(is_valid_word(p) for p in parts if p):
            return " ".join(parts)

    # Dynamic programming approach for other cases
    dp = [{}] * (n + 1)
    dp[0] = {'segments': [], 'valid': True}

    for i in range(1, n + 1):
        for j in range(max(0, i - MAX_WORD_LENGTH), i):
            piece = word[j:i]
            if dp[j] and is_valid_word(piece):
                new_segments = dp[j]['segments'] + [piece]
                if not dp[i] or len(new_segments) < len(dp[i]['segments']):
                    dp[i] = {'segments': new_segments, 'valid': True}

    if dp[n] and len(dp[n]['segments']) > 1:
        return " ".join(dp[n]['segments'])
    else:
        return word


def fix_concatenation(text):
    """
    修复 regulationsoverridethe → regulations override the
    """
    if not text:
        return text

    tokens = text.split()
    result = []

    for token in tokens:
        # Don't split acronyms or numbers
        if (token.isupper() and len(token) >= 2) or token.isdigit():
            result.append(token)
            continue

        segmented = segment_word(token)
        result.append(segmented)

    return " ".join(result)


# ================================
# MAIN CLEANING FUNCTION
# ================================

def clean_text(text):
    """
    Complete text cleaning pipeline
    """
    if not text or not isinstance(text, str):
        return text

    # Step 1: Fix fragmentation (merge split words)
    text = fix_fragmentation(text)

    # Step 2: Fix concatenation (split merged words)
    text = fix_concatenation(text)

    # Step 3: Clean up whitespace
    text = re.sub(r'\s+', ' ', text).strip()

    return text


# ================================
# JSON SAFE PROCESSING
# ================================

def clean_json(obj):
    """
    Recursively clean all strings in JSON structure
    """
    if isinstance(obj, dict):
        return {k: clean_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_json(v) for v in obj]
    elif isinstance(obj, str):
        return clean_text(obj)
    else:
        return obj


# ================================
# RUN ON FILE
# ================================

def process_file(input_file, output_file=None):
    """
    Process questions.json file
    """
    input_path = Path(input_file)

    # Default output to same file if not specified
    if output_file is None:
        output_path = input_path
    else:
        output_path = Path(output_file)

    print(f"Loading: {input_path}")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    total_questions = len(data) if isinstance(data, list) else 1
    print(f"Total questions: {total_questions}")

    print("Cleaning JSON...")

    # Use progress bar if available, otherwise just process
    if HAS_TQDM and isinstance(data, list):
        data = [clean_json(q) for q in tqdm(data, desc="Processing questions")]
    else:
        data = clean_json(data)

    print(f"Saving: {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print("Done!")


# ================================
# ENTRY POINT
# ================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Default to questions.json if no arguments provided
        process_file("questions.json")
    elif len(sys.argv) == 2:
        process_file(sys.argv[1])
    elif len(sys.argv) == 3:
        process_file(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python ocr_cleaner.py [input.json] [output.json]")
        print("Default: python ocr_cleaner.py (processes questions.json in place)")
