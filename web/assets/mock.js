/* DEMO dataset — used only when Firebase is not configured yet.
   Same field shape as the Firestore `accounts` / `staff` collections, so switching
   to live data changes nothing in the UI. */
window.EMI_MOCK = {
  accounts: [
    { id:'PK-OPPO-A17-001', customer:'Ali Raza',    cnic:'35202-1234567-1', phone:'Oppo A17',       price:42000, down:12000, months:12, monthly:2800, paid:9, start:'2026-02-10', staff:'Usman', state:'active'  },
    { id:'PK-VIVO-Y17-002', customer:'Sana Khan',    cnic:'42101-7654321-9', phone:'Vivo Y17s',      price:48000, down:15000, months:9,  monthly:4100, paid:4, start:'2026-05-01', staff:'Hira',  state:'locked'  },
    { id:'PK-INFX-H30-003', customer:'Bilal Ahmed',  cnic:'37405-1122334-5', phone:'Infinix Hot 30', price:39000, down:9000,  months:6,  monthly:5600, paid:3, start:'2026-04-18', staff:'Usman', state:'overdue' },
    { id:'PK-SAMS-A05-004', customer:'Fatima Noor',  cnic:'35201-9988776-4', phone:'Samsung A05',    price:36000, down:10000, months:10, monthly:2900, paid:6, start:'2026-03-22', staff:'Hira',  state:'active'  },
    { id:'PK-REAL-C53-005', customer:'Usman Tariq',  cnic:'61101-4455667-2', phone:'Realme C53',     price:44000, down:14000, months:12, monthly:2700, paid:2, start:'2026-07-05', staff:'Usman', state:'active'  },
    { id:'PK-TECN-S20-006', customer:'Ayesha Bibi',  cnic:'33100-7766554-8', phone:'Tecno Spark 20', price:35000, down:8000,  months:8,  monthly:3600, paid:8, start:'2025-12-12', staff:'Hira',  state:'done'    },
    { id:'PK-XIAO-13C-007', customer:'Hamza Sheikh', cnic:'35202-3322110-6', phone:'Redmi 13C',      price:41000, down:11000, months:10, monthly:3200, paid:1, start:'2026-09-01', staff:'Usman', state:'overdue' },
    { id:'PK-OPPO-A60-008', customer:'Zara Malik',   cnic:'42201-6677889-3', phone:'Oppo A60',       price:52000, down:18000, months:12, monthly:3100, paid:5, start:'2026-05-20', staff:'Hira',  state:'active'  },
  ],
  staff: [
    { name:'Nadeem (You)', email:'nadeem@ozzun.com', role:'admin',   active:true,  added:'2026-01-02' },
    { name:'Usman Ali',    email:'usman@ozzun.com',  role:'manager', active:true,  added:'2026-02-14' },
    { name:'Hira Javed',   email:'hira@ozzun.com',   role:'staff',   active:true,  added:'2026-03-09' },
    { name:'Kashif Raza',  email:'kashif@ozzun.com', role:'staff',   active:false, added:'2026-06-21' },
  ],
  collectionsByMonth: [
    { m:'May', amt:20800 }, { m:'Jun', amt:22400 }, { m:'Jul', amt:23900 },
    { m:'Aug', amt:22600 }, { m:'Sep', amt:24100 }, { m:'Oct', amt:11500 },
  ],
};
