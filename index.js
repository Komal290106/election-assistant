/* ═══════════════════════════════════════════════════════
   ELECTION ASSISTANT — index.js  v3.0
   Production-quality civic AI platform.
   Features: Firebase Google OAuth, streaming Groq AI,
   country context, Hindi toggle, WhatsApp share,
   offline FAQ fallback, Google Maps integration.
   No frameworks. Pure ES6+.
═══════════════════════════════════════════════════════ */

'use strict';

/* ──────────────────────────────────────────────────────
   STATE
────────────────────────────────────────────────────── */
const state = {
  groqKey:     '',
  mapsKey:     '',
  mapType:     'booth',
  isSending:   false,
  chatHistory: [],
  activeTab:   'steps',
  country:     'India',
  hindiMode:   false,
  user:        null,       // Firebase auth user object
  authReady:   false,      // true once onAuthStateChanged fires once
};

/* ──────────────────────────────────────────────────────
   FIREBASE HANDLES — populated after dynamic import
────────────────────────────────────────────────────── */
let firebaseApp  = null;
let firebaseAuth = null;

/* ──────────────────────────────────────────────────────
   SYSTEM PROMPTS — per-country context
────────────────────────────────────────────────────── */
const SYSTEM_PROMPTS = {
  India: `You are a helpful, accurate, and friendly Election Assistant specialising in Indian elections.
Your role is to explain the Indian election process, voter rights, and democratic procedures in simple, clear language that any citizen can understand.

Key topics you know deeply:
- Voter Registration: EPIC card (Electors Photo Identity Card), voters.eci.gov.in, Voter Helpline App, BLO (Booth Level Officer), Form 6 application, 1950 helpline
- Polling Booth: how to find your booth via electoralsearch.eci.gov.in, booth slip (voter slip), Part number, Serial number in the voter roll
- EVM (Electronic Voting Machine): Control Unit, Ballot Unit, how votes are recorded, standalone (no internet), tamper resistance, counting procedures
- VVPAT (Voter Verified Paper Audit Trail): paper slip verification, 7-second display, random audit
- NOTA (None of the Above): last option on ballot, introduced by Supreme Court in 2013, symbolic protest vote, does NOT change the outcome
- ECI (Election Commission of India): autonomous constitutional body, Chief Election Commissioner, enforces MCC
- Model Code of Conduct (MCC): kicks in when election is announced, what it prohibits (new schemes, use of govt machinery), Silent Period (48 hours before polls)
- Constituency types: Lok Sabha (543 seats), Vidhan Sabha (state assemblies), Reserved constituencies (SC/ST)
- Postal ballot: for senior citizens 80+, disabled voters, essential services, NRIs (limited)
- cVIGIL app: report MCC violations with geo-tagged photo/video evidence
- Election phases: India often holds multi-phase elections for logistical reasons

Be neutral, factual, and encouraging of civic participation. Keep answers concise (under 250 words) unless a detailed explanation is clearly needed. Use plain paragraphs — no markdown asterisks or bullet characters unless listing distinct steps. Be warm, approachable, and educational.`,

  USA: `You are a helpful, accurate, and friendly Election Assistant specialising in United States elections.
Your role is to explain the US election process, voter rights, and democratic procedures in simple, clear language.

Key topics you know deeply:
- Voter registration: state-by-state rules, Motor Voter Act, same-day registration states, vote.gov, deadlines
- Electoral College: 538 electors, 270 majority to win presidency, winner-take-all vs. proportional states (Maine, Nebraska)
- Primary vs. General elections: open vs. closed primaries, caucuses (Iowa), Super Tuesday
- Polling: poll hours vary by state, photo ID laws vary by state, provisional ballots
- Mail-in / absentee voting: no-excuse states vs. excuse-required states, ballot tracking
- Election administration: run by states and counties, HAVA (Help America Vote Act), CISA cybersecurity oversight
- Federal offices: President (4yr), Senate (6yr, 2 per state), House (2yr, 435 seats)
- FEC (Federal Election Commission): campaign finance, PACs, Super PACs, Citizens United ruling
- Voting rights: Voting Rights Act 1965, 15th / 19th / 26th Amendments

Be neutral, factual, and encouraging of civic participation. Keep answers concise (under 250 words). Use plain paragraphs. Be warm and educational.`,

  UK: `You are a helpful, accurate, and friendly Election Assistant specialising in United Kingdom elections.
Your role is to explain the UK election process, voter rights, and democratic procedures in simple, clear language.

Key topics you know deeply:
- Voter registration: Individual Electoral Registration (IER), gov.uk/register-to-vote, deadline (12 working days before polling)
- First Past the Post (FPTP): candidate with most votes wins, no majority needed
- Constituencies: 650 parliamentary constituencies, each elects one MP
- General Elections: called by PM (max 5-year term), dissolution of Parliament, King's Speech
- Electoral Commission: independent body overseeing elections, registration, party finance
- Photo ID requirement: introduced 2023 — passport, driving licence, Blue Badge accepted
- Scottish Parliament, Welsh Senedd, Northern Ireland Assembly: use proportional representation (AMS / STV)

Be neutral, factual, and encouraging of civic participation. Keep answers concise (under 250 words). Use plain paragraphs. Be warm and educational.`,

  General: `You are a helpful, accurate, and friendly Election Assistant that provides general, country-agnostic explanations of democratic electoral processes.
Your role is to explain elections, voter rights, and democratic procedures in simple, clear language accessible to any citizen worldwide.

Key topics you cover:
- Voter registration: importance, typical requirements, online vs. in-person registration
- Election types: general, by-election, primary, runoff, referendum/plebiscite
- Voting systems: First Past the Post, Proportional Representation, Alternative Vote, STV
- Polling day: bringing ID, process at the polling station, secret ballot
- Counting: hand counting vs. electronic, party observers, certification of results
- Voter rights: right to vote in private, assistance if needed, provisional ballots, complaints process
- Democratic principles: free and fair elections, universal suffrage, peaceful transfer of power

Be neutral, factual, and encouraging of civic participation. Keep answers concise (under 250 words). Use plain paragraphs. Be warm, approachable, and educational.`,
};

