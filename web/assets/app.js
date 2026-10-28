/* Renders the dashboard views from EMIData. Pure client-side; swap EMIData for
   Firestore reads later and these same render functions keep working. */
(function () {
  const { PKR, accounts, staff, collectionsByMonth, derive, summary } = window.EMIData;
  const S = summary();
  const $ = sel => document.querySelector(sel);

  const stateChip = s => ({
    active:  '<span class="chip ok"><span class="d"></span>Active</span>',
    overdue: '<span class="chip warn"><span class="d"></span>Overdue</span>',
    locked:  '<span class="chip crit"><span class="d"></span>Locked</span>',
    done:    '<span class="chip done">Completed</span>',
  }[s] || s);

  /* ---------------- Overview ---------------- */
  function renderOverview() {
    const kpis = [
      { k:'Receivable (portfolio)', v:PKR(S.portfolio), ic:'₨', cls:'ic-blue',  d:`<span class="up">${S.activeCount} active plans</span> still paying` },
      { k:'Expected this month',    v:PKR(S.expectedMonth), ic:'▲', cls:'ic-green', d:`${S.deviceCount} devices financed in total` },
      { k:'Collected this month',   v:PKR(S.collectedMonth), ic:'✓', cls:'ic-green', d:`<span class="up">${Math.round(S.collectedMonth/S.expectedMonth*100)}%</span> of expected` },
      { k:'Overdue amount',         v:PKR(S.overdueAmt), ic:'!', cls:'ic-amber', d:`<span class="dn">${S.overdueCount} overdue</span> · ${S.lockedCount} locked` },
    ];
    const kpiHtml = kpis.map(c => `
      <div class="kpi">
        <div class="top"><span class="k">${c.k}</span><span class="badge-ic ${c.cls}">${c.ic}</span></div>
        <div class="v tnum">${c.v}</div>
        <div class="d">${c.d}</div>
      </div>`).join('');

    // attention table: overdue + locked first
    const attention = accounts.filter(a => a.state==='overdue' || a.state==='locked');
    const attHtml = attention.map(a => {
      const d = derive(a);
      return `<tr>
        <td><div class="cust">${a.customer}</div><div class="sub tnum">${a.id}</div></td>
        <td>${a.phone}</td>
        <td class="tnum">${PKR(a.monthly)}/mo</td>
        <td class="tnum">${PKR(d.outstanding)}</td>
        <td>${stateChip(a.state)}</td>
        <td><div class="rowact">
          ${a.state==='locked'
            ? '<button class="icbtn unlock">Unlock</button>'
            : '<button class="icbtn lock">Lock</button>'}
          <button class="icbtn">Mark paid</button>
        </div></td>
      </tr>`;
    }).join('');

    $('#view-overview').innerHTML = `
      <div class="kpis">${kpiHtml}</div>
      <div class="grid2">
        <div class="panel">
          <div class="ph"><h3>Collections — last 6 months</h3><span class="hint">PKR received per month</span></div>
          <div class="pb"><div class="chart-wrap">${barChart(collectionsByMonth)}</div></div>
        </div>
        <div class="panel">
          <div class="ph"><h3>This month</h3><span class="hint">October</span></div>
          <div class="pb">
            ${ring(S.collectedMonth, S.expectedMonth)}
            <div class="legend-rows">
              <div class="lrow"><span class="dot" style="background:var(--chart)"></span><span class="nm">Collected</span><span class="amt tnum">${PKR(S.collectedMonth)}</span></div>
              <div class="lrow"><span class="dot" style="background:var(--warn)"></span><span class="nm">Overdue</span><span class="amt tnum">${PKR(S.overdueAmt)}</span></div>
              <div class="lrow"><span class="dot" style="background:var(--crit)"></span><span class="nm">Locked</span><span class="amt tnum">${PKR(S.lockedAmt)}</span></div>
              <div class="lrow" style="border-top:1px solid var(--line-2);padding-top:10px"><span class="nm" style="font-weight:600;color:var(--ink)">Expected</span><span class="amt tnum">${PKR(S.expectedMonth)}</span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="panel" style="margin-top:16px">
        <div class="ph"><h3>Attention needed</h3><span class="hint">${attention.length} accounts overdue or locked</span></div>
        <div class="tablewrap">
          <table>
            <thead><tr><th>Customer</th><th>Phone</th><th>Installment</th><th>Outstanding</th><th>State</th><th>Actions</th></tr></thead>
            <tbody>${attHtml}</tbody>
          </table>
        </div>
      </div>`;
    wireChart();
  }

  /* ---------------- bar chart (single series, blue) ---------------- */
  function barChart(data) {
    const W=560, H=240, padL=48, padB=34, padT=16, padR=12;
    const max = Math.max(...data.map(d=>d.amt));
    const niceMax = Math.ceil(max/50000)*50000;
    const plotW = W-padL-padR, plotH = H-padB-padT;
    const bw = plotW/data.length*0.54;
    const gap = plotW/data.length;
    // y gridlines
    let grid='';
    for (let i=0;i<=4;i++){
      const val = niceMax/4*i;
      const y = padT+plotH-(val/niceMax)*plotH;
      grid += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--grid)" stroke-width="1"/>
               <text x="${padL-8}" y="${y+4}" text-anchor="end" font-size="10" fill="var(--muted)">${(val/1000)}k</text>`;
    }
    let bars='';
    data.forEach((d,i)=>{
      const x = padL + gap*i + (gap-bw)/2;
      const h = (d.amt/niceMax)*plotH;
      const y = padT+plotH-h;
      bars += `<rect class="bar" data-m="${d.m}" data-amt="${d.amt}" x="${x}" y="${y}" width="${bw}" height="${h}"
                rx="4" fill="var(--chart)"></rect>
               <text x="${x+bw/2}" y="${y-7}" text-anchor="middle" font-size="10.5" fill="var(--ink-2)" font-weight="600">${Math.round(d.amt/1000)}k</text>
               <text x="${x+bw/2}" y="${H-padB+18}" text-anchor="middle" font-size="11" fill="var(--muted)">${d.m}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Monthly collections">
      ${grid}
      <line x1="${padL}" y1="${padT+plotH}" x2="${W-padR}" y2="${padT+plotH}" stroke="var(--baseline,#c3c2b7)" stroke-width="1"/>
      ${bars}
    </svg>`;
  }

  function wireChart() {
    const tip = $('#tip');
    document.querySelectorAll('.bar').forEach(b=>{
      b.addEventListener('mousemove', e=>{
        tip.innerHTML = `<b>${b.dataset.m}</b> · ${PKR(+b.dataset.amt)}`;
        tip.style.opacity=1; tip.style.left=(e.clientX+12)+'px'; tip.style.top=(e.clientY-10)+'px';
        b.setAttribute('fill','var(--chart-hover,#1c5cab)');
      });
      b.addEventListener('mouseleave', ()=>{ tip.style.opacity=0; b.setAttribute('fill','var(--chart)'); });
    });
  }

  /* ---------------- ring (collected vs expected) ---------------- */
  function ring(collected, expected) {
    const pct = Math.min(collected/expected,1);
    const r=52, c=2*Math.PI*r, off=c*(1-pct);
    return `<div class="progress-ring">
      <svg width="150" height="150" viewBox="0 0 150 150">
        <circle cx="75" cy="75" r="${r}" fill="none" stroke="#edf0f4" stroke-width="16"/>
        <circle cx="75" cy="75" r="${r}" fill="none" stroke="var(--chart)" stroke-width="16"
          stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
          transform="rotate(-90 75 75)"/>
        <text x="75" y="70" text-anchor="middle" font-size="26" font-weight="800" fill="var(--ink)">${Math.round(pct*100)}%</text>
        <text x="75" y="92" text-anchor="middle" font-size="11" fill="var(--muted)">collected</text>
      </svg>
    </div>`;
  }

  /* ---------------- Devices ---------------- */
  function renderDevices() {
    const rows = accounts.map(a=>{
      const d = derive(a);
      return `<tr>
        <td><div class="cust">${a.customer}</div><div class="sub tnum">CNIC ${a.cnic}</div></td>
        <td>${a.phone}<div class="sub tnum">${a.id}</div></td>
        <td class="tnum">${PKR(a.monthly)} × ${a.months}<div class="sub">${a.paid}/${a.months} paid</div></td>
        <td class="tnum">${PKR(d.collected)}</td>
        <td class="tnum">${PKR(d.outstanding)}</td>
        <td>${stateChip(a.state)}</td>
        <td><div class="rowact">
          ${a.state==='locked' ? '<button class="icbtn unlock">Unlock</button>' : '<button class="icbtn lock">Lock</button>'}
          <button class="icbtn">Mark paid</button>
        </div></td>
      </tr>`;
    }).join('');
    $('#view-devices').innerHTML = `
      <div class="section-head"><h2>Devices</h2><button class="btn primary sm">＋ Enroll device</button></div>
      <div class="panel"><div class="tablewrap"><table>
        <thead><tr><th>Customer</th><th>Phone</th><th>Plan</th><th>Collected</th><th>Outstanding</th><th>State</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div></div>`;
  }

  /* ---------------- Staff ---------------- */
  function renderStaff() {
    const rows = staff.map(u=>{
      const initials = u.name.replace(/[^a-zA-Z ]/g,' ').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
      return `<tr>
        <td><div style="display:flex;align-items:center;gap:10px"><span class="av24">${initials}</span>
          <div><div class="cust">${u.name}</div><div class="sub">${u.email}</div></div></div></td>
        <td><span class="role ${u.role}">${u.role[0].toUpperCase()+u.role.slice(1)}</span></td>
        <td>${u.active ? '<span class="chip ok"><span class="d"></span>Active</span>' : '<span class="chip done">Disabled</span>'}</td>
        <td class="tnum sub">${u.added}</td>
        <td><div class="rowact"><button class="icbtn">Edit</button><button class="icbtn">${u.active?'Disable':'Enable'}</button></div></td>
      </tr>`;
    }).join('');
    $('#view-staff').innerHTML = `
      <div class="section-head"><h2>Staff &amp; roles</h2></div>
      <div class="formcard">
        <div style="font-weight:700;font-size:14px">Add a team member</div>
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
        <tbody>${rows}</tbody>
      </table></div></div>`;
  }

  function renderGeneric(name) {
    $('#view-generic').innerHTML = `
      <div class="panel"><div class="pb" style="padding:48px;text-align:center;color:var(--muted)">
        <div style="font-size:30px;margin-bottom:10px">⌛</div>
        <div style="font-weight:700;color:var(--ink-2)">${name} — coming next</div>
        <div class="sub" style="margin-top:6px">This section is part of the roadmap. The Overview, Devices and Staff screens are built so you can judge the UI.</div>
      </div></div>`;
  }

  /* ---------------- Nav ---------------- */
  const titles = {
    overview:['Overview','Business snapshot · October 2026'],
    devices:['Devices','All financed phones and their plans'],
    staff:['Staff & roles','Team accounts and permissions'],
    customers:['Customers','People on an installment plan'],
    payments:['Payments','Installment collection ledger'],
    reports:['Reports','Income, profit and trends'],
    settings:['Settings','Business, branding and lock policy'],
  };
  function show(view) {
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active', a.dataset.view===view));
    const [t,s] = titles[view] || [view,'']; $('#pageTitle').textContent=t; $('#pageSub').textContent=s;
    if (view==='overview'){ renderOverview(); $('#view-overview').classList.add('active'); }
    else if (view==='devices'){ renderDevices(); $('#view-devices').classList.add('active'); }
    else if (view==='staff'){ renderStaff(); $('#view-staff').classList.add('active'); }
    else { renderGeneric(t); $('#view-generic').classList.add('active'); }
    if (location.hash !== '#'+view) history.replaceState(null,'','#'+view);
  }
  document.querySelectorAll('.nav a').forEach(a=>a.addEventListener('click',()=>show(a.dataset.view)));
  show((location.hash||'#overview').slice(1));
})();
