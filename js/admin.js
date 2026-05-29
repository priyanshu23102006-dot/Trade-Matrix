/* ================================================
   admin.js — TradeMatrix Pro
   Admin panel: user management, approval/rejection,
   subscription activation, and analytics overview.
   ================================================ */

function showAdminLogin() {
  document.getElementById('authWrap').classList.remove('active');
  document.getElementById('adminWrap').classList.add('active');
  document.getElementById('adminLoginPage').style.display = '';
  document.getElementById('adminPanelPage').style.display = 'none';
  document.getElementById('adminPw').value = '';
  hideAuthError('adminLoginError');
}

function hideAdminLogin() {
  document.getElementById('adminWrap').classList.remove('active');
  document.getElementById('authWrap').classList.add('active');
}

function doAdminLogin() {
  const pw = document.getElementById('adminPw')?.value;
  hideAuthError('adminLoginError');
  if (pw !== ADMIN_PASSWORD) { showAuthError('adminLoginError','❌ Invalid admin password.'); return; }
  setAdminSession(true);
  showAdminPanel();
}

function showAdminPanel() {
  document.getElementById('adminWrap').classList.add('active');
  document.getElementById('adminLoginPage').style.display = 'none';
  document.getElementById('adminPanelPage').style.display = 'flex';
  document.getElementById('authWrap').classList.remove('active');
  refreshAdminPanel();
}

function doAdminLogout() {
  setAdminSession(false);
  document.getElementById('adminWrap').classList.remove('active');
  document.getElementById('authWrap').classList.add('active');
  document.getElementById('adminLoginPage').style.display = '';
  document.getElementById('adminPanelPage').style.display = 'none';
  showAuthPage('authLogin');
}

function showAdminTab(tab) {
  ['pending','approved','rejected','all'].forEach(t => {
    const btn = document.getElementById('atab-'+t);
    const content = document.getElementById('adminTab'+t.charAt(0).toUpperCase()+t.slice(1));
    if (btn) btn.classList.toggle('active', t === tab);
    if (content) content.classList.toggle('active', t === tab);
  });
}

function adminSearchUsers() {
  const q = document.getElementById('adminSearch')?.value.toLowerCase().trim() || '';
  const activeTab = [...document.querySelectorAll('.admin-panel-content.active')][0];
  if (!activeTab) return;
  activeTab.querySelectorAll('.admin-user-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = !q || text.includes(q) ? '' : 'none';
  });
}

function refreshAdminPanel() {
  const users = getUsers();
  const pending = users.filter(u => u.status === 'pending');
  const approved = users.filter(u => u.status === 'approved');
  const rejected = users.filter(u => u.status === 'rejected');

  // Stats
  const sg = document.getElementById('adminStatsGrid');
  if (sg) sg.innerHTML = [
    {num: users.length, lbl: 'Total Users', color: 'var(--gold)'},
    {num: pending.length, lbl: 'Pending', color: 'var(--gold)'},
    {num: approved.length, lbl: 'Approved', color: 'var(--green)'},
    {num: rejected.length, lbl: 'Rejected', color: 'var(--red)'},
  ].map(s => `<div class="admin-stat-card">
    <div class="admin-stat-num" style="color:${s.color};">${s.num}</div>
    <div class="admin-stat-lbl">${s.lbl}</div>
  </div>`).join('');

  // Update tab buttons with counts
  document.getElementById('atab-pending').textContent = '⏳ PENDING (' + pending.length + ')';
  document.getElementById('atab-approved').textContent = '✅ APPROVED (' + approved.length + ')';
  document.getElementById('atab-rejected').textContent = '❌ REJECTED (' + rejected.length + ')';
  document.getElementById('atab-all').textContent = '👥 ALL (' + users.length + ')';

  renderAdminUsers('adminTabPending', pending, true, false);
  renderAdminUsers('adminTabApproved', approved, false, true);
  renderAdminUsers('adminTabRejected', rejected, false, false, true);
  renderAdminUsers('adminTabAll', users, true, true, true);
}

