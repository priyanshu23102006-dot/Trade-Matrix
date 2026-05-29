/* ================================================
   analytics.js — TradeMatrix Pro
   Trade data, statistics, charts, dashboard, and
   all feature modules (setup, psychology, risk, etc.)
   ================================================ */

// =================== ANALYTICS HELPERS ===================
function calcStats(trades) {
  if (!trades.length) return {wr:0,pf:0,exp:0,avgW:0,avgL:0,total:0,wins:0,losses:0,totalPnl:0,mdd:0};
  const wins = trades.filter(t=>t.pnl>0), losses = trades.filter(t=>t.pnl<0);
  const totalW = wins.reduce((a,t)=>a+t.pnl,0), totalL = Math.abs(losses.reduce((a,t)=>a+t.pnl,0));
  const wr = wins.length/trades.length, pf = totalL>0?totalW/totalL:wins.length?99:0;
  const avgW = wins.length?totalW/wins.length:0, avgL = losses.length?totalL/losses.length:0;
  const exp = wr*avgW - (1-wr)*avgL;
  const totalPnl = trades.reduce((a,t)=>a+t.pnl,0);
  // MDD
  let peak=0,mdd=0,equity=0;
  trades.forEach(t=>{ equity+=t.pnl; if(equity>peak)peak=equity; const dd=peak-equity; if(dd>mdd)mdd=dd; });
  const mddPct = riskConfig.balance>0?mdd/riskConfig.balance*100:0;
  return {wr:wr*100,pf,exp,avgW,avgL,total:trades.length,wins:wins.length,losses:losses.length,totalPnl,mdd:mddPct};
}

function fmt$(v) {
  if (privacyMode) return '****';
  const abs = Math.abs(v);
  const str = abs >= 1000 ? '$'+(abs/1000).toFixed(2)+'K' : '$'+abs.toFixed(2);
  return v < 0 ? '-'+str : '+'+str;
}
function fmtNum(v, d=2) { return parseFloat(v||0).toFixed(d); }

// =================== EQUITY CURVE ===================
function drawEquity() {
  const svg = document.getElementById('equitySvg'); if(!svg) return;
  const trades = getTrades();
  if (!trades.length) { svg.innerHTML='<text x="300" y="75" text-anchor="middle" fill="#444d5c" font-family="Rajdhani" font-size="12" letter-spacing="2">NO TRADE DATA</text>'; return; }
  const data = [0]; let eq=0;
  trades.forEach(t=>{ eq+=t.pnl; data.push(eq); });
  const W=600,H=150,pad=12;
  const min=Math.min(...data)-Math.abs(Math.min(...data))*0.1;
  const max=Math.max(...data)+Math.abs(Math.max(...data))*0.1;
  const range = max-min || 1;
  const x=i=>(i/(data.length-1))*(W-pad*2)+pad;
  const y=v=>H-pad-(v-min)/range*(H-pad*2);
  let d=`M${x(0)},${y(data[0])}`; data.forEach((v,i)=>{ if(i>0) d+=` L${x(i)},${y(v)}`; });
  const fill=d+` L${x(data.length-1)},${H} L${pad},${H} Z`;
  const lastVal = data[data.length-1];
  const clr = lastVal >= 0 ? '#00ffa3' : '#ff4d6a';
  svg.innerHTML=`<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${clr}" stop-opacity="0.3"/><stop offset="100%" stop-color="${clr}" stop-opacity="0"/></linearGradient></defs>
    <path d="${fill}" fill="url(#eg)"/>
    <path d="${d}" fill="none" stroke="${clr}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="${x(data.length-1)}" cy="${y(data[data.length-1])}" r="4" fill="${clr}" filter="drop-shadow(0 0 6px ${clr})"/>`;
}

// =================== RADAR CHART ===================
function drawRadar() {
  const svg = document.getElementById('radarSvg'); if(!svg) return;
  const trades = getTrades();
  const stats = calcStats(trades);
  const labels=['Win Rate','Risk Mgmt','Discipline','Consistency','Patience','Psych'];
  const psych = psychLogs.length ? psychLogs[psychLogs.length-1].score/100 : 0.5;
  const vals=[stats.wr/100, Math.min(stats.pf/3,1), 0.82, Math.min(stats.total/50,1)*0.8+0.2, 0.76, psych];
  const cx=150,cy=150,r=100; const n=labels.length;
  const angle=i=>(i/n)*Math.PI*2-Math.PI/2;
  const pt=(i,rv)=>[cx+Math.cos(angle(i))*r*rv,cy+Math.sin(angle(i))*r*rv];
  let grid='';
  [0.25,0.5,0.75,1].forEach(f=>{ const pts=labels.map((_,i)=>pt(i,f).join(',')).join(' '); grid+=`<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>`; });
  let spokes=labels.map((_,i)=>`<line x1="${cx}" y1="${cy}" x2="${pt(i,1)[0]}" y2="${pt(i,1)[1]}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`).join('');
  const pts2=vals.map((v,i)=>pt(i,Math.min(v,1)).join(',')).join(' ');
  const lbls=labels.map((l,i)=>{ const [px,py]=pt(i,1.24); return `<text x="${px}" y="${py}" text-anchor="middle" dominant-baseline="middle" fill="#7a8899" font-size="9" font-family="Rajdhani" letter-spacing="1">${l}</text>`; }).join('');
  svg.innerHTML=grid+spokes+`<polygon points="${pts2}" fill="rgba(201,162,39,0.15)" stroke="rgba(201,162,39,0.7)" stroke-width="2"/>
    ${vals.map((v,i)=>`<circle cx="${pt(i,Math.min(v,1))[0]}" cy="${pt(i,Math.min(v,1))[1]}" r="4" fill="#c9a227"/>`).join('')}${lbls}`;
}

