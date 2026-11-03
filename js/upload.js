// Halaman unggah foto
(async function () {
  'use strict';

  var ctx = await PH.requireAuth();
  if (!ctx) return;
  PH.renderHeader(ctx, 'upload');

  var MAX_INPUT_BYTES = 25 * 1024 * 1024; // foto asli maks 25 MB (akan diperkecil sebelum diunggah)

  var form = document.getElementById('upload-form');
  var fileInput = document.getElementById('file');
  var preview = document.getElementById('preview');
  var previewImg = document.getElementById('preview-img');
  var msg = document.getElementById('form-msg');
  var submit = document.getElementById('submit');
  var takenInput = document.getElementById('taken');
  takenInput.max = PH.todayISO();

  var previewUrl = null;

  fileInput.addEventListener('change', function () {
    msg.textContent = '';
    if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = null; }
    var file = fileInput.files && fileInput.files[0];
    if (!file) { preview.hidden = true; return; }
    if (!/^image\//.test(file.type)) {
      msg.textContent = 'File harus berupa foto (JPG, PNG, atau WebP).';
      fileInput.value = '';
      preview.hidden = true;
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      msg.textContent = 'Foto terlalu besar (maksimal 25 MB).';
      fileInput.value = '';
      preview.hidden = true;
      return;
    }
    previewUrl = URL.createObjectURL(file);
    previewImg.src = previewUrl;
    preview.hidden = false;
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    msg.textContent = '';

    var file = fileInput.files && fileInput.files[0];
    if (!file) { msg.textContent = 'Pilih foto dulu.'; return; }
    if (!document.getElementById('consent').checked) {
      msg.textContent = 'Centang pernyataan persetujuan teman di foto dulu.';
      return;
    }

    var title = document.getElementById('title').value.trim();
    var caption = document.getElementById('caption').value.trim();
    var taken = takenInput.value || null;
    if (taken && taken > PH.todayISO()) { msg.textContent = 'Tanggal kejadian tidak boleh di masa depan.'; return; }

    submit.disabled = true;
    submit.textContent = 'Memproses foto…';

    var uploaded = [];
    var bucket = PH.sb.storage.from('photos');
    try {
      var imgs = await PH.prepareImages(file);
      var uid = ctx.user.id;
      var pid = PH.randomId();
      var imagePath = uid + '/' + pid + '.jpg';
      var thumbPath = uid + '/' + pid + '_thumb.jpg';

      submit.textContent = 'Mengunggah…';
      var up1 = await bucket.upload(imagePath, imgs.full, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
      if (up1.error) throw up1.error;
      uploaded.push(imagePath);

      var up2 = await bucket.upload(thumbPath, imgs.thumb, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
      if (up2.error) throw up2.error;
      uploaded.push(thumbPath);

      var ins = await PH.sb.from('photos').insert({
        user_id: uid,
        title: title,
        caption: caption,
        taken_on: taken,
        image_path: imagePath,
        thumb_path: thumbPath
      }).select('id').single();
      if (ins.error) throw ins.error;

      PH.toast('Kenangan berhasil diunggah!', 'success');
      location.replace('foto.html?id=' + encodeURIComponent(ins.data.id));
    } catch (err) {
      console.error(err);
      // Bersihkan file yang sempat terunggah agar tidak jadi sampah.
      if (uploaded.length) { try { await bucket.remove(uploaded); } catch (e2) { /* abaikan */ } }
      msg.textContent = (err && err.message && /dibaca|memproses/i.test(err.message))
        ? err.message
        : 'Gagal mengunggah. Periksa koneksi internetmu lalu coba lagi.';
      submit.disabled = false;
      submit.textContent = 'Unggah';
    }
  });
})();
