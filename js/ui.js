/* ================================================
   ui.js — TradeMatrix Pro
   UI interactions: notifications, universal search,
   templates, security, command palette, keyboard shortcuts,
   smart toasts, auto RR calculation, and scroll observers.
   ================================================ */

// =================== SCROLL OBSERVER (Education Panel) ===================
// Highlight active nav item on scroll
const chapters = document.querySelectorAll('.chapter');
const navItems = document.querySelectorAll('.nav-item');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navItems.forEach(n => n.classList.remove('active'));
      const id = entry.target.id;
      const active = document.querySelector(`.nav-item[href=&quot;#${id}&quot;]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-20% 0px -70% 0px' });
chapters.forEach(c => observer.observe(c));

// =================== NOTIFICATIONS ===================
function toggleNotif() {
  document.getElementById('notifPanel').classList.toggle('active');
  document.getElementById('univSearch').classList.remove('active');
  buildNotifs();
}
function buildNotifs() {
  const el=document.getElementById('notifList'); if(!el) return;
  el.innerHTML=notifs.slice().reverse().slice(0,8).map(n=>`<div class="notif-item"><div class="notif-dot2" style="background:var(--gold);"></div><div><div class="notif-txt">${n.icon} ${n.txt}</div><div class="notif-time">${n.time}</div></div></div>`).join('');
}
function addNotif(txt) {
  notifs.push({icon:'📊',txt,time:'Just now'});
  localStorage.setItem('tm_notifs',JSON.stringify(notifs));
}

// =================== SEARCH ===================
function toggleSearch() {
  document.getElementById('univSearch').classList.toggle('active');
  document.getElementById('notifPanel').classList.remove('active');
  if(document.getElementById('univSearch').classList.contains('active')) document.getElementById('usInput').focus();
}
function handleSearch() {
  const q=document.getElementById('usInput').value.toLowerCase().trim();
  const el=document.getElementById('usRes'); if(!el) return;
  if(!q){el.innerHTML='';return;}
  const trades=getTrades();
  const results=[];
  // Navigation
  const navItems=[['Dashboard','⚡','dashboard'],['Journal','📋','journal'],['Analytics','📊','analytics'],['AI Engine','🤖','ai'],['Setup Lab','🔬','setup'],['Psychology','🧠','psychology'],['Risk Lab','⚖️','risk'],['Reports','📑','reports'],['Accounts','🏦','accounts'],['Settings','⚙️','settings']];
  navItems.filter(n=>n[0].toLowerCase().includes(q)).forEach(n=>results.push({icon:n[1],txt:n[0],action:`showTab('${n[2]}');toggleSearch();`}));
  trades.filter(t=>t.pair.toLowerCase().includes(q)||t.setup.toLowerCase().includes(q)).slice(0,5).forEach(t=>results.push({icon:'📈',txt:`${t.pair} ${t.dir} ${t.setup} ${t.pnl>=0?'+':''}$${t.pnl.toFixed(2)}`,action:`openTradeDetail(${t.id});toggleSearch();`}));
  el.innerHTML=results.slice(0,8).map(r=>`<div class="us-item" onclick="${r.action}"><div class="us-icon">${r.icon}</div>${r.txt}</div>`).join('')||'<div class="us-item">No results found</div>';
}
function handleSearchKey(e) { if(e.key==='Escape') toggleSearch(); }
document.addEventListener('keydown',e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();toggleSearch();} });
document.addEventListener('click',e=>{
  if(!document.getElementById('univSearch').contains(e.target)&&!e.target.matches('[onclick*="toggleSearch"]')) document.getElementById('univSearch').classList.remove('active');
  if(!document.getElementById('notifPanel').contains(e.target)&&!e.target.closest('[onclick*="toggleNotif"]')) document.getElementById('notifPanel').classList.remove('active');
});

// =================== TEMPLATES ===================
function loadTemplate(type) {
  showTab('journal'); showSub('journal','add');
  const tmpl={
    ict:{setup:'BOS + FVG',htf:'Bullish',session:'London Open'},
    smc:{setup:'CHOCH',htf:'Bearish',session:'New York Open'},
    gold:{setup:'OB Rejection',htf:'Bullish',session:'London Killzone'},
  }[type]||{};
  if(tmpl.setup) document.getElementById('t_setup').value=tmpl.setup;
  if(tmpl.htf) document.getElementById('t_htf').value=tmpl.htf;
  if(tmpl.session) document.getElementById('t_session').value=tmpl.session;
  showToast('✅ '+type.toUpperCase()+' template loaded!');
}

// =================== SECURITY ===================
function openChangePIN() { openMo('pinModal'); }
function changePIN() {
  const cur=document.getElementById('cp_cur').value;
  const nw=document.getElementById('cp_new').value;
  const con=document.getElementById('cp_con').value;
  if(cur!==PIN){showToast('❌ Current PIN incorrect');return;}
  if(nw.length!==4||!/^\d+$/.test(nw)){showToast('❌ PIN must be 4 digits');return;}
  if(nw!==con){showToast('❌ PINs do not match');return;}
  PIN=nw; localStorage.setItem('tm_pin',PIN);
  closeMo('pinModal'); showToast('✅ PIN changed successfully!');
}
let pinRevealed=false;
function toggleShowPIN() {
  pinRevealed=!pinRevealed;
  setSafe('pinDisplay',pinRevealed?PIN:'****');
}
function togglePrivacy() {
  privacyMode=!privacyMode;
  const btn=document.getElementById('privacyBtn');
  if(btn) btn.textContent=privacyMode?'DISABLE':'ENABLE';
  refreshDashboard(); showToast(privacyMode?'🔒 Privacy mode ON':'🔓 Privacy mode OFF');
}
function clearAllData() {
  if(!confirm('DELETE ALL TRADE DATA? This cannot be undone!')) return;
  setTrades([]);
  psychLogs=[]; localStorage.setItem('tm_psychLogs',JSON.stringify([]));
  reviews=[]; localStorage.setItem('tm_reviews',JSON.stringify([]));
  showToast('🗑️ All data cleared');
  refreshDashboard(); buildTradeLog(); buildAchievements();
}


// ===== COMMAND PALETTE =====
const CMD_ITEMS = [
  {icon:'⚡',label:'Go to Dashboard',action:"showTab('dashboard')"},
  {icon:'📋',label:'Go to Journal',action:"showTab('journal')"},
  {icon:'📊',label:'Go to Analytics',action:"showTab('analytics')"},
  {icon:'🤖',label:'Go to AI Engine',action:"showTab('ai')"},
  {icon:'✨',label:'Go to Content Studio',action:"showTab('content')"},
  {icon:'💬',label:'Go to AI Mentor',action:"showTab('mentor')"},
  {icon:'🎯',label:'Go to Challenge Tracker',action:"showTab('challenge')"},
  {icon:'📅',label:'Go to Replay Center',action:"showTab('replay')"},
  {icon:'👥',label:'Go to Community',action:"showTab('community')"},
  {icon:'⚖️',label:'Go to Risk Lab',action:"showTab('risk')"},
  {icon:'🔬',label:'Go to Setup Lab',action:"showTab('setup')"},
  {icon:'🧠',label:'Go to Psychology',action:"showTab('psychology')"},
  {icon:'📑',label:'Go to Reports',action:"showTab('reports')"},
  {icon:'🏦',label:'Go to Accounts',action:"showTab('accounts')"},
  {icon:'⚙️',label:'Go to Settings',action:"showTab('settings')"},
  {icon:'📈',label:'Go to Strategy Tester',action:"showTab('strategy')"},
  {icon:'➕',label:'Add New Trade',action:"showTab('journal');showSub('journal','add')"},
  {icon:'📊',label:'Export CSV',action:'exportCSV()'},
  {icon:'📄',label:'Export JSON Backup',action:'exportJSON()'},
  {icon:'🔒',label:'Lock App',action:'lockApp()'},
  {icon:'🔍',label:'Toggle Search',action:'toggleSearch()'},
  {icon:'⌨️',label:'Keyboard Shortcuts',action:"openMo('shortcutsModal')"},
  {icon:'🔐',label:'Change PIN',action:"openMo('pinModal')"},
  {icon:'📋',label:'Generate PDF Report',action:"generatePDFReport('daily')"},
  {icon:'💬',label:'Generate WhatsApp Report',action:"showTab('reports');showSub('reports','whatsapp')"},
];
let cmdIdx = 0;
function toggleCmd() {
  const el = document.getElementById('cmdPalette');
  el.classList.toggle('active');
  if(el.classList.contains('active')) { document.getElementById('cmdInput').focus(); handleCmd(); }
}
function handleCmd() {
  const q = document.getElementById('cmdInput')?.value.toLowerCase()||'';
  const filtered = q ? CMD_ITEMS.filter(i=>i.label.toLowerCase().includes(q)) : CMD_ITEMS;
  cmdIdx = 0;
  document.getElementById('cmdResults').innerHTML =
    (filtered.length?'<div class="cmd-section">COMMANDS</div>':'')+
    filtered.slice(0,8).map((item,i)=>`
      <div class="cmd-item ${i===0?'selected':''}" onclick="${item.action};toggleCmd();" onmouseover="cmdIdx=${i};highlightCmd(${i})">
        <span class="cmd-item-icon">${item.icon}</span>
        <span>${item.label}</span>
      </div>`).join('') ||
    '<div class="cmd-item">No commands found</div>';
}
function highlightCmd(i) {
  document.querySelectorAll('.cmd-item').forEach((el,idx)=>el.classList.toggle('selected',idx===i));
}
function handleCmdKey(e) {
  const items = document.querySelectorAll('.cmd-item');
  if(e.key==='Escape') { toggleCmd(); }
  else if(e.key==='ArrowDown') { cmdIdx=Math.min(cmdIdx+1,items.length-1); highlightCmd(cmdIdx); e.preventDefault(); }
  else if(e.key==='ArrowUp') { cmdIdx=Math.max(cmdIdx-1,0); highlightCmd(cmdIdx); e.preventDefault(); }
  else if(e.key==='Enter') { items[cmdIdx]?.click(); }
}

// ===== ENHANCED KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if(e.ctrlKey||e.metaKey) {
    switch(e.key) {
      case 'k': e.preventDefault(); toggleSearch(); break;
      case 'p': e.preventDefault(); toggleCmd(); break;
      case 'n': e.preventDefault(); showTab('journal'); showSub('journal','add'); break;
      case 'l': e.preventDefault(); lockApp(); break;
      case '1': e.preventDefault(); showTab('dashboard'); break;
      case '2': e.preventDefault(); showTab('journal'); break;
      case '3': e.preventDefault(); showTab('analytics'); break;
      case '4': e.preventDefault(); showTab('ai'); break;
      case '5': e.preventDefault(); showTab('content'); break;
      case '6': e.preventDefault(); showTab('mentor'); break;
      case 'e': e.preventDefault(); exportCSV(); break;
      case 'h': e.preventDefault(); togglePrivacy(); break;
      case 'm': e.preventDefault(); showTab('mentor'); break;
    }
  }
  if(e.key==='Escape') {
    document.querySelectorAll('.mo.active').forEach(m=>m.classList.remove('active'));
    document.getElementById('cmdPalette').classList.remove('active');
  }
});


// ===== SMART NOTIFICATIONS =====
function showToastFancy(msg, type='success') {
  const stack = document.getElementById('notifToastStack'); if(!stack) return;
  const toast = document.createElement('div');
  const icons = {success:'✅',warning:'⚠️',error:'❌',info:'💡'};
  toast.className='notif-toast';
  toast.innerHTML=`<span class="notif-toast-icon">${icons[type]||'📊'}</span><span>${msg}</span>`;
  stack.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('in'));
  setTimeout(()=>{toast.classList.remove('in');setTimeout(()=>toast.remove(),400);},3500);
}

// ===== AUTO-CALCULATE RR ON ENTRY =====
function autoCalcRR() {
  const entry = parseFloat(document.getElementById('t_entry')?.value)||0;
  const sl = parseFloat(document.getElementById('t_sl')?.value)||0;
  const tp = parseFloat(document.getElementById('t_tp')?.value)||0;
  if(entry&&sl&&tp) {
    const risk = Math.abs(entry-sl), reward = Math.abs(tp-entry);
    const rr = risk>0?reward/risk:0;
    const rrEl = document.getElementById('t_rr'); if(rrEl&&!rrEl.value) rrEl.value = rr.toFixed(2);
  }
}

