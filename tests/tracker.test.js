import test from 'node:test'
import assert from 'node:assert/strict'
import {JSDOM} from 'jsdom'
import {mountTracker} from '../src/tracker.js'

test('original tracker logs sets, macros and measurements through the persistence callback',()=>{
  const dom=new JSDOM('<div id="app"></div>',{url:'https://example.com'})
  const previous=globalThis.AbortController
  globalThis.AbortController=dom.window.AbortController
  globalThis.confirm=()=>true
  const root=dom.window.document.querySelector('#app'), snapshots=[]
  const tracker=mountTracker(root,null,snapshot=>snapshots.push(snapshot))
  const click=s=>root.querySelector(s).click()
  const change=(s,value)=>{const el=root.querySelector(s);el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}))}
  click('[data-page="workout"]')
  change('#globalDate','2026-10-12')
  change('[data-ex="0"][data-set="0"][data-field="weight"]','15')
  change('[data-ex="0"][data-set="0"][data-field="reps"]','10')
  assert.equal(snapshots.at(-1).workouts['2026-10-12'].exercises[0][0].reps,'10')
  const oldWeight=snapshots[0].workouts['2026-10-12'].exercises[0][0].weight
  change('[data-ex="0"][data-set="0"][data-field="weight"]','20')
  assert.equal(snapshots[0].workouts['2026-10-12'].exercises[0][0].weight,oldWeight,'save snapshots cannot be mutated by subsequent edits')
  click('[data-page="nutrition"]')
  for(const [id,value] of Object.entries({foodName:'Lunch',foodCalories:500,foodProtein:30,foodCarbs:60,foodFat:10}))root.querySelector('#'+id).value=value
  root.querySelector('#foodForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}))
  assert.equal(tracker.getData().nutrition['2026-10-12'].foods[0].calories,500)
  click('[data-page="progress"]');change('[data-measure="weight"]','79')
  assert.equal(tracker.getData().measurements['2026-10-12'].weight,79)
  const backup=tracker.getData();tracker.destroy()
  const restored=mountTracker(root,backup,()=>{})
  assert.deepEqual(restored.getData(),backup)
  restored.destroy();dom.window.close();globalThis.AbortController=previous;delete globalThis.confirm
})

test('preview, personalized plan, routine editing, and old history survive a plan switch',()=>{
 const dom=new JSDOM('<div id="app"></div>',{url:'https://example.com'})
 const previous=globalThis.AbortController;globalThis.AbortController=dom.window.AbortController
 const root=dom.window.document.querySelector('#app'), snapshots=[]
 const tracker=mountTracker(root,{version:1,start:'2026-10-12',targets:{calories:2350,protein:160,carbs:270,fat:70,steps:6000},profile:{age:30,height:174,startingWeight:79},workouts:{'2026-10-12':{day:'Push',notes:'old notes',exercises:{0:[{weight:'15',reps:'10',done:true}]}}},nutrition:{},measurements:{}},s=>snapshots.push(s))
 root.querySelector('[data-page="plan"]').click()
 assert.equal(root.querySelector('[name="sessionMinutes"]').value,'45')
 root.querySelector('[name="equipment"]').value='dumbbells'
 root.querySelector('[name="goal"]').value='strength'
 root.querySelector('[name="startingWeight"]').value='70'
 root.querySelector('[name="suggestProtein"]').checked=true
 root.querySelector('#previewPlan').click()
 assert.equal(snapshots.length,0,'preview cannot change saved data')
 assert.match(root.querySelector('#planPreview').textContent,/Dumbbell/)
 root.querySelector('#profileForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}))
 assert.equal(snapshots.at(-1).targets.protein,112)
 assert.equal(snapshots.at(-1).targets.calories,2350,'existing nutrition targets are preserved unless explicitly edited')
 assert.equal(snapshots.at(-1).program.days.length,3)
 assert.equal(snapshots.at(-1).workouts['2026-10-12'].template.moves[0][0],'Incline dumbbell bench press')
 assert.equal(snapshots.at(-1).workouts['2026-10-12'].exercises[0][0].weight,'15')
 root.querySelector('[data-editor-day="0"] [data-move-field="name"]').value='My custom squat'
 root.querySelector('#routineEditor').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}))
 assert.equal(tracker.getData().program.days[0].moves[0][0],'My custom squat')
 root.querySelector('[data-page="workout"]').click()
 const change=(selector,value)=>{const el=root.querySelector(selector);el.value=value;el.dispatchEvent(new dom.window.Event('change',{bubbles:true}))}
 change('#globalDate','2026-10-12')
 assert.match(root.textContent,/Incline dumbbell bench press/)
 assert.doesNotMatch(root.textContent,/My custom squat/)
 change('#globalDate','2026-10-19')
 assert.match(root.textContent,/My custom squat/)
 change('[data-ex="0"][data-set="0"][data-field="weight"]','25')
 const stored=tracker.getData();assert.equal(stored.workouts['2026-10-19'].template.moves[0][0],'My custom squat')
 tracker.destroy();const reloaded=mountTracker(root,stored,()=>{});assert.deepEqual(reloaded.getData(),stored)
 reloaded.destroy();dom.window.close();globalThis.AbortController=previous
})

test('endurance session logs cardio without dummy exercise sets and persists across reload',()=>{
 const dom=new JSDOM('<div id="app"></div>',{url:'https://example.com'})
 const previous=globalThis.AbortController;globalThis.AbortController=dom.window.AbortController
 const root=dom.window.document.querySelector('#app');const tracker=mountTracker(root,null,()=>{})
 root.querySelector('[name="goal"]').value='endurance'
 root.querySelector('#profileForm').dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true}))
 root.querySelector('[data-page="workout"]').click()
 const date=root.querySelector('#globalDate');date.value='2026-10-14';date.dispatchEvent(new dom.window.Event('change',{bubbles:true}))
 assert.equal(root.querySelectorAll('[data-ex]').length,0)
 const cardio=root.querySelector('#cardioMinutes');cardio.value='25';cardio.dispatchEvent(new dom.window.Event('change',{bubbles:true}))
 const data=tracker.getData();assert.equal(data.workouts['2026-10-14'].cardioMinutes,25);assert.equal(data.workouts['2026-10-14'].template.kind,'cardio')
 assert.deepEqual(data.workouts['2026-10-14'].exercises,{})
 tracker.destroy();const reloaded=mountTracker(root,data,()=>{});assert.deepEqual(reloaded.getData(),data)
 reloaded.destroy();dom.window.close();globalThis.AbortController=previous
})
