/* ================================================
   app.js — TradeMatrix Pro
   Core state, splash screen, PIN lock, tab routing,
   checklist, modal helpers, toasts, and app initialization.
   ================================================ */

/* global variables declared here; used by all other modules */

// =================== STATE ===================
let PIN = localStorage.getItem('tm_pin') || '1234';
let pinInput = '';
let currentAcct = parseInt(localStorage.getItem('tm_acct') || '0');
let privacyMode = false;
let autoLockTimer = null;

let riskConfig = JSON.parse(localStorage.getItem('tm_riskConfig') || JSON.stringify({
  maxRiskPct: 1, dailyLoss: 3, weeklyLoss: 5, maxTrades: 5, minRR: 1.5, balance: 10000
}));

// Accounts
let accounts = JSON.parse(localStorage.getItem('tm_accounts') || JSON.stringify([
  {id:0, name:'Funded Acc #1', type:'Funded', balance:10000, firm:'FTMO', active:true},
]));

// Trades per account
function getTrades() { return JSON.parse(localStorage.getItem('tm_trades_'+currentAcct) || '[]'); }
function setTrades(t) { localStorage.setItem('tm_trades_'+currentAcct, JSON.stringify(t)); }

// Setups
let setups = JSON.parse(localStorage.getItem('tm_setups') || JSON.stringify([
  {id:1, name:'BOS + FVG', cat:'ICT', sess:'London Open', rules:'1. HTF bias aligned\n2. BOS confirmed\n3. FVG entry on retest', inval:'1. Price closes past SL\n2. No HTF alignment', rr:2.5, wr:65, notes:'Primary London setup'},
  {id:2, name:'OB Rejection', cat:'SMC', sess:'Any', rules:'1. Premium/discount OB\n2. Mitigation candle\n3. Structure alignment', inval:'1. OB fully broken through', rr:2.0, wr:60, notes:'Good for trending markets'},
]));

// Psych logs
let psychLogs = JSON.parse(localStorage.getItem('tm_psychLogs') || '[]');
// Reviews
let reviews = JSON.parse(localStorage.getItem('tm_reviews') || '[]');
// Goals
let goals = JSON.parse(localStorage.getItem('tm_goals') || '[]');
// Notifications
let notifs = JSON.parse(localStorage.getItem('tm_notifs') || JSON.stringify([
  {icon:'🎯', txt:'Welcome to TradeMatrix Pro!', time:'Just now'},
  {icon:'💡', txt:'Add your first trade to get started.', time:'Just now'},
]));

// Calendar state
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

// Editing trade
let editingTradeId = null;
// Images for current trade
let tradeImages = [];

// =================== SPLASH ===================
const SPLASH_MSGS = ['INITIALIZING SYSTEM...','LOADING AI ENGINE...','BUILDING CHARTS...','CALIBRATING RISK ENGINE...','SECURING SESSION...','SYSTEM READY'];
function runSplash() {
  const pts = document.getElementById('sParticles');
  for (let i = 0; i < 25; i++) {
    const p = document.createElement('div'); p.className = 's-p';
    p.style.left = Math.random()*100+'%';
    p.style.animationDelay = Math.random()*4+'s';
    p.style.animationDuration = (3+Math.random()*3)+'s';
    p.style.width = p.style.height = (Math.random()*3+1)+'px';
    pts.appendChild(p);
  }
  let pct = 0;
  const bar = document.getElementById('sBar'), txt = document.getElementById('sBarTxt');
  const iv = setInterval(() => {
    pct += Math.random()*18+5; if (pct > 100) pct = 100;
    bar.style.width = pct+'%';
    txt.textContent = SPLASH_MSGS[Math.min(Math.floor(pct/20),5)];
    if (pct >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        document.getElementById('splash').classList.add('out');
        setTimeout(() => {
          document.getElementById('splash').style.display='none';
          afterSplash();
        }, 800);
      }, 500);
    }
  }, 100);
}

