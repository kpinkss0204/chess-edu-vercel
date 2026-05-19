// ── 탭 전환 (3D Flip) ──
function switchTab(tab) {
  const loginCard  = document.getElementById('card-login');
  const signupCard = document.getElementById('card-signup');
  const showCard   = tab === 'login' ? loginCard : signupCard;
  const hideCard   = tab === 'login' ? signupCard : loginCard;

  // 현재 카드 flip-out
  hideCard.classList.remove('flip-in');
  hideCard.classList.add('flip-out');
  setTimeout(() => {
    hideCard.classList.add('hidden');
    hideCard.classList.remove('flip-out');
  }, 200);

  // 새 카드 flip-in
  showCard.classList.remove('hidden');
  showCard.classList.remove('flip-out');
  showCard.classList.add('flip-in');
  setTimeout(() => showCard.classList.remove('flip-in'), 350);

  document.getElementById('tab-login').classList.toggle('active',  tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}

// ── 비밀번호 표시/숨김 ──
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.style.color = isText ? '' : 'var(--accent-green)';
  // 비밀번호가 보일 때(text)만 블러 처리
  const bg = document.getElementById('floating-pieces');
  const logoIcon = document.querySelector('.logo-icon');
  const anyVisible = _pwIds.some(pid => document.getElementById(pid)?.type === 'text');
  if (anyVisible) {
    bg.classList.add('blurred');
    if (logoIcon) logoIcon.classList.add('peeking');
  } else {
    bg.classList.remove('blurred');
    if (logoIcon) logoIcon.classList.remove('peeking');
  }
  inp.focus();
}

// ── 비밀번호 입력 포커스 → 배경/로고 흐림 ──
const _pwIds = ['login-password', 'signup-password', 'signup-confirm'];



// ── 에러 시 카드 흔들림 ──
function shakeCard(form) {
  const card = document.getElementById(`card-${form}`);
  card.classList.remove('shake-error');
  void card.offsetWidth; // reflow
  card.classList.add('shake-error');
  card.addEventListener('animationend', () => card.classList.remove('shake-error'), { once: true });
}

// ── 버튼 클릭 시 폰 → 퀸 프로모션 효과 ──
function promotePiece(form) {
  const piece = document.querySelector(`#${form}-btn .btn-chess-piece`);
  if (!piece) return;
  piece.textContent = '♕';
  piece.style.transform = 'translateX(14px) scale(1.3)';
  setTimeout(() => {
    piece.style.transform = '';
    setTimeout(() => { piece.textContent = '♙'; }, 300);
  }, 400);
}

// ── showError 오버라이드: 흔들림 포함 ──
const _origShowError = window.showError;
window.showError = function(form, msg) {
  const el = document.getElementById(`${form}-error`);
  el.textContent = msg;
  el.classList.remove('hidden');
  shakeCard(form);
  setTimeout(() => el.classList.add('hidden'), 4000);
};

// ── 버튼 핸들러에 프로모션 효과 연결 ──
const loginBtn  = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
if (loginBtn)  loginBtn.addEventListener('mousedown',  () => promotePiece('login'));
if (signupBtn) signupBtn.addEventListener('mousedown', () => promotePiece('signup'));

// ── 떠다니는 체스 말 생성 ──
(function () {
  const pieces = ['♙','♘','♗','♖','♕','♔','♟','♞','♝','♜','♛','♚'];
  const container = document.getElementById('floating-pieces');
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.className = 'fp';
    el.textContent = pieces[Math.floor(Math.random() * pieces.length)];
    el.style.left     = `${Math.random() * 100}%`;
    el.style.fontSize = `${1.5 + Math.random() * 2.5}rem`;
    const dur = 12 + Math.random() * 16;
    const delay = -(Math.random() * dur);
    el.style.animation = `floatPiece ${dur}s ${delay}s linear infinite`;
    container.appendChild(el);
  }
})();