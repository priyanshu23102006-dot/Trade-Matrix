/* ================================================
   auth.js — TradeMatrix Pro
   User authentication, session management, login/logout,
   signup, landing page flow, payment, and demo mode.
   NOTE: Auth overrides at the end patch app.js/admin.js
   behaviors to integrate the landing page and subscription.
   ================================================ */

// ============= AUTH + ADMIN SYSTEM ==================
// ====================================================

const ADMIN_PASSWORD = 'Admin@TM2024';

function getUsers() {
  try {
    const raw = localStorage.getItem('tm_users');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) { return []; }
}
function saveUsers(u) {
  try { localStorage.setItem('tm_users', JSON.stringify(Array.isArray(u) ? u : [])); } catch(e) {}
}
function getCurrentUser() {
  try {
    const raw = localStorage.getItem('tm_currentUser');
    if (!raw || raw === 'null' || raw === 'undefined') return null;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : null;
  } catch(e) { return null; }
}
function setCurrentUser(u) {
  try { localStorage.setItem('tm_currentUser', u ? JSON.stringify(u) : 'null'); } catch(e) {}
}
function isAdminSession() { try { return localStorage.getItem('tm_adminSession') === '1'; } catch(e) { return false; } }
function setAdminSession(v) { try { v ? localStorage.setItem('tm_adminSession','1') : localStorage.removeItem('tm_adminSession'); } catch(e) {} }

function afterSplash() {
  if (isAdminSession()) { showAdminPanel(); return; }
  const u = getCurrentUser();
  if (!u) { showAuthPage('authLogin'); document.getElementById('authWrap').classList.add('active'); return; }
  if (u.status === 'approved') {
    document.getElementById('pin').classList.add('active');
  } else if (u.status === 'rejected') {
    showAuthError('loginError', '❌ Your account has been rejected. Contact support.');
    setCurrentUser(null);
    showAuthPage('authLogin'); document.getElementById('authWrap').classList.add('active');
  } else {
    document.getElementById('pendingUserName').textContent = u.firstName + ' ' + u.lastName;
    document.getElementById('pendingUserEmail').textContent = u.email;
    showAuthPage('authPending'); document.getElementById('authWrap').classList.add('active');
  }
}

function showAuthPage(id) {
  ['authLogin','authSignup','authPending'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = p === id ? 'flex' : 'none';
  });
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function showAuthError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 5000);
}
function hideAuthError(id) { const el=document.getElementById(id); if(el) el.classList.remove('show'); }

function checkPwStrength() {
  const pw = document.getElementById('su_password')?.value || '';
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const bar = document.getElementById('pwStrengthBar');
  const txt = document.getElementById('pwStrengthText');
  const colors = ['var(--red)','var(--red)','var(--gold)','var(--gold)','var(--green)'];
  const labels = ['','Weak','Fair','Good','Strong'];
  if (bar) { bar.style.width = (score/4*100) + '%'; bar.style.background = colors[score]; }
  if (txt) { txt.textContent = labels[score]; txt.style.color = colors[score]; }
}

// ===== MASTER ACCESS CREDENTIALS =====
const MASTER_EMAIL    = 'master@tradematrix.pro';
const MASTER_PASSWORD = 'TradeMatrix@Master2024';

function doLogin() {
  const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
  const pw = document.getElementById('loginPassword')?.value;
  hideAuthError('loginError');
  if (!email || !pw) { showAuthError('loginError','❌ Please fill in all fields.'); return; }

  // ── MASTER LOGIN: skip approval, skip PIN, go straight to dashboard ──
  if (email === MASTER_EMAIL && pw === MASTER_PASSWORD) {
    const masterUser = {
      id: 'master',
      firstName: 'Master',
      lastName: 'User',
      email: MASTER_EMAIL,
      status: 'approved',
      isMaster: true,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    };
    setCurrentUser(masterUser);
    document.getElementById('authWrap').classList.remove('active');
    document.getElementById('pin').classList.remove('active');
    document.getElementById('app').classList.add('active');
    initApp();
    showTab('dashboard');
    showToastFancy('👑 Master Access Granted — Welcome!', 'success');
    return;
  }
  // ── END MASTER LOGIN ──

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email && u.password === pw);
  if (!user) { showAuthError('loginError','❌ Invalid email or password.'); return; }
  if (user.status === 'rejected') { showAuthError('loginError','❌ Your account application was rejected.'); return; }
  setCurrentUser(user);
  document.getElementById('authWrap').classList.remove('active');
  if (user.status === 'approved') {
    document.getElementById('pin').classList.add('active');
  } else {
    document.getElementById('pendingUserName').textContent = user.firstName + ' ' + user.lastName;
    document.getElementById('pendingUserEmail').textContent = user.email;
    showAuthPage('authPending');
    document.getElementById('authWrap').classList.add('active');
  }
}

