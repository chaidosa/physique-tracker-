export const LEGACY_PROGRAM=[
{day:'Push',dow:1,focus:'Chest, shoulders, triceps',moves:[['Incline dumbbell bench press',3,'8–12'],['Machine chest press',2,'8–12'],['Seated shoulder press',2,'8–12'],['Cable lateral raise',3,'12–20'],['Rope triceps pushdown',2,'10–15'],['Overhead cable triceps extension',2,'10–15']]},
{day:'Pull',dow:2,focus:'Back width, thickness, biceps',moves:[['Lat pulldown',3,'8–12'],['Chest-supported row',3,'8–12'],['One-arm cable lat pulldown',2,'10–15'],['Reverse pec deck',2,'12–20'],['EZ-bar curl',2,'10–15'],['Hammer curl',2,'10–15']]},
{day:'Legs',dow:3,focus:'Quads, hamstrings, calves',moves:[['Hack squat or goblet squat',3,'8–12'],['Romanian deadlift',2,'8–10'],['Leg press',2,'10–15'],['Seated leg curl',2,'10–15'],['Standing calf raise',3,'10–15']]},
{day:'Upper',dow:5,focus:'Chest, back, shoulder width, arms',moves:[['Incline machine press',3,'8–12'],['Assisted pull-up or lat pulldown',2,'8–12'],['Seated cable row',2,'8–12'],['Cable chest fly',2,'12–15'],['Dumbbell lateral raise',3,'12–20'],['Reverse pec deck',2,'12–20'],['Preacher curl',2,'10–15'],['Cable triceps pushdown',2,'10–15']]},
{day:'Lower + Abs',dow:6,focus:'Lower body, core',moves:[['Leg press or squat',3,'8–12'],['Hip thrust',2,'8–12'],['Lying leg curl',3,'10–15'],['Leg extension',2,'12–15'],['Seated calf raise',3,'10–20'],['Cable crunch',3,'10–15'],['Hanging knee raise',2,'10–15']]}];


