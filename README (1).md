# TradeMatrix Pro — Project Structure Guide

## Folder Structure

```
TradeMatrix/
│
├── index.html              ← Main entry point (clean HTML, no inline CSS/JS)
│
├── css/
│   ├── style.css           ← Core variables, reset, component styles
│   ├── dashboard.css       ← Auth, admin, demo mode, landing page, payment
│   └── responsive.css      ← Breakpoints and layout overrides
│
├── js/
│   ├── app.js              ← State, splash, PIN, tabs, init (LOAD FIRST)
│   ├── auth.js             ← Login, signup, sessions, landing page, payment
│   ├── admin.js            ← Admin panel, user management, demo mode
│   ├── analytics.js        ← Charts, trade data, AI engine, strategy tester
│   └── ui.js               ← Search, notifications, shortcuts, command palette
│
└── assets/
    ├── images/             ← App images (logo, screenshots)
    └── icons/              ← Icons and favicons
```

---

## File Descriptions

### `index.html`
Clean HTML-only file. No inline CSS or JavaScript. Links to all external files.
Contains: Splash, PIN screen, App panels (dashboard/journal/analytics/etc.),
Modals, Landing page, Payment page, Auth system, Admin panel.

### `css/style.css`
Core styles used throughout the entire app:
- CSS custom properties (`:root` variables — colors, fonts, spacing)
- Base reset (`*`, `html`, `body`)
- Splash screen, PIN screen, App layout
- Topbar, tab navigation, content panels
- Cards, grids, stat cards, buttons, forms
- Trade list, charts, tags, tooltips, modals
- Analytics-specific UI elements

### `css/dashboard.css`
Feature-specific overlay styles:
- Auth system (login, signup, pending, rejected)
- Admin panel (user cards, stats grid)
- Demo mode banner, watermark, lock overlays
- Landing page (hero, features, pricing, testimonials)
- Payment page and payment success screen

### `css/responsive.css`
Dedicated breakpoints for narrow/mobile viewports:
- Topbar collapse behavior
- Panel padding adjustments
- Chat/mentor layout
- Landing page mobile adaptations

---

### `js/app.js` ← LOAD FIRST
**Core state and navigation.** Must be loaded before all other JS files.
- Global state variables (`PIN`, `riskConfig`, `accounts`, `trades`, etc.)
- Splash screen animation (`runSplash`)
- PIN lock/unlock (`pp`, `pd`, `checkPin`, `lockApp`)
- Auto-lock timer
- Tab routing (`showTab`, `showSub`)
- Pre-trading checklist (`buildChecklist`)
- Modal helpers (`openMo`, `closeMo`)
- Toast notification (`showToast`)
- App initialization (`initApp`)

### `js/auth.js` ← LOAD SECOND
**Authentication and user flow.**
- User storage (`getUsers`, `saveUsers`, `getCurrentUser`, `setCurrentUser`)
- Admin session management (`isAdminSession`, `setAdminSession`)
- Login/logout/signup (`doLogin`, `doLogout`, `doSignup`)
- PIN auth screen flow (`afterSplash`, `showAuthPage`)
- Landing page (`showLandingPage`, `lpScrollTo`)
- Payment page (`showPaymentPage`, `submitPayment`, `startPaymentCountdown`)
- Auth override patches (integrates landing page into login flow)

### `js/admin.js` ← LOAD THIRD
**Admin panel and user management.**
- Admin authentication (`showAdminLogin`, `doAdminLogin`)
- Admin panel navigation (`showAdminPanel`, `showAdminTab`)
- User rendering (`refreshAdminPanel`, `renderAdminUsers`)
- User actions (`adminApproveUser`, `adminRejectUser`, `adminDeleteUser`)
- Subscription activation (`adminActivateSubscription`)
- Demo mode (`enterDemoMode`, `exitDemoMode`)
- Upgrade modal (`showUpgradeModal`)

