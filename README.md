# Mock Interview — Hack2Hire MVP

## Overview
Frontend-only, rule-based mock interview MVP. The app:
- Accepts resume (paste or .txt/.md upload) and Job Description (JD).
- Computes JD match (TF–IDF cosine similarity) and extracts top keywords.
- Asks N questions (configurable) with strict per-question time.
- Adapts difficulty based on performance.
- Produces a human-readable final score, category, and actionable feedback.
- Saves a JSON result in `localStorage` and allows downloading JSON for judges.

## How to run (no install)
1. Overwrite your project files with these: `index.html`, `styles.css`, `script.js`, `README.md`.
2. Open `index.html` in a modern browser (Chrome/Edge recommended).
3. Paste or upload your resume (plain text / .txt / .md) and paste the JD.
4. Set *Time per question* and *Max Q*, then click **Start Interview**.
5. Answer the questions. The interview ends automatically after the configured number of questions.
6. View the final human-readable result. Optionally download JSON for judges.

## What is shown in demo video
1. Paste or upload resume and paste JD.
2. Show the JD Match % and top keywords.
3. Start interview (Time/Q = 10, Max Q = 3 for demo).
4. Answer one question; let one question timeout to show auto-submit.
5. Show the final score and feedback.

## Demo video
\https://drive.google.com/file/d/1Oc2t_kz2Dd-PKPxh9K5GU04ebDXC7mQ2/view?usp=drivesdk

## Tips
- If you have a PDF resume, open it in any PDF viewer, copy text and paste into the resume textarea.
