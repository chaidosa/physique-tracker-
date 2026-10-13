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
