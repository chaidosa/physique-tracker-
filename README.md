# FORM — cloud physique tracker

This React/Vite app provides individual fitness profiles and routines with Supabase account storage, conflict detection, and an installable PWA shell. Existing users retain their original FORM routine, targets, and history from `reference/aesthetic_tracker.html`.

## Personalize your routine

Open **My plan** after signing in. New accounts open here first; they are not assigned another user's age, weight, or nutrition targets.

- Choose muscle building, fat loss, recomposition, strength, general fitness, or endurance.
- Choose beginner/intermediate/advanced experience, gym/dumbbells/bodyweight + bands, a time budget, and two to six weekdays.
- Auto recommends full body for 2–3 days, upper/lower for 4, a hybrid split for 5, and push/pull/legs for 6. Endurance auto plans with at least 3 days combine two strength sessions with aerobic sessions. Routine types validate their required frequency.
- Profile name, age, height, weight, goal weight, gender, and current build are optional. Gender/build are context, not deterministic training or metabolism rules. Set low-impact conditioning if desired.
- Preview before applying. Targets stay at the entered values; calorie needs are not automatically inferred. An explicit opt-in protein starting point uses 1.6 g/kg of entered body weight. Zero means no target.
- Choose **Keep my current routine** to save profile/targets without replacing custom exercises. Use the routine editor to change exercises, sets, rep ranges, session names, and weekdays, or add/remove exercises.
- Each logged session keeps a snapshot of its exercise prescription. Applying or editing a plan affects new sessions; old workout names, sets, and exports stay consistent. Changing the session for the same logged date explicitly replaces that date's log after confirmation.
- Workout log tracks cardio minutes too. Overview shows weekly cardio against your optional target; Progress includes completed-set load trends, cardio duration, weight, circumference, and your goal weight.

Plans are starting templates for healthy adults, not clinical, injury rehabilitation, or pregnancy/postpartum plans. Time budgets control exercise count, not guaranteed session length. Template design follows [ACSM training guidance](https://acsm.org/resistance-training-guidelines-update-2026/), [CDC aerobic/strength guidance](https://www.cdc.gov/physical-activity-basics/guidelines/adults.html), and the [ISSN protein position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/).

Profiles, programs, cardio fields, and saved session templates fit the existing JSON settings/session data. **No Supabase schema migration is required for this update.** Backups stay version 1 and remain compatible with older backups. The older HTML app cannot display new personalized programs; use this app to restore updated backups.

## 1. Run locally

Use a currently supported Node.js LTS release compatible with Vite 8 (Node 22.12+ or 24 LTS).

```sh
cd physique-tracker
npm install
cp .env.example .env.local
npm run dev
```

Before cloud setup, choose **Open local tracker**. That mode stores data only in this browser, under a separate storage key. It never uploads local data automatically.

## 2. Set up Supabase

1. Create your project at https://supabase.com/dashboard.
2. Open **SQL Editor**, paste the entire `supabase/schema.sql`, and run it.
3. Find the project URL and **publishable** API key in the project's Connect/API settings. Edit `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

The browser uses the publishable key. Never use a secret or service-role key. `.env.local` is ignored by Git.

4. In **Authentication → URL Configuration**, set your production Site URL after deployment. Add `http://localhost:5173` as an allowed redirect URL for local signup confirmation; add your exact deployed HTTPS origin as well.
5. Enable the Email authentication provider. Use **Create account**, confirm your email if required, then sign in.
6. Restart the local dev server after changing environment variables.

The schema creates five private tables: profiles/settings, dated workout sessions, exercise sets, nutrition/steps, and body measurements including daily weight. Row Level Security restricts all reads and writes to the signed-in owner. The `save_tracker` RPC replaces only that owner's complete snapshot in a transaction and checks a revision, preventing silent overwrites from another tab/device. A conflict requires exporting your unsaved data, reloading, and reconciling before importing; imports replace the current account's snapshot.

## 3. Bring over your existing HTML data

Open your original HTML file **in the same browser where you logged your data**. Choose **Settings → Export backup (.json)**. In the new app, sign in and choose **Settings → Import backup (.json)**. Confirm the replacement, then wait for **Saved to cloud**. The app cannot read another browser/file origin's localStorage automatically. Copying HTML alone does not transfer progress.

## 4. GitHub and Vercel

Create an empty GitHub repository named `physique-tracker`, then run these commands from this app folder, replacing YOUR_USERNAME:

```sh
git init
git add .
git commit -m "Build FORM cloud workout tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/physique-tracker.git
git push -u origin main
```

At https://vercel.com/new import that repository. Select **Vite**, build command `npm run build`, output directory `dist`. Add both Supabase environment variables to the production environment before deploying. If you add/change them later, redeploy. If importing a repository containing this project as a subfolder, set Root Directory to `physique-tracker`.

Set the resulting HTTPS origin in Supabase's Site URL and allowed redirect URLs. The Vercel URL can be visited publicly, but workout data requires account sign-in and is protected by database policies.

## 5. Install on iPhone

Visit the deployed HTTPS URL in Safari. Share → **Add to Home Screen** → enable **Open as Web App** if shown → Add. Open FORM from its icon and sign in there (the installed app can have separate browser storage).

The production service worker caches only the application shell and icons, never Supabase authentication or API responses. Local mode works offline after the shell is cached. Cloud mode requires internet to load and save data; unsaved cloud edits are held in memory and retried when connectivity returns. This is **not durable offline cloud logging**. On iPhone, do not close the app until **Saved to cloud** appears; use Backup if saving fails. Service worker updates take effect after all existing app tabs/windows are closed and reopened.

## 6. Verify before relying on cloud sync

- Log incline dumbbell bench press: 3 completed sets, 10 reps, 15 kg.
- Log today's weight: 79 kg. Add a meal and steps. Wait for **Saved to cloud**.
- Reopen, sign in in another browser, and verify the same records appear.
- With the same account open in two tabs, change and save in one, then edit the stale second tab. It should report a conflict, preserving its unsaved backup.
- Sign in with a second account and verify the first account's records are absent.
- Go offline after loading, edit, and verify an unsaved error appears rather than a success. Reconnect and save before closing.
- Export from the original HTML, import into this app, and verify sets, meals, measurements, and targets.

```sh
npm test
npm run build
npm run preview
```

Automated checks validate backup compatibility, exercise the tracker DOM, and run the actual SQL in an embedded PostgreSQL engine to check round trips, account isolation, and conflict rejection. Live authentication and cross-device verification still require your configured Supabase project. Deployment requires your GitHub/Vercel accounts; neither database setup nor publishing happens merely by running the build.

Official references: https://supabase.com/docs/guides/getting-started/api-keys, https://supabase.com/docs/guides/database/secure-data, https://vercel.com/docs/frameworks/frontend/vite.