/* ──────────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadEnvKeys();
  setupNavigation();
  setupChat();
  setupMap();
  setupMobileMenu();
  setupCountrySelector();
  setupHindiToggle();
  setWelcomeTime();
  initAuthUI();
  
  /* ── BUG 4: Auth modal shown after authReady in renderAuthUI, not here ── */
});

/* ──────────────────────────────────────────────────────
   ENV KEY LOADING — reads env.config at runtime.
   Keys are NEVER hardcoded in source.
────────────────────────────────────────────────────── */
async function loadEnvKeys() {
  try {
    const res = await fetch('env.config');
    if (!res.ok) throw new Error('env.config not found');
    const text = await res.text();
    const env  = parseEnvFile(text);

    if (env.GROQ_API_KEY && env.GROQ_API_KEY !== 'your_groq_api_key_here') {
      state.groqKey = env.GROQ_API_KEY;
    }
    if (env.MAPS_API_KEY && env.MAPS_API_KEY !== 'your_google_maps_api_key_here') {
      state.mapsKey = env.MAPS_API_KEY;
    }

    /* ── Firebase config assembled from env vars ── */
    const fbConfig = {
      apiKey:            env.FIREBASE_API_KEY,
      authDomain:        env.FIREBASE_AUTH_DOMAIN,
      projectId:         env.FIREBASE_PROJECT_ID,
      storageBucket:     env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
      appId:             env.FIREBASE_APP_ID,
    };

    const fbReady = fbConfig.apiKey && fbConfig.authDomain && fbConfig.projectId && fbConfig.appId;
    if (fbReady) {
      await initFirebase(fbConfig);
    } else {
      state.authReady = true;
      renderAuthUI();
    }

  } catch (_) {
    state.authReady = true;
    renderAuthUI();
  }
}

function parseEnvFile(text) {
  const env = {};
  text.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) env[key] = val;
  });
  return env;
}

