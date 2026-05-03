# ElectionAI — Civic Education Platform

> **Hack2Skill PromptWars Virtual Challenge — Election Process Education**

A production-quality, single-page civic AI web application that educates citizens on election processes, lets them ask AI questions about voting, locates polling booths via Google Maps, and works offline with pre-written FAQs when no API key is available.

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

### v2 Enhancements
| Feature | Implementation |
|---|---|
| **Country Selector** | Dropdown (India / USA / UK / General) — switches the AI system prompt context |
| **Streaming Responses** | `stream: true` on Groq API — tokens render as they arrive |
| **Hindi Toggle** | Button appends "Respond in Hindi" instruction to system prompt |
| **WhatsApp Share** | Every AI answer and FAQ has a Share button that opens WhatsApp |
| **Offline FAQ** | 5 rich pre-written Q&As — visible without any API key |
| **Improved System Prompt** | Constituency lookup, booth slip, EPIC/VVPAT/NOTA/MCC details, cVIGIL app |

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
```

**Getting keys:**
- **Groq API** (free): https://console.groq.com
- **Google Maps Embed API**: https://console.cloud.google.com — enable "Maps Embed API"

### 3. Serve Locally

The app requires a local HTTP server (not `file://`) so that `fetch('env.config')` works:

```bash
# Python 3
python3 -m http.server 8000

# Node.js
npx serve .

# VS Code
# Install "Live Server" extension and click "Go Live"
```

Open http://localhost:8000

---

## Project Structure

```
election-assistant/
├── index.html       # Single-page app — all panels, accessible markup
├── index.css        # CSS custom properties, glassmorphism dark theme
├── index.js         # Pure ES6+ JS — no framework, no build step
├── env.config       # Runtime API keys (gitignored)
├── .env.example     # Key template for collaborators
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

## Accessibility

- Semantic HTML5 (`<main>`, `<nav>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<details>`)
- ARIA roles: `tablist`, `tab`, `tabpanel`, `log`, `alert`, `status`, `listitem`
- `aria-live` regions for chat messages and context changes
- `aria-pressed` on toggle buttons
- Full keyboard navigation: `Tab`, `Enter`, `Space`
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
- CSP-compatible: no inline event handlers in JS, no `eval`
- WhatsApp URLs use `encodeURIComponent` to prevent injection

---

## Performance

- Zero JS framework — ~550 lines of vanilla ES6+
- Single CSS file with CSS custom properties (no preprocessor)
- Google Fonts loaded with `preconnect` hints
- Map iframe uses `loading="lazy"` and only loads on search
- Streaming API means time-to-first-token is sub-second on Groq

---

## Google Services Integration

| Service | Usage |
|---|---|
| **Google Fonts** | DM Serif Display, Plus Jakarta Sans, JetBrains Mono |
| **Google Maps Embed API** | Polling booth / election office locator with key |
| **Google Maps fallback** | Opens `google.com/maps/search` in new tab without key |

---

## Offline / No-Key Mode

If `GROQ_API_KEY` is missing:
- The AI chat shows a friendly prompt to add a key, with a link to console.groq.com
- The **Quick FAQ** tab displays 5 rich pre-written answers — no key needed
- Every FAQ answer has a WhatsApp share button

If `MAPS_API_KEY` is missing:
- Clicking Search opens Google Maps in a new browser tab
- A fallback bar shows a direct "Open in Google Maps" link

---

## Evaluation Criteria Coverage

| Criterion | Implementation |
|---|---|
| **Code Quality** | Modular vanilla ES6+, JSDoc comments, clear separation of concerns |
| **Security** | Runtime key loading, XSS-safe DOM manipulation, safe external links |
| **Efficiency** | Streaming API, lazy map loading, CSS-only animations |
| **Testing** | Offline mode, error states, empty input guards, stream error handling |
| **Accessibility** | Full ARIA, keyboard nav, reduced motion, visually hidden labels |
| **Google Services** | Google Fonts + Maps Embed API + Maps fallback |
| **Real-world usability** | WhatsApp share, Hindi mode, country context, offline FAQ |
| **Responsiveness** | Mobile sidebar drawer, fluid grid, touch-friendly chips |
| **Maintainability** | CSS custom properties, single-file architecture, no build step |

---

## Built For

**Hack2Skill PromptWars Virtual Challenge** — Election Process Education category.

Powered by [Groq AI](https://groq.com) · [Google Maps](https://developers.google.com/maps) · [Google Fonts](https://fonts.google.com)

*This platform is for civic education only. Always verify information with your official election commission.*