function doSignup() {
  const fields = {
    firstName: document.getElementById('su_firstName')?.value.trim(),
    lastName: document.getElementById('su_lastName')?.value.trim(),
    email: document.getElementById('su_email')?.value.trim().toLowerCase(),
    phone: document.getElementById('su_phone')?.value.trim(),
    country: document.getElementById('su_country')?.value,
    city: document.getElementById('su_city')?.value.trim(),
    experience: document.getElementById('su_experience')?.value,
    accountType: document.getElementById('su_accountType')?.value,
    market: document.getElementById('su_market')?.value,
    source: document.getElementById('su_source')?.value,
    reason: document.getElementById('su_reason')?.value.trim(),
    password: document.getElementById('su_password')?.value,
    confirmPassword: document.getElementById('su_confirmPassword')?.value,
  };
  const terms = document.getElementById('su_terms')?.checked;
  hideAuthError('signupError');

  // Validate required
  if (!fields.firstName || !fields.lastName) { showAuthError('signupError','❌ First and last name are required.'); return; }
  if (!fields.email || !/^[^@]+@[^@]+\.[^@]+$/.test(fields.email)) { showAuthError('signupError','❌ Please enter a valid email address.'); return; }
  if (!fields.phone) { showAuthError('signupError','❌ Phone number is required.'); return; }
  if (!fields.country) { showAuthError('signupError','❌ Please select your country.'); return; }
  if (!fields.experience) { showAuthError('signupError','❌ Please select your trading experience level.'); return; }
  if (!fields.accountType) { showAuthError('signupError','❌ Please select your account type.'); return; }
  if (!fields.password || fields.password.length < 8) { showAuthError('signupError','❌ Password must be at least 8 characters.'); return; }
  if (fields.password !== fields.confirmPassword) { showAuthError('signupError','❌ Passwords do not match.'); return; }
  if (!terms) { showAuthError('signupError','❌ Please accept the Terms & Conditions.'); return; }

  const users = getUsers();
  if (users.find(u => u.email.toLowerCase() === fields.email)) { showAuthError('signupError','❌ An account with this email already exists.'); return; }

  const newUser = {
    id: Date.now(),
    firstName: fields.firstName,
    lastName: fields.lastName,
    email: fields.email,
    phone: fields.phone,
    country: fields.country,
    city: fields.city,
    experience: fields.experience,
    accountType: fields.accountType,
    market: fields.market || 'Not specified',
    source: fields.source || 'Not specified',
    reason: fields.reason,
    password: fields.password,
    status: 'pending',
    createdAt: new Date().toISOString(),
    approvedAt: null,
  };
  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);

  document.getElementById('pendingUserName').textContent = fields.firstName + ' ' + fields.lastName;
  document.getElementById('pendingUserEmail').textContent = fields.email;
  showAuthPage('authPending');
  document.getElementById('authWrap').classList.add('active');
}

function doLogout() {
  setCurrentUser(null);
  setAdminSession(false);
  document.getElementById('authWrap').classList.add('active');
  document.getElementById('app').classList.remove('active');
  document.getElementById('pin').classList.remove('active');
  document.getElementById('adminWrap').classList.remove('active');
  document.getElementById('adminPanelPage').style.display = 'none';
  document.getElementById('adminLoginPage').style.display = '';
  showAuthPage('authLogin');
}

// ---- ADMIN ----

// ============= LANDING PAGE SYSTEM ==================
// ====================================================