// =================== SESSION BARS ===================
function buildSessionBars(containerId) {
  const el = document.getElementById(containerId); if(!el) return;
  const trades = getTrades();
  const sessions = ['London Open','New York Open','Asia Open','London Killzone','NY Killzone'];
  const sessData = sessions.map(s => {
    const st = trades.filter(t=>t.session===s||t.session===s.replace(' Open',''));
    const pnl = st.reduce((a,t)=>a+t.pnl,0);
    return {s,pnl,count:st.length};
  }).filter(s=>s.count>0);
  if (!sessData.length) { el.innerHTML='<div style="color:var(--text3);font-size:.8rem;letter-spacing:1px;margin:auto;">NO SESSION DATA</div>'; return; }
  const maxAbs = Math.max(...sessData.map(s=>Math.abs(s.pnl)),1);
  el.innerHTML = sessData.map(s => {
    const h = Math.max(Math.abs(s.pnl)/maxAbs*100,8);
    const clr = s.pnl>=0?'var(--green)':'var(--red)';
    const label = s.s.length > 10 ? s.s.split(' ')[0] : s.s;
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">
      <div style="flex:1;display:flex;align-items:flex-end;width:100%;"><div style="width:100%;height:${h}%;background:linear-gradient(180deg,${clr},${clr}44);border-radius:4px 4px 0 0;"></div></div>
      <div style="font-size:.62rem;color:var(--text3);">${label}</div>
      <div style="font-size:.72rem;color:${clr};">${s.pnl>=0?'+':'-'}$${Math.abs(s.pnl).toFixed(0)}</div></div>`;
  }).join('');
}

// =================== DASHBOARD REFRESH ===================
function refreshDashboard() {
  const trades = getTrades();
  const stats = calcStats(trades);
  // Today's trades
  const today = new Date().toDateString();
  const todayTrades = trades.filter(t=>new Date(t.date).toDateString()===today);
  const todayWins = todayTrades.filter(t=>t.pnl>0).length;
  const todayLosses = todayTrades.filter(t=>t.pnl<0).length;
  const todayPnl = todayTrades.reduce((a,t)=>a+t.pnl,0);
  const dailyDDPct = riskConfig.balance>0?Math.abs(Math.min(todayPnl,0))/riskConfig.balance*100:0;

  const monthStart = new Date(); monthStart.setDate(1);
  const monthTrades = trades.filter(t=>new Date(t.date)>=monthStart);
  const monthPnl = monthTrades.reduce((a,t)=>a+t.pnl,0);
  const monthPct = riskConfig.balance>0?monthPnl/riskConfig.balance*100:0;

  setSafe('d-pnl', fmt$(monthPnl));
  setSafe('d-pnl-pct', (monthPnl>=0?'▲ ':'▼ ')+Math.abs(monthPct).toFixed(1)+'%');
  setSafe('d-wr', stats.wr.toFixed(1)+'%');
  setSafe('d-pf', stats.pf.toFixed(2));
  setSafe('d-pf-lbl', stats.pf>=2?'EXCELLENT':stats.pf>=1.5?'GOOD':stats.pf>=1?'OK':'WEAK');
  setSafe('d-exp', fmt$(stats.exp));
  setSafe('d-today', todayTrades.length.toString());
  setSafe('d-today-wl', todayWins+'W / '+todayLosses+'L');
  setSafe('d-dd', dailyDDPct.toFixed(1)+'%');
  setSafe('d-dd-lim', 'Limit: '+riskConfig.dailyLoss+'%');
  const ddBarEl = document.getElementById('d-dd-bar');
  if(ddBarEl) ddBarEl.style.width=Math.min(dailyDDPct/riskConfig.dailyLoss*100,100)+'%';

  const onPlan = trades.filter(t=>!t.mistakes||t.mistakes.includes('None')).length;
  const cons = trades.length?Math.round(onPlan/trades.length*100):0;
  setSafe('d-cons', cons+'%');

  const avgPsych = psychLogs.length?Math.round(psychLogs.slice(-7).reduce((a,l)=>a+l.score,0)/Math.min(psychLogs.length,7)):0;
  setSafe('d-psych', avgPsych+'/100');

  drawEquity();
  buildSessionBars('sessionBars');
  buildRecentTrades();
  buildAIBrief();
  buildChecklist();
  buildStreak();
  buildPerfStats();

  // Color PnL badge
  const badge = document.getElementById('d-pnl-pct');
  if(badge) { badge.className='badge '+(monthPnl>=0?'bg':'br'); }
}

function setSafe(id, val) {
  const el = document.getElementById(id);
  if(el) el.textContent = val;
}

// =================== RECENT TRADES ===================
function buildRecentTrades() {
  const el = document.getElementById('recentTrades'); if(!el) return;
  const trades = getTrades().slice(-5).reverse();
  if (!trades.length) { el.innerHTML='<div style="color:var(--text3);font-size:.82rem;padding:16px;text-align:center;">No trades yet. Add your first trade!</div>'; return; }
  el.innerHTML = `<div style="font-size:.68rem;letter-spacing:2px;color:var(--text3);padding:4px 10px;display:grid;grid-template-columns:65px 50px 70px 60px 1fr;gap:8px;">PAIR|DIR|P&L|GRADE|SETUP</div>`.replace(/\|/g,'</span><span>').replace('PAIR',`<span>PAIR</span><span>`);
  el.innerHTML = `<div style="font-size:.64px;display:grid;"></div>`;
  el.innerHTML = trades.map(t=>`
    <div onclick="openTradeDetail(${t.id})" style="display:grid;grid-template-columns:65px 50px 70px 60px 1fr;gap:8px;align-items:center;padding:7px 10px;background:var(--glass);border-radius:8px;cursor:pointer;border-left:3px solid ${t.pnl>0?'var(--green)':'var(--red)'};margin-bottom:4px;font-size:.82rem;transition:all .2s;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='${t.pnl>0?'var(--green)':'var(--red)'}'">
      <span class="gt">${t.pair}</span>
      <span style="color:${t.dir==='BUY'?'var(--green)':'var(--red)'}">${t.dir}</span>
      <span style="color:${t.pnl>0?'var(--green)':'var(--red)'};font-weight:700;">${fmt$(t.pnl)}</span>
      <span class="badge ${t.grade==='A+'?'bg':t.grade==='A'?'bb':t.grade==='F'?'br':'bo'}">${t.grade}</span>
      <span class="tag tg" style="font-size:.62rem;">${t.setup}</span>
    </div>`).join('');
}

// =================== AI BRIEF ===================
function buildAIBrief() {
  const el = document.getElementById('aiBrief'); if(!el) return;
  const trades = getTrades();
  const insights = generateInsights(trades);
  el.innerHTML = insights.slice(0,3).map(ins=>`<div class="ic"><div class="ic-type">${ins.type}</div><div class="ic-txt">${ins.text}</div></div>`).join('');
}

function generateInsights(trades) {
  if (!trades.length) return [{type:'💡 GETTING STARTED', text:'Add your first trade to unlock AI insights. The system will analyze your patterns and provide personalized coaching.'}];
  const stats = calcStats(trades);
  const insights = [];

  // Best setup
  const setupMap = {};
  trades.forEach(t=>{ if(!setupMap[t.setup])setupMap[t.setup]={w:0,total:0,pnl:0}; setupMap[t.setup].total++; if(t.pnl>0)setupMap[t.setup].w++; setupMap[t.setup].pnl+=t.pnl; });
  const bestSetup = Object.entries(setupMap).sort((a,b)=>(b[1].w/b[1].total)-(a[1].w/a[1].total))[0];
  if(bestSetup) insights.push({type:'⭐ TOP SETUP', text:`Your "${bestSetup[0]}" setup has ${Math.round(bestSetup[1].w/bestSetup[1].total*100)}% win rate across ${bestSetup[1].total} trades. Total P&L: ${fmt$(bestSetup[1].pnl)}. Keep focusing here.`});

  // Win rate
  if(stats.wr>60) insights.push({type:'📈 STRONG EDGE', text:`Win rate of ${stats.wr.toFixed(1)}% is excellent. Profit factor ${stats.pf.toFixed(2)} confirms a solid edge. Focus on position sizing to scale.`});
  else if(stats.wr<45) insights.push({type:'⚠️ WIN RATE ALERT', text:`Win rate of ${stats.wr.toFixed(1)}% needs improvement. Review your setups and ensure higher HTF alignment before entry.`});

  // Session analysis
  const sessMap = {};
  trades.forEach(t=>{ const s=t.session||'Unknown'; if(!sessMap[s])sessMap[s]={w:0,total:0}; sessMap[s].total++; if(t.pnl>0)sessMap[s].w++; });
  const bestSess = Object.entries(sessMap).filter(e=>e[1].total>2).sort((a,b)=>(b[1].w/b[1].total)-(a[1].w/a[1].total))[0];
  if(bestSess) insights.push({type:'⏰ BEST SESSION', text:`${bestSess[0]} is your strongest session with ${Math.round(bestSess[1].w/bestSess[1].total*100)}% win rate across ${bestSess[1].total} trades. Prioritize this window.`});

  // FOMO check
  const fomoTrades = trades.filter(t=>t.emotions&&t.emotions.includes('FOMO'));
  if(fomoTrades.length>2) {
    const fomoWr = fomoTrades.filter(t=>t.pnl>0).length/fomoTrades.length*100;
    insights.push({type:'🔥 FOMO DETECTED', text:`${fomoTrades.length} FOMO trades found with ${fomoWr.toFixed(0)}% win rate vs ${stats.wr.toFixed(0)}% overall. FOMO is hurting your performance. Implement a 15-min rule before entry.`});
  }

  // Revenge trades
  const revTrades = trades.filter(t=>t.emotions&&t.emotions.includes('Revenge'));
  if(revTrades.length>1) insights.push({type:'⚡ REVENGE TRADING', text:`${revTrades.length} revenge trades detected. These show destructive patterns. After 2 consecutive losses, mandatory 30-min break.`});

  // Profit factor
  if(stats.pf>=2) insights.push({type:'💎 EXCELLENT EDGE', text:`Profit factor of ${stats.pf.toFixed(2)} is institutional quality. You are extracting ${stats.pf.toFixed(2)}x returns for every dollar risked.`});

  // Grade analysis
  const fTrades = trades.filter(t=>t.grade==='F');
  if(fTrades.length>0) insights.push({type:'⚠️ RULE BREAKS', text:`${fTrades.length} F-graded trades (rule breaks) detected. These likely cost you ${fmt$(fTrades.reduce((a,t)=>a+Math.min(t.pnl,0),0))} in losses. Discipline is the key.`});

  if(stats.total<10) insights.push({type:'📊 BUILDING DATA', text:`You have ${stats.total} trades logged. The AI engine needs 20+ trades for reliable pattern analysis. Keep journaling consistently.`});

  return insights.length ? insights : [{type:'✅ LOOKING GOOD', text:`${stats.total} trades analyzed. Win rate ${stats.wr.toFixed(1)}%, Profit Factor ${stats.pf.toFixed(2)}. Keep up the disciplined trading.`}];
}

// =================== STREAK ===================
function buildStreak() {
  const row = document.getElementById('streakRow'); if(!row) return;
  const trades = getTrades();
  const days = [];
  for(let i=29;i>=0;i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.toDateString();
    const dt = trades.filter(t=>new Date(t.date).toDateString()===ds);
    if(dt.length===0) days.push('none');
    else { const pnl=dt.reduce((a,t)=>a+t.pnl,0); days.push(pnl>0?'win':pnl<0?'loss':'be'); }
  }
  row.innerHTML = days.map(d=>`<div class="sd" style="background:${d==='win'?'rgba(0,255,163,.5)':d==='loss'?'rgba(255,77,106,.4)':d==='be'?'rgba(154,168,190,.3)':'rgba(255,255,255,.05)'};"></div>`).join('');

  // Streak stats
  let curr=0,best=0,worst=0,curLoss=0,bestLoss=0;
  days.forEach(d=>{ if(d==='win'){curr++;best=Math.max(best,curr);curLoss=0;}else{curr=0;if(d==='loss'){curLoss++;bestLoss=Math.max(bestLoss,curLoss);}} });
  const el = document.getElementById('streakStats'); if(!el) return;
  el.innerHTML = [['BEST WIN',best,'grt'],['CURRENT',curr,'gt'],['WORST LOSS',bestLoss,'rt']].map(([l,v,c])=>`
    <div style="text-align:center;padding:8px;background:var(--glass);border-radius:7px;">
      <div style="font-family:Orbitron,sans-serif;font-size:1.3rem;" class="${c}">${v}</div>
      <div style="font-size:.62rem;color:var(--text3);letter-spacing:1px;">${l}</div>
    </div>`).join('');
}

// =================== CALENDAR ===================
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function buildCalendar() {
  const el = document.getElementById('calGrid'); if(!el) return;
  document.getElementById('calTitle').textContent = 'TRADING CALENDAR — '+MONTHS[calMonth].toUpperCase()+' '+calYear;
  const grid = el;
  // Remove old days
  while(grid.children.length > 7) grid.removeChild(grid.lastChild);
  const trades = getTrades();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const today = new Date();

  // Empty cells
  for(let i=0;i<firstDay;i++) {
    const d=document.createElement('div'); d.className='cal-day nd'; d.innerHTML='&nbsp;'; grid.appendChild(d);
  }
  for(let day=1;day<=daysInMonth;day++) {
    const d=document.createElement('div'); d.className='cal-day';
    const dateStr = new Date(calYear,calMonth,day).toDateString();
    const dt = trades.filter(t=>new Date(t.date).toDateString()===dateStr);
    const pnl = dt.reduce((a,t)=>a+t.pnl,0);
    if(today.getFullYear()===calYear&&today.getMonth()===calMonth&&today.getDate()===day) d.classList.add('td');
    else if(dt.length>0) d.classList.add(pnl>0?'wd':'ld');
    d.innerHTML=`<span>${day}</span>${dt.length>0?`<div class="cal-pnl" style="color:${pnl>0?'var(--green)':'var(--red)'};">${pnl>0?'+':'-'}$${Math.abs(pnl).toFixed(0)}</div>`:''}`;
    if(dt.length) d.title=`${dt.length} trade(s): ${fmt$(pnl)}`;
    grid.appendChild(d);
  }
}
function calPrev() { calMonth--; if(calMonth<0){calMonth=11;calYear--;} buildCalendar(); }
function calNext() { calMonth++; if(calMonth>11){calMonth=0;calYear++;} buildCalendar(); }

// =================== HEATMAP ===================
function buildHeatmap() {
  const el = document.getElementById('heatmapGrid'); if(!el) return;
  const trades = getTrades();
  el.innerHTML='';
  for(let h=0;h<24;h++) {
    const ht = trades.filter(t=>{ const hh=new Date(t.date).getUTCHours(); return hh===h; });
    const pnl = ht.reduce((a,t)=>a+t.pnl,0);
    const c = document.createElement('div'); c.className='hc';
    if(ht.length===0) c.style.background='rgba(255,255,255,.03)';
    else if(pnl>0) c.style.background=`rgba(0,255,163,${Math.min(0.8,ht.length/5*0.7)})`;
    else c.style.background=`rgba(255,77,106,${Math.min(0.8,ht.length/5*0.7)})`;
    c.title=`${h}:00 UTC — ${ht.length} trade(s) ${ht.length?fmt$(pnl):''}`;
    el.appendChild(c);
  }
  // Emotion heatmap
  const emEl = document.getElementById('emotionHeatmap'); if(!emEl) return;
  const emotions = ['Calm','Confident','Anxious','Frustrated','FOMO','Tired','Focused','Revenge','Happy'];
  emEl.innerHTML = emotions.map(em => {
    const et = trades.filter(t=>t.emotions&&t.emotions.includes(em));
    const wr = et.length?et.filter(t=>t.pnl>0).length/et.length*100:0;
    return `<div style="flex:1;min-width:160px;padding:12px;background:var(--glass);border-radius:9px;text-align:center;">
      <div style="font-size:.64rem;color:var(--text3);letter-spacing:2px;margin-bottom:7px;">${em.toUpperCase()}</div>
      <div style="font-family:Orbitron,sans-serif;font-size:1.4rem;color:${wr>55?'var(--green)':wr>40?'var(--gold)':'var(--red)'};">${et.length?wr.toFixed(0):'-'}${et.length?'%':''}</div>
      <div style="font-size:.7rem;color:var(--text2);margin-top:4px;">${et.length} trades</div></div>`;
  }).join('');
}

// =================== SAVE TRADE ===================
function saveTrade() {
  const pair = document.getElementById('t_pair').value;
  const pnl = parseFloat(document.getElementById('t_pnl').value)||0;
  if (!pair) { showToast('❌ Please fill in trade details'); return; }
  const emotions = [...document.querySelectorAll('#emotionBtns .em-btn.on')].map(b=>b.textContent.replace(/[^\w\s]/g,'').trim());
  const mistakes = [...document.querySelectorAll('#mistakeBtns .em-btn.on')].map(b=>b.textContent.trim());
  const trades = getTrades();
  const trade = {
    id: Date.now(),
    pair, dir: document.getElementById('t_dir').value,
    session: document.getElementById('t_session').value,
    date: document.getElementById('t_dt').value||new Date().toISOString(),
    entry: parseFloat(document.getElementById('t_entry').value)||0,
    sl: parseFloat(document.getElementById('t_sl').value)||0,
    tp: parseFloat(document.getElementById('t_tp').value)||0,
    exit: parseFloat(document.getElementById('t_exit').value)||0,
    lot: parseFloat(document.getElementById('t_lot').value)||0,
    risk: parseFloat(document.getElementById('t_risk').value)||1,
    pnl, rr: parseFloat(document.getElementById('t_rr').value)||0,
    setup: document.getElementById('t_setup').value,
    htf: document.getElementById('t_htf').value,
    grade: document.getElementById('t_grade').value,
    logic: document.getElementById('t_logic').value,
    notes: document.getElementById('t_notes').value,
    conf: parseInt(document.getElementById('t_conf').value)||7,
    disc: parseInt(document.getElementById('t_disc').value)||8,
    stress: parseInt(document.getElementById('t_stress').value)||3,
    emotions, mistakes,
    images: tradeImages.slice(),
    acct: currentAcct
  };
  trades.push(trade);
  setTrades(trades);
  tradeImages=[];
  document.getElementById('imgPreviews').innerHTML='';
  clearForm();
  showToast('✅ Trade saved! Total: '+trades.length+' trades');
  addNotif('📊 Trade logged: '+pair+' '+fmt$(pnl));
  refreshDashboard();
  buildTradeLog();
  buildAchievements();
}

function clearForm() {
  ['t_entry','t_sl','t_tp','t_exit','t_lot','t_risk','t_pnl','t_rr','t_logic','t_notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('t_conf').value=7; document.getElementById('conf-val').textContent='7';
  document.getElementById('t_disc').value=8; document.getElementById('disc-val').textContent='8';
  document.getElementById('t_stress').value=3; document.getElementById('stress-val').textContent='3';
  document.querySelectorAll('#emotionBtns .em-btn').forEach((b,i)=>{b.classList.remove('on');if(i===0)b.classList.add('on');});
  document.querySelectorAll('#mistakeBtns .em-btn').forEach((b,i)=>{b.classList.remove('on');if(i===8)b.classList.add('on');});
  tradeImages=[]; document.getElementById('imgPreviews').innerHTML='';
}

// =================== IMAGES ===================
function handleImgSelect(e) { addImages([...e.target.files]); }
function handleImgDrop(e) { e.preventDefault(); document.getElementById('imgDrop').classList.remove('drag'); addImages([...e.dataTransfer.files]); }
function addImages(files) {
  files.forEach(f=>{
    if(!f.type.startsWith('image/')) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      tradeImages.push(ev.target.result);
      renderImgPreviews();
    };
    reader.readAsDataURL(f);
  });
}
function renderImgPreviews() {
  const el=document.getElementById('imgPreviews'); if(!el) return;
  el.innerHTML=tradeImages.map((src,i)=>`<div class="img-preview-wrap"><img src="${src}" title="Click to remove"><button class="img-del" onclick="removeImg(${i})">×</button></div>`).join('');
}
function removeImg(i) { tradeImages.splice(i,1); renderImgPreviews(); }

// =================== TRADE LOG ===================
function buildTradeLog() {
  const el = document.getElementById('tradeList'); if(!el) return;
  const trades = getFilteredTrades();
  document.getElementById('tradeCountLbl').textContent='TRADE LOG ('+getTrades().length+' TRADES)';
  if(!trades.length){el.innerHTML='<div style="color:var(--text3);font-size:.82rem;padding:20px;text-align:center;">No trades match the current filter.</div>';return;}
  el.innerHTML=trades.map(t=>`
    <div class="tl-row ${t.pnl>0?'win':t.pnl<0?'loss':'be'}" onclick="openTradeDetail(${t.id})">
      <span style="color:var(--text3);font-size:.75rem;">${new Date(t.date).toLocaleDateString()}</span>
      <span class="gt">${t.pair}</span>
      <span style="color:${t.dir==='BUY'?'var(--green)':'var(--red)'};font-weight:600;">${t.dir}</span>
      <span>${t.entry||'-'}</span>
      <span>${t.exit||'-'}</span>
      <span style="color:${t.pnl>0?'var(--green)':'var(--red)'};font-weight:700;">${fmt$(t.pnl)}</span>
      <span><span class="tag tg" style="font-size:.62rem;">${t.setup}</span></span>
      <span><span class="badge ${t.grade==='A+'?'bg':t.grade==='A'?'bb':t.grade==='F'?'br':'bo'}">${t.grade}</span></span>
      <span>${(t.emotions||[]).map(e=>`<span class="tag tb2" style="font-size:.6rem;">${e}</span>`).join('')}</span>
    </div>`).join('');
}

function getFilteredTrades() {
  let t = getTrades().slice().reverse();
  const search = document.getElementById('searchInput')?.value.toLowerCase()||'';
  const pair = document.getElementById('filterPair')?.value||'';
  const result = document.getElementById('filterResult')?.value||'';
  const sess = document.getElementById('filterSession')?.value||'';
  if(search) t=t.filter(tr=>tr.pair.toLowerCase().includes(search)||tr.setup.toLowerCase().includes(search)||tr.notes?.toLowerCase().includes(search));
  if(pair) t=t.filter(tr=>tr.pair===pair);
  if(result==='win') t=t.filter(tr=>tr.pnl>0);
  if(result==='loss') t=t.filter(tr=>tr.pnl<0);
  if(result==='be') t=t.filter(tr=>tr.pnl===0);
  if(sess) t=t.filter(tr=>tr.session&&tr.session.toLowerCase().includes(sess.toLowerCase()));
  return t;
}
function filterTrades() { buildTradeLog(); }

// =================== TRADE DETAIL MODAL ===================
function openTradeDetail(id) {
  const trades = getTrades();
  const t = trades.find(tr=>tr.id===id); if(!t) return;
  document.getElementById('tradeModalContent').innerHTML=`
    <div class="g2" style="gap:9px;margin-bottom:14px;">
      <div class="sc"><div class="sl">Pair</div><div class="sv gt">${t.pair}</div></div>
      <div class="sc"><div class="sl">P&L</div><div class="sv" style="color:${t.pnl>0?'var(--green)':'var(--red)'}">${fmt$(t.pnl)}</div></div>
    </div>
    <div class="g4" style="gap:8px;margin-bottom:12px;">
      <div class="sc"><div class="sl">Direction</div><div style="color:${t.dir==='BUY'?'var(--green)':'var(--red)'};font-size:1rem;font-weight:700;">${t.dir}</div></div>
      <div class="sc"><div class="sl">R:R</div><div style="font-family:Orbitron,sans-serif;">${t.rr}R</div></div>
      <div class="sc"><div class="sl">Grade</div><span class="badge ${t.grade==='A+'?'bg':t.grade==='A'?'bb':'bo'}">${t.grade}</span></div>
      <div class="sc"><div class="sl">Session</div><div style="font-size:.82rem;">${t.session||'-'}</div></div>
    </div>
    <div class="g4" style="gap:8px;margin-bottom:12px;">
      <div class="sc"><div class="sl">Entry</div><div style="font-family:Orbitron,sans-serif;font-size:1rem;">${t.entry||'-'}</div></div>
      <div class="sc"><div class="sl">Exit</div><div style="font-family:Orbitron,sans-serif;font-size:1rem;">${t.exit||'-'}</div></div>
      <div class="sc"><div class="sl">SL</div><div style="color:var(--red);">${t.sl||'-'}</div></div>
      <div class="sc"><div class="sl">TP</div><div style="color:var(--green);">${t.tp||'-'}</div></div>
    </div>
    <div class="div"></div>
    <div style="font-size:.82rem;color:var(--text2);margin-bottom:10px;"><strong style="color:var(--gold);">Setup:</strong> ${t.setup} | <strong style="color:var(--gold);">HTF Bias:</strong> ${t.htf||'-'}</div>
    ${t.logic?`<div style="font-size:.82rem;color:var(--text2);margin-bottom:10px;"><strong style="color:var(--gold);">Logic:</strong> ${t.logic}</div>`:''}
    ${t.notes?`<div style="font-size:.82rem;color:var(--text2);margin-bottom:10px;"><strong style="color:var(--gold);">Notes:</strong> ${t.notes}</div>`:''}
    ${t.emotions?.length?`<div style="margin-bottom:10px;">${t.emotions.map(e=>`<span class="tag tb2">${e}</span>`).join('')}</div>`:''}
    ${t.mistakes?.length?`<div style="margin-bottom:10px;">${t.mistakes.filter(m=>m!=='None ✓').map(m=>`<span class="tag tr">${m}</span>`).join('')}</div>`:''}
    ${t.images?.length?`<div class="div"></div><div style="font-size:.68rem;color:var(--text3);letter-spacing:2px;margin-bottom:8px;">SCREENSHOTS</div><div style="display:flex;gap:8px;flex-wrap:wrap;">${t.images.map(img=>`<img src="${img}" style="width:120px;height:80px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;" onclick="this.style.width=this.style.width==='100%'?'120px':'100%'">`).join('')}</div>`:''}
    <div class="div"></div>
    <div style="display:flex;gap:8px;">
      <button class="btn btn-sm" onclick="openEditModal(${t.id});closeMo('tradeModal')">✏️ EDIT</button>
      <button class="btn btn-sm btn-rd" onclick="deleteTrade(${t.id});closeMo('tradeModal')">🗑️ DELETE</button>
    </div>`;
  openMo('tradeModal');
}

// =================== EDIT TRADE ===================
function openEditModal(id) {
  editingTradeId = id;
  const trades = getTrades();
  const t = trades.find(tr=>tr.id===id); if(!t) return;
  document.getElementById('editModalContent').innerHTML=`
    <div class="fr fr4">
      <div class="fg"><label>Pair</label><select id="e_pair"><option ${t.pair==='XAUUSD'?'selected':''}>XAUUSD</option><option ${t.pair==='EURUSD'?'selected':''}>EURUSD</option><option ${t.pair==='GBPUSD'?'selected':''}>GBPUSD</option><option ${t.pair==='USDJPY'?'selected':''}>USDJPY</option></select></div>
      <div class="fg"><label>Direction</label><select id="e_dir"><option ${t.dir==='BUY'?'selected':''}>BUY</option><option ${t.dir==='SELL'?'selected':''}>SELL</option></select></div>
      <div class="fg"><label>Grade</label><select id="e_grade"><option ${t.grade==='A+'?'selected':''} value="A+">A+</option><option ${t.grade==='A'?'selected':''} value="A">A</option><option ${t.grade==='B'?'selected':''} value="B">B</option><option ${t.grade==='C'?'selected':''} value="C">C</option><option ${t.grade==='D'?'selected':''} value="D">D</option><option ${t.grade==='F'?'selected':''} value="F">F</option></select></div>
      <div class="fg"><label>P&L ($)</label><input type="number" id="e_pnl" value="${t.pnl}"></div>
    </div>
    <div class="fr fr3">
      <div class="fg"><label>Entry</label><input type="number" id="e_entry" value="${t.entry}" step="0.00001"></div>
      <div class="fg"><label>Exit</label><input type="number" id="e_exit" value="${t.exit}" step="0.00001"></div>
      <div class="fg"><label>R:R</label><input type="number" id="e_rr" value="${t.rr}" step="0.1"></div>
    </div>
    <div class="fr">
      <div class="fg"><label>Notes</label><textarea id="e_notes">${t.notes||''}</textarea></div>
    </div>`;
  openMo('editModal');
}
function saveEdit() {
  if(!editingTradeId) return;
  const trades = getTrades();
  const idx = trades.findIndex(t=>t.id===editingTradeId);
  if(idx<0) return;
  trades[idx].pair = document.getElementById('e_pair').value;
  trades[idx].dir = document.getElementById('e_dir').value;
  trades[idx].grade = document.getElementById('e_grade').value;
  trades[idx].pnl = parseFloat(document.getElementById('e_pnl').value)||0;
  trades[idx].entry = parseFloat(document.getElementById('e_entry').value)||0;
  trades[idx].exit = parseFloat(document.getElementById('e_exit').value)||0;
  trades[idx].rr = parseFloat(document.getElementById('e_rr').value)||0;
  trades[idx].notes = document.getElementById('e_notes').value;
  setTrades(trades);
  closeMo('editModal');
  buildTradeLog();
  showToast('✅ Trade updated!');
  refreshDashboard();
}
function deleteTrade(id) {
  if(!confirm('Delete this trade?')) return;
  const trades = getTrades().filter(t=>t.id!==id);
  setTrades(trades);
  buildTradeLog(); refreshDashboard(); buildAchievements();
  showToast('🗑️ Trade deleted');
}
function deleteTradeConfirm() { if(editingTradeId) { deleteTrade(editingTradeId); closeMo('editModal'); } }

// =================== EXPORT ===================
function exportCSV() {
  const trades = getTrades();
  if(!trades.length){showToast('No trades to export');return;}
  const cols=['Date','Pair','Direction','Session','Entry','Exit','SL','TP','Lot','PnL','RR','Setup','Grade','Emotions','Mistakes','Notes'];
  const rows = trades.map(t=>[new Date(t.date).toLocaleDateString(),t.pair,t.dir,t.session||'',t.entry,t.exit,t.sl,t.tp,t.lot,t.pnl,t.rr,t.setup,t.grade,(t.emotions||[]).join(';'),(t.mistakes||[]).join(';'),(t.notes||'').replace(/,/g,';')].join(','));
  download('tradematrix_export.csv','data:text/csv;charset=utf-8,'+[cols.join(','),...rows].join('\n'));
  showToast('📊 CSV exported!');
}
function exportJSON() {
  const data={accounts,trades:{},setups,psychLogs,reviews,goals};
  accounts.forEach(a=>{ data.trades[a.id]=JSON.parse(localStorage.getItem('tm_trades_'+a.id)||'[]'); });
  download('tradematrix_backup.json','data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data,null,2)));
  showToast('📄 JSON backup exported!');
}
function importData(e) {
  const f=e.target.files[0]; if(!f) return;
  const r=new FileReader();
  r.onload=ev=>{
    try {
      const data=JSON.parse(ev.target.result);
      if(data.trades) { Object.entries(data.trades).forEach(([id,ts])=>localStorage.setItem('tm_trades_'+id,JSON.stringify(ts))); }
      if(data.setups) { setups=data.setups; localStorage.setItem('tm_setups',JSON.stringify(setups)); }
      if(data.psychLogs) { psychLogs=data.psychLogs; localStorage.setItem('tm_psychLogs',JSON.stringify(psychLogs)); }
      showToast('✅ Data imported successfully!');
      initApp();
      buildTradeLog();
    } catch(err) { showToast('❌ Invalid file format'); }
  };
  r.readAsText(f);
}
function download(fname, content) {
  const a=document.createElement('a'); a.href=content; a.download=fname; a.click();
}

function generatePDFReport(type) {
  const trades = getTrades();
  const stats = calcStats(trades);
  const win=window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>TradeMatrix Report</title><style>body{font-family:Arial,sans-serif;padding:30px;background:#fff;color:#000;}h1{color:#c9a227;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f5f5f5;}.pos{color:green;}.neg{color:red;}</style></head><body>
    <h1>TradeMatrix Pro — ${type?type.charAt(0).toUpperCase()+type.slice(1):''} Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <h2>Performance Summary</h2>
    <table><tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Total Trades</td><td>${stats.total}</td></tr>
    <tr><td>Win Rate</td><td>${stats.wr.toFixed(1)}%</td></tr>
    <tr><td>Profit Factor</td><td>${stats.pf.toFixed(2)}</td></tr>
    <tr><td>Expectancy</td><td class="${stats.exp>=0?'pos':'neg'}">$${stats.exp.toFixed(2)}</td></tr>
    <tr><td>Total P&L</td><td class="${stats.totalPnl>=0?'pos':'neg'}">$${stats.totalPnl.toFixed(2)}</td></tr>
    <tr><td>Avg Win</td><td class="pos">$${stats.avgW.toFixed(2)}</td></tr>
    <tr><td>Avg Loss</td><td class="neg">$${stats.avgL.toFixed(2)}</td></tr>
    </table>
    <h2>Trade Log</h2>
    <table><tr><th>Date</th><th>Pair</th><th>Dir</th><th>Entry</th><th>Exit</th><th>P&L</th><th>R:R</th><th>Setup</th><th>Grade</th></tr>
    ${trades.map(t=>`<tr><td>${new Date(t.date).toLocaleDateString()}</td><td>${t.pair}</td><td>${t.dir}</td><td>${t.entry}</td><td>${t.exit}</td><td class="${t.pnl>=0?'pos':'neg'}">$${t.pnl.toFixed(2)}</td><td>${t.rr}R</td><td>${t.setup}</td><td>${t.grade}</td></tr>`).join('')}
    </table></body></html>`);
  win.document.close();
  setTimeout(()=>win.print(),500);
  showToast('📋 Report opened for print!');
}

// =================== ANALYTICS ===================
function refreshAnalytics() {
  const trades = getTrades();
  const stats = calcStats(trades);
  setSafe('an-exp', fmt$(stats.exp));
  setSafe('an-avgw', fmt$(stats.avgW));
  setSafe('an-avgl', fmt$(stats.avgL));
  setSafe('an-pf', stats.pf.toFixed(2));
  // Advanced
  const fTrades = trades.filter(t=>t.grade==='F');
  const aGrades = trades.filter(t=>t.grade==='A+'||t.grade==='A');
  setSafe('adv-pre', Math.max(0,Math.round(stats.wr))+'%');
  setSafe('adv-pat', Math.round(aGrades.length/Math.max(1,trades.length)*100)+'%');
  setSafe('adv-exe', Math.round((1-fTrades.length/Math.max(1,trades.length))*100)+'%');
  setSafe('adv-rbr', Math.round(fTrades.length/Math.max(1,trades.length)*100)+'%');

  // Drawdown
  const ddEl = document.getElementById('ddAnalysis');
  if(ddEl) ddEl.innerHTML=`
    <div style="font-size:.85rem;margin-bottom:8px;display:flex;justify-content:space-between;"><span style="color:var(--text3);">Current Drawdown</span><span class="rt">-${stats.mdd.toFixed(1)}%</span></div>
    <div class="rm"><div class="rf" style="width:${Math.min(stats.mdd/riskConfig.dailyLoss*100,100)}%;background:linear-gradient(90deg,var(--green),var(--red))"></div></div>`;

  buildWeekdayBars();
  buildPatternAnalysis();
}

function setSafe(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }

function buildWeekdayBars() {
  const el = document.getElementById('weekdayAnalysis')||document.getElementById('weekdayBars'); if(!el) return;
  const trades = getTrades();
  const days=['Mon','Tue','Wed','Thu','Fri'];
  const dayData = days.map((d,i)=>{
    const dt=trades.filter(t=>new Date(t.date).getDay()===i+1);
    const pnl=dt.reduce((a,t)=>a+t.pnl,0);
    return {d,pnl,count:dt.length};
  });
  const maxAbs=Math.max(...dayData.map(d=>Math.abs(d.pnl)),1);
  el.innerHTML=dayData.map(d=>{
    const h=Math.max(d.count?Math.abs(d.pnl)/maxAbs*100:8,5);
    const clr=d.pnl>=0?'rgba(0,255,163,0.5)':'rgba(255,77,106,0.4)';
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="flex:1;display:flex;align-items:flex-end;width:100%;"><div style="width:100%;height:${h}%;background:${clr};border-radius:3px 3px 0 0;"></div></div>
      <div style="font-size:.65rem;color:var(--text3);">${d.d}</div></div>`;
  }).join('');
}

function buildPatternAnalysis() {
  const el=document.getElementById('patternAnalysis'); if(!el) return;
  const trades=getTrades();
  el.innerHTML=generateInsights(trades).map(ins=>`<div class="ic"><div class="ic-type">${ins.type}</div><div class="ic-txt">${ins.text}</div></div>`).join('');
}

function buildPairMatrix() {
  const el=document.getElementById('pairMatrix'); if(!el) return;
  const trades=getTrades();
  const pairMap={};
  trades.forEach(t=>{ if(!pairMap[t.pair])pairMap[t.pair]={w:0,total:0,pnl:0,rr:0}; pairMap[t.pair].total++; if(t.pnl>0)pairMap[t.pair].w++; pairMap[t.pair].pnl+=t.pnl; pairMap[t.pair].rr+=t.rr; });
  const sorted=Object.entries(pairMap).sort((a,b)=>b[1].pnl-a[1].pnl);
  if(!sorted.length){el.innerHTML='<div style="color:var(--text3);padding:16px;font-size:.82rem;">No trades yet.</div>';return;}
  el.innerHTML=`<table class="dt"><tr><th>PAIR</th><th>TRADES</th><th>WIN%</th><th>AVG R:R</th><th>TOTAL P&L</th><th>RATING</th></tr>
    ${sorted.map(([pair,d])=>{
      const wr=d.w/d.total*100,rating=wr>65?'badge bg':wr>50?'badge bb':'badge br';
      return `<tr><td class="gt">${pair}</td><td>${d.total}</td><td style="color:${wr>55?'var(--green)':'var(--red)'};">${wr.toFixed(0)}%</td><td>${(d.rr/d.total).toFixed(2)}R</td><td style="color:${d.pnl>0?'var(--green)':'var(--red)'};">${fmt$(d.pnl)}</td><td><span class="${rating}">${wr>65?'⭐ EDGE':wr>50?'GOOD':'⚠️ WEAK'}</span></td></tr>`;
    }).join('')}</table>`;
}

function runMonteCarlo() {
  const el=document.getElementById('mcStats'); if(!el) return;
  const trades=getTrades();
  if(trades.length<5){el.innerHTML='<div style="color:var(--text3);font-size:.82rem;grid-column:1/-1;padding:16px;">Need at least 5 trades for simulation.</div>';return;}
  const pnls=trades.map(t=>t.pnl);
  const N=1000,steps=30;
  const results=[];
  for(let i=0;i<N;i++){
    let eq=0;
    for(let j=0;j<steps;j++) eq+=pnls[Math.floor(Math.random()*pnls.length)];
    results.push(eq);
  }
  results.sort((a,b)=>a-b);
  const p5=results[Math.floor(N*0.05)],p50=results[Math.floor(N*0.5)],p95=results[Math.floor(N*0.95)];
  const ruin=results.filter(r=>r<-riskConfig.balance*0.5).length/N*100;
  el.innerHTML=[
    ['BEST CASE (95%)',fmt$(p95),'grt'],
    ['MEDIAN (50%)',fmt$(p50),'gt'],
    ['WORST CASE (5%)',fmt$(p5),'rt'],
    ['RUIN RISK',ruin.toFixed(1)+'%',ruin<5?'grt':'rt']
  ].map(([l,v,c])=>`<div style="text-align:center;padding:12px;background:var(--glass);border-radius:9px;"><div style="font-size:.64rem;color:var(--text3);letter-spacing:1px;margin-bottom:5px;">${l}</div><div style="font-family:Orbitron,sans-serif;font-size:1.1rem;" class="${c}">${v}</div></div>`).join('');
  const ins=document.getElementById('mcInsight');
  if(ins) ins.innerHTML=`<div class="ic"><div class="ic-type">💡 SIMULATION RESULT</div><div class="ic-txt">Over 1,000 simulations of the next 30 trades: ${ruin<5?'Your strategy has very low ruin risk ('+ruin.toFixed(1)+'%). Expected median return: '+fmt$(p50)+'.':'High ruin risk detected. Consider reducing position size.'}</div></div>`;
}

// =================== AI ENGINE ===================
function refreshAI() {
  const trades=getTrades();
  const stats=calcStats(trades);
  const insights=generateInsights(trades);

  const aiEl=document.getElementById('aiReport'); if(aiEl) aiEl.innerHTML=insights.map(ins=>`<div class="ic"><div class="ic-type">${ins.type}</div><div class="ic-txt">${ins.text}</div></div>`).join('');

  // Behavioral
  const behEl=document.getElementById('behaviorAnalytics'); if(behEl) {
    const fomoTrades=trades.filter(t=>t.emotions?.includes('FOMO'));
    const revTrades=trades.filter(t=>t.emotions?.includes('Revenge'));
    const totalT=trades.length||1;
    const behaviors=[
      ['FOMO DETECTOR',fomoTrades.length/totalT*100,fomoTrades.length/totalT>0.1?'⚠️ MODERATE':'✅ LOW'],
      ['REVENGE TRADING',revTrades.length/totalT*100,revTrades.length/totalT>0.08?'⚠️ DETECTED':'✅ MINIMAL'],
      ['DISCIPLINE',Math.min((trades.filter(t=>t.grade==='A+'||t.grade==='A').length/totalT)*100,100),''],
    ];
    behEl.innerHTML=behaviors.map(([l,pct,status])=>`
      <div class="sect">${l}</div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="flex:1;"><div class="rm" style="height:8px;"><div class="rf" style="width:${Math.min(pct,100)}%;background:${pct>30?'var(--red)':'var(--green)'};"></div></div></div>
        <span style="font-size:.8rem;color:${pct>30?'var(--red)':'var(--green)'};">${status||Math.round(pct)+'%'}</span>
      </div>`).join('');
  }

  // Coaching roadmap
  const rm=document.getElementById('roadmap'); if(rm) {
    const steps=[
      {period:'WEEK 1-2',color:'var(--green)',bg:'rgba(0,255,163,.05)',tip:stats.wr<60?'Focus on setup quality. Only enter on first touch of OB/FVG.':'Maintain discipline. Review each A+ setup entry criteria.'},
      {period:'WEEK 3-4',color:'var(--gold)',bg:'rgba(201,162,39,.05)',tip:'Eliminate overtrading. Set strict daily trade limit: '+riskConfig.maxTrades+' trades max.'},
      {period:'MONTH 2',color:'var(--blue)',bg:'rgba(77,184,255,.05)',tip:'Scale winning setups. Practice partial closes at 1R and let runners hit 3R+.'},
    ];
    rm.innerHTML=`<div class="fr fr3">${steps.map(s=>`<div style="padding:12px;background:${s.bg};border:1px solid ${s.color}33;border-radius:9px;"><div style="font-size:.64rem;letter-spacing:2px;color:${s.color};margin-bottom:7px;">${s.period}</div><div style="font-size:.82rem;color:var(--text2);line-height:1.6;">${s.tip}</div></div>`).join('')}</div>`;
  }

  // Suggestions
  const sg=document.getElementById('suggestions'); if(sg) {
    sg.innerHTML=generateInsights(trades).slice(0,3).map(ins=>`<div class="ic"><div class="ic-type">${ins.type}</div><div class="ic-txt">${ins.text}</div></div>`).join('');
  }

  // Mistake table
  const mt=document.getElementById('mistakeTable'); if(mt) {
    const mTypes=['Early Exit','Moved SL','FOMO Entry','Oversized','Revenge'];
    const rows=mTypes.map(m=>{
      const mt2=trades.filter(t=>t.mistakes?.includes(m));
      const pnl=mt2.reduce((a,t)=>a+Math.min(t.pnl,0),0);
      return {m,count:mt2.length,pnl};
    }).filter(r=>r.count>0);
    mt.innerHTML=rows.length?`<table class="dt"><tr><th>MISTAKE</th><th>COUNT</th><th>P&L IMPACT</th><th>TREND</th></tr>${rows.map(r=>`<tr><td>${r.m}</td><td>${r.count}</td><td class="rt">${fmt$(r.pnl)}</td><td class="grt">↓ Track</td></tr>`).join('')}</table>`:'<div style="color:var(--text3);padding:16px;font-size:.82rem;">No mistake patterns detected. Keep it up!</div>';
  }

  // DNA
  const dna=document.getElementById('dnaPro'); if(dna) {
    const style=stats.wr>60&&stats.pf>2?'PRECISION TRADER':stats.wr>55?'CONSISTENT TRADER':'DEVELOPING TRADER';
    dna.innerHTML=`<div style="margin-bottom:12px;"><div style="font-size:.82rem;color:var(--text2);margin-bottom:6px;">Trading Style</div><div class="badge bo" style="font-size:.85rem;padding:5px 12px;">${style}</div></div>
    <div class="div"></div>
    ${[['Patience Index',stats.wr,'var(--gold)'],['Risk Appetite',Math.max(0,100-stats.mdd*10),'var(--green)'],['Emotional Control',trades.filter(t=>t.emotions?.includes('Calm')).length/Math.max(1,trades.length)*100,'var(--blue)'],['Consistency',Math.min(stats.pf*25,100),'var(--gold)']].map(([l,v,c])=>`
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:.82rem;margin-bottom:9px;">
        <span style="color:var(--text3);">${l}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:110px;height:5px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;"><div style="width:${Math.min(Math.round(v),100)}%;height:100%;background:${c};"></div></div>
          <span style="color:${c};font-size:.75rem;">${Math.min(Math.round(v),100)}%</span>
        </div>
      </div>`).join('')}`;
  }
  drawRadar();
}

// =================== SETUP LAB ===================
function refreshSetupLib() {
  const el=document.getElementById('setupLibrary'); if(!el) return;
  const trades=getTrades();
  const setupsWithStats=setups.map(s=>{
    const st=trades.filter(t=>t.setup===s.name);
    const w=st.filter(t=>t.pnl>0).length;
    const pnl=st.reduce((a,t)=>a+t.pnl,0);
    const wr=st.length?w/st.length*100:0;
    return {...s,trades:st.length,wr,pnl};
  });
  el.innerHTML=setupsWithStats.map(s=>`
    <div class="card" style="cursor:pointer;" onclick="showSub('setup','builder')">
      <div class="ch"><div class="ct">${s.name}</div><span class="badge ${s.wr>60?'bg':s.wr>45?'bo':'br'}">${s.trades?s.wr.toFixed(0)+'% WR':s.wr+'% EST'}</span></div>
      <div style="font-size:.78rem;color:var(--text2);margin-bottom:9px;line-height:1.5;">${s.cat} • ${s.sess}</div>
      <div class="fr fr3" style="gap:6px;text-align:center;margin-bottom:9px;">
        <div style="padding:6px;background:var(--glass);border-radius:6px;"><div style="font-size:.6rem;color:var(--text3);">TRADES</div><div style="font-family:Orbitron,sans-serif;font-size:.9rem;" class="gt">${s.trades}</div></div>
        <div style="padding:6px;background:var(--glass);border-radius:6px;"><div style="font-size:.6rem;color:var(--text3);">MIN RR</div><div style="font-family:Orbitron,sans-serif;font-size:.9rem;" class="grt">${s.rr}</div></div>
        <div style="padding:6px;background:var(--glass);border-radius:6px;"><div style="font-size:.6rem;color:var(--text3);">P&L</div><div style="font-family:Orbitron,sans-serif;font-size:.9rem;" class="${s.pnl>=0?'grt':'rt'}">${s.trades?fmt$(s.pnl):'-'}</div></div>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-sm" onclick="event.stopPropagation();loadSetupToBuilder(${s.id})">EDIT</button>
        <button class="btn btn-sm btn-rd" onclick="event.stopPropagation();deleteSetup(${s.id})">DELETE</button>
      </div>
    </div>`).join('')+`
    <div class="card" style="border:1px dashed rgba(201,162,39,.3);cursor:pointer;" onclick="showSub('setup','builder')">
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:160px;color:var(--text3);">
        <div style="font-size:2rem;margin-bottom:8px;">+</div>
        <div style="font-size:.75rem;letter-spacing:2px;">ADD NEW SETUP</div>
      </div>
    </div>`;
}

function saveSetup() {
  const name=document.getElementById('sb_name').value.trim();
  if(!name){showToast('❌ Setup name required');return;}
  const s={id:Date.now(),name,cat:document.getElementById('sb_cat').value,sess:document.getElementById('sb_sess').value,rules:document.getElementById('sb_rules').value,inval:document.getElementById('sb_inval').value,rr:parseFloat(document.getElementById('sb_rr').value)||2,wr:parseFloat(document.getElementById('sb_wr').value)||60,notes:document.getElementById('sb_notes').value};
  setups.push(s);
  localStorage.setItem('tm_setups',JSON.stringify(setups));
  showToast('✅ Setup "'+name+'" saved!');
  refreshSetupLib();
  showSub('setup','library');
}
function loadSetupToBuilder(id) {
  const s=setups.find(s=>s.id===id); if(!s) return;
  document.getElementById('sb_name').value=s.name;
  document.getElementById('sb_rules').value=s.rules||'';
  document.getElementById('sb_inval').value=s.inval||'';
  document.getElementById('sb_rr').value=s.rr;
  document.getElementById('sb_wr').value=s.wr;
  document.getElementById('sb_notes').value=s.notes||'';
  showSub('setup','builder');
  showToast('Setup loaded for editing');
}
function deleteSetup(id) {
  if(!confirm('Delete this setup?')) return;
  setups=setups.filter(s=>s.id!==id);
  localStorage.setItem('tm_setups',JSON.stringify(setups));
  refreshSetupLib(); showToast('🗑️ Setup deleted');
}
function buildSetupStats() {
  const el=document.getElementById('setupStats'); if(!el) return;
  const trades=getTrades();
  const rows=setups.map(s=>{
    const st=trades.filter(t=>t.setup===s.name);
    const w=st.filter(t=>t.pnl>0).length;
    const pnl=st.reduce((a,t)=>a+t.pnl,0);
    const wr=st.length?w/st.length*100:0;
    const avgRR=st.length?st.reduce((a,t)=>a+t.rr,0)/st.length:0;
    return `<tr><td class="gt">${s.name}</td><td>${st.length}</td><td style="color:${wr>55?'var(--green)':'var(--red)'};">${wr.toFixed(0)}%</td><td>${avgRR.toFixed(1)}R</td><td style="color:${pnl>0?'var(--green)':'var(--red)'};">${st.length?fmt$(pnl):'-'}</td><td><span class="badge ${wr>65?'bg':wr>50?'bb':'br'}">${wr>65?'A+':wr>50?'B':'C'}</span></td></tr>`;
  });
  el.innerHTML=rows.length?`<table class="dt"><tr><th>SETUP</th><th>TRADES</th><th>WIN%</th><th>AVG R:R</th><th>P&L</th><th>SCORE</th></tr>${rows.join('')}</table>`:'<div style="color:var(--text3);padding:16px;font-size:.82rem;">No setups created yet.</div>';
}

// =================== PSYCHOLOGY ===================
function savePsychLog() {
  const sleep=parseInt(document.getElementById('t_sleep').value)||7;
  const stress=parseInt(document.getElementById('t_stress2').value)||3;
  const focus=parseInt(document.getElementById('t_focus').value)||8;
  const conf=parseInt(document.getElementById('t_conf2').value)||7;
  const score=Math.round((sleep*0.25+focus*0.3+conf*0.25+(10-stress)*0.2)*10);
  const log={date:new Date().toISOString(),sleep,stress,focus,conf,score};
  psychLogs.push(log);
  localStorage.setItem('tm_psychLogs',JSON.stringify(psychLogs));
  showToast('✅ Mental state logged! Score: '+score+'/100');
  refreshPsychology();
}

function refreshPsychology() {
  const trades=getTrades();
  const recent7=psychLogs.slice(-7);
  const avgScore=recent7.length?Math.round(recent7.reduce((a,l)=>a+l.score,0)/recent7.length):0;
  const avgFocus=recent7.length?Math.round(recent7.reduce((a,l)=>a+l.focus,0)/recent7.length*10):0;
  const aGrades=trades.filter(t=>t.grade==='A+'||t.grade==='A');
  setSafe('psy-score',avgScore.toString());
  setSafe('psy-disc',Math.round(aGrades.length/Math.max(1,trades.length)*100)+'%');
  setSafe('psy-emo',Math.round(trades.filter(t=>t.emotions?.includes('Calm')).length/Math.max(1,trades.length)*100)+'%');
  setSafe('psy-dq',Math.round(aGrades.length/Math.max(1,trades.length)*100)+'%');

  // Emotion correlation
  const ec=document.getElementById('emotionCorr'); if(ec) {
    const ems=['Calm','Confident','Anxious','Frustrated','Tired','FOMO'];
    ec.innerHTML=ems.map(em=>{
      const et=trades.filter(t=>t.emotions?.includes(em));
      const wr=et.length?et.filter(t=>t.pnl>0).length/et.length*100:null;
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 12px;background:var(--glass);border-radius:7px;margin-bottom:5px;">
        <span style="font-size:.82rem;">${em} mood → Win rate</span>
        <span style="color:${wr===null?'var(--text3)':wr>55?'var(--green)':wr>40?'var(--gold)':'var(--red)'};font-weight:700;">${wr===null?'–':wr.toFixed(0)+'%'}</span>
      </div>`;
    }).join('');
  }

  // Habit streaks
  const hs=document.getElementById('habitStreaks'); if(hs) {
    hs.innerHTML=['Meditation','Calendar Review','HTF Analysis','Journal Update'].map(h=>`
      <div style="text-align:center;padding:10px;background:var(--glass);border-radius:8px;">
        <div style="font-size:.62rem;color:var(--text3);letter-spacing:1px;">${h}</div>
        <div style="font-family:Orbitron,sans-serif;font-size:1.2rem;" class="gt">–</div>
      </div>`).join('');
  }
  buildWeaknessAnalysis();
}