/* ──────────────────────────────────────────────────────
   FIREBASE GOOGLE OAUTH
   Uses Firebase JS SDK v10 loaded from CDN dynamically.
   No bundler required — pure ESM dynamic import.
────────────────────────────────────────────────────── */
async function initFirebase(config) {
  try {
    const { initializeApp } = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
    );
    const {
      getAuth,
      GoogleAuthProvider,
      signInWithPopup,
      signOut,
      onAuthStateChanged,
      setPersistence,
      browserLocalPersistence,
    } = await import(
      'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js'
    );

    firebaseApp  = initializeApp(config);
    firebaseAuth = getAuth(firebaseApp);

    /* Persist session across page refreshes (localStorage) */
    await setPersistence(firebaseAuth, browserLocalPersistence);

    /* React to login/logout changes */
    onAuthStateChanged(firebaseAuth, (user) => {
      state.user      = user;
      state.authReady = true;
      renderAuthUI();
    });

    /* Expose sign-in handler */
    window._firebaseSignIn = async () => {
      if (!firebaseAuth) return;
      setAuthLoading(true);
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        await signInWithPopup(firebaseAuth, provider);
        showToast('Signed in successfully!', 'success', 3000);
      } catch (err) {
        showToast(friendlyAuthError(err.code), 'error', 4000);
        /* ── BUG 3: Show error in modal ── */
        const authErrorEl = document.getElementById('auth-error');
        if (authErrorEl) {
          authErrorEl.textContent = friendlyAuthError(err.code);
          authErrorEl.style.display = 'block';
          setTimeout(() => { authErrorEl.style.display = 'none'; }, 5000);
        }
      } finally {
        setAuthLoading(false);
      }
    };

    /* Expose sign-out handler */
    window._firebaseSignOut = async () => {
      if (!firebaseAuth) return;
      try {
        await signOut(firebaseAuth);
        showToast('Signed out', 'info', 2000);
      } catch (_) {
        showToast('Sign-out failed — please try again', 'error');
      }
    };

  } catch (err) {
    console.warn('Firebase init failed:', err.message);
    state.authReady = true;
    renderAuthUI();
  }
}

/**
 * Map Firebase error codes to friendly user-facing messages.
 * @param {string} code - Firebase error code
 * @returns {string}
 */
function friendlyAuthError(code) {
  const map = {
    'auth/popup-closed-by-user':    'Sign-in cancelled — the popup was closed.',
    'auth/popup-blocked':           'Popup was blocked — allow popups for this site and try again.',
    'auth/network-request-failed':  'Network error — check your connection and try again.',
    'auth/too-many-requests':       'Too many attempts — please wait a moment and try again.',
    'auth/user-disabled':           'This account has been disabled.',
    'auth/cancelled-popup-request': 'Another sign-in is already in progress.',
    'auth/unauthorized-domain':     'This domain is not authorised in Firebase — add it in the Firebase Console.',
  };
  return map[code] || `Sign-in failed (${code || 'unknown'}) — please try again.`;
}