// =================== PIN ===================
function pp(n) {
  if (pinInput.length >= 4) return;
  pinInput += n;
  updatePinDots();
  if (pinInput.length === 4) setTimeout(checkPin, 200);
}
function pd() { pinInput = pinInput.slice(0,-1); updatePinDots(); }
function updatePinDots() {
  for (let i=0;i<4;i++) {
    const d=document.getElementById('pd'+i);
    d.className = 'pin-dot' + (i<pinInput.length?' on':'');
  }
}
function checkPin() {
  if (pinInput === PIN) {
    document.getElementById('pin').classList.remove('active');
    document.getElementById('app').classList.add('active');
    initApp();
    resetAutoLock();
  } else {
    for(let i=0;i<4;i++) document.getElementById('pd'+i).className='pin-dot err';
    document.getElementById('pinHint').textContent = '❌ Wrong PIN. Try again.';
    setTimeout(() => { pinInput=''; updatePinDots(); document.getElementById('pinHint').textContent='Default PIN: 1234'; }, 900);
  }
}
function lockApp() {
  document.getElementById('app').classList.remove('active');
  pinInput=''; updatePinDots();
  document.getElementById('pin').classList.add('active');
}

// =================== AUTO LOCK ===================
function resetAutoLock() {
  clearTimeout(autoLockTimer);
  const mins = parseInt(document.getElementById('autoLockSel')?.value || '5');
  if (mins > 0) autoLockTimer = setTimeout(lockApp, mins*60000);
}
document.addEventListener('mousemove', resetAutoLock);
document.addEventListener('keydown', resetAutoLock);

// =================== TABS ===================
function showTab(id) {
  document.querySelectorAll('.tb').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  const btns = document.querySelectorAll('.tb');
  btns.forEach(b => { if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'"+id+"'")) b.classList.add('active'); });
  const panel = document.getElementById('tab-'+id);
  if (panel) panel.classList.add('active');
  if (id==='dashboard') refreshDashboard();
  if (id==='analytics') refreshAnalytics();
  if (id==='ai') refreshAI();
  if (id==='reports') refreshReports();
  if (id==='accounts') refreshAccounts();
  if (id==='setup') refreshSetupLib();
  if (id==='psychology') refreshPsychology();
  if (id==='journal') { buildTradeLog(); buildReviewArchive(); buildAchievements(); }
  if (id==='replay') { buildTimeline(); buildEmotionJourney(); buildMistakeReplay(); }
  if (id==='challenge') { buildChallenges(); buildChallengeHistory(); }
  if (id==='community') { buildLeaderboard(); buildStudentList(); buildReviewQueue(); }
}
function showSub(tab, sub) {
  document.querySelectorAll('#tab-'+tab+' .stab').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('#tab-'+tab+' .subpanel').forEach(p=>p.classList.remove('active'));
  const btn = [...document.querySelectorAll('#tab-'+tab+' .stab')].find(b=>b.getAttribute('onclick')&&b.getAttribute('onclick').includes("'"+sub+"'"));
  if(btn) btn.classList.add('active');
  const sp = document.getElementById('sub-'+tab+'-'+sub);
  if(sp) sp.classList.add('active');
  // Refresh as needed
  if(tab==='dashboard'&&sub==='calendar') buildCalendar();
  if(tab==='dashboard'&&sub==='heatmap') buildHeatmap();
  if(tab==='dashboard'&&sub==='performance') buildPerfStats();
  if(tab==='dashboard'&&sub==='goals') { buildGoals(); buildAchievements(); }
  if(tab==='journal'&&sub==='list') buildTradeLog();
  if(tab==='journal'&&sub==='review') buildReviewArchive();
  if(tab==='analytics'&&sub==='pairs') buildPairMatrix();
  if(tab==='analytics'&&sub==='montecarlo') runMonteCarlo();
  if(tab==='risk'&&sub==='rules') refreshRiskRules();
  if(tab==='psychology'&&sub==='log') buildPsychLog();
  if(tab==='psychology'&&sub==='weaknesses') buildWeaknessAnalysis();
  if(tab==='setup'&&sub==='stats') buildSetupStats();
  if(tab==='reports'&&sub==='whatsapp') refreshWAReport();
  if(tab==='replay'&&sub==='timeline') buildTimeline();
  if(tab==='replay'&&sub==='journey') buildEmotionJourney();
  if(tab==='replay'&&sub==='mistakes') buildMistakeReplay();
  if(tab==='challenge'&&sub==='active') buildChallenges();
  if(tab==='challenge'&&sub==='history') buildChallengeHistory();
  if(tab==='community'&&sub==='leaderboard') buildLeaderboard();
  if(tab==='community'&&sub==='students') buildStudentList();
  if(tab==='community'&&sub==='review') buildReviewQueue();
}

// =================== CHECKLIST (FIXED) ===================
function syncCheck(cb, labelId) {
  const lbl = document.getElementById(labelId);
  if (!lbl) return;
  if (cb.checked) lbl.classList.add('done');
  else lbl.classList.remove('done');
}
function buildChecklist() {
  const items = ['Reviewed HTF bias','Identified key liquidity levels','Economic calendar checked','Risk per trade confirmed (max '+riskConfig.maxRiskPct+'%)','Daily drawdown limit reviewed','Trading journal ready'];
  const el = document.getElementById('checklistEl');
  if (!el) return;
  el.innerHTML = '';
  items.forEach((txt,i) => {
    const saved = localStorage.getItem('tm_check_'+i) === '1';
    const id = 'chk_'+i;
    const div = document.createElement('div'); div.className='ci';
    div.innerHTML = `<input type="checkbox" id="${id}" ${saved?'checked':''} onchange="syncCheck(this,'chl_${i}');localStorage.setItem('tm_check_${i}',this.checked?'1':'0')"><label id="chl_${i}" for="${id}" class="${saved?'done':''}">${txt}</label>`;
    el.appendChild(div);
  });
}

// =================== MODAL HELPERS ===================
function openMo(id) { document.getElementById(id).classList.add('active'); }
function closeMo(id) { document.getElementById(id).classList.remove('active'); }

// =================== TOAST ===================
function showToast(msg, duration=2600) {
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), duration);
}

