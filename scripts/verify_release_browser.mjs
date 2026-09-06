import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({channel:process.env.QA_BROWSER_CHANNEL || 'msedge',headless:true});
fs.mkdirSync('scratch/release-qa',{recursive:true});
const errors=[];
const allProfiles=[['desktop',1280,720,false],['narrow',960,700,false],['portrait',390,844,true],['landscape',844,390,true]];
const profiles=process.env.QA_PROFILE?allProfiles.filter(([name])=>name===process.env.QA_PROFILE):allProfiles;
assert(profiles.length,`Unknown QA_PROFILE: ${process.env.QA_PROFILE}`);
const outcomes=['escalate','verify','maintain',null];
const flags={air_remedied:true,water_filtered:true,power_saved:true,inspected_ventilation:true,inspected_power:true,
  inspected_radio:true,extra_battery:true,sarah_update_reviewed:true,radio_quality:'clear'};
try {
 for(const [name,width,height,touch] of profiles){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(`${name}: ${e.message}`));
  await page.goto('http://127.0.0.1:3000/');
  await page.locator('#new-game-btn').waitFor({state:'visible'});
  async function resume(sceneId,extra={},health=100){
    await page.evaluate(({sceneId,extra,health})=>localStorage.setItem('bunker72_save_v1',JSON.stringify({
      version:3,sceneId,knowledge:8,history:[],flags:extra,inventory:{food:3,drink:3,kit:2},health,hunger:90,thirst:90,
    })),{sceneId,extra,health});
    await page.reload();await page.locator('#continue-btn').click();
    await page.waitForFunction(()=>document.querySelector('#game-view.active, #ending-view.active'));
    if(!sceneId.startsWith('ending_'))await page.locator(`#story-box.scene-id-${sceneId}`).waitFor({state:'attached'});
  }
  async function skip(){await page.locator('#dialogue-text').click();}
  async function fit(selector){
    const boxes=await page.locator(selector).evaluateAll(els=>els.filter(e=>e.getClientRects().length).map(e=>{
      const r=e.getBoundingClientRect();return {text:e.textContent?.slice(0,45),left:r.left,right:r.right,width:r.width};}));
    assert(boxes.length,`${name}: no ${selector}`);
    for(const r of boxes)assert(r.left>=-2&&r.right<=width+2,`${name}: overflow ${selector} ${JSON.stringify(r)}`);
  }
  async function noHorizontalScroll(label){
    const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert(metrics.scroll<=metrics.client+2,`${name}: horizontal scroll at ${label} ${JSON.stringify(metrics)}`);
  }
  if(name==='desktop'){
    await page.evaluate(()=>localStorage.setItem('bunker72_save_v1',JSON.stringify({version:2,sceneId:'day2_start',knowledge:5,history:[],flags:{},inventory:{food:2,drink:2,kit:1},health:80,hunger:75,thirst:70})));
    await page.reload();await page.locator('#continue-btn').click();
    await page.locator('#story-box.scene-id-day2_start').waitFor({state:'attached'});
    await page.evaluate(()=>localStorage.removeItem('bunker72_save_v1'));await page.reload();await page.locator('#new-game-btn').waitFor({state:'visible'});
  }
  await page.locator('#new-game-btn').click();
  await page.locator('#game-view.active').waitFor();
  await page.locator('#story-box.scene-id-backstory_return').waitFor({state:'attached'});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('bunker72_save_v1')).sceneId),'backstory_return');
  await resume('backstory_sarah_office');await skip();
  const notes=page.getByRole('button',{name:/Catatan Kerja Sarah/});await notes.click();
  await page.getByRole('dialog').waitFor();await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Tutup Catatan Kerja Sarah');
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  await fit('.scene-hotspot');
  const officeTargets=await page.locator('.scene-hotspot').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height];}));
  assert(officeTargets.every(([w,h])=>w>=43&&h>=43),`${name}: office touch target below 44px`);
  await noHorizontalScroll('Sarah office');
  await page.screenshot({path:`scratch/release-qa/${name}-office.png`});
  await page.getByRole('button',{name:/Laptop Analisis Dasar/}).click();
  await skip();await fit('#choices-panel button');

  await resume('backstory_sarah_update');await skip();
  await page.getByRole('tab',{name:/01 Geofisika/}).waitFor();
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'DATA BERIKUTNYA',exact:true}).click();
  await page.screenshot({path:`scratch/release-qa/${name}-analysis.png`});
  await page.getByRole('button',{name:'SELESAI MENINJAU DATA'}).focus();await page.keyboard.press('Enter');
  await page.locator('#story-box.scene-id-backstory_sarah_decision').waitFor();await skip();
  await fit('#choices-panel button');
  const choices=page.locator('#choices-panel button');assert.equal(await choices.count(),3);
  await choices.nth(1).focus();await page.keyboard.press('Space');
  await page.locator('#story-box.scene-id-backstory_sarah_response').waitFor();
  await page.reload();await page.locator('#continue-btn').click();await skip();
  assert.match(await page.locator('#dialogue-text').textContent(),/konfirmasi lintas instansinya/);

  await resume('day1_inspection');await skip();await fit('.scene-hotspot');
  await resume('day2_expedition_map');await skip();await fit('.expedition-map-panel button');
  await noHorizontalScroll('expedition map');
  await page.screenshot({path:`scratch/release-qa/${name}-map.png`});
  await resume('prolog_packing');await page.locator('.scavenger-touch-controls').waitFor({state:'attached'});
  if(touch){await fit('.scavenger-touch-controls button');await page.locator('.touch-right').tap();await page.locator('#touch-interact-btn').tap();}
  await page.screenshot({path:`scratch/release-qa/${name}-scavenger.png`});

  // All 12 ending states on desktop; each renderer on every viewport.
  for(const ending of ['ending_bad','ending_normal','ending_good'])for(const response of name==='desktop'?outcomes:['verify']){
    await resume(ending,{...flags,sarah_warning_response:response},ending==='ending_bad'?0:ending==='ending_normal'?40:90);
    await page.locator('#ending-view.active').waitFor();
    const id=ending==='ending_good'?'good':ending==='ending_bad'?'bad':null;
    if(id){for(let i=0;i<(id==='good'?4:3);i++)await page.locator(`#${id}-ending-next`).click();}
    const text=await page.locator('#ending-desc').innerText();
    assert.equal(text.includes('DAMPAK PUBLIK — SARAH'),response!==null);
    if(ending==='ending_bad')assert.match(text,/Ketiganya selamat/);
    await page.locator('#debrief-box summary').click();assert.equal(await page.locator('#debrief-list li').count(),6);
    await fit('#ending-desc, #debrief-box');
    await noHorizontalScroll(`${ending} ending`);
    await page.locator('#restart-btn').scrollIntoViewIfNeeded();
    const box=await page.locator('#restart-btn').boundingBox();assert(box&&box.y>=-1&&box.y+box.height<=height+2,`${name} restart not reachable`);
    if(response==='verify')await page.screenshot({path:`scratch/release-qa/${name}-${ending}.png`});
  }
  console.log(`PASS ${name}: new/save, office/Escape, analysis/Enter/Space, single decision reload, Day1/map, touch, ending/debrief bounds`);
  await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS browser QA: no uncaught page errors');
} finally {await browser.close();}
