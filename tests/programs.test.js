import test from 'node:test'
import assert from 'node:assert/strict'
import {generateProgram,validateProgram,GOALS,EQUIPMENT} from '../src/programs.js'
const base={goal:'muscle',experience:'beginner',equipment:'gym',split:'auto',trainingDays:[1,3,5],sessionMinutes:45,gender:'unspecified',bodyType:'unsure'}
test('every goal supports schedules of two through six days and each equipment option',()=>{
 for(const goal of Object.keys(GOALS))for(const equipment of Object.keys(EQUIPMENT))for(const trainingDays of [[1,4],[1,3,5],[1,2,4,5],[1,2,3,5,6],[1,2,3,4,5,6]]){
  const program=generateProgram({...base,goal,equipment,trainingDays})
  assert.equal(program.days.length,trainingDays.length)
  assert.deepEqual(program.days.map(d=>d.dow),trainingDays)
  assert.doesNotThrow(()=>validateProgram(program))
  if(equipment!=='gym')assert.ok(program.days.flatMap(d=>d.moves).every(m=>!/machine|cable|leg press|pec deck|Lat pulldown/.test(m[0])))
 }
})
test('endurance auto routine has two strength days with additional aerobic days',()=>{
 const p=generateProgram({...base,goal:'endurance',trainingDays:[1,2,4,6]})
 assert.equal(p.days.filter(d=>d.kind==='cardio').length,2)
 assert.equal(p.days.filter(d=>d.moves.length).length,2)
})
test('experience and time budget affect volume; strength changes compound rep ranges',()=>{
 const a=generateProgram({...base,sessionMinutes:30})
 const b=generateProgram({...base,goal:'strength',experience:'intermediate',sessionMinutes:60})
 assert.equal(a.days[0].moves.length,4);assert.equal(a.days[0].moves[0][1],2)
 assert.equal(b.days[0].moves.length,6);assert.equal(b.days[0].moves[0][1],3);assert.equal(b.days[0].moves[0][2],'4–6')
})
test('gender and build do not impose stereotyped exercises or workloads',()=>assert.deepEqual(generateProgram({...base,gender:'woman',bodyType:'lean'}),generateProgram({...base,gender:'man',bodyType:'higherfat'})))
test('rejects incompatible schedules and duplicate weekdays',()=>{
 assert.throws(()=>generateProgram({...base,split:'upperlower'}),/four/)
 assert.throws(()=>generateProgram({...base,trainingDays:[1,1,3]}),/different/)
 const p=generateProgram(base);p.days[1].dow=p.days[0].dow;assert.throws(()=>validateProgram(p),/different/)
})