// =================== EMOTION TOGGLE ===================
document.addEventListener('click',e=>{
  if(e.target.classList.contains('em-btn')) e.target.classList.toggle('on');
});

// =================== INIT ===================
function initApp() {
  // Set datetime default
  const now=new Date();
  const local=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const dt=document.getElementById('t_dt'); if(dt) dt.value=local;
  // Load risk config
  riskConfig=JSON.parse(localStorage.getItem('tm_riskConfig')||JSON.stringify(riskConfig));
  if(document.getElementById('cfg_risk')) document.getElementById('cfg_risk').value=riskConfig.maxRiskPct;
  if(document.getElementById('cfg_daily')) document.getElementById('cfg_daily').value=riskConfig.dailyLoss;
  if(document.getElementById('cfg_weekly')) document.getElementById('cfg_weekly').value=riskConfig.weeklyLoss;
  if(document.getElementById('cfg_maxtr')) document.getElementById('cfg_maxtr').value=riskConfig.maxTrades;
  if(document.getElementById('cfg_minrr')) document.getElementById('cfg_minrr').value=riskConfig.minRR;
  if(document.getElementById('cfg_bal')) document.getElementById('cfg_bal').value=riskConfig.balance;
  // Load accounts
  accounts=JSON.parse(localStorage.getItem('tm_accounts')||JSON.stringify(accounts));
  const curAcct=accounts.find(a=>a.id===currentAcct)||accounts[0];
  if(curAcct) document.getElementById('acctBadge').textContent=curAcct.name;
  // Init calcs
  calcRisk(); calcRR();
  // Refresh
  refreshDashboard();
  buildReviewArchive();
  buildGoals();
  buildAchievements();
  refreshSetupLib();
  refreshPsychology();
  buildPerfStats();
  buildTradeLog();
  buildNotifs();
}

window.addEventListener('load',()=>{ setTimeout(runSplash,200); });

<!-- KELLY CALCULATOR EMBEDDED IN RISK LAB -->\n\n

