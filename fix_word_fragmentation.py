#!/usr/bin/env python3
"""
Word Fragmentation Fixer for OCR Text

Fixes OCR errors where spaces were incorrectly inserted inside valid English words.
Examples: "action s" → "actions", "involve d" → "involved", "prosecut o r" → "prosecutor"
"""

import json
import re
from pathlib import Path


class WordFragmentationFixer:
    """Fix word fragmentation errors in OCR text"""

    def __init__(self):
        # Common English words that should never have internal spaces
        # These are the most frequent words in academic/business English
        self.valid_words = self._load_common_words()

        # Common fragmentation patterns to fix
        self.fragmentation_patterns = [
            # Single letter suffixes
            (r'(\w)\s+s\b', r'\1s'),  # word s → words
            (r'(\w{3,})\s+ed\b', r'\1ed'),  # word ed → worded
            (r'(\w{3,})\s+ing\b', r'\1ing'),  # word ing → wording
            (r'(\w{3,})\s+ion\b', r'\1ion'),  # word ion → wordion
            (r'(\w{3,})\s+er\b', r'\1er'),  # word er → worder
            (r'(\w{3,})\s+est\b', r'\1est'),  # word est → wordest
            (r'(\w{3,})\s+ly\b', r'\1ly'),  # word ly → wordly
            (r'(\w{3,})\s+ment\b', r'\1ment'),  # word ment → wordment
            (r'(\w{3,})\s+ness\b', r'\1ness'),  # word ness → wordness
            (r'(\w{3,})\s+ful\b', r'\1ful'),  # word ful → wordful
            (r'(\w{3,})\s+less\b', r'\1less'),  # word less → wordless
            (r'(\w{3,})\s+able\b', r'\1able'),  # word able → wordable
            (r'(\w{3,})\s+ible\b', r'\1ible'),  # word ible → wordible
            (r'(\w{3,})\s+ive\b', r'\1ive'),  # word ive → wordive
            (r'(\w{3,})\s+ous\b', r'\1ous'),  # word ous → wordous
            (r'(\w{3,})\s+al\b', r'\1al'),  # word al → wordal
            (r'(\w{3,})\s+ial\b', r'\1ial'),  # word ial → wordial
            (r'(\w{3,})\s+ity\b', r'\1ity'),  # word ity → wordity
            (r'(\w{3,})\s+ty\b', r'\1ty'),  # word ty → wordty
            (r'(\w{3,})\s+ance\b', r'\1ance'),  # word ance → wordance
            (r'(\w{3,})\s+ence\b', r'\1ence'),  # word ence → wordence
            (r'(\w{3,})\s+ant\b', r'\1ant'),  # word ant → wordant
            (r'(\w{3,})\s+ent\b', r'\1ent'),  # word ent → wordent
            (r'(\w{3,})\s+ize\b', r'\1ize'),  # word ize → wordize
            (r'(\w{3,})\s+ate\b', r'\1ate'),  # word ate → wordate
            (r'(\w{3,})\s+ure\b', r'\1ure'),  # word ure → wordure
            (r'(\w{3,})\s+ary\b', r'\1ary'),  # word ary → wordary
            (r'(\w{3,})\s+ory\b', r'\1ory'),  # word ory → wordory
            (r'(\w{3,})\s+ism\b', r'\1ism'),  # word ism → wordism
            (r'(\w{3,})\s+ist\b', r'\1ist'),  # word ist → wordist
            (r'(\w{3,})\s+ism\b', r'\1ism'),  # word ism → wordism
            (r'(\w{3,})\s+tion\b', r'\1tion'),  # word tion → wordtion
            (r'(\w{3,})\s+sion\b', r'\1sion'),  # word sion → wordsion
            (r'(\w{3,})\s+ment\b', r'\1ment'),  # word ment → wordment
            (r'(\w{3,})\s+dom\b', r'\1dom'),  # word dom → worddom
            (r'(\w{3,})\s+ship\b', r'\1ship'),  # word ship → wordship
            (r'(\w{3,})\s+hood\b', r'\1hood'),  # word hood → wordhood

            # Single letter fragments (common in OCR)
            (r'\b(\w{3,})\s+s\b', r'\1s'),  # word s → words
            (r'\b(\w{3,})\s+d\b', r'\1d'),  # word d → wordd (past tense)
            (r'\b(\w{4,})\s+e\b', r'\1e'),  # word e → worde (silent e)
            (r'\b(\w{3,})\s+r\b', r'\1r'),  # word r → wordr (comparative)
            (r'\b(\w{3,})\s+t\b', r'\1t'),  # word t → wordt (past tense)
            (r'\b(\w{3,})\s+n\b', r'\1n'),  # word n → wordn (participle)

            # Common specific fragmentations
            (r'action\s+s\b', 'actions'),
            (r'involve\s+d\b', 'involved'),
            (r'freeze\s+(\w+)\s+e\b', r'freeze\1'),  # freeze d → freezed
            (r'asset\s+s\b', 'assets'),
            (r'account\s+s\b', 'accounts'),
            (r'geographica\s+l\b', 'geographical'),
            (r'precautionar\s+y\b', 'precautionary'),
            (r'benefic\s+iari\s+es\b', 'beneficiaries'),
            (r'froze\s+n\b', 'frozen'),
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
            (r'regular\s+l\s+y\b', 'regularly'),
            (r'essentia\s+l\s+y\b', 'essentially'),
            (r'genera\s+l\s+y\b', 'generally'),
            (r'usua\s+l\s+y\b', 'usually'),
            (r'actua\s+l\s+y\b', 'actually'),
            (r'eventua\s+l\s+y\b', 'eventually'),
            (r'specia\s+l\s+y\b', 'specially'),
            (r'essentia\s+l\s+y\b', 'essentially'),
            (r'additiona\s+l\s+y\b', 'additionally'),
            (r'technica\s+l\s+y\b', 'technically'),
            (r'specifica\s+l\s+y\b', 'specifically'),
            (r'pratica\s+l\s+y\b', 'practically'),
            (r'logica\s+l\s+y\b', 'logically'),
            (r'physica\s+l\s+y\b', 'physically'),
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
            (r'applica\s+n\s+t\b', 'applicant'),
            (r'communica\s+t\s+ion\b', 'communication'),
            (r'communica\s+t\s+e\b', 'communicate'),
            (r'reporta\s+t\s+ion\b', 'reportation'),
            (r'administra\s+t\s+ion\b', 'administration'),
            (r'administra\s+t\s+or\b', 'administrator'),
            (r'supervisio\s+n\b', 'supervision'),
            (r'superviso\s+r\b', 'supervisor'),
            (r'executio\s+n\b', 'execution'),
            (r'executi\s+v\s+e\b', 'executive'),
            (r'permissio\s+n\b', 'permission'),
            (r'commissio\s+n\b', 'commission'),
            (r'commissio\s+n\s+er\b', 'commissioner'),
            (r'assessme\s+n\s+t\b', 'assessment'),
            (r'assista\s+n\s+ce\b', 'assistance'),
            (r'assista\s+n\s+t\b', 'assistant'),
            (r'departme\s+n\s+t\b', 'department'),
            (r'govername\s+n\s+t\b', 'government'),
            (r'enforceme\s+n\s+t\b', 'enforcement'),
            (r'requireme\s+n\s+t\b', 'requirement'),
            (r'orienta\s+t\s+ion\b', 'orientation'),
            (r'directi\s+v\s+e\b', 'directive'),
            (r'jurisdictio\s+n\b', 'jurisdiction'),
            (r'transactio\s+n\b', 'transaction'),
            (r'relatio\s+n\s+ship\b', 'relationship'),
            (r'partnershi\s+p\b', 'partnership'),
            (r'membershi\s+p\b', 'membership'),
            (r'ownershi\s+p\b', 'ownership'),
            (r'citizenshi\s+p\b', 'citizenship'),
            (r'leadershi\s+p\b', 'leadership'),
            (r'readines\s+s\b', 'readiness'),
            (r'willingne\s+s\s+b\b', 'willingness'),
            (r'awarene\s+s\s+b\b', 'awareness'),
            (r'busines\s+s\b', 'business'),
            (r'witnes\s+s\b', 'witness'),
            (r'addres\s+s\b', 'address'),
            (r'proces\s+s\b', 'process'),
            (r'acces\s+s\b', 'access'),
            (r'succes\s+s\b', 'success'),
            (r'interes\s+t\b', 'interest'),
            (r'differe\s+n\s+ce\b', 'difference'),
            (r'importa\s+n\s+ce\b', 'importance'),
            (r'significa\s+n\s+ce\b', 'significance'),
            (r'correspo\s+n\s+dence\b', 'correspondence'),
            (r'interpreta\s+t\s+ion\b', 'interpretation'),
            (r'administra\s+t\s+ive\b', 'administrative'),
            (r'investiga\s+t\s+ive\b', 'investigative'),
            (r'organiza\s+t\s+ional\b', 'organizational'),
            (r'opera\s+t\s+ional\b', 'operational'),
            (r'transactio\s+n\s+al\b', 'transactional'),
            (r'additio\s+n\s+al\b', 'additional'),
            (r'origi\s+n\s+al\b', 'original'),
            (r'financia\s+l\b', 'financial'),
            (r'commercia\s+l\b', 'commercial'),
            (r'industria\s+l\b', 'industrial'),
            (r'professio\s+n\s+al\b', 'professional'),
            (r'confidentia\s+l\b', 'confidential'),
            (r'essentia\s+l\b', 'essential'),
            (r'materia\s+l\b', 'material'),
            (r'potentia\s+l\b', 'potential'),
            (r'existentia\s+l\b', 'existential'),
            (r'substantia\s+l\b', 'substantial'),
            (r'informatio\s+n\s+al\b', 'informational'),
            (r'educatio\s+n\s+al\b', 'educational'),
            (r'operatio\s+n\s+al\b', 'operational'),
            (r'nationa\s+l\b', 'national'),
            (r'interna\s+t\s+ional\b', 'international'),
            (r'functio\s+n\s+al\b', 'functional'),
            (r'conventio\s+n\s+al\b', 'conventional'),
            (r'technica\s+l\b', 'technical'),
            (r'analytica\s+l\b', 'analytical'),
            (r'critica\s+l\b', 'critical'),
            (r'radica\s+l\b', 'radical'),
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
            (r'abnorma\s+l\b', 'abnormal'),
            (r'fina\s+l\b', 'final'),
            (r'forma\s+l\b', 'formal'),
            (r'informa\s+l\b', 'informal'),
            (r'persona\s+l\b', 'personal'),
            (r'additio\s+n\s+a\s+l\b', 'additional'),
            (r'conditio\s+n\s+a\s+l\b', 'conditional'),
            (r'traditio\s+n\s+a\s+l\b', 'traditional'),
            (r'functio\s+n\s+a\s+l\b', 'functional'),
            (r'emotio\s+n\s+a\s+l\b', 'emotional'),
            (r'rationa\s+l\b', 'rational'),
            (r'irrationa\s+l\b', 'irrational'),
            (r'natura\s+l\b', 'natural'),
            (r'legisla\s+t\s+ive\b', 'legislative'),
            (r'executi\s+v\s+e\b', 'executive'),
            (r'detecti\s+v\s+e\b', 'detective'),
            (r'negati\s+v\s+e\b', 'negative'),
            (r'positi\s+v\s+e\b', 'positive'),
            (r'acti\s+v\s+e\b', 'active'),
            (r'effecti\s+v\s+e\b', 'effective'),
            (r'prod u ct\b', 'product'),
            (r'servi ce\b', 'service'),
            (r'practi ce\b', 'practice'),
            (r'noti ce\b', 'notice'),
            (r'offen ce\b', 'offense'),
            (r'defen se\b', 'defense'),
            (r'ser vice\b', 'service'),
            (r'provi de\b', 'provide'),
            (r'gui de\b', 'guide'),
            (r'assi st\b', 'assist'),
            (r'assi stant\b', 'assistant'),
            (r'consi st\b', 'consist'),
            (r'exist\b', 'exist'),
            (r'froze\b', 'freeze'),
            (r'rece ive\b', 'receive'),
            (r'ache ive\b', 'achieve'),
            (r'bel ie ve\b', 'believe'),
            (r'per cei ve\b', 'perceive'),
            (r'con cei ve\b', 'conceive'),
            (r'pri eve\b', 'priest'),
            (r'wei gh\b', 'weigh'),
            (r'hei gh\b', 'height'),
            (r'forei gn\b', 'foreign'),
            (r'soverei gn\b', 'sovereign'),
            (r'reign\b', 'reign'),
            (r'dei gn\b', 'deign'),
            (r'si gn\b', 'sign'),
            (r'assi gn\b', 'assign'),
            (r'desi gn\b', 'design'),
            (r'resi gn\b', 'resign'),
        ]

    def _load_common_words(self):
        """Load common English words for validation"""
        # A comprehensive list of common English words
        return {
            # Common verbs (past tense and -ed forms)
            'actions', 'added', 'asked', 'based', 'called', 'caused', 'changed', 'claimed',
            'completed', 'composed', 'computed', 'conducted', 'confirmed', 'connected',
            'consisted', 'constructed', 'contained', 'continued', 'controlled', 'converted',
            'cooperated', 'coordinated', 'corrected', 'corresponded', 'created', 'crossed',
            'decided', 'decreased', 'defended', 'defined', 'delivered', 'demanded', 'depended',
            'described', 'designed', 'destroyed', 'detected', 'determined', 'developed', 'died',
            'differentiated', 'directed', 'discovered', 'discussed', 'displayed', 'disputed',
            'distinguished', 'distributed', 'divided', 'doubled', 'drafted', 'drawn', 'dreamed',
            'dressed', 'dropped', 'earned', 'edited', 'educated', 'elected', 'emailed',
            'embarrassed', 'emerged', 'emphasized', 'employed', 'enabled', 'encouraged',
            'ended', 'engaged', 'enhanced', 'enjoyed', 'entered', 'established', 'estimated',
            'evaluated', 'examined', 'exceeded', 'exchanged', 'excited', 'excluded', 'exercised',
            'existed', 'expanded', 'expected', 'experienced', 'explained', 'explored',
            'expressed', 'extended', 'faced', 'failed', 'feared', 'federated', 'filled',
            'finished', 'fixed', 'focused', 'followed', 'forced', 'foresee', 'forgot',
            'formed', 'found', 'framed', 'freezed', 'frozen', 'fulfilled', 'funded',
            'gained', 'gathered', 'generated', 'governed', 'graded', 'granted', 'grounded',
            'grouped', 'guided', 'handled', 'hanged', 'happened', 'harmed', 'hated',
            'headed', 'heard', 'helped', 'hesitated', 'hidden', 'highlighted', 'hired',
            'held', 'hooked', 'hoped', 'identified', 'ignored', 'illustrated', 'imagined',
            'implemented', 'implied', 'imported', 'imposed', 'improved', 'included', 'inconvenienced',
            'increased', 'indicated', 'inferred', 'informed', 'infuriated', 'inhabited', 'inherited',
            'initiated', 'injected', 'injured', 'inquired', 'inserted', 'insisted', 'inspired',
            'installed', 'instituted', 'instructed', 'insured', 'integrated', 'intended',
            'interacted', 'intercepted', 'interchanged', 'interpreted', 'interrupted',
            'interviewed', 'introduced', 'invented', 'invested', 'investigated', 'invited',
            'involved', 'ironed', 'irritated', 'issued', 'joined', 'judged', 'jumped',
            'justified', 'kept', 'kicked', 'killed', 'kissed', 'knocked', 'labeled',
            'landed', 'lasted', 'laughed', 'launched', 'lawyered', 'leaked', 'learned',
            'leaved', 'lended', 'lent', 'leveled', 'licensed', 'licked', 'lifted',
            'liked', 'limited', 'lined', 'linked', 'listed', 'listened', 'lived',
            'loaded', 'loaned', 'located', 'locked', 'logged', 'longed', 'looked',
            'looped', 'lost', 'loved', 'lowered', 'maintained', 'managed', 'mandated',
            'manifested', 'manipulated', 'marched', 'marked', 'marketed', 'masked',
            'mastered', 'matched', 'mattered', 'measured', 'mediated', 'medicated',
            'met', 'missed', 'mistook', 'mixed', 'mobilized', 'modeled', 'moderated',
            'modified', 'monitored', 'motivated', 'mounted', 'moved', 'multiplied', 'murdered',
            'navigated', 'needed', 'neglected', 'negotiated', 'nervous', 'nested', 'neutralized',
            'nominated', 'normalized', 'noticed', 'notified', 'numbered', 'objected', 'obligated',
            'observed', 'obtained', 'occupied', 'occurred', 'offended', 'offered', 'official',
            'offset', 'omitted', 'opened', 'operated', 'ordered', 'organized', 'oriented',
            'originated', 'owned', 'packed', 'paired', 'paralyzed', 'paramount', 'parented',
            'parted', 'passed', 'patented', 'patrolled', 'paused', 'payed', 'peaked',
            'penalized', 'perceived', 'performed', 'perfumed', 'perhaps', 'period', 'perished',
            'permitted', 'persisted', 'personal', 'persuaded', 'phased', 'phoned', 'photographed',
            'picked', 'pinched', 'pitched', 'placed', 'plain', 'planned', 'played',
            'pleaded', 'pledged', 'plotted', 'plugged', 'pointed', 'poisoned', 'policed',
            'polished', 'politicked', 'polluted', 'popped', 'ported', 'positioned', 'possessed',
            'posted', 'postponed', 'pounded', 'practiced', 'praised', 'prayed', 'preferred',
            'prepared', 'presented', 'preserved', 'pressed', 'pretended', 'prevented', 'priced',
            'printed', 'prioritized', 'prisoned', 'processed', 'produced', 'profited', 'programmed',
            'progressed', 'projected', 'promised', 'promoted', 'proofread', 'proper', 'proposed',
            'prosecuted', 'protected', 'protested', 'provided', 'provoked', 'published', 'pulled',
            'pumped', 'purchased', 'pursed', 'pushed', 'put', 'puzzled', 'qualified',
            'questioned', 'queued', 'quoted', 'raced', 'radical', 'radiated', 'raised',
            'rallied', 'rammed', 'ranged', 'ranked', 'rated', 'rationed', 'reached',
            'reacted', 'read', 'realized', 'reasoned', 'received', 'reckoned', 'recognized',
            'recommended', 'reconciled', 'reconstructed', 'recovered', 'recruited', 'rectified',
            'recycled', 'reduced', 'referred', 'reflected', 'refused', 'regarded', 'registered',
            'regulated', 'reinforced', 'rejected', 'related', 'released', 'relied', 'relieved',
            'relaxed', 'remained', 'remarked', 'remedied', 'remembered', 'reminded', 'removed',
            'rendered', 'rented', 'reopened', 'repaired', 'repeated', 'replaced', 'replied',
            'reported', 'represented', 'reproduced', 'republic', 'requested', 'required',
            'rescued', 'researched', 'reserved', 'resided', 'resolved', 'resorted', 'resourced',
            'respected', 'responded', 'restored', 'restricted', 'resulted', 'resumed', 'retained',
            'retired', 'retreated', 'returned', 'revealed', 'revered', 'reversed', 'reviewed',
            'revised', 'revived', 'revolted', 'rewarded', 'rhetorical', 'rhythm', 'rhythms',
            'rich', 'ridiculed', 'rifle', 'rang', 'rung', 'rioted', 'ripened', 'risked',
            'ritual', 'rival', 'roared', 'roasted', 'robbed', 'rocked', 'rolled',
            'roman', 'roofed', 'roomed', 'rooted', 'rope', 'rotated', 'rotted',
            'rough', 'rounded', 'routed', 'rowed', 'rubbed', 'ruined', 'ruled',
            'rumored', 'run', 'rushed', 'sacred', 'sacrificed', 'saddled', 'said',
            'sailed', 'sainted', 'saked', 'saluted', 'sampled', 'sand', 'sanded',
            'sang', 'sank', 'satisfied', 'saved', 'sawed', 'scaled', 'scanned', 'scared',
            'scattered', 'schemed', 'schooled', 'scored', 'scolded', 'scooped', 'scoped',
            'scorched', 'scraped', 'screamed', 'screened', 'screwed', 'scripted', 'scrubbed',
            'scrolled', 'scrubbed', 'sealed', 'searched', 'seasoned', 'seated', 'seconded',
            'secret', 'sectioned', 'secured', 'seed', 'seeing', 'sought', 'seized',
            'select', 'selected', 'selfish', 'seldom', 'selected', 'self', 'sell',
            'semifinal', 'senior', 'sensed', 'sentenced', 'separated', 'sequenced', 'served',
            'set', 'settled', 'severed', 'sewed', 'shaded', 'shadowed', 'shaken',
            'shaped', 'shared', 'sharpened', 'shaved', 'sheared', 'shed', 'sheet',
            'shelf', 'shelled', 'sheltered', 'shepherded', 'shined', 'shipped',
            'shivered', 'shocked', 'shook', 'shoot', 'shopped', 'shortened', 'shot',
            'should', 'shouted', 'showed', 'shredded', 'shrieked', 'shrugged', 'shrunk',
            'shut', 'sided', 'sieged', 'sifted', 'sighed', 'signaled', 'signed',
            'silenced', 'simplified', 'simplified', 'simplified', 'simulated', 'sincere',
            'singed', 'singled', 'sink', 'sipped', 'sit', 'situated', 'sized',
            'sketch', 'skied', 'skilled', 'skinned', 'skipped', 'skirted', 'skirted',
            'sky', 'slammed', 'slapped', 'slashed', 'slaughtered', 'slave', 'slept',
            'sliced', 'slid', 'slight', 'slipped', 'slit', 'slowed', 'slung',
            'slipped', 'smashed', 'smelled', 'smiled', 'smith', 'smoked', 'snapped',
            'sneaked', 'sneezed', 'sniffed', 'soaked', 'soaped', 'soared', 'sobbed',
            'soccer', 'social', 'softened', 'soiled', 'sold', 'solely', 'solid',
            'solved', 'somewhat', 'someday', 'sounded', 'souled', 'sought', 'found',
            'sourced', 'south', 'southern', 'spaced', 'spared', 'sparked', 'spat',
            'spawn', 'speak', 'speaked', 'special', 'specialized', 'specified', 'speech',
            'speed', 'spelled', 'spilled', 'spined', 'spiral', 'spiraled', 'spirit',
            'spit', 'split', 'spoil', 'spoke', 'spoken', 'sponsor', 'spoon', 'spot',
            'sprayed', 'spread', 'spring', 'sprang', 'sprung', 'spurred', 'spun',
            'squared', 'squeaked', 'squealed', 'squeezed', 'stabilized', 'stacked', 'staffed',
            'staged', 'stained', 'stair', 'stamped', 'standing', 'star', 'stared',
            'started', 'starved', 'stated', 'stayed', 'steadied', 'stole', 'stolen',
            'stood', 'stopped', 'stored', 'stormed', 'story', 'straightened', 'strained',
            'stranded', 'strange', 'strangled', 'strapped', 'straw', 'streaked', 'streamed',
            'street', 'strength', 'stressed', 'stretched', 'stripped', 'stroke', 'struck',
            'structured', 'struggled', 'stuck', 'studied', 'stuffed', 'stumbled', 'subject',
            'submitted', 'subscribed', 'substituted', 'subtracted', 'succeeded', 'suck',
            'suffered', 'sugar', 'suggested', 'suicidal', 'suicide', 'suit', 'summarized',
            'summary', 'summer', 'summoned', 'sunned', 'super', 'supplied', 'support',
            'supposed', 'supreme', 'sure', 'surfaced', 'surged', 'surpassed', 'surprised',
            'surrendered', 'surrounded', 'surveyed', 'survived', 'suspected', 'suspended',
            'sustained', 'swallowed', 'swamped', 'swear', 'sweated', 'swept', 'swift',
            'swim', 'swimming', 'swore', 'sword', 'swung', 'switch', 'sworn', 'symbol',
            'sympathized', 'symptom', 'syndrome', 'system', 'tabulated', 'tack', 'tackled',
            'tactic', 'tactical', 'tagged', 'tailored', 'taken', 'talked', 'tall',
            'tanked', 'tapped', 'targeted', 'tasted', 'taught', 'tax', 'taxed',
            'teached', 'tearing', 'teased', 'technical', 'technique', 'technology', 'teeth',
            'telephoned', 'told', 'temper', 'temporal', 'temporary', 'tempted', 'ten',
            'tended', 'tender', 'tension', 'tent', 'term', 'terminated', 'termed',
            'terrible', 'terrified', 'terrified', 'territory', 'terror', 'test', 'tested',
            'text', 'thank', 'thanked', 'theater', 'theft', 'their', 'them', 'theme',
            'then', 'theory', 'therapy', 'there', 'thermal', 'thick', 'thief', 'thigh',
            'thin', 'thing', 'think', 'third', 'thirst', 'thirty', 'this', 'thorn',
            'those', 'though', 'thought', 'thousand', 'threat', 'three', 'thrift',
            'thrill', 'thrive', 'throat', 'throne', 'throw', 'thrown', 'thumb',
            'thunder', 'thursday', 'thus', 'ticket', 'tide', 'tie', 'tier', 'tiger',
            'tight', 'tile', 'till', 'tilted', 'timber', 'time', 'timed', 'timing',
            'tin', 'tiny', 'tip', 'tipped', 'tire', 'tired', 'tissue', 'title',
            'to', 'toast', 'toilet', 'token', 'told', 'tolerated', 'toll', 'tomato',
            'tomb', 'ton', 'tone', 'tongue', 'tonight', 'tool', 'tooth', 'top',
            'topic', 'topped', 'torch', 'total', 'totaled', 'touched', 'tough', 'tour',
            'towed', 'towel', 'tower', 'town', 'toxic', 'toy', 'trace', 'track',
            'tracked', 'tract', 'trade', 'traffic', 'tragedy', 'trail', 'train',
            'traitor', 'tram', 'transfer', 'transform', 'transformed', 'transit', 'translate',
            'transmission', 'transmit', 'transport', 'transported', 'trap', 'trash',
            'trauma', 'travel', 'traveled', 'tray', 'treat', 'treated', 'treatment',
            'treaty', 'tree', 'trek', 'trembled', 'tremendous', 'trial', 'triangle',
            'tribe', 'tribunal', 'trick', 'tricked', 'tried', 'trim', 'trip',
            'triple', 'troop', 'trophy', 'tropic', 'tropical', 'trouble', 'trough',
            'truck', 'true', 'trumpet', 'trunk', 'trust', 'truth', 'try', 'tube',
            'tuck', 'tuft', 'tug', 'tuesday', 'tuition', 'tumble', 'tumor', 'tune',
            'tunnel', 'turbine', 'turn', 'turned', 'turtle', 'twelve', 'twenty', 'twice',
            'twin', 'twist', 'two', 'type', 'typical', 'tying', 'tyrant', 'ugly',
            'ultimate', 'umbrella', 'unable', 'unacceptable', 'unaware', 'uncertain',
            'unchanged', 'unclear', 'uncle', 'uncomfortable', 'uncommon', 'unconscious',
            'under', 'undergo', 'undergone', 'underground', 'underline', 'underlined',
            'underlying', 'undermine', 'understand', 'understood', 'undertake', 'undertaken',
            'undertaking', 'undo', 'undone', 'undue', 'uneasy', 'unemployment', 'unexpected',
            'unfair', 'unfolded', 'unhappy', 'unified', 'uniform', 'unify', 'union',
            'unique', 'unit', 'unite', 'united', 'unity', 'universal', 'universe',
            'university', 'unknown', 'unlawful', 'unless', 'unlike', 'unlikely', 'unlimited',
            'unload', 'unlock', 'unnoticed', 'unprecedented', 'unpredictable', 'unprepared',
            'unpleasant', 'unpopular', 'unprecedented', 'unprepared', 'unproductive', 'unprofitable',
            'unreal', 'unreasonable', 'unresolved', 'unrest', 'unsafe', 'unsatisfactory',
            'unsaved', 'unseen', 'unspeakable', 'unspecific', 'unstable', 'unsuccessful',
            'unsure', 'untied', 'until', 'untold', 'unusual', 'unveil', 'unveiled',
            'unwanted', 'unwilling', 'unwise', 'unworthy', 'unwritten', 'up', 'update',
            'updated', 'upgrade', 'upheld', 'uphold', 'upon', 'upper', 'upright',
            'uproar', 'upset', 'upside', 'upstairs', 'upstart', 'upstream', 'upward',
            'urban', 'urge', 'urgent', 'urgency', 'urn', 'usage', 'use', 'used',
            'useful', 'useless', 'user', 'usual', 'usually', 'utility', 'utilize',
            'utmost', 'utter', 'vacant', 'vacation', 'vacuum', 'vague', 'vain', 'valid',
            'valley', 'valuable', 'value', 'valued', 'van', 'vanish', 'vanity',
            'vapor', 'variable', 'variety', 'various', 'vary', 'varying', 'vase',
            'vast', 'vault', 'vector', 'vegan', 'vein', 'velvet', 'vendor',
            'venture', 'venue', 'verb', 'verbal', 'verbalized', 'verdict', 'verge',
            'verify', 'verse', 'version', 'vertical', 'very', 'vessel', 'vest',
            'vet', 'veteran', 'via', 'viable', 'vibrant', 'vice', 'victim',
            'victory', 'video', 'view', 'viewed', 'vigor', 'vile', 'village',
            'villain', 'vine', 'vinyl', 'violate', 'violated', 'violence', 'violent',
            'violet', 'violin', 'virtual', 'virtually', 'virus', 'visa', 'visible',
            'vision', 'visit', 'visited', 'visual', 'vital', 'vitamin', 'vivacity',
            'vivid', 'vocabulary', 'vocal', 'voice', 'void', 'volcano', 'volley',
            'volume', 'voluntary', 'volunteer', 'vote', 'voted', 'vowel', 'voyage',
            'wage', 'wager', 'wage', 'wagon', 'waist', 'wait', 'waited', 'waiter',
            'wake', 'walk', 'walked', 'wall', 'wallet', 'wander', 'want', 'wanted',
            'war', 'warm', 'warn', 'warned', 'warrant', 'warranty', 'warrior',
            'wash', 'waste', 'wasted', 'watch', 'water', 'waved', 'way',
            'weak', 'wealth', 'weapon', 'wear', 'weary', 'weather', 'weave',
            'web', 'wedding', 'wedge', 'wednesday', 'weed', 'week', 'weekly',
            'weep', 'weigh', 'weighed', 'weight', 'weird', 'welcome', 'weld',
            'welfare', 'well', 'west', 'western', 'wet', 'whale', 'what',
            'wheat', 'wheel', 'when', 'where', 'whereas', 'whether', 'which',
            'while', 'whim', 'whine', 'whip', 'whisper', 'whispered', 'whistle',
            'white', 'who', 'whole', 'wholesale', 'whom', 'whose', 'why',
            'wicked', 'wide', 'widen', 'widely', 'widespread', 'widow', 'width',
            'wife', 'wild', 'will', 'willing', 'win', 'wind', 'window', 'wine',
            'wing', 'wink', 'winner', 'winter', 'wipe', 'wire', 'wisdom', 'wise',
            'wish', 'wit', 'witch', 'with', 'withdraw', 'withdrawn', 'within',
            'without', 'witness', 'witnessed', 'wolf', 'woman', 'wonder', 'wood',
            'wool', 'word', 'work', 'worked', 'worker', 'working', 'workshop',
            'world', 'worry', 'worse', 'worst', 'worth', 'worthy', 'would',
            'wound', 'wrap', 'wrapped', 'wrapper', 'wrath', 'wreath', 'wreck',
            'wrist', 'write', 'writer', 'written', 'wrong', 'wrote', 'yard',
            'yarn', 'year', 'yell', 'yellow', 'yes', 'yield', 'yielded', 'yoga',
            'yogurt', 'yoke', 'yolk', 'you', 'young', 'your', 'yours', 'youth',
            'zebra', 'zero', 'zone', 'zoo', 'zoom', 'zoomed',
        }

    def fix_word_fragmentation(self, text):
        """Fix word fragmentation in text"""
        if not text or not isinstance(text, str):
            return text

        result = text

        # Apply all fragmentation patterns
        for pattern, replacement in self.fragmentation_patterns:
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

        return result


