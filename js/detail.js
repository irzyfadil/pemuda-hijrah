// Halaman detail kenangan: lihat, edit, hapus, dan komentar
(async function () {
  'use strict';

  var ctx = await PH.requireAuth();
  if (!ctx) return;
  PH.renderHeader(ctx, 'feed');

  var statusBox = document.getElementById('status');
  var detail = document.getElementById('detail');
  var view = document.getElementById('view');
  var editForm = document.getElementById('edit-form');
  var dialog = document.getElementById('confirm-dialog');
  var commentList = document.getElementById('comment-list');
  var commentForm = document.getElementById('comment-form');
  var commentInput = document.getElementById('comment-input');

  var id = new URLSearchParams(location.search).get('id');
  var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !UUID.test(id)) {
    PH.showStatus(statusBox, 'error', 'Kenangan tidak ditemukan.');
    return;
  }

  var photo = null;

  function render() {
    document.title = PH.displayTitle(photo) + ' — Pemuda Hijrah';
    document.getElementById('title').textContent = PH.displayTitle(photo);

    var when = photo.taken_on ? PH.formatDateOnly(photo.taken_on) : PH.formatDate(photo.created_at);
    var by = 'Oleh ' + PH.uploaderName(photo) + ' · ' + when;
    if (photo.taken_on) by += ' (diunggah ' + PH.formatDate(photo.created_at) + ')';
    document.getElementById('byline').textContent = by;

    var cap = document.getElementById('caption');
    cap.textContent = photo.caption || '';
    cap.hidden = !photo.caption;

    var isOwner = photo.user_id === ctx.user.id;
    var isAdmin = ctx.profile.role === 'admin';
    document.getElementById('btn-edit').hidden = !isOwner;
    document.getElementById('btn-delete').hidden = !(isOwner || isAdmin);
    document.getElementById('actions').hidden = !(isOwner || isAdmin);
  }

  function renderComments(comments) {
    if (!commentList) return;
    commentList.textContent = '';
    if (!comments || !comments.length) {
      commentList.appendChild(PH.el('div', { class: 'status', text: 'Belum ada komentar.' }));
      return;
    }
    comments.forEach(function (item) {
      var writer = item.profiles || item.profile || {};
      var displayName = writer.display_name || 'Anggota';
      var initial = displayName.slice(0, 1).toUpperCase();
      commentList.appendChild(PH.el('div', { class: 'comment-item' }, [
        PH.el('div', { class: 'comment-avatar', text: initial }),
        PH.el('div', { class: 'comment-body' }, [
          PH.el('strong', { text: displayName }),
          PH.el('time', { text: PH.formatRelativeTime(item.created_at) }),
          PH.el('div', { text: item.message || '' })
        ])
      ]));
    });
  }

  async function loadComments() {
    if (!commentList) return;
    try {
      var r = await PH.sb.from('photo_comments').select('id,message,created_at,profiles(display_name)').eq('photo_id', id).order('created_at', { ascending: true });
      if (r.error) {
        if (r.error.code === '42P01') {
          renderComments([]);
          return;
        }
        throw r.error;
      }
      renderComments(r.data || []);
    } catch (e) {
      console.warn('Komentar tidak tersedia:', e);
      renderComments([]);
    }
  }

  async function load() {
    PH.showStatus(statusBox, 'loading', 'Memuat kenangan…');
    try {
      var r = await PH.sb
        .from('photos')
        .select('id,user_id,title,caption,taken_on,image_path,thumb_path,created_at,profiles(display_name)')
        .eq('id', id)
        .maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) { PH.showStatus(statusBox, 'error', 'Kenangan tidak ditemukan atau sudah dihapus.'); return; }
      photo = r.data;

      var urls = await PH.signedUrls([photo.image_path], 3600);
      var img = document.getElementById('photo');
      img.src = urls[photo.image_path] || '';
      img.alt = PH.displayTitle(photo);

      render();
      await loadComments();
      PH.clearStatus(statusBox);
      detail.hidden = false;
    } catch (e) {
      console.error(e);
      PH.showStatus(statusBox, 'error', 'Gagal memuat kenangan. Periksa koneksi internetmu.', 'Coba lagi', load);
    }
  }

  document.getElementById('btn-edit').addEventListener('click', function () {
    document.getElementById('e-title').value = photo.title || '';
    document.getElementById('e-caption').value = photo.caption || '';
    var taken = document.getElementById('e-taken');
    taken.max = PH.todayISO();
    taken.value = photo.taken_on || '';
    document.getElementById('edit-msg').textContent = '';
    view.hidden = true;
    editForm.hidden = false;
    document.getElementById('e-title').focus();
  });

  document.getElementById('cancel').addEventListener('click', function () {
    editForm.hidden = true;
    view.hidden = false;
  });

  editForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var msg = document.getElementById('edit-msg');
    var save = document.getElementById('save');
    var title = document.getElementById('e-title').value.trim();
    var caption = document.getElementById('e-caption').value.trim();
    var taken = document.getElementById('e-taken').value || null;
    msg.textContent = '';
    if (taken && taken > PH.todayISO()) { msg.textContent = 'Tanggal kejadian tidak boleh di masa depan.'; return; }

    save.disabled = true;
    save.textContent = 'Menyimpan…';
    try {
      var r = await PH.sb.from('photos').update({ title: title, caption: caption, taken_on: taken }).eq('id', id).select('id,title,caption,taken_on');
      if (r.error) throw r.error;
      if (!r.data || r.data.length !== 1) throw new Error('Tidak punya izin mengubah kenangan ini.');

      photo.title = r.data[0].title;
      photo.caption = r.data[0].caption;
      photo.taken_on = r.data[0].taken_on;
      render();
      editForm.hidden = true;
      view.hidden = false;
      PH.toast('Perubahan disimpan.', 'success');
    } catch (err) {
      console.error(err);
      msg.textContent = 'Gagal menyimpan perubahan. Coba lagi.';
    } finally {
      save.disabled = false;
      save.textContent = 'Simpan';
    }
  });

  document.getElementById('btn-delete').addEventListener('click', function () {
    if (dialog.showModal) dialog.showModal();
    else if (window.confirm('Hapus kenangan ini secara permanen?')) doDelete();
  });
  document.getElementById('confirm-cancel').addEventListener('click', function () { dialog.close(); });
  document.getElementById('confirm-ok').addEventListener('click', function () { dialog.close(); doDelete(); });

  async function doDelete() {
    var btn = document.getElementById('btn-delete');
    btn.disabled = true;
    btn.textContent = 'Menghapus…';
    try {
      var r = await PH.sb.from('photos').delete().eq('id', id).select('id');
      if (r.error) throw r.error;
      if (!r.data || r.data.length !== 1) throw new Error('Tidak punya izin menghapus kenangan ini.');

      var rm = await PH.sb.storage.from('photos').remove([photo.image_path, photo.thumb_path]);
      if (rm.error) console.warn('File foto gagal dihapus dari penyimpanan:', rm.error);

      PH.toast('Kenangan dihapus.', 'success');
      location.replace('feed.html');
    } catch (err) {
      console.error(err);
      PH.toast('Gagal menghapus. Coba lagi.', 'error');
      btn.disabled = false;
      btn.textContent = 'Hapus';
    }
  }

  if (commentForm) {
    commentForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var value = commentInput.value.trim();
      if (!value) return;
      commentInput.disabled = true;
      commentInput.value = '';
      try {
        var r = await PH.sb.from('photo_comments').insert({ photo_id: id, user_id: ctx.user.id, message: value }).select('id,message,created_at,profiles(display_name)');
        if (r.error) {
          if (r.error.code === '42P01') {
            var cached = JSON.parse(localStorage.getItem('ph_comments') || '{}');
            cached[id] = cached[id] || [];
            cached[id].push({ message: value, created_at: new Date().toISOString(), profiles: { display_name: ctx.profile.display_name } });
            localStorage.setItem('ph_comments', JSON.stringify(cached));
            renderComments(cached[id]);
            return;
          }
          throw r.error;
        }
        await loadComments();
      } catch (err) {
        console.error(err);
        PH.toast('Komentar gagal dikirim.', 'error');
      } finally {
        commentInput.disabled = false;
      }
    });
  }

  load();
})();
