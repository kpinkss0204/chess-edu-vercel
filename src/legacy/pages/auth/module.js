import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
  import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut,
    updateProfile
  } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
  import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
  } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

  // ─────────────────────────────────────────────
  // 🔥 여기에 Firebase 프로젝트 설정을 입력하세요
  // ─────────────────────────────────────────────
  const firebaseConfig = {
    apiKey: "AIzaSyDiBFoUf2QVG9QXO34Xny0bSslFYaiwozg",
    authDomain: "chess-education-464fc.firebaseapp.com",
    projectId: "chess-education-464fc",
    storageBucket: "chess-education-464fc.firebasestorage.app",
    messagingSenderId: "963998720041",
    appId: "1:963998720041:web:aa4037707214d3777c7c38",
    measurementId: "G-HBS1RQ4WYQ"
  };
  // ─────────────────────────────────────────────

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const googleProvider = new GoogleAuthProvider();

  // Firestore에 사용자 문서 생성/업데이트
  async function upsertUserDoc(user, extra = {}) {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || extra.displayName || '',
        photoURL: user.photoURL || '',
        createdAt: serverTimestamp(),
        gamesPlayed: 0,
        rating: 1200,
        ...extra
      });
    }
  }

  // 로그인 상태 감지
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // 로그인 성공 → 체스 분석 보드로 자동 이동
      window.location.href = 'https://chess-education.vercel.app/chess-wasm-fixed.html';
    } else {
      showAuthForms();
    }
  });

  // ── 회원가입 ──
  window.handleSignup = async () => {
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;

    if (!name || !email || !password) return showError('signup', '모든 항목을 입력해주세요.');
    if (password !== confirm)         return showError('signup', '비밀번호가 일치하지 않습니다.');
    if (password.length < 6)          return showError('signup', '비밀번호는 6자 이상이어야 합니다.');

    setLoading('signup', true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await upsertUserDoc(cred.user, { displayName: name });
      showSuccess('signup', '회원가입 완료! 환영합니다 ♟');
    } catch (e) {
      showError('signup', firebaseErrorMsg(e.code));
    } finally {
      setLoading('signup', false);
    }
  };

  // ── 로그인 ──
  window.handleLogin = async () => {
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) return showError('login', '이메일과 비밀번호를 입력해주세요.');

    setLoading('login', true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      showError('login', firebaseErrorMsg(e.code));
    } finally {
      setLoading('login', false);
    }
  };

  // ── Google 로그인 ──
  window.handleGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await upsertUserDoc(result.user);
    } catch (e) {
      showError('login', firebaseErrorMsg(e.code));
    }
  };

  // ── 로그아웃 ──
  window.handleLogout = () => signOut(auth);

  // ── Firestore에서 추가 유저 정보 가져오기 ──
  async function showUserInfo(user) {
    document.getElementById('auth-container').classList.add('hidden');
    const panel = document.getElementById('user-panel');
    panel.classList.remove('hidden');

    document.getElementById('user-avatar-letter').textContent =
      (user.displayName || user.email || '?')[0].toUpperCase();
    document.getElementById('user-name').textContent  = user.displayName || '이름 없음';
    document.getElementById('user-email').textContent = user.email;

    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        document.getElementById('user-rating').textContent = d.rating ?? 1200;
        document.getElementById('user-games').textContent  = d.gamesPlayed ?? 0;
        document.getElementById('user-joined').textContent = d.createdAt
          ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('ko-KR')
          : '—';
      }
    } catch (_) {}
  }

  function showAuthForms() {
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('user-panel').classList.add('hidden');
  }

  // ── Firebase 에러 한국어 변환 ──
  function firebaseErrorMsg(code) {
    const map = {
      'auth/email-already-in-use':    '이미 사용 중인 이메일입니다.',
      'auth/invalid-email':           '유효하지 않은 이메일 형식입니다.',
      'auth/weak-password':           '비밀번호가 너무 약합니다.',
      'auth/user-not-found':          '존재하지 않는 계정입니다.',
      'auth/wrong-password':          '비밀번호가 틀렸습니다.',
      'auth/invalid-credential':      '이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/popup-closed-by-user':    'Google 로그인이 취소되었습니다.',
      'auth/network-request-failed':  '네트워크 오류가 발생했습니다.',
      'auth/too-many-requests':       '너무 많은 시도입니다. 잠시 후 다시 시도해주세요.',
    };
    return map[code] || `오류가 발생했습니다. (${code})`;
  }

  function showError(form, msg) {
    const el = document.getElementById(`${form}-error`);
    el.textContent = msg;
    el.classList.remove('hidden');
    // 카드 흔들기
    const card = document.getElementById(`card-${form}`);
    card.classList.remove('shake-error');
    void card.offsetWidth;
    card.classList.add('shake-error');
    card.addEventListener('animationend', () => card.classList.remove('shake-error'), { once: true });
    setTimeout(() => el.classList.add('hidden'), 4000);
  }
  function showSuccess(form, msg) {
    const el = document.getElementById(`${form}-success`);
    el.textContent = msg;
    el.classList.remove('hidden');
  }
  function setLoading(form, on) {
    const btn = document.getElementById(`${form}-btn`);
    btn.disabled = on;
    btn.querySelector('.btn-text').style.opacity = on ? '0' : '1';
    btn.querySelector('.btn-spinner').style.display = on ? 'block' : 'none';
  }