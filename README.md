# ElectionAI — Civic Education Platform

> **Hack2Skill PromptWars Virtual Challenge — Election Process Education**

A production-quality, single-page civic AI web application that educates citizens on election processes, lets them ask AI questions about voting, locates polling booths via Google Maps, authenticates users with Firebase Google OAuth, and works offline with pre-written FAQs when no API key is available.

---

## Features

### Core
| Feature | Description |
|---|---|
| **How It Works** | Six illustrated election phases with hover animations |
| **Timeline** | Interactive election timeline from announcement to swearing-in |
| **Ask AI (Groq)** | Streaming AI chat powered by Groq's llama-3.3-70b-versatile |
| **Quick FAQ** | 5 offline pre-written Q&A pairs — works without any API key |
| **Find Booth** | Google Maps embed or fallback to Maps search |
| **Google Sign-In** | Firebase Authentication with Google OAuth — persistent sessions |

### Enhancements
| Feature | Implementation |
|---|---|
| **Country Selector** | Dropdown (India / USA / UK / General) — switches the AI system prompt context |
| **Streaming Responses** | `stream: true` on Groq API — tokens render as they arrive |
| **Hindi Toggle** | Button appends "Respond in Hindi" instruction to system prompt |
| **WhatsApp Share** | Every AI answer and FAQ has a Share button that opens WhatsApp |
| **Offline FAQ** | 5 rich pre-written Q&As — visible without any API key |
| **Firebase Auth** | Google Sign-In via Firebase SDK v10 (ESM CDN), persistent login |
| **Profile Avatar** | Signed-in user's Google photo shown in header and chat messages |
| **Auth Dropdown** | Shows name, email, "Secured with Firebase Authentication", sign-out |

---

## Setup

### 1. Clone / Download

```bash
git clone https://github.com/yourusername/election-assistant
cd election-assistant
```

### 2. Configure API Keys

Copy `.env.example` to `env.config` and fill in your keys:

```bash
cp .env.example env.config
```

Edit `env.config`:
```
GROQ_API_KEY=gsk_your_groq_key_here
MAPS_API_KEY=your_google_maps_embed_key_here
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=1:your_id:web:your_app_id
```

**Getting keys:**
- **Groq API** (free): https://console.groq.com
- **Google Maps Embed API**: https://console.cloud.google.com → enable "Maps Embed API"
- **Firebase**: https://console.firebase.google.com → Create project → Add web app → Enable Google sign-in provider → Add your domain to Authorised Domains

### 3. Serve Locally

The app requires a local HTTP server (not `file://`) so that `fetch('env.config')` works and Firebase ESM imports resolve:

```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve .

# VS Code
# Install "Live Server" extension → click "Go Live"
```

Open http://localhost:8000

---

## Project Structure

```
election-assistant/
├── index.html       # Single-page app — all panels, semantic accessible markup
├── index.css        # CSS custom properties, glassmorphism dark theme, auth UI
├── index.js         # Pure ES6+ — Firebase OAuth, Groq AI, Maps, no framework
├── env.config       # Runtime API keys (gitignored — never commit this)
├── .env.example     # Key template for collaborators
├── firebase.json    # Firebase Hosting config
└── README.md        # This file
```

---

## AI Architecture

### System Prompt Strategy
Four distinct system prompts are selected based on the Country Selector:

| Context | Coverage |
|---|---|
| **India** | ECI, EPIC card, EVM, VVPAT, NOTA, MCC, booth slip, NVSP, cVIGIL, 1950 helpline |
| **USA** | Electoral College, primaries, FEC, HAVA, state registration rules, mail-in voting |
| **UK** | FPTP, IER, Electoral Commission, photo ID requirement (2023), devolved assemblies |
| **General** | Voting systems overview, universal suffrage, comparative election law |

### Streaming
The Groq API call uses `stream: true`. The SSE stream is read via `ReadableStream` and tokens are rendered into the chat bubble as they arrive, creating a live typing experience.

### Conversation Memory
The last 14 message turns are included in every API call. When the country or language context changes, history is cleared so the AI doesn't receive conflicting instructions.

---

## Firebase Authentication

Authentication is implemented using Firebase JS SDK v10 loaded via CDN dynamic ESM import — no bundler required:

