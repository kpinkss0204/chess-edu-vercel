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
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
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
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // 이메일 인증 여부 확인 (Google 로그인은 이미 인증된 것으로 간주)
    const isPasswordProvider = user.providerData.some(p => p.providerId === 'password');
    
    if (isPasswordProvider && !user.emailVerified) {
      showVerifyForm();
    } else {
      const path = window.location.pathname;
      if (path.includes('/auth') || path.endsWith('auth.html')) {
        window.location.href = '/';
      }
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
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created successfully:', cred.user.uid);
    
    await updateProfile(cred.user, { displayName: name });
    console.log('Profile updated');

    await upsertUserDoc(cred.user, { displayName: name });
    
    // 이메일 인증 발송 전 최신 상태 확인
    try {
      console.log('Attempting to send verification email...');
      await sendEmailVerification(cred.user);
      console.log('Verification email sent to:', email);
      window.showSuccess('signup', '회원가입 완료! 인증 이메일을 보냈습니다. (스팸함도 확인해주세요)');
    } catch (verifyErr) {
      console.error('Verification email failed during signup:', verifyErr);
      window.showError('signup', `인증 메일 발송 실패: ${verifyErr.message}`);
    }
    
  } catch (e) {
    console.error('Signup error:', e);
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
    const cred = await signInWithEmailAndPassword(auth, email, password);
    console.log('Logged in user:', cred.user.email, 'Verified:', cred.user.emailVerified);
  } catch (e) {
    console.error('Login error:', e);
    window.showError('login', firebaseErrorMsg(e.code));
  } finally {
    window.setLoading('login', false);
  }
};

/** Google 로그인 처리 */
window.handleGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log('Google login success:', result.user.email);
    await upsertUserDoc(result.user);
  } catch (e) {
    console.error('Google login error:', e);
    // 구글 로그인은 보통 로그인/회원가입 카드 모두에 있으므로 유연하게 처리
    const errorEl = document.getElementById('signup-error');
    const isSignupVisible = errorEl && !errorEl.closest('.auth-card').classList.contains('hidden');
    window.showError(isSignupVisible ? 'signup' : 'login', firebaseErrorMsg(e.code));
  }
};

/** 로그아웃 처리 */
window.handleLogout = () => signOut(auth);

/** 인증 메일 재발송 */
window.handleResendVerification = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.warn('No user logged in to resend verification');
    return;
  }

  window.setLoading('resend', true);
  try {
    // 토큰 갱신 후 발송 시도
    console.log('Reloading user before resending verification...');
    await user.reload();
    await sendEmailVerification(auth.currentUser);
    console.log('Verification email resent successfully.');
    window.showSuccess('verify', '인증 이메일을 다시 보냈습니다.');
  } catch (e) {
    console.error('Resend verification error:', e);
    window.showError('verify', firebaseErrorMsg(e.code));
  } finally {
    window.setLoading('resend', false);
  }
};

/** 인증 상태 새로고침 확인 */
window.handleRefreshAuth = async () => {
  const user = auth.currentUser;
  if (!user) return;

  window.setLoading('verify-refresh', true);
  try {
    await user.reload();
    if (auth.currentUser.emailVerified) {
      window.location.href = '/';
    } else {
      window.showError('verify', '아직 인증이 완료되지 않았습니다. 이메일을 확인해주세요.');
    }
  } catch (e) {
    window.showError('verify', firebaseErrorMsg(e.code));
  } finally {
    window.setLoading('verify-refresh', false);
  }
};

function showAuthForms() {
  const container = document.getElementById('auth-container');
  const panel = document.getElementById('user-panel');
  const tabBar = document.querySelector('.tab-bar');
  const verifyCard = document.getElementById('card-verify');
  
  if (container) container.classList.remove('hidden');
  if (panel) panel.classList.add('hidden');
  if (tabBar) tabBar.classList.remove('hidden');
  if (verifyCard) verifyCard.classList.add('hidden');
  
  // 기본적으로 로그인 폼 표시
  const loginCard = document.getElementById('card-login');
  const signupCard = document.getElementById('card-signup');
  if (loginCard) loginCard.classList.remove('hidden');
  if (signupCard) signupCard.classList.add('hidden');
}

function showVerifyForm() {
  const container = document.getElementById('auth-container');
  const panel = document.getElementById('user-panel');
  const tabBar = document.querySelector('.tab-bar');
  const loginCard = document.getElementById('card-login');
  const signupCard = document.getElementById('card-signup');
  const verifyCard = document.getElementById('card-verify');

  if (container) container.classList.remove('hidden');
  if (panel) panel.classList.add('hidden');
  if (tabBar) tabBar.classList.add('hidden');
  if (loginCard) loginCard.classList.add('hidden');
  if (signupCard) signupCard.classList.add('hidden');
  if (verifyCard) verifyCard.classList.remove('hidden');
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
