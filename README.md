# cmTask — Creative Matter Kanban Workspace

Trello-style workspace for a 3D-visualization studio. Plain HTML, CSS and JS — no build step.

```
login.html   ← sign-in / create account / Continue with Google
index.html   ← the workspace (redirects to login.html when signed out)
style.css    ← all styles (tokens → theme → layout → components → board → views → modals → responsive → auth)
script.js    ← all logic (config → auth → icons → seed data → app)
```

## Sign-in
- **Email + password:** create an account, then sign in. Accounts are stored in this browser only (demo — no server).
- **Google:** paste your OAuth Web Client ID into `CM_CONFIG.googleClientId` at the top of `script.js`.
  1. Google Cloud Console → APIs & Services → Credentials → **Create OAuth client ID** → *Web application*
  2. Authorised JavaScript origins: `https://monir-interact.github.io` and `http://localhost:8080`
  3. Copy the Client ID into `script.js` and redeploy

  With no Client ID set, the Google button opens a demo sign-in that takes any Gmail address.
- Sign out from the avatar menu (top right).

## Invite people to a task
Open a card → **Invite to task** → enter an email (and optional name / note).
The person is added to the card and the workspace, and an activity entry is logged.
With **Email the invite with Gmail** on, a pre-filled Gmail draft opens in a new tab — press Send.
You can also add existing teammates in one tap from the same dialog.

## Run
Serve the folder (Google sign-in needs http/https, not `file://`):
```bash
python3 -m http.server 8080   # then http://localhost:8080/login.html
```
`./start.sh` (macOS/Linux) and `start.bat` (Windows) do the same.

## Live site
Settings → Pages → Deploy from branch → `main` / root → https://monir-interact.github.io/cmTask/login.html