export const GOALS = { muscle:'Build muscle', fatloss:'Reduce body fat', recomp:'Body recomposition', strength:'Build strength', fitness:'General fitness', endurance:'Improve endurance' }
export const EQUIPMENT = { gym:'Full gym', dumbbells:'Dumbbells at home', bodyweight:'Bodyweight + resistance band' }
export const SPLITS = { auto:'Recommend for my schedule', fullbody:'Full body', upperlower:'Upper / lower', ppl:'Push / pull / legs', hybrid:'Push / pull / legs + upper / lower', strengthcardio:'Strength + cardio' }
const names={
 gym:{squat:'Goblet squat or leg press',hinge:'Romanian deadlift',chest:'Dumbbell bench press',chest2:'Incline dumbbell press',hammer:'Hammer curl',row:'Seated cable row',vertical:'Lat pulldown',shoulder:'Seated dumbbell shoulder press',glute:'Hip thrust',curl:'Seated leg curl',calf:'Standing calf raise',lateral:'Cable lateral raise',biceps:'Dumbbell curl',triceps:'Cable triceps pushdown',core:'Cable crunch',split:'Split squat',rear:'Reverse pec deck'},
 dumbbells:{squat:'Dumbbell goblet squat',hinge:'Dumbbell Romanian deadlift',chest:'Dumbbell floor press',chest2:'Close-grip dumbbell floor press',hammer:'Dumbbell hammer curl',row:'One-arm dumbbell row',vertical:'Dumbbell pullover',shoulder:'Dumbbell shoulder press',glute:'Dumbbell glute bridge',curl:'Hamstring walkout',calf:'Dumbbell calf raise',lateral:'Dumbbell lateral raise',biceps:'Dumbbell curl',triceps:'Dumbbell overhead triceps extension',core:'Dead bug (reps per side)',split:'Dumbbell split squat',rear:'Bent-over dumbbell reverse fly'},
 bodyweight:{squat:'Chair squat',hinge:'Bodyweight hip hinge',chest:'Incline push-up',chest2:'Push-up (comfortable variation)',hammer:'Resistance-band hammer curl',row:'Seated resistance-band row',vertical:'Resistance-band pulldown (secure anchor)',shoulder:'Pike push-up or band shoulder press',glute:'Glute bridge',curl:'Hamstring walkout',calf:'Bodyweight calf raise',lateral:'Resistance-band lateral raise',biceps:'Resistance-band curl',triceps:'Close-grip incline push-up',core:'Dead bug (reps per side)',split:'Supported split squat',rear:'Resistance-band pull-apart'}
}
const patterns={
 fullbody:[['Full body A',['squat','chest','row','hinge','lateral','core']],['Full body B',['hinge','shoulder','vertical','split','biceps','core']],['Full body C',['squat','chest','row','glute','calf','core']]],
 upperlower:[['Upper A',['chest','row','shoulder','vertical','lateral','triceps']],['Lower A',['squat','hinge','split','curl','calf','core']],['Upper B',['vertical','chest','row','shoulder','rear','biceps']],['Lower B',['hinge','squat','glute','curl','calf','core']]],
 ppl:[['Push A',['chest','shoulder','chest2','lateral','triceps','core']],['Pull A',['vertical','row','rear','biceps','hammer','core']],['Legs A',['squat','hinge','split','curl','calf','core']],['Push B',['shoulder','chest','lateral','triceps','core','rear']],['Pull B',['row','vertical','rear','biceps','hammer','core']],['Legs B',['hinge','squat','glute','curl','calf','core']]],
 hybrid:[['Push',['chest','shoulder','lateral','triceps','core','rear']],['Pull',['vertical','row','rear','biceps','core','hinge']],['Legs',['squat','hinge','curl','calf','core','split']],['Upper',['chest','row','vertical','lateral','biceps','triceps']],['Lower + Abs',['squat','glute','curl','calf','core','split']]]
}
export function validateSessionTemplate(day) {
 if(!day || !Number.isInteger(day.dow) || day.dow<0 || day.dow>6)throw Error('Choose a valid weekday for each session.')
 if(typeof day.day!=='string'||!day.day.trim())throw Error('Give each session a name.')
 if(typeof day.focus!=='string'||!Array.isArray(day.moves)||(!day.moves.length&&day.kind!=='cardio')||day.moves.length>12)throw Error('Each strength session needs one to twelve exercises.')
 for(const move of day.moves)if(!Array.isArray(move)||typeof move[0]!=='string'||!move[0].trim()||move[0].length>120||!Number.isInteger(move[1])||move[1]<1||move[1]>10||typeof move[2]!=='string'||!move[2].trim()||move[2].length>40)throw Error('Exercises need a name, one to ten sets, and a rep range.')
 return day
}
export function validateProgram(program) {
 if(!program || typeof program.name!=='string' || !program.name.trim() || !Array.isArray(program.days) || program.days.length<2 || program.days.length>6)throw Error('Choose a routine with two to six training days.')
 const weekdays=new Set(),labels=new Set()
 for(const day of program.days){
  validateSessionTemplate(day)
  if(weekdays.has(day.dow))throw Error('Each session needs a different weekday.')
  if(labels.has(day.day))throw Error('Give each session a unique name.')
  weekdays.add(day.dow);labels.add(day.day)
 }
 return program
}
export function generateProgram(profile) {
 const days=[...profile.trainingDays].sort((a,b)=>(a===0?7:a)-(b===0?7:b))
 if(days.length<2||days.length>6||new Set(days).size!==days.length)throw Error('Choose two to six different training days.')
 if(!GOALS[profile.goal]||!EQUIPMENT[profile.equipment]||!['beginner','intermediate','advanced'].includes(profile.experience))throw Error('Choose your goal, equipment, and experience.')
 let split=profile.split==='auto'? profile.goal==='endurance'&&days.length>=3?'strengthcardio':days.length<=3?'fullbody':days.length===4?'upperlower':days.length===5?'hybrid':'ppl':profile.split
 if(!patterns[split]&&split!=='strengthcardio')throw Error('Choose a supported routine type.')
 if(split==='fullbody'&&days.length>3)throw Error('Full-body routines use two or three days to allow recovery.')
 if(split==='upperlower'&&days.length!==4)throw Error('Upper/lower uses four training days.')
 if(split==='hybrid'&&days.length!==5)throw Error('The hybrid split uses five training days.')
 if(split==='ppl'&&days.length!==6)throw Error('This push/pull/legs routine uses six training days.')
 if(split==='strengthcardio'&&days.length<3)throw Error('Strength + cardio uses at least three days: two strength sessions and an aerobic session.')
 const count=profile.sessionMinutes<=30?4:profile.sessionMinutes<=45?5:6
 const lowImpact=profile.lowImpact
 const conditioning=profile.goal==='endurance'?'Build comfortable aerobic sessions gradually; use the talk test.':profile.goal==='fatloss'||profile.goal==='fitness'?'Add comfortable aerobic activity across your week.':'Add easy cardio if it fits your recovery and schedule.'
 const program={name:`${days.length}-day ${SPLITS[split]}`,description:`${GOALS[profile.goal]} · ${EQUIPMENT[profile.equipment]} · ${profile.experience}`,split,goal:profile.goal,equipment:profile.equipment,days:days.map((dow,i)=>{
  if(split==='strengthcardio'&&i!==0&&i!==2)return {day:`Cardio ${i===1?'A':i===3?'B':i===4?'C':'D'}`,dow,kind:'cardio',focus:'Aerobic endurance',moves:[],cardio:`Comfortable aerobic session: start with ${profile.sessionMinutes<=30?'15–20':'20–30'} minutes or what you can manage. You should be able to talk. ${lowImpact?'Use walking or cycling.':'Choose walking, cycling, or jogging.'} Build duration gradually before intensity.`};
  const [day,keys]=split==='strengthcardio'?patterns.fullbody[i===0?0:1]:patterns[split][i]
  return {day,dow,focus:keys.slice(0,count).map(k=>({squat:'quads',hinge:'posterior chain',chest:'chest',chest2:'chest',hammer:'arms',row:'back',vertical:'back',shoulder:'shoulders',glute:'glutes',curl:'hamstrings',calf:'calves',lateral:'shoulders',biceps:'arms',triceps:'arms',core:'core',split:'legs',rear:'rear shoulders'})[k]).filter((v,i,a)=>a.indexOf(v)===i).join(', '),moves:keys.slice(0,count).map((key,j)=>[names[profile.equipment][key],profile.experience==='beginner'?2:3,profile.goal==='strength'&&j<2&&profile.equipment!=='bodyweight'?(profile.experience==='beginner'?'6–10':'4–6'):['core','lateral','rear','calf'].includes(key)?'12–15':'8–12']),cardio:`${conditioning} ${lowImpact?'Choose walking, cycling, or another comfortable low-impact option.':'Choose walking, cycling, jogging, or another activity you enjoy.'}`,rest:profile.goal==='strength'?'Rest 2–3 minutes on demanding sets; take longer if needed.':'Rest 1–2 minutes, longer on demanding compound movements.'}
 })}
 return validateProgram(program)
}

export const GOAL_GUIDANCE={
 muscle:'Build muscle: keep strength sessions consistent, progress reps and loads gradually, and review recovery and nutrition alongside your measurements.',
 fatloss:'Reduce body fat: keep resistance training, add manageable aerobic activity, and review food intake and weight trends over several weeks. Exercise selection does not target fat loss from a specific body area.',
 recomp:'Recomposition: track waist and training performance as well as weight. Body weight may change slowly while strength and measurements improve.',
 strength:'Build strength: record load and reps for your main lifts, allow enough rest, and progress only when technique and recovery are reliable.',
 fitness:'General fitness: prioritize a sustainable schedule, whole-body strength, comfortable aerobic activity, and recovery.',
 endurance:'Improve endurance: log aerobic minutes, increase manageable duration gradually, and keep strength work to support your activity.'
}