function buildWeaknessAnalysis() {
  const el=document.getElementById('weaknessAnalysis'); if(!el) return;
  const trades=getTrades();
  const weaknesses=generateInsights(trades).filter(i=>i.type.includes('⚠️')||i.type.includes('🔴')||i.type.includes('🟡'));
  if(!weaknesses.length) el.innerHTML='<div class="ic"><div class="ic-type">✅ NO MAJOR WEAKNESSES</div><div class="ic-txt">Your trading psychology looks solid! Keep logging to get deeper insights.</div></div>';
  else el.innerHTML=weaknesses.map(w=>`<div class="ic"><div class="ic-type">${w.type}</div><div class="ic-txt">${w.text}</div></div>`).join('');
}

function buildPsychLog() {
  const el=document.getElementById('psychLogHistory'); if(!el) return;
  if(!psychLogs.length){el.innerHTML='<div style="color:var(--text3);padding:16px;font-size:.82rem;">No psychology logs yet. Log your daily mental state from the Overview tab.</div>';return;}
  el.innerHTML=`<table class="dt"><tr><th>DATE</th><th>SLEEP</th><th>STRESS</th><th>FOCUS</th><th>CONF</th><th>SCORE</th></tr>
    ${psychLogs.slice().reverse().map(l=>`<tr><td>${new Date(l.date).toLocaleDateString()}</td><td>${l.sleep}/10</td><td style="color:${l.stress>6?'var(--red)':'var(--green)'};">${l.stress}/10</td><td>${l.focus}/10</td><td>${l.conf}/10</td><td><span class="badge ${l.score>=75?'bg':l.score>=50?'bo':'br'}">${l.score}/100</span></td></tr>`).join('')}
    </table>`;
}