/* ──────────────────────────────────────────────────────
   AUTH UI — wires up existing HTML elements only.
   NO dynamic injection — all elements are in index.html.
   Sign-in:  #btn-signin-header (existing HTML)
   Signed-in: #user-profile-wrap + #user-dropdown (existing HTML)
   Loading:  #auth-loading-header (added to HTML)
────────────────────────────────────────────────────── */
function initAuthUI() {

  /* ── Helpers ── */
  function triggerSignIn() {
    if (window._firebaseSignIn) {
      window._firebaseSignIn();
    } else {
      showToast('Add Firebase keys to env.config to enable Google Sign-In', 'error', 4500);
    }
  }

  function showAuthModal() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'flex';
  }
  function hideAuthModal() {
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  /* ── Header Sign-in button (single, existing HTML) ── */
  const headerSignInBtn = document.getElementById('btn-signin-header');
  if (headerSignInBtn) {
    headerSignInBtn.addEventListener('click', showAuthModal);
  }

  /* ── Modal buttons ── */
  const modalGoogleBtn = document.getElementById('btn-google-signin');
  if (modalGoogleBtn) {
    modalGoogleBtn.addEventListener('click', () => {
      hideAuthModal();
      triggerSignIn();
    });
  }

  const skipBtn = document.getElementById('auth-skip-btn');
  if (skipBtn) skipBtn.addEventListener('click', () => {
    hideAuthModal();
    sessionStorage.setItem('auth-modal-dismissed', '1');
  });

  const authOverlay = document.getElementById('auth-overlay');
  if (authOverlay) {
    authOverlay.addEventListener('click', (e) => {
      if (e.target === authOverlay) {
        hideAuthModal();
        sessionStorage.setItem('auth-modal-dismissed', '1');
      }
    });
  }

  /* ── User profile dropdown (existing HTML #user-profile-wrap) ── */
  const userProfileBtn = document.getElementById('user-profile-btn');
  const userDropdown   = document.getElementById('user-dropdown');

  if (userProfileBtn && userDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = userDropdown.classList.contains('open');
      userDropdown.classList.toggle('open', !isOpen);
      userProfileBtn.setAttribute('aria-expanded', String(!isOpen));
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#user-profile-wrap')) {
        userDropdown.classList.remove('open');
        userProfileBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        userDropdown.classList.remove('open');
        userProfileBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Sign-out buttons ── */
  const btnSignout     = document.getElementById('btn-signout');
  const sidebarSignout = document.getElementById('sidebar-signout-btn');

  if (btnSignout) {
    btnSignout.addEventListener('click', () => {
      if (userDropdown) userDropdown.classList.remove('open');
      if (window._firebaseSignOut) window._firebaseSignOut();
    });
  }
  if (sidebarSignout) {
    sidebarSignout.addEventListener('click', () => {
      if (window._firebaseSignOut) window._firebaseSignOut();
    });
  }
}

function openAuthDropdown() {
  const dropdown     = document.getElementById('user-dropdown');
  const profileBtn   = document.getElementById('user-profile-btn');
  if (dropdown)   dropdown.classList.add('open');
  if (profileBtn) profileBtn.setAttribute('aria-expanded', 'true');
}

function closeAuthDropdown() {
  const dropdown     = document.getElementById('user-dropdown');
  const profileBtn   = document.getElementById('user-profile-btn');
  if (dropdown)   dropdown.classList.remove('open');
  if (profileBtn) profileBtn.setAttribute('aria-expanded', 'false');
}

/* ── setAuthLoading: shows/hides header spinner while Firebase works ── */
function setAuthLoading(loading) {
  const loadingEl      = document.getElementById('auth-loading');
  const modalGoogleBtn = document.getElementById('btn-google-signin');
  const headerSignInBtn = document.getElementById('btn-signin-header');
  const userProfileWrap = document.getElementById('user-profile-wrap');

  if (loadingEl)       loadingEl.style.display      = loading ? 'flex' : 'none';
  if (modalGoogleBtn)  modalGoogleBtn.disabled       = loading;
  if (!loading) return; // visibility on sign-in/out handled by renderAuthUI
  // Hide both header auth elements while loading
  if (headerSignInBtn) headerSignInBtn.style.display = 'none';
  if (userProfileWrap) userProfileWrap.style.display = 'none';
}

/* ── renderAuthUI: called by onAuthStateChanged, updates header + sidebar ── */
function renderAuthUI() {
  if (!state.authReady) return;

  const loadingEl       = document.getElementById('auth-loading');
  const headerSignInBtn = document.getElementById('btn-signin-header');
  const userProfileWrap = document.getElementById('user-profile-wrap');
  const sidebarUser     = document.getElementById('sidebar-user');

  if (loadingEl) loadingEl.style.display = 'none';

  if (state.user) {
    const { displayName, email, photoURL } = state.user;

    const photoSrc = photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email || 'U')}&background=4d7bff&color=fff&size=64`;

    /* Header: hide sign-in, show profile */
    if (headerSignInBtn) headerSignInBtn.style.display = 'none';
    if (userProfileWrap) userProfileWrap.style.display = 'flex';

    /* Populate header profile button */
    const userAvatar     = document.getElementById('user-avatar');
    const userNameHeader = document.getElementById('user-name-header');
    if (userAvatar)     { userAvatar.src = photoSrc; userAvatar.alt = displayName || 'User'; }
    if (userNameHeader) userNameHeader.textContent = displayName ? displayName.split(' ')[0] : 'Account';

    /* Populate header dropdown */
    const userDropAvatar = document.getElementById('user-dropdown-avatar');
    const userDropName   = document.getElementById('user-dropdown-name');
    const userDropEmail  = document.getElementById('user-dropdown-email');
    if (userDropAvatar) { userDropAvatar.src = photoSrc; userDropAvatar.alt = displayName || ''; }
    if (userDropName)   userDropName.textContent  = displayName || 'Signed In';
    if (userDropEmail)  userDropEmail.textContent = email || '';

    /* Sidebar user */
    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    const sidebarName   = document.getElementById('sidebar-user-name');
    if (sidebarUser)   sidebarUser.style.display = 'flex';
    if (sidebarAvatar) { sidebarAvatar.src = photoSrc; sidebarAvatar.alt = displayName || ''; }
    if (sidebarName)   sidebarName.textContent = displayName ? displayName.split(' ')[0] : 'Signed in';

    /* Close the auth modal if it's still open */
    const overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.style.display = 'none';

  } else {
    /* Logged out — show sign-in button, hide profile */
    if (headerSignInBtn) headerSignInBtn.style.display = 'flex';
    if (userProfileWrap) { userProfileWrap.style.display = 'none'; closeAuthDropdown(); }
    if (sidebarUser)     sidebarUser.style.display = 'none';

    /* Show modal on first visit once auth state confirmed */
    if (!sessionStorage.getItem('auth-modal-dismissed')) {
      const overlay = document.getElementById('auth-overlay');
      if (overlay) overlay.style.display = 'flex';
    }
  }
}

/* ──────────────────────────────────────────────────────
   COUNTRY SELECTOR
────────────────────────────────────────────────────── */
function setupCountrySelector() {
  const sel = document.getElementById('country-select');
  if (!sel) return;
  sel.addEventListener('change', () => {
    state.country = sel.value;
    updateContextLabel();
    state.chatHistory = [];
    showToast(`Context switched to ${state.country}`, 'info', 2000);
  });
}

function updateContextLabel() {
  const lbl = document.getElementById('ctx-country-label');
  if (lbl) lbl.textContent = state.country;
}

/* ──────────────────────────────────────────────────────
   HINDI TOGGLE
────────────────────────────────────────────────────── */
function setupHindiToggle() {
  const btn   = document.getElementById('hindi-toggle');
  const badge = document.getElementById('hindi-badge');
  if (!btn) return;
  btn.addEventListener('click', () => {
    state.hindiMode = !state.hindiMode;
    btn.setAttribute('aria-pressed', String(state.hindiMode));
    btn.classList.toggle('active', state.hindiMode);
    if (badge) badge.style.display = state.hindiMode ? 'flex' : 'none';
    state.chatHistory = [];
    showToast(
      state.hindiMode
        ? 'हिंदी मोड सक्रिय — AI अब हिंदी में जवाब देगा'
        : 'Hindi mode off — responses in English',
      'info', 2500
    );
  });
}

/* ──────────────────────────────────────────────────────
   BUILD ACTIVE SYSTEM PROMPT
────────────────────────────────────────────────────── */
function buildSystemPrompt() {
  const base = SYSTEM_PROMPTS[state.country] || SYSTEM_PROMPTS.General;
  if (state.hindiMode) {
    return base + '\n\nIMPORTANT: The user has requested Hindi responses. Respond entirely in Hindi (Devanagari script). Use clear, simple Hindi that is accessible to ordinary citizens. Technical terms may be given in English in parentheses where helpful.';
  }
  return base;
}

/* ──────────────────────────────────────────────────────
   NAVIGATION
────────────────────────────────────────────────────── */
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      if (tabId) { switchTab(tabId); closeMobileMenu(); }
    });
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
  });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      switchTab('chat');
      setTimeout(() => { const i = document.getElementById('chat-input'); if (i) i.focus(); }, 150);
    }
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });
  const panel = document.getElementById(`panel-${tabId}`);
  const btn   = document.querySelector(`[data-tab="${tabId}"]`);
  if (panel) panel.classList.add('active');
  if (btn)   { btn.classList.add('active'); btn.setAttribute('aria-selected', 'true'); }
  state.activeTab = tabId;
  const ca = document.querySelector('.content-area');
  if (ca) ca.scrollTop = 0;
}

/* ──────────────────────────────────────────────────────
   MOBILE MENU
────────────────────────────────────────────────────── */
function setupMobileMenu() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('main-nav');
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.appendChild(overlay);
  if (menuBtn) menuBtn.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) { closeMobileMenu(); } else {
      sidebar.classList.add('open');
      overlay.classList.add('active');
      menuBtn.setAttribute('aria-expanded', 'true');
    }
  });
  overlay.addEventListener('click', closeMobileMenu);
}

function closeMobileMenu() {
  const sidebar = document.getElementById('main-nav');
  const overlay = document.querySelector('.sidebar-overlay');
  const menuBtn = document.getElementById('mobile-menu-btn');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
  if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
}

/* ──────────────────────────────────────────────────────
   CHAT SETUP
────────────────────────────────────────────────────── */
function setupChat() {
  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (input) {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
  }
}

function setWelcomeTime() {
  const el = document.getElementById('welcome-time');
  if (el) el.textContent = formatTime(new Date());
}

/* ──────────────────────────────────────────────────────
   CHAT MESSAGE BUILDERS
────────────────────────────────────────────────────── */
function addBotMessage(text, isLoading = false) {
  const box = document.getElementById('chat-messages');
  if (!box) return null;

  const wrapper = document.createElement('div');
  wrapper.className = 'msg msg-bot';
  wrapper.setAttribute('aria-label', isLoading ? 'AI is typing' : `AI: ${text}`);

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

  const content = document.createElement('div');
  content.className = 'msg-content';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  meta.innerHTML = `<span class="msg-sender">ElectionAI</span><span class="msg-time">${formatTime(new Date())}</span>`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (isLoading) {
    bubble.innerHTML = `<div class="typing-indicator" role="status" aria-label="AI is thinking"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>`;
  } else {
    renderTextToBubble(text, bubble);
  }

  content.appendChild(meta);
  content.appendChild(bubble);
  wrapper.appendChild(avatar);
  wrapper.appendChild(content);
  box.appendChild(wrapper);
  scrollChat(box);
  return { wrapper, bubble, content };
}

function addShareButton(content, text) {
  const actions = document.createElement('div');
  actions.className = 'msg-actions';

  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn-msg-share';
  shareBtn.setAttribute('aria-label', 'Share this answer via WhatsApp');
  shareBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Share`;
  shareBtn.addEventListener('click', () => shareText(text));

  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-msg-share';
  copyBtn.setAttribute('aria-label', 'Copy this answer');
  copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Copied to clipboard', 'success', 2000))
      .catch(() => showToast('Could not copy — try selecting manually', 'error'));
  });

  actions.appendChild(shareBtn);
  actions.appendChild(copyBtn);
  content.appendChild(actions);
}

