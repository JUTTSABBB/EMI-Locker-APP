/* Renders dashboard views from EMIData. Pure client-side; swap EMIData for Firestore later. */
(function () {
  const { PKR, accounts, staff, collectionsByMonth, derive, summary } = window.EMIData;
  const S = summary();
  const $ = s => document.querySelector(s);

  /* inline icons (lucide-style) */
  const I = {
    coins:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><ellipse cx="8" cy="6" rx="5.5" ry="2.6"/><path d="M2.5 6v5c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6V6"/><path d="M13.5 11.5c.6 1 2.8 1.8 5 1.8 3 0 5.5-1.2 5.5-2.6" transform="translate(-2.5 0)"/><ellipse cx="16" cy="13" rx="5.5" ry="2.6"/><path d="M10.5 13v5c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-5"/></svg>',
    trup:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>',
    check:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></svg>',
    alert:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M12 3l9.5 16.5H2.5z"/><line x1="12" y1="10" x2="12" y2="14"/><circle cx="12" cy="17.3" r=".6" fill="currentColor"/></svg>',
    up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 15 12 9 18 15"/></svg>',
    down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="6 9 12 15 18 9"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  };
  const trend = (dir,txt)=>`<span class="trend ${dir}">${dir==='up'?I.up:dir==='down'?I.down:''}${txt}</span>`;

  const stateChip = s => ({
    active:'<span class="chip ok"><span class="d"></span>Active</span>',
    overdue:'<span class="chip warn"><span class="d"></span>Overdue</span>',
    locked:'<span class="chip crit"><span class="d"></span>Locked</span>',
    done:'<span class="chip done">Completed</span>',
  }[s] || s);

  /* ---------------- Overview ---------------- */
  function renderOverview() {
    const pctCollected = Math.round(S.collectedMonth / S.expectedMonth * 100);
    const kpis = [
      { k:'Receivable (portfolio)', v:PKR(S.portfolio), ic:I.coins, cls:'ic-blue',
        d:`${trend('up','4.2%')} vs last month` },
      { k:'Expected this month', v:PKR(S.expectedMonth), ic:I.trup, cls:'ic-green',
        d:`${S.activeCount} active plans · ${S.deviceCount} devices` },
      { k:'Collected this month', v:PKR(S.collectedMonth), ic:I.check, cls:'ic-green',
        d:`${trend('up',pctCollected+'%')} of expected` },
      { k:'Overdue amount', v:PKR(S.overdueAmt), ic:I.alert, cls:'ic-amber',
        d:`${trend('down',S.overdueCount+' overdue')} · ${S.lockedCount} locked` },
    ];
    const kpiHtml = kpis.map(c=>`
      <div class="kpi">
        <div class="top"><span class="k">${c.k}</span><span class="ic ${c.cls}">${c.ic}</span></div>
        <div class="v tnum">${c.v}</div>
        <div class="d">${c.d}</div>
      </div>`).join('');

    const attention = accounts.filter(a=>a.state==='overdue'||a.state==='locked');
    const attHtml = attention.map(a=>{
      const d = derive(a);
      return `<tr>
        <td data-label="Customer"><div><div class="cust">${a.customer}</div><div class="sub tnum">${a.id}</div></div></td>
        <td data-label="Phone">${a.phone}</td>
        <td data-label="Installment" class="r tnum">${PKR(a.monthly)}/mo</td>
        <td data-label="Outstanding" class="r tnum">${PKR(d.outstanding)}</td>
        <td data-label="State">${stateChip(a.state)}</td>
        <td data-label=""><div class="rowact">
          ${a.state==='locked'?'<button class="icbtn unlock">Unlock</button>':'<button class="icbtn lock">Lock</button>'}
          <button class="icbtn">Mark paid</button></div></td>
      </tr>`;
    }).join('');

    $('#view-overview').innerHTML = `
      <div class="kpis">${kpiHtml}</div>
      <div class="grid2">
        <div class="panel">
          <div class="ph"><h3>Collections — last 6 months</h3><span class="hint">PKR received / month</span></div>
          <div class="pb"><div class="chart-wrap">${barChart(collectionsByMonth)}</div></div>
        </div>
        <div class="panel">
          <div class="ph"><h3>This month</h3><span class="hint">October</span></div>
          <div class="pb">
            ${ring(S.collectedMonth,S.expectedMonth)}
            <div class="legend-rows">
              <div class="lrow"><span class="dot" style="background:var(--chart)"></span><span class="nm">Collected</span><span class="amt tnum">${PKR(S.collectedMonth)}</span></div>
              <div class="lrow"><span class="dot" style="background:var(--warn)"></span><span class="nm">Overdue</span><span class="amt tnum">${PKR(S.overdueAmt)}</span></div>
              <div class="lrow"><span class="dot" style="background:var(--crit)"></span><span class="nm">Locked</span><span class="amt tnum">${PKR(S.lockedAmt)}</span></div>
              <div class="lrow" style="border-top:1px solid var(--line-soft);padding-top:11px"><span class="nm" style="font-weight:600;color:var(--ink)">Expected</span><span class="amt tnum">${PKR(S.expectedMonth)}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel" style="margin-top:14px">
        <div class="ph"><h3>Attention needed</h3><span class="hint">${attention.length} accounts overdue or locked</span></div>
        <div class="tablewrap"><table>
          <thead><tr><th>Customer</th><th>Phone</th><th class="r">Installment</th><th class="r">Outstanding</th><th>State</th><th></th></tr></thead>
          <tbody>${attHtml}</tbody>
        </table></div>
      </div>`;
    wireChart();
  }

  /* bar chart — single series blue, hover tooltip, value labels */
  function barChart(data){
    const W=560,H=238,padL=44,padB=32,padT=18,padR=10;
    const max=Math.max(...data.map(d=>d.amt));
    const niceMax=Math.ceil(max/5000)*5000;
    const plotW=W-padL-padR,plotH=H-padB-padT,gap=plotW/data.length,bw=gap*0.5;
    let grid='';
    for(let i=0;i<=4;i++){const val=niceMax/4*i;const y=padT+plotH-(val/niceMax)*plotH;
      grid+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--grid)"/>
             <text x="${padL-8}" y="${y+3.5}" text-anchor="end" font-size="10" fill="var(--muted)">${Math.round(val/1000)}k</text>`;}
    let bars='';
    data.forEach((d,i)=>{const x=padL+gap*i+(gap-bw)/2;const h=(d.amt/niceMax)*plotH;const y=padT+plotH-h;
      bars+=`<rect class="bar" data-m="${d.m}" data-amt="${d.amt}" x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="var(--chart)"/>
             <text x="${x+bw/2}" y="${y-6}" text-anchor="middle" font-size="10.5" fill="var(--ink-2)" font-weight="600">${Math.round(d.amt/1000)}k</text>
             <text x="${x+bw/2}" y="${H-padB+17}" text-anchor="middle" font-size="11" fill="var(--muted)">${d.m}</text>`;});
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monthly collections">
      ${grid}<line x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}" stroke="#d9dbe3"/>${bars}</svg>`;
  }
  function wireChart(){
    const tip=$('#tip');
    document.querySelectorAll('.bar').forEach(b=>{
      b.addEventListener('mousemove',e=>{tip.innerHTML=`<b>${b.dataset.m}</b> · ${PKR(+b.dataset.amt)}`;
        tip.style.opacity=1;tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-10)+'px';
        b.setAttribute('fill','var(--chart-hover)');});
      b.addEventListener('mouseleave',()=>{tip.style.opacity=0;b.setAttribute('fill','var(--chart)');});
    });
  }
  function ring(collected,expected){
    const pct=Math.min(collected/expected,1),r=52,c=2*Math.PI*r,off=c*(1-pct);
    return `<div class="progress-ring"><svg width="152" height="152" viewBox="0 0 152 152">
      <circle cx="76" cy="76" r="${r}" fill="none" stroke="#eef0f4" stroke-width="15"/>
      <circle cx="76" cy="76" r="${r}" fill="none" stroke="var(--chart)" stroke-width="15" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 76 76)"/>
      <text x="76" y="71" text-anchor="middle" font-size="27" font-weight="800" fill="var(--ink)">${Math.round(pct*100)}%</text>
      <text x="76" y="93" text-anchor="middle" font-size="11" fill="var(--muted)">collected</text></svg></div>`;
  }

  /* ---------------- Devices ---------------- */
  function renderDevices(){
    const rows=accounts.map(a=>{const d=derive(a);
      return `<tr>
        <td data-label="Customer"><div><div class="cust">${a.customer}</div><div class="sub tnum">CNIC ${a.cnic}</div></div></td>
        <td data-label="Phone">${a.phone}<div class="sub tnum">${a.id}</div></td>
        <td data-label="Plan" class="tnum">${PKR(a.monthly)} × ${a.months}<div class="sub">${a.paid}/${a.months} paid</div></td>
        <td data-label="Collected" class="r tnum">${PKR(d.collected)}</td>
        <td data-label="Outstanding" class="r tnum">${PKR(d.outstanding)}</td>
        <td data-label="State">${stateChip(a.state)}</td>
        <td data-label=""><div class="rowact">
          ${a.state==='locked'?'<button class="icbtn unlock">Unlock</button>':'<button class="icbtn lock">Lock</button>'}
          <button class="icbtn">Mark paid</button></div></td>
      </tr>`;}).join('');
    $('#view-devices').innerHTML=`
      <div class="section-head"><h2>Devices</h2><button class="btn primary sm">${I.plus} Enroll device</button></div>
      <div class="panel"><div class="tablewrap"><table>
        <thead><tr><th>Customer</th><th>Phone</th><th>Plan</th><th class="r">Collected</th><th class="r">Outstanding</th><th>State</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>`;
  }

  /* ---------------- Staff ---------------- */
  function renderStaff(){
    const rows=staff.map(u=>{
      const initials=u.name.replace(/[^a-zA-Z ]/g,' ').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
      return `<tr>
        <td data-label="Member"><div style="display:flex;align-items:center;gap:10px"><span class="av24">${initials}</span>
          <div><div class="cust">${u.name}</div><div class="sub">${u.email}</div></div></div></td>
        <td data-label="Role"><span class="role ${u.role}">${u.role[0].toUpperCase()+u.role.slice(1)}</span></td>
        <td data-label="Status">${u.active?'<span class="chip ok"><span class="d"></span>Active</span>':'<span class="chip done">Disabled</span>'}</td>
        <td data-label="Added" class="tnum sub">${u.added}</td>
        <td data-label=""><div class="rowact"><button class="icbtn">Edit</button><button class="icbtn">${u.active?'Disable':'Enable'}</button></div></td>
      </tr>`;}).join('');
    $('#view-staff').innerHTML=`
      <div class="section-head"><h2>Staff &amp; roles</h2></div>
      <div class="formcard">
        <div class="ft">Add a team member</div>
        <div class="sub" style="margin-top:3px">Admin creates accounts for managers and shop staff. Each role sees only what it needs.</div>
        <div class="formgrid">
          <div class="fld"><label>Full name</label><input placeholder="e.g. Imran Khan"/></div>
          <div class="fld"><label>Email</label><input placeholder="name@ozzun.com"/></div>
          <div class="fld"><label>Role</label><select><option>Staff</option><option>Manager</option><option>Admin</option></select></div>
          <div class="fld"><label>Temp password</label><input placeholder="Auto-generated"/></div>
        </div>
        <div style="margin-top:14px"><button class="btn primary sm">Create account &amp; send invite</button></div>
      </div>
      <div class="panel"><div class="tablewrap"><table>
        <thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Added</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>`;
  }

  function renderGeneric(name){
    $('#view-generic').innerHTML=`<div class="panel"><div class="pb" style="padding:52px;text-align:center;color:var(--muted)">
      <div style="font-size:15px;font-weight:700;color:var(--ink-2)">${name}</div>
      <div class="sub" style="margin-top:6px">This section is on the roadmap. Overview, Devices and Staff are built so you can judge the UI.</div></div></div>`;
  }

  /* ---------------- Nav + drawer ---------------- */
  const titles={
    overview:['Overview','Business snapshot · October 2026'],
    devices:['Devices','All financed phones and their plans'],
    staff:['Staff & roles','Team accounts and permissions'],
    customers:['Customers','People on an installment plan'],
    payments:['Payments','Installment collection ledger'],
    reports:['Reports','Income, profit and trends'],
    settings:['Settings','Business, branding and lock policy'],
  };
  const app=$('#app');
  function closeDrawer(){ app.classList.remove('nav-open'); }
  function show(view){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.view===view));
    const [t,s]=titles[view]||[view,''];$('#pageTitle').textContent=t;$('#pageSub').textContent=s;
    if(view==='overview'){renderOverview();$('#view-overview').classList.add('active');}
    else if(view==='devices'){renderDevices();$('#view-devices').classList.add('active');}
    else if(view==='staff'){renderStaff();$('#view-staff').classList.add('active');}
    else{renderGeneric(t);$('#view-generic').classList.add('active');}
    history.replaceState(null,'','#'+view);
    closeDrawer();
  }
  document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>show(a.dataset.view)));
  $('#hamburger').addEventListener('click',()=>app.classList.toggle('nav-open'));
  $('#overlay').addEventListener('click',closeDrawer);
  show((location.hash||'#overview').slice(1));
})();
