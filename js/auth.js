// Halaman masuk / daftar
(async function () {
  'use strict';

  if (!PH.sb) { PH.showSetupNotice(); return; }

  // Sudah login? langsung ke beranda.
  if (await PH.getSession()) { location.replace('footage.html'); return; }

  var tabLogin = document.getElementById('tab-login');
  var tabSignup = document.getElementById('tab-signup');
  var formLogin = document.getElementById('form-login');
  var formSignup = document.getElementById('form-signup');

  function selectTab(which) {
    var isLogin = which === 'login';
    tabLogin.setAttribute('aria-selected', String(isLogin));
    tabSignup.setAttribute('aria-selected', String(!isLogin));
    formLogin.hidden = !isLogin;
    formSignup.hidden = isLogin;
  }
  tabLogin.addEventListener('click', function () { selectTab('login'); });
  tabSignup.addEventListener('click', function () { selectTab('signup'); });

  function friendlyError(error) {
    var msg = (error && error.message) || '';
    if (/invalid login credentials/i.test(msg)) return 'Email atau kata sandi salah.';
    if (/email not confirmed/i.test(msg)) return 'Email belum dikonfirmasi. Cek kotak masuk emailmu.';
    if (/database error saving new user/i.test(msg)) return 'Pendaftaran ditolak. Pastikan kode undangan dan nama panggilan sudah benar.';
    if (/already registered|already been registered/i.test(msg)) return 'Email ini sudah terdaftar. Silakan masuk.';
    if (/password/i.test(msg) && /(short|least|characters)/i.test(msg)) return 'Kata sandi minimal 8 karakter.';
    if (/rate limit|too many/i.test(msg)) return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
    if (/fetch|network/i.test(msg)) return 'Tidak bisa terhubung. Periksa koneksi internetmu.';
    return 'Terjadi kesalahan. Coba lagi sebentar.';
  }

  // ----- Masuk -----
  formLogin.addEventListener('submit', async function (e) {
    e.preventDefault();
    var msg = document.getElementById('login-msg');
    var btn = document.getElementById('login-btn');
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    msg.textContent = '';
    if (!email || !password) { msg.textContent = 'Isi email dan kata sandi.'; return; }

    btn.disabled = true;
    btn.textContent = 'Masuk…';
    var r = await PH.sb.auth.signInWithPassword({ email: email, password: password });
    if (r.error) {
      msg.textContent = friendlyError(r.error);
      btn.disabled = false;
      btn.textContent = 'Masuk';
      return;
    }
    location.replace('footage.html');
  });

  // ----- Daftar -----
  formSignup.addEventListener('submit', async function (e) {
    e.preventDefault();
    var msg = document.getElementById('signup-msg');
    var btn = document.getElementById('signup-btn');
    var name = document.getElementById('su-name').value.trim();
    var email = document.getElementById('su-email').value.trim();
    var password = document.getElementById('su-password').value;
    var code = document.getElementById('su-code').value.trim();
    msg.className = 'form-error';
    msg.textContent = '';

    if (name.length < 2 || name.length > 30) { msg.textContent = 'Nama panggilan harus 2–30 karakter.'; return; }
    if (!email) { msg.textContent = 'Isi email.'; return; }
    if (password.length < 8) { msg.textContent = 'Kata sandi minimal 8 karakter.'; return; }
    if (!code) { msg.textContent = 'Isi kode undangan.'; return; }

    btn.disabled = true;
    btn.textContent = 'Membuat akun…';
    var r = await PH.sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { display_name: name, invite_code: code } }
    });
    btn.disabled = false;
    btn.textContent = 'Buat akun';

    if (r.error) { msg.textContent = friendlyError(r.error); return; }

    if (r.data && r.data.session) {
      location.replace('footage.html');
    } else {
      msg.className = 'form-ok';
      msg.textContent = 'Akun dibuat. Cek email untuk konfirmasi, lalu kembali dan masuk.';
    }
  });
})();