// =================== REVIEW ===================
function saveReview() {
  const lesson=document.getElementById('rev_lesson').value;
  const tomorrow=document.getElementById('rev_tomorrow').value;
  const emotion=document.getElementById('rev_emotion').value;
  const rating=document.getElementById('dr-val').textContent;
  const rev={date:new Date().toISOString(),rating,lesson,tomorrow,emotion};
  reviews.push(rev);
  localStorage.setItem('tm_reviews',JSON.stringify(reviews));
  document.getElementById('rev_lesson').value='';
  document.getElementById('rev_tomorrow').value='';
  document.getElementById('rev_emotion').value='';
  showToast('✅ Review saved!');
  buildReviewArchive();
}
function saveMission() { showToast('✅ Mission saved!'); }
function buildReviewArchive() {
  const el=document.getElementById('reviewArchive'); if(!el) return;
  if(!reviews.length){el.innerHTML='<div style="color:var(--text3);padding:14px;font-size:.82rem;">No reviews yet.</div>';return;}
  el.innerHTML=reviews.slice().reverse().slice(0,10).map(r=>`
    <div style="border:1px solid var(--border);border-radius:9px;padding:12px;margin-bottom:8px;background:var(--glass);">
      <div style="display:flex;justify-content:space-between;margin-bottom:7px;"><span style="font-size:.78rem;color:var(--text3);">${new Date(r.date).toLocaleDateString()}</span><span class="badge bo">Rating: ${r.rating}/10</span></div>
      ${r.lesson?`<div style="font-size:.82rem;color:var(--text2);margin-bottom:4px;"><strong class="gt">Lesson:</strong> ${r.lesson}</div>`:''}
      ${r.tomorrow?`<div style="font-size:.82rem;color:var(--text2);"><strong class="gt">Tomorrow:</strong> ${r.tomorrow}</div>`:''}
    </div>`).join('');
}

// =================== RISK ===================
function calcRisk() {
  const bal=parseFloat(document.getElementById('rc_bal')?.value)||10000;
  const riskPct=parseFloat(document.getElementById('rc_riskp')?.value)||1;
  const entry=parseFloat(document.getElementById('rc_entry')?.value)||1826.4;
  const sl=parseFloat(document.getElementById('rc_sl')?.value)||1822.0;
  const inst=document.getElementById('rc_inst')?.value||'gold';
  const riskAmt=bal*(riskPct/100);
  const pips=Math.abs(entry-sl);
  let lots=0;
  if(inst==='forex') lots=riskAmt/(pips*10); // forex: $10/pip per lot
  else if(inst==='gold') lots=riskAmt/(pips*100); // gold: $100/lot/point
  else if(inst==='indices') lots=riskAmt/pips;
  else lots=riskAmt/(pips*entry*0.01);
  setSafe('rc_riskamt','$'+riskAmt.toFixed(2));
  setSafe('rc_pips',pips.toFixed(2)+' pts');
  setSafe('rc_lots',Math.max(0,lots).toFixed(2)+' lots');
}
function calcRR() {
  const entry=parseFloat(document.getElementById('rr_entry')?.value)||1826.4;
  const sl=parseFloat(document.getElementById('rr_sl')?.value)||1822.0;
  const tp=parseFloat(document.getElementById('rr_tp')?.value)||1835.0;
  const risk=Math.abs(entry-sl), reward=Math.abs(tp-entry);
  const rr=risk>0?reward/risk:0;
  const bewr=rr>0?1/(1+rr)*100:0;
  setSafe('rr_risk',risk.toFixed(3));
  setSafe('rr_reward',reward.toFixed(3));
  setSafe('rr_ratio','1:'+rr.toFixed(2));
  setSafe('rr_bewr',bewr.toFixed(1)+'%');
}

function refreshRiskRules() {
  const hr=document.getElementById('hardRules'); if(hr) hr.innerHTML=`
    <div class="sect">HARD RULES</div>
    ${[['Max Risk Per Trade',riskConfig.maxRiskPct+'%','bg'],['Daily Loss Limit',riskConfig.dailyLoss+'%','bg'],['Weekly Loss Limit',riskConfig.weeklyLoss+'%','bg'],['Max Trades/Day',riskConfig.maxTrades,'br'],['Min R:R Required',riskConfig.minRR+':1','br']]
    .map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;padding:9px 12px;background:rgba(0,255,163,.04);border:1px solid rgba(0,255,163,.12);border-radius:8px;margin-bottom:6px;"><span style="font-size:.85rem;">${l}</span><span class="badge ${c}">${v}</span></div>`).join('')}`;
  
  const trades=getTrades();
  const today=new Date().toDateString();
  const todayTrades=trades.filter(t=>new Date(t.date).toDateString()===today);
  const todayPnl=todayTrades.reduce((a,t)=>a+t.pnl,0);
  const dd=riskConfig.balance>0?Math.abs(Math.min(todayPnl,0))/riskConfig.balance*100:0;
  const rs=document.getElementById('riskStatus'); if(rs) rs.innerHTML=`
    <div class="sect">TODAY STATUS</div>
    <div style="padding:10px 12px;background:var(--glass);border-radius:8px;margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:.8rem;"><span style="color:var(--text3);">Daily DD</span><span style="color:${dd>riskConfig.dailyLoss*0.7?'var(--red)':'var(--gold)'};">${dd.toFixed(1)}% / ${riskConfig.dailyLoss}%</span></div>
      <div class="rm"><div class="rf" style="width:${Math.min(dd/riskConfig.dailyLoss*100,100)}%;background:${dd>riskConfig.dailyLoss*0.7?'var(--red)':'var(--green)'}"></div></div>
    </div>
    <div style="padding:10px 12px;background:var(--glass);border-radius:8px;margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:.8rem;"><span style="color:var(--text3);">Trades Today</span><span class="grt">${todayTrades.length} / ${riskConfig.maxTrades}</span></div>
      <div class="rm"><div class="rf" style="width:${Math.min(todayTrades.length/riskConfig.maxTrades*100,100)}%;background:var(--green)"></div></div>
    </div>
    <div style="padding:10px 12px;background:${dd<riskConfig.dailyLoss&&todayTrades.length<riskConfig.maxTrades?'rgba(0,255,163,.05)':'rgba(255,77,106,.05)'};border:1px solid ${dd<riskConfig.dailyLoss&&todayTrades.length<riskConfig.maxTrades?'rgba(0,255,163,.2)':'rgba(255,77,106,.2)'};border-radius:8px;text-align:center;">
      <div style="font-size:.64rem;color:var(--text3);letter-spacing:2px;margin-bottom:4px;">STATUS</div>
      <div style="font-family:Orbitron,sans-serif;font-size:.9rem;color:${dd<riskConfig.dailyLoss&&todayTrades.length<riskConfig.maxTrades?'var(--green)':'var(--red)'};">${dd<riskConfig.dailyLoss&&todayTrades.length<riskConfig.maxTrades?'✅ CLEARED':'❌ LIMITS HIT'}</div>
    </div>`;
}

function saveRiskConfig() {
  riskConfig={
    maxRiskPct:parseFloat(document.getElementById('cfg_risk')?.value)||1,
    dailyLoss:parseFloat(document.getElementById('cfg_daily')?.value)||3,
    weeklyLoss:parseFloat(document.getElementById('cfg_weekly')?.value)||5,
    maxTrades:parseInt(document.getElementById('cfg_maxtr')?.value)||5,
    minRR:parseFloat(document.getElementById('cfg_minrr')?.value)||1.5,
    balance:parseFloat(document.getElementById('cfg_bal')?.value)||10000,
  };
  localStorage.setItem('tm_riskConfig',JSON.stringify(riskConfig));
  showToast('✅ Risk config saved!');
}
function openRulesModal() { showToast('Edit rules in Settings → Risk Config'); showTab('settings'); showSub('settings','risk'); }

function runSimulator() {
  const bal=parseFloat(document.getElementById('sim_bal').value)||10000;
  const ret=parseFloat(document.getElementById('sim_ret').value)||8;
  const contrib=parseFloat(document.getElementById('sim_contrib').value)||0;
  const res=document.getElementById('simResults'); if(!res) return;
  const months=[3,6,12,24,36];
  const vals=months.map(m=>{
    let b=bal;
    for(let i=0;i<m;i++){b=b*(1+ret/100)+contrib;}
    return b;
  });
  res.innerHTML=months.map((m,i)=>`<div style="text-align:center;padding:12px;background:var(--glass);border-radius:9px;">
    <div style="font-size:.62rem;color:var(--text3);letter-spacing:1px;margin-bottom:5px;">${m} MONTHS</div>
    <div style="font-family:Orbitron,sans-serif;font-size:1.05rem;" class="${vals[i]>=bal?'grt':'rt'}">$${vals[i].toLocaleString('en',{maximumFractionDigits:0})}</div>
    <div style="font-size:.64rem;color:var(--text3);margin-top:3px;">+${((vals[i]-bal)/bal*100).toFixed(0)}%</div>
  </div>`).join('');
  showToast('✅ Simulation complete!');
}

// =================== REPORTS ===================
function refreshReports() {
  refreshWAReport();
  const snap=document.getElementById('reportSnapshot'); if(!snap) return;
  const trades=getTrades();
  const stats=calcStats(trades);
  snap.innerHTML=`<div class="g4">
    ${[['Total Trades',stats.total,'gt'],['Win Rate',stats.wr.toFixed(1)+'%','grt'],['Profit Factor',stats.pf.toFixed(2),'bt'],['Total P&L',fmt$(stats.totalPnl),stats.totalPnl>=0?'grt':'rt']].map(([l,v,c])=>`
    <div style="text-align:center;padding:12px;background:var(--glass);border-radius:9px;">
      <div style="font-size:.64rem;color:var(--text3);letter-spacing:1px;margin-bottom:5px;">${l}</div>
      <div style="font-family:Orbitron,sans-serif;font-size:1.1rem;" class="${c}">${v}</div>
    </div>`).join('')}
  </div>`;
}
function refreshWAReport() {
  const el=document.getElementById('waReport'); if(!el) return;
  const trades=getTrades();
  const today=new Date().toDateString();
  const todayTrades=trades.filter(t=>new Date(t.date).toDateString()===today);
  const pnl=todayTrades.reduce((a,t)=>a+t.pnl,0);
  const wins=todayTrades.filter(t=>t.pnl>0),losses=todayTrades.filter(t=>t.pnl<0);
  const wr=todayTrades.length?wins.length/todayTrades.length*100:0;
  const stats=calcStats(trades);
  el.textContent=`📊 *TRADEMATRIX PRO — DAILY REPORT*
📅 Date: ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}
━━━━━━━━━━━━━━━━━━━━━
💰 *P&L Today:* ${pnl>=0?'+':''}$${pnl.toFixed(2)} ${pnl>=0?'✅':'❌'}
📈 *Trades:* ${todayTrades.length} (${wins.length}W / ${losses.length}L)
🎯 *Win Rate Today:* ${wr.toFixed(0)}%
⚖️ *Avg R:R:* ${todayTrades.length?((todayTrades.reduce((a,t)=>a+t.rr,0))/todayTrades.length).toFixed(1):0}R
━━━━━━━━━━━━━━━━━━━━━
📊 *OVERALL STATS*
Total Trades: ${stats.total}
Overall Win Rate: ${stats.wr.toFixed(1)}%
Profit Factor: ${stats.pf.toFixed(2)}
Expectancy: $${stats.exp.toFixed(2)}
Total P&L: ${stats.totalPnl>=0?'+':''}$${stats.totalPnl.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━
🏆 Best Trade: ${wins.length?wins.sort((a,b)=>b.pnl-a.pnl)[0].pair+' +$'+wins[0].pnl.toFixed(2):'None today'}
😞 Worst: ${losses.length?losses.sort((a,b)=>a.pnl-b.pnl)[0].pair+' -$'+Math.abs(losses[0].pnl).toFixed(2):'None today'}
━━━━━━━━━━━━━━━━━━━━━
🤖 Generated by TradeMatrix Pro`;
}
function copyWAReport() {
  const txt=document.getElementById('waReport')?.textContent||'';
  navigator.clipboard?.writeText(txt).then(()=>showToast('📋 Report copied!'));
}
function waShare() {
  const txt=document.getElementById('waReport')?.textContent||'';
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
}

// =================== ACCOUNTS ===================
function refreshAccounts() {
  const el=document.getElementById('accountsList'); if(!el) return;
  el.innerHTML=accounts.map(a=>`
    <div class="card" style="${a.id===currentAcct?'border-color:var(--border2);':''}" >
      <div class="ch"><div class="ct">${a.name}</div><span class="badge ${a.type==='Funded'?'bg':a.type==='Challenge'?'bo':'bb'}">${a.type}</span></div>
      <div style="font-size:.82rem;color:var(--text2);margin-bottom:10px;">${a.firm||'Personal'} • $${(a.balance||0).toLocaleString()}</div>
      ${a.id===currentAcct?'<div class="badge bg" style="margin-bottom:10px;">● ACTIVE</div>':''}
      <div style="font-size:.82rem;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="color:var(--text3);">Trades</span><span class="gt">${JSON.parse(localStorage.getItem('tm_trades_'+a.id)||'[]').length}</span></div>
      </div>
      <div style="display:flex;gap:7px;">
        ${a.id!==currentAcct?`<button class="btn btn-sm btn-gr" onclick="switchAccount(${a.id})">SWITCH</button>`:''}
        <button class="btn btn-sm btn-rd" onclick="deleteAccount(${a.id})">DELETE</button>
      </div>
    </div>`).join('')+`
  <div class="card" style="border:1px dashed rgba(201,162,39,.3);cursor:pointer;" onclick="openMo('addAcctModal')">
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:160px;color:var(--text3);">
      <div style="font-size:2rem;margin-bottom:8px;">+</div>
      <div style="font-size:.75rem;letter-spacing:2px;">ADD ACCOUNT</div>
    </div>
  </div>`;

  // Compare
  const comp=document.getElementById('accountCompare'); if(comp) {
    const acctData=accounts.map(a=>{
      const at=JSON.parse(localStorage.getItem('tm_trades_'+a.id)||'[]');
      const st=calcStats(at);
      return {a,st};
    });
    comp.innerHTML=`<table class="dt"><tr><th>METRIC</th>${acctData.map(d=>`<th>${d.a.name}</th>`).join('')}</tr>
      ${[['Win Rate',d=>d.st.wr.toFixed(1)+'%'],['Profit Factor',d=>d.st.pf.toFixed(2)],['Total P&L',d=>fmt$(d.st.totalPnl)],['Total Trades',d=>d.st.total.toString()]].map(([l,fn])=>`<tr><td>${l}</td>${acctData.map(d=>`<td>${fn(d)}</td>`).join('')}</tr>`).join('')}
    </table>`;
  }
}
function switchAccount(id) {
  currentAcct=id; localStorage.setItem('tm_acct',id);
  const a=accounts.find(a=>a.id===id);
  document.getElementById('acctBadge').textContent=a?a.name:'ACCT #'+id;
  refreshAccounts(); refreshDashboard(); buildTradeLog(); refreshAnalytics(); refreshAI();
  showToast('✅ Switched to '+a?.name);
}
function deleteAccount(id) {
  if(accounts.length<=1){showToast('❌ Cannot delete last account');return;}
  if(!confirm('Delete this account and all its trades?')) return;
  accounts=accounts.filter(a=>a.id!==id);
  localStorage.removeItem('tm_trades_'+id);
  localStorage.setItem('tm_accounts',JSON.stringify(accounts));
  if(currentAcct===id) switchAccount(accounts[0].id);
  refreshAccounts(); showToast('🗑️ Account deleted');
}
function saveAccount() {
  const name=document.getElementById('na_name').value.trim();
  if(!name){showToast('❌ Account name required');return;}
  const a={id:Date.now(),name,type:document.getElementById('na_type').value,balance:parseFloat(document.getElementById('na_bal').value)||0,firm:document.getElementById('na_firm').value};
  accounts.push(a);
  localStorage.setItem('tm_accounts',JSON.stringify(accounts));
  closeMo('addAcctModal');
  refreshAccounts(); showToast('✅ Account added!');
}

// =================== PERFORMANCE STATS ===================
function buildPerfStats() {
  const trades=getTrades();
  const stats=calcStats(trades);
  setSafe('p-total',stats.total.toString());
  const avgRR=trades.length?trades.reduce((a,t)=>a+t.rr,0)/trades.length:0;
  setSafe('p-rr',avgRR.toFixed(2));
  setSafe('p-mdd','-'+stats.mdd.toFixed(1)+'%');
  const sharpe=stats.totalPnl>0&&trades.length?stats.totalPnl/Math.sqrt(trades.length)/Math.max(1,stats.avgL)*0.5:0;
  setSafe('p-sharpe',Math.max(0,sharpe).toFixed(2));
  // Pair breakdown
  const pb=document.getElementById('pairBreakdown'); if(pb) {
    const pairMap={};
    trades.forEach(t=>{ if(!pairMap[t.pair])pairMap[t.pair]={w:0,total:0,pnl:0}; pairMap[t.pair].total++; if(t.pnl>0)pairMap[t.pair].w++; pairMap[t.pair].pnl+=t.pnl; });
    pb.innerHTML=Object.entries(pairMap).sort((a,b)=>b[1].pnl-a[1].pnl).slice(0,5).map(([p,d])=>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;background:var(--glass);border-radius:7px;margin-bottom:5px;font-size:.82rem;">
        <span class="gt">${p}</span><span style="color:var(--text3);">${d.total}tr</span>
        <span style="color:${d.w/d.total>0.55?'var(--green)':'var(--red)'};">${(d.w/d.total*100).toFixed(0)}%</span>
        <span style="color:${d.pnl>0?'var(--green)':'var(--red)'};font-weight:700;">${fmt$(d.pnl)}</span>
      </div>`).join('')||'<div style="color:var(--text3);font-size:.82rem;padding:10px;">No trades yet.</div>';
  }
}

// =================== GOALS ===================
function openGoalModal() { openMo('goalModal'); }
function saveGoal() {
  const name=document.getElementById('goal_name').value.trim();
  if(!name){showToast('❌ Goal name required');return;}
  const g={id:Date.now(),name,target:parseFloat(document.getElementById('goal_target').value)||100,unit:document.getElementById('goal_unit').value,current:parseFloat(document.getElementById('goal_current').value)||0};
  goals.push(g);
  localStorage.setItem('tm_goals',JSON.stringify(goals));
  closeMo('goalModal');
  buildGoals(); showToast('✅ Goal added!');
}
function buildGoals() {
  const el=document.getElementById('goalsList'); if(!el) return;
  if(!goals.length){el.innerHTML='<div style="color:var(--text3);font-size:.82rem;padding:14px;">No goals set. Add your first goal!</div>';return;}
  el.innerHTML=goals.map(g=>{
    const pct=Math.min(g.current/g.target*100,100);
    return `<div class="goal-card" style="margin-bottom:8px;">
      <div class="goal-title">${g.name}</div>
      <div class="goal-progress"><span style="color:var(--text3);">${g.current}${g.unit} / ${g.target}${g.unit}</span><span class="gt">${pct.toFixed(0)}%</span></div>
      <div class="rm" style="height:8px;"><div class="rf" style="width:${pct}%;background:${pct>=100?'var(--green)':'var(--gold)'}"></div></div>
    </div>`;
  }).join('');
}
function buildAchievements() {
  const el=document.getElementById('achievementsList'); if(!el) return;
  const trades=getTrades();
  const stats=calcStats(trades);
  const achievements=[];
  if(stats.total>=1) achievements.push({icon:'🎯',title:'First Trade',desc:'Logged your first trade'});
  if(stats.total>=10) achievements.push({icon:'📊',title:'10 Trades',desc:'Consistency building'});
  if(stats.total>=50) achievements.push({icon:'💎',title:'50 Trades',desc:'Serious trader'});
  if(stats.wr>=60) achievements.push({icon:'🏆',title:'60% Win Rate',desc:'Strong edge detected'});
  if(stats.pf>=2) achievements.push({icon:'⭐',title:'Profit Factor 2+',desc:'Institutional quality edge'});
  if(!achievements.length) achievements.push({icon:'🌱',title:'Getting Started',desc:'Add trades to unlock achievements'});
  el.innerHTML=achievements.map(a=>`<div class="ach-card"><div class="ach-icon">${a.icon}</div><div><div class="ach-title">${a.title}</div><div class="ach-desc">${a.desc}</div></div></div>`).join('');
}


// =================== V2 FEATURE ADDITIONS ===================

// ===== CHALLENGES =====
let challenges = JSON.parse(localStorage.getItem('tm_challenges') || '[]');
let students = JSON.parse(localStorage.getItem('tm_students') || JSON.stringify([
  {id:1,name:'Rahul S.',avatar:'R',wr:68,trades:42,pnl:2840,rank:1,badge:'Gold'},
  {id:2,name:'Priya M.',avatar:'P',wr:61,trades:31,pnl:1920,rank:2,badge:'Silver'},
  {id:3,name:'Arjun K.',avatar:'A',wr:55,trades:28,pnl:980,rank:3,badge:'Bronze'},
]));
let chatHistory = JSON.parse(localStorage.getItem('tm_chat') || '[]');
let currentPlatform = 'instagram';