function renderAdminUsers(containerId, users, showApprove, showRemove, showRestore) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!users.length) {
    el.innerHTML = '<div class="admin-empty"><div class="admin-empty-icon">📭</div><div>No users in this category.</div></div>';
    return;
  }
  el.innerHTML = users.map(u => {
    const initials = (u.firstName?.[0]||'') + (u.lastName?.[0]||'');
    const joined = u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
    const statusClass = {pending:'status-pending',approved:'status-approved',rejected:'status-rejected'}[u.status]||'';
    const statusLabel = {pending:'⏳ PENDING',approved:'✅ APPROVED',rejected:'❌ REJECTED'}[u.status]||u.status;
    return `<div class="admin-user-card" id="ucard-${u.id}">
      <div class="admin-user-header">
        <div class="admin-user-avatar">${initials.toUpperCase()}</div>
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div class="admin-user-name">${u.firstName} ${u.lastName}</div>
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </div>
          <div class="admin-user-email">${u.email} • ${u.phone}</div>
        </div>
        <div style="font-size:.72rem;color:var(--text3);text-align:right;white-space:nowrap;">Applied<br>${joined}</div>
      </div>
      <div class="admin-user-meta">
        <div class="admin-meta-item"><div class="admin-meta-lbl">Country</div><div class="admin-meta-val">${u.country||'—'}</div></div>
        <div class="admin-meta-item"><div class="admin-meta-lbl">City</div><div class="admin-meta-val">${u.city||'—'}</div></div>
        <div class="admin-meta-item"><div class="admin-meta-lbl">Experience</div><div class="admin-meta-val">${u.experience||'—'}</div></div>
        <div class="admin-meta-item"><div class="admin-meta-lbl">Account Type</div><div class="admin-meta-val">${u.accountType||'—'}</div></div>
        <div class="admin-meta-item"><div class="admin-meta-lbl">Market</div><div class="admin-meta-val">${u.market||'—'}</div></div>
        <div class="admin-meta-item"><div class="admin-meta-lbl">Source</div><div class="admin-meta-val">${u.source||'—'}</div></div>
      </div>
      ${u.reason ? `<div style="font-size:.8rem;color:var(--text2);background:rgba(255,255,255,0.03);border-radius:8px;padding:10px 12px;margin-bottom:12px;line-height:1.5;"><span style="font-size:.65rem;color:var(--text3);letter-spacing:1px;">APPLICATION NOTE: </span>${u.reason}</div>` : ''}
      ${u.paymentRecord ? `<div style="font-size:.8rem;background:rgba(0,255,163,.04);border:1px solid rgba(0,255,163,.15);border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="font-size:.62rem;letter-spacing:2px;color:var(--green);font-family:Orbitron,sans-serif;margin-bottom:8px;">💳 PAYMENT SUBMITTED</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          <div><span style="color:var(--text3);font-size:.65rem;">Plan:</span> <span style="color:var(--text);font-weight:600;">${u.paymentRecord.plan||'—'}</span></div>
          <div><span style="color:var(--text3);font-size:.65rem;">Amount:</span> <span style="color:var(--green);font-weight:700;">₹${u.paymentRecord.amount||'—'}</span></div>
          <div><span style="color:var(--text3);font-size:.65rem;">UPI ID:</span> <span style="color:var(--text);">${u.paymentRecord.upiId||'—'}</span></div>
          <div><span style="color:var(--text3);font-size:.65rem;">Txn ID:</span> <span style="color:var(--gold);font-family:Share Tech Mono,monospace;">${u.paymentRecord.txnId||'—'}</span></div>
        </div>
      </div>` : ''}
      <div class="admin-user-actions">
        ${showApprove && u.status!=='approved' ? `<button class="admin-btn-approve" onclick="adminApproveUser(${u.id})">✅ APPROVE</button>` : ''}
        ${u.status==='pending' ? `<button class="admin-btn-reject" onclick="adminRejectUser(${u.id})">⛔ REJECT</button>` : ''}
        ${showRestore && u.status==='rejected' ? `<button class="admin-btn-approve" onclick="adminApproveUser(${u.id})" style="font-size:.58rem;">↩ RESTORE</button>` : ''}
        ${u.status==='approved' && u.paymentSubmitted && !u.subscriptionActive ? `<button class="admin-btn-approve" onclick="adminActivateSubscription(${u.id})" style="background:rgba(201,162,39,.12);border-color:rgba(201,162,39,.4);color:var(--gold);">⚡ ACTIVATE SERVICE</button>` : ''}
        ${u.subscriptionActive ? `<span style="padding:6px 12px;border-radius:7px;font-size:.62rem;font-family:Orbitron,sans-serif;letter-spacing:1px;background:rgba(0,255,163,.08);border:1px solid rgba(0,255,163,.25);color:var(--green);">✅ SERVICE ACTIVE</span>` : ''}
        ${showRemove || u.status!=='pending' ? `<button class="admin-btn-remove" onclick="adminRemoveUser(${u.id})">🗑 REMOVE</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function adminApproveUser(id) {
  const users = getUsers();
  const user = users.find(u => String(u.id) === String(id));
  if (!user) return;
  user.status = 'approved';
  user.approvedAt = new Date().toISOString();
  saveUsers(users);
  const cu = getCurrentUser();
  if (cu && String(cu.id) === String(id)) setCurrentUser(user);
  refreshAdminPanel();
  showToast('✅ User approved: ' + user.firstName + ' ' + user.lastName);
}

function adminRejectUser(id) {
  if (!confirm('Reject this user application?')) return;
  const users = getUsers();
  const user = users.find(u => String(u.id) === String(id));
  if (!user) return;
  user.status = 'rejected';
  saveUsers(users);
  refreshAdminPanel();
  showToast('❌ User rejected.');
}

function adminRemoveUser(id) {
  if (!confirm('Permanently remove this user? This cannot be undone.')) return;
  const users = getUsers().filter(u => String(u.id) !== String(id));
  saveUsers(users);
  const cu = getCurrentUser();
  if (cu && String(cu.id) === String(id)) setCurrentUser(null);
  refreshAdminPanel();
  showToast('🗑 User removed.');
}

// ====================================================
// ============= DEMO MODE SYSTEM =====================
// ====================================================

let isDemoMode = false;

// All features that are locked in demo mode
const DEMO_LOCKED_FEATURES = [
  'Add Trade','Log Trade','Save','Execute','Run Backtest','Run Analysis',
  'Export','Import','AI Analysis','Calculate','Place Order','New Setup',
  'Save Setup','Save Note','Add Goal','Log Session','Generate','Send Message',
  'Submit','Activate','Apply','Start Challenge','Edit','Delete','Remove'
];

const DEMO_LOCKED_TABS = ['journal','ai','risk','setup','psychology','reports','accounts','content','mentor','challenge','replay','community','strategy'];

const DEMO_SAMPLE_DATA = {
  pnl: '$12,847.50', wr: '68.4%', pf: '2.31', expectancy: '$184',
  todayTrades: '3', drawdown: '1.8%', consistency: '91%', psychScore: '87/100',
  totalTrades: '247', avgRR: '2.4', maxDD: '4.2%', sharpe: '1.87'
};

function enterDemoMode() {
  isDemoMode = true;
  // Hide auth, show app
  document.getElementById('authWrap').classList.remove('active');
  document.getElementById('app').classList.add('active');
  document.getElementById('app').classList.add('demo-active');
  // Show demo banner
  document.getElementById('demoBanner').classList.add('active');
  // Build watermark
  buildDemoWatermark();
  document.getElementById('demoWatermark').classList.add('active');
  // Init app with demo data
  initApp();
  injectDemoDashboard();
  injectDemoCTAs();
  // Intercept all clicks
  document.getElementById('app').addEventListener('click', handleDemoClick, true);
  // Show demo tab
  showTab('dashboard');
  setTimeout(() => showToastFancy('👁 Demo Preview Mode — All features are view-only. Click any locked feature to upgrade.', 'info'), 1000);
}

function exitDemoMode() {
  isDemoMode = false;
  document.getElementById('app').classList.remove('active');
  document.getElementById('app').classList.remove('demo-active');
  document.getElementById('demoBanner').classList.remove('active');
  document.getElementById('demoWatermark').classList.remove('active');
  document.getElementById('upgradeModal').classList.remove('active');
  document.getElementById('app').removeEventListener('click', handleDemoClick, true);
  // Back to login
  showAuthPage('authLogin');
  document.getElementById('authWrap').classList.add('active');
}

function exitDemoAndSignup() {
  exitDemoMode();
  showAuthPage('authSignup');
}

function buildDemoWatermark() {
  const wm = document.getElementById('demoWatermark');
  wm.innerHTML = '';
  const rows = 8;
  for (let r = 0; r < rows; r++) {
    const el = document.createElement('div');
    el.className = 'demo-wm-text';
    el.style.top = (r * 13) + '%';
    el.style.left = '-20%';
    el.style.animationDuration = (18 + r * 3) + 's';
    el.style.animationDelay = -(r * 2.5) + 's';
    el.style.fontSize = (r % 2 === 0 ? '1.1rem' : '0.85rem');
    el.textContent = '⠀TRADE MATRIX DEMO PREVIEW ⠀— ⠀VIEW ONLY ⠀— ⠀TRADE MATRIX DEMO PREVIEW ⠀— ⠀VIEW ONLY ⠀— ⠀TRADE MATRIX DEMO PREVIEW ⠀— ⠀VIEW ONLY ⠀—';
    wm.appendChild(el);
  }
}

function handleDemoClick(e) {
  if (!isDemoMode) return;
  // Allow: demo banner, upgrade modal, topbar navigation tabs, exit buttons, close buttons
  const allowedIds = ['demoBanner','upgradeModal','demoWatermark'];
  const allowedClasses = ['tb','stab','demo-exit-btn','demo-upgrade-btn','umb-close','umb-primary','umb-sec','lock-btn'];
  const target = e.target.closest('button, input, select, textarea, [onclick]');
  if (!target) return;
  // Allow tab navigation and demo controls
  const onclick = target.getAttribute('onclick') || '';
  if (onclick.includes('showTab') || onclick.includes('showSub') || onclick.includes('exitDemo') || onclick.includes('closeUpgrade') || onclick.includes('showUpgrade') || onclick.includes('doLogout') || onclick.includes('lockApp') || onclick.includes('toggleSearch') || onclick.includes('toggleNotif') || onclick.includes('toggleCmd')) return;
  if (target.classList.contains('tb') || target.classList.contains('stab')) return;
  if (target.closest('#demoBanner') || target.closest('#upgradeModal')) return;
  // Block everything else and show upgrade modal
  e.stopPropagation();
  e.preventDefault();
  const featureName = target.textContent?.trim().slice(0, 60) || 'This Feature';
  showUpgradeModal(featureName);
}

function showUpgradeModal(featureName) {
  const el = document.getElementById('upgradeModalFeatureName');
  if (el && featureName && featureName !== 'banner') {
    el.style.display = 'block';
    el.textContent = '🔒 LOCKED: ' + featureName.toUpperCase();
  } else if (el) {
    el.style.display = 'none';
  }
  document.getElementById('upgradeModal').classList.add('active');
}

function closeUpgradeModal() {
  document.getElementById('upgradeModal').classList.remove('active');
}

function injectDemoDashboard() {
  // Inject sample data into dashboard stat cards
  const map = {
    'd-pnl': DEMO_SAMPLE_DATA.pnl, 'd-wr': DEMO_SAMPLE_DATA.wr,
    'd-pf': DEMO_SAMPLE_DATA.pf, 'd-exp': DEMO_SAMPLE_DATA.expectancy,
    'd-today': DEMO_SAMPLE_DATA.todayTrades, 'd-cons': DEMO_SAMPLE_DATA.consistency,
    'd-psych': DEMO_SAMPLE_DATA.psychScore,
    'p-total': '247', 'p-rr': '2.4R', 'p-mdd': '4.2%', 'p-sharpe': '1.87'
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
  const dd = document.getElementById('d-dd'); if (dd) dd.textContent = '1.8%';
  const bar = document.getElementById('d-dd-bar'); if (bar) bar.style.width = '60%';
  const pnlBadge = document.getElementById('d-pnl-pct'); if (pnlBadge) { pnlBadge.textContent = '▲ +18.4%'; pnlBadge.className = 'badge bg'; }

  // Draw sample equity curve
  setTimeout(() => {
    const svg = document.getElementById('equitySvg');
    if (svg) {
      const pts = [10,20,18,35,30,45,42,58,55,70,65,78,75,88,85,95,90,105,102,115,110,125,128,135,138,148,150].map((y,i)=>`${i*22},${148-y}`).join(' ');
      svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="var(--green)" stroke-width="2"/>
        <polyline points="0,148 ${pts} ${26*22},148" fill="rgba(0,255,163,.07)" stroke="none"/>`;
    }
  }, 300);
}

function injectDemoCTAs() {
  // Inject CTA cards into locked panels
  const ctaData = [
    { tab: 'journal', icon: '📋', title: 'TRADE JOURNAL ENGINE', desc: 'Log every trade with full context — entry, exit, emotion, screenshots, and AI-powered post-trade analysis. Build an unbreakable trading edge.', btn: 'Unlock Journal' },
    { tab: 'ai', icon: '🤖', title: 'AI TRADING ENGINE', desc: 'Your personal AI analyst. Scans your trade history, identifies patterns, detects psychological leaks, and gives institutional-grade coaching 24/7.', btn: 'Activate AI Engine' },
    { tab: 'setup', icon: '🔬', title: 'SETUP LAB', desc: 'Build, test, and track your most profitable setups. Add screenshots, win rates, and notes. Know your edge at a statistical level.', btn: 'Access Setup Lab' },
    { tab: 'psychology', icon: '🧠', title: 'PSYCHOLOGY SUITE', desc: 'Track your emotional state, fear, greed, and discipline. The only trading platform with a complete psychology monitoring engine.', btn: 'Unlock Psychology' },
    { tab: 'risk', icon: '⚖️', title: 'RISK MANAGEMENT LAB', desc: 'Dynamic position sizing, Kelly Criterion calculator, max drawdown limits, and real-time risk alerts. Trade like an institution.', btn: 'Access Risk Lab' },
    { tab: 'strategy', icon: '📈', title: 'STRATEGY BACKTESTING ENGINE', desc: 'Backtest any strategy on historical data. Get statistical proof of your edge before risking a single dollar in the live market.', btn: 'Run Backtests' },
    { tab: 'mentor', icon: '💬', title: 'AI MENTOR COACHING', desc: 'One-on-one AI coaching sessions tailored to your personal trade data. Ask anything, get institutional-grade answers instantly.', btn: 'Activate AI Mentor' },
    { tab: 'analytics', icon: '📊', title: 'ADVANCED ANALYTICS', desc: 'Deep-dive into your performance with 20+ metrics. Identify your best setups, optimal sessions, and psychological patterns.', btn: 'View Full Analytics' },
    { tab: 'challenge', icon: '🎯', title: 'CHALLENGE TRACKER', desc: 'Track funded account challenges with real-time drawdown monitoring, rule compliance, and AI-powered challenge coaching.', btn: 'Track Challenges' },
    { tab: 'community', icon: '👥', title: 'ELITE COMMUNITY', desc: 'Connect with elite traders. Share setups, get feedback, join live sessions, and access the exclusive leaderboard.', btn: 'Join Community' },
    { tab: 'content', icon: '✨', title: 'CONTENT STUDIO', desc: 'Auto-generate Instagram, YouTube, and Telegram posts from your trades. Build your brand without spending hours creating content.', btn: 'Open Studio' },
    { tab: 'reports', icon: '📑', title: 'PERFORMANCE REPORTS', desc: 'Generate professional PDF reports for your investors, prop firms, or personal review. Impress anyone with institutional-grade reporting.', btn: 'Generate Reports' },
    { tab: 'accounts', icon: '🏦', title: 'MULTI-ACCOUNT MANAGER', desc: 'Manage all your trading accounts in one place. Switch between funded, personal, and demo accounts with a single click.', btn: 'Manage Accounts' },
    { tab: 'replay', icon: '▶️', title: 'TRADE REPLAY ENGINE', desc: 'Replay your trades bar-by-bar. Identify exactly where you went wrong or right. Master the art of execution.', btn: 'Access Replay' },
  ];

  ctaData.forEach(({ tab, icon, title, desc, btn }) => {
    const panel = document.getElementById('tab-' + tab);
    if (!panel) return;
    const cta = document.createElement('div');
    cta.innerHTML = `
      <div class="demo-cta-card" style="margin-top:8px;">
        <div class="demo-elite-badge">👑 ELITE MEMBERS ONLY</div>
        <div class="demo-cta-icon">${icon}</div>
        <div class="demo-cta-title">${title}</div>
        <div class="demo-cta-desc">${desc}</div>
        <button class="demo-cta-btn" onclick="showUpgradeModal('${title}')">🔓 ${btn} — Upgrade Now</button>
        <div style="margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
          <span class="demo-elite-badge">⚡ Full Access</span>
          <span class="demo-elite-badge">🤖 AI Powered</span>
          <span class="demo-elite-badge">📊 Institutional Grade</span>
        </div>
      </div>
      <div class="demo-blurred" style="border-radius:12px;min-height:160px;margin-top:12px;">
        <div class="g4" style="pointer-events:none;">
          ${[1,2,3,4].map(()=>`<div class="sc"><div class="sl">████████</div><div class="sv gt">████</div><div class="ss">████████████</div></div>`).join('')}
        </div>
      </div>`;
    panel.insertBefore(cta, panel.firstChild);
  });
}

// Override lockApp to handle demo mode + auth check
const _demoOrigLockApp = lockApp;
lockApp = function() {
  if (isDemoMode) { exitDemoMode(); return; }
  const u = getCurrentUser();
  if (!u || u.status !== 'approved') { doLogout(); return; }
  _demoOrigLockApp();
};

// ====================================================
