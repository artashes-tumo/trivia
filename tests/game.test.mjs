import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createDeck, questionKey, validateQuestions, categories } from '../trivia-game.js';

for (const difficulty of ['easy', 'medium', 'hard']) {
    test(`${difficulty}: all 600 questions exactly once, including category exhaustion`, async () => {
        const data = validateQuestions(JSON.parse(await readFile(new URL(`../${difficulty}questions.json`, import.meta.url))), difficulty);
        const seen = new Set(), deck = createDeck(data, seen, () => 0);
        const results = [];
        for (let i = 0; i < data.length; i++) {
            const draw = deck.next();
            assert.ok(draw);
            assert.equal(categories[draw.diceRoll - 1], draw.question.category);
            results.push(questionKey(draw.question.question));
        }
        assert.equal(new Set(results).size, data.length);
        assert.equal(deck.next(), null);
        assert.equal(deck.next(), null, 'exhaustion must never silently recycle questions');
    });
}
test('history loaded into a new deck prevents repeats', () => {
    const data = [
        { category: categories[0], question: 'One?' },
        { category: categories[0], question: 'Two?' },
        { category: categories[1], question: 'Three?' }
    ];
    const firstSeen = new Set();
    const first = createDeck(data, firstSeen, () => 0).next();
    const restored = new Set(JSON.parse(JSON.stringify([...firstSeen])));
    const second = createDeck(data, restored, () => 0).next();
    assert.notEqual(second.question.question, first.question.question);
});
test('punctuation, accents, whitespace and case do not create new identities', () => {
    assert.equal(questionKey('  WHAT is café?'), questionKey('What is cafe!'));
    const q = { category: categories[0], question: 'A question?', answer: 'Answer', hints: [] };
    assert.equal(validateQuestions([q, { ...q, question: 'A QUESTION!' }], 'easy').length, 1);
});
test('wrong difficulty hint counts and malformed banks are rejected', () => {
    const q = { category: categories[0], question: 'Question?', answer: 'Answer', hints: [] };
    assert.throws(() => validateQuestions([q], 'medium'));
    assert.throws(() => validateQuestions([{ ...q, hints: ['One hint'] }], 'hard'));
    assert.throws(() => validateQuestions([{ ...q, category: 'Other' }], 'easy'));
    assert.throws(() => validateQuestions([], 'easy'));
});
test('duplicate raw rows cannot repeat during a draw cycle', () => {
    const q = { category: categories[0], question: 'Repeated?' };
    const deck = createDeck([q, q]);
    assert.ok(deck.next());
    assert.equal(deck.next(), null);
});