// ===== SESSION CLOCK =====
const SESSIONS = [
  {name:'SYDNEY',open:21,close:6,color:'var(--blue)'},
  {name:'TOKYO',open:23,close:8,color:'var(--purple)'},
  {name:'LONDON',open:7,close:16,color:'var(--gold)'},
  {name:'NEW YORK',open:12,close:21,color:'var(--green)'},
];
function getSessionStatus(open, close) {
  const now = new Date();
  const utcH = now.getUTCHours() + now.getUTCMinutes()/60;
  let isOpen;
  if(open > close) isOpen = utcH >= open || utcH < close;
  else isOpen = utcH >= open && utcH < close;
  return isOpen ? 'live' : (Math.abs(utcH - open) < 1 ? 'soon' : 'closed');
}
function formatSessionTime(open, close) {
  const pad = n => String(n).padStart(2,'0');
  return `${pad(open)}:00 – ${pad(close)}:00 UTC`;
}
function buildSessionClock() {
  const el = document.getElementById('sessionClockEl'); if(!el) return;
  el.innerHTML = SESSIONS.map(s => {
    const st = getSessionStatus(s.open, s.close);
    return `<div class="sess-card ${st}">
      <div class="sess-name">${s.name}</div>
      <div class="sess-status" style="color:${st==='live'?'var(--green)':st==='soon'?'var(--gold)':'var(--text3)'}">${st==='live'?'🟢 LIVE':st==='soon'?'🟡 SOON':'⚫ CLOSED'}</div>
      <div class="sess-time">${formatSessionTime(s.open,s.close)}</div>
    </div>`;
  }).join('');
}
setInterval(buildSessionClock, 60000);

// ===== PNL TARGETS =====
let pnlTargets = JSON.parse(localStorage.getItem('tm_targets') || JSON.stringify({daily:200, weekly:1000, monthly:4000}));
function buildTargetBars() {
  const el = document.getElementById('targetBarsEl'); if(!el) return;
  const trades = getTrades();
  const today = new Date().toDateString();
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(); monthStart.setDate(1);
  const dailyPnl = trades.filter(t=>new Date(t.date).toDateString()===today).reduce((a,t)=>a+t.pnl,0);
  const weeklyPnl = trades.filter(t=>new Date(t.date)>=weekStart).reduce((a,t)=>a+t.pnl,0);
  const monthlyPnl = trades.filter(t=>new Date(t.date)>=monthStart).reduce((a,t)=>a+t.pnl,0);
  const targets = [
    {label:'Daily Target',current:dailyPnl,target:pnlTargets.daily},
    {label:'Weekly Target',current:weeklyPnl,target:pnlTargets.weekly},
    {label:'Monthly Target',current:monthlyPnl,target:pnlTargets.monthly},
  ];
  el.innerHTML = targets.map(t => {
    const pct = Math.min(Math.max(t.current/t.target*100,0),100);
    const clr = pct>=100?'var(--green)':pct>=70?'var(--gold)':'var(--blue)';
    return `<div class="target-card">
      <div class="target-head">
        <span style="color:var(--text3);font-size:.72rem;letter-spacing:1px;">${t.label}</span>
        <span style="color:${t.current>=0?'var(--green)':'var(--red)'};font-weight:700;">$${t.current.toFixed(0)} / $${t.target}</span>
      </div>
      <div class="target-bar"><div class="target-fill" style="width:${pct}%;background:${clr};"></div></div>
      <div style="font-size:.68rem;color:var(--text3);">${pct.toFixed(0)}% achieved</div>
    </div>`;
  }).join('');
}

// ===== ECONOMIC CALENDAR =====
const ECO_EVENTS = [
  {time:'08:30',impact:'high',name:'USD Non-Farm Payrolls',curr:'USD',prev:'175K',fore:'190K'},
  {time:'10:00',impact:'med',name:'EUR Consumer Confidence',curr:'EUR',prev:'-17.1',fore:'-16.5'},
  {time:'13:30',impact:'high',name:'GBP CPI y/y',curr:'GBP',prev:'2.2%',fore:'2.1%'},
  {time:'15:00',impact:'low',name:'CAD Manufacturing PMI',curr:'CAD',prev:'51.3',fore:'51.8'},
  {time:'17:30',impact:'high',name:'US FOMC Statement',curr:'USD',prev:'—',fore:'—'},
  {time:'20:00',impact:'med',name:'JPY Tankan Index',curr:'JPY',prev:'13',fore:'15'},
];
function buildEcoCalendar() {
  const el = document.getElementById('ecoCalEl'); if(!el) return;
  el.innerHTML = ECO_EVENTS.map(e => `
    <div class="eco-item">
      <span class="eco-time">${e.time}</span>
      <span class="eco-impact eco-${e.impact}"></span>
      <span class="eco-curr" style="color:var(--text2);">${e.curr}</span>
      <span class="eco-name">${e.name}</span>
      <span class="eco-prev" style="color:var(--text3);">P: ${e.prev}</span>
      <span class="eco-fore" style="color:var(--gold);">F: ${e.fore}</span>
    </div>`).join('');
}

// ===== CONTENT STUDIO =====
function setPlatform(p) {
  currentPlatform = p;
  document.querySelectorAll('.cs-platform-btn').forEach(b=>b.classList.remove('active'));
  const btn = document.getElementById('plt-'+p.substring(0,2));
  if(btn) btn.classList.add('active');
}
function loadTradeForContent() {
  const trades = getTrades();
  const sel = document.getElementById('cs_trade_sel');
  if(!sel) return;
  const val = sel.value;
  if(!val) return;
  const t = trades.find(tr=>tr.id===parseInt(val));
  if(t) generateContent(t);
}
function populateTradeSelect() {
  const sel = document.getElementById('cs_trade_sel'); if(!sel) return;
  const trades = getTrades();
  sel.innerHTML = '<option value="">— Select a trade —</option>' +
    trades.slice().reverse().slice(0,20).map(t=>`<option value="${t.id}">${new Date(t.date).toLocaleDateString()} | ${t.pair} ${t.dir} | ${t.pnl>=0?'+':''}$${t.pnl.toFixed(0)} | Grade: ${t.grade}</option>`).join('');
}
function generateContent(trade) {
  const trades = getTrades();
  const t = trade || trades.find(tr=>tr.id===parseInt(document.getElementById('cs_trade_sel')?.value));
  if(!t) { showToast('❌ Select a trade first'); return; }
  const style = document.getElementById('cs_style')?.value || 'Educational Breakdown';
  const brand = document.getElementById('cs_brand')?.value || '@TradeMatrix';
  const rr = t.rr > 0 ? `+${t.rr}R` : `${t.rr}R`;
  const pnlStr = t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`;
  let content = '';
  if(currentPlatform === 'instagram') {
    content = generateIG(t, pnlStr, rr, style, brand);
  } else if(currentPlatform === 'twitter') {
    content = generateTwitter(t, pnlStr, rr, brand);
  } else if(currentPlatform === 'telegram') {
    content = generateTelegram(t, pnlStr, rr, brand);
  } else {
    content = generateYT(t, pnlStr, rr, brand);
  }
  const el = document.getElementById('csBody'); if(el) el.textContent = content;
  const cc = document.getElementById('csCharCount'); if(cc) cc.textContent = content.length;
}

function generateIG(t, pnlStr, rr, style, brand) {
  const emojis = t.pnl >= 0 ? '🟢📈💰' : '🔴📉⚠️';
  return `${emojis} ${t.pair} ${t.dir} — ${pnlStr} | ${rr} ✅

📋 TRADE BREAKDOWN:
Pair: ${t.pair} | Direction: ${t.dir}
Entry: ${t.entry} | Exit: ${t.exit}
Setup: ${t.setup}
Risk:Reward: ${t.rr}R | Grade: ${t.grade}

📊 ANALYSIS:
${t.logic || 'Clean setup with HTF alignment and institutional confirmation. Entry taken on first touch of the key level.'}

🧠 LESSON:
${t.notes || 'Patience is the edge. Waited for confluence before entering.'}

💡 ${style === 'Risk Management' ? 'Risk was capped at 1% of account. No matter what the market does, capital is protected.' : 'Setup quality over quantity. This is why we wait.'}

Follow for daily institutional-level analysis.

${brand}
#ForexTrading #${t.pair} #ICT #SMC #TradingJournal #TradeMatrix #Forex #Prop`;
}

function generateTwitter(t, pnlStr, rr, brand) {
  return `🧵 TRADE BREAKDOWN: ${t.pair} ${t.dir} ${pnlStr} [Thread 1/5]

Setup: ${t.setup}
Entry: ${t.entry}
Exit: ${t.exit}
R:R: ${t.rr}R → Grade: ${t.grade}

Here's exactly what I saw and why I took this trade 👇

[2/5] HTF Analysis:
${t.htf || 'Bullish'} bias confirmed on H4/D1.
Price was at a premium/discount zone.
Liquidity swept before entry.

[3/5] Entry Logic:
${t.logic || 'BOS confirmed on lower timeframe. FVG formed, waited for retest. Entered on first touch with SL below structure.'}

[4/5] Psychology:
${(t.emotions||['Calm']).join(', ')} mindset.
Followed the plan. No FOMO.
Graded: ${t.grade} — executed as planned.

[5/5] Key Lesson:
${t.notes || 'Trust the process. The edge is real when you stay disciplined.'}

${brand} | #${t.pair} #PropTrading #ICT`;
}

function generateTelegram(t, pnlStr, rr, brand) {
  return `📊 *TRADE ALERT — ${t.pair}*

*Direction:* ${t.dir}
*Entry:* \`${t.entry}\`
*Exit:* \`${t.exit}\`
*SL:* \`${t.sl||'—'}\` | *TP:* \`${t.tp||'—'}\`
*Lot Size:* ${t.lot||0.01}

*Result:* ${pnlStr} | *R:R:* ${rr}
*Setup:* ${t.setup}
*Session:* ${t.session||'London'}
*Grade:* ${t.grade}

*Analysis:*
${t.logic||'Clean institutional setup with full confluence.'}

${brand} | #${t.pair} #TradeMatrix`;
}

function generateYT(t, pnlStr, rr, brand) {
  return `[YOUTUBE SCRIPT] — ${t.pair} Trade Breakdown

🎬 HOOK (0-15 seconds):
"I made ${pnlStr} on ${t.pair} today using this exact setup. Let me break down every single decision I made — entry, exit, and the psychology behind it."

📋 INTRO (15-60 seconds):
"Welcome back. Today I'm going to walk you through a live ${t.setup} trade on ${t.pair} during the ${t.session||'London'} session. This is the kind of trade that separated profitable traders from retail losers."

📊 TRADE BREAKDOWN (1-5 minutes):
"First, let's look at the higher timeframe. I identified a ${t.htf||'bullish'} bias on the daily chart..."
Entry: ${t.entry} | Exit: ${t.exit} | R:R: ${t.rr}

"The setup was ${t.setup}. Here's what I was looking for: [SHOW CHART]"
${t.logic||'Price swept liquidity, formed BOS, entry on FVG retest.'}

🧠 PSYCHOLOGY (5-7 minutes):
"My emotional state was ${(t.emotions||['Calm']).join(', ')}. This matters more than you think..."
Grade I gave myself: ${t.grade}

💡 LESSON (7-8 minutes):
${t.notes||'Quality over quantity. One great trade beats ten average ones.'}

🎯 OUTRO (8-10 minutes):
"If you want to journal your trades like this and get AI analysis, check out TradeMatrix Pro."

${brand}`;
}

function generateWeeklyPost() {
  const trades = getTrades();
  const week = new Date(); week.setDate(week.getDate() - 7);
  const wt = trades.filter(t=>new Date(t.date)>=week);
  const pnl = wt.reduce((a,t)=>a+t.pnl,0);
  const wr = wt.length ? wt.filter(t=>t.pnl>0).length/wt.length*100 : 0;
  const brand = document.getElementById('cs_brand')?.value || '@TradeMatrix';
  const post = `📊 WEEKLY PERFORMANCE REPORT

Week of ${new Date(week).toLocaleDateString()} — ${new Date().toLocaleDateString()}

💰 Total P&L: ${pnl>=0?'+':''}$${pnl.toFixed(2)}
📈 Trades: ${wt.length} (${wt.filter(t=>t.pnl>0).length}W / ${wt.filter(t=>t.pnl<0).length}L)
🎯 Win Rate: ${wr.toFixed(1)}%
⚖️ Best Trade: ${wt.length?wt.sort((a,b)=>b.pnl-a.pnl)[0]?.pair+' +$'+wt[0]?.pnl.toFixed(0):'—'}

${pnl>0?'Green week. The process works. Keep showing up.':'Every loss is a lesson. Adjustments made. Next week is the comeback.'}

${brand} #ForexTrading #WeeklyRecap #TradeMatrix`;
  const el = document.getElementById('weeklyPost'); if(el) el.querySelector('.cs-post-body').textContent = post;
}

function generateInstagramCarousel() {
  const trades = getTrades().slice(-5).filter(t=>t.pnl>0);
  const el = document.getElementById('igCarouselSlides'); if(!el) return;
  if(!trades.length){el.innerHTML='<div style="color:var(--text3);padding:16px;grid-column:1/-1;">No winning trades to showcase yet.</div>';return;}
  el.innerHTML = trades.map((t,i)=>`
    <div style="background:linear-gradient(135deg,#0f1420,#1a2035);border:1px solid var(--border2);border-radius:14px;padding:18px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--gold),var(--green));"></div>
      <div style="font-size:.65rem;letter-spacing:2px;color:var(--text3);margin-bottom:8px;">SLIDE ${i+1}</div>
      <div style="font-family:Orbitron,sans-serif;font-size:1rem;color:var(--gold);margin-bottom:8px;">${t.pair}</div>
      <div style="font-size:1.4rem;font-weight:700;color:var(--green);font-family:Orbitron,sans-serif;margin-bottom:8px;">+$${t.pnl.toFixed(0)}</div>
      <div style="font-size:.78rem;color:var(--text2);">${t.setup} | ${t.rr}R | Grade: ${t.grade}</div>
    </div>`).join('');
  showToast('✅ Carousel generated!');
}

function generateTwitterThread() {
  const trades = getTrades().slice(-3);
  const el = document.getElementById('twitterThread'); if(!el) return;
  const brand = document.getElementById('cs_brand')?.value || '@TradeMatrix';
  if(!trades.length){el.innerHTML='<div style="color:var(--text3);padding:16px;">No trades yet.</div>';return;}
  el.innerHTML = [`🧵 My last ${trades.length} trades — full breakdown [Thread]`,
    ...trades.map((t,i)=>`[${i+2}/${trades.length+2}] ${t.pair} ${t.dir}: ${t.pnl>=0?'+':''}$${t.pnl.toFixed(0)} | ${t.setup} | Grade: ${t.grade}`),
    `[${trades.length+2}/${trades.length+2}] If you want to journal like this, I use TradeMatrix Pro. ${brand}`
  ].map((txt,i)=>`
    <div style="background:var(--glass);border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:.85rem;color:var(--text2);">
      <div style="font-size:.62rem;color:var(--text3);margin-bottom:5px;">TWEET ${i+1}</div>
      ${txt}
      <div style="display:flex;justify-content:space-between;margin-top:8px;">
        <span style="font-size:.68rem;color:var(--text3);">${txt.length} chars</span>
        <button class="btn btn-sm" onclick="navigator.clipboard?.writeText(\`${txt.replace(/`/g,"'")}\`);showToast('Copied!')">COPY</button>
      </div>
    </div>`).join('');
  showToast('✅ Thread generated!');
}

function generateTelegramPost() {
  const trades = getTrades().slice(-1)[0];
  if(!trades){document.getElementById('telegramPost').textContent='No trades yet.';return;}
  const brand = document.getElementById('cs_brand')?.value||'@TradeMatrix';
  const post = generateTelegram(trades, `${trades.pnl>=0?'+':''}$${Math.abs(trades.pnl).toFixed(2)}`, `${trades.rr}R`, brand);
  document.getElementById('telegramPost').textContent = post;
  showToast('✅ Telegram post ready!');
}

function generateYouTubeScript() {
  const trades = getTrades().slice(-1)[0];
  if(!trades){document.getElementById('ytScript').textContent='No trades yet.';return;}
  const brand = document.getElementById('cs_brand')?.value||'@TradeMatrix';
  const script = generateYT(trades, `${trades.pnl>=0?'+':''}$${Math.abs(trades.pnl).toFixed(2)}`, `${trades.rr}R`, brand);
  document.getElementById('ytScript').textContent = script;
  showToast('✅ YouTube script ready!');
}

function copyContent() {
  const txt = document.getElementById('csBody')?.textContent||'';
  navigator.clipboard?.writeText(txt).then(()=>{showToast('📋 Content copied!');});
}
function shareContent() { copyContent(); showToast('📤 Copied! Paste to share.'); }
function copyTelegramPost() { navigator.clipboard?.writeText(document.getElementById('telegramPost')?.textContent||'').then(()=>showToast('📋 Copied!')); }

// ===== AI MENTOR =====
const AI_RESPONSES = {
  'why am i losing': (stats,trades) => `Based on your ${stats.total} trades, I can see several patterns:

1. Your overall win rate is ${stats.wr.toFixed(1)}% — ${stats.wr>=55?'above average, good.':'below 55%, needs work.'}

2. ${trades.filter(t=>t.emotions?.includes('FOMO')).length} FOMO trades detected with ${trades.filter(t=>t.emotions?.includes('FOMO')).length?Math.round(trades.filter(t=>t.emotions?.includes('FOMO')).filter(t=>t.pnl>0).length/trades.filter(t=>t.emotions?.includes('FOMO')).length*100):0}% win rate.

3. Profit factor: ${stats.pf.toFixed(2)} — ${stats.pf>=1.5?'healthy.':'needs improvement.'}

Focus on: Trade quality, not quantity. Only enter when all confluence is present.`,
  'analyze': (stats,trades) => `📊 TRADE ANALYSIS REPORT

Total Trades: ${stats.total}
Win Rate: ${stats.wr.toFixed(1)}%
Profit Factor: ${stats.pf.toFixed(2)}
Expectancy: $${stats.exp.toFixed(2)}/trade
Total P&L: $${stats.totalPnl.toFixed(2)}

Best Setup: ${getBestSetup(trades)}
Best Session: ${getBestSession(trades)}

${stats.pf>=2?'✅ Your edge is STRONG. Scale carefully.':stats.pf>=1?'⚠️ Edge exists but can be improved.':'❌ Negative edge detected. Review your strategy.'}`,
  'biggest weakness': (stats,trades) => `🔍 WEAKNESS ANALYSIS

FOMO trades: ${trades.filter(t=>t.emotions?.includes('FOMO')).length} (often underperform)
Revenge trades: ${trades.filter(t=>t.emotions?.includes('Revenge')).length} (high risk)
Rule breaks (F grade): ${trades.filter(t=>t.grade==='F').length}

Primary weakness: ${trades.filter(t=>t.emotions?.includes('FOMO')).length>2?'FOMO — you enter before confirmation.':trades.filter(t=>t.grade==='F').length>2?'Rule breaking — discipline is your edge.':'Inconsistency — performance varies significantly.'}`,
  'setup': (stats,trades) => `🎯 SETUP RECOMMENDATIONS

Best performing: ${getBestSetup(trades)}

Focus on setups with:
• Win rate > 60%
• R:R > 2:1
• HTF alignment
• Session match

Drop setups with < 45% win rate over 20+ trades.

Your current edge: ${getBestSetup(trades)} during ${getBestSession(trades)}. Double down here.`,
  'improve': (stats,trades) => `📈 WIN RATE IMPROVEMENT PLAN

1. Only trade A and A+ setups
2. Maximum ${Math.min(3,riskConfig.maxTrades)} trades per session
3. Stop after 2 consecutive losses
4. Review every trade same day
5. Focus on ${getBestSession(trades)} only for 30 days

If you follow these rules, win rate should improve by 10-15% within 30 trades.`,
  'overtrading': (stats,trades) => { const daily={}; trades.forEach(t=>{const d=new Date(t.date).toDateString();daily[d]=(daily[d]||0)+1;}); const maxDay=Math.max(...Object.values(daily),0); return `🔥 OVERTRADING CHECK

Max trades in one day: ${maxDay}
Your limit: ${riskConfig.maxTrades}
${maxDay>riskConfig.maxTrades?'⚠️ YES — You have overtraded.':'✅ No overtrading detected.'}

Average trades per day: ${(stats.total/Math.max(Object.keys(daily).length,1)).toFixed(1)}

Recommendation: Set hard limit of ${riskConfig.maxTrades} trades/day. Quality beats quantity always.`; },
  'full review': (stats,trades) => `📋 FULL PERFORMANCE REVIEW

━━ STATISTICS ━━
Trades: ${stats.total} | WR: ${stats.wr.toFixed(1)}% | PF: ${stats.pf.toFixed(2)}
Expectancy: $${stats.exp.toFixed(2)} | Max DD: ${stats.mdd.toFixed(1)}%

━━ STRENGTHS ━━
${stats.pf>=2?'✅ Excellent profit factor':''}${stats.wr>=60?'\n✅ Win rate above average':''}

━━ WEAKNESSES ━━
${trades.filter(t=>t.grade==='F').length>0?`❌ ${trades.filter(t=>t.grade==='F').length} rule breaks detected`:''}${trades.filter(t=>t.emotions?.includes('FOMO')).length>2?`\n❌ ${trades.filter(t=>t.emotions?.includes('FOMO')).length} FOMO trades`:''}

━━ BEST SETUP ━━
${getBestSetup(trades)}

━━ SCORE ━━
${Math.min(100,Math.round(stats.wr*0.4+stats.pf*15+Math.min(stats.total/2,30)))}/100

Keep journaling. Data is your edge.`,
  'dna': (stats,trades) => { const style = stats.wr>62&&stats.pf>2?'PRECISION SNIPER':stats.wr>55?'CONSISTENT TRADER':trades.filter(t=>t.emotions?.includes('FOMO')).length>3?'EMOTIONAL TRADER':'DEVELOPING TRADER'; return `🧬 TRADING DNA PROFILE

Type: ${style}

Patience Index: ${Math.round(trades.filter(t=>['A+','A'].includes(t.grade)).length/Math.max(1,stats.total)*100)}%
Risk Appetite: ${riskConfig.maxRiskPct<=1?'CONSERVATIVE':'MODERATE'}
Emotional Control: ${Math.round(trades.filter(t=>t.emotions?.includes('Calm')).length/Math.max(1,stats.total)*100)}%
Consistency: ${stats.pf>=1.5?'HIGH':'BUILDING'}

Recommendation: ${style==='PRECISION SNIPER'?'Scale your best setups. You have an edge.':style==='EMOTIONAL TRADER'?'Focus 100% on psychology. Journal every emotion.':'Build more trade history. 50+ trades for reliable analysis.'}`; },
};