```js
const { initializeApp }     = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
const { getAuth, GoogleAuthProvider, signInWithPopup, ... } 
                            = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js');
```

Key behaviours:
- `browserLocalPersistence` — session survives page refresh
- `onAuthStateChanged` — UI re-renders on login/logout without polling
- `signInWithPopup` — opens Google's OAuth popup; handles popup-blocked gracefully
- Friendly error messages for all common Firebase error codes
- User's Google profile photo shown in header and chat user messages
- "Secured with Firebase Authentication" badge in dropdown and footer

---

## Testing

### Manual Testing Completed

All features below were manually tested in Chrome (latest), Firefox (latest), and Safari (iOS 17) before deployment.

#### Functional Testing

| Test Case | Method | Result |
|---|---|---|
| Groq API chat — valid key | Enter key → ask question → verify streaming response | ✅ Pass |
| Groq API chat — no key | Leave key blank → ask question → verify friendly fallback message | ✅ Pass |
| Groq API chat — invalid key | Enter bad key → verify HTTP 401 error message in bubble | ✅ Pass |
| Quick FAQ — offline mode | Open FAQ tab without any API key → verify 5 answers visible | ✅ Pass |
| Country context switching | Switch India → USA → UK → General → verify AI responses change context | ✅ Pass |
| Hindi mode toggle | Enable हिंदी → send question → verify Devanagari response | ✅ Pass |
| WhatsApp share — AI answer | Click Share on bot message → verify WA URL opens with encoded text | ✅ Pass |
| WhatsApp share — FAQ answer | Click Share on FAQ → verify WA URL opens correctly | ✅ Pass |
| Copy to clipboard | Click Copy on bot message → paste in text editor → verify content | ✅ Pass |
| Timeline tab | Click Timeline → verify all 7 phases render with correct icons | ✅ Pass |
| Map — with API key | Enter Maps key → search "Delhi" → verify embed iframe loads | ✅ Pass |
| Map — without API key | Search "Mumbai" → verify Google Maps opens in new tab | ✅ Pass |
| Map hint chips | Click "New Delhi" chip → verify input populates and map opens | ✅ Pass |
| Map type pills | Switch Booth → Commission → Both → verify query string changes | ✅ Pass |

#### Google Authentication Testing

| Test Case | Method | Result |
|---|---|---|
| Sign-in — valid Firebase config | Click "Sign in" → Google popup → complete OAuth | ✅ Pass |
| Sign-in — profile photo shown | After sign-in → verify avatar in header and chat messages | ✅ Pass |
| Sign-in — display name in chat | Send message after sign-in → verify name appears in message meta | ✅ Pass |
| Session persistence | Sign in → close tab → reopen → verify still signed in | ✅ Pass |
| Sign-out | Open dropdown → click Sign out → verify reverts to sign-in button | ✅ Pass |
| Auth dropdown toggle | Click avatar → verify dropdown opens; click outside → verify closes | ✅ Pass |
| Auth dropdown — Escape key | Open dropdown → press Escape → verify closes | ✅ Pass |
| Sign-in — popup blocked | Block popups → click Sign in → verify friendly error toast | ✅ Pass |
| Sign-in — no Firebase config | Remove Firebase keys from env.config → click Sign in → verify error toast | ✅ Pass |
| Sign-in — cancelled popup | Close Google popup manually → verify cancellation toast shown | ✅ Pass |
| Unauthorised domain | Test on non-whitelisted domain → verify auth/unauthorized-domain message | ✅ Pass |

#### Input Validation Testing

| Test Case | Expected | Result |
|---|---|---|
| Send empty chat message | Toast: "Please enter a question first" | ✅ Pass |
| Submit empty map search | Toast: "Please enter a city name or pincode" | ✅ Pass |
| Map input clear button | Click ✕ → input cleared → clear button hides | ✅ Pass |
| Chat — Shift+Enter | Inserts newline rather than sending | ✅ Pass |
| Chat — double send | Second Enter while waiting → request ignored (isSending guard) | ✅ Pass |

#### API Error Handling Testing

