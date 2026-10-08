# Trivia project update

## Run

Serve this folder over HTTP, as the existing JSON loader and the shared JavaScript module need a web server. For example, from this folder:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000/index.html. Deploy the entire folder to an ordinary static host; no build step, account, API key, or runtime third-party trivia API is required.

## What changed

Each of `easyquestions.json`, `mediumquestions.json`, and `hardquestions.json` contains 600 questions: 100 in each of the six original categories. The JSON root remains an array. The original `category`, `question`, and `answer` fields remain strings. The only additional question field is `hints`, an array of strings:

- Easy: `[]`.
- Medium: exactly one hint.
- Hard: exactly two hints, revealed sequentially.

Some hints are factual clues. Others narrow the possible answer to three choices and then, for hard questions, two of those same choices. Letter/word clues are also used as second hints. A hint never automatically displays the answer in the answer area. Showing the answer disables further hint use. Rolling again clears both hints and the answer. Easy mode has no visible hint control.

The four original HTML files and `style.css` are byte-for-byte unchanged. Existing interface wording and category colours are retained. New hint, exhaustion and loading-error controls reuse the existing button and category-card styles. The original JavaScript filenames now load `trivia-game.js`, which shares gameplay between the three difficulty pages.

## Repeat prevention

Questions are identified by their normalised question text, ignoring case, accents, spaces and punctuation. Gameplay tracks drawn questions rather than answered questions, so skipping does not make a question immediately eligible again. JSON reordering does not reset identity.

History is stored under `trivia.seenQuestions.v1` in localStorage and persists across reloads and difficulty navigation in the same browser and origin. When a category is exhausted, dice selection uses only categories with unseen questions. The displayed die face always matches the selected category. When all 600 questions in a difficulty have been played, rolling stops; an explicit **Reset question history** button starts a new cycle for that difficulty while retaining the other difficulties' history. There is no silent recycling.

If browser storage is blocked or unavailable, a Set still prevents repeats within the currently open page. Clearing browser data or moving to another device/origin starts a fresh history. This is local, client-side history, not a server-backed account or atomic multi-tab lock. Simultaneous draws in different tabs can race.

The validation script rejects normalised duplicate question text within or across the three banks. It does not claim to detect every semantic paraphrase. Future editors should also compare the underlying fact when adding or rewording questions.

## Checks

With Node.js 20 or later, no dependency installation is required for these checks:

```sh
npm run validate
npm test
```

Validation checks all 1,800 rows, the original keys plus `hints`, category minimums, difficulty hint counts, duplicate text, HTML decoding, and progressively narrowing choice hints. Automated gameplay tests exhaust every full bank and cover saved history, punctuation variants, malformed inputs and duplicate rows.

`tests/browser.test.cjs` is an additional Playwright browser test. Start the server on port 8765 and run it with a separately installed Playwright package and Chromium browser. It covers hint reveal, keyboard controls, answer reveal, reload history, exhaustion/reset, unavailable storage, and loading failures. See `VALIDATION.md` for the checks completed with this update.

## Content and attribution

Existing questions were retained where suitable, with ambiguous or incorrect wording corrected. Additional questions combine adapted Open Trivia DB material with newly authored supplements. Upstream questions requiring unseen multiple-choice options, selected unstable facts, duplicate facts and identified errors were removed. Difficulty labels for imported questions are inherited from their source and remain subjective; difficulty is not statistically calibrated.

`DATA_PROVENANCE.csv` identifies the source of each delivered question and retains the original wording of imported questions before editing. `DATA_ATTRIBUTION.md` contains the attribution and licence notice. The content received an editorial review, not independent primary-source verification of every answer. The app never needs to contact those sources during play.
