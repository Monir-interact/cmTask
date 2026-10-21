/* Creative Matter — Kanban Workspace · script.js
   Sections: config → auth → icons → seed data → app */

/* ════════ config ════════
   Paste your Google OAuth 2.0 Web Client ID here to enable real "Sign in with Google".
   Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web).
   Add your site origin (e.g. https://monir-interact.github.io and http://localhost:8080)
   under "Authorised JavaScript origins". Leave empty to use the built-in demo sign-in. */
window.CM_CONFIG = {
  googleClientId: ''
};

/* ════════ auth.js — session + login page ════════ */
(function () {
  'use strict';
  var SESSION = 'cm_session', USERS = 'cm_users';
  function read(k) { try { return JSON.parse(localStorage.getItem(k) || sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function initials(n) { return (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || '?'; }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }
  function nameFromEmail(e) { return e.split('@')[0].replace(/[._-]+/g, ' ').replace(/\d+/g, '').trim().replace(/\b\w/g, function (c) { return c.toUpperCase(); }) || e; }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return 'h' + (h >>> 0).toString(36); }

  function setSession(user, remember) {
    var s = JSON.stringify(Object.assign({ initials: initials(user.name), color: '#5c59e8', signedInAt: new Date().toISOString() }, user));
    localStorage.removeItem(SESSION); sessionStorage.removeItem(SESSION);
    (remember === false ? sessionStorage : localStorage).setItem(SESSION, s);
  }
  function signOut() {
    localStorage.removeItem(SESSION); sessionStorage.removeItem(SESSION);
    try { if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect(); } catch (e) { /* ignore */ }
    location.href = 'login.html';
  }
  window.CMAuth = { user: function () { return read(SESSION); }, signOut: signOut, validEmail: validEmail, initials: initials, nameFromEmail: nameFromEmail };

  /* Login page only */
  var root = document.getElementById('auth');
  if (!root) return;
  if (read(SESSION)) { location.replace('index.html'); return; }

  try { var saved = JSON.parse(localStorage.getItem('cm_kanban_v1') || '{}'); if (saved.theme) document.documentElement.setAttribute('data-theme', saved.theme); } catch (e) { /* ignore */ }

  var $ = function (id) { return document.getElementById(id); };
  var mode = 'signin';
  var form = $('auth-form'), msg = $('auth-msg');

  function showMsg(el, text, ok) { el.textContent = text || ''; el.classList.toggle('is-ok', !!ok); }
  function setMode(m) {
    mode = m;
    var up = m === 'signup';
    $('name-field').hidden = !up;
    $('signin-row').hidden = up;
    $('auth-title').textContent = up ? 'Create your account' : 'Welcome back';
    $('auth-sub').textContent = up ? 'Join your studio workspace in a few seconds' : 'Sign in to your studio workspace';
    $('auth-submit').textContent = up ? 'Create account' : 'Sign in';
    $('switch-text').textContent = up ? 'Already have an account?' : 'New to Creative Matter?';
    $('switch-mode').textContent = up ? 'Sign in' : 'Create an account';
    $('auth-pass').setAttribute('autocomplete', up ? 'new-password' : 'current-password');
    showMsg(msg, '');
    (up ? $('auth-name') : $('auth-email')).focus();
  }
  function go() { location.href = 'index.html'; }

  $('switch-mode').addEventListener('click', function (e) { e.preventDefault(); setMode(mode === 'signin' ? 'signup' : 'signin'); });
  $('pass-toggle').addEventListener('click', function () {
    var p = $('auth-pass'), show = p.type === 'password';
    p.type = show ? 'text' : 'password'; this.textContent = show ? 'Hide' : 'Show';
    this.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  $('forgot').addEventListener('click', function (e) {
    e.preventDefault();
    var em = $('auth-email').value.trim();
    if (!validEmail(em)) { showMsg(msg, 'Enter your email above, then tap “Forgot password?” again.'); $('auth-email').focus(); return; }
    showMsg(msg, 'If an account exists for ' + em + ', a reset link is on its way.', true);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('auth-email').value.trim().toLowerCase(), pass = $('auth-pass').value, name = $('auth-name').value.trim();
    var users = read(USERS) || {};
    if (mode === 'signup' && !name) { showMsg(msg, 'Please enter your name.'); $('auth-name').focus(); return; }
    if (!validEmail(email)) { showMsg(msg, 'Enter a valid email address.'); $('auth-email').focus(); return; }
    if (pass.length < 6) { showMsg(msg, 'Password must be at least 6 characters.'); $('auth-pass').focus(); return; }
    if (mode === 'signup') {
      if (users[email]) { showMsg(msg, 'An account with this email already exists — sign in instead.'); return; }
      users[email] = { name: name, pass: hash(pass), createdAt: new Date().toISOString() };
      localStorage.setItem(USERS, JSON.stringify(users));
      setSession({ name: name, email: email, provider: 'email' }, true);
      go(); return;
    }
    var u = users[email];
    if (!u) { showMsg(msg, 'No account found for this email. Create one below.'); return; }
    if (u.pass !== hash(pass)) { showMsg(msg, 'Incorrect password. Try again.'); $('auth-pass').select(); return; }
    setSession({ name: u.name, email: email, provider: 'email' }, $('auth-remember').checked);
    go();
  });

  /* Google sign-in */
  function decodeJwt(t) {
    var p = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(p).split('').map(function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join('')));
  }
  function onGoogleCredential(res) {
    try {
      var p = decodeJwt(res.credential);
      setSession({ name: p.name || nameFromEmail(p.email), email: p.email, picture: p.picture || '', provider: 'google' }, true);
      go();
    } catch (err) { showMsg(msg, 'Google sign-in failed. Please try again.'); }
  }
  var cid = (window.CM_CONFIG || {}).googleClientId;
  if (cid) {
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    s.onload = function () {
      google.accounts.id.initialize({ client_id: cid, callback: onGoogleCredential, ux_mode: 'popup', auto_select: false });
      var slot = $('google-slot'); slot.innerHTML = '';
      google.accounts.id.renderButton(slot, { theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with', width: Math.min(slot.offsetWidth || 360, 400) });
    };
    s.onerror = function () { showMsg(msg, 'Could not load Google sign-in. Check your connection.'); };
    document.head.appendChild(s);
  } else {
    var demo = $('gdemo'), gmsg = $('gdemo-msg');
    var open = function () { demo.hidden = false; showMsg(gmsg, ''); setTimeout(function () { $('gdemo-email').focus(); }, 30); };
    var close = function () { demo.hidden = true; };
    $('google-btn').addEventListener('click', open);
    Array.prototype.forEach.call(document.querySelectorAll('[data-gdemo-close]'), function (b) { b.addEventListener('click', close); });
    demo.addEventListener('click', function (e) { if (e.target === demo) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !demo.hidden) close(); });
    var cont = function () {
      var em = $('gdemo-email').value.trim().toLowerCase();
      if (!validEmail(em)) { showMsg(gmsg, 'Enter a valid Google account email.'); return; }
      setSession({ name: $('gdemo-name').value.trim() || nameFromEmail(em), email: em, provider: 'google' }, true);
      go();
    };
    $('gdemo-continue').addEventListener('click', cont);
    ['gdemo-email', 'gdemo-name'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') cont(); }); });
  }
})();

/* ════════ icons.js ════════ */
/* Inline SVG icon set — window.CMIcons.ic(name, size, className) */
(function () {
  'use strict';
  var P = {
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    dots: '<circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>',
    desc: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="14" y2="17"/>',
    check: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    comment: '<path d="M21 11.5a8 8 0 0 1-11.6 7.1L4 20l1.4-4.4A8 8 0 1 1 21 11.5z"/>',
    star: '<polygon points="12 2.5 15 8.6 21.7 9.6 16.8 14.3 18 21 12 17.8 6 21 7.2 14.3 2.3 9.6 9 8.6"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1"/><path d="M17.5 20a5.5 5.5 0 0 0-3-4.9"/>',
    userPlus: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><line x1="19" y1="7" x2="19" y2="13"/><line x1="22" y1="10" x2="16" y2="10"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    columns: '<rect x="3" y="4" width="5" height="16" rx="1.2"/><rect x="9.5" y="4" width="5" height="11" rx="1.2"/><rect x="16" y="4" width="5" height="14" rx="1.2"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9.5" x2="21" y2="9.5"/><line x1="9" y1="9.5" x2="9" y2="20"/>',
    chart: '<path d="M3 3v18h18"/><path d="M19 9l-5 5-3-3-4 4"/>',
    calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>',
    timeline: '<line x1="3" y1="7" x2="14" y2="7"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="5" y1="17" x2="16" y2="17"/>',
    filter: '<polygon points="3 4 21 4 14 12.5 14 19 10 21 10 12.5"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><line x1="10" y1="12" x2="14" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    tag: '<path d="M3 8.5V5a2 2 0 0 1 2-2h3.5a2 2 0 0 1 1.4.6l9 9a2 2 0 0 1 0 2.8l-4.1 4.1a2 2 0 0 1-2.8 0l-9-9A2 2 0 0 1 3 8.5z"/><circle cx="7" cy="7" r="1.4"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M4 17l4.5-4 3.5 3 3-2.5L21 17"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    card: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><line x1="8.2" y1="10.8" x2="15.8" y2="6.2"/><line x1="8.2" y1="13.2" x2="15.8" y2="17.8"/>',
    chevL: '<polyline points="15 18 9 12 15 6"/>',
    chevR: '<polyline points="9 18 15 12 9 6"/>'
  };
  function ic(name, size, cls) {
    size = size || 16;
    return '<svg class="ic ' + (cls || '') + '" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || '') + '</svg>';
  }
  window.CMIcons = { ic: ic };
})();

/* ════════ data.js ════════ */
/* Seed data — window.CMData.seed() returns { boards, labels, members } */
(function () {
  'use strict';
  function off(d) { var x = new Date(); x.setHours(10, 0, 0, 0); x.setDate(x.getDate() + d); return x.toISOString(); }
  function C(o) { return Object.assign({ labels: [], members: [], due: null, dueComplete: false, desc: '', checklists: [], comments: [], cover: null }, o); }
  function L(id, title, cards) { return { id: id, title: title, cards: cards }; }

  var GRADS = [
    'linear-gradient(135deg,#c4161c,#8a0f13)',
    'linear-gradient(135deg,#1849d6,#5c59e8)',
    'linear-gradient(135deg,#27ae60,#1e7d44)',
    'linear-gradient(135deg,#d69e3d,#a8721d)',
    'linear-gradient(135deg,#5c59e8,#2a217f)',
    'linear-gradient(135deg,#0f7d6b,#0a3f4f)'
  ];

  function seed() {
    var members = [
      { id: 'u1', name: 'Elena Volkov · Art Director', initials: 'EV', color: '#c4161c' },
      { id: 'u2', name: 'Marcus Webb · 3D Artist', initials: 'MW', color: '#1849d6' },
      { id: 'u3', name: 'Lena Ortiz · Lighting', initials: 'LO', color: '#27ae60' },
      { id: 'u4', name: 'Sam Cho · Comp / Post', initials: 'SC', color: '#5c59e8' },
      { id: 'u5', name: 'Aisha Bello · Producer', initials: 'AB', color: '#d69e3d' }
    ];
    var labels = [
      { id: 'l1', name: 'Priority', color: '#c4161c' },
      { id: 'l2', name: 'Exterior', color: '#1849d6' },
      { id: 'l3', name: 'Interior', color: '#27ae60' },
      { id: 'l4', name: 'Animation', color: '#5c59e8' },
      { id: 'l5', name: 'Client Review', color: '#d69e3d' },
      { id: 'l6', name: 'Stills', color: '#757575' }
    ];

    var studio = [
      L('k1', 'To-Do', [
        C({ id: 'c1', title: 'Riverside Tower — dusk exterior hero shot', labels: ['l2', 'l1'], members: ['u2'], due: off(1),
          desc: 'Final hero still for the Riverside Tower pitch deck. Camera locked at street level, golden-hour key light. Client wants warm but not orange.',
          checklists: [{ id: 'cl1', name: 'Shot prep', items: [
            { id: 'i1', text: 'Block out camera + framing', done: true },
            { id: 'i2', text: 'Set up HDRI + sun rig', done: false },
            { id: 'i3', text: 'Populate entourage (people, cars)', done: false }] }],
          comments: [
            { id: 'm1', author: 'Lena Ortiz', initials: 'LO', color: '#27ae60', text: 'Pulled a dusk HDRI that matches the brief — dropped it in the project folder.', time: off(-1) },
            { id: 'm2', author: 'Marcus Webb', initials: 'MW', color: '#1849d6', text: 'Façade glazing geo is final, safe to start lighting.', time: off(0) }] }),
        C({ id: 'c2', title: 'Maison Lumière — kitchen interior set dressing', labels: ['l3'], members: ['u3'], desc: 'Scandinavian palette. Source props from the interior asset kit.' }),
        C({ id: 'c3', title: 'Helix HQ — lobby walkthrough animation', labels: ['l4', 'l1'], members: ['u4'], due: off(-1) }),
        C({ id: 'c4', title: 'Bayfront Residences — aerial establishing shot' })
      ]),
      L('k2', 'Progress', [
        C({ id: 'c5', title: 'Skyline Loft — living room lighting pass', labels: ['l3'], members: ['u3'],
          checklists: [{ id: 'cl2', name: 'Lighting', items: [
            { id: 'i4', text: 'Key + fill balance', done: true }, { id: 'i5', text: 'Practical lamps + bounce', done: true }] }] }),
        C({ id: 'c6', title: 'Verde Park — masterplan flythrough', labels: ['l4', 'l1'], members: ['u4'], due: off(0) }),
        C({ id: 'c7', title: 'Atelier Nord — façade material study', labels: ['l2'], members: ['u2'], due: off(4) })
      ]),
      L('k3', 'QA', [
        C({ id: 'c8', title: 'Crystalline Pavilion — 8 stills color grade', labels: ['l6'], members: ['u4'], cover: '#5c59e8', due: off(3),
          checklists: [{ id: 'cl3', name: 'Delivery QC', items: [
            { id: 'i6', text: 'Denoise + render check', done: true }, { id: 'i7', text: 'Color grade pass', done: true },
            { id: 'i8', text: 'Retouch artifacts', done: true }, { id: 'i9', text: 'Art-director sign-off', done: false }] }] }),
        C({ id: 'c9', title: 'Harbor Point — twilight render denoise', labels: ['l1'], members: ['u5'], due: off(2) })
      ]),
      L('k5', 'Hand-Off', [
        C({ id: 'c12', title: 'Meridian Plaza — final delivery package', labels: ['l6'], due: off(-3), dueComplete: true }),
        C({ id: 'c13', title: 'Aurora Villas — client stills batch 2', dueComplete: true })
      ]),
      L('k6', 'Feedback', [
        C({ id: 'c14', title: 'Client: sky reads too warm — Riverside Tower', labels: ['l5'], members: ['u3'], due: off(5),
          desc: 'Client loves the composition but wants the sky cooler and the windows with more visible interior glow. Revise and re-submit for the Friday review.',
          comments: [{ id: 'm3', author: 'Aisha Bello', initials: 'AB', color: '#d69e3d', text: 'Resending the annotated frame from the client now — see the sky + glazing notes.', time: off(-1) }] }),
        C({ id: 'c15', title: 'Reflections too strong on glass façade', labels: ['l1'], members: ['u2'] }),
        C({ id: 'c16', title: 'Add subtle lens flare to hero animation frame', labels: ['l4'], members: ['u4'], due: off(6) })
      ])
    ];

    var client = [
      L('cp1', 'Leads', [
        C({ id: 'cpa1', title: 'Northbank Mixed-Use — pitch request', labels: ['l5'], members: ['u5'], due: off(2) }),
        C({ id: 'cpa2', title: 'Lumen Residences — RFP review', labels: ['l1'], members: ['u1'] })]),
      L('cp2', 'Briefing', [
        C({ id: 'cpa3', title: 'Solace Spa — scope + shot list', labels: ['l3'], members: ['u3'], due: off(1), desc: 'Confirm 6 interiors + 2 exteriors, agree on style references.' }),
        C({ id: 'cpa4', title: 'Helix Robotics HQ — contract sign-off', labels: ['l1'], members: ['u5'] })]),
      L('cp3', 'In Production', [
        C({ id: 'cpa5', title: 'Verde Park — 90s flythrough', labels: ['l4'], members: ['u4'], due: off(4),
          checklists: [{ id: 'cpcl1', name: 'Production', items: [{ id: 'cpi1', text: 'Previz approved', done: true }, { id: 'cpi2', text: 'Final lighting', done: false }] }] }),
        C({ id: 'cpa6', title: 'Atelier Nord — 4 exterior stills', labels: ['l2'], members: ['u2'] })]),
      L('cp4', 'Delivered', [
        C({ id: 'cpa7', title: 'Meridian Plaza — full package', labels: ['l6'], dueComplete: true, due: off(-2) })])
    ];

    var assets = [
      L('al1', 'Models', [
        C({ id: 'ala1', title: 'Mid-century lounge chair set', labels: ['l3'], members: ['u3'] }),
        C({ id: 'ala2', title: 'Parametric facade panel kit', labels: ['l2'], members: ['u2'], due: off(3) }),
        C({ id: 'ala3', title: 'City entourage — pedestrians v2' })]),
      L('al2', 'Textures', [
        C({ id: 'ala4', title: 'Brushed travertine — 4K PBR', labels: ['l6'], members: ['u4'] }),
        C({ id: 'ala5', title: 'Weathered oak flooring pack', labels: ['l3'] })]),
      L('al3', 'HDRIs', [
        C({ id: 'ala6', title: 'Golden-hour coastal dome', labels: ['l2'], members: ['u3'], cover: '#d69e3d' }),
        C({ id: 'ala7', title: 'Overcast studio softbox set', labels: ['l6'] })]),
      L('al4', 'Needs Review', [
        C({ id: 'ala8', title: 'Tropical foliage scatter — perf check', labels: ['l1'], members: ['u4'], due: off(1) })])
    ];

    var marketing = [
      L('mk1', 'Ideas', [
        C({ id: 'mka1', title: 'Behind-the-render short for Instagram', labels: ['l4'], members: ['u5'] }),
        C({ id: 'mka2', title: 'Case study: Crystalline Pavilion', labels: ['l5'], members: ['u1'] })]),
      L('mk2', 'Scripting', [
        C({ id: 'mka3', title: 'Studio sizzle reel — VO script', labels: ['l1'], members: ['u5'], due: off(2) })]),
      L('mk3', 'Editing', [
        C({ id: 'mka4', title: 'Helix HQ walkthrough — 30s cut', labels: ['l4'], members: ['u4'], due: off(1),
          checklists: [{ id: 'mkcl1', name: 'Edit', items: [{ id: 'mki1', text: 'Rough cut', done: true }, { id: 'mki2', text: 'Sound design', done: false }, { id: 'mki3', text: 'Color', done: false }] }] })]),
      L('mk4', 'Published', [
        C({ id: 'mka5', title: 'Aurora Villas — carousel post', labels: ['l6'], dueComplete: true, due: off(-5) })])
    ];

    var oneTwoThree = [
      L('ot1', 'To-Do', [C({ id: 'ota1', title: 'First task', members: ['u1'] }), C({ id: 'ota2', title: 'Second task', labels: ['l1'] })]),
      L('ot2', 'Doing', [C({ id: 'ota3', title: 'Work in progress', members: ['u4'], due: off(1) })]),
      L('ot3', 'Done', [C({ id: 'ota4', title: 'Completed item', dueComplete: true })])
    ];

    var boards = [
      { id: 'board-studio', title: 'Studio Production', grad: GRADS[0], starred: true, lists: studio },
      { id: 'board-client', title: 'Client Projects', grad: GRADS[1], lists: client },
      { id: 'board-assets', title: 'Asset Library', grad: GRADS[2], lists: assets },
      { id: 'board-marketing', title: 'Marketing & Reel', grad: GRADS[3], lists: marketing },
      { id: 'board-123', title: '123', grad: GRADS[4], lists: oneTwoThree }
    ];
    return { boards: boards, labels: labels, members: members };
  }

  var notifications = [
    { id: 'n1', uid: 'u5', text: 'Aisha Bello mentioned you on “Client: sky reads too warm — Riverside Tower”', time: '12m ago' },
    { id: 'n2', uid: 'u1', text: 'Elena Volkov moved “Crystalline Pavilion — 8 stills color grade” to QA', time: '1h ago' },
    { id: 'n3', uid: 'u2', text: 'Marcus Webb completed a checklist item on “Skyline Loft — living room lighting pass”', time: '3h ago' },
    { id: 'n4', uid: 'u3', text: 'Lena Ortiz set a due date on “Verde Park — masterplan flythrough”', time: 'Yesterday' },
    { id: 'n5', uid: 'u4', text: 'Sam Cho attached a render to “Meridian Plaza — final delivery package”', time: '2d ago' }
  ];

  var portfolio = [
    { title: 'Meridian Plaza — twilight hero', tag: 'Exterior · Stills', cover: 'linear-gradient(135deg,#1849d6,#0c2c8a)', client: 'Meridian Group', uid: 'u2' },
    { title: 'Aurora Villas — poolside dusk', tag: 'Exterior', cover: 'linear-gradient(135deg,#d69e3d,#a8460f)', client: 'Aurora Living', uid: 'u3' },
    { title: 'Crystalline Pavilion — atrium', tag: 'Interior', cover: 'linear-gradient(135deg,#27ae60,#0f5a39)', client: 'Civic Arts Trust', uid: 'u4' },
    { title: 'Helix HQ — lobby walkthrough', tag: 'Animation', cover: 'linear-gradient(135deg,#5c59e8,#2a217f)', client: 'Helix Robotics', uid: 'u4' },
    { title: 'Skyline Loft — living room', tag: 'Interior · Stills', cover: 'linear-gradient(135deg,#c4161c,#6e0a0d)', client: 'Skyline Dev', uid: 'u3' },
    { title: 'Verde Park — masterplan reel', tag: 'Animation', cover: 'linear-gradient(135deg,#0f7d6b,#0a3f4f)', client: 'Verde Municipality', uid: 'u4' }
  ];

  window.CMData = { seed: seed, grads: GRADS, notifications: notifications, portfolio: portfolio };
})();

/* ════════ app.js ════════ */
/* Creative Matter — Kanban Workspace app logic (vanilla JS, no build step) */
(function () {
  'use strict';

  if (!document.getElementById('app')) return;
  var ME = window.CMAuth.user();
  if (!ME) { location.replace('login.html'); return; }

  var KEY = 'cm_kanban_v1';
  var ic = window.CMIcons.ic;
  var DATA = window.CMData;
  var COVERS = ['#c4161c', '#1849d6', '#27ae60', '#5c59e8', '#d69e3d', '#757575'];
  var PALETTE = ['#0f7d6b', '#b8336a', '#5c59e8', '#1849d6', '#27ae60', '#d69e3d', '#c4161c'];
  var VIEWS = [
    { id: 'board', label: 'Board', icon: 'columns' },
    { id: 'table', label: 'Table', icon: 'table' },
    { id: 'dashboard', label: 'Dashboard', icon: 'chart' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar', pro: true },
    { id: 'timeline', label: 'Timeline', icon: 'timeline', pro: true }
  ];
  var MODULES = [
    { id: 'boards', label: 'Boards', icon: 'grid' },
    { id: 'members', label: 'Members', icon: 'users' },
    { id: 'portfolio', label: 'Portfolio', icon: 'image' },
    { id: 'settings', label: 'Settings', icon: 'gear' }
  ];
  var mqDrawer = window.matchMedia('(max-width: 1024px)');

  /* ── Utilities ──────────────────────────────────────────────── */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid(p) { return (p || 'id') + Math.random().toString(36).slice(2, 9); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function dayStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function isoDay(d) { var x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
  function fromIsoDay(v) { return v ? new Date(v + 'T10:00:00').toISOString() : null; }
  function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function fmtTime(iso) {
    var d = new Date(iso);
    return d.toDateString() === new Date().toDateString()
      ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      : fmtDate(iso);
  }
  function initialsOf(name) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase() || '?'; }

  /* ── State ──────────────────────────────────────────────────── */
  var S = {
    boards: [], labels: [], members: [], activeBoardId: null,
    theme: 'light', coversOn: true, density: 'comfortable', wsName: 'Creative Matter', readNotifs: [],
    module: 'board', view: 'board', sidebarOpen: true, drawerOpen: false,
    filterOpen: false, filter: { text: '', members: [], labels: [], due: null },
    composerListId: null, composerText: '', editingListId: null, editText: '',
    listMenuFor: null, addingList: false, newListText: '',
    openCardId: null, picker: null, descEditing: false, descDraft: '', comment: '', checkInputs: {},
    modal: null, form: {}, notifOpen: false, shareOpen: false, shareEmail: '',
    calOffset: 0, tlOffset: 0, toast: null, focus: null
  };

  function load() {
    try {
      var d = JSON.parse(localStorage.getItem(KEY));
      if (d && d.boards && d.boards.length) { Object.assign(S, d); return; }
    } catch (e) { /* fall through to seed */ }
    var s = DATA.seed();
    S.boards = s.boards; S.labels = s.labels; S.members = s.members; S.activeBoardId = s.boards[0].id;
    save();
  }
  function save() {
    var keep = { boards: S.boards, labels: S.labels, members: S.members, activeBoardId: S.activeBoardId, theme: S.theme, coversOn: S.coversOn, density: S.density, wsName: S.wsName, readNotifs: S.readNotifs };
    try { localStorage.setItem(KEY, JSON.stringify(keep)); } catch (e) { /* storage full / disabled */ }
  }

  function board() { return S.boards.find(function (b) { return b.id === S.activeBoardId; }) || S.boards[0]; }
  function lists() { return board().lists; }
  function member(id) { return S.members.find(function (m) { return m.id === id; }); }
  function label(id) { return S.labels.find(function (l) { return l.id === id; }); }
  function shortName(m) { return m.name.split(' · ')[0]; }
  function roleOf(m) { return m.name.split(' · ')[1] || 'Member'; }
  function findCard(id) {
    for (var i = 0; i < S.boards.length; i++) {
      var b = S.boards[i];
      for (var j = 0; j < b.lists.length; j++) {
        var c = b.lists[j].cards.find(function (x) { return x.id === id; });
        if (c) return { card: c, list: b.lists[j], board: b };
      }
    }
    return {};
  }
  function allCards() {
    var out = [];
    lists().forEach(function (l) { l.cards.forEach(function (c) { out.push({ card: c, list: l }); }); });
    return out;
  }

  function dueStatus(c) {
    if (!c.due) return 'none';
    if (c.dueComplete) return 'complete';
    var diff = (dayStart(c.due) - dayStart(new Date())) / 864e5;
    return diff < 0 ? 'overdue' : diff <= 1 ? 'soon' : 'normal';
  }
  function visible(c) {
    var f = S.filter, t = f.text.trim().toLowerCase();
    if (t && (c.title + ' ' + c.desc).toLowerCase().indexOf(t) < 0) return false;
    if (f.members.length && !c.members.some(function (m) { return f.members.indexOf(m) >= 0; })) return false;
    if (f.labels.length && !c.labels.some(function (l) { return f.labels.indexOf(l) >= 0; })) return false;
    if (f.due === 'overdue' && dueStatus(c) !== 'overdue') return false;
    if (f.due === 'soon' && dueStatus(c) !== 'soon') return false;
    if (f.due === 'none' && c.due) return false;
    return true;
  }
  function filterCount() { var f = S.filter; return (f.text.trim() ? 1 : 0) + f.members.length + f.labels.length + (f.due ? 1 : 0); }
  function checkStats(c) {
    var t = 0, d = 0;
    c.checklists.forEach(function (cl) { t += cl.items.length; d += cl.items.filter(function (i) { return i.done; }).length; });
    return { total: t, done: d };
  }

  /* ── Mutations ──────────────────────────────────────────────── */
  function commit() { save(); render(); }
  function withUndo(msg, fn) {
    var snap = clone(S.boards);
    fn();
    save();
    toast(msg, function () { S.boards = snap; commit(); });
    render();
  }
  var toastTimer;
  function toast(msg, undo) {
    clearTimeout(toastTimer);
    S.toast = { msg: msg, undo: undo || null };
    renderToast();
    toastTimer = setTimeout(function () { S.toast = null; renderToast(); }, undo ? 6000 : 3500);
  }
  function removeCard(id) { lists().forEach(function (l) { l.cards = l.cards.filter(function (c) { return c.id !== id; }); }); }
  function newCard(o) { return Object.assign({ id: uid('c'), labels: [], members: [], due: null, dueComplete: false, desc: '', checklists: [], comments: [], cover: null }, o); }
  function moveCard(cardId, toListId, beforeId) {
    var card = null;
    lists().forEach(function (l) {
      var i = l.cards.findIndex(function (c) { return c.id === cardId; });
      if (i >= 0) { card = l.cards.splice(i, 1)[0]; }
    });
    var tl = lists().find(function (l) { return l.id === toListId; });
    if (!card || !tl) return;
    var j = beforeId ? tl.cards.findIndex(function (c) { return c.id === beforeId; }) : -1;
    if (j < 0) tl.cards.push(card); else tl.cards.splice(j, 0, card);
  }
  function moveList(listId, beforeId) {
    var ls = lists(), i = ls.findIndex(function (l) { return l.id === listId; });
    if (i < 0) return;
    var l = ls.splice(i, 1)[0];
    var j = beforeId ? ls.findIndex(function (x) { return x.id === beforeId; }) : -1;
    if (j < 0) ls.push(l); else ls.splice(j, 0, l);
  }
  function closeTransient() { S.notifOpen = false; S.shareOpen = false; S.userOpen = false; S.listMenuFor = null; S.picker = null; }

  /* ── Markup helpers ─────────────────────────────────────────── */
  function avatar(m, size, extra) {
    if (!m) return '';
    return '<span class="avatar avatar--' + (size || 'sm') + ' ' + (extra || '') + '" style="background:' + m.color + '" title="' + esc(m.name) + '">' + esc(m.initials) + '</span>';
  }
  function dueBadge(c) {
    if (!c.due) return '';
    return '<span class="badge badge--' + dueStatus(c) + '">' + ic('clock', 12) + fmtDate(c.due) + '</span>';
  }
  function emptyState(text) { return '<div class="agenda__empty">' + esc(text) + '</div>'; }

  /* ── Render: chrome ─────────────────────────────────────────── */
  function applyChrome() {
    document.documentElement.setAttribute('data-theme', S.theme);
    document.documentElement.setAttribute('data-density', S.density);
    var app = $('#app');
    app.setAttribute('data-sidebar', S.sidebarOpen ? 'open' : 'closed');
    app.classList.toggle('drawer-open', S.drawerOpen);
    var unread = DATA.notifications.some(function (n) { return S.readNotifs.indexOf(n.id) < 0; });
    $('#notif-dot').classList.toggle('is-on', unread);
  }

  function renderSidebar() {
    var nav = MODULES.map(function (m) {
      return '<button class="side-link' + (S.module === m.id ? ' is-active' : '') + '" data-action="set-module" data-module="' + m.id + '">' + ic(m.icon) + '<span class="side-link__label">' + m.label + '</span></button>';
    }).join('');
    var boards = S.boards.map(function (b) {
      var on = b.id === S.activeBoardId && S.module === 'board';
      return '<button class="side-link' + (on ? ' is-active' : '') + '" data-action="switch-board" data-id="' + b.id + '"><span class="side-link__swatch" style="background:' + b.grad + '"></span><span class="side-link__label">' + esc(b.title) + '</span></button>';
    }).join('');
    $('#sidebar').innerHTML =
      '<div class="ws"><div class="ws__logo">' + esc(initialsOf(S.wsName)) + '</div><div style="min-width:0"><div class="ws__name">' + esc(S.wsName) + '</div><div class="ws__plan">Premium workspace</div></div></div>' +
      '<nav class="side-nav">' + nav + '</nav>' +
      '<div class="side-section"><span class="eyebrow">Your boards</span><button class="icon-btn icon-btn--sm" data-action="open-modal" data-modal="board" aria-label="Create board">' + ic('plus', 15) + '</button></div>' +
      '<div class="side-boards">' + boards + '</div>';
  }

  function renderNotif() {
    var pop = $('#notif-pop');
    if (!S.notifOpen) { pop.innerHTML = ''; return; }
    var items = DATA.notifications.map(function (n) {
      var m = member(n.uid) || { initials: '?', color: 'var(--c-muted)', name: '' };
      var unread = S.readNotifs.indexOf(n.id) < 0;
      return '<button class="notif__item' + (unread ? ' is-unread' : '') + '" data-action="read-notif" data-id="' + n.id + '">' + avatar(m, 'md') +
        '<div style="flex:1;min-width:0"><div class="notif__text">' + esc(n.text) + '</div><div class="notif__time">' + n.time + '</div></div>' +
        (unread ? '<span class="notif__dot"></span>' : '') + '</button>';
    }).join('');
    pop.innerHTML = '<div class="popover notif"><div class="popover__head"><span class="popover__title">Notifications</span><button class="btn btn--link" data-action="read-all">Mark all read</button></div><div class="notif__list">' + items + '</div></div>';
  }

  /* ── Render: main ───────────────────────────────────────────── */
  function renderMain() {
    var main = $('#main');
    var scroll = {};
    $$('[data-scroll-key]', main).forEach(function (el) { scroll[el.dataset.scrollKey] = [el.scrollLeft, el.scrollTop]; });

    var html;
    if (S.module === 'boards') html = boardsModule();
    else if (S.module === 'members') html = membersModule();
    else if (S.module === 'portfolio') html = portfolioModule();
    else if (S.module === 'settings') html = settingsModule();
    else html = boardHeader() + (S.filterOpen ? filterBar() : '') + viewContent();
    main.innerHTML = html;

    $$('[data-scroll-key]', main).forEach(function (el) {
      var s = scroll[el.dataset.scrollKey];
      if (s) { el.scrollLeft = s[0]; el.scrollTop = s[1]; }
    });
  }

  function boardHeader() {
    var b = board();
    var stack = S.members.slice(0, 5).map(function (m) { return avatar(m, 'sm'); }).join('') +
      '<button class="avatar avatar--sm avatar--add" data-action="open-modal" data-modal="invite" aria-label="Invite member">' + ic('plus', 14) + '</button>';
    var tabs = VIEWS.map(function (v) {
      return '<button class="tab' + (S.view === v.id ? ' is-active' : '') + '" data-action="set-view" data-view="' + v.id + '">' + ic(v.icon, 15) + '<span>' + v.label + '</span>' + (v.pro ? '<span class="pro">PRO</span>' : '') + '</button>';
    }).join('');
    var n = filterCount();
    return '<div class="board-header"><div class="board-header__row">' +
      '<h1 class="board-title">' + esc(b.title) + '</h1>' +
      '<button class="icon-btn' + (b.starred ? ' is-starred' : '') + '" data-action="toggle-star" aria-label="Star board">' + ic('star', 17) + '</button>' +
      '<span class="chip chip--muted">' + ic('users', 13) + 'Workspace</span>' +
      '<div class="spacer"></div>' +
      '<div class="avatar-stack">' + stack + '</div>' +
      '<div class="pop-anchor" data-keep-popover><button class="btn btn--secondary" data-action="toggle-share">' + ic('share', 14) + '<span>Share</span></button>' + (S.shareOpen ? sharePopover() : '') + '</div>' +
      '</div><div class="toolbar"><div class="tabs" role="tablist">' + tabs + '</div>' +
      '<button class="btn btn--secondary' + (n ? ' is-active' : '') + '" data-action="toggle-filter">' + ic('filter', 14) + '<span>Filter</span>' + (n ? '<span class="btn__count">' + n + '</span>' : '') + '</button>' +
      '</div></div>';
  }

  function sharePopover() {
    var rows = S.members.map(function (m) {
      return '<div class="share__member">' + avatar(m, 'sm') + '<span class="share__name">' + esc(shortName(m)) + '</span><span class="muted" style="font-size:12px;font-weight:600">' + (m.id === 'u1' ? 'Admin' : 'Editor') + '</span></div>';
    }).join('');
    return '<div class="popover share">' +
      '<div class="popover__title">Share board</div>' +
      '<div class="share__row"><input class="input input--sm" data-field="shareEmail" data-enter="share-invite" placeholder="Email or name…" value="' + esc(S.shareEmail) + '"><button class="btn btn--primary" style="height:34px" data-action="share-invite">Invite</button></div>' +
      '<button class="share__link" data-action="copy-link">' + ic('link', 17) + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">studio.creativematter.app/b/' + esc(board().id.replace('board-', '')) + '</div><div class="muted" style="font-size:11.5px">Anyone with the link can view</div></div></button>' +
      '<div><div class="eyebrow" style="margin-bottom:6px">Board members</div>' + rows + '</div></div>';
  }

  function filterBar() {
    var f = S.filter;
    var mem = S.members.map(function (m) {
      return '<button class="avatar avatar--sm filter-avatar' + (f.members.indexOf(m.id) >= 0 ? ' is-selected' : '') + '" style="background:' + m.color + '" data-action="filter-member" data-id="' + m.id + '" title="' + esc(m.name) + '">' + esc(m.initials) + '</button>';
    }).join('');
    var lab = S.labels.map(function (l) {
      var on = f.labels.indexOf(l.id) >= 0;
      return '<button class="label-pill' + (on ? ' is-selected' : '') + (f.labels.length && !on ? ' is-dim' : '') + '" style="background:' + l.color + '" data-action="filter-label" data-id="' + l.id + '">' + esc(l.name) + '</button>';
    }).join('');
    var due = [['overdue', 'Overdue'], ['soon', 'Due soon'], ['none', 'No date']].map(function (d) {
      return '<button class="chip' + (f.due === d[0] ? ' is-active' : '') + '" data-action="filter-due" data-due="' + d[0] + '">' + d[1] + '</button>';
    }).join('');
    return '<div class="filterbar">' +
      '<div class="filter-group"><span class="eyebrow">Members</span>' + mem + '</div>' +
      '<div class="filter-group"><span class="eyebrow">Labels</span>' + lab + '</div>' +
      '<div class="filter-group"><span class="eyebrow">Due</span>' + due + '</div>' +
      '<div class="spacer"></div><button class="btn btn--link" data-action="clear-filters">Clear filters</button></div>';
  }

  function viewContent() {
    switch (S.view) {
      case 'table': return tableView();
      case 'dashboard': return dashboardView();
      case 'calendar': return calendarView();
      case 'timeline': return timelineView();
      default: return boardView();
    }
  }

  /* Board view */
  function cardHTML(c) {
    var cs = checkStats(c);
    var meta = [];
    if (c.due) meta.push(dueBadge(c));
    if (c.desc && c.desc.trim()) meta.push('<span class="card__stat" title="Has description">' + ic('desc', 14) + '</span>');
    if (cs.total) meta.push('<span class="card__stat' + (cs.done === cs.total ? ' is-done' : '') + '">' + ic('check', 13) + cs.done + '/' + cs.total + '</span>');
    if (c.comments.length) meta.push('<span class="card__stat">' + ic('comment', 13) + c.comments.length + '</span>');
    if (c.members.length) meta.push('<span class="avatar-stack">' + c.members.map(function (id) { return avatar(member(id), 'xs'); }).join('') + '</span>');
    return '<article class="card" draggable="true" data-card="' + c.id + '" data-action="open-card" data-id="' + c.id + '" tabindex="0">' +
      (S.coversOn && c.cover ? '<div class="card__cover" style="background:' + c.cover + '"></div>' : '') +
      '<div class="card__body">' +
      (c.labels.length ? '<div class="card__labels">' + c.labels.map(function (id) { var l = label(id); return l ? '<span class="card__label" style="background:' + l.color + '" title="' + esc(l.name) + '"></span>' : ''; }).join('') + '</div>' : '') +
      '<div class="card__title">' + esc(c.title) + '</div>' +
      (meta.length ? '<div class="card__meta">' + meta.join('') + '</div>' : '') +
      '</div></article>';
  }

  function listHTML(l) {
    var editing = S.editingListId === l.id;
    var head = editing
      ? '<input class="list__rename" data-field="listTitle" data-enter="commit-list" data-blur="commit-list" value="' + esc(S.editText) + '" aria-label="List title">'
      : '<h2 class="list__title" data-action="edit-list" data-id="' + l.id + '">' + esc(l.title) + '</h2><span class="list__count">' + l.cards.length + '</span>';
    var menu = S.listMenuFor === l.id
      ? '<div class="popover menu"><button class="menu__item" data-action="open-composer" data-id="' + l.id + '">' + ic('plus', 15) + 'Add card</button>' +
        '<button class="menu__item" data-action="copy-list" data-id="' + l.id + '">' + ic('copy', 15) + 'Copy list</button>' +
        '<button class="menu__item" data-action="archive-list-cards" data-id="' + l.id + '">' + ic('archive', 15) + 'Archive all cards</button>' +
        '<button class="menu__item menu__item--danger" data-action="delete-list" data-id="' + l.id + '">' + ic('trash', 15) + 'Delete list</button></div>'
      : '';
    var footer = S.composerListId === l.id
      ? '<div class="composer"><textarea class="composer__input" data-field="composer" data-enter="add-card" data-id="' + l.id + '" placeholder="Enter a title or paste a list…">' + esc(S.composerText) + '</textarea>' +
        '<div class="composer__actions"><button class="btn btn--primary" data-action="add-card" data-id="' + l.id + '">Add card</button><button class="icon-btn" data-action="close-composer" aria-label="Cancel">' + ic('x', 18) + '</button></div></div>'
      : '<button class="add-card-btn" data-action="open-composer" data-id="' + l.id + '">' + ic('plus', 16) + 'Add a card</button>';
    return '<section class="list" data-list="' + l.id + '">' +
      '<header class="list__header" draggable="true" data-list-handle="' + l.id + '">' + head +
      '<div class="pop-anchor" data-keep-popover><button class="icon-btn icon-btn--sm" data-action="list-menu" data-id="' + l.id + '" aria-label="List actions">' + ic('dots', 16) + '</button>' + menu + '</div></header>' +
      '<div class="list__cards" data-scroll-key="list-' + l.id + '">' + l.cards.filter(visible).map(cardHTML).join('') + '</div>' +
      '<footer class="list__footer">' + footer + '</footer></section>';
  }

  function boardView() {
    var add = S.addingList
      ? '<div class="add-list__form"><input class="input input--sm" data-field="newList" data-enter="add-list" placeholder="Enter list title…" value="' + esc(S.newListText) + '">' +
        '<div class="composer__actions"><button class="btn btn--primary" data-action="add-list">Add list</button><button class="icon-btn" data-action="cancel-add-list" aria-label="Cancel">' + ic('x', 18) + '</button></div></div>'
      : '<button class="add-list__btn" data-action="start-add-list">' + ic('plus', 16) + 'Add another list</button>';
    return '<div class="board" id="board" data-scroll-key="board">' + lists().map(listHTML).join('') + '<div class="add-list">' + add + '</div></div>';
  }

  /* Table view */
  function tableView() {
    var rows = allCards().filter(function (x) { return visible(x.card); }).map(function (x) {
      var c = x.card, cs = checkStats(c);
      return '<tr data-action="open-card" data-id="' + c.id + '">' +
        '<td class="table__title">' + esc(c.title) + '</td>' +
        '<td class="muted">' + esc(x.list.title) + '</td>' +
        '<td><div class="cell-flex">' + c.labels.map(function (id) { var l = label(id); return l ? '<span class="label-pill label-pill--sm" style="background:' + l.color + '">' + esc(l.name) + '</span>' : ''; }).join('') + '</div></td>' +
        '<td><span class="avatar-stack">' + c.members.map(function (id) { return avatar(member(id), 'xs'); }).join('') + '</span></td>' +
        '<td>' + (c.due ? dueBadge(c) : '<span class="muted">—</span>') + '</td>' +
        '<td class="muted" style="font-weight:600">' + (cs.total ? cs.done + '/' + cs.total : '—') + '</td></tr>';
    }).join('');
    return '<div class="page page--tight" data-scroll-key="table"><div class="panel table-wrap"><table class="table"><thead><tr><th>Card</th><th>List</th><th>Labels</th><th>Members</th><th>Due</th><th>Checklist</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="6">' + emptyState('No cards match your filters') + '</td></tr>') + '</tbody></table></div></div>';
  }

  /* Dashboard view */
  function dashboardView() {
    var cards = allCards().map(function (x) { return x.card; });
    var counts = { overdue: 0, soon: 0, normal: 0, complete: 0 };
    cards.forEach(function (c) { var s = dueStatus(c); if (s === 'none') s = 'normal'; counts[s]++; });
    var maxL = Math.max.apply(null, [1].concat(lists().map(function (l) { return l.cards.length; })));
    var perList = lists().map(function (l) {
      return '<div><div class="dash-row__head"><span>' + esc(l.title) + '</span><span>' + l.cards.length + '</span></div><div class="bar"><div class="bar__fill" style="width:' + Math.round(l.cards.length / maxL * 100) + '%"></div></div></div>';
    }).join('');
    var mc = S.members.map(function (m) { return { m: m, n: cards.filter(function (c) { return c.members.indexOf(m.id) >= 0; }).length }; });
    var maxM = Math.max.apply(null, [1].concat(mc.map(function (x) { return x.n; })));
    var perMember = mc.map(function (x) {
      return '<div class="dash-member">' + avatar(x.m, 'sm') + '<div><div class="dash-row__head" style="font-size:12.5px"><span>' + esc(shortName(x.m)) + '</span><span>' + x.n + '</span></div><div class="bar bar--sm"><div class="bar__fill" style="width:' + Math.round(x.n / maxM * 100) + '%;background:' + x.m.color + '"></div></div></div></div>';
    }).join('');
    var st = [['Overdue', counts.overdue, 'var(--c-brand)'], ['Due soon', counts.soon, 'var(--c-warning)'], ['On track', counts.normal, 'var(--c-info)'], ['Complete', counts.complete, 'var(--c-success)']];
    var maxS = Math.max(1, counts.overdue, counts.soon, counts.normal, counts.complete);
    var status = st.map(function (s) {
      return '<div><div class="status__head"><span class="status__swatch" style="background:' + s[2] + '"></span>' + s[0] + '<span class="status__count">' + s[1] + '</span></div><div class="bar"><div class="bar__fill" style="width:' + Math.round(s[1] / maxS * 100) + '%;background:' + s[2] + '"></div></div></div>';
    }).join('');
    return '<div class="page page--tight" data-scroll-key="dash"><div class="dash">' +
      '<div class="dash__stats">' +
      '<div class="panel panel--pad"><div class="stat__value">' + cards.length + '</div><div class="stat__label">Total cards</div></div>' +
      '<div class="panel panel--pad"><div class="stat__value stat__value--brand">' + counts.overdue + '</div><div class="stat__label">Overdue</div></div>' +
      '<div class="panel panel--pad"><div class="stat__value stat__value--success">' + counts.complete + '</div><div class="stat__label">Complete</div></div></div>' +
      '<div class="panel panel--pad"><h3 class="panel__title">Cards per list</h3><div class="dash-rows">' + perList + '</div></div>' +
      '<div class="panel panel--pad"><h3 class="panel__title">Workload by member</h3><div class="dash-rows">' + perMember + '</div></div>' +
      '<div class="panel panel--pad dash__wide"><h3 class="panel__title">Due status</h3><div class="status-grid">' + status + '</div></div>' +
      '</div></div>';
  }

  function chipColor(c) { var l = label(c.labels[0]); return l ? l.color : 'var(--c-brand)'; }

  /* Calendar view (month grid on desktop, agenda on mobile) */
  function calendarView() {
    var now = new Date();
    var first = new Date(now.getFullYear(), now.getMonth() + S.calOffset, 1);
    var start = addDays(first, -first.getDay());
    var cards = allCards().map(function (x) { return x.card; }).filter(function (c) { return c.due && visible(c); });
    var byDay = {};
    cards.forEach(function (c) { var k = isoDay(c.due); (byDay[k] = byDay[k] || []).push(c); });
    var chip = function (c) { return '<button class="cal-chip' + (c.dueComplete ? ' is-complete' : '') + '" style="background:' + chipColor(c) + '" data-action="open-card" data-id="' + c.id + '" title="' + esc(c.title) + '">' + esc(c.title) + '</button>'; };

    var dows = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(function (d) { return '<div class="cal__dow">' + d + '</div>'; }).join('');
    var cells = '';
    for (var i = 0; i < 42; i++) {
      var d = addDays(start, i), k = isoDay(d);
      var cls = (d.getMonth() !== first.getMonth() ? ' is-out' : '') + (k === isoDay(now) ? ' is-today' : '');
      cells += '<div class="cal__day' + cls + '"><span class="cal__num">' + d.getDate() + '</span>' + (byDay[k] || []).map(chip).join('') + '</div>';
    }
    var monthKeys = Object.keys(byDay).filter(function (k) { var d = new Date(k + 'T10:00:00'); return d.getMonth() === first.getMonth() && d.getFullYear() === first.getFullYear(); }).sort();
    var agenda = monthKeys.map(function (k) {
      var d = new Date(k + 'T10:00:00');
      return '<div class="agenda__day"><div class="agenda__date"><div class="agenda__dnum">' + d.getDate() + '</div><div class="agenda__dow">' + d.toLocaleDateString('en-US', { weekday: 'short' }) + '</div></div><div class="agenda__items">' + byDay[k].map(chip).join('') + '</div></div>';
    }).join('');

    return '<div class="page page--tight" data-scroll-key="cal"><div class="cal-head"><h2 class="cal-head__title">' + first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</h2>' +
      '<button class="icon-btn icon-btn--filled" data-action="cal-nav" data-dir="-1" aria-label="Previous month">' + ic('chevL') + '</button>' +
      '<button class="btn btn--secondary" data-action="cal-nav" data-dir="0">Today</button>' +
      '<button class="icon-btn icon-btn--filled" data-action="cal-nav" data-dir="1" aria-label="Next month">' + ic('chevR') + '</button></div>' +
      '<div class="cal"><div class="cal__grid">' + dows + cells + '</div></div>' +
      '<div class="agenda">' + (agenda || emptyState('Nothing due this month')) + '</div></div>';
  }

  /* Timeline view (21-day window grouped by list) */
  function timelineView() {
    var DAYS = 21;
    var start = addDays(dayStart(new Date()), -3 + S.tlOffset * 7);
    var cols = 'minmax(180px, 220px) repeat(' + DAYS + ', minmax(36px, 1fr))';
    var head = '<div class="tl__corner">Card</div>';
    for (var i = 0; i < DAYS; i++) {
      var d = addDays(start, i);
      head += '<div class="tl__day' + (isoDay(d) === isoDay(new Date()) ? ' is-today' : '') + '"><strong>' + d.getDate() + '</strong>' + d.toLocaleDateString('en-US', { weekday: 'narrow' }) + '</div>';
    }
    var body = '';
    lists().forEach(function (l) {
      var rows = l.cards.filter(function (c) { return c.due && visible(c); });
      if (!rows.length) return;
      body += '<div class="tl__group">' + esc(l.title) + '</div>';
      rows.forEach(function (c) {
        var endIdx = Math.round((dayStart(c.due) - start) / 864e5);
        var span = Math.max(2, Math.min(5, checkStats(c).total || 3));
        var s = Math.max(0, endIdx - span + 1), e = Math.min(DAYS - 1, endIdx);
        var bar = e >= 0 && s < DAYS && s <= e
          ? '<button class="tl__bar" style="grid-column:' + (s + 1) + ' / ' + (e + 2) + ';background:' + chipColor(c) + (c.dueComplete ? ';opacity:.55' : '') + '" data-action="open-card" data-id="' + c.id + '">' + esc(c.title) + '</button>'
          : '';
        body += '<div class="tl__label" title="' + esc(c.title) + '">' + esc(c.title) + '</div><div class="tl__track" style="grid-column:2 / -1;grid-template-columns:repeat(' + DAYS + ', minmax(0,1fr))">' + bar + '</div>';
      });
    });
    if (!body) body = '<div class="tl__empty">No dated cards on this board</div>';
    return '<div class="page page--tight" data-scroll-key="tl"><div class="cal-head"><h2 class="cal-head__title">' + fmtDate(start) + ' – ' + fmtDate(addDays(start, DAYS - 1)) + '</h2>' +
      '<button class="icon-btn icon-btn--filled" data-action="tl-nav" data-dir="-1" aria-label="Earlier">' + ic('chevL') + '</button>' +
      '<button class="btn btn--secondary" data-action="tl-nav" data-dir="0">Today</button>' +
      '<button class="icon-btn icon-btn--filled" data-action="tl-nav" data-dir="1" aria-label="Later">' + ic('chevR') + '</button></div>' +
      '<div class="tl" data-scroll-key="tl-grid"><div class="tl__grid" style="grid-template-columns:' + cols + '">' + head + body + '</div></div></div>';
  }

  /* Modules */
  function boardMeta(b) { var n = b.lists.reduce(function (a, l) { return a + l.cards.length; }, 0); return n + ' cards · ' + b.lists.length + ' lists'; }
  function tile(b) { return '<button class="tile" style="background:' + b.grad + '" data-action="switch-board" data-id="' + b.id + '"><span class="tile__title">' + esc(b.title) + '</span><span class="tile__meta">' + boardMeta(b) + '</span></button>'; }
  function boardsModule() {
    var starred = S.boards.filter(function (b) { return b.starred; });
    return '<div class="page" data-scroll-key="boards"><div class="page__inner">' +
      '<div class="page__head"><div><h1 class="page__title">Boards</h1><p class="page__sub">All boards in the ' + esc(S.wsName) + ' workspace</p></div></div>' +
      (starred.length ? '<div class="eyebrow page__section">Starred</div><div class="tile-grid">' + starred.map(tile).join('') + '</div>' : '') +
      '<div class="eyebrow page__section">Your boards</div><div class="tile-grid">' + S.boards.filter(function (b) { return !b.starred; }).map(tile).join('') +
      '<button class="tile tile--add" data-action="open-modal" data-modal="board">' + ic('plus', 16) + 'Create board</button></div></div></div>';
  }
  function membersModule() {
    var cards = [];
    S.boards.forEach(function (b) { b.lists.forEach(function (l) { cards = cards.concat(l.cards); }); });
    var rows = S.members.map(function (m) {
      var n = cards.filter(function (c) { return c.members.indexOf(m.id) >= 0; }).length;
      var email = m.email || shortName(m).toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') + '@creativematter.studio';
      return '<div class="roster__row">' + avatar(m, 'lg') + '<div class="roster__who"><div class="roster__name">' + esc(shortName(m)) + '</div><div class="roster__email">' + esc(email) + '</div></div>' +
        '<div class="roster__role"><div>' + esc(roleOf(m)) + '</div><div>' + n + ' assigned</div></div><span class="status-pill">' + (m.id === 'u1' ? 'Admin' : 'Active') + '</span></div>';
    }).join('');
    return '<div class="page" data-scroll-key="members"><div class="page__inner" style="max-width:880px">' +
      '<div class="page__head"><div style="flex:1"><h1 class="page__title">Members</h1><p class="page__sub">' + S.members.length + ' people in this workspace</p></div>' +
      '<button class="btn btn--primary btn--lg" data-action="open-modal" data-modal="invite">' + ic('userPlus', 15) + 'Invite member</button></div>' +
      '<div class="panel roster">' + rows + '</div></div></div>';
  }
  function portfolioModule() {
    var items = DATA.portfolio.map(function (p) {
      var m = member(p.uid);
      return '<article class="panel work"><div class="work__cover" style="background:' + p.cover + '"><span class="work__tag">' + esc(p.tag) + '</span></div>' +
        '<div class="work__body"><div class="work__title">' + esc(p.title) + '</div><div class="work__by">' + avatar(m, 'xs') + esc(p.client) + '</div></div></article>';
    }).join('');
    return '<div class="page" data-scroll-key="portfolio"><div class="page__inner"><div class="page__head"><div><h1 class="page__title">Portfolio</h1><p class="page__sub">Delivered shots and signature renders from the studio</p></div></div><div class="portfolio">' + items + '</div></div></div>';
  }
  function settingsModule() {
    var row = function (name, desc, control) { return '<div class="setting"><div class="setting__text"><div class="setting__name">' + name + '</div><div class="setting__desc">' + desc + '</div></div>' + control + '</div>'; };
    var sw = function (on, action, lbl) { return '<button class="switch' + (on ? ' is-on' : '') + '" data-action="' + action + '" role="switch" aria-checked="' + on + '" aria-label="' + lbl + '"></button>'; };
    return '<div class="page" data-scroll-key="settings"><div class="page__inner page__inner--narrow"><div class="page__head"><div><h1 class="page__title">Settings</h1><p class="page__sub">Workspace and board preferences</p></div></div>' +
      '<div class="panel settings">' +
      '<div class="setting setting--stack"><label class="field__label" for="ws-name">Workspace name</label><input id="ws-name" class="input" data-field="wsName" value="' + esc(S.wsName) + '"></div>' +
      row('Dark theme', 'Switch the whole workspace to dark mode', sw(S.theme === 'dark', 'toggle-theme', 'Dark theme')) +
      row('Compact cards', 'Tighter card padding to fit more on screen', sw(S.density === 'compact', 'toggle-density', 'Compact cards')) +
      row('Card covers', 'Show colored cover strips on cards', sw(S.coversOn, 'toggle-covers', 'Card covers')) +
      row('Reset board data', 'Restore the original sample studio pipeline', '<button class="btn btn--danger" data-action="reset-data">Reset</button>') +
      '</div></div></div>';
  }

  /* ── Render: overlays ───────────────────────────────────────── */
  function renderOverlays() {
    var root = $('#overlay-root');
    var prev = $('.overlay', root), top = prev ? prev.scrollTop : 0, panelTop = prev && $('.modal', prev) ? $('.modal', prev).scrollTop : 0;
    var html = '';
    if (S.modal === 'task') html = taskModal();
    else if (S.modal === 'board') html = boardModal();
    else if (S.modal === 'invite') html = inviteModal();
    else if (S.modal === 'cardInvite') html = cardInviteModal();
    else if (S.openCardId) html = cardModal();
    root.innerHTML = html;
    document.body.style.overflow = html ? 'hidden' : '';
    var ov = $('.overlay', root);
    if (ov && prev) { ov.scrollTop = top; var m = $('.modal', ov); if (m) m.scrollTop = panelTop; }
    if (S.focus) {
      var el = $(S.focus);
      if (el) { el.focus(); if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length); }
      S.focus = null;
    }
  }

  function modalShell(opts) {
    return '<div class="overlay" data-action="close-modal"><div class="modal ' + (opts.cls || '') + '" data-action="stop" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
      '<div class="modal__head"><div class="modal__icon">' + ic(opts.icon, 16) + '</div><h2 class="modal__title">' + esc(opts.title) + '</h2><button class="icon-btn icon-btn--filled" data-action="close-modal" aria-label="Close">' + ic('x', 17) + '</button></div>' +
      '<div class="modal__body">' + opts.body + '</div>' +
      '<div class="modal__foot"><span class="modal__hint" id="form-hint">' + esc(opts.hint || '') + '</span><button class="btn btn--ghost btn--lg" data-action="close-modal">Cancel</button><button class="btn btn--primary btn--lg" data-submit data-action="' + opts.submit + '"' + (opts.valid ? '' : ' disabled') + '>' + esc(opts.submitLabel) + '</button></div>' +
      '</div></div>';
  }
  function field(lbl, inner) { return '<div class="field"><span class="field__label">' + lbl + '</span>' + inner + '</div>'; }

  function taskModal() {
    var F = S.form;
    var target = lists().find(function (l) { return l.id === F.listId; });
    var listPills = lists().map(function (l) { return '<button class="chip' + (F.listId === l.id ? ' is-active' : '') + '" data-action="form-list" data-id="' + l.id + '">' + esc(l.title) + '</button>'; }).join('');
    var labelPills = S.labels.map(function (l) { var on = F.labels.indexOf(l.id) >= 0; return '<button class="label-pill' + (on ? ' is-selected' : '') + (F.labels.length && !on ? ' is-dim' : '') + '" style="background:' + l.color + '" data-action="form-label" data-id="' + l.id + '">' + esc(l.name) + '</button>'; }).join('');
    var people = S.members.map(function (m) { return '<button class="assignee' + (F.members.indexOf(m.id) >= 0 ? ' is-selected' : '') + '" data-action="form-member" data-id="' + m.id + '">' + avatar(m) + esc(shortName(m)) + '</button>'; }).join('');
    return modalShell({
      title: 'Create task', icon: 'plus', submit: 'create-task', submitLabel: 'Create task', valid: !!F.title.trim(),
      hint: target ? 'Adding to ' + target.title + ' · ' + board().title : 'Pick a list',
      body: field('Title', '<input id="f-title" class="input input--sunken title-input" data-field="form.title" data-enter="create-task" placeholder="e.g. Riverside Tower — night exterior hero" value="' + esc(F.title) + '">') +
        '<div class="row-2">' + field('List', '<div class="pill-row">' + listPills + '</div>') + field('Due date', '<input type="date" class="input input--sm" data-change="form.due" value="' + esc(F.due) + '">') + '</div>' +
        field('Labels', '<div class="pill-row">' + labelPills + '</div>') +
        field('Assignees', '<div class="pill-row">' + people + '</div>') +
        field('Description', '<textarea class="input input--sunken" data-field="form.desc" placeholder="Brief, references, camera notes…">' + esc(F.desc) + '</textarea>')
    });
  }

  function boardModal() {
    var F = S.form, g = DATA.grads;
    var sw = g.map(function (x, i) { return '<button class="swatch' + (F.color === i ? ' is-selected' : '') + '" style="background:' + x + '" data-action="form-color" data-index="' + i + '" aria-label="Background ' + (i + 1) + '"></button>'; }).join('');
    var seg = [['workspace', 'Workspace', 'users'], ['private', 'Private', 'lock']].map(function (v) { return '<button class="seg__btn' + (F.vis === v[0] ? ' is-selected' : '') + '" data-action="form-vis" data-vis="' + v[0] + '">' + ic(v[2], 15) + v[1] + '</button>'; }).join('');
    return modalShell({
      cls: 'modal--sm', title: 'Create board', icon: 'grid', submit: 'create-board', submitLabel: 'Create board', valid: !!F.name.trim(),
      body: '<div class="board-preview" id="board-preview" style="background:' + g[F.color] + '">' + esc(F.name.trim() || 'New board') + '</div>' +
        field('Board title', '<input id="f-name" class="input input--sunken title-input" data-field="form.name" data-enter="create-board" placeholder="e.g. Q3 Competition Boards" value="' + esc(F.name) + '">') +
        field('Background', '<div class="swatches">' + sw + '</div>') +
        field('Visibility', '<div class="seg">' + seg + '</div>')
    });
  }

  function invitePreview() {
    var F = S.form, email = F.email.trim();
    var derived = email ? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }) : '';
    var name = F.name.trim() || derived;
    return { name: name || 'New member', initials: name ? initialsOf(name) : '?', sub: email || 'Pending invite · ' + F.role, color: PALETTE[S.members.length % PALETTE.length] };
  }
  function inviteModal() {
    var F = S.form, p = invitePreview();
    var roles = ['Admin', 'Editor', 'Viewer'].map(function (r) { return '<button class="seg__btn' + (F.role === r ? ' is-selected' : '') + '" data-action="form-role" data-role="' + r + '">' + r + '</button>'; }).join('');
    return modalShell({
      cls: 'modal--sm', title: 'Invite to workspace', icon: 'userPlus', submit: 'send-invite', submitLabel: 'Send invite', valid: !!F.email.trim(),
      hint: F.email.trim() ? 'Joins as ' + F.role : 'Enter an email to invite',
      body: '<div class="invite-preview" id="invite-preview"><span class="avatar avatar--lg" style="background:' + p.color + '">' + esc(p.initials) + '</span><div style="min-width:0"><div class="invite-preview__name">' + esc(p.name) + '</div><div class="invite-preview__sub">' + esc(p.sub) + '</div></div></div>' +
        field('Email address', '<input id="f-email" type="email" class="input input--sunken" data-field="form.email" data-enter="send-invite" placeholder="name@studio.com" value="' + esc(F.email) + '">') +
        field('Full name', '<input class="input input--sunken" data-field="form.name" data-enter="send-invite" placeholder="e.g. Jordan Mire" value="' + esc(F.name) + '">') +
        field('Role', '<div class="seg">' + roles + '</div>')
    });
  }

  /* Updates parts of an open form without re-rendering (keeps input focus) */
  function refreshForm() {
    var F = S.form, btn = $('[data-submit]');
    if (S.modal === 'task') { if (btn) btn.disabled = !F.title.trim(); }
    if (S.modal === 'cardInvite') { if (btn) btn.disabled = !window.CMAuth.validEmail(F.email); }
    if (S.modal === 'board') {
      if (btn) btn.disabled = !F.name.trim();
      var pv = $('#board-preview'); if (pv) pv.textContent = F.name.trim() || 'New board';
    }
    if (S.modal === 'invite') {
      if (btn) btn.disabled = !F.email.trim();
      var p = invitePreview(), box = $('#invite-preview');
      if (box) {
        $('.avatar', box).textContent = p.initials;
        $('.invite-preview__name', box).textContent = p.name;
        $('.invite-preview__sub', box).textContent = p.sub;
      }
      var hint = $('#form-hint'); if (hint) hint.textContent = F.email.trim() ? 'Joins as ' + F.role : 'Enter an email to invite';
    }
  }

  function cardModal() {
    var r = findCard(S.openCardId), c = r.card;
    if (!c) { S.openCardId = null; return ''; }
    var st = dueStatus(c);
    var metaBlocks = '';
    if (c.members.length) metaBlocks += '<div class="cd-meta__block"><span class="eyebrow">Members</span><span class="avatar-stack">' + c.members.map(function (id) { return avatar(member(id), 'md'); }).join('') + '</span></div>';
    if (c.labels.length) metaBlocks += '<div class="cd-meta__block"><span class="eyebrow">Labels</span><div class="pill-row">' + c.labels.map(function (id) { var l = label(id); return l ? '<span class="label-pill" style="background:' + l.color + '">' + esc(l.name) + '</span>' : ''; }).join('') + '</div></div>';
    if (c.due) metaBlocks += '<div class="cd-meta__block"><span class="eyebrow">Due date</span><button class="due-toggle badge--' + st + '" data-action="toggle-complete"><span class="due-toggle__box">' + (c.dueComplete ? '✓' : '') + '</span>' + fmtDate(c.due) + (st === 'overdue' ? ' · Overdue' : st === 'complete' ? ' · Complete' : '') + '</button></div>';

    var desc = S.descEditing
      ? '<textarea id="f-desc" class="input input--sunken" data-field="descDraft" placeholder="Add a more detailed description…">' + esc(S.descDraft) + '</textarea><div class="cd-actions"><button class="btn btn--primary" data-action="save-desc">Save</button><button class="btn btn--ghost" data-action="cancel-desc">Cancel</button></div>'
      : (c.desc && c.desc.trim()
        ? '<button class="cd-desc" data-action="edit-desc">' + esc(c.desc) + '</button>'
        : '<button class="cd-desc cd-desc--empty" data-action="edit-desc">Add a more detailed description…</button>');

    var checklists = c.checklists.map(function (cl) {
      var done = cl.items.filter(function (i) { return i.done; }).length, pct = cl.items.length ? Math.round(done / cl.items.length * 100) : 0;
      var items = cl.items.map(function (it) {
        return '<div class="check-item' + (it.done ? ' is-done' : '') + '"><button class="check-item__box' + (it.done ? ' is-done' : '') + '" data-action="toggle-item" data-cl="' + cl.id + '" data-id="' + it.id + '" aria-label="Toggle item">' + (it.done ? '✓' : '') + '</button>' +
          '<span class="check-item__text">' + esc(it.text) + '</span><button class="icon-btn icon-btn--sm" data-action="delete-item" data-cl="' + cl.id + '" data-id="' + it.id + '" aria-label="Delete item">' + ic('trash', 14) + '</button></div>';
      }).join('');
      return '<section class="cd-section">' + ic('check', 20, 'cd-icon') + '<div class="cd-section__body"><h3 class="cd-h"><span>' + esc(cl.name) + '</span><span class="muted" style="flex:none;font-size:12px">' + done + '/' + cl.items.length + '</span><button class="btn btn--ghost" style="height:28px" data-action="delete-checklist" data-id="' + cl.id + '">Delete</button></h3>' +
        '<div class="checklist__progress"><span class="checklist__pct">' + pct + '%</span><div class="bar bar--sm"><div class="bar__fill" style="width:' + pct + '%"></div></div></div>' + items +
        '<div class="checklist__add"><input class="input input--sm input--sunken" data-field="check:' + cl.id + '" data-enter="add-item" data-id="' + cl.id + '" placeholder="Add an item" value="' + esc(S.checkInputs[cl.id] || '') + '"><button class="btn btn--primary" style="height:34px" data-action="add-item" data-id="' + cl.id + '">Add</button></div></div></section>';
    }).join('');

    var comments = c.comments.map(function (cm) {
      return '<div class="comment">' + (cm.picture ? '<img class="avatar avatar--md" src="' + esc(cm.picture) + '" alt="" referrerpolicy="no-referrer">' : '<span class="avatar avatar--md" style="background:' + cm.color + '">' + esc(cm.initials) + '</span>') + '<div class="comment__body"><div class="comment__head"><span class="comment__author">' + esc(cm.author) + '</span><span class="comment__time">' + fmtTime(cm.time) + '</span></div><div class="comment__text">' + esc(cm.text) + '</div></div></div>';
    }).join('');

    var memberPicker = S.picker === 'members' ? '<div class="popover picker">' + S.members.map(function (m) { var on = c.members.indexOf(m.id) >= 0; return '<button class="picker__item" data-action="card-member" data-id="' + m.id + '">' + avatar(m, 'xs') + '<span class="picker__name">' + esc(shortName(m)) + '</span><span class="picker__check">' + (on ? '✓' : '') + '</span></button>'; }).join('') + '</div>' : '';
    var labelPicker = S.picker === 'labels' ? '<div class="popover picker">' + S.labels.map(function (l) { var on = c.labels.indexOf(l.id) >= 0; return '<button class="picker__item" data-action="card-label" data-id="' + l.id + '"><span class="picker__label" style="background:' + l.color + '">' + esc(l.name) + '</span><span class="picker__check" style="color:var(--c-text)">' + (on ? '✓' : '') + '</span></button>'; }).join('') + '</div>' : '';
    var covers = COVERS.map(function (col) { return '<button class="swatch swatch--sm' + (c.cover === col ? ' is-selected' : '') + '" style="background:' + col + '" data-action="card-cover" data-color="' + col + '" aria-label="Cover color"></button>'; }).join('');
    var moveOpts = lists().map(function (l) { return '<option value="' + l.id + '"' + (l.id === r.list.id ? ' selected' : '') + '>' + esc(l.title) + '</option>'; }).join('');

    return '<div class="overlay" data-action="close-card"><div class="modal modal--card" data-action="stop" role="dialog" aria-modal="true" aria-label="Card details">' +
      (c.cover ? '<div class="modal__cover" style="background:' + c.cover + '"></div>' : '') +
      '<div class="cd"><div class="cd__main">' +
      '<div class="cd-head">' + ic('card', 20, 'cd-icon') + '<div class="cd-head__text"><input class="cd-title" data-field="card.title" value="' + esc(c.title) + '" aria-label="Card title"><div class="cd-sub">in list <strong>' + esc(r.list.title) + '</strong></div></div>' +
      '<button class="icon-btn icon-btn--filled" data-action="close-card" aria-label="Close">' + ic('x', 18) + '</button></div>' +
      (metaBlocks ? '<div class="cd-meta">' + metaBlocks + '</div>' : '') +
      '<section class="cd-section">' + ic('desc', 20, 'cd-icon') + '<div class="cd-section__body"><h3 class="cd-h"><span>Description</span></h3>' + desc + '</div></section>' +
      checklists +
      '<section class="cd-section">' + ic('comment', 20, 'cd-icon') + '<div class="cd-section__body"><h3 class="cd-h"><span>Activity</span></h3>' +
      '<div class="comment">' + meAvatar('md') + '<div class="comment__body"><textarea class="input input--sunken" style="min-height:44px" data-field="comment" placeholder="Write a comment…">' + esc(S.comment) + '</textarea><div class="cd-actions"><button class="btn btn--primary" data-action="add-comment">Comment</button></div></div></div>' +
      '<div class="comments">' + comments + '</div></div></section>' +
      '</div><aside class="cd__side">' +
      '<span class="eyebrow">Add to card</span>' +
      '<div class="pop-anchor" data-keep-popover><button class="side-btn" data-action="picker" data-picker="members">' + ic('users', 15) + 'Members</button>' + memberPicker + '</div>' +
      '<div class="pop-anchor" data-keep-popover><button class="side-btn" data-action="picker" data-picker="labels">' + ic('tag', 15) + 'Labels</button>' + labelPicker + '</div>' +
      '<button class="side-btn side-btn--accent" data-action="open-card-invite">' + ic('userPlus', 15) + 'Invite to task</button>' +
      '<label class="side-btn">' + ic('calendar', 15) + 'Dates<input type="date" data-change="card.due" value="' + (c.due ? isoDay(c.due) : '') + '" aria-label="Due date"></label>' +
      '<button class="side-btn" data-action="add-checklist">' + ic('check', 15) + 'Checklist</button>' +
      '<span class="eyebrow">Cover</span><div class="swatches">' + covers + '</div>' +
      '<span class="eyebrow">Move to</span><select class="input input--sm" data-change="card.move" aria-label="Move card to list">' + moveOpts + '</select>' +
      '<hr class="divider">' +
      '<button class="side-btn" data-action="copy-card">' + ic('copy', 15) + 'Copy</button>' +
      '<button class="side-btn side-btn--danger" data-action="archive-card">' + ic('archive', 15) + 'Archive</button>' +
      '</aside></div></div></div>';
  }

  /* Current user + account menu */
  function meAvatar(size) {
    return ME.picture
      ? '<img class="avatar avatar--' + size + '" src="' + esc(ME.picture) + '" alt="' + esc(ME.name) + '" referrerpolicy="no-referrer">'
      : '<span class="avatar avatar--' + size + '" style="background:' + ME.color + '" title="' + esc(ME.name) + '">' + esc(ME.initials) + '</span>';
  }
  function renderUser() {
    var btn = $('#user-btn'), pop = $('#user-pop');
    if (!btn) return;
    btn.innerHTML = meAvatar('md');
    btn.setAttribute('aria-expanded', S.userOpen ? 'true' : 'false');
    pop.innerHTML = S.userOpen
      ? '<div class="popover account"><div class="account__head">' + meAvatar('lg') + '<div style="min-width:0"><div class="account__name">' + esc(ME.name) + '</div><div class="account__email">' + esc(ME.email) + '</div>' +
        '<span class="account__via">' + (ME.provider === 'google' ? 'Signed in with Google' : 'Signed in with email') + '</span></div></div>' +
        '<div class="menu"><button class="menu__item" data-action="open-modal" data-modal="invite">' + ic('userPlus', 15) + 'Invite to workspace</button>' +
        '<button class="menu__item" data-action="set-module" data-module="settings">' + ic('gear', 15) + 'Settings</button>' +
        '<button class="menu__item menu__item--danger" data-action="sign-out">' + ic('link', 15) + 'Sign out</button></div></div>'
      : '';
  }

  /* Invite people to a specific task */
  function cardInviteModal() {
    var r = findCard(S.openCardId), c = r.card, F = S.form;
    if (!c) return '';
    var others = S.members.filter(function (m) { return c.members.indexOf(m.id) < 0; });
    var onCard = c.members.map(function (id) { return member(id); }).filter(Boolean);
    var quick = others.length
      ? field('Or add a teammate', '<div class="pill-row">' + others.map(function (m) { return '<button class="assignee" data-action="card-invite-member" data-id="' + m.id + '">' + avatar(m) + esc(shortName(m)) + '</button>'; }).join('') + '</div>')
      : '';
    return modalShell({
      cls: 'modal--sm', title: 'Invite to task', icon: 'userPlus', submit: 'send-card-invite', submitLabel: F.gmail ? 'Send via Gmail' : 'Send invite',
      valid: window.CMAuth.validEmail(F.email), hint: 'They\u2019ll be added to this card',
      body: '<div class="task-ref"><div class="task-ref__title">' + esc(c.title) + '</div><div class="task-ref__meta">' + esc(r.list.title) + ' · ' + esc(board().title) + (c.due ? ' · Due ' + fmtDate(c.due) : '') + '</div>' +
          (onCard.length ? '<div class="task-ref__people"><span class="avatar-stack">' + onCard.map(function (m) { return avatar(m, 'xs'); }).join('') + '</span><span>' + onCard.length + ' on this task</span></div>' : '') + '</div>' +
        field('Email address', '<input id="f-inv-email" type="email" class="input input--sunken" data-field="form.email" data-enter="send-card-invite" placeholder="name@gmail.com" value="' + esc(F.email) + '">') +
        field('Name', '<input class="input input--sunken" data-field="form.name" data-enter="send-card-invite" placeholder="Optional" value="' + esc(F.name) + '">') +
        field('Message', '<textarea class="input input--sunken" data-field="form.note" placeholder="Add a note for them (optional)">' + esc(F.note) + '</textarea>') +
        '<div class="setting setting--inline"><div class="setting__text"><div class="setting__name">Email the invite with Gmail</div><div class="setting__desc">Opens a pre-filled Gmail draft in a new tab</div></div>' +
        '<button class="switch' + (F.gmail ? ' is-on' : '') + '" data-action="form-gmail" role="switch" aria-checked="' + !!F.gmail + '" aria-label="Email with Gmail"></button></div>' +
        quick
    });
  }

  function renderToast() {
    var t = S.toast;
    $('#toast-root').innerHTML = t
      ? '<div class="toast"><span>' + esc(t.msg) + '</span>' + (t.undo ? '<button class="btn btn--primary" style="height:28px" data-action="undo">Undo</button>' : '') + '<button class="icon-btn icon-btn--sm" data-action="dismiss-toast" aria-label="Dismiss">' + ic('x', 16) + '</button></div>'
      : '';
  }

  function render() { applyChrome(); renderSidebar(); renderNotif(); renderUser(); renderMain(); renderOverlays(); }

  /* ── Actions (data-action) ──────────────────────────────────── */
  function openCardById(id) { S.openCardId = id; S.descEditing = false; S.picker = null; S.comment = ''; }
  function curCard() { return findCard(S.openCardId).card; }
  function toggleIn(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }

  var A = {
    stop: function () {},
    'go-home': function (el, e) { e.preventDefault(); S.module = 'board'; S.view = 'board'; render(); },
    'toggle-sidebar': function () { if (mqDrawer.matches) S.drawerOpen = !S.drawerOpen; else S.sidebarOpen = !S.sidebarOpen; applyChrome(); },
    'close-drawer': function () { S.drawerOpen = false; applyChrome(); },
    'toggle-search': function () { var n = $('#topnav'); n.classList.toggle('is-searching'); if (n.classList.contains('is-searching')) $('.search__input').focus(); },
    'toggle-theme': function () { S.theme = S.theme === 'dark' ? 'light' : 'dark'; commit(); },
    'toggle-density': function () { S.density = S.density === 'compact' ? 'comfortable' : 'compact'; commit(); },
    'toggle-covers': function () { S.coversOn = !S.coversOn; commit(); },
    'toggle-notif': function () { var o = !S.notifOpen; closeTransient(); S.notifOpen = o; render(); },
    'read-notif': function (el) { if (S.readNotifs.indexOf(el.dataset.id) < 0) S.readNotifs.push(el.dataset.id); save(); applyChrome(); renderNotif(); },
    'read-all': function () { S.readNotifs = DATA.notifications.map(function (n) { return n.id; }); save(); applyChrome(); renderNotif(); },
    'toggle-share': function () { var o = !S.shareOpen; closeTransient(); S.shareOpen = o; renderMain(); renderNotif(); },
    'share-invite': function () { var v = S.shareEmail.trim(); S.shareEmail = ''; S.shareOpen = false; renderMain(); toast(v ? 'Invitation sent to ' + v : 'Enter an email to invite'); },
    'copy-link': function () {
      var url = 'https://studio.creativematter.app/b/' + board().id.replace('board-', '');
      if (navigator.clipboard) navigator.clipboard.writeText(url).catch(function () {});
      S.shareOpen = false; renderMain(); toast('Board link copied to clipboard');
    },

    'set-module': function (el) { S.module = el.dataset.module; S.drawerOpen = false; closeTransient(); render(); },
    'switch-board': function (el) {
      if (el.dataset.id !== S.activeBoardId) { S.activeBoardId = el.dataset.id; S.filter = { text: '', members: [], labels: [], due: null }; $('.search__input').value = ''; save(); }
      S.module = 'board'; S.drawerOpen = false; closeTransient(); render();
    },
    'toggle-star': function () { var b = board(); b.starred = !b.starred; commit(); },
    'set-view': function (el) { S.view = el.dataset.view; renderMain(); },
    'cal-nav': function (el) { var d = +el.dataset.dir; S.calOffset = d === 0 ? 0 : S.calOffset + d; renderMain(); },
    'tl-nav': function (el) { var d = +el.dataset.dir; S.tlOffset = d === 0 ? 0 : S.tlOffset + d; renderMain(); },

    'toggle-filter': function () { S.filterOpen = !S.filterOpen; renderMain(); },
    'filter-member': function (el) { toggleIn(S.filter.members, el.dataset.id); renderMain(); },
    'filter-label': function (el) { toggleIn(S.filter.labels, el.dataset.id); renderMain(); },
    'filter-due': function (el) { S.filter.due = S.filter.due === el.dataset.due ? null : el.dataset.due; renderMain(); },
    'clear-filters': function () { S.filter = { text: '', members: [], labels: [], due: null }; $('.search__input').value = ''; renderMain(); },

    'list-menu': function (el) { var id = el.dataset.id, o = S.listMenuFor !== id; closeTransient(); S.listMenuFor = o ? id : null; renderMain(); },
    'edit-list': function (el) { var l = lists().find(function (x) { return x.id === el.dataset.id; }); S.editingListId = l.id; S.editText = l.title; renderMain(); var i = $('.list__rename'); if (i) { i.focus(); i.select(); } },
    'commit-list': function () {
      if (!S.editingListId) return;
      var id = S.editingListId, t = S.editText.trim(); S.editingListId = null;
      if (t) { var l = lists().find(function (x) { return x.id === id; }); if (l) l.title = t; save(); }
      renderMain();
    },
    'open-composer': function (el) { S.composerListId = el.dataset.id; S.composerText = ''; S.listMenuFor = null; renderMain(); var t = $('.composer__input'); if (t) t.focus(); },
    'close-composer': function () { S.composerListId = null; renderMain(); },
    'add-card': function (el) {
      var id = el.dataset.id || S.composerListId, l = lists().find(function (x) { return x.id === id; });
      var titles = S.composerText.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!l || !titles.length) return;
      titles.forEach(function (t) { l.cards.push(newCard({ title: t })); });
      S.composerText = ''; save(); renderMain();
      var t = $('.composer__input'); if (t) t.focus();
      var cont = $('[data-list="' + id + '"] .list__cards'); if (cont) cont.scrollTop = cont.scrollHeight;
    },
    'copy-list': function (el) {
      var ls = lists(), i = ls.findIndex(function (x) { return x.id === el.dataset.id; });
      var cp = clone(ls[i]); cp.id = uid('k'); cp.title += ' (copy)'; cp.cards.forEach(function (c) { c.id = uid('c'); });
      ls.splice(i + 1, 0, cp); S.listMenuFor = null; commit();
    },
    'archive-list-cards': function (el) { S.listMenuFor = null; withUndo('All cards archived', function () { lists().find(function (x) { return x.id === el.dataset.id; }).cards = []; }); },
    'delete-list': function (el) { S.listMenuFor = null; withUndo('List deleted', function () { board().lists = lists().filter(function (x) { return x.id !== el.dataset.id; }); }); },
    'start-add-list': function () { S.addingList = true; S.newListText = ''; renderMain(); var i = $('.add-list input'); if (i) i.focus(); },
    'cancel-add-list': function () { S.addingList = false; renderMain(); },
    'add-list': function () {
      var t = S.newListText.trim(); if (!t) { S.addingList = false; renderMain(); return; }
      lists().push({ id: uid('k'), title: t, cards: [] }); S.newListText = ''; save(); renderMain();
      var b = $('#board'); if (b) b.scrollLeft = b.scrollWidth;
      var i = $('.add-list input'); if (i) i.focus();
    },

    'open-card': function (el) { openCardById(el.dataset.id); renderOverlays(); },
    'close-card': function () { S.openCardId = null; S.picker = null; renderOverlays(); },
    picker: function (el) { var p = el.dataset.picker; S.picker = S.picker === p ? null : p; renderOverlays(); },
    'card-member': function (el) { toggleIn(curCard().members, el.dataset.id); save(); renderMain(); renderOverlays(); },
    'card-label': function (el) { toggleIn(curCard().labels, el.dataset.id); save(); renderMain(); renderOverlays(); },
    'card-cover': function (el) { var c = curCard(); c.cover = c.cover === el.dataset.color ? null : el.dataset.color; save(); renderMain(); renderOverlays(); },
    'toggle-complete': function () { var c = curCard(); c.dueComplete = !c.dueComplete; save(); renderMain(); renderOverlays(); },
    'edit-desc': function () { S.descEditing = true; S.descDraft = curCard().desc; S.focus = '#f-desc'; renderOverlays(); },
    'cancel-desc': function () { S.descEditing = false; renderOverlays(); },
    'save-desc': function () { curCard().desc = S.descDraft; S.descEditing = false; save(); renderMain(); renderOverlays(); },
    'add-checklist': function () { curCard().checklists.push({ id: uid('cl'), name: 'Checklist', items: [] }); save(); renderMain(); renderOverlays(); },
    'delete-checklist': function (el) { var c = curCard(); c.checklists = c.checklists.filter(function (x) { return x.id !== el.dataset.id; }); save(); renderMain(); renderOverlays(); },
    'add-item': function (el) {
      var clId = el.dataset.id, txt = (S.checkInputs[clId] || '').trim(); if (!txt) return;
      var cl = curCard().checklists.find(function (x) { return x.id === clId; });
      cl.items.push({ id: uid('ci'), text: txt, done: false }); S.checkInputs[clId] = '';
      S.focus = '[data-field="check:' + clId + '"]'; save(); renderMain(); renderOverlays();
    },
    'toggle-item': function (el) { var cl = curCard().checklists.find(function (x) { return x.id === el.dataset.cl; }); var it = cl.items.find(function (x) { return x.id === el.dataset.id; }); it.done = !it.done; save(); renderMain(); renderOverlays(); },
    'delete-item': function (el) { var cl = curCard().checklists.find(function (x) { return x.id === el.dataset.cl; }); cl.items = cl.items.filter(function (x) { return x.id !== el.dataset.id; }); save(); renderMain(); renderOverlays(); },
    'add-comment': function () {
      var t = S.comment.trim(); if (!t) return;
      curCard().comments.unshift({ id: uid('cm'), author: ME.name, initials: ME.initials, color: ME.color, picture: ME.picture || '', text: t, time: new Date().toISOString() });
      S.comment = ''; save(); renderMain(); renderOverlays();
    },
    'copy-card': function () {
      var r = findCard(S.openCardId), cp = clone(r.card); cp.id = uid('c'); cp.title += ' (copy)';
      r.list.cards.splice(r.list.cards.indexOf(r.card) + 1, 0, cp); S.openCardId = null; commit(); toast('Card copied');
    },
    'archive-card': function () { var id = S.openCardId; S.openCardId = null; withUndo('Card archived', function () { removeCard(id); }); },

    'open-modal': function (el) {
      var m = el.dataset.modal; closeTransient(); S.openCardId = null; S.modal = m; S.drawerOpen = false;
      if (m === 'task') { S.form = { title: '', listId: lists()[0] && lists()[0].id, due: '', labels: [], members: [], desc: '' }; S.focus = '#f-title'; if (S.module !== 'board') S.module = 'board'; }
      if (m === 'board') { S.form = { name: '', color: 0, vis: 'workspace' }; S.focus = '#f-name'; }
      if (m === 'invite') { S.form = { email: '', name: '', role: 'Editor' }; S.focus = '#f-email'; }
      render();
    },
    'close-modal': function () { S.modal = null; renderOverlays(); },
    'form-list': function (el) { S.form.listId = el.dataset.id; renderOverlays(); },
    'form-label': function (el) { toggleIn(S.form.labels, el.dataset.id); renderOverlays(); },
    'form-member': function (el) { toggleIn(S.form.members, el.dataset.id); renderOverlays(); },
    'form-color': function (el) { S.form.color = +el.dataset.index; renderOverlays(); },
    'form-vis': function (el) { S.form.vis = el.dataset.vis; renderOverlays(); },
    'form-role': function (el) { S.form.role = el.dataset.role; renderOverlays(); },
    'create-task': function () {
      var F = S.form, t = F.title.trim(); if (!t) return;
      var l = lists().find(function (x) { return x.id === F.listId; }) || lists()[0]; if (!l) return;
      l.cards.push(newCard({ title: t, labels: F.labels.slice(), members: F.members.slice(), due: fromIsoDay(F.due), desc: F.desc.trim() }));
      S.modal = null; commit(); toast('Task added to “' + l.title + '”');
    },
    'create-board': function () {
      var F = S.form, n = F.name.trim(); if (!n) return;
      var b = { id: uid('board'), title: n, grad: DATA.grads[F.color], private: F.vis === 'private', lists: [{ id: uid('k'), title: 'To-Do', cards: [] }, { id: uid('k'), title: 'Doing', cards: [] }, { id: uid('k'), title: 'Done', cards: [] }] };
      S.boards.push(b); S.activeBoardId = b.id; S.module = 'board'; S.view = 'board'; S.modal = null; commit(); toast('Board “' + n + '” created');
    },
    'send-invite': function () {
      var F = S.form, email = F.email.trim(); if (!email) return;
      var p = invitePreview();
      S.members.push({ id: uid('u'), name: p.name + ' · ' + F.role, initials: p.initials, color: p.color });
      S.modal = null; commit(); toast('Invitation sent to ' + email);
    },

    'reset-data': function () {
      if (!window.confirm('Reset all boards to the sample data? This cannot be undone.')) return;
      var s = DATA.seed(); S.boards = s.boards; S.labels = s.labels; S.members = s.members; S.activeBoardId = s.boards[0].id; S.module = 'board'; commit(); toast('Board data reset');
    },
    'toggle-user': function () { var o = !S.userOpen; closeTransient(); S.userOpen = o; renderUser(); renderNotif(); renderMain(); },
    'sign-out': function () { window.CMAuth.signOut(); },
    'open-card-invite': function () { S.picker = null; S.modal = 'cardInvite'; S.form = { email: '', name: '', note: '', gmail: true }; S.focus = '#f-inv-email'; renderOverlays(); },
    'form-gmail': function () { S.form.gmail = !S.form.gmail; renderOverlays(); },
    'card-invite-member': function (el) {
      var c = curCard(), m = member(el.dataset.id); if (!c || !m) return;
      if (c.members.indexOf(m.id) < 0) c.members.push(m.id);
      save(); renderMain(); renderOverlays(); toast(shortName(m) + ' added to this task');
    },
    'send-card-invite': function () {
      var F = S.form, email = F.email.trim().toLowerCase();
      if (!window.CMAuth.validEmail(email)) return;
      var r = findCard(S.openCardId), c = r.card; if (!c) return;
      var m = S.members.find(function (x) { return (x.email || '').toLowerCase() === email; });
      if (!m) {
        var nm = F.name.trim() || window.CMAuth.nameFromEmail(email);
        m = { id: uid('u'), name: nm + ' · Guest', initials: window.CMAuth.initials(nm), color: PALETTE[S.members.length % PALETTE.length], email: email, invitedBy: ME.email, pending: true };
        S.members.push(m);
      }
      if (c.members.indexOf(m.id) < 0) c.members.push(m.id);
      c.comments.unshift({ id: uid('cm'), author: ME.name, initials: ME.initials, color: ME.color, picture: ME.picture || '', text: 'Invited ' + email + ' to this task.' + (F.note.trim() ? '\n\u201c' + F.note.trim() + '\u201d' : ''), time: new Date().toISOString() });
      if (F.gmail) {
        var subject = ME.name + ' invited you to \u201c' + c.title + '\u201d on Creative Matter';
        var body = 'Hi ' + shortName(m) + ',\n\n' + ME.name + ' has invited you to collaborate on a task:\n\n' +
          '  ' + c.title + '\n  Board: ' + board().title + ' \u2192 ' + r.list.title + (c.due ? '\n  Due: ' + fmtDate(c.due) : '') + '\n\n' +
          (F.note.trim() ? F.note.trim() + '\n\n' : '') + 'Open the workspace: ' + location.href.split('#')[0] + '\n\n\u2014 ' + ME.name;
        window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email) + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank', 'noopener');
      }
      S.modal = null; commit(); toast((F.gmail ? 'Gmail draft opened \u00b7 ' : 'Invited ') + email + ' to this task');
    },
    undo: function () { if (S.toast && S.toast.undo) { var u = S.toast.undo; S.toast = null; renderToast(); u(); } },
    'dismiss-toast': function () { S.toast = null; renderToast(); }
  };

  /* ── Field bindings (data-field / data-change) ──────────────── */
  function onField(f, v) {
    if (f === 'search') { S.filter.text = v; renderMain(); return; }
    if (f === 'listTitle') { S.editText = v; return; }
    if (f === 'composer') { S.composerText = v; return; }
    if (f === 'newList') { S.newListText = v; return; }
    if (f === 'shareEmail') { S.shareEmail = v; return; }
    if (f === 'descDraft') { S.descDraft = v; return; }
    if (f === 'comment') { S.comment = v; return; }
    if (f === 'wsName') { S.wsName = v; save(); renderSidebar(); return; }
    if (f === 'card.title') { var c = curCard(); if (c) { c.title = v; save(); renderMain(); } return; }
    if (f.indexOf('check:') === 0) { S.checkInputs[f.slice(6)] = v; return; }
    if (f.indexOf('form.') === 0) { S.form[f.slice(5)] = v; refreshForm(); }
  }
  function onChange(f, v) {
    if (f === 'card.due') { var c = curCard(); c.due = fromIsoDay(v); if (!v) c.dueComplete = false; save(); renderMain(); renderOverlays(); }
    if (f === 'card.move') { moveCard(S.openCardId, v, null); save(); renderMain(); renderOverlays(); toast('Card moved'); }
    if (f === 'form.due') { S.form.due = v; }
  }

  /* ── Global events ──────────────────────────────────────────── */
  document.addEventListener('click', function (e) {
    var keep = e.target.closest('[data-keep-popover]');
    if (!keep && (S.notifOpen || S.shareOpen || S.userOpen || S.listMenuFor || S.picker)) {
      var hadPicker = !!S.picker; closeTransient(); renderNotif(); renderUser(); renderMain(); if (hadPicker) renderOverlays();
    }
    var el = e.target.closest('[data-action]');
    if (!el) return;
    var fn = A[el.dataset.action];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', function (e) { var f = e.target.dataset && e.target.dataset.field; if (f) onField(f, e.target.value); });
  document.addEventListener('change', function (e) { var f = e.target.dataset && e.target.dataset.change; if (f) onChange(f, e.target.value); });
  document.addEventListener('focusout', function (e) { var a = e.target.dataset && e.target.dataset.blur; if (a && A[a]) A[a](e.target); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (S.drag) return;
      if (S.modal) { S.modal = null; renderOverlays(); return; }
      if (S.openCardId) { if (S.picker) { S.picker = null; } else { S.openCardId = null; } renderOverlays(); return; }
      S.drawerOpen = false; S.composerListId = null; S.editingListId = null; S.addingList = false; closeTransient();
      $('#topnav').classList.remove('is-searching');
      render(); return;
    }
    var t = e.target;
    if (e.key === 'Enter' && t.dataset && t.dataset.enter && !e.shiftKey && !e.isComposing) {
      e.preventDefault(); var fn = A[t.dataset.enter]; if (fn) fn(t, e);
      return;
    }
    if (e.key === 'Enter' && t.classList && t.classList.contains('card')) { openCardById(t.dataset.id); renderOverlays(); }
  });
  mqDrawer.addEventListener('change', function () { S.drawerOpen = false; applyChrome(); });

  /* ── Drag & drop (placeholder-based, commits on drop) ───────── */
  var ph = null, dragEl = null, zone = null;
  function endDrag() {
    if (ph && ph.parentNode) ph.parentNode.removeChild(ph);
    if (dragEl) dragEl.classList.remove('is-dragging');
    $('#drag-actions').classList.remove('is-visible');
    $$('.drop-zone').forEach(function (z) { z.classList.remove('is-over'); });
    S.drag = null; ph = null; dragEl = null; zone = null;
  }
  document.addEventListener('dragstart', function (e) {
    var card = e.target.closest && e.target.closest('.card[data-card]');
    var handle = e.target.closest && e.target.closest('[data-list-handle]');
    if (card) {
      S.drag = { type: 'card', id: card.dataset.card }; dragEl = card;
      ph = document.createElement('div'); ph.className = 'card-ph'; ph.style.height = card.offsetHeight + 'px';
      $('#drag-actions').classList.add('is-visible');
    } else if (handle) {
      var list = handle.closest('.list');
      S.drag = { type: 'list', id: handle.dataset.listHandle }; dragEl = list;
      ph = document.createElement('div'); ph.className = 'list-ph'; ph.style.height = list.offsetHeight + 'px';
    } else return;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', S.drag.id); } catch (err) { /* IE */ }
    requestAnimationFrame(function () {
      if (!dragEl) return;
      dragEl.parentNode.insertBefore(ph, dragEl);
      dragEl.classList.add('is-dragging');
    });
  });
  document.addEventListener('dragover', function (e) {
    if (!S.drag || !ph) return;
    if (S.drag.type === 'card') {
      var z = e.target.closest('[data-action-zone]');
      $$('.drop-zone').forEach(function (d) { d.classList.toggle('is-over', d === z); });
      zone = z ? z.dataset.actionZone : null;
      if (z) { e.preventDefault(); return; }
      var listEl = e.target.closest('.list'); if (!listEl) return;
      e.preventDefault();
      var cont = $('.list__cards', listEl);
      var next = $$('.card:not(.is-dragging)', cont).find(function (c) { var r = c.getBoundingClientRect(); return e.clientY < r.top + r.height / 2; });
      if (next) { if (ph.nextSibling !== next) cont.insertBefore(ph, next); } else if (cont.lastElementChild !== ph) cont.appendChild(ph);
    } else {
      var b = $('#board'); if (!b || !b.contains(e.target)) return;
      e.preventDefault();
      var before = $$('.list:not(.is-dragging)', b).find(function (l) { var r = l.getBoundingClientRect(); return e.clientX < r.left + r.width / 2; });
      var target = before || $('.add-list', b);
      if (ph.nextSibling !== target) b.insertBefore(ph, target);
    }
    var bd = $('#board');
    if (bd) { var br = bd.getBoundingClientRect(); if (e.clientX > br.right - 60) bd.scrollLeft += 14; else if (e.clientX < br.left + 60) bd.scrollLeft -= 14; }
  });
  document.addEventListener('drop', function (e) {
    if (!S.drag) return;
    e.preventDefault();
    var d = S.drag;
    if (d.type === 'card') {
      if (zone) {
        var z = zone; endDrag();
        withUndo(z === 'delete' ? 'Card deleted' : 'Card archived', function () { removeCard(d.id); });
        return;
      }
      var listEl = ph && ph.closest('.list');
      if (listEl) {
        var next = ph.nextElementSibling;
        while (next && !next.classList.contains('card')) next = next.nextElementSibling;
        moveCard(d.id, listEl.dataset.list, next ? next.dataset.card : null);
      }
    } else if (ph && ph.parentNode) {
      var n = ph.nextElementSibling;
      while (n && n.classList.contains('is-dragging')) n = n.nextElementSibling;
      moveList(d.id, n && n.dataset.list ? n.dataset.list : null);
    }
    endDrag(); save(); renderMain();
  });
  document.addEventListener('dragend', function () { if (S.drag) { endDrag(); renderMain(); } });

  /* ── Boot ───────────────────────────────────────────────────── */
  load();
  if (mqDrawer.matches) S.drawerOpen = false;
  render();
})();
