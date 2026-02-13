# Fraction Conquest

Fraction Conquest is a browser-based educational game for practicing fractions (grades 5-7, ages 11-13).  
The player solves math tasks to capture territories on a map: correct answers expand control, incorrect answers lose ground.

Language versions:

- Russian: `README.ru.md`
- German: `README.de.md`

## Idea

The project combines:

- Fraction practice and step-by-step reasoning
- Short game loops with visible progress (map conquest)
- Adjustable difficulty and topics for classroom or self-study use

The goal is to make repeated fraction practice more engaging without adding external dependencies or setup complexity.

## Key Features

- 11 fraction-related topics (simplification, mixed numbers, operations, decimals, combined expressions)
- 4 difficulty levels
- Territory conquest gameplay with immediate feedback
- Explanation text for incorrect answers
- RU/DE in-app localization
- Admin settings page (`admin.html`)
- Built-in test page for math engine checks (`test.html`)
- Pure frontend: HTML + CSS + JavaScript (no frameworks, no build step)

## Run Locally

### Option 1: Open directly (fastest)

1. Download the repository:
   - `git clone https://github.com/gluonMaster/Educational-game.git`
   - or download ZIP from GitHub and extract it
2. Open the project folder.
3. Launch files in your browser:
   - Main game: `index.html`
   - Settings: `admin.html`
   - Tests: `test.html`

### Option 2: Run with a local server (recommended)

From the project folder:

```bash
python -m http.server 8000
```

Then open:

- `http://localhost:8000/index.html`
- `http://localhost:8000/admin.html`
- `http://localhost:8000/test.html`

## Controls

- Mouse: click one of 6 answer buttons
- Keyboard: keys `1-6` select answers
- After an incorrect answer, click `Continue` to move to the next task

## Technical Notes

- Recommended desktop resolution: `1024x768` or higher
- Target browsers: Chrome/Firefox/Edge 90+
- Settings and game progress are stored in `localStorage`