function addUserMessage(text) {
  const box = document.getElementById('chat-messages');
  if (!box) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'msg msg-user';
  wrapper.setAttribute('aria-label', `You: ${text}`);

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  /* Show Google profile photo if signed in */
  if (state.user && state.user.photoURL) {
    avatar.innerHTML = `<img src="${state.user.photoURL}" alt="" width="28" height="28" style="border-radius:50%;object-fit:cover;" />`;
  } else {
    avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }

  const content = document.createElement('div');
  content.className = 'msg-content';

  const meta = document.createElement('div');
  meta.className = 'msg-meta';
  const senderName = state.user ? (state.user.displayName || 'You') : 'You';
  meta.innerHTML = `<span class="msg-sender">${senderName}</span><span class="msg-time">${formatTime(new Date())}</span>`;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  content.appendChild(meta);
  content.appendChild(bubble);
  wrapper.appendChild(avatar);
  wrapper.appendChild(content);
  box.appendChild(wrapper);
  scrollChat(box);
}

function renderTextToBubble(text, bubble) {
  bubble.innerHTML = '';
  const paras = text.split(/\n\n+/);
  paras.forEach(para => {
    const trimmed = para.trim();
    if (!trimmed) return;
    const p = document.createElement('p');
    p.textContent = trimmed;
    bubble.appendChild(p);
  });
  if (!bubble.children.length) {
    const p = document.createElement('p');
    p.textContent = text;
    bubble.appendChild(p);
  }
}