def fix_question_data(q, fixer):
    """Fix word fragmentation in all text fields of a question"""
    changed = False

    # Fix question text
    if 'question' in q:
        original = q['question']
        q['question'] = fixer.fix_word_fragmentation(q['question'])
        if q['question'] != original:
            changed = True

    # Fix domain
    if 'domain' in q:
        original = q['domain']
        q['domain'] = fixer.fix_word_fragmentation(q['domain'])
        if q['domain'] != original:
            changed = True

    # Fix explanation
    if 'explanation' in q:
        original = q['explanation']
        q['explanation'] = fixer.fix_word_fragmentation(q['explanation'])
        if q['explanation'] != original:
            changed = True

    # Fix AI explanations
    if 'explanation_ai_en' in q:
        original = q['explanation_ai_en']
        q['explanation_ai_en'] = fixer.fix_word_fragmentation(q['explanation_ai_en'])
        if q['explanation_ai_en'] != original:
            changed = True

    if 'explanation_ai_ch' in q:
        original = q['explanation_ai_ch']
        q['explanation_ai_ch'] = fixer.fix_word_fragmentation(q['explanation_ai_ch'])
        if q['explanation_ai_ch'] != original:
            changed = True

    # Fix options
    if 'options' in q:
        for opt_letter in q['options']:
            original = q['options'][opt_letter]
            q['options'][opt_letter] = fixer.fix_word_fragmentation(q['options'][opt_letter])
            if q['options'][opt_letter] != original:
                changed = True

    return q, changed


def main():
    json_path = Path('questions.json')

    print("=" * 60)
    print("Word Fragmentation Fixer for questions.json")
    print("=" * 60)

    # Load questions
    print(f"\nLoading questions from: {json_path}")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Total questions: {len(data)}")

    # Initialize fixer
    fixer = WordFragmentationFixer()

    # Fix all questions
    print("\nFixing word fragmentation...")
    fixed_count = 0

    for i, q in enumerate(data):
        q, changed = fix_question_data(q, fixer)
        data[i] = q
        if changed:
            fixed_count += 1
            if fixed_count <= 20:  # Show first 20 fixes
                print(f"  Fixed question {q.get('id')}: {q.get('question', '')[:60]}...")

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
