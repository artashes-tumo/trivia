
// --- Elements ---
const rollDiceButton = document.querySelector('.RollDice');
const showRulesButton = document.querySelector('.ShowRules');
const rulesDiv = document.querySelector('.rules');
const rulesText = document.querySelector('.rules-text');
const questionEl = document.querySelector('.question');
const answerEl = document.querySelector('.answer');
const showAnswerButton = document.querySelector('.question-block button');

// dice
const categories = [
    'Geography',        // 1
    'Entertainment',    // 2
    'History',          // 3
    'Art & Literature', // 4
    'Science',          // 5
    'Sports & Leisure'  // 6
];

const categoryColors = {
    'Geography': '#3498db',
    'Entertainment': '#9b59b6',
    'History': '#e74c3c',
    'Art & Literature': '#f1c40f',
    'Science': '#2ecc71',
    'Sports & Leisure': '#e67e22'
};

let questions = [];
let current = null;

//question load
fetch('questions.json')
    .then((response) => response.json())
    .then((data) => { questions = data; })
    .catch((err) => console.error('Could not load questions.json:', err));

// dice roll
function rollDice() {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const category = categories[diceRoll - 1];

    // all questions in that category
    const pool = questions.filter((q) => q.category === category);
    current = pool[Math.floor(Math.random() * pool.length)];

    questionEl.innerHTML = `
    You rolled a <b>${diceRoll}</b>: 
    <span style="color: ${categoryColors[category]}">${category}</span>
    <br>
    ${current.question}
`;
    answerEl.textContent = '';
}

rollDiceButton.addEventListener('click', rollDice);

// Spacebar roll
window.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
        event.preventDefault();
        rollDice();
    }
});

// reveal answer
showAnswerButton.addEventListener('click', () => {
    if (current) answerEl.textContent = current.answer;
});

// rule show hide
showRulesButton.addEventListener('click', () => {
    const isHidden = rulesDiv.style.display === '' || rulesDiv.style.display === 'none';
    if (isHidden) {
        rulesDiv.style.display = 'grid';
        rulesText.style.display = 'block';
        showRulesButton.textContent = 'Hide the rules';
    } else {
        rulesDiv.style.display = 'none';
        rulesText.style.display = 'none';
        showRulesButton.textContent = 'Show the rules';
    }
});