const ADMIN_UPI_ID    = 'tradematrix.pro@ybl';
const ADMIN_PHONE     = '+91 98765 43210';
const ADMIN_NAME      = 'TradeMatrix Pro';

const PLANS = {
  starter:  { name: 'STARTER — 3 MONTHS',  duration: '3 Months Full Access',  price: 1499, label: '₹1,499' },
  pro:      { name: 'PRO — 6 MONTHS',       duration: '6 Months Full Access',  price: 2999, label: '₹2,999' },
  lifetime: { name: 'LIFETIME ELITE',        duration: 'Lifetime Access',       price: 3999, label: '₹3,999' },
};

let selectedPlan = 'pro';
let payCountdownInterval = null;

/* Show / hide landing page */
function showLandingPage() {
  document.getElementById('landingPage').classList.add('active');
  document.getElementById('authWrap').classList.remove('active');
  document.getElementById('pin').classList.remove('active');
  document.getElementById('app').classList.remove('active');
  document.getElementById('paymentPage').classList.remove('active');
  document.getElementById('paySuccess').classList.remove('active');
  buildLpParticles();
}

function hideLandingPage() {
  document.getElementById('landingPage').classList.remove('active');
}

function buildLpParticles() {
  const container = document.getElementById('lpParticles');
  if (!container || container.childNodes.length > 0) return;
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'lp-hp';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = (Math.random() * 5) + 's';
    p.style.animationDuration = (4 + Math.random() * 4) + 's';
    p.style.width = p.style.height = (Math.random() > 0.5 ? '2px' : '1px');
    container.appendChild(p);
  }
}

function lpScrollTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* Plan selection */
function selectPlan(planKey) {
  selectedPlan = planKey;
  document.querySelectorAll('.lp-plan-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('plan-' + planKey);
  if (card) card.classList.add('selected');
  // Small delay then open payment
  setTimeout(() => openPaymentPage(planKey), 200);
}

/* Payment page */
function openPaymentPage(planKey) {
  const plan = PLANS[planKey] || PLANS.pro;
  selectedPlan = planKey;
  // Fill plan info
  document.getElementById('payPlanName').textContent = plan.name;
  document.getElementById('payPlanDuration').textContent = plan.duration;
  document.getElementById('payPlanPrice').textContent = plan.label;
  document.getElementById('payAmountDisplay').textContent = plan.label;
  document.getElementById('pf_plan').value = plan.name;
  document.getElementById('pf_amount').value = plan.price;
  document.getElementById('adminUpiId').textContent = ADMIN_UPI_ID;
  document.getElementById('adminPhone').textContent = ADMIN_PHONE;
  document.getElementById('sucWhatsApp').textContent = ADMIN_PHONE;
  // Pre-fill user info
  const u = getCurrentUser();
  if (u) {
    document.getElementById('pf_name').value = (u.firstName || '') + ' ' + (u.lastName || '');
    document.getElementById('pf_email').value = u.email || '';
    document.getElementById('pf_phone').value = u.phone || '';
  }
  document.getElementById('paymentPage').classList.add('active');
  document.getElementById('landingPage').classList.remove('active');
  window.scrollTo(0, 0);
}

function showPaymentPage(show) {
  if (show) {
    document.getElementById('paymentPage').classList.add('active');
    document.getElementById('landingPage').classList.remove('active');
  } else {
    document.getElementById('paymentPage').classList.remove('active');
    document.getElementById('landingPage').classList.add('active');
    setTimeout(() => lpScrollTo('pricing'), 100);
  }
}

function copyUpiId() {
  const upi = document.getElementById('adminUpiId')?.textContent || ADMIN_UPI_ID;
  if (navigator.clipboard) navigator.clipboard.writeText(upi).then(() => showToastFancy('✅ UPI ID copied!', 'success'));
  else {
    const ta = document.createElement('textarea'); ta.value = upi;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); showToastFancy('✅ UPI ID copied!', 'success');
  }
}

