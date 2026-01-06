import json
import os
import argparse
from openai import OpenAI
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv('.env.local')

# Initialize OpenAI client
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OPENAI_API_KEY not found in .env.local")

client = OpenAI(api_key=api_key)

def generate_explanation(question_data, language='en'):
    """Generate AI explanation for a question in the specified language"""
    question = question_data.get('question', '')
    options = question_data.get('options', {})
    correct_answers = question_data.get('correct_answers', [])
    existing_explanation = question_data.get('explanation', '')
    domain = question_data.get('domain', '')
    
    # Build options text
    options_text = "\n".join([f"{key}: {value}" for key, value in options.items()])
    correct_answers_text = ", ".join(correct_answers)
    
    if language == 'en':
        prompt = f"""You are an expert in Anti-Money Laundering (AML) and compliance. 

Given the following question and context, provide a clear, concise explanation in English that helps understand why the correct answer(s) is/are correct.

Domain: {domain}

Question: {question}

Options:
{options_text}

Correct Answer(s): {correct_answers_text}

Existing Explanation (for reference):
{existing_explanation}

Please provide a clear, well-structured explanation in English that:
1. Explains why the correct answer(s) is/are correct
2. Explains why the incorrect options are wrong (if applicable)
3. Is concise but comprehensive
4. Uses professional terminology appropriate for AML/compliance professionals

Explanation:"""
    else:  # Chinese
        prompt = f"""你是一位反洗钱（AML）和合规领域的专家。

根据以下问题和上下文，用中文提供清晰、简洁的解释，帮助理解为什么正确答案是正确的。

领域：{domain}

问题：{question}

选项：
{options_text}

正确答案：{correct_answers_text}

现有解释（供参考）：
{existing_explanation}

请用中文提供清晰、结构良好的解释，要求：
1. 解释为什么正确答案是正确的
2. 解释为什么错误选项是错误的（如适用）
3. 简洁但全面
4. 使用适合AML/合规专业人士的专业术语

解释："""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that provides clear, accurate explanations for AML and compliance questions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating explanation: {e}")
        return None

def process_questions(input_file='questions.json', output_file='questions.json', start_id=None):
    """Process all questions and add AI explanations
    
    Args:
        input_file: Path to input JSON file
        output_file: Path to output JSON file
        start_id: Starting question ID (inclusive). Only process questions with ID >= start_id
    """
    # Load questions
    print("Loading questions...")
    with open(input_file, 'r', encoding='utf-8') as f:
        all_questions = json.load(f)
    
    total = len(all_questions)
    print(f"Total questions: {total}")
    
    # Filter questions to process by start_id if specified
    if start_id is not None:
        questions_to_process = [q for q in all_questions if q.get('id', 0) >= start_id]
        filtered_count = len(questions_to_process)
        print(f"Filtered to questions with ID >= {start_id}: {filtered_count} questions to process")
    else:
        questions_to_process = all_questions
    
    # Process each question
    processed_count = 0
    for question in questions_to_process:
        question_id = question.get('id', 0)
        processed_count += 1
        # Skip if already has AI explanations
        if 'explanation_ai_en' in question and 'explanation_ai_ch' in question:
            print(f"[{processed_count}/{len(questions_to_process)}] Question {question_id}: Already has AI explanations, skipping...")
            continue
        
        print(f"[{processed_count}/{len(questions_to_process)}] Processing question {question_id}...")
        
        # Generate English explanation
        print("  Generating English explanation...")
        explanation_en = generate_explanation(question, 'en')
        if explanation_en:
            question['explanation_ai_en'] = explanation_en
            print("  [OK] English explanation generated")
        else:
            print("  [FAIL] Failed to generate English explanation")
            question['explanation_ai_en'] = ""
        
        # Small delay to avoid rate limiting
        time.sleep(0.5)
        
        # Generate Chinese explanation
        print("  Generating Chinese explanation...")
        explanation_ch = generate_explanation(question, 'ch')
        if explanation_ch:
            question['explanation_ai_ch'] = explanation_ch
            print("  [OK] Chinese explanation generated")
        else:
            print("  [FAIL] Failed to generate Chinese explanation")
            question['explanation_ai_ch'] = ""
        
        # Save progress after each question (save all questions, not just filtered ones)
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(all_questions, f, ensure_ascii=False, indent=2)
        print(f"  [OK] Progress saved")
        
        # Delay to avoid rate limiting
        time.sleep(1)
    
    print("\nAll questions processed!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Add AI explanations to questions')
    parser.add_argument('--input', '-i', default='questions.json', 
                       help='Input JSON file (default: questions.json)')
    parser.add_argument('--output', '-o', default='questions.json',
                       help='Output JSON file (default: questions.json)')
    parser.add_argument('--start-id', type=int, default=None,
                       help='Starting question ID (inclusive). Only process questions with ID >= start_id')
    
    args = parser.parse_args()
    
    if args.start_id is not None:
        print(f"Starting from question ID: {args.start_id} (inclusive)")
    
    process_questions(input_file=args.input, output_file=args.output, start_id=args.start_id)

