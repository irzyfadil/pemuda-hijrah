// Welcome page: tampilkan foto bersama (jika sudah ada) dan atur tombol masuk.
(async function () {
  'use strict';

  // Foto bersama: taruh file di assets/tekajeh-solidd.jpg
  // Jika file belum ada, bingkai biru tetap tampil.
  var img = document.getElementById('team-img');
  var probe = new Image();
  probe.onload = function () { img.src = probe.src; img.hidden = false; };
  probe.src = 'assets/tekajeh-solidd.jpg';

  // Sudah login? Tombol langsung ke Footage.
  var cta = document.getElementById('cta');
  try {
    if (PH.sb && await PH.getSession()) {
      cta.href = 'footage.html';
      cta.textContent = 'Buka Footage';
    }
  } catch (e) { /* tetap pakai tombol Login */ }
})();
