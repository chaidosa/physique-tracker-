import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { mountTracker } from './tracker.js'
import { downloadBackup, validateSnapshot } from './data.js'

function Tracker({ user, local, onExit }) {
  const root = useRef(null), tracker = useRef(null), pending = useRef(null), revision = useRef(0)
  const saving = useRef(false), timer = useRef(null), alive = useRef(true), conflict = useRef(false)
  const [status,setStatus] = useState('Loading…'), [ready,setReady] = useState(false), [error,setError] = useState('')
  async function flush() {
    clearTimeout(timer.current)
    if (saving.current || !pending.current || conflict.current) return
    saving.current = true
    const snapshot = pending.current
    pending.current = null
    setStatus('Saving…'); setError('')
    try {
      validateSnapshot(snapshot)
      if (local) localStorage.setItem('formTrackerCloudPreviewV1', JSON.stringify(snapshot))
      else {
        const {data,error:err} = await supabase.rpc('save_tracker', {snapshot, expected_revision:revision.current})
        if (err) { if (err.message.includes('changed on another device')) conflict.current = true; throw err }
        revision.current = data
      }
      if (alive.current) setStatus(pending.current ? 'Unsaved changes' : local ? 'Saved on this device only' : 'Saved to cloud')
    } catch (err) {
      pending.current ??= snapshot
      if (alive.current) { setStatus('Unsaved changes'); setError(err.message) }
    } finally {
      saving.current = false
      if (alive.current && pending.current && !conflict.current) {
        // Retry only after a newer edit, never continuously on network failure.
        if (pending.current !== snapshot) timer.current = setTimeout(flush,700)
      }
    }
  }
  useEffect(() => {
    alive.current = true
    let cancelled = false
    async function load() {
      try {
        let data = null
        if (local) { const stored = localStorage.getItem('formTrackerCloudPreviewV1'); if (stored) data = validateSnapshot(JSON.parse(stored)) }
        else {
          const {data:result,error:err} = await supabase.rpc('load_tracker')
          if (err) throw err
          revision.current = result.revision
          data = result.snapshot
          if (data) validateSnapshot(data)
        }
        if (cancelled) return
        tracker.current = mountTracker(root.current,data, snapshot => {
          pending.current = snapshot
          setStatus('Unsaved changes')
          clearTimeout(timer.current)
          timer.current = setTimeout(flush,700)
        })
        setReady(true); setStatus(local ? 'Local mode · no cloud sync' : 'Cloud connected')
      } catch (err) { if (!cancelled) { setError(err.message); setStatus('Could not load tracker') } }
    }
    load()
    const beforeUnload = e => { if (pending.current || saving.current) { e.preventDefault(); e.returnValue = '' } }
    const online = () => { if (!conflict.current) flush() }
    const hidden = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('beforeunload',beforeUnload); window.addEventListener('online',online); document.addEventListener('visibilitychange',hidden)
    return () => {
      cancelled = true; alive.current = false; clearTimeout(timer.current); tracker.current?.destroy()
      window.removeEventListener('beforeunload',beforeUnload); window.removeEventListener('online',online); document.removeEventListener('visibilitychange',hidden)
    }
  }, [local, user?.id])
  async function exit() {
    await flush()
    if (saving.current || pending.current) { setError('You have unsaved changes. Retry saving or export a backup before leaving.'); return }
    if (!local) { const {error:err} = await supabase.auth.signOut(); if (err) { setError(err.message); return } }
    onExit()
  }
  return <>
    <div className="syncbar"><span role="status">{status}</span><div>{ready && <><button className="btn secondary smallbtn" onClick={flush} disabled={conflict.current}>Save now</button><button className="btn secondary smallbtn" onClick={() => downloadBackup(tracker.current.getData())}>Backup</button></>}<button className="btn secondary smallbtn" onClick={exit}>{local?'Exit local mode':'Sign out'}</button></div></div>
    {error && <div className="notice error" role="alert">{error}{conflict.current && ' Export your changes with Backup, then reload to load the latest cloud data.'}{!ready && ' Check that the Supabase schema has been run and the project is reachable.'}</div>}
    <div ref={root}/>
  </>
}
export default function App() {
  const [user,setUser] = useState(null), [local,setLocal] = useState(false), [loading,setLoading] = useState(!!supabase)
  const [message,setMessage] = useState(''), [busy,setBusy] = useState(false), [signup,setSignup] = useState(false)
  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({data,error}) => { if(active) { setUser(data.session?.user ?? null); setLoading(false); if(error) setMessage(error.message) } }).catch(e => { if(active) {setLoading(false);setMessage(e.message)} })
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,session) => { setUser(session?.user ?? null); setLoading(false) })
    return () => { active=false;subscription.unsubscribe() }
  },[])
  async function auth(e) {
    e.preventDefault();setBusy(true);setMessage('')
    const form = new FormData(e.currentTarget)
    try {
      const credentials = { email:form.get('email').trim(),password:form.get('password') }
      const {data,error} = signup ? await supabase.auth.signUp({...credentials,options:{emailRedirectTo:window.location.origin}}) : await supabase.auth.signInWithPassword(credentials)
      if (error) throw error
      if (signup && !data.session) setMessage('Check your email to confirm your account, then return here and sign in.')
    } catch(err) { setMessage(err.message) } finally {setBusy(false)}
  }
  if (loading) return <div className="auth card" role="status">Connecting to your account…</div>
  if (user || local) return <Tracker key={local?'local':user.id} user={user} local={local} onExit={()=>{setLocal(false);setUser(null)}}/>
  return <main className="auth card"><div className="brand">FORM<span>.</span></div><p className="eyebrow">Your 12-week transformation</p><h1>Your progress.<br/>Everywhere.</h1><p className="stattext">Your original program, workouts, meals, and measurements in one place.</p>
    {supabase ? <form onSubmit={auth}><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" minLength={8} autoComplete={signup?'new-password':'current-password'} required/></label><button className="btn" disabled={busy}>{busy?'Please wait…':signup?'Create account':'Sign in'}</button><button type="button" className="linkbtn" onClick={()=>setSignup(!signup)}>{signup?'Already have an account? Sign in':'New here? Create an account'}</button></form> : <div className="notice">Cloud setup is pending. Add your Supabase project URL and publishable key to <code>.env.local</code>, run <code>supabase/schema.sql</code> in Supabase, then restart the app. Full steps are in README.md.</div>}
    {message && <p role="status">{message}</p>}<hr/><button className="btn secondary" onClick={()=>setLocal(true)}>Open local tracker</button><p className="hint">Local mode saves only in this browser. Use Settings → Import backup to load an export from your original HTML. Local data is never uploaded automatically.</p></main>
}
