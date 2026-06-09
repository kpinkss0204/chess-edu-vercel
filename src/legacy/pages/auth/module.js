import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile,
  sendEmailVerification,
  fetchSignInMethodsForEmail
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ─────────────────────────────────────────────
// 🔥 Firebase 프로젝트 설정
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

// 앱 초기화 (중복 방지)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/** 닉네임 중복 확인 */
async function isNicknameTaken(nickname) {
  try {
    const q = query(collection(db, 'users'), where('displayName', '==', nickname));
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (e) {
    console.error('Nickname check error:', e);
    return false;
  }
}

/** Firestore에 사용자 정보 저장 */
async function upsertUserDoc(user, extra = {}) {
  try {
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
  } catch (e) {
    console.error('Firestore upsert error:', e);
  }
}

/** 로그인 상태 감지 및 리다이렉트 */
onAuthStateChanged(auth, (user) => {
  if (user) {
    const path = window.location.pathname;
    if (path.includes('/auth') || path.endsWith('auth.html')) {
      window.location.href = '/';
    }
  } else {
    showAuthForms();
  }
});

/** 회원가입 처리 */
window.handleSignup = async () => {
  const name     = document.getElementById('signup-name')?.value.trim();
  const email    = document.getElementById('signup-email')?.value.trim();
  const password = document.getElementById('signup-password')?.value;
  const confirm  = document.getElementById('signup-confirm')?.value;

  if (!name || !email || !password) return window.showError('signup', '모든 항목을 입력해주세요.');
  if (password !== confirm)         return window.showError('signup', '비밀번호가 일치하지 않습니다.');
  if (password.length < 6)          return window.showError('signup', '비밀번호는 6자 이상이어야 합니다.');

  window.setLoading('signup', true);
  try {
    // 1. 닉네임 중복 체크
    const nicknameExists = await isNicknameTaken(name);
    if (nicknameExists) {
      window.setLoading('signup', false);
      return window.showError('signup', '이미 사용 중인 닉네임입니다.');
    }

    // 2. 이메일 중복 체크 (선택적: createUser...가 에러를 던지지만 사용자 경험을 위해 추가 가능)
    // Firebase v9+ 에서는 fetchSignInMethodsForEmail 이 보안 정책(email enumeration protection)에 의해 제한될 수 있음
    // 여기서는 기본 에러 핸들링에 맡기거나 필요시 시도

    // 3. 계정 생성
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    
    // 4. 프로필 업데이트 및 Firestore 저장
    await updateProfile(cred.user, { displayName: name });
    await upsertUserDoc(cred.user, { displayName: name });

    // 5. 이메일 인증 메일 발송
    await sendEmailVerification(cred.user);
    
    window.showSuccess('signup', '회원가입 완료! 인증 메일을 발송했습니다. 이메일을 확인해 주세요.');
    
    // 인증 메일을 보낸 후 사용자를 로그아웃 시키거나 메시지 표시 후 대기
    // 보통은 가입 직후 로그인이 된 상태이므로, 인증 확인 유도
  } catch (e) {
    window.showError('signup', firebaseErrorMsg(e.code));
  } finally {
    window.setLoading('signup', false);
  }
};

/** 이메일 로그인 처리 */
window.handleLogin = async () => {
  const email    = document.getElementById('login-email')?.value.trim();
  const password = document.getElementById('login-password')?.value;

  if (!email || !password) return window.showError('login', '이메일과 비밀번호를 입력해주세요.');

  window.setLoading('login', true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    window.showError('login', firebaseErrorMsg(e.code));
  } finally {
    window.setLoading('login', false);
  }
};

/** Google 로그인 처리 */
window.handleGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await upsertUserDoc(result.user);
  } catch (e) {
    // 구글 로그인은 보통 로그인/회원가입 카드 모두에 있으므로 유연하게 처리
    const errorEl = document.getElementById('signup-error');
    const isSignupVisible = errorEl && !errorEl.closest('.auth-card').classList.contains('hidden');
    window.showError(isSignupVisible ? 'signup' : 'login', firebaseErrorMsg(e.code));
  }
};

/** 로그아웃 처리 */
window.handleLogout = () => signOut(auth);

function showAuthForms() {
  const container = document.getElementById('auth-container');
  const panel = document.getElementById('user-panel');
  if (container) container.classList.remove('hidden');
  if (panel) panel.classList.add('hidden');
}

/** Firebase 에러 메시지 한국어 변환 */
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

/** 에러 표시 (기존 inline.js의 효과와 연동 가능하도록 window에 등록) */
window.showError = function(form, msg) {
  const el = document.getElementById(`${form}-error`);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  
  const card = document.getElementById(`card-${form}`);
  if (card) {
    card.classList.remove('shake-error');
    void card.offsetWidth;
    card.classList.add('shake-error');
  }
  setTimeout(() => el.classList.add('hidden'), 4000);
};

/** 성공 메시지 표시 */
window.showSuccess = function(form, msg) {
  const el = document.getElementById(`${form}-success`);
  if (el) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }
};

/** 로딩 상태 제어 */
window.setLoading = function(form, on) {
  const btn = document.getElementById(`${form}-btn`);
  if (!btn) return;
  btn.disabled = on;
  const text = btn.querySelector('.btn-text');
  const spinner = btn.querySelector('.btn-spinner');
  if (text) text.style.opacity = on ? '0' : '1';
  if (spinner) spinner.style.display = on ? 'block' : 'none';
};