function getBestSetup(trades) {
  const sm = {}; trades.forEach(t=>{if(!sm[t.setup])sm[t.setup]={w:0,total:0};sm[t.setup].total++;if(t.pnl>0)sm[t.setup].w++;});
  const best = Object.entries(sm).filter(e=>e[1].total>=3).sort((a,b)=>(b[1].w/b[1].total)-(a[1].w/a[1].total))[0];
  return best ? `${best[0]} (${Math.round(best[1].w/best[1].total*100)}% WR)` : 'Need more trades';
}
function getBestSession(trades) {
  const sm = {}; trades.forEach(t=>{const s=t.session||'Unknown';if(!sm[s])sm[s]={w:0,total:0};sm[s].total++;if(t.pnl>0)sm[s].w++;});
  const best = Object.entries(sm).filter(e=>e[1].total>=2).sort((a,b)=>(b[1].w/b[1].total)-(a[1].w/a[1].total))[0];
  return best ? `${best[0]} (${Math.round(best[1].w/best[1].total*100)}% WR)` : 'Need more data';
}

function initChat() {
  const el = document.getElementById('chatMessages'); if(!el) return;
  if(!chatHistory.length) {
    chatHistory.push({role:'ai',msg:"👋 Hello! I'm your AI Trading Mentor powered by TradeMatrix's intelligence engine.\n\nI analyze your real trade data and provide personalized coaching. Ask me anything — about your performance, weaknesses, best setups, or how to improve.\n\nUse the quick buttons above or type your question below."});
    saveChatHistory();
  }
  renderChat();
}

function renderChat() {
  const el = document.getElementById('chatMessages'); if(!el) return;
  el.innerHTML = chatHistory.map(m => `
    <div class="chat-bubble ${m.role}" ${m.role==='ai'?'':'style="margin-left:auto;"'}>
      ${m.role==='ai'?'<div class="ai-badge">🤖 AI MENTOR</div>':''}
      <div style="white-space:pre-wrap;">${m.msg}</div>
    </div>`).join('');
  el.scrollTop = el.scrollHeight;
}

function saveChatHistory() { localStorage.setItem('tm_chat', JSON.stringify(chatHistory.slice(-50))); }

function sendChat() {
  const inp = document.getElementById('chatInput');
  const msg = inp?.value.trim(); if(!msg) return;
  inp.value = ''; inp.style.height = '';
  chatHistory.push({role:'user', msg});
  renderChat();
  // Show typing
  const el = document.getElementById('chatMessages');
  const typing = document.createElement('div');
  typing.className = 'typing-indicator'; typing.id = 'typing';
  typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
  el.appendChild(typing); el.scrollTop = el.scrollHeight;
  setTimeout(() => {
    const typingEl = document.getElementById('typing'); if(typingEl) typingEl.remove();
    const response = generateAIResponse(msg.toLowerCase());
    chatHistory.push({role:'ai', msg: response});
    saveChatHistory(); renderChat();
  }, 800 + Math.random()*600);
}

function generateAIResponse(msg) {
  const trades = getTrades();
  const stats = calcStats(trades);
  // Match keywords
  for(const [key, fn] of Object.entries(AI_RESPONSES)) {
    if(msg.includes(key)) return fn(stats, trades);
  }
  // Generic response
  if(msg.includes('session')) return `Your best session is ${getBestSession(trades)}. Focus your trading energy here.`;
  if(msg.includes('pair')) { const sm={}; trades.forEach(t=>{if(!sm[t.pair])sm[t.pair]={w:0,total:0,pnl:0};sm[t.pair].total++;if(t.pnl>0)sm[t.pair].w++;sm[t.pair].pnl+=t.pnl;}); const best=Object.entries(sm).sort((a,b)=>b[1].pnl-a[1].pnl)[0]; return best?`Your best pair is ${best[0]} with $${best[1].pnl.toFixed(0)} total P&L. Focus here.`:`Add more trades to analyze pair performance.`; }
  if(msg.includes('risk')) return `Your risk config: ${riskConfig.maxRiskPct}% per trade, ${riskConfig.dailyLoss}% daily limit.

With ${stats.total} trades and $${stats.exp.toFixed(0)} expectancy, your current risk level is ${stats.pf>=1.5?'well managed.':'potentially too high — reduce to 0.5-1%.'}`;
  if(msg.includes('hello')||msg.includes('hi')) return `Hello! Ready to analyze your trading.

You have ${stats.total} trades logged with ${stats.wr.toFixed(1)}% win rate and $${stats.totalPnl.toFixed(0)} total P&L.

What would you like to work on today?`;
  return `Good question. Based on your ${stats.total} trades:

Win Rate: ${stats.wr.toFixed(1)}% | PF: ${stats.pf.toFixed(2)}
Best Setup: ${getBestSetup(trades)}
Best Session: ${getBestSession(trades)}

${stats.pf>=2?'Your edge is solid. Keep executing.':stats.pf>=1?'Edge exists, room to improve.':'Focus on setup quality first.'}

Want me to analyze a specific aspect? Try: "analyze my trades", "my weakness", or "best setup".`;
}

function sendQuick(msg) { const inp=document.getElementById('chatInput'); if(inp) inp.value=msg; sendChat(); }
function handleChatKey(e) { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();} }
function autoResizeChat(el) { el.style.height='auto'; el.style.height=Math.min(el.scrollHeight,100)+'px'; }
function clearChat() { chatHistory=[]; saveChatHistory(); initChat(); showToast('Chat cleared'); }
function exportChat() {
  const txt = chatHistory.map(m=>`[${m.role.toUpperCase()}]: ${m.msg}`).join('\n\n---\n\n');
  const a=document.createElement('a'); a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(txt); a.download='tradematrix_ai_session.txt'; a.click();
  showToast('💾 Chat exported!');
}

// ===== CHALLENGE TRACKER =====
function saveChallenge() {
  const name = document.getElementById('ch_name')?.value.trim(); if(!name){showToast('❌ Name required');return;}
  const ch = {
    id:Date.now(), name, firm:document.getElementById('ch_firm').value,
    size:parseFloat(document.getElementById('ch_size').value)||50000,
    target:parseFloat(document.getElementById('ch_target').value)||8,
    daily:parseFloat(document.getElementById('ch_daily').value)||5,
    total:parseFloat(document.getElementById('ch_total').value)||10,
    start:document.getElementById('ch_start').value, end:document.getElementById('ch_end').value,
    minDays:parseInt(document.getElementById('ch_mindays').value)||4,
    profit:parseFloat(document.getElementById('ch_profit').value)||0,
    curDD:parseFloat(document.getElementById('ch_curdd').value)||0,
    status:'active'
  };
  challenges.push(ch); localStorage.setItem('tm_challenges',JSON.stringify(challenges));
  showSub('challenge','active'); buildChallenges(); showToast('✅ Challenge saved!');
}

function buildChallenges() {
  const el = document.getElementById('challengesList'); if(!el) return;
  if(!challenges.filter(c=>c.status==='active').length) {
    el.innerHTML='<div style="grid-column:1/-1;color:var(--text3);padding:24px;text-align:center;font-size:.85rem;">No active challenges. Click "+ Add Challenge" to track a funded account challenge.</div>';return;
  }
  el.innerHTML = challenges.filter(c=>c.status==='active').map(ch => {
    const targetAmt = ch.size * ch.target / 100;
    const profitPct = ch.profit/targetAmt*100;
    const ddPct = ch.curDD/ch.daily*100;
    const daysLeft = ch.end ? Math.max(0,Math.ceil((new Date(ch.end)-new Date())/86400000)) : '?';
    return `<div class="challenge-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          <div style="font-family:Orbitron,sans-serif;font-size:.85rem;color:var(--gold);">${ch.name}</div>
          <div style="font-size:.72rem;color:var(--text3);margin-top:3px;">${ch.firm} • $${ch.size.toLocaleString()}</div>
        </div>
        <span class="phase-badge phase-1">ACTIVE</span>
      </div>
      <div class="g2" style="gap:8px;margin-bottom:14px;">
        <div style="text-align:center;padding:10px;background:var(--glass);border-radius:9px;">
          <div style="font-size:.62rem;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">PROFIT</div>
          <div style="font-family:Orbitron,sans-serif;font-size:1.1rem;color:var(--green);">+$${ch.profit.toFixed(0)}</div>
          <div style="font-size:.65rem;color:var(--text3);">Target: $${targetAmt.toFixed(0)}</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--glass);border-radius:9px;">
          <div style="font-size:.62rem;color:var(--text3);letter-spacing:1px;margin-bottom:4px;">DAYS LEFT</div>
          <div style="font-family:Orbitron,sans-serif;font-size:1.1rem;color:${typeof daysLeft==='number'&&daysLeft<5?'var(--red)':'var(--gold)'};">${daysLeft}</div>
          <div style="font-size:.65rem;color:var(--text3);">Min days: ${ch.minDays}</div>
        </div>
      </div>
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:4px;"><span style="color:var(--text3);">Profit Progress</span><span class="grt">${profitPct.toFixed(0)}%</span></div>
        <div class="rm" style="height:8px;"><div class="rf" style="width:${Math.min(profitPct,100)}%;background:var(--green);"></div></div>
      </div>
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:4px;"><span style="color:var(--text3);">Daily DD Used</span><span style="color:${ddPct>70?'var(--red)':'var(--gold)'};">${ch.curDD}% / ${ch.daily}%</span></div>
        <div class="rm" style="height:8px;"><div class="rf" style="width:${Math.min(ddPct,100)}%;background:${ddPct>70?'var(--red)':'var(--gold)'};"></div></div>
      </div>
      <div style="display:flex;gap:7px;">
        <button class="btn btn-sm btn-gr" onclick="updateChallengeProfit(${ch.id})">UPDATE</button>
        <button class="btn btn-sm" onclick="markChallengeComplete(${ch.id})">✅ PASS</button>
        <button class="btn btn-sm btn-rd" onclick="deleteChallenge(${ch.id})">DELETE</button>
      </div>
    </div>`;
  }).join('');
}

function updateChallengeProfit(id) {
  const ch = challenges.find(c=>c.id===id); if(!ch) return;
  const newProfit = parseFloat(prompt('Enter current profit ($):', ch.profit)||ch.profit);
  const newDD = parseFloat(prompt('Enter current drawdown (%):', ch.curDD)||ch.curDD);
  ch.profit = newProfit; ch.curDD = newDD;
  localStorage.setItem('tm_challenges',JSON.stringify(challenges));
  buildChallenges(); showToast('✅ Challenge updated!');
}
function markChallengeComplete(id) {
  const ch = challenges.find(c=>c.id===id); if(!ch) return;
  ch.status = 'passed'; localStorage.setItem('tm_challenges',JSON.stringify(challenges));
  buildChallenges(); showToastFancy('🏆 CHALLENGE PASSED! Congratulations!');
}
function deleteChallenge(id) {
  if(!confirm('Delete this challenge?')) return;
  challenges = challenges.filter(c=>c.id!==id); localStorage.setItem('tm_challenges',JSON.stringify(challenges));
  buildChallenges();
}
function buildChallengeHistory() {
  const el = document.getElementById('challengeHistory'); if(!el) return;
  const done = challenges.filter(c=>c.status!=='active');
  el.innerHTML = done.length ? done.map(ch=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:var(--glass);border-radius:9px;margin-bottom:7px;">
      <div><div style="font-size:.85rem;font-weight:600;">${ch.name}</div><div style="font-size:.72rem;color:var(--text3);">${ch.firm}</div></div>
      <span class="badge ${ch.status==='passed'?'bg':'br'}">${ch.status==='passed'?'✅ PASSED':'❌ FAILED'}</span>
    </div>`).join('') : '<div style="color:var(--text3);padding:14px;font-size:.82rem;">No challenge history yet.</div>';
}

// ===== REPLAY CENTER =====
function buildTimeline() {
  const el = document.getElementById('tradeTimeline'); if(!el) return;
  let trades = getTrades().slice().reverse();
  const filter = document.getElementById('replayFilter')?.value||'';
  if(filter==='Wins Only') trades=trades.filter(t=>t.pnl>0);
  if(filter==='Losses Only') trades=trades.filter(t=>t.pnl<0);
  if(filter==='A+ Grades') trades=trades.filter(t=>t.grade==='A+');
  if(!trades.length){el.innerHTML='<div style="color:var(--text3);padding:16px;font-size:.82rem;">No trades match the filter.</div>';return;}
  el.innerHTML = trades.map(t=>`
    <div class="timeline-item">
      <div class="timeline-dot ${t.pnl>0?'win':'loss'}"></div>
      <div class="timeline-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="gt" style="font-size:.85rem;font-weight:700;">${t.pair}</span>
            <span style="color:${t.dir==='BUY'?'var(--green)':'var(--red)'};font-size:.75rem;">${t.dir}</span>
            <span class="badge ${t.grade==='A+'?'bg':t.grade==='A'?'bb':'bo'}">${t.grade}</span>
          </div>
          <span style="color:${t.pnl>=0?'var(--green)':'var(--red)'};font-weight:700;font-family:Orbitron,sans-serif;font-size:.9rem;">${t.pnl>=0?'+':''}$${t.pnl.toFixed(0)}</span>
        </div>
        <div style="font-size:.75rem;color:var(--text3);margin-bottom:5px;">${new Date(t.date).toLocaleDateString()} • ${t.session||'—'} • ${t.setup}</div>
        ${t.notes?`<div style="font-size:.78rem;color:var(--text2);line-height:1.5;">${t.notes}</div>`:''}
        ${(t.emotions||[]).length?`<div style="margin-top:5px;">${t.emotions.map(e=>`<span class="tag tb2" style="font-size:.6rem;">${e}</span>`).join('')}</div>`:''}
        ${t.images?.length?`<div style="margin-top:6px;display:flex;gap:5px;">${t.images.map(img=>`<img src="${img}" style="width:50px;height:35px;object-fit:cover;border-radius:5px;border:1px solid var(--border);">`).join('')}</div>`:''}
      </div>
    </div>`).join('');
}

function buildEmotionJourney() {
  const el = document.getElementById('emotionJourney'); if(!el) return;
  const trades = getTrades().slice().reverse().slice(0,20);
  if(!trades.length){el.innerHTML='<div style="color:var(--text3);padding:16px;font-size:.82rem;">No trades yet.</div>';return;}
  const emotionColors = {'Calm':'var(--green)','Confident':'var(--blue)','Anxious':'var(--gold)','Frustrated':'var(--red)','FOMO':'var(--red)','Focused':'var(--green)','Tired':'var(--silver2)','Revenge':'var(--red)','Happy':'var(--green)'};
  el.innerHTML = `<div style="font-size:.82rem;color:var(--text2);margin-bottom:14px;">Showing emotional state across your last ${trades.length} trades</div>` +
    `<div style="display:flex;gap:6px;align-items:flex-end;height:100px;margin-bottom:14px;">` +
    trades.map(t=>{
      const emo = (t.emotions||['Calm'])[0];
      const clr = emotionColors[emo]||'var(--silver)';
      const h = t.pnl>0?70:30;
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
        <div style="width:100%;height:${h}%;background:${clr}44;border:1px solid ${clr}66;border-radius:4px 4px 0 0;" title="${t.pair} | ${emo} | $${t.pnl.toFixed(0)}"></div>
        <div style="font-size:.55rem;color:var(--text3);writing-mode:vertical-lr;text-orientation:mixed;">${t.pair}</div>
      </div>`;
    }).join('') + '</div>' +
    trades.map(t=>`
      <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--glass);border-radius:7px;margin-bottom:5px;font-size:.8rem;">
        <span style="width:60px;color:var(--text3);font-size:.7rem;">${new Date(t.date).toLocaleDateString()}</span>
        <span class="gt">${t.pair}</span>
        <span class="tag tb2" style="font-size:.62rem;">${(t.emotions||['—'])[0]}</span>
        <span style="margin-left:auto;color:${t.pnl>=0?'var(--green)':'var(--red)'};font-weight:700;">${t.pnl>=0?'+':''}$${t.pnl.toFixed(0)}</span>
      </div>`).join('');
}

function buildMistakeReplay() {
  const el = document.getElementById('mistakeReplay'); if(!el) return;
  const trades = getTrades().filter(t=>t.grade==='D'||t.grade==='F'||(t.mistakes&&t.mistakes.some(m=>m!=='None ✓')));
  if(!trades.length){el.innerHTML='<div class="ic"><div class="ic-type">✅ NO MAJOR MISTAKES</div><div class="ic-txt">No D/F grade trades or tagged mistakes found. Keep it up!</div></div>';return;}
  el.innerHTML = trades.slice().reverse().map(t=>`
    <div class="ic" style="border-color:rgba(255,77,106,.25);">
      <div class="ic-type" style="color:var(--red);">⚠️ ${t.grade} GRADE — ${new Date(t.date).toLocaleDateString()} | ${t.pair}</div>
      <div class="ic-txt">
        P&L: <span style="color:var(--red);">$${t.pnl.toFixed(0)}</span> | Setup: ${t.setup} | Session: ${t.session||'—'}<br>
        Mistakes: ${(t.mistakes||[]).filter(m=>m!=='None ✓').join(', ')||'—'}<br>
        ${t.notes?`Notes: ${t.notes}`:''}
      </div>
    </div>`).join('');
}

// ===== COMMUNITY =====
function addDemoStudents() {
  const names = ['Vikram T.','Sneha P.','Raj M.','Deepa K.','Arun S.'];
  names.forEach((n,i)=>{
    if(!students.find(s=>s.name===n)) students.push({id:Date.now()+i,name:n,avatar:n[0],wr:Math.round(40+Math.random()*35),trades:Math.round(5+Math.random()*50),pnl:Math.round(-500+Math.random()*3000),rank:i+4,badge:'Member'});
  });
  localStorage.setItem('tm_students',JSON.stringify(students));
  buildLeaderboard(); showToast('✅ Demo students added!');
}

