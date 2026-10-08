/** Shared gameplay. Existing page markup and styles intentionally stay unchanged. */
export const categories = Object.freeze([
    'Geography', 'Entertainment', 'History',
    'Art & Literature', 'Science', 'Sports & Leisure'
]);
const categoryColors = {
    'Geography': '#3498db', 'Entertainment': '#9b59b6',
    'History': '#e74c3c', 'Art & Literature': '#f1c40f',
    'Science': '#2ecc71', 'Sports & Leisure': '#e67e22'
};
export const HISTORY_KEY = 'trivia.seenQuestions.v1';
const hintLimits = { easy: 0, medium: 1, hard: 2 };

// Text-based identity survives JSON reordering and cosmetic punctuation edits.
export function questionKey(text) {
    return text.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

export function validateQuestions(data, difficulty) {
    if (!Object.hasOwn(hintLimits, difficulty) || !Array.isArray(data) || !data.length) {
        throw new Error('Invalid question bank');
    }
    const unique = new Map();
    for (const q of data) {
        if (!q || !categories.includes(q.category) ||
            typeof q.question !== 'string' || !q.question.trim() ||
            typeof q.answer !== 'string' || !q.answer.trim() ||
            !Array.isArray(q.hints) || q.hints.length !== hintLimits[difficulty] ||
            q.hints.some(h => typeof h !== 'string' || !h.trim())) {
            throw new Error('Invalid question or hint count');
        }
        const key = questionKey(q.question);
        if (!key) throw new Error('Empty question identity');
        // Also guard against accidentally duplicated rows in future uploads.
        if (!unique.has(key)) unique.set(key, q);
    }
    return [...unique.values()];
}

export function createDeck(data, seen = new Set(), random = Math.random) {
    const pools = categories.map(category => data.filter(q => q.category === category));
    return {
        next() {
            const available = pools.map((pool, index) => ({
                index, pool: pool.filter(q => !seen.has(questionKey(q.question)))
            })).filter(entry => entry.pool.length);
            if (!available.length) return null;
            // Only unexhausted categories participate; the displayed die matches.
            const chosen = available[Math.floor(random() * available.length)];
            const question = chosen.pool[Math.floor(random() * chosen.pool.length)];
            seen.add(questionKey(question.question));
            return { question, diceRoll: chosen.index + 1 };
        }
    };
}

export async function startGame(difficulty) {
    const rollDiceButton = document.querySelector('.RollDice');
    const showRulesButton = document.querySelector('.ShowRules');
    const rulesDiv = document.querySelector('.rules');
    const rulesText = document.querySelector('.rules-text');
    const questionEl = document.querySelector('.question');
    const answerEl = document.querySelector('.answer');
    const showAnswerButton = document.querySelector('.showAnswersButton');
    const block = document.querySelector('.question-block');

    rollDiceButton.disabled = true;
    showAnswerButton.disabled = true;
    answerEl.setAttribute('aria-live', 'polite');
    questionEl.setAttribute('aria-live', 'polite');

    const hintButton = document.createElement('button');
    hintButton.type = 'button';
    hintButton.className = 'showAnswersButton';
    hintButton.hidden = true;
    hintButton.disabled = true;
    hintButton.setAttribute('aria-controls', 'trivia-hints');
    hintButton.setAttribute('aria-expanded', 'false');
    const hintsEl = document.createElement('div');
    hintsEl.id = 'trivia-hints';
    hintsEl.className = 'category-card';
    hintsEl.hidden = true;
    hintsEl.setAttribute('aria-live', 'polite');
    const statusEl = document.createElement('div');
    statusEl.className = 'category-card';
    statusEl.hidden = true;
    statusEl.setAttribute('role', 'status');
    const resetButton = document.createElement('button');
    resetButton.type = 'button';
    resetButton.className = 'showAnswersButton';
    resetButton.textContent = 'Reset question history';
    resetButton.hidden = true;
    block.insertBefore(hintButton, answerEl);
    block.insertBefore(hintsEl, answerEl);
    block.append(statusEl, resetButton);

    let questions = [], current = null, revealedHints = 0, ready = false;
    let answered = false, deck;
    const seen = new Set();
    let storageWarningShown = false;
    function storageWarning(error) {
        if (!storageWarningShown) {
            console.warn('Question history is available only in this page session.', error);
            storageWarningShown = true;
        }
    }
    function readHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (raw === null) return;
            const stored = JSON.parse(raw);
            if (!Array.isArray(stored) || stored.some(key => typeof key !== 'string')) {
                throw new Error('Invalid saved question history');
            }
            stored.forEach(key => seen.add(key));
        } catch (error) { storageWarning(error); }
    }
    function saveHistory() {
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify([...seen])); }
        catch (error) { storageWarning(error); }
    }
    function resetHints() {
        revealedHints = 0;
        answered = false;
        hintsEl.replaceChildren();
        hintsEl.hidden = true;
        hintButton.hidden = !current || !current.hints.length;
        hintButton.disabled = hintButton.hidden;
        hintButton.setAttribute('aria-expanded', 'false');
        if (current && current.hints.length) {
            hintButton.textContent = `Show hint (1/${current.hints.length})`;
        }
    }
    function rollDice() {
        if (!ready) return;
        readHistory();
        const draw = deck.next();
        answerEl.textContent = '';
        current = draw ? draw.question : null;
        resetHints();
        showAnswerButton.disabled = !current;
        if (!draw) {
            questionEl.replaceChildren();
            statusEl.textContent = 'All questions in this difficulty have been played.';
            statusEl.hidden = false;
            resetButton.hidden = false;
            rollDiceButton.disabled = true;
            ready = false;
            return;
        }
        statusEl.hidden = true;
        // Keep the original displayed copy, while rendering dataset text safely.
        const dice = document.createElement('b');
        dice.textContent = draw.diceRoll;
        const category = document.createElement('span');
        category.style.color = categoryColors[current.category];
        category.textContent = current.category;
        questionEl.replaceChildren(
            document.createTextNode('You rolled a '), dice,
            document.createTextNode(': '), category, document.createElement('br'),
            document.createTextNode(current.question)
        );
        saveHistory();
    }
    rollDiceButton.addEventListener('click', rollDice);
    window.addEventListener('keydown', event => {
        if (event.key !== ' ' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target;
        // Let native keyboard activation reveal hints/answers on focused buttons.
        if (target && (target.isContentEditable || target.closest?.('button, a, input, textarea, select'))) return;
        event.preventDefault();
        rollDice();
    });
    hintButton.addEventListener('click', () => {
        if (!current || answered || revealedHints >= current.hints.length) return;
        const hint = document.createElement('p');
        hint.textContent = current.hints[revealedHints++];
        hintsEl.append(hint);
        hintsEl.hidden = false;
        hintButton.setAttribute('aria-expanded', 'true');
        const exhausted = revealedHints === current.hints.length;
        hintButton.disabled = exhausted;
        hintButton.textContent = exhausted ? 'All hints revealed' :
            `Show hint (${revealedHints + 1}/${current.hints.length})`;
    });
    showAnswerButton.addEventListener('click', () => {
        if (!current) return;
        answerEl.textContent = current.answer;
        answered = true;
        hintButton.disabled = true;
    });
    showRulesButton.addEventListener('click', () => {
        const isHidden = rulesDiv.style.display === '' || rulesDiv.style.display === 'none';
        rulesDiv.style.display = isHidden ? 'grid' : 'none';
        rulesText.style.display = isHidden ? 'block' : 'none';
        showRulesButton.textContent = isHidden ? 'Hide the rules' : 'Show the rules';
    });
    resetButton.addEventListener('click', () => {
        // Explicit opt-in to repeats; retain other difficulty levels' history.
        readHistory();
        questions.forEach(q => seen.delete(questionKey(q.question)));
        saveHistory();
        resetButton.hidden = true;
        statusEl.hidden = true;
        ready = true;
        rollDiceButton.disabled = false;
        rollDice();
    });
    try {
        const response = await fetch(new URL(`${difficulty}questions.json`, import.meta.url));
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        questions = validateQuestions(await response.json(), difficulty);
        readHistory();
        deck = createDeck(questions, seen);
        ready = true;
        rollDiceButton.disabled = false;
    } catch (error) {
        console.error(`Could not load ${difficulty}questions.json:`, error);
        statusEl.textContent = 'Could not load questions. Please reload the page.';
        statusEl.hidden = false;
    }
}
