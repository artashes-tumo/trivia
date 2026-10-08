const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true});
  const origin='http://127.0.0.1:8765';
  let passed=0;
  const ok=(label)=>{passed++;console.log('PASS',label)};
  for (const level of ['easy','medium','hard']) {
    const context=await browser.newContext({viewport:{width:1600,height:1000}});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${origin}/${level}.html`);
    await page.waitForFunction(()=>!document.querySelector('.RollDice').disabled);
    await page.locator('.RollDice').click();
    const first=await page.locator('.question').innerText();
    const hints=page.locator('[aria-controls="trivia-hints"]');
    if(level==='easy') assert.equal(await hints.isVisible(),false);
    else {
      assert.equal(await hints.isVisible(),true);
      await hints.focus(); await page.keyboard.press('Space');
      assert.equal(await page.locator('#trivia-hints p').count(),1);
      assert.equal(await page.locator('.question').innerText(),first,'Space on hint must not roll');
      assert.equal(await hints.isDisabled(),level==='medium');
      if(level==='hard') {
        await hints.click();assert.equal(await page.locator('#trivia-hints p').count(),2);
        assert.equal(await hints.isDisabled(),true);
        await page.screenshot({path:`${require('node:os').tmpdir()}/${level}-hints.png`,fullPage:true});
      }
    }
    await page.locator('.showAnswersButton').first().click();
    assert.ok((await page.locator('.answer').innerText()).length);
    assert.equal(await hints.isDisabled(),true);
    await page.locator('.RollDice').click();
    assert.equal(await page.locator('.answer').innerText(),'');
    assert.equal(await page.locator('#trivia-hints p').count(),0);
    assert.notEqual(await page.locator('.question').innerText(),first);
    let before=await page.evaluate(()=>JSON.parse(localStorage.getItem('trivia.seenQuestions.v1')));
    await page.reload();await page.waitForFunction(()=>!document.querySelector('.RollDice').disabled);
    await page.evaluate(()=>document.activeElement.blur());
    await page.keyboard.press('Space');
    const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('trivia.seenQuestions.v1')));
    assert.equal(after.length,before.length+1);
    assert.ok(before.every(k=>after.includes(k)));
    await page.locator('.ShowRules').click();
    assert.equal(await page.locator('.ShowRules').innerText(),'Hide the rules');
    await page.locator('.ShowRules').click();
    assert.equal(await page.locator('.ShowRules').innerText(),'Show the rules');
    assert.deepEqual(errors,[]);
    ok(`${level}: hint allowance, keyboard, answer, reset-on-roll, reload history, rules`);
    await context.close();
  }
  // Exhaustion and explicit reset, with other difficulty history preserved.
  {
    const context=await browser.newContext();const page=await context.newPage();
    await page.goto(origin+'/hard.html');await page.waitForFunction(()=>!document.querySelector('.RollDice').disabled);
    await page.evaluate(async()=>{
      const qs=await (await fetch('hardquestions.json')).json();
      const {questionKey}=await import('./trivia-game.js');
      localStorage.setItem('trivia.seenQuestions.v1',JSON.stringify([...qs.map(q=>questionKey(q.question)),'otherdifficultyhistory']));
    });
    await page.locator('.RollDice').click();
    assert.equal(await page.locator('.RollDice').isDisabled(),true);
    assert.match(await page.locator('[role=status]').innerText(),/All questions/);
    await page.getByRole('button',{name:'Reset question history'}).click();
    assert.equal(await page.locator('.RollDice').isDisabled(),false);
    assert.ok(await page.locator('.question').innerText());
    const keys=await page.evaluate(()=>JSON.parse(localStorage.getItem('trivia.seenQuestions.v1')));
    assert.equal(keys.length,2);assert.ok(keys.includes('otherdifficultyhistory'));
    ok('exhaustion requires explicit reset and preserves other difficulty history');
    await context.close();
  }
  for(const mode of ['blocked','corrupt']){
    const context=await browser.newContext();const page=await context.newPage();
    await page.addInitScript(mode=>{
      if(mode==='blocked')Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked')}});
      else localStorage.setItem('trivia.seenQuestions.v1','{broken');
    },mode);
    await page.goto(origin+'/medium.html');await page.waitForFunction(()=>!document.querySelector('.RollDice').disabled);
    const questions=new Set();
    for(let i=0;i<12;i++){await page.locator('.RollDice').click();questions.add(await page.locator('.question').innerText())}
    assert.equal(questions.size,12);ok(`${mode} history: in-memory non-repetition fallback`);
    await context.close();
  }
  for(const mode of ['http-error','malformed','delayed']){
    const context=await browser.newContext();const page=await context.newPage();
    let release;
    const gate=new Promise(r=>release=r);
    await page.route('**/mediumquestions.json',async route=>{
      if(mode==='http-error')return route.fulfill({status:503,body:'Unavailable'});
      if(mode==='malformed')return route.fulfill({status:200,contentType:'application/json',body:'[{"bad":true}]'});
      await gate;return route.continue();
    });
    await page.goto(origin+'/medium.html',{waitUntil:'domcontentloaded'});
    if(mode==='delayed'){
      assert.equal(await page.locator('.RollDice').isDisabled(),true);
      await page.keyboard.press('Space');assert.equal(await page.locator('.question').innerText(),'');
      release();await page.waitForFunction(()=>!document.querySelector('.RollDice').disabled);
      await page.locator('.RollDice').click();assert.ok(await page.locator('.question').innerText());
    }else{
      await page.waitForFunction(()=>document.querySelector('[role=status]')?.textContent.includes('Could not load'));
      assert.equal(await page.locator('.RollDice').isDisabled(),true);
    }
    ok(`${mode} data loading`);await context.close();
  }
  await browser.close();console.log(`PASS: ${passed} browser scenarios`);
})().catch(e=>{console.error(e);process.exit(1)});
