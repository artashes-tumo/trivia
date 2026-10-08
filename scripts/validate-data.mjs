import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { categories, questionKey, validateQuestions } from '../trivia-game.js';

const globalKeys = new Set();
for (const difficulty of ['easy', 'medium', 'hard']) {
    const questions = JSON.parse(await readFile(new URL(`../${difficulty}questions.json`, import.meta.url)));
    assert.ok(questions.length >= 600, `${difficulty}: needs at least 600 questions`);
    assert.equal(validateQuestions(questions, difficulty).length, questions.length, 'Duplicate rows');
    for (const category of categories) {
        const count = questions.filter(q => q.category === category).length;
        assert.ok(count >= 100, `${difficulty}/${category}: only ${count} questions`);
        console.log(`${difficulty}: ${category}: ${count}`);
    }
    for (const q of questions) {
        assert.deepEqual(Object.keys(q).sort(), ['answer', 'category', 'hints', 'question']);
        const key = questionKey(q.question);
        assert.ok(!globalKeys.has(key), `Duplicate question across banks: ${q.question}`);
        globalKeys.add(key);
        assert.equal(new Set(q.hints).size, q.hints.length, `Duplicate hints: ${q.question}`);
        assert.ok(!/&(?:quot|amp|#\d+|#x[\da-f]+);/i.test(q.question + q.answer), 'Undecoded HTML entity');
        assert.ok(!/<\/?[a-z][^>]*>/i.test(q.question + q.answer), 'Unexpected HTML markup');
        // Choice-based hints must include the answer with two then one distinct distractors.
        q.hints.forEach((hint, index) => {
            const prefix = index === 0 ? 'Narrow it down to these possibilities: ' : 'Narrow it further to: ';
            if (!hint.startsWith(prefix)) return;
            const choices = hint.slice(prefix.length, -1).split('; ');
            assert.equal(choices.length, index === 0 ? 3 : 2, q.question);
            assert.equal(new Set(choices).size, choices.length, `Repeated hint choice: ${q.question}`);
            assert.ok(choices.includes(q.answer), `Hint omits answer: ${q.question}`);
            if (index === 1) {
                const previous = q.hints[0].slice('Narrow it down to these possibilities: '.length, -1).split('; ');
                assert.ok(choices.every(choice => previous.includes(choice)), `Hints are not progressive: ${q.question}`);
            }
        });
    }
}
console.log(`PASS: ${globalKeys.size} unique questions; schema, category totals and hint counts valid.`);
