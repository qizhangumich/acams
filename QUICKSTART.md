# Quick Start Guide

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Visit `http://localhost:3000`

## How It Works

1. **Enter Email**: On the landing page, enter your email address
2. **Start Practicing**: You'll be taken to the question bank
3. **Answer Questions**: Select your answers and submit
4. **Track Progress**: Your progress is automatically saved
5. **Review**: See explanations and correct answers after submission

## Progress Tracking

- Progress is saved automatically when you answer a question
- Progress persists across page refreshes
- Use "Reset Progress" to start over

## File Locations

- **Questions**: `questions.json` (root directory)
- **Email Storage**: Browser `localStorage` (key: `userEmail`)
- **Progress Storage**: `progress-data.json` (created automatically)

## Notes

- Email is used only as an identifier - no verification required
- Progress is tied to your email address
- Questions are loaded from `questions.json` only (never modified)

