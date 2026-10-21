# Push to Monir-interact/cmTask

Unzip, open a terminal inside the `cmTask` folder, then:

```bash
git init -b main
git remote add origin https://github.com/Monir-interact/cmTask.git
git pull origin main
git rm --ignore-unmatch "Kanban Workspace (standalone).html"
git add .
git commit -m "Add login page, Google sign-in and task invites"
git push -u origin main
```

No terminal? On github.com/Monir-interact/cmTask click **Add file → Upload files**, drag in
`login.html`, `index.html`, `style.css`, `script.js`, `README.md`, then **Commit changes**.