function buildLeaderboard() {
  const el = document.getElementById('leaderboardList'); if(!el) return;
  const sorted = students.slice().sort((a,b)=>b.pnl-a.pnl);
  el.innerHTML = sorted.map((s,i)=>`
    <div class="student-card">
      <div class="student-rank lb-${Math.min(i+1,4)}">#${i+1}</div>
      <div class="student-avatar">${s.avatar}</div>
      <div style="flex:1;">
        <div style="font-size:.88rem;font-weight:600;">${s.name}</div>
        <div style="font-size:.72rem;color:var(--text3);">${s.trades} trades • ${s.wr}% WR</div>
      </div>
      <div style="text-align:right;">
        <div style="font-family:Orbitron,sans-serif;font-size:.9rem;color:${s.pnl>=0?'var(--green)':'var(--red)'};">${s.pnl>=0?'+':''}$${s.pnl}</div>
        <div style="font-size:.65rem;color:var(--text3);">${s.badge}</div>
      </div>
    </div>`).join('');
}

function buildStudentList() {
  const el = document.getElementById('studentList'); if(!el) return;
  if(!students.length){el.innerHTML='<div style="color:var(--text3);padding:14px;font-size:.82rem;">No students yet.</div>';return;}
  el.innerHTML = students.map(s=>`
    <div class="student-card">
      <div class="student-avatar">${s.avatar}</div>
      <div style="flex:1;"><div style="font-size:.88rem;font-weight:600;">${s.name}</div><div style="font-size:.72rem;color:var(--text3);">${s.trades} trades • ${s.wr}% WR • $${s.pnl}</div></div>
      <button class="btn btn-sm btn-rd" onclick="removeStudent(${s.id})">REMOVE</button>
    </div>`).join('');
}

function addStudent() {
  const name = prompt('Student name:'); if(!name) return;
  students.push({id:Date.now(),name,avatar:name[0].toUpperCase(),wr:0,trades:0,pnl:0,rank:students.length+1,badge:'Student'});
  localStorage.setItem('tm_students',JSON.stringify(students));
  buildStudentList(); buildLeaderboard(); showToast('✅ Student added!');
}
function removeStudent(id) {
  students=students.filter(s=>s.id!==id); localStorage.setItem('tm_students',JSON.stringify(students));
  buildStudentList(); buildLeaderboard();
}
function buildReviewQueue() {
  const el = document.getElementById('reviewQueue'); if(!el) return;
  el.innerHTML = `<div class="ic"><div class="ic-type">📋 REVIEW QUEUE</div><div class="ic-txt">Student trade submissions will appear here. Share your TradeMatrix workspace link with students to receive their trade submissions for review.</div></div>`;
}

// ===== COMMAND PALETTE =====

// ===== ROLLING STATS =====
let rollingWindow = 30;
function setRolling(days) {
  rollingWindow = days;
  document.querySelectorAll('.rolling-tab').forEach(b=>b.classList.remove('active'));
  event?.target?.classList.add('active');
  refreshAnalytics();
}

// ===== KELLY CRITERION =====
function calcKelly() {
  const trades = getTrades();
  const stats = calcStats(trades);
  if(!stats.total) return;
  const b = stats.avgW/Math.max(1,stats.avgL); // avg win / avg loss
  const p = stats.wr/100; const q = 1-p;
  const kelly = (b*p - q) / b;
  const halfKelly = kelly/2;
  const el = document.getElementById('kellyResult'); if(!el) return;
  el.innerHTML = `
    <div class="calc-result-row"><span style="color:var(--text3);">Win Rate (p)</span><span class="gt">${(p*100).toFixed(1)}%</span></div>
    <div class="calc-result-row"><span style="color:var(--text3);">Avg Win / Avg Loss (b)</span><span class="gt">${b.toFixed(2)}</span></div>
    <div class="calc-result-row"><span style="color:var(--text3);">Kelly %</span><span style="font-family:Orbitron,sans-serif;font-size:1.1rem;" class="${kelly>0?'grt':'rt'}">${(kelly*100).toFixed(1)}%</span></div>
    <div class="calc-result-row"><span style="color:var(--text3);">Half-Kelly (recommended)</span><span style="font-family:Orbitron,sans-serif;font-size:1.1rem;" class="gt">${(halfKelly*100).toFixed(1)}%</span></div>
    <div style="font-size:.72rem;color:var(--text3);margin-top:8px;">${kelly>0?`Optimal bet: ${(halfKelly*100).toFixed(1)}% of account per trade.`:'Negative edge detected. Do not risk capital.'}</div>`;
}


// ===== PERFORMANCE OVERVIEW SCORE =====
function calcOverallScore() {
  const trades = getTrades();
  const stats = calcStats(trades);
  if(!stats.total) return 0;
  let score = 0;
  score += Math.min(stats.wr, 80) * 0.4; // max 32 pts
  score += Math.min(stats.pf * 12, 30); // max 30 pts
  score += Math.min(stats.total * 0.5, 20); // max 20 pts (experience)
  score += trades.filter(t=>['A+','A'].includes(t.grade)).length/Math.max(1,stats.total)*18; // max 18 pts
  return Math.min(Math.round(score), 100);
}

// ===== ENHANCED DASHBOARD =====
function buildDashboardExtras() {
  buildSessionClock();
  buildTargetBars();
  buildEcoCalendar();
  buildPerfScore();
}

function buildPerfScore() {
  const score = calcOverallScore();
  const el = document.getElementById('perfScoreEl'); if(!el) return;
  const r = 40, circ = 2*Math.PI*r;
  const offset = circ*(1-score/100);
  el.innerHTML = `<svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="8"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${score>=70?'var(--green)':score>=50?'var(--gold)':'var(--red)'}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 50 50)" style="transition:stroke-dashoffset 1s ease;"/>
    <text x="50" y="46" text-anchor="middle" fill="${score>=70?'var(--green)':score>=50?'var(--gold)':'var(--red)'}" font-family="Orbitron,sans-serif" font-size="16" font-weight="700">${score}</text>
    <text x="50" y="60" text-anchor="middle" fill="var(--text3)" font-family="Rajdhani,sans-serif" font-size="9" letter-spacing="1">SCORE</text>
  </svg>`;
}

// ===== REFRESH OVERRIDES =====
const _origRefreshDashboard = refreshDashboard;
refreshDashboard = function() {
  _origRefreshDashboard();
  buildDashboardExtras();
  populateTradeSelect();
};

const _origInitApp = initApp;
initApp = function() {
  _origInitApp();
  initChat();
  buildChallenges();
  buildLeaderboard();
  buildStudentList();
  buildTimeline();
  buildEmotionJourney();
  buildMistakeReplay();
  buildChallengeHistory();
  buildReviewQueue();
  populateTradeSelect();
  buildDashboardExtras();
  // Set challenge dates
  const today = new Date().toISOString().split('T')[0];
  const end = new Date(); end.setDate(end.getDate()+30);
  if(document.getElementById('ch_start')) document.getElementById('ch_start').value = today;
  if(document.getElementById('ch_end')) document.getElementById('ch_end').value = end.toISOString().split('T')[0];
  // Wire auto-calc
  ['t_entry','t_sl','t_tp'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.addEventListener('blur', autoCalcRR);
  });
  // Show user name in topbar
  try {
    const cu = getCurrentUser();
    if (cu) {
      const badge = document.getElementById('acctBadge');
      if (badge) badge.textContent = cu.firstName + ' ' + cu.lastName;
    }
  } catch(e) {}
  // Show welcome notification
  setTimeout(()=>showToastFancy('🚀 TradeMatrix Pro loaded! Press Ctrl+P for commands.','info'),1500);
};

// Close cmd palette on outside click
document.addEventListener('click',e=>{
  if(!document.getElementById('cmdPalette').contains(e.target)&&!e.target.matches('[onclick*="toggleCmd"]'))
    document.getElementById('cmdPalette').classList.remove('active');
});

function saveTargets() {
  pnlTargets = {
    daily: parseFloat(document.getElementById('tgt_daily').value)||200,
    weekly: parseFloat(document.getElementById('tgt_weekly').value)||1000,
    monthly: parseFloat(document.getElementById('tgt_monthly').value)||4000,
  };
  localStorage.setItem('tm_targets', JSON.stringify(pnlTargets));
  closeMo('targetModal');
  buildTargetBars();
  showToast('✅ Targets saved!');
}



// =========================================
// ====== STRATEGY TESTER ENGINE ===========
// =========================================
let stSymbol = 'BTCUSDT';
let stType = 'crypto'; // 'crypto' | 'sim'
let stTF = '1h';
let stCandles = [];
let stBTTrades = [];
let stZoomStart = 0;
let stZoomEnd = 0;
let stViewOffset = 0;
let stViewRange = 120;
let stIsDragging = false;
let stDragStartX = 0;
let stDragStartOffset = 0;
let stChartAnimFrame = null;

// Binance TF map
const BN_TF = {'1m':'1m','5m':'5m','15m':'15m','1h':'1h','4h':'4h','1d':'1d'};

function stSetSym(sym, type) {
  stSymbol = sym; stType = type;
  document.querySelectorAll('.sym-btn').forEach(b=>{
    b.classList.toggle('on', b.textContent.trim() === sym.replace('USDT','').replace('USD',''));
  });
  const st = document.getElementById('stStatus');
  if(type === 'crypto') {
    st.textContent = '✅ Binance API · Free · ' + sym;
    st.style.color = 'var(--green)';
  } else {
    st.textContent = '🔄 Simulation mode · ' + sym;
    st.style.color = 'var(--gold)';
  }
}

function stSetTF(tf) {
  stTF = tf;
  document.querySelectorAll('.tf-btn').forEach(b=>{b.classList.toggle('on', b.textContent.trim()===tf);});
}

// ---- FETCH CANDLES ----
async function fetchBinanceCandles(symbol, interval, limit=500, startTime=null, endTime=null) {
  let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  if(startTime) url += '&startTime=' + startTime;
  if(endTime) url += '&endTime=' + endTime;
  const res = await fetch(url);
  if(!res.ok) throw new Error('Binance API error: ' + res.status);
  const data = await res.json();
  return data.map(k=>({
    t: k[0], // open time
    o: parseFloat(k[1]),
    h: parseFloat(k[2]),
    l: parseFloat(k[3]),
    c: parseFloat(k[4]),
    v: parseFloat(k[5])
  }));
}

// ---- SIMULATE FOREX/GOLD DATA ----
function generateSimCandles(symbol, tf, count=500) {
  const configs = {
    'XAUUSD': {base:1850, vol:0.008, trend:0.0001},
    'EURUSD': {base:1.08, vol:0.002, trend:0.00001},
    'GBPUSD': {base:1.26, vol:0.0025, trend:0.00001},
  };
  const cfg = configs[symbol] || {base:1.0, vol:0.002, trend:0.00001};
  const tfMs = {'1m':60000,'5m':300000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000};
  const ms = tfMs[tf] || 3600000;
  const now = Date.now();
  let price = cfg.base;
  const candles = [];
  for(let i=count;i>=0;i--) {
    const t = now - i*ms;
    const change = (Math.random()-0.49)*cfg.vol + cfg.trend;
    const open = price;
    price = price * (1+change);
    const high = Math.max(open,price) * (1 + Math.random()*cfg.vol*0.5);
    const low = Math.min(open,price) * (1 - Math.random()*cfg.vol*0.5);
    candles.push({t, o:open, h:high, l:low, c:price, v:Math.random()*1000+100});
  }
  return candles;
}

// ---- RUN BACKTEST ----
async function runBacktest() {
  const btn = document.getElementById('stRunBtn');
  const loading = document.getElementById('stLoading');
  const results = document.getElementById('stResults');
  const noResults = document.getElementById('stNoResults');

  btn.disabled = true; btn.textContent = '⏳ FETCHING DATA...';
  loading.style.display = 'flex';
  loading.innerHTML = '<div class="st-spin"></div><div style="font-family:Orbitron,sans-serif;font-size:.7rem;letter-spacing:2px;color:var(--gold);">LOADING MARKET DATA...</div>';
  results.style.display = 'none';
  noResults.style.display = 'none';

  try {
    // Get date range
    const fromEl = document.getElementById('stDateFrom');
    const toEl = document.getElementById('stDateTo');
    let startTime = fromEl.value ? new Date(fromEl.value).getTime() : null;
    let endTime = toEl.value ? new Date(toEl.value).getTime() : null;

    // Fetch candles
    if(stType === 'crypto') {
      const limit = calcCandleLimit(stTF, startTime, endTime);
      stCandles = await fetchBinanceCandles(stSymbol, BN_TF[stTF], Math.min(limit,1000), startTime, endTime);
    } else {
      stCandles = generateSimCandles(stSymbol, stTF, 500);
    }

    btn.textContent = '⚙️ RUNNING STRATEGY...';
    await new Promise(r=>setTimeout(r,100));

    // Run selected strategy
    const strategy = document.getElementById('stStrategy').value;
    const sl = parseFloat(document.getElementById('stSL').value)||6;
    const tp = parseFloat(document.getElementById('stTP').value)||24;
    const risk = parseFloat(document.getElementById('stRisk').value)||100;
    const capital = parseFloat(document.getElementById('stCapital').value)||10000;
    const spread = parseFloat(document.getElementById('stSpread').value)||0.05;
    const comm = parseFloat(document.getElementById('stComm').value)||0.5;

    stBTTrades = runStrategy(strategy, stCandles, {sl,tp,risk,capital,spread,comm});

    // Render everything
    loading.style.display = 'none';
    results.style.display = 'block';

    drawChart();
    renderBTResults(stBTTrades, capital, {sl,tp,risk});
    drawEquityMini(stBTTrades, capital);
    document.getElementById('stQuickStats').style.display = 'block';

    document.getElementById('stResultLabel').textContent = `${stSymbol} ${stTF} · ${stCandles.length} candles · ${stBTTrades.length} trades`;

    btn.textContent = '✅ COMPLETE — RUN AGAIN';
  } catch(e) {
    loading.innerHTML = `<div style="font-size:1.5rem;">❌</div><div style="color:var(--red);font-size:.82rem;">${e.message}</div><div style="color:var(--text3);font-size:.72rem;">Check internet connection</div>`;
    btn.textContent = '▶ RUN BACKTEST';
    console.error('Backtest error:', e);
  }
  btn.disabled = false;
}

function calcCandleLimit(tf, start, end) {
  if(!start||!end) return 500;
  const ms = end-start;
  const tfMs = {'1m':60000,'5m':300000,'15m':900000,'1h':3600000,'4h':14400000,'1d':86400000};
  return Math.min(Math.ceil(ms/(tfMs[tf]||3600000))+1, 1000);
}

// ---- STRATEGY ENGINES ----
function runStrategy(strat, candles, params) {
  const fns = {bpr:stratBPR, ema:stratEMA, obfvg:stratOBFVG, bos:stratBOS, liq:stratLiquidity};
  return (fns[strat]||stratBPR)(candles, params);
}

function stratBPR(candles, {sl,tp,risk,capital,spread,comm}) {
  const trades = [];
  let balance = capital;
  // BPR: Balanced Price Range — look for inside bar range + sweep pattern
  for(let i=5;i<candles.length-1;i++) {
    const c=candles[i], prev=candles[i-1], prev2=candles[i-2];
    // Detect BPR: equilibrium zone (high/low midpoint alignment)
    const eq = (prev.h + prev.l)/2;
    const range = prev.h - prev.l;
    // Bullish: price sweeps low, closes back in range
    const bullSweep = c.l < prev.l && c.c > prev.l && c.c > eq*0.9998;
    // Bearish: price sweeps high, closes back in range
    const bearSweep = c.h > prev.h && c.c < prev.h && c.c < eq*1.0002;
    // Volume confirmation
    const volOK = c.v > (prev.v * 0.8);

    if((bullSweep||bearSweep) && volOK) {
      const dir = bullSweep ? 'BUY' : 'SELL';
      const entry = c.c * (1 + (bullSweep?spread:-spread)/100);
      const spreadCost = c.c * spread/100;
      const totalCost = spreadCost + comm;
      // Simulate next candle exit
      const next = candles[i+1];
      let pnl = 0, exitPrice = 0, exitReason = '';
      if(dir === 'BUY') {
        const tpPrice = entry + tp;
        const slPrice = entry - sl;
        if(next.h >= tpPrice) { pnl = risk * (tp/sl); exitPrice = tpPrice; exitReason = 'TP'; }
        else if(next.l <= slPrice) { pnl = -risk; exitPrice = slPrice; exitReason = 'SL'; }
        else { pnl = risk * ((next.c-entry)/sl); exitPrice = next.c; exitReason = 'Close'; }
      } else {
        const tpPrice = entry - tp;
        const slPrice = entry + sl;
        if(next.l <= tpPrice) { pnl = risk * (tp/sl); exitPrice = tpPrice; exitReason = 'TP'; }
        else if(next.h >= slPrice) { pnl = -risk; exitPrice = slPrice; exitReason = 'SL'; }
        else { pnl = risk * ((entry-next.c)/sl); exitPrice = next.c; exitReason = 'Close'; }
      }
      pnl -= totalCost;
      balance += pnl;
      trades.push({i, t:c.t, dir, entry, exit:exitPrice, pnl, balance, reason:exitReason, rr: pnl>0?tp/sl:-1});
      i++; // skip next candle
    }
  }
  return trades;
}

function stratEMA(candles, {sl,tp,risk,capital,spread,comm}) {
  const trades = [];
  let balance = capital;
  const ema9 = calcEMA(candles, 9);
  const ema21 = calcEMA(candles, 21);
  for(let i=21;i<candles.length-1;i++) {
    const cross = ema9[i-1]<ema21[i-1] && ema9[i]>ema21[i]; // golden cross
    const death = ema9[i-1]>ema21[i-1] && ema9[i]<ema21[i]; // death cross
    if(!cross && !death) continue;
    const dir = cross ? 'BUY' : 'SELL';
    const entry = candles[i].c * (1+(cross?spread:-spread)/100);
    const next = candles[i+1];
    let pnl = 0, exitPrice = 0, exitReason = '';
    if(dir==='BUY') {
      const tpP=entry+tp,slP=entry-sl;
      if(next.h>=tpP){pnl=risk*(tp/sl);exitPrice=tpP;exitReason='TP';}
      else if(next.l<=slP){pnl=-risk;exitPrice=slP;exitReason='SL';}
      else{pnl=risk*((next.c-entry)/sl);exitPrice=next.c;exitReason='Close';}
    } else {
      const tpP=entry-tp,slP=entry+sl;
      if(next.l<=tpP){pnl=risk*(tp/sl);exitPrice=tpP;exitReason='TP';}
      else if(next.h>=slP){pnl=-risk;exitPrice=slP;exitReason='SL';}
      else{pnl=risk*((entry-next.c)/sl);exitPrice=next.c;exitReason='Close';}
    }
    pnl -= comm;
    balance += pnl;
    trades.push({i,t:candles[i].t,dir,entry,exit:exitPrice,pnl,balance,reason:exitReason,rr:pnl>0?tp/sl:-1});
    i++;
  }
  return trades;
}

function calcEMA(candles, period) {
  const k = 2/(period+1);
  const ema = [candles[0].c];
  for(let i=1;i<candles.length;i++) ema.push(candles[i].c*k + ema[i-1]*(1-k));
  return ema;
}

function stratOBFVG(candles, params) {
  // Order Block + Fair Value Gap strategy
  const {sl,tp,risk,capital,spread,comm} = params;
  const trades = []; let balance = capital;
  for(let i=3;i<candles.length-1;i++) {
    const c=candles[i],p1=candles[i-1],p2=candles[i-2],p3=candles[i-3];
    // Bearish OB: last up candle before down move
    const bearOB = p3.c>p3.o && p2.c<p2.o && p1.c<p1.o && c.h>p3.h*0.998 && c.h<p3.h*1.005;
    // Bullish OB: last down candle before up move
    const bullOB = p3.c<p3.o && p2.c>p2.o && p1.c>p1.o && c.l<p3.l*1.002 && c.l>p3.l*0.995;
    // FVG: gap between candles
    const fvgUp = p2.l > p1.h; // bullish FVG
    const fvgDn = p2.h < p1.l; // bearish FVG
    let dir = null;
    if(bearOB && fvgDn) dir='SELL';
    if(bullOB && fvgUp) dir='BUY';
    if(!dir) continue;
    const entry = c.c*(1+(dir==='BUY'?spread:-spread)/100);
    const next = candles[i+1];
    let pnl=0,exitPrice=0,exitReason='';
    if(dir==='BUY'){const tpP=entry+tp,slP=entry-sl;if(next.h>=tpP){pnl=risk*(tp/sl);exitPrice=tpP;exitReason='TP';}else if(next.l<=slP){pnl=-risk;exitPrice=slP;exitReason='SL';}else{pnl=risk*((next.c-entry)/sl);exitPrice=next.c;exitReason='Close';}}
    else{const tpP=entry-tp,slP=entry+sl;if(next.l<=tpP){pnl=risk*(tp/sl);exitPrice=tpP;exitReason='TP';}else if(next.h>=slP){pnl=-risk;exitPrice=slP;exitReason='SL';}else{pnl=risk*((entry-next.c)/sl);exitPrice=next.c;exitReason='Close';}}
    pnl-=comm; balance+=pnl;
    trades.push({i,t:c.t,dir,entry,exit:exitPrice,pnl,balance,reason:exitReason,rr:pnl>0?tp/sl:-1});
    i++;
  }
  return trades;
}

