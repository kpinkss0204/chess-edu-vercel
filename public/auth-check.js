(function() {
  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDiBFoUf2QVG9QXO34Xny0bSslFYaiwozg",
    authDomain: "chess-education-464fc.firebaseapp.com",
    projectId: "chess-education-464fc",
    storageBucket: "chess-education-464fc.firebasestorage.app",
    messagingSenderId: "963998720041",
    appId: "1:963998720041:web:aa4037707214d3777c7c38",
    databaseURL: "https://chess-education-464fc-default-rtdb.firebaseio.com"
  };

  // Initialize Firebase if not already initialized
  if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    // Expose Firebase services globally
    window._auth = firebase.auth();
    window._fbAuth = firebase.auth();
    if (typeof firebase.firestore === 'function') window._fbDb = firebase.firestore();
    if (typeof firebase.database === 'function') window._rtDb = firebase.database();

    // Authentication state observer
    window._auth.onAuthStateChanged(function(user) {
      checkAuth(user);
    });

    // Back-button navigation check
    window.addEventListener('pageshow', function(event) {
      // If navigating back and not on auth page, re-verify auth state
      const path = window.location.pathname;
      const isAuthPage = path.endsWith('auth.html') || path.includes('/auth');
      if (!isAuthPage) {
        window._auth.onAuthStateChanged(function(user) {
          if (!user) window.location.href = '/auth';
        });
      }
    });

    function checkAuth(user) {
      const path = window.location.pathname;
      const isAuthPage = path.endsWith('auth.html') || path.includes('/auth');

      if (user) {
        window._user = user;
        window._currentUser = user;
        
        // 이메일 인증 여부 확인 (Google 로그인은 이미 인증된 것으로 간주)
        const isPasswordProvider = user.providerData && user.providerData.some(p => p.providerId === 'password');
        const isVerified = user.emailVerified || !isPasswordProvider;

        const name = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
        
        // Update Sidebar UI
        const avatarEl = document.getElementById('sidebar-avatar-letter');
        const nameEl = document.getElementById('sidebar-username');
        if (avatarEl) avatarEl.textContent = name[0].toUpperCase();
        if (nameEl) nameEl.textContent = name;
        
        // Update Play page specific elements
        const myAvatarEl = document.getElementById('my-avatar-el');
        const myNameEl = document.getElementById('my-name-el');
        if (myAvatarEl) myAvatarEl.textContent = name[0].toUpperCase();
        if (myNameEl) myNameEl.textContent = name;

        if (isVerified) {
          // 로그인 상태인데 인증 페이지(로그인/가입)에 있으면 메인(/)으로 이동
          if (isAuthPage) {
            window.location.href = '/';
          }
        } else {
          // 로그인 상태이지만 미인증 상태인데 인증 페이지가 아니면 인증 페이지로 이동
          if (!isAuthPage) {
            window.location.href = '/auth';
          }
        }
      } else {
        // 비로그인 상태인데 인증 페이지가 아니면 로그인 페이지로 이동
        if (!isAuthPage) {
          window.location.href = '/auth';
        }
      }
    }

    // Global logout handler
    window.handleLogout = function() {
      window._auth.signOut().then(function() {
        window.location.href = '/auth';
      }).catch(function(error) {
        console.error('Logout failed:', error);
      });
    };
  } else {
    console.error('Firebase SDK not loaded. Please include firebase-app-compat.js and firebase-auth-compat.js before auth-check.js');
  }
})();