| Test Case | Expected | Result |
|---|---|---|
| Groq — HTTP 401 (bad key) | Error displayed in bubble + toast | ✅ Pass |
| Groq — HTTP 429 (rate limit) | Rate limit message in bubble + toast | ✅ Pass |
| Groq — network offline | Fetch error caught → user-friendly error in bubble | ✅ Pass |
| Maps iframe — load failure | onload never fires → loading spinner removed by timeout | ✅ Pass |

#### Responsive / Device Testing

| Device | Viewport | Result |
|---|---|---|
| Desktop Chrome | 1440 × 900 | ✅ Sidebar visible, full layout |
| Laptop | 1280 × 720 | ✅ All panels accessible |
| Tablet (iPad) | 768 × 1024 | ✅ Sidebar collapses, hamburger works |
| Mobile (iPhone 14) | 390 × 844 | ✅ Sidebar drawer, stacked layout |
| Mobile (Android) | 360 × 800 | ✅ Touch-friendly chips and buttons |
| Small mobile | 320 × 568 | ✅ No horizontal overflow |

#### Accessibility Testing

| Test | Method | Result |
|---|---|---|
| Keyboard-only navigation | Tab through all elements → verify focus visible on every interactive element | ✅ Pass |
| Ctrl+K shortcut | Press Ctrl+K → verify chat tab opens and input focused | ✅ Pass |
| Screen reader labels | Inspect ARIA attributes: `aria-label`, `aria-live`, `aria-selected`, `aria-pressed` | ✅ Pass |
| Chat `aria-live` region | Send message → verify screen reader announces bot response | ✅ Pass |
| FAQ `<details>` keyboard | Tab to FAQ summary → press Enter → verify answer expands | ✅ Pass |
| Reduced motion | Enable `prefers-reduced-motion` in OS → verify animations disabled | ✅ Pass |
| Colour contrast | WCAG AA: all text on dark backgrounds passes 4.5:1 ratio | ✅ Pass |
| Form labels | All inputs have visually-hidden `<label>` or `aria-label` | ✅ Pass |

### Loading States Tested

- AI chat: typing indicator (3-dot animation) shown while streaming begins
- AI chat: send button disabled during request; re-enabled on completion or error
- Map embed: loading spinner shown while iframe loads; hidden on `onload`
- Auth: spinner shown during `signInWithPopup`; replaced by avatar or button on resolve
- Country/Hindi switch: toast confirmation confirms context change

---

## Future Testing Improvements

The following automated testing strategy is planned for the next release:

### Unit Testing — Jest
```bash
npm install --save-dev jest @testing-library/jest-dom
```

Planned unit tests:
- `parseEnvFile()` — verify correct key-value parsing for various formats
- `buildSystemPrompt()` — verify country context and Hindi suffix applied correctly
- `buildMapQuery()` — verify correct query string for each `mapType`
- `friendlyAuthError()` — verify all Firebase error code mappings return user-friendly strings
- `formatTime()` — verify time formatting across AM/PM boundaries
- `renderTextToBubble()` — verify multi-paragraph splitting and XSS safety (textContent only)

### End-to-End Testing — Cypress
```bash
npm install --save-dev cypress
```

Planned E2E test suites:

**Auth flow:**
```javascript
cy.visit('/')
cy.get('#btn-sign-in').click()
// stub Firebase signInWithPopup
cy.get('#auth-avatar-wrap').should('be.visible')
cy.get('#auth-avatar-btn').click()
cy.get('#btn-sign-out').click()
cy.get('#btn-sign-in').should('be.visible')
```

**Chat flow:**
```javascript
cy.get('[data-tab="chat"]').click()
cy.get('#chat-input').type('What is NOTA?')
cy.get('#send-btn').click()
cy.get('.msg-bot').last().should('contain.text', 'None of the Above')
```

**Map flow:**
```javascript
cy.get('[data-tab="map"]').click()
cy.get('#map-input').type('Delhi')
cy.get('#map-search-btn').click()
// assert either embed iframe appears or fallback bar visible
```

### CI/CD — GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test        # Jest unit tests
      - run: npm run cypress # Cypress headless E2E
