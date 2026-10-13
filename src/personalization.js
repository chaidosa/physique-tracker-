import {generateProgram,validateProgram,GOALS,EQUIPMENT,SPLITS,LEGACY_PROGRAM} from './programs.js'
const weekdays=[[1,'Mon'],[2,'Tue'],[3,'Wed'],[4,'Thu'],[5,'Fri'],[6,'Sat'],[0,'Sun']]
const options=(values,selected,esc)=>Object.entries(values).map(([value,label])=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`).join('')
export function renderPlanPage(db,esc) {
 const p={name:'',goal:'fitness',experience:'beginner',equipment:'gym',split:'auto',trainingDays:[1,3,5],sessionMinutes:45,gender:'unspecified',bodyType:'unsure',...db.profile}
 const program=db.program||{name:'Original five-day split',description:'Your existing routine is preserved until you apply a new plan.',days:LEGACY_PROGRAM}
 const select=(name,label,values)=>`<div class="field"><label for="profile-${name}">${label}</label><select id="profile-${name}" name="${name}">${options(values,p[name],esc)}</select></div>`
 const num=(name,label,min,max,value)=>`<div class="field"><label for="profile-${name}">${label}</label><input id="profile-${name}" name="${name}" type="number" min="${min}" max="${max}" step="0.1" value="${esc(value??'')}"></div>`
 return `<div class="top"><div><div class="eyebrow">Designed around you</div><h1>My plan</h1><p class="muted">Choose your goal. Build a routine you can keep.</p></div><span class="pill">Private to your account</span></div>
 <div class="card"><h2>Your profile & preferences</h2><form id="profileForm">
 <div class="profile-grid"><div class="field"><label for="profile-name">Name (optional)</label><input id="profile-name" name="name" maxlength="60" value="${esc(p.name)}" placeholder="What should we call you?"></div>
 ${select('goal','Main goal',GOALS)}${select('experience','Training experience',{beginner:'Beginner',intermediate:'Intermediate',advanced:'Advanced'})}${select('equipment','Available equipment',EQUIPMENT)}${select('split','Routine type',{keep:'Keep my current routine',...SPLITS})}
 ${select('sessionMinutes','Session time budget',{30:'Around 30 minutes',45:'Around 45 minutes',60:'Around 60 minutes'})}
 ${select('gender','Gender (optional)',{unspecified:'Prefer not to say',woman:'Woman',man:'Man',nonbinary:'Nonbinary',selfdescribed:'Self-described'})}
 ${select('bodyType','Current build (optional)',{unsure:'Unsure / prefer not to say',lean:'Lean',higherfat:'Higher body fat',muscular:'Muscular',average:'Average build'})}
 ${num('age','Age (adult plans: 18+)',18,100,p.age)}${num('height','Height (cm, optional)',100,250,p.height)}${num('startingWeight','Current weight (kg, optional)',30,300,p.startingWeight)}${num('goalWeight','Goal weight (kg, optional)',30,300,p.goalWeight)}
 </div><p class="hint">Gender and build are optional profile context. Your exercise prescription comes from your goals, experience, schedule, equipment, and preferences. Build labels do not determine metabolism or prescribe a routine.</p>
 <fieldset class="day-picker"><legend>Training days — choose 2 to 6</legend>${weekdays.map(([dow,label])=>`<label><input type="checkbox" name="trainingDays" value="${dow}" ${p.trainingDays?.includes(dow)?'checked':''}> ${label}</label>`).join('')}</fieldset>
 <label class="check-label"><input type="checkbox" name="lowImpact" ${p.lowImpact?'checked':''}> Prefer low-impact conditioning</label>
 <div class="profile-grid section"><div class="field"><label for="plan-start">Program start date</label><input id="plan-start" type="date" name="start" required value="${esc(db.start)}"></div></div>
 <h3 class="section">Your daily targets</h3><p class="hint">Optional and editable. Zero means no target set. Applying a routine keeps the values below; it does not prescribe calories based on gender or build.</p>
 <div class="profile-grid">${Object.entries({calories:'Calories (kcal)',protein:'Protein (g)',carbs:'Carbs (g)',fat:'Fat (g)',steps:'Steps',cardio:'Weekly cardio (minutes)'}).map(([key,label])=>`<div class="field"><label for="target-${key}">${label}</label><input id="target-${key}" name="target-${key}" type="number" min="0" max="${key==='steps'?100000:10000}" step="1" value="${esc(db.targets[key]||0)}"></div>`).join('')}</div>
 <label class="check-label"><input type="checkbox" name="suggestProtein"> Use a protein starting point of 1.6 g/kg from my current weight</label><p class="hint">Optional estimate for healthy exercising adults, not a clinical nutrition plan. Enter your weight to use it; adjust the target to suit your needs.</p>
 <div class="fields section"><button type="button" id="previewPlan" class="btn secondary">Preview routine</button><button type="submit" class="btn">Save profile & apply routine</button></div><p id="planError" class="error" role="alert"></p></form></div>
 <div id="planPreview" class="section" aria-live="polite"></div>
 <div class="card section"><div class="row"><h2>Your current routine</h2><span class="pill">${program.days.length} training days</span></div><p class="accent">${esc(program.name)}</p><p class="hint">${esc(program.description||'Custom routine')} · Edit the names, exercises, sets, or rep ranges below. Changes affect new sessions. Previously logged sessions retain their original routine.</p>
 <form id="routineEditor"><div class="field"><label for="routine-name">Routine name</label><input id="routine-name" name="programName" required maxlength="100" value="${esc(program.name)}"></div>
 ${program.days.map((d,i)=>`<section class="exercise" data-editor-day="${i}"><div class="profile-grid"><div class="field"><label for="session-name-${i}">Session name</label><input id="session-name-${i}" name="day-${i}" required maxlength="60" value="${esc(d.day)}"></div><div class="field"><label for="session-dow-${i}">Weekday</label><select id="session-dow-${i}" name="dow-${i}">${weekdays.map(([dow,label])=>`<option value="${dow}" ${dow===d.dow?'selected':''}>${label}</option>`).join('')}</select></div></div>
 <div class="tablewrap"><table><thead><tr><th>Exercise</th><th>Sets</th><th>Rep range</th><th></th></tr></thead><tbody>${d.moves.map((move,j)=>editorRow(move,i,j,esc)).join('')}</tbody></table></div>${d.kind==='cardio'?'<p class="hint">Aerobic session — log completed minutes in Workout log.</p>':`<button type="button" class="btn secondary smallbtn" data-add-move="${i}">+ Add exercise</button>`}</section>`).join('')}
 <button class="btn" type="submit">Save routine edits</button><p id="routineError" class="error" role="alert"></p></form></div>
 <div class="card section"><h2>How to use your plan</h2><p class="stattext">These are starting templates for healthy adults. Warm up, use controlled technique, and choose a load that leaves roughly 2–3 reps in reserve. Add reps within your range first; increase load gradually when your sets feel manageable. Session times are budgets, not guarantees. Your available equipment must support the listed movements safely.</p><p class="stattext">For overall health, work toward 150 minutes of moderate aerobic activity per week alongside strength work on at least two days. Start with what you can comfortably manage and build up.</p><p class="hint">The templates are not injury rehabilitation or pregnancy/postpartum programs. If you need those adaptations, use a qualified professional's plan and customize your routine here.</p><p class="hint">Sources: <a href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noreferrer">ACSM resistance training guidance</a> · <a href="https://www.cdc.gov/physical-activity-basics/guidelines/adults.html" target="_blank" rel="noreferrer">CDC adult activity guidance</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noreferrer">ISSN protein position stand</a></p></div>`
}
function editorRow(move,i,j,esc) {
 return `<tr><td><input class="exercise-name" aria-label="Session ${i+1} exercise ${j+1} name" data-move-field="name" required maxlength="120" value="${esc(move[0])}"></td><td><input aria-label="Session ${i+1} exercise ${j+1} sets" data-move-field="sets" type="number" min="1" max="10" required value="${move[1]}"></td><td><input aria-label="Session ${i+1} exercise ${j+1} rep range" data-move-field="reps" required maxlength="40" value="${esc(move[2])}"></td><td><button type="button" data-remove-move aria-label="Remove exercise">×</button></td></tr>`
}
export function bindPlanPage(root,db,actions) {
 const form=root.querySelector('#profileForm')
 const read=()=>{
  const f=new root.ownerDocument.defaultView.FormData(form)
  const profile={name:f.get('name').trim(),goal:f.get('goal'),experience:f.get('experience'),equipment:f.get('equipment'),split:f.get('split'),sessionMinutes:Number(f.get('sessionMinutes')),gender:f.get('gender'),bodyType:f.get('bodyType'),trainingDays:f.getAll('trainingDays').map(Number),lowImpact:f.has('lowImpact')}
  for(const key of ['age','height','startingWeight','goalWeight'])if(f.get(key)!=='')profile[key]=Number(f.get(key))
  const targets={...db.targets}
  for(const key of ['calories','protein','carbs','fat','steps','cardio'])targets[key]=Number(f.get(`target-${key}`))
  if(f.has('suggestProtein')){if(!profile.startingWeight)throw Error('Enter your current weight to calculate the protein starting point.');targets.protein=Math.round(profile.startingWeight*1.6)}
  const program=profile.split==='keep'?structuredClone(db.program||{name:'Original five-day split',days:LEGACY_PROGRAM}):generateProgram(profile)
  if(profile.split==='keep')profile.trainingDays=program.days.map(d=>d.dow)
  return {profile,targets,start:f.get('start'),program}
 }
 root.querySelector('#previewPlan').onclick=()=>{
  if(!form.reportValidity())return
  try{
   const {program}=read(), esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
   root.querySelector('#planError').textContent=''
   root.querySelector('#planPreview').innerHTML=`<div class="card"><div class="eyebrow">Preview — not saved yet</div><h2>${esc(program.name)}</h2><p>${esc(program.description)}</p><div class="routine-preview">${program.days.map(d=>`<div class="exercise"><h3>${esc(d.day)} · ${weekdays.find(([dow])=>dow===d.dow)[1]}</h3><ul>${d.moves.map(m=>`<li>${esc(m[0])} · ${m[1]} × ${esc(m[2])}</li>`).join('')}</ul><p class="hint">${esc(d.rest)}</p><p class="hint">${esc(d.cardio)}</p></div>`).join('')}</div></div>`
  }catch(err){root.querySelector('#planError').textContent=err.message}
 }
 form.onsubmit=e=>{e.preventDefault();try{const {profile,program,targets,start}=read();actions.apply(profile,program,targets,start)}catch(err){root.querySelector('#planError').textContent=err.message}}
 const editor=root.querySelector('#routineEditor')
 editor.onclick=e=>{
  const remove=e.target.closest('[data-remove-move]');if(remove){remove.closest('tr').remove();return}
  const add=e.target.closest('[data-add-move]');if(add){const tbody=editor.querySelector(`[data-editor-day="${add.dataset.addMove}"] tbody`);if(tbody.children.length>=12){root.querySelector('#routineError').textContent='Use at most twelve exercises per session.';return}tbody.insertAdjacentHTML('beforeend',editorRow(['',2,'8–12'],Number(add.dataset.addMove),tbody.children.length,v=>v));tbody.lastElementChild.querySelector('input').focus()}
 }
 editor.onsubmit=e=>{
  e.preventDefault()
  try{
   const program=structuredClone(db.program||{name:'Original five-day split',days:LEGACY_PROGRAM})
   program.name=editor.querySelector('[name="programName"]').value.trim()
   program.days=program.days.map((day,i)=>({...day,day:editor.querySelector(`[name="day-${i}"]`).value.trim(),dow:Number(editor.querySelector(`[name="dow-${i}"]`).value),moves:[...editor.querySelectorAll(`[data-editor-day="${i}"] tbody tr`)].map(row=>[row.querySelector('[data-move-field="name"]').value.trim(),Number(row.querySelector('[data-move-field="sets"]').value),row.querySelector('[data-move-field="reps"]').value.trim()])}))
   actions.edit(validateProgram(program))
  }catch(err){root.querySelector('#routineError').textContent=err.message}
 }
}
