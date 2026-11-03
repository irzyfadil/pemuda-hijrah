// =====================================================================
// PEMUDA HIJRAH — Fungsi bersama untuk semua halaman
//
// CATATAN KEAMANAN: pemeriksaan login di file ini hanya untuk kenyamanan
// (mengarahkan ke halaman masuk). Perlindungan data yang sebenarnya ada
// di database (Row Level Security) dan di bucket penyimpanan privat.
// =====================================================================
(function () {
  'use strict';

  var cfg = window.PH_CONFIG || {};
  var configured = !!(
    cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    cfg.SUPABASE_URL.indexOf('ISI_') !== 0 &&
    cfg.SUPABASE_ANON_KEY.indexOf('ISI_') !== 0
  );

  var sb = null;
  if (configured && window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  // ---------- Pembuat elemen (aman dari XSS: selalu pakai textContent) ----------
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  // ---------- Notifikasi kecil ----------
  var toastTimer = null;
  function toast(message, type) {
    var box = document.getElementById('toast');
    if (!box) {
      box = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(box);
    }
    box.className = 'toast show ' + (type || 'info');
    box.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.className = 'toast'; }, 4500);
  }

  // ---------- Kotak status (memuat / error / kosong) ----------
  function showStatus(container, kind, message, actionLabel, actionFn) {
    container.textContent = '';
    var box = el('div', { class: 'status status-' + kind }, [
      kind === 'loading' ? el('span', { class: 'spinner', 'aria-hidden': 'true' }) : null,
      el('p', { text: message })
    ]);
    if (actionLabel && actionFn) {
      box.appendChild(el('button', { class: 'btn btn-ghost', type: 'button', text: actionLabel, onclick: actionFn }));
    }
    container.appendChild(box);
  }
  function clearStatus(container) { container.textContent = ''; }

  // ---------- Tanggal ----------
  var MONTHS_FMT = { day: 'numeric', month: 'long', year: 'numeric' };
  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('id-ID', MONTHS_FMT);
  }
  // Untuk kolom tanggal saja ("2025-08-17"), hindari pergeseran zona waktu.
  function formatDateOnly(s) {
    if (!s) return '';
    var p = String(s).split('-');
    if (p.length !== 3) return '';
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString('id-ID', MONTHS_FMT);
  }
  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // ---------- Pesan belum dikonfigurasi ----------
  function showSetupNotice() {
    var main = document.querySelector('main') || document.body;
    main.textContent = '';
    var why = !configured
      ? 'Website ini belum dihubungkan ke database Supabase. Isi file js/config.js (lihat docs/PANDUAN-SETUP.md, Langkah 4).'
      : 'Pustaka Supabase gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.';
    main.appendChild(el('div', { class: 'container narrow' }, [
      el('div', { class: 'status status-error' }, [
        el('h1', { text: 'Pemuda Hijrah belum siap' }),
        el('p', { text: why })
      ])
    ]));
  }

  // ---------- Sesi & profil ----------
  async function getSession() {
    var r = await sb.auth.getSession();
    return r.data && r.data.session ? r.data.session : null;
  }

  // Dipakai halaman yang butuh login. Mengembalikan {user, profile} atau null.
  async function requireAuth() {
    if (!sb) { showSetupNotice(); return null; }
    var session = await getSession();
    if (!session) { location.replace('masuk.html'); return null; }
    var p = await sb.from('profiles').select('id,display_name,role').eq('id', session.user.id).maybeSingle();
    if (p.error || !p.data) {
      await sb.auth.signOut();
      location.replace('masuk.html');
      return null;
    }
    return { user: session.user, profile: p.data };
  }

  function renderHeader(ctx, active) {
    var slot = document.getElementById('header-slot');
    if (!slot) return;
    slot.textContent = '';
    var logout = el('button', { class: 'btn btn-ghost btn-small', type: 'button', text: 'Keluar' });
    logout.addEventListener('click', async function () {
      await sb.auth.signOut();
      location.replace('masuk.html');
    });
    slot.appendChild(el('header', { class: 'topbar' }, [
      el('a', { class: 'brand', href: 'index.html', 'aria-label': 'Pemuda Hijrah, ke beranda' }, [
        el('span', { class: 'brand-mark', text: 'PH' }),
        el('span', { class: 'brand-name', text: 'Pemuda Hijrah' })
      ]),
      el('nav', { class: 'nav' }, [
        el('span', { class: 'nav-user', text: ctx.profile.display_name + (ctx.profile.role === 'admin' ? ' (admin)' : '') }),
        active === 'upload' ? null : el('a', { class: 'btn btn-small', href: 'upload.html', text: '+ Unggah' }),
        logout
      ])
    ]));
  }

  // ---------- Foto: URL bertanda tangan (foto privat) ----------
  async function signedUrls(paths, seconds) {
    var map = {};
    if (!paths.length) return map;
    var r = await sb.storage.from('photos').createSignedUrls(paths, seconds || 3600);
    if (r.error) throw r.error;
    (r.data || []).forEach(function (item) {
      if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
    });
    return map;
  }

  // ---------- Foto: perkecil di perangkat sebelum diunggah ----------
  // Bonus privasi: menggambar ulang foto lewat canvas menghapus data EXIF
  // (termasuk koordinat GPS lokasi pengambilan foto).
  async function loadImage(file) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(file); } catch (e) { /* lanjut ke cara cadangan */ }
    }
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Foto tidak bisa dibaca. Coba pakai format JPG atau PNG.'));
      };
      img.src = url;
    });
  }

  function toJpegBlob(src, maxSide, quality) {
    var w = src.naturalWidth || src.width;
    var h = src.naturalHeight || src.height;
    var scale = Math.min(1, maxSide / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(src, 0, 0, cw, ch);
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (b) {
        if (b) resolve(b); else reject(new Error('Gagal memproses foto.'));
      }, 'image/jpeg', quality);
    });
  }

  async function prepareImages(file) {
    var img = await loadImage(file);
    var full = await toJpegBlob(img, 1600, 0.85);
    var thumb = await toJpegBlob(img, 480, 0.8);
    if (img.close) img.close();
    return { full: full, thumb: thumb };
  }

  function randomId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    return Array.prototype.map.call(b, function (x) { return x.toString(16).padStart(2, '0'); }).join('');
  }

  function displayTitle(photo) {
    if (photo.title) return photo.title;
    if (photo.caption) return photo.caption.length > 60 ? photo.caption.slice(0, 60) + '…' : photo.caption;
    return 'Tanpa judul';
  }
  function uploaderName(photo) {
    var p = photo.profiles;
    if (Array.isArray(p)) p = p[0];
    return p && p.display_name ? p.display_name : 'Anggota';
  }

  window.PH = {
    configured: configured,
    sb: sb,
    el: el,
    toast: toast,
    showStatus: showStatus,
    clearStatus: clearStatus,
    formatDate: formatDate,
    formatDateOnly: formatDateOnly,
    todayISO: todayISO,
    showSetupNotice: showSetupNotice,
    getSession: getSession,
    requireAuth: requireAuth,
    renderHeader: renderHeader,
    signedUrls: signedUrls,
    prepareImages: prepareImages,
    randomId: randomId,
    displayTitle: displayTitle,
    uploaderName: uploaderName
  };
})();
