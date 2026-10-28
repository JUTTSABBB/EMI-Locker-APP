/* Thin wrapper around the Firebase modular SDK, loaded from the CDN only when a
   real config is present. No secrets here — just the public web config.
   Exposes window.FB. When not configured, FB.configured === false and the app
   falls back to demo data. */
(function (global) {
  const CFG = global.FIREBASE_CONFIG || {};
  const configured = !!(CFG.apiKey && CFG.projectId);
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
  let _ctx = null;

  async function ctx() {
    if (_ctx) return _ctx;
    const { initializeApp } = await import(`${SDK}/firebase-app.js`);
    const authMod = await import(`${SDK}/firebase-auth.js`);
    const fsMod   = await import(`${SDK}/firebase-firestore.js`);
    const app = initializeApp(CFG);
    _ctx = { app, auth: authMod.getAuth(app), authMod, db: fsMod.getFirestore(app), fsMod };
    return _ctx;
  }

  const FB = {
    configured,

    async signIn(email, password) {
      const { auth, authMod } = await ctx();
      const cred = await authMod.signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    },
    async signInGoogle() {
      const { auth, authMod } = await ctx();
      const provider = new authMod.GoogleAuthProvider();
      const cred = await authMod.signInWithPopup(auth, provider);
      return cred.user;
    },
    async signOut() {
      const { auth, authMod } = await ctx();
      return authMod.signOut(auth);
    },
    // Calls back with the user (or null). Used to guard the dashboard.
    async onAuth(cb) {
      const { auth, authMod } = await ctx();
      return authMod.onAuthStateChanged(auth, cb);
    },
    // Read a whole collection -> array of {id, ...data}
    async getAll(collectionName) {
      const { db, fsMod } = await ctx();
      const snap = await fsMod.getDocs(fsMod.collection(db, collectionName));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    // Current Firebase ID token (sent to the Worker so it can verify the staff user)
    async idToken() {
      const { auth } = await ctx();
      return auth.currentUser ? auth.currentUser.getIdToken() : null;
    }
  };

  global.FB = FB;
})(window);