function scrollChat(box) {
  requestAnimationFrame(() => { box.scrollTop = box.scrollHeight; });
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ──────────────────────────────────────────────────────
   QUICK ASK
────────────────────────────────────────────────────── */
function quickAsk(text) {
  if (state.activeTab !== 'chat') switchTab('chat');
  const input = document.getElementById('chat-input');
  if (input) { input.value = text; input.dispatchEvent(new Event('input')); }
  sendMessage();
}

/* ──────────────────────────────────────────────────────
   GROQ API — STREAMING SEND
────────────────────────────────────────────────────── */
async function sendMessage() {
  if (state.isSending) return;

  const input   = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');
  const userText = input ? input.value.trim() : '';

  if (!userText) {
    showToast('Please enter a question first', 'error', 2000);
    return;
  }

  if (!state.groqKey) {
    addUserMessage(userText);
    addBotMessage(
      'The Groq API key is not configured. Please add your GROQ_API_KEY to the env.config file and reload.\n\n' +
      'Get a free key at console.groq.com\n\n' +
      'In the meantime, check the Quick FAQ tab for pre-written answers to common election questions!'
    );
    if (input) input.value = '';
    return;
  }

  state.isSending = true;
  if (sendBtn) sendBtn.disabled = true;
  if (input)   { input.value = ''; input.style.height = 'auto'; }

  addUserMessage(userText);
  state.chatHistory.push({ role: 'user', content: userText });

  const loadingEl = addBotMessage('', true);
  const box = document.getElementById('chat-messages');

  try {
    const messages = [
      { role: 'user',      content: buildSystemPrompt() + '\n\n[CONVERSATION START]' },
      { role: 'assistant', content: 'Hello! I\'m your Election Assistant. What would you like to know?' },
      ...state.chatHistory.slice(-14),
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.groqKey}` },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages,
        max_tokens:  700,
        temperature: 0.65,
        stream:      true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error?.message || `HTTP ${response.status} — check your Groq API key`);
    }

    let fullReply = '';
    let streamBubbleReady = false;
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (!delta) continue;
          fullReply += delta;
          if (!streamBubbleReady && loadingEl) { loadingEl.bubble.innerHTML = ''; streamBubbleReady = true; }
          if (loadingEl) { renderTextToBubble(fullReply, loadingEl.bubble); scrollChat(box); }
        } catch (_) { /* malformed SSE line */ }
      }
    }

    const reply = fullReply.trim() || 'Sorry, I could not generate a response. Please try again.';
    state.chatHistory.push({ role: 'assistant', content: reply });

    if (loadingEl) {
      renderTextToBubble(reply, loadingEl.bubble);
      loadingEl.wrapper.setAttribute('aria-label', `AI: ${reply}`);
      addShareButton(loadingEl.content, reply);
      scrollChat(box);
    }

  } catch (err) {
    state.chatHistory.pop();
    if (loadingEl) {
      loadingEl.bubble.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = 'Error: ' + err.message;
      loadingEl.bubble.appendChild(p);
    }
    showToast(err.message.slice(0, 80), 'error');
  } finally {
    state.isSending = false;
    if (sendBtn) sendBtn.disabled = false;
    if (input)   input.focus();
  }
}

/* ──────────────────────────────────────────────────────
   WHATSAPP SHARE
────────────────────────────────────────────────────── */
function shareAnswer(btn) { shareText(btn.dataset.text || ''); }

function shareText(text) {
  const formatted = text + '\n\n— Shared from ElectionAI (Hack2Skill PromptWars)';
  try {
    window.open('https://wa.me/?text=' + encodeURIComponent(formatted), '_blank', 'noopener,noreferrer');
    showToast('Opening WhatsApp to share', 'success', 2000);
  } catch (_) {
    navigator.clipboard.writeText(formatted)
      .then(() => showToast('Copied to clipboard — paste in WhatsApp', 'info', 3000))
      .catch(() => showToast('Could not open WhatsApp or copy', 'error'));
  }
}

/* ──────────────────────────────────────────────────────
   GOOGLE MAPS
────────────────────────────────────────────────────── */
function setupMap() {
  const searchBtn = document.getElementById('map-search-btn');
  const mapInput  = document.getElementById('map-input');
  const clearBtn  = document.getElementById('map-clear');
  const pills     = document.querySelectorAll('.map-pill');

  if (searchBtn) searchBtn.addEventListener('click', searchMap);
  if (mapInput) {
    mapInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchMap(); });
    mapInput.addEventListener('input', () => {
      if (clearBtn) clearBtn.style.display = mapInput.value ? 'flex' : 'none';
    });
  }
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (mapInput) mapInput.value = '';
    clearBtn.style.display = 'none';
    mapInput.focus();
  });
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => { p.classList.remove('active'); p.setAttribute('aria-pressed', 'false'); });
      pill.classList.add('active');
      pill.setAttribute('aria-pressed', 'true');
      state.mapType = pill.dataset.type || 'booth';
    });
  });
}

function buildMapQuery(loc) {
  return {
    booth:  `polling booth voting centre ${loc}`,
    office: `election commission office ${loc}`,
    both:   `polling booth election commission office ${loc}`,
  }[state.mapType] || `polling booth ${loc}`;
}

function searchMap() {
  const mapInput = document.getElementById('map-input');
  const loc = mapInput ? mapInput.value.trim() : '';
  if (!loc) { showToast('Please enter a city name or pincode', 'error'); mapInput?.focus(); return; }
  const query = buildMapQuery(loc);
  if (state.mapsKey) { showEmbedMap(query); } else { showMapFallback(loc, query); }
}

function showEmbedMap(query) {
  const frame       = document.getElementById('map-frame');
  const placeholder = document.getElementById('map-placeholder');
  const loading     = document.getElementById('map-loading');
  const fallbar     = document.getElementById('map-fallback-bar');
  if (loading)     loading.style.display     = 'flex';
  if (placeholder) placeholder.style.display = 'none';
  if (fallbar)     fallbar.style.display     = 'none';
  const src = `https://www.google.com/maps/embed/v1/search?key=${state.mapsKey}&q=${encodeURIComponent(query)}&zoom=13`;
  if (frame) { frame.onload = () => { if (loading) loading.style.display = 'none'; }; frame.src = src; frame.style.display = 'block'; }
}

function showMapFallback(loc, query) {
  const fallbar  = document.getElementById('map-fallback-bar');
  const fallLink = document.getElementById('map-fallback-link');
  const frame    = document.getElementById('map-frame');
  const mapsUrl  = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  if (fallLink) fallLink.href = mapsUrl;
  if (fallbar)  fallbar.style.display = 'flex';
  if (frame)    frame.style.display   = 'none';
  window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  showToast(`Opening Google Maps for "${loc}"`, 'info');
}

function fillAndSearch(city) {
  const input = document.getElementById('map-input');
  const clear = document.getElementById('map-clear');
  if (input) { input.value = city; if (clear) clear.style.display = 'flex'; }
  searchMap();
}

/* ──────────────────────────────────────────────────────
   TOAST NOTIFICATIONS
────────────────────────────────────────────────────── */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ──────────────────────────────────────────────────────
   EXPOSE GLOBALS (called from inline HTML onclick)
────────────────────────────────────────────────────── */
window.switchTab     = switchTab;
window.quickAsk      = quickAsk;
window.sendMessage   = sendMessage;
window.searchMap     = searchMap;
window.fillAndSearch = fillAndSearch;
window.shareAnswer   = shareAnswer;
window.shareText     = shareText;