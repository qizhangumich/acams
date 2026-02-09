#!/usr/bin/env python3
"""
Comprehensive text normalization script for ACAMS questions.json
Fixes word concatenation errors from OCR/copy-paste
"""

import json
import re
import sys

def load_json(file_path: str) -> dict:
    """Load JSON file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data: dict, file_path: str) -> None:
    """Save JSON file with proper formatting"""
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def fix_word_boundaries(text: str) -> str:
    """Fix common word boundary issues"""
    if not text:
        return text

    result = text

    # Fix reverse concatenations (spaces added inside legitimate words)
    # These are cases where OCR added a space in the middle of a word
    # Apply these FIRST before any other patterns
    reverse_fixes = [
        (r'\binform ation', 'information'),
        (r'\bform ation', 'formation'),
        (r'\bsec urity', 'security'),
        (r'\bcompli ance', 'compliance'),
        (r'\bopera tions', 'operations'),
        (r'\bfin ance', 'finance'),
        (r'\bmar keting', 'marketing'),
        (r'\bsales\b', 'sales'),  # keep sales as is
        (r'\btech nology', 'technology'),
        (r'\bprod uct', 'product'),
        (r'\bengi neering', 'engineering'),
        (r'\bresearch\b', 'research'),  # keep research as is
        (r'\bdevel opment', 'development'),
        (r'\bau dit', 'audit'),
        (r'\bacc ounting', 'accounting'),
        (r'\bhu man', 'human'),
        (r'\bresour ces', 'resources'),
        (r'\bchallen ge', 'challenge'),
        (r'\bconcer ned', 'concerned'),
        (r'\binter est', 'interest'),
        (r'\bimpor tance', 'importance'),
        (r'\bessen tial', 'essential'),
        (r'\bnece ssary', 'necessary'),
        (r'\bimpor tant', 'important'),
        (r'\bsig nificant', 'significant'),
        (r'\bacci dentally', 'accidentally'),
        (r'\baccou nting', 'accounting'),
        (r'\baddi tional', 'additional'),
        (r'\badmini stration', 'administration'),
        (r'\badvisory', 'advisory'),
        (r'\bappro ach', 'approach'),
        (r'\bappro priate', 'appropriate'),
        (r'\bassoc iation', 'association'),
        (r'\bautho rity', 'authority'),
        (r'\bavail able', 'available'),
        (r'\bcharac teristic', 'characteristic'),
        (r'\bcompen sation', 'compensation'),
        (r'\bcompli ance', 'compliance'),
        (r'\bconse quence', 'consequence'),
        (r'\bconsi der', 'consider'),
        (r'\bconti nue', 'continue'),
        (r'\bconve nience', 'convenience'),
        (r'\bcorpo rate', 'corporate'),
        (r'\bcurr ency', 'currency'),
        (r'\bdecla ration', 'declaration'),
        (r'\bdefi nition', 'definition'),
        (r'\bdepart ment', 'department'),
        (r'\bdesc ription', 'description'),
        (r'\bdevia tion', 'deviation'),
        (r'\bdiscri mination', 'discrimination'),
        (r'\bdocu mentation', 'documentation'),
        (r'\benforcement', 'enforcement'),
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
        (r'\bpermit ting', 'permitting'),
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
        (r'\bsecur ity', 'security'),
        (r'\bsimi lar', 'similar'),
        (r'\bsitu ation', 'situation'),
        (r'\bspecia lized', 'specialized'),
        (r'\bstruc ture', 'structure'),
        (r'\bsugge stion', 'suggestion'),
        (r'\bsuper vision', 'supervision'),
        (r'\btransa ction', 'transaction'),
        (r'\btransfe rring', 'transferring'),
        (r'\btransfor mation', 'transformation'),
        (r'\btrans mission', 'transmission'),
        (r'\btranspa rency', 'transparency'),
        (r'\bunder stand', 'understand'),
        (r'\bunder standing', 'understanding'),
        (r'\busually', 'usually'),
        (r'\bvaria tion', 'variation'),
        (r'\bwithdra wal', 'withdrawal'),
        (r'\bwithdra wing', 'withdrawing'),
    ]

    for pattern, replacement in reverse_fixes:
        old_result = result
        result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        # Debug: print if something changed
        if old_result != result and 'inform' in old_result.lower():
            print(f"DEBUG: Applied pattern '{pattern}' - changed text")

    # 1. Fix lowercase letter followed by uppercase letter (most common OCR error)
    result = re.sub(r'([a-z])([A-Z][a-z])', r'\1 \2', result)

    # 2. Fix number followed by letter
    result = re.sub(r'(\d)([A-Za-z])', r'\1 \2', result)

    # 3. Fix common function word concatenations
    # These are the most common patterns: the/a/an/of/to/for/in/on/at/by/with/from/and/or/as + word
    function_words = ['the', 'a', 'an', 'of', 'to', 'for', 'in', 'on', 'at', 'by', 'with', 'from', 'and', 'or', 'as', 'when', 'where', 'which', 'that', 'this', 'be', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'not']

    # For each function word, find it concatenated with another word
    for func_word in function_words:
        # Match function word + another word (min 4 chars) without space
        # Use positive lookbehind to avoid splitting legitimate words
        pattern = r'\b' + func_word + r'(?=[a-z]{4,})'
        # But we need to be careful not to split legitimate words
        # So we'll use a different approach

    # More targeted patterns for common concatenations
    replacements = [
        # Common preposition + noun/verb patterns
        (r'\b(of)(information|security|compliance|operations|risk|finance|legal|marketing|sales|technology|product|engineering|research|development|audit|accounting|human|resources|course|charge|concern|interest|importance|value|use|fact|matter|issue|question|problem|nature|purpose|scope|extent|basis|case|instance|example|sample|type|kind|sort|form|shape|size|piece|part|portion|segment|section|chapter|paragraph|sentence|phrase|word|letter|character|symbol|sign|mark|token|emblem|badge|crest|seal|stamp|brand|label|tag|ticket|card|pass|permit|license|certificate|diploma|degree|qualification|credential|document|paper|file|record|report|account|story|tale|narrative|history|chronicle|annal|archive|library|collection|repository|store|cache|stock|pile|heap|stack|bundle|package|parcel|pack|packet|box|case|container|vessel|receptacle)\b', r'\1 \2'),

        # Verb + common patterns
        (r'\b(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can)(required|needed|necessary|essential|important|significant|critical|vital|crucial|key|fundamental|basic|primary|major|minor|secondary|main|principal|central|core|essential|basic|fundamental|critical|vital|crucial|important|significant|notable|noteworthy|remarkable|outstanding|exceptional|excellent|good|bad|poor|inferior|superior|better|worse|best|worst|more|less|most|least|some|many|few|all|none|any|each|every|either|neither|both|one|two|first|second|third|last|next|previous|early|late|recent|current|present|past|future|new|old|young|small|large|big|little|tiny|huge|enormous|giant|great|grand|high|low|short|long|tall|wide|narrow|thick|thin|deep|shallow|heavy|light|strong|weak|hard|soft|hot|cold|warm|cool|dry|wet|full|empty|open|closed|free|busy|safe|dangerous)\b', r'\1 \2'),

        # Noun + verb patterns (accountability + is)
        (r'\b(accountability|responsibility|authority|ability|capability|capacity|possibility|probability|likelihood|necessity|requirement|obligation|duty|function|role|purpose|objective|goal|target|aim|intention|plan|strategy|approach|method|technique|process|procedure|practice|activity|action|step|measure|effort|attempt|try|trial|test|experiment|study|research|investigation|inquiry|examination|analysis|assessment|evaluation|review|audit|inspection|check|verification|validation|confirmation|authentication|certification|accreditation|approval|authorization|permission|consent|agreement|contract|treaty|pact|accord|understanding|deal|settlement|resolution|decision|judgment|ruling|verdict|finding|conclusion|result|outcome|consequence|effect|impact|influence|bearing|relevance|significance|importance|value|worth|merit|quality|standard|level|grade|class|category|type|kind|sort|variety|form|shape|size)(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|not|may|might|could|would|should|will|shall)\b', r'\1 \2'),

        # Common "a" + noun patterns
        (r'\b(a)(customer|client|user|member|employee|staff|worker|manager|director|officer|official|representative|agent|advisor|consultant|expert|specialist|analyst|researcher|bank|institution|company|firm|entity|person|individual|group|team|department|division|unit|section|branch|office|agency|organization|authority|body|council|board|committee|commission|panel|high|risk|low|medium|large|small|big|little|short|long|tall|wide|narrow|deep|shallow|thick|thin|heavy|light|strong|weak|hard|soft|hot|cold|warm|cool|dry|wet|full|empty|new|old|young|rich|poor|good|bad|right|wrong|true|false|real|fake|sure|certain|clear|unclear|open|closed|free|busy|safe|dangerous|important|significant|major|minor|main|key|primary|secondary|final|initial|first|last|next|previous|early|late|recent|current|past|future|present|absent|available|possible|impossible|likely|unlikely|necessary|essential|basic|simple|complex|easy|difficult|quick|slow|fast|steady|stable|variable|constant|regular|irregular|normal|abnormal|natural|artificial|public|private|general|specific|particular|special|common|typical|standard|average|ordinary|usual|unusual|rare|unique|different|similar|same|equal)\b', r'\1 \2'),

        # "the" + noun patterns
        (r'\b(the)(customer|client|user|member|employee|staff|worker|manager|director|officer|official|representative|agent|advisor|consultant|expert|specialist|analyst|researcher|bank|institution|company|firm|entity|person|individual|group|team|department|division|unit|section|branch|office|agency|organization|authority|body|council|board|committee|commission|panel|number|amount|quantity|total|sum|count|percentage|rate|ratio|proportion|fraction|part|portion|segment|share|piece|slice|chunk|block|section|division|unit|element|component|ingredient|factor|feature|characteristic|attribute|property|quality|aspect|facet|side|angle|perspective|viewpoint|standpoint|approach|method|way|means|manner|mode|style|fashion|form|shape|pattern|structure|design|layout|arrangement|organization|system|scheme|plan|program|project|initiative|campaign|drive|push|effort|attempt|try|trial|test|experiment|regulator|consent|order|similar|remediation|any|violations|regulators|authorities|governments|courts|judges|juries|attorneys|lawyers|counsel|prosecutors|defendants|plaintiffs|witnesses|experts|specialists|professionals|practitioners|consultants|advisors|advisers)\b', r'\1 \2'),

        # "a" + noun patterns (including apostrophe cases)
        (r'\b(a)(regulator|customer|client|user|member|employee|staff|worker|manager|director|officer|official|representative|agent|advisor|consultant|expert|specialist|analyst|researcher|bank|institution|company|firm|entity|person|individual|group|team|department|division|unit|section|branch|office|agency|organization|authority|body|council|board|committee|commission|panel|high|risk|low|medium|large|small|big|little|short|long|tall|wide|narrow|deep|shallow|thick|thin|heavy|light|strong|weak|hard|soft|hot|cold|warm|cool|dry|wet|full|empty|new|old|young|rich|poor|good|bad|right|wrong|true|false|real|fake|sure|certain|clear|unclear|open|closed|free|busy|safe|dangerous|important|significant|major|minor|main|key|primary|secondary|final|initial|first|last|next|previous|early|late|recent|current|past|future|present|absent|available|possible|impossible|likely|unlikely|necessary|essential|basic|simple|complex|easy|difficult|quick|slow|fast|steady|stable|variable|constant|regular|irregular|normal|abnormal|natural|artificial|public|private|general|specific|particular|special|common|typical|standard|average|ordinary|usual|unusual|rare|unique|different|similar|same|equal)\b', r'\1 \2'),

        # "to" + verb patterns
        (r'\b(to)(ensure|verify|validate|confirm|check|test|examine|inspect|investigate|analyze|assess|evaluate|review|audit|monitor|track|follow|pursue|seek|search|look|find|discover|identify|detect|observe|notice|recognize|see|view|regard|consider|think|believe|assume|expect|anticipate|predict|forecast|project|estimate|calculate|compute|determine|decide|choose|select|pick|prefer|like|love|hate|dislike|want|need|require|demand|request|ask|seek|search|look|hope|wish|desire|intend|plan|prepare|organize|arrange|manage|control|direct|lead|guide|teach|train|educate|instruct|coach|mentor|advise|consult|assist|help|support|serve|work|operate|function|act|behave|perform|execute|implement|conduct|carry|do|make|create|produce|build|construct|develop|design)\b', r'\1 \2'),

        # "for" + noun patterns
        (r'\b(for)(example|instance|purpose|use|reason|cause|basis|foundation|ground|justification|rationale|explanation|clarification|description|definition|meaning|interpretation|understanding|comprehension|awareness|consciousness|knowledge|information|data|facts|details|specifics|particulars|elements|components|parts|pieces|segments|sections|divisions|units|items|objects|things|entities|individuals|persons|people|groups|teams|organizations|institutions|companies|businesses|firms|enterprises|establishments|agencies|authorities|bodies|councils|boards|committees|commissions|panels)\b', r'\1 \2'),

        # Adopt/Implement + common words
        (r'\b(adopt)(when|where|what|which|how|the|a|an|to|for|with|by|in|of|on|at|from)\b', r'\1 \2', re.IGNORECASE),

        # Primarily/Mostly + common words
        (r'\b(primarily|mostly)(to|for|by|in|with|on|and|or)\b', r'\1 \2', re.IGNORECASE),

        # Other + correspondent/bank
        (r'\b(other)(correspondent|bank|banks)\b', r'\1 \2', re.IGNORECASE),

        # Accountable + for
        (r'\b(accountable)(for)\b', r'\1 \2', re.IGNORECASE),

        # Responsible + for
        (r'\b(responsible)(for)\b', r'\1 \2', re.IGNORECASE),

        # Liable + for
        (r'\b(liable)(for)\b', r'\1 \2', re.IGNORECASE),

        # Head + of + information
        (r"\b(head)('s)?(of)(information|security|compliance|operations)\b", r'\1\2 \3 \4', re.IGNORECASE),

        # Fix "ofinformation" -> "of information" (use word boundary to avoid splitting "information")
        (r"\b(of)(information|security|compliance|operations|risk|finance|legal|marketing|sales|technology|product|engineering|research|development|audit|accounting|human|resources|course|charge|concern|interest|importance|value|use|fact|matter|issue|question|problem|nature|purpose|scope|extent|basis|case|instance|example|sample|type|kind|sort|form|shape|size|piece|part|portion|segment|section|chapter|paragraph|sentence|phrase|word|letter|character|symbol|sign|mark|token|emblem|badge|crest|seal|stamp|brand|label|tag|ticket|card|pass|permit|license|certificate|diploma|degree|qualification|credential|document|paper|file|record|report|account|story|tale|narrative|history|chronicle|annal|archive|library|collection|repository|store|cache|stock|pile|heap|stack|bundle|package|parcel|pack|packet|box|case|container|vessel|receptacle|any|all|each|every|some|many|few|no|none|certain|specific|particular|various|different|multiple|several|numerous|countless|much|little|less|more|most|least)\b", r'\1 \2', re.IGNORECASE),

        # Fix "is/accountable/ultimately/etc + word"
        (r"(is|are|was|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|not)(ultimately|actually|really|truly|certainly|definitely|probably|possibly|perhaps|maybe|surely|clearly|obviously|evidently|naturally|of|course|indeed|in|fact|no|doubt|without|doubt|beyond|doubt|out|of|question|for|sure|certain|sure|positive|confident|convinced|satisfied|content|happy|pleased|delighted|thrilled|excited|enthusiastic|eager|keen|anxious|worried|concerned|troubled|disturbed|upset|angry|mad|furious|irate|outraged|offended|hurt|wounded|injured|damaged|harmed|impaired|disabled|handicapped|disadvantaged|deprived|needy|poor|impoverished|destitute|penniless|broke|bankrupt|insolvent)", r'\1 \2', re.IGNORECASE),

        # Fix "order/action/word + or/and"
        (r"(order|action|word|step|measure|effort|attempt|try|trial|test|check|review|audit|investigation|analysis|assessment|evaluation|examination|inspection|verification|validation|confirmation|authentication|certification|accreditation|approval|authorization|permission|consent|agreement|contract|treaty|pact|accord|understanding|deal|settlement|resolution|decision|judgment|ruling|verdict|finding|conclusion|result|outcome|consequence|effect|impact|influence|bearing|relevance|significance|importance|value|worth|merit|quality|standard|level|grade|class|category|type|kind|sort|variety|form|shape|size)(or|and|for|to|with|by|in|of|on|at|from)", r'\1 \2', re.IGNORECASE),

        # Investigation + and/for
        (r'\b(investigation)(and|for|or|filing)\b', r'\1 \2', re.IGNORECASE),

        # Implementing + organizational
        (r'(implementing)(organizational|organization|controls)\b', r'\1 \2', re.IGNORECASE),

        # Fix ")and" -> ") and"
        (r'\)(and|or|for)', r') \1'),

        # Team + common verbs
        (r'\b(team)(discovers|reports|finds|identifies|detects|observes|notices|recognizes|sees|views|regards|considers|thinks|believes|assumes|expects|anticipates|predicts|forecasts|projects|estimates|calculates|computes|determines|decides|chooses|selects|picks|prefers|likes|loves|hates|dislikes|wants|needs|requires|demands|requests|asks|seeks|searches|looks|hopes|wishes|desires|intends|plans|prepares)\b', r'\1 \2', re.IGNORECASE),

        # Quarter + time words
        (r'\b(quarter)(as|when|where|while|after|before|during|since|until|till)\b', r'\1 \2', re.IGNORECASE),

        # Common noun + verb patterns
        (r'\b(customer|client|user|member|employee|staff|worker|manager|director|officer|official|representative|agent|advisor|consultant|expert|specialist|analyst|researcher)(discovers|reports|finds|identifies|detects|observes|notices|recognizes|sees|views|regards|considers|thinks|believes|assumes|expects|anticipates|predicts|forecasts|projects|estimates|calculates|computes|determines|decides|chooses|selects|picks|prefers|likes|loves|hates|dislikes|wants|needs|requires|demands|requests|asks|seeks|searches|looks|hopes|wishes|desires|intends|plans|prepares|organizes|arranges|manages|controls|directs|leads|guides|teaches|trains|educates|instructs|coaches|mentors|advises|consults|assists|helps|supports|serves|works|operates|functions|acts|behaves|performs|executes|implements|conducts|carries|does|makes|creates|produces|builds|constructs|develops|designs)\b', r'\1 \2', re.IGNORECASE),

        # Action + alleged/reported
        (r'\b(action)(alleged|reported|suspected|thought|believed|considered|deemed|regarded|viewed|seen|perceived|interpreted|understood|known|recognized|acknowledged|admitted|accepted|rejected|denied|disputed|challenged|questioned|doubted|suspected|accused|charged|blamed|criticized|praised|commended|recommended|suggested|proposed|offered|presented|submitted|provided|given|granted|awarded|assigned|allocated|distributed|delivered|transferred|sent|received|accepted|rejected|denied|refused)\b', r'\1 \2', re.IGNORECASE),
    ]

    # Apply replacements with proper flag handling
    for item in replacements:
        if len(item) == 3:
            pattern, replacement, flags = item
            result = re.sub(pattern, replacement, result, flags=flags)
        else:
            pattern, replacement = item
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)

    return result

def normalize_question(question: dict) -> dict:
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
