// Keep the original script entry point used by the unchanged HTML.
document.querySelector('.RollDice').disabled = true;
document.querySelector('.showAnswersButton').disabled = true;
import('./trivia-game.js')
    .then(({ startGame }) => startGame('hard'))
    .catch(error => console.error('Could not load trivia gameplay:', error));
