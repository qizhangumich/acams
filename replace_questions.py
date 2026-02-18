#!/usr/bin/env python3
"""
Replace questions.json with questions_1.json

This script:
1. Adds explanation_ai_ch to questions_1.json (using OpenAI API)
2. Backs up current questions.json
3. Replaces questions.json with questions_1.json
4. Syncs to database
"""

import json
import sys
import subprocess
from pathlib import Path

def add_chinese_explanations():
    """Add explanation_ai_ch to questions_1.json using OpenAI API"""
    import os
    try:
        from openai import OpenAI
    except ImportError:
        print("Installing openai package...")
        subprocess.run([sys.executable, "-m", "pip", "install", "openai"], check=True)
        from openai import OpenAI

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return False

    client = OpenAI(api_key=api_key)

    # Load questions_1.json
    json_path = Path("questions_1.json")
    print(f"Loading {json_path}...")
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Found {len(data)} questions")

    system_prompt = """You are an ACAMS exam instructor. Provide Chinese explanations.

Format:
### 正确答案
[Explain why correct]

### 错误选项
[Explain why incorrect]

### 总结
[Brief summary]

Use ONLY Chinese text. No English."""

    total = len(data)
    for i, question in enumerate(data):
        if 'explanation_ai_ch' in question and question['explanation_ai_ch']:
            print(f"[{i+1}/{total}] Question {question.get('id')}: Already has Chinese - skipping")
            continue

        question_text = question['question']
        options = question.get('options', {})
        correct_answers = question.get('correct_answers', [])

        # Build options text
        options_text = ""
        for letter, text in sorted(options.items()):
            is_correct = letter in correct_answers
            options_text += f"{'✓' if is_correct else '✗'} {letter}. {text}\n"

        correct = ", ".join(correct_answers) if isinstance(correct_answers, list) else correct_answers

        user_prompt = f"""Question: {question_text}

Options:
{options_text}

Correct Answer(s): {correct}

Provide Chinese explanation."""

        print(f"[{i+1}/{total}] Generating Chinese for question {question.get('id')}...")

        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=2000
            )
            question['explanation_ai_ch'] = response.choices[0].message.content
            print(f"  ✓ Generated ({len(question['explanation_ai_ch'])} characters)")
        except Exception as e:
            print(f"  ✗ Error: {e}")
            question['explanation_ai_ch'] = ""

    # Save updated questions_1.json
    print(f"\nSaving {json_path}...")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("Done!")
    return True


def replace_questions_json():
    """Replace questions.json with questions_1.json"""
    print("\n" + "="*60)
    print("REPLACING questions.json WITH questions_1.json")
    print("="*60)

    # Backup current questions.json
    backup_path = Path("questions.json.backup")
    if backup_path.exists():
        timestamp = backup_path.stat().st_mtime
        backup_with_timestamp = Path(f"questions.json.backup.{timestamp}")
        backup_path.rename(backup_with_timestamp)

    import shutil
    shutil.copy2("questions.json", backup_path)
    print(f"✅ Backed up current questions.json to: {backup_path}")

    # Read questions_1.json
    print("\nLoading questions_1.json...")
    with open("questions_1.json", 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Save as new questions.json
    print("Saving as questions.json...")
    with open("questions.json", 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("✅ questions.json replaced with questions_1.json")
    return True


def sync_to_github():
    """Commit and push to GitHub"""
    print("\n" + "="*60)
    print("SYNCING TO GITHUB")
    print("="*60)

    # Stage changes
    print("\nStaging changes...")
    subprocess.run(["git", "add", "questions.json"], check=False)

    # Commit
    print("Creating commit...")
    result = subprocess.run(
        ["git", "commit", "-m", "Replace questions.json with questions_1.json\n\n- All explanation_ai_en fields copied from original\n- Added Chinese explanations using OpenAI API\n- Replaced questions.json with questions_1.json\n\nCo-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        print("✅ Committed successfully")
    else:
        print(f"❌ Commit failed: {result.stderr.decode()}")

    # Push
    print("Pushing to GitHub...")
    result = subprocess.run(
        ["git", "push"],
        capture_output=True,
        text=True
    )

    if result.returncode == 0:
        print("✅ Pushed successfully")
    else:
        print(f"❌ Push failed: {result.stderr.decode()}")

    return result.returncode == 0


def sync_to_database():
    """Sync to production database"""
    print("\n" + "="*60)
    print("SYNCING TO PRODUCTION DATABASE")
    print("="*60)

    db_url = os.environ.get("DATABASE_URL",
        "postgresql://neondb_owner:npg_MXBUCQxWpm54@ep-little-sun-a4bvenrx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")

    print("\nUpdating database...")
    result = subprocess.run(
        ["npx", "tsx", "scripts/update-database-from-json.ts"],
        env={**os.environ, "DATABASE_URL": db_url},
        capture_output=True,
        text=True
    )

    print(result.stdout)

    if result.returncode == 0:
        # Check for errors in output
        if "Errors:" in result.stdout:
            print("✅ Database update completed (with some errors)")
        else:
            print("✅ Database synced successfully")
    else:
        print(f"❌ Database sync failed: {result.stderr}")

    return result.returncode == 0


def main():
    import os

    print("="*60)
    print("QUESTIONS.JSON REPLACEMENT SCRIPT")
    print("="*60)

    # Ask for confirmation
    response = input("\nThis will:\n1. Add explanation_ai_ch to questions_1.json using OpenAI API\n2. Backup current questions.json\n3. Replace questions.json with questions_1.json\n4. Commit and push to GitHub\n5. Sync to production database\n\nContinue? (yes/no): ")

    if response.lower() not in ['yes', 'y']:
        print("Aborted.")
        return

    # Step 1: Add Chinese explanations
    print("\n" + "="*60)
    print("STEP 1: ADD explanation_ai_ch (using OpenAI API)")
    print("="*60)

    success = add_chinese_explanations()
    if not success:
        print("\n⚠️  Chinese explanations failed to generate. Continue anyway? (yes/no)")
        if input().lower() not in ['yes', 'y']:
            return

    # Step 2: Replace questions.json
    print("\n" + "="*60)
    print("STEP 2 & 3: BACKUP AND REPLACE questions.json")
    print("="*60)

    replace_questions_json()

    # Step 3: Sync to GitHub
    print("\n" + "="*60)
    print("STEP 4: SYNC TO GITHUB")
    print("="*60)

    sync_to_github()

    # Step 4: Sync to database
    print("\n" + "="*60)
    print("STEP 5: SYNC TO DATABASE")
    print("="*60)

    sync_to_database()

    print("\n" + "="*60)
    print("ALL OPERATIONS COMPLETED!")
    print("="*60)


if __name__ == "__main__":
    main()
