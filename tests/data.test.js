import test from 'node:test'
import assert from 'node:assert/strict'
import {validateSnapshot} from '../src/data.js'
const backup=()=>({version:1,start:'2026-10-12',targets:{calories:2350,protein:160,carbs:270,fat:70,steps:6000},profile:{age:30,height:174,startingWeight:79},workouts:{'2026-10-12':{day:'Push',notes:'',exercises:{0:[{weight:'15',reps:'10',done:true},{weight:'',reps:'',done:false}]}}},nutrition:{'2026-10-12':{foods:[{name:'Lunch',calories:500,protein:30,carbs:60,fat:10}],steps:6000}},measurements:{'2026-10-12':{weight:79,waist:85}},habits:{}})
test('accepts original HTML backup values, including blank and string-valued sets',()=>assert.equal(validateSnapshot(backup()).workouts['2026-10-12'].exercises[0][0].weight,'15'))
test('rejects malformed imported exercise sets before replacement',()=>{const b=backup();b.workouts['2026-10-12'].exercises[0]={};assert.throws(()=>validateSnapshot(b),/sets/)})
test('rejects negative macros and invalid targets',()=>{const b=backup();b.nutrition['2026-10-12'].foods[0].protein=-1;assert.throws(()=>validateSnapshot(b),/nutrition/);b.targets.calories='2350';assert.throws(()=>validateSnapshot(b),/Targets/)})
test('rejects invalid dates and absent sections',()=>{const b=backup();b.start='bad';assert.throws(()=>validateSnapshot(b));delete b.nutrition;assert.throws(()=>validateSnapshot(b))})