/* Payment form submission */
function submitPayment() {
  const name   = document.getElementById('pf_name')?.value.trim();
  const email  = document.getElementById('pf_email')?.value.trim();
  const phone  = document.getElementById('pf_phone')?.value.trim();
  const upiId  = document.getElementById('pf_upiId')?.value.trim();
  const txnId  = document.getElementById('pf_txnId')?.value.trim();
  const amount = document.getElementById('pf_amount')?.value.trim();
  const errEl  = document.getElementById('payFormError');

  const showErr = (msg) => { if(errEl){errEl.textContent=msg;errEl.classList.add('show');setTimeout(()=>errEl.classList.remove('show'),5000);} };

  if (!name)   { showErr('❌ Please enter your full name.'); return; }
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { showErr('❌ Please enter a valid email address.'); return; }
  if (!phone)  { showErr('❌ Please enter your phone number.'); return; }
  if (!upiId)  { showErr('❌ Please enter the UPI ID you used for payment.'); return; }
  if (!txnId || txnId.length < 6) { showErr('❌ Please enter a valid Transaction ID / UTR Number.'); return; }
  if (!amount) { showErr('❌ Please enter the amount you paid.'); return; }

  // Save payment record against user
  const plan = PLANS[selectedPlan] || PLANS.pro;
  const u = getCurrentUser();
  const payRecord = {
    name, email, phone, upiId, txnId,
    amount: parseFloat(amount),
    plan: plan.name,
    planKey: selectedPlan,
    submittedAt: new Date().toISOString(),
    status: 'pending_verification'
  };

  // Save to user object
  if (u) {
    u.paymentSubmitted = true;
    u.paymentRecord = payRecord;
    setCurrentUser(u);
    // Also update in users list
    const users = getUsers();
    const idx = users.findIndex(usr => String(usr.id) === String(u.id));
    if (idx !== -1) { users[idx].paymentSubmitted = true; users[idx].paymentRecord = payRecord; saveUsers(users); }
  }

  // Save separately for admin visibility
  try {
    const existing = JSON.parse(localStorage.getItem('tm_payments') || '[]');
    existing.push(payRecord);
    localStorage.setItem('tm_payments', JSON.stringify(existing));
  } catch(e) {}

  // Show success page
  document.getElementById('paymentPage').classList.remove('active');
  document.getElementById('landingPage').classList.remove('active');
  document.getElementById('paySuccess').classList.add('active');
  startPaymentCountdown();
  showToastFancy('✅ Payment confirmation submitted! Activation within 2 hours.', 'success');
}

function startPaymentCountdown() {
  let totalSeconds = 2 * 60 * 60; // 2 hours
  if (payCountdownInterval) clearInterval(payCountdownInterval);
  payCountdownInterval = setInterval(() => {
    if (totalSeconds <= 0) { clearInterval(payCountdownInterval); document.getElementById('payCountdown').textContent = '00:00:00'; return; }
    totalSeconds--;
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    document.getElementById('payCountdown').textContent =
      String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  }, 1000);
}

function enterDemoFromLanding() {
  hideLandingPage();
  enterDemoMode();
}

function enterDemoAfterPayment() {
  document.getElementById('paySuccess').classList.remove('active');
  enterDemoMode();
}

// ---- OVERRIDE afterSplash to check for landing page ----
// Override the existing afterSplash to integrate landing page
const _origAfterSplash = afterSplash;
afterSplash = function() {
  if (isAdminSession()) { showAdminPanel(); return; }
  const u = getCurrentUser();
  if (!u) { showAuthPage('authLogin'); document.getElementById('authWrap').classList.add('active'); return; }

  if (u.status === 'approved') {
    // Check if they've already seen the landing page / subscribed
    if (u.isMaster || u.subscriptionActive) {
      // Go straight to PIN (existing flow)
      document.getElementById('pin').classList.add('active');
    } else if (u.paymentSubmitted) {
      // Show payment success with countdown
      document.getElementById('paySuccess').classList.add('active');
      startPaymentCountdown();
    } else {
      // Show landing page
      showLandingPage();
    }
  } else if (u.status === 'rejected') {
    showAuthError('loginError', '❌ Your account has been rejected. Contact support.');
    setCurrentUser(null);
    showAuthPage('authLogin'); document.getElementById('authWrap').classList.add('active');
  } else {
    document.getElementById('pendingUserName').textContent = u.firstName + ' ' + u.lastName;
    document.getElementById('pendingUserEmail').textContent = u.email;
    showAuthPage('authPending'); document.getElementById('authWrap').classList.add('active');
  }
};

