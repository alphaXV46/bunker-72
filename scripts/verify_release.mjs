import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

// Runs actual model/controller code with non-interactive view/audio adapters.
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
globalThis.localStorage = { getItem: () => null, setItem() {} };
globalThis.window = { setTimeout: (fn) => fn() };
try {
  const { GameModel } = await vite.ssrLoadModule('/src/js/gameModel.js');
  const { StoryEngine } = await vite.ssrLoadModule('/src/js/storyEngine.js');
  const { ENDING_IDS, parseHour, NEW_GAME_START_SCENE_ID } = await vite.ssrLoadModule('/src/js/constants.js');
  const { SARAH_ANALYSIS_SECTION_IDS } = await vite.ssrLoadModule('/src/js/sarahAnalysisConfig.js');
  const storyData = JSON.parse(fs.readFileSync('src/data/story.json', 'utf8'));
  const scenes = storyData.scenes;
  const previousStory = JSON.parse(execFileSync('git', ['show', 'HEAD:src/data/story.json'], { encoding: 'utf8' })).scenes;
  assert.deepEqual(Object.keys(scenes), Object.keys(previousStory));
  for (const [id, scene] of Object.entries(scenes)) {
    const mechanics = (s) => ({ hour:s.hour, phase:s.phase, next:s.autoNextSceneId,
      flags:s.setFlags, choices:s.choices.map(({text,log,...c})=>c) });
    assert.deepEqual(mechanics(scene), mechanics(previousStory[id]), `${id}: mechanics changed`);
  }
  const runtimeEdges = {
    backstory_sarah_office:['backstory_sarah_baseline'], backstory_sarah_update:['backstory_sarah_decision'],
    prolog_packing:['prolog_intro'], day1_inspection:['day1_lockdoor'],
    day2_expedition_map:['day2_hendra_encounter','day2_expedition_return'],
    day3_radio_rescue:['day3_radio_clear','day3_radio_weak','day3_radio_failed'],
    ending_eval:ENDING_IDS, trigger_ending_eval:ENDING_IDS,
  };
  const graph = new Map(Object.entries(scenes).map(([id,s])=>[id,[
    ...(s.autoNextSceneId?[s.autoNextSceneId]:[]), ...s.choices.map(c=>c.nextSceneId).filter(Boolean), ...(runtimeEdges[id]||[])
  ]]));
  graph.set('trigger_ending_eval', ENDING_IDS);
  for(const [id,targets] of graph)for(const target of targets)assert(graph.has(target),`${id} -> missing ${target}`);
  const reached = new Set(); const visit=id=>{if(reached.has(id))return; reached.add(id);graph.get(id).forEach(visit);};
  visit(NEW_GAME_START_SCENE_ID);
  assert(Object.keys(scenes).every(id=>reached.has(id)), 'Unreachable scene');
  assert.deepEqual([...graph].filter(([,targets])=>!targets.length).map(([id])=>id).sort(), [...ENDING_IDS].sort());
  assert.equal(Math.max(...Object.values(scenes).map(s=>parseHour(s.hour))),72);
  assert(!Object.keys(scenes).some(id=>id.startsWith('day4')));

  const profile = (health) => ({health,flags:{radio_quality:'clear',air_remedied:true,water_filtered:true,
    power_saved:true,inspected_radio:true,inspected_power:true,inspected_ventilation:true,extra_battery:true}});
  const make=(p,response=null)=>{const m=new GameModel();m.init('day3_final_hours',8,[],{...p.flags,sarah_warning_response:response}, {food:2,drink:2,kit:1},70,65,p.health);return m;};
  for(const [ending,p] of [['ending_bad',profile(0)],['ending_normal',profile(40)],['ending_good',profile(90)]]) {
    const base=make(p).evaluateModularEnding(); assert.equal(base.endingId,ending);
    for(const response of [null,'escalate','verify','maintain']) {
      const m=make(p,response);const before=structuredClone(m.toSaveData());const result=m.evaluateModularEnding();
      assert.equal(result.endingId,ending); assert.deepEqual(result.preparedness,base.preparedness);
      assert.deepEqual(m.toSaveData(),before,'Epilogue mutated state');
      const sarah=result.modules.filter(x=>x.id==='sarah_public_impact');assert.equal(sarah.length,response?1:0);
      assert.deepEqual(result.modules.filter(x=>x.id!=='sarah_public_impact'),base.modules);
      if(response)assert.equal(result.modules[1].id,'sarah_public_impact');
      if(ending==='ending_bad')assert.match(result.modules[0].body,/Ketiganya selamat/);
      for(const radio of ['clear','weak','failed'])for(const hendra of ['helped_stranger','stranger_guided','stranger_family_first']) {
        const other=make(p,response);other.flags.radio_quality=radio;other.flags[hendra]=true;
        other.flags.maya_toy_callback=true;other.flags.promised_maya=true;
        assert.deepEqual(other.evaluateModularEnding().modules.filter(x=>x.id==='sarah_public_impact'),sarah);
      }
    }
  }
  const noop=()=>{};
  const view=new Proxy({isTyping:false,dom:{choicesPanel:{innerHTML:'',classList:{remove:noop}},dialogueText:{textContent:''}},
    typeText(text,done){done?.();}}, {get:(target,key)=>target[key]??noop});
  const model=new GameModel();model.init(NEW_GAME_START_SCENE_ID);
  const engine=Object.create(StoryEngine.prototype);
  const saves=[];Object.assign(engine,{model,storyData,view,audio:new Proxy({}, {get:()=>noop}),
    onSave:s=>saves.push(structuredClone(s)),onEnd:noop,bunkerMinigame:{close:noop},
    sarahAnalysisReviewedIds:new Set(),sarahAnalysisIndex:0,_unlockedMinigameChoiceIds:new Set()});
  const initial=[model.health,model.hunger,model.thirst,model.knowledge,model.inventory];
  engine.renderScene(NEW_GAME_START_SCENE_ID);
  for(let i=0;i<10&&model.currentSceneId!=='backstory_sarah_office';i++)engine.handleDialogueClick();
  assert.equal(model.currentSceneId,'backstory_sarah_office');
  engine.handleSarahOfficeHotspot('work_notes');engine.handleSarahOfficeHotspot('laptop');
  engine.handleChoiceSelect(scenes.backstory_sarah_baseline.choices[0]);
  for(let i=0;i<12&&model.currentSceneId!=='backstory_sarah_update';i++)engine.handleDialogueClick();
  assert.equal(model.flags.sarah_update_reviewed,false);engine.completeSarahAnalysis();
  assert.equal(model.flags.sarah_update_reviewed,false);
  SARAH_ANALYSIS_SECTION_IDS.forEach((_,i)=>engine.handleSarahAnalysisNavigate(i));engine.completeSarahAnalysis();
  const decision=scenes.backstory_sarah_decision.choices[0];engine.handleChoiceSelect(decision);engine.handleChoiceSelect(decision);
  assert.equal(model.history.filter(x=>x.choiceId===decision.id).length,1);
  assert.equal(saves.at(-1).flags.sarah_warning_response,'escalate');
  engine.handleDialogueClick();engine.handleDialogueClick();assert.equal(model.currentSceneId,'prolog_home');
  assert.deepEqual([model.health,model.hunger,model.thirst,model.knowledge,model.inventory],initial);
  engine.handleChoiceSelect(scenes.prolog_home.choices[2]);
  engine.handleChoiceSelect(scenes.prolog_radio_peaceful.choices[0]);
  engine.handleChoiceSelect(scenes.prolog_foreshadow.choices[0]);
  engine.handleDialogueClick();engine.handleDialogueClick();assert.equal(model.currentSceneId,'prolog_packing');
  engine.handleScavengerComplete({collectedItems:['food','drink','kit','radio','battery','toy'],reason:'entered_hatch'});
  for(let i=0;i<8&&model.currentSceneId!=='prolog_title';i++)engine.handleDialogueClick();
  // Station completion supplied at the integration boundary; no puzzle solution claim.
  engine.bunkerMinigame.openStation=(_,options)=>options.onComplete();
  engine.handleChoiceSelect(scenes.prolog_title.choices[0]);engine.handleChoiceSelect(scenes.day1_power_boot.choices[0]);
  ['ventilation','power','radio'].forEach(id=>engine.handleDay1Inspection(id));
  engine.renderScene('day1_lockdoor');
  for(const id of ['c_day1_air_spare_filter','c_day1_air_safe_inventory','c_day1_water_rational','c_day1_sanitation_good','c_day1_rest_good','c_day1_maya_light','c_day2_begin_expedition','c_day2_open_expedition_map']) {
    const c=scenes[model.currentSceneId].choices.find(c=>c.id===id);assert(c,`${model.currentSceneId} lacks ${id}`);engine.handleChoiceSelect(c);
  }
  engine.handleExpeditionComplete({locationId:'neighbor_house',collectedItems:['food','drink']});
  engine.handleChoiceSelect(scenes.day2_hendra_encounter.choices[1]);
  engine.handleExpeditionComplete({locationId:'medical_post',collectedItems:['kit','mask']});
  assert.equal(model.currentSceneId,'day2_expedition_return');
  for(const id of ['c_day2_return_day3','c_day3_check_water','c_day3_water_filter','c_day3_power_radio']) {
    engine.handleChoiceSelect(scenes[model.currentSceneId].choices.find(c=>c.id===id));
  }
  engine.handleFinalRadioResult({quality:'weak',frequency:98.4,strength:65});
  engine.handleChoiceSelect(scenes.day3_radio_weak.choices[0]);
  engine.handleChoiceSelect(scenes.day3_final_dilemma.choices.at(-1));
  engine.handleChoiceSelect(scenes.day3_final_hours.choices[0]);
  assert(ENDING_IDS.includes(model.currentSceneId));
  const legacy=new GameModel();legacy.init('day2_start',5,[],null);assert.equal(legacy.currentSceneId,'day2_start');
  assert(!legacy.evaluateModularEnding().modules.some(x=>x.id==='sarah_public_impact'));
  console.log(`PASS: ${Object.keys(scenes).length} scenes, ${Object.values(scenes).reduce((n,s)=>n+s.choices.length,0)} choices; runtime graph, 12 endings, independence, fresh controller flow and legacy model.`);
} finally {await vite.close();}