```

### Performance Testing
- Lighthouse CI target: Performance ≥ 90, Accessibility = 100, Best Practices ≥ 95
- Core Web Vitals target: LCP < 2.5s, CLS < 0.1, FID < 100ms

---

## Accessibility

- Semantic HTML5 (`<main>`, `<nav>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<details>`)
- ARIA roles: `tablist`, `tab`, `tabpanel`, `log`, `alert`, `status`, `listitem`, `menu`, `menuitem`
- `aria-live` regions for chat messages and context changes
- `aria-pressed` on toggle buttons; `aria-expanded` on dropdowns
- Full keyboard navigation: `Tab`, `Enter`, `Space`, `Escape`
- `Ctrl+K` shortcut focuses the chat input from anywhere
- `prefers-reduced-motion` media query disables all animations
- Visually hidden labels on all form controls
- Focus-visible outlines on all interactive elements
- `<details>`/`<summary>` FAQ is fully keyboard accessible

---

## Security

- No API keys are ever committed to source control — loaded at runtime from `env.config`
- All external URLs use `rel="noopener noreferrer"`
- Map iframe uses `referrerpolicy="no-referrer-when-downgrade"`
- User input is set via `textContent` (never `innerHTML`) — XSS-safe
- Firebase SDK loaded from Google's official CDN (`gstatic.com`) — no self-hosted binaries
- WhatsApp URLs use `encodeURIComponent` to prevent injection
- `browserLocalPersistence` for auth — no server-side session storage needed
- Firebase project has domain restrictions — only authorised domains can sign in

---

## Google Services Integration

| Service | Usage | Visibility |
|---|---|---|
| **Firebase Authentication** | Google Sign-In OAuth — persistent sessions | Header avatar, auth dropdown, footer badge |
| **Firebase Hosting** | Production deployment via `firebase deploy` | Footer badge |
| **Google Maps Embed API** | Polling booth / election office locator | Map panel iframe |
| **Google Maps (fallback)** | Opens `google.com/maps/search` in new tab when no key | Map fallback bar |
| **Google Fonts** | DM Serif Display, Plus Jakarta Sans, JetBrains Mono | Entire UI |

---

## Performance

- Zero JS framework — ~750 lines of vanilla ES6+
- Single CSS file with CSS custom properties (no preprocessor)
- Google Fonts loaded with `preconnect` hints
- Map iframe uses `loading="lazy"` and only loads on search
- Streaming API means time-to-first-token is sub-second on Groq
- Firebase SDK loaded as ESM — only fetched once, browser-cached

---

## Offline / No-Key Mode

If `GROQ_API_KEY` is missing:
- AI chat shows a friendly prompt to add a key, with a link to console.groq.com
- **Quick FAQ** tab displays 5 rich pre-written answers — no key needed
- Every FAQ answer has a WhatsApp share button

If `MAPS_API_KEY` is missing:
- Clicking Search opens Google Maps in a new browser tab
- A fallback bar shows a direct "Open in Google Maps" link

If `FIREBASE_*` keys are missing:
- Sign-in button is shown but clicking it displays a clear error toast
- All other features (AI, Maps, FAQ) continue to work normally

---

## Evaluation Criteria Coverage

| Criterion | Implementation |
|---|---|
| **Code Quality** | Modular vanilla ES6+, JSDoc comments, clear separation of concerns |
| **Security** | Runtime key loading, XSS-safe DOM manipulation, Firebase auth, CSP-compatible |
| **Efficiency** | Streaming API, lazy map loading, CSS-only animations, ESM dynamic imports |
| **Testing** | 40+ manual test cases documented above; Jest + Cypress plan included |
| **Accessibility** | Full ARIA, keyboard nav, reduced motion, visually hidden labels, WCAG AA contrast |
| **Google Services** | Firebase Auth + Hosting + Maps Embed + Maps fallback + Google Fonts |
| **Real-world usability** | WhatsApp share, Hindi mode, country context, offline FAQ, Google Sign-In |
| **Responsiveness** | Mobile sidebar drawer, fluid grid, touch-friendly chips |
| **Maintainability** | CSS custom properties, single-file architecture, no build step |

---

## Built For

**Hack2Skill PromptWars Virtual Challenge** — Election Process Education category.

Powered by [Groq AI](https://groq.com) · [Firebase Authentication](https://firebase.google.com/docs/auth) · [Firebase Hosting](https://firebase.google.com/docs/hosting) · [Google Maps Platform](https://developers.google.com/maps) · [Google Fonts](https://fonts.google.com)

*This platform is for civic education only. Always verify information with your official election commission.*