function stratBOS(candles, params) {
  const {sl,tp,risk,capital,spread,comm} = params;
  const trades=[]; let balance=capital;
  const highs=[]; const lows=[];
  for(let i=2;i<candles.length-1;i++){
    highs.push(Math.max(...candles.slice(Math.max(0,i-5),i).map(c=>c.h)));
    lows.push(Math.min(...candles.slice(Math.max(0,i-5),i).map(c=>c.l)));
    const c=candles[i];
    const bosUp=c.h>highs[highs.length-2]&&c.c>highs[highs.length-2];
    const bosDown=c.l<lows[lows.length-2]&&c.c<lows[lows.length-2];
    if(!bosUp&&!bosDown)continue;
    const dir=bosUp?'BUY':'SELL';
    const entry=c.c*(1+(dir==='BUY'?spread:-spread)/100);
    const next=candles[i+1];
    let pnl=0,exitPrice=0,exitReason='';
    if(dir==='BUY'){const tpP=entry+tp,slP=entry-sl;if(next.h>=tpP){pnl=risk*(tp/sl);exitPrice=tpP;exitReason='TP';}else if(next.l<=slP){pnl=-risk;exitPrice=slP;exitReason='SL';}else{pnl=risk*((next.c-entry)/sl);exitPrice=next.c;exitReason='Close';}}
    else{const tpP=entry-tp,slP=entry+sl;if(next.l<=tpP){pnl=risk*(tp/sl);exitPrice=tpP;exitReason='TP';}else if(next.h>=slP){pnl=-risk;exitPrice=slP;exitReason='SL';}else{pnl=risk*((entry-next.c)/sl);exitPrice=next.c;exitReason='Close';}}
    pnl-=comm;balance+=pnl;
    trades.push({i,t:c.t,dir,entry,exit:exitPrice,pnl,balance,reason:exitReason,rr:pnl>0?tp/sl:-1});
    i++;
  }
  return trades;
}

function stratLiquidity(candles, params) {
  const {sl,tp,risk,capital,spread,comm}=params;
  const trades=[]; let balance=capital;
  for(let i=10;i<candles.length-1;i++){
    // Find recent swing highs/lows (liquidity pools)
    const recent=candles.slice(i-10,i);
    const swingH=Math.max(...recent.map(c=>c.h));
    const swingL=Math.min(...recent.map(c=>c.l));
    const c=candles[i];
    // Sweep high then reverse
    const sweepH=c.h>swingH&&c.c<swingH*1.001;
    // Sweep low then reverse
    const sweepL=c.l<swingL&&c.c>swingL*0.999;
    if(!sweepH&&!sweepL)continue;
    const dir=sweepH?'SELL':'BUY';
    const entry=c.c*(1+(dir==='BUY'?spread:-spread)/100);
    const next=candles[i+1];
    let pnl=0,exitPrice=0,exitReason='';
    if(dir==='BUY'){const tpP=entry+tp,slP=entry-sl;if(next.h>=tpP){pnl=risk*(tp/sl);exitPrice=tpP;exitReason='TP';}else if(next.l<=slP){pnl=-risk;exitPrice=slP;exitReason='SL';}else{pnl=risk*((next.c-entry)/sl);exitPrice=next.c;exitReason='Close';}}
    else{const tpP=entry-tp,slP=entry+sl;if(next.l<=tpP){pnl=risk*(tp/sl);exitPrice=tpP;exitReason='TP';}else if(next.h>=slP){pnl=-risk;exitPrice=slP;exitReason='SL';}else{pnl=risk*((entry-next.c)/sl);exitPrice=next.c;exitReason='Close';}}
    pnl-=comm;balance+=pnl;
    trades.push({i,t:c.t,dir,entry,exit:exitPrice,pnl,balance,reason:exitReason,rr:pnl>0?tp/sl:-1});
    i++;
  }
  return trades;
}

// ---- CHART RENDERING ----
function drawChart() {
  const canvas = document.getElementById('stChart');
  const wrap = document.getElementById('stChartWrap');
  if(!canvas||!stCandles.length) return;

  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  stViewRange = Math.min(stViewRange, stCandles.length);
  if(stViewOffset < 0) stViewOffset = 0;
  if(stViewOffset > stCandles.length - stViewRange) stViewOffset = stCandles.length - stViewRange;

  const visible = stCandles.slice(stViewOffset, stViewOffset + stViewRange);
  if(!visible.length) return;

  // Price range
  const mn = Math.min(...visible.map(c=>c.l));
  const mx = Math.max(...visible.map(c=>c.h));
  const pad = (mx-mn)*0.08;
  const pMin = mn-pad, pMax = mx+pad;

  // Clear
  ctx.fillStyle = '#080a0e';
  ctx.fillRect(0,0,W,H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,.04)';
  ctx.lineWidth = 1;
  for(let r=0;r<5;r++){const y=H*0.1+H*0.8*(r/4);ctx.beginPath();ctx.moveTo(40,y);ctx.lineTo(W,y);ctx.stroke();}

  // Price labels
  ctx.fillStyle='rgba(120,136,153,.7)';ctx.font='9px Share Tech Mono';ctx.textAlign='right';
  for(let r=0;r<5;r++){const y=H*0.1+H*0.8*(r/4);const price=pMax-(pMax-pMin)*(r/4);ctx.fillText(price.toFixed(2),38,y+3);}

  const candleW = Math.max(1, (W-50)/visible.length);
  const gap = candleW * 0.15;
  const bw = Math.max(1, candleW - gap*2);

  const py = p => H*0.1 + H*0.8*(1-(p-pMin)/(pMax-pMin));

  // Draw candles
  visible.forEach((c,i)=>{
    const x = 42 + i*candleW + candleW/2;
    const isGreen = c.c >= c.o;
    const color = isGreen ? '#00ffa3' : '#ff4d6a';
    const fillColor = isGreen ? 'rgba(0,255,163,.7)' : 'rgba(255,77,106,.7)';

    // Wick
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, py(c.h));
    ctx.lineTo(x, py(c.l));
    ctx.stroke();

    // Body
    ctx.fillStyle = fillColor;
    const bodyTop = py(Math.max(c.o,c.c));
    const bodyH = Math.max(1, Math.abs(py(c.o)-py(c.c)));
    ctx.fillRect(x-bw/2, bodyTop, bw, bodyH);
  });

  // Draw backtest trade markers
  const tradeMap = {};
  stBTTrades.forEach(tr=>{ tradeMap[tr.i] = tr; });

  visible.forEach((c,i)=>{
    const globalI = stViewOffset + i;
    const tr = tradeMap[globalI];
    if(!tr) return;
    const x = 42 + i*candleW + candleW/2;
    const isWin = tr.pnl > 0;
    // Entry arrow
    ctx.fillStyle = tr.dir==='BUY' ? '#00ffa3' : '#ff4d6a';
    ctx.beginPath();
    const arrY = tr.dir==='BUY' ? py(c.l)-8 : py(c.h)+8;
    const dir = tr.dir==='BUY' ? 1 : -1;
    ctx.moveTo(x, arrY-dir*8);
    ctx.lineTo(x-5, arrY);
    ctx.lineTo(x+5, arrY);
    ctx.closePath();
    ctx.fill();
    // P&L label
    ctx.font = 'bold 9px Share Tech Mono';
    ctx.fillStyle = isWin ? '#00ffa3' : '#ff4d6a';
    ctx.textAlign = 'center';
    ctx.fillText((isWin?'+':'')+tr.pnl.toFixed(0), x, arrY - dir*12);
  });

  // Time labels
  ctx.fillStyle='rgba(120,136,153,.6)';ctx.font='8px Share Tech Mono';ctx.textAlign='center';
  const step = Math.max(1, Math.floor(visible.length/6));
  visible.forEach((c,i)=>{
    if(i%step===0){
      const x=42+i*candleW+candleW/2;
      const d=new Date(c.t);
      const lbl=d.getMonth()+1+'/'+d.getDate()+' '+d.getHours().toString().padStart(2,'0')+':00';
      ctx.fillText(lbl,x,H-3);
    }
  });
}

// ---- CHART ZOOM/PAN ----
function stZoomIn(){stViewRange=Math.max(20,stViewRange-Math.max(1,Math.floor(stViewRange*0.25)));drawChart();}
function stZoomOut(){stViewRange=Math.min(stCandles.length,stViewRange+Math.max(1,Math.floor(stViewRange*0.25)));drawChart();}
function stResetZoom(){stViewOffset=0;stViewRange=Math.min(120,stCandles.length);drawChart();}

// Chart mouse/touch pan
document.addEventListener('DOMContentLoaded',()=>{
  const canvas=document.getElementById('stChart');
  if(!canvas)return;
  canvas.addEventListener('mousedown',e=>{stIsDragging=true;stDragStartX=e.clientX;stDragStartOffset=stViewOffset;});
  window.addEventListener('mouseup',()=>stIsDragging=false);
  window.addEventListener('mousemove',e=>{
    if(!stIsDragging||!stCandles.length)return;
    const dx=e.clientX-stDragStartX;
    const wrap=document.getElementById('stChartWrap');
    const pxPerCandle=(wrap.clientWidth-50)/stViewRange;
    stViewOffset=stDragStartOffset-Math.round(dx/pxPerCandle);
    stViewOffset=Math.max(0,Math.min(stCandles.length-stViewRange,stViewOffset));
    drawChart();
  });
  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    if(e.deltaY<0)stZoomIn();else stZoomOut();
  });
  // Default dates
  const today=new Date();const past=new Date();past.setMonth(past.getMonth()-3);
  const f=document.getElementById('stDateFrom');const t=document.getElementById('stDateTo');
  if(f)f.value=past.toISOString().split('T')[0];
  if(t)t.value=today.toISOString().split('T')[0];
});

// ---- RENDER RESULTS ----
function renderBTResults(trades, capital, params) {
  if(!trades.length){
    document.getElementById('stStatsGrid').innerHTML='<div style="color:var(--text3);font-size:.82rem;padding:10px;">No trades generated. Try different parameters or a longer date range.</div>';
    document.getElementById('stTradesList').innerHTML='';
    return;
  }

  const wins=trades.filter(t=>t.pnl>0);
  const losses=trades.filter(t=>t.pnl<=0);
  const totalPnl=trades.reduce((s,t)=>s+t.pnl,0);
  const wr=wins.length/trades.length*100;
  const avgW=wins.length?wins.reduce((s,t)=>s+t.pnl,0)/wins.length:0;
  const avgL=losses.length?Math.abs(losses.reduce((s,t)=>s+t.pnl,0)/losses.length):1;
  const pf=avgL>0?(avgW*wins.length)/(avgL*Math.max(1,losses.length)):0;
  const finalBal=capital+totalPnl;
  const maxDD=calcMaxDD(trades,capital);
  const sharpe=calcSharpe(trades);

  const stats=[
    {l:'Net Profit',v:fmt$(totalPnl),c:totalPnl>=0?'var(--green)':'var(--red)'},
    {l:'Win Rate',v:wr.toFixed(1)+'%',c:wr>=50?'var(--green)':'var(--red)'},
    {l:'Profit Factor',v:pf.toFixed(2),c:pf>=1.5?'var(--green)':pf>=1?'var(--gold)':'var(--red)'},
    {l:'Total Trades',v:trades.length,c:'var(--text)'},
    {l:'Max Drawdown',v:maxDD.toFixed(1)+'%',c:'var(--red)'},
    {l:'Sharpe Ratio',v:sharpe.toFixed(2),c:sharpe>=1?'var(--green)':'var(--gold)'},
    {l:'Avg Win',v:fmt$(avgW),c:'var(--green)'},
    {l:'Avg Loss',v:fmt$(-avgL),c:'var(--red)'},
    {l:'Final Balance',v:fmt$(finalBal),c:finalBal>=capital?'var(--green)':'var(--red)'},
    {l:'Return',v:((finalBal/capital-1)*100).toFixed(2)+'%',c:finalBal>=capital?'var(--green)':'var(--red)'},
    {l:'Wins',v:wins.length,c:'var(--green)'},
    {l:'Losses',v:losses.length,c:'var(--red)'},
  ];

  document.getElementById('stStatsGrid').innerHTML=stats.map(s=>`
    <div class="st-stat">
      <div class="st-stat-lbl">${s.l}</div>
      <div class="st-stat-val" style="color:${s.c}">${s.v}</div>
    </div>`).join('');

  document.getElementById('stTradesList').innerHTML=trades.slice(-50).reverse().map(tr=>`
    <div class="st-trade-row ${tr.pnl>0?'profit':'loss-t'}">
      <span style="color:var(--text3);font-size:.68rem;">${new Date(tr.t).toLocaleDateString()}</span>
      <span style="color:${tr.dir==='BUY'?'var(--green)':'var(--red)'};font-weight:600;">${tr.dir}</span>
      <span>${tr.entry.toFixed(4)}</span>
      <span>${tr.exit.toFixed(4)}</span>
      <span style="color:${tr.pnl>0?'var(--green)':'var(--red)'};font-weight:700;">${fmt$(tr.pnl)}</span>
      <span style="color:${tr.balance>=capital?'var(--green)':'var(--red)'}">${fmt$(tr.balance)}</span>
      <span style="color:${tr.rr>0?'var(--green)':'var(--red)'}">${tr.rr>0?'+':''}${tr.rr.toFixed(1)}R</span>
      <span style="color:var(--text3);font-size:.7rem;">${tr.reason}</span>
    </div>`).join('');

  // Monthly breakdown
  const monthly={};
  trades.forEach(tr=>{const m=new Date(tr.t).toISOString().slice(0,7);if(!monthly[m])monthly[m]={pnl:0,trades:0,wins:0};monthly[m].pnl+=tr.pnl;monthly[m].trades++;if(tr.pnl>0)monthly[m].wins++;});
  document.getElementById('stTab-monthly-content').innerHTML=`<table class="dt" style="font-size:.78rem;"><tr><th>Month</th><th>Trades</th><th>Win%</th><th>P&L</th><th>Return</th></tr>${Object.entries(monthly).map(([m,d])=>`<tr><td>${m}</td><td>${d.trades}</td><td style="color:${d.wins/d.trades>=0.5?'var(--green)':'var(--red)'}">${(d.wins/d.trades*100).toFixed(0)}%</td><td style="color:${d.pnl>=0?'var(--green)':'var(--red)'}">${fmt$(d.pnl)}</td><td style="color:${d.pnl>=0?'var(--green)':'var(--red)'}">${(d.pnl/capital*100).toFixed(2)}%</td></tr>`).join('')}</table>`;

  // AI Analysis
  const aiTxt=genBTAnalysis(trades,{wr,pf,avgW,avgL,totalPnl,capital,maxDD,sharpe});
  document.getElementById('stTab-ai-content').innerHTML=aiTxt;
}

function calcMaxDD(trades, capital) {
  let peak=capital, maxDD=0, bal=capital;
  trades.forEach(t=>{bal+=t.pnl;if(bal>peak)peak=bal;const dd=(peak-bal)/peak*100;if(dd>maxDD)maxDD=dd;});
  return maxDD;
}

function calcSharpe(trades) {
  if(trades.length<2)return 0;
  const returns=trades.map(t=>t.pnl);
  const avg=returns.reduce((a,b)=>a+b)/returns.length;
  const std=Math.sqrt(returns.map(r=>Math.pow(r-avg,2)).reduce((a,b)=>a+b)/returns.length);
  return std>0?(avg/std)*Math.sqrt(252):0;
}

function genBTAnalysis(trades, stats) {
  const {wr,pf,avgW,avgL,totalPnl,capital,maxDD,sharpe}=stats;
  const grade=pf>=2&&wr>=55?'A+':pf>=1.5&&wr>=50?'A':pf>=1.2?'B':pf>=1?'C':'D';
  const consWins=maxConsec(trades,true), consLoss=maxConsec(trades,false);
  return `
    <div class="ic"><div class="ic-type">🎯 STRATEGY GRADE: ${grade}</div><div class="ic-txt">
      ${pf>=2?'🟢 Excellent edge. This strategy is highly profitable over this dataset.':pf>=1.5?'🟡 Good edge with solid risk-adjusted returns.':pf>=1?'🟠 Marginal edge. Consider optimizing parameters.':'🔴 Negative edge. Review strategy logic.'}
      <br>Win Rate: ${wr.toFixed(1)}% | Profit Factor: ${pf.toFixed(2)} | Sharpe: ${sharpe.toFixed(2)}
    </div></div>
    <div class="ic"><div class="ic-type">📊 PERFORMANCE INSIGHTS</div><div class="ic-txt">
      • Net return: ${(totalPnl/capital*100).toFixed(2)}% on $${capital.toLocaleString()} capital<br>
      • Max consecutive wins: ${consWins} | Max consecutive losses: ${consLoss}<br>
      • Max drawdown: ${maxDD.toFixed(1)}% — ${maxDD>20?'⚠️ High. Reduce position size.':maxDD>10?'⚠️ Moderate. Monitor closely.':'✅ Acceptable level.'}<br>
      • Average win: ${fmt$(avgW)} | Average loss: ${fmt$(-avgL)}
    </div></div>
    <div class="ic"><div class="ic-type">💡 OPTIMIZATION SUGGESTIONS</div><div class="ic-txt">
      ${wr<45?'• Win rate is low. Consider tightening entry conditions or adding a trend filter.<br>':''
      }${pf<1.5?'• Improve RR ratio. Consider wider TP or tighter SL.<br>':''
      }${maxDD>15?'• Reduce position size by 50% to control drawdown.<br>':''
      }${consLoss>4?'• Implement a max consecutive loss rule (e.g., stop after 3 losses).<br>':''
      }${trades.length<30?'• Too few trades for statistical significance. Use longer date range.<br>':''
      }• Consider running on multiple timeframes to confirm robustness.
    </div></div>
    <div class="ic"><div class="ic-type">⚠️ OVERFITTING WARNING</div><div class="ic-txt">
      ${trades.length<50?'Low trade count. Results may not be statistically reliable — use more data.':'Trade count sufficient for basic analysis. Walk-forward test recommended for confirmation.'}
      <br>Never trade live based solely on backtest results. Always forward-test first.
    </div></div>`;
}

function maxConsec(trades, wins) {
  let max=0,cur=0;
  trades.forEach(t=>{if(wins?t.pnl>0:t.pnl<=0){cur++;max=Math.max(max,cur);}else cur=0;});
  return max;
}

function stShowTab(name) {
  ['trades','monthly','ai'].forEach(t=>{
    const btn=document.getElementById(`stTab-${t}`);
    const cont=document.getElementById(`stTab-${t}-content`);
    if(btn)btn.classList.toggle('on',t===name);
    if(cont)cont.style.display=t===name?'block':'none';
  });
}

function drawEquityMini(trades, capital) {
  const canvas=document.getElementById('stEquityMini');if(!canvas)return;
  const ctx=canvas.getContext('2d');
  canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;
  const W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  if(!trades.length)return;
  const pts=[capital,...trades.map(t=>t.balance)];
  const mn=Math.min(...pts),mx=Math.max(...pts);
  const py=p=>H-H*0.05-H*0.9*((p-mn)/(mx-mn||1));
  const px=i=>(i/(pts.length-1))*W;
  ctx.beginPath();ctx.moveTo(px(0),py(pts[0]));
  pts.forEach((p,i)=>{if(i>0)ctx.lineTo(px(i),py(p));});
  ctx.strokeStyle='#00ffa3';ctx.lineWidth=1.5;ctx.stroke();
  // Fill
  ctx.lineTo(px(pts.length-1),H);ctx.lineTo(0,H);ctx.closePath();
  ctx.fillStyle='rgba(0,255,163,.08)';ctx.fill();
}

function exportBTResults() {
  if(!stBTTrades.length){showToast('❌ No results to export');return;}
  const hdr='Date,Direction,Entry,Exit,PnL,Balance,RR,Reason';
  const rows=stBTTrades.map(t=>`${new Date(t.t).toISOString()},${t.dir},${t.entry.toFixed(4)},${t.exit.toFixed(4)},${t.pnl.toFixed(2)},${t.balance.toFixed(2)},${t.rr.toFixed(2)},${t.reason}`);
  const csv=[hdr,...rows].join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`TM_Backtest_${stSymbol}_${stTF}_${Date.now()}.csv`;a.click();
  showToast('📥 CSV exported!');
}

// ---- WINDOW RESIZE ----
window.addEventListener('resize',()=>{if(stCandles.length)drawChart();});


// ====================================================