### `js/analytics.js` ← LOAD FOURTH
**All trading data, analysis, and feature modules.** The largest file.
- Core stats engine (`calcStats`, `fmt$`, `fmtNum`)
- Chart rendering (`drawEquity`, `drawRadar`, `buildSessionBars`)
- Dashboard refresh (`refreshDashboard`, `buildRecentTrades`)
- Trade journal (`saveTrade`, `buildTradeLog`, `openTradeDetail`, `editTrade`)
- Export/import (`exportCSV`, `exportJSON`, `importData`)
- Analytics module (`refreshAnalytics`, `buildPairMatrix`, `runMonteCarlo`)
- AI engine (`refreshAI`, `generateInsights`)
- Setup lab, Psychology, Risk lab, Reports, Accounts, Goals
- Challenges, Session clock, Content studio, AI mentor
- Replay center, Community board
- Kelly criterion, Performance score
- Strategy tester with Binance API integration

### `js/ui.js` ← LOAD LAST
**UI interaction layer.**
- Universal search (`toggleSearch`, `handleSearch`)
- Notification panel (`toggleNotif`, `buildNotifs`)
- Templates loader (`loadTemplate`)
- Security settings (`changePIN`, `togglePrivacy`, `clearAllData`)
- Command palette (`toggleCmd`, `handleCmd`, `handleCmdKey`)
- Keyboard shortcuts (Ctrl+K, Ctrl+P, Ctrl+1–6, etc.)
- Smart toast stack (`showToastFancy`)
- Auto R:R calculation (`autoCalcRR`)
- Education panel scroll observer

---

## How to Run Locally (VS Code)

### Method 1 — Live Server (Recommended)
1. Install the **Live Server** extension in VS Code
2. Open the `TradeMatrix/` folder in VS Code
3. Right-click `index.html` → **"Open with Live Server"**
4. Browser opens at `http://127.0.0.1:5500`

### Method 2 — Python HTTP Server
```bash
cd TradeMatrix
python3 -m http.server 8080
# Open: http://localhost:8080
```

### Method 3 — Node http-server
```bash
cd TradeMatrix
npx http-server . -p 8080
# Open: http://localhost:8080
```

> ⚠️ **Do NOT open index.html directly as a file:// URL** — browser security
> blocks localStorage and module loading from `file://` in some browsers.
> Always use a local server.

---

## Testing Checklist

After running, verify these work:

| Test | Expected Result |
|------|----------------|
| Page loads | Splash animation shows, then PIN screen |
| PIN entry (default `1234`) | Enters the app |
| Demo mode button | Shows demo preview with locked features |
| Admin login | Click "Admin Portal", use admin password |
| Add a trade | Journal → Add Trade → fill form → Save |
| Dashboard stats | Metrics update after adding a trade |
| Analytics tab | Charts and stats render |
| AI Mentor tab | Chat interface responds |
| Export CSV | Downloads a CSV file |
| Landing page | Pricing cards, feature list visible |

---

## Future Firebase Integration

The app is structured for easy Firebase migration:

1. **Auth** → Replace `getUsers()/saveUsers()` in `auth.js` with Firebase Auth
2. **Data** → Replace `localStorage` calls in `analytics.js` with Firestore reads/writes
3. **Admin** → Replace `getUsers()` in `admin.js` with a Firestore admin query
4. **Real-time** → Add `onSnapshot` listeners in `analytics.js` for live dashboard updates

Key localStorage keys currently used:
- `tm_trades_[accountId]` — trades per account
- `tm_users` — user accounts
- `tm_riskConfig` — risk settings
- `tm_pin` — app PIN
- `tm_accounts` — trading accounts
- `tm_psychLogs`, `tm_reviews`, `tm_goals` — journal data
- `tm_challenges`, `tm_chat` — V2 features
- `tm_adminSession` — admin session flag

---

## Credentials (Development Only)

| Role | Email | Password |
|------|-------|----------|
| Master User | `master@tradematrix.pro` | (set in auth.js MASTER_PASSWORD) |
| Admin Panel | — | `Admin@TM2024` (set in admin.js ADMIN_PASSWORD) |
| Default PIN | — | `1234` |

> **Change all credentials before any production deployment.**
