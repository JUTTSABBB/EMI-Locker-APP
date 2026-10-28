/* Data provider: one shape, two sources.
   - Firebase configured  -> read `accounts` / `staff` from Firestore (live).
   - Not configured yet    -> demo data from EMI_MOCK.
   The finance maths (derive/summary) is shared, so the UI is identical either way. */
(function (global) {
  const PKR = n => 'PKR ' + Math.round(n).toLocaleString('en-PK');

  function derive(a) {
    const ongoing   = a.state !== 'done';
    const remMonths = Math.max(a.months - a.paid, 0);
    const collected = a.down + a.monthly * a.paid;
    const outstanding = a.monthly * remMonths;
    const totalPayable = a.down + a.monthly * a.months;
    return { ongoing, remMonths, collected, outstanding, totalPayable };
  }

  function summary(accounts, collectionsByMonth) {
    let financed=0, portfolio=0, expectedMonth=0, overdueAmt=0, lockedAmt=0, collectedMonth=0,
        collectedAll=0, activeCount=0, overdueCount=0, lockedCount=0;
    accounts.forEach(a => {
      const d = derive(a);
      collectedAll += d.collected;
      financed += (a.price - a.down);
      if (d.ongoing) {
        portfolio += d.outstanding;
        expectedMonth += a.monthly;
        activeCount++;
        if (a.state === 'overdue') { overdueAmt += a.monthly; overdueCount++; }
        else if (a.state === 'locked') { lockedAmt += a.monthly; lockedCount++; }
        else collectedMonth += a.monthly;
      }
    });
    const pendingMonth = Math.max(expectedMonth - collectedMonth, 0);
    return { financed, portfolio, expectedMonth, overdueAmt, lockedAmt, collectedAll,
             activeCount, overdueCount, lockedCount, collectedMonth, pendingMonth,
             deviceCount: accounts.length };
  }

  async function load() {
    let accounts, staff, collectionsByMonth, source;
    const FB = global.FB;
    if (FB && FB.configured) {
      try {
        accounts = await FB.getAll('accounts');
        staff    = await FB.getAll('staff');
        // collections chart: optional `metrics/collections` doc, else derive a flat view
        collectionsByMonth = (global.EMI_MOCK && global.EMI_MOCK.collectionsByMonth) || [];
        source = 'firestore';
      } catch (e) {
        console.warn('Firestore load failed, using demo data:', e);
        ({ accounts, staff, collectionsByMonth } = global.EMI_MOCK); source = 'demo';
      }
    } else {
      ({ accounts, staff, collectionsByMonth } = global.EMI_MOCK); source = 'demo';
    }
    return {
      source, PKR, accounts, staff, collectionsByMonth, derive,
      summary: () => summary(accounts, collectionsByMonth),
    };
  }

  global.EMIData = { load };
})(window);
