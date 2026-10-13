import {validateProgram,validateSessionTemplate} from './programs.js'
export function validateSnapshot(data) {
  const object = value => value && typeof value === 'object' && !Array.isArray(value)
  if (!object(data) || data.version !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data.start) || !Number.isFinite(new Date(data.start).getTime())) throw Error('Invalid tracker backup or start date.')
  if(data.profile != null && !object(data.profile))throw Error('Invalid profile in backup.')
  if(data.profile?.trainingDays != null && (!Array.isArray(data.profile.trainingDays)||data.profile.trainingDays.some(d=>!Number.isInteger(d)||d<0||d>6)))throw Error('Invalid training days in backup.')
  if(data.targets.cardio != null && (!Number.isFinite(data.targets.cardio)||data.targets.cardio<0))throw Error('Invalid cardio target.')
  if(data.program) validateProgram(data.program)
  for (const name of ['targets', 'workouts', 'nutrition', 'measurements']) if (!object(data[name])) throw Error(`Invalid ${name} in backup.`)
  for (const key of ['calories','protein','carbs','fat','steps']) if (!Number.isFinite(data.targets[key]) || data.targets[key] < 0) throw Error('Targets must be nonnegative numbers.')
  for (const name of ['workouts','nutrition','measurements']) for (const [date, entry] of Object.entries(data[name])) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !object(entry)) throw Error(`Invalid ${name} entry.`)
    if (name === 'workouts') {
      if (typeof entry.day !== 'string' || !object(entry.exercises) || (entry.notes != null && typeof entry.notes !== 'string')) throw Error('Invalid workout.')
      if(entry.cardioMinutes != null && (!Number.isFinite(entry.cardioMinutes)||entry.cardioMinutes<0))throw Error('Invalid cardio minutes.')
      if(entry.template) validateSessionTemplate(entry.template)
      for (const [index, sets] of Object.entries(entry.exercises)) {
        if (!/^\d+$/.test(index) || !Array.isArray(sets)) throw Error('Invalid exercise sets.')
        for (const set of sets) if (!object(set) || typeof set.done !== 'boolean' || ['weight','reps'].some(k => set[k] !== '' && (!Number.isFinite(Number(set[k])) || Number(set[k]) < 0))) throw Error('Invalid set values.')
      }
    }
    if (name === 'nutrition' && (!Array.isArray(entry.foods) || entry.foods.some(f => !object(f) || typeof f.name !== 'string' || ['calories','protein','carbs','fat'].some(k => !Number.isFinite(Number(f[k])) || Number(f[k]) < 0)))) throw Error('Invalid nutrition entry.')
    if (name === 'measurements' && Object.values(entry).some(v => v !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0))) throw Error('Invalid measurement.')
  }
  return data
}
export function downloadBackup(data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}))
  const a = document.createElement('a'); a.href = url; a.download = 'form-tracker-backup.json'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}