// ---- OVERRIDE doLogin to integrate landing page ----
const _origDoLogin = doLogin;
doLogin = function() {
  const email = document.getElementById('loginEmail')?.value.trim().toLowerCase();
  const pw = document.getElementById('loginPassword')?.value;
  hideAuthError('loginError');
  if (!email || !pw) { showAuthError('loginError','❌ Please fill in all fields.'); return; }

  // Master login - bypass everything
  if (email === MASTER_EMAIL && pw === MASTER_PASSWORD) {
    const masterUser = { id:'master', firstName:'Master', lastName:'User', email:MASTER_EMAIL, status:'approved', isMaster:true, createdAt:new Date().toISOString(), approvedAt:new Date().toISOString() };
    setCurrentUser(masterUser);
    document.getElementById('authWrap').classList.remove('active');
    document.getElementById('pin').classList.remove('active');
    document.getElementById('app').classList.add('active');
    initApp(); showTab('dashboard');
    showToastFancy('👑 Master Access Granted — Welcome!', 'success');
    return;
  }

  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email && u.password === pw);
  if (!user) { showAuthError('loginError','❌ Invalid email or password.'); return; }
  if (user.status === 'rejected') { showAuthError('loginError','❌ Your account application was rejected.'); return; }
  setCurrentUser(user);
  document.getElementById('authWrap').classList.remove('active');

  if (user.status === 'approved') {
    if (user.isMaster || user.subscriptionActive) {
      document.getElementById('pin').classList.add('active');
    } else if (user.paymentSubmitted) {
      document.getElementById('paySuccess').classList.add('active');
      startPaymentCountdown();
    } else {
      showLandingPage();
    }
  } else {
    document.getElementById('pendingUserName').textContent = user.firstName + ' ' + user.lastName;
    document.getElementById('pendingUserEmail').textContent = user.email;
    showAuthPage('authPending');
    document.getElementById('authWrap').classList.add('active');
  }
};

// ---- OVERRIDE showUpgradeModal to link to subscription ----
const _origShowUpgradeModal = showUpgradeModal;
showUpgradeModal = function(featureName) {
  if (isDemoMode) {
    // In demo mode, override the upgrade modal's primary button to go to subscription
    _origShowUpgradeModal(featureName);
    // Override the primary button text
    setTimeout(() => {
      const primaryBtn = document.querySelector('.umb-primary');
      if (primaryBtn) {
        primaryBtn.textContent = '🔓 GET FULL ACCESS — Subscribe Now';
        primaryBtn.onclick = () => { exitDemoMode(); showLandingPage(); setTimeout(() => lpScrollTo('pricing'), 400); };
      }
    }, 50);
  }
};

// ---- ADMIN: approve user and allow them to activate subscription ----
const _origAdminApproveUser = adminApproveUser;
adminApproveUser = function(id) {
  const users = getUsers();
  const user = users.find(u => String(u.id) === String(id));
  if (!user) return;
  user.status = 'approved';
  user.approvedAt = new Date().toISOString();

  // Admin can also mark subscription as active via a separate action
  saveUsers(users);
  const cu = getCurrentUser();
  if (cu && String(cu.id) === String(id)) setCurrentUser(user);
  refreshAdminPanel();
  showToast('✅ User approved: ' + user.firstName + ' ' + user.lastName);
};

// ---- ADMIN: activate subscription ----
function adminActivateSubscription(id) {
  const users = getUsers();
  const user = users.find(u => String(u.id) === String(id));
  if (!user) return;
  user.subscriptionActive = true;
  user.subscriptionActivatedAt = new Date().toISOString();
  saveUsers(users);
  const cu = getCurrentUser();
  if (cu && String(cu.id) === String(id)) setCurrentUser(user);
  refreshAdminPanel();
  showToast('⚡ Subscription activated for: ' + user.firstName + ' ' + user.lastName);
}

