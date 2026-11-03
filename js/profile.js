(function () {
  'use strict';

  async function initProfile() {
    var ctx = await PH.requireAuth();
    if (!ctx) return;
    PH.renderHeader(ctx, 'profile');

    var status = document.getElementById('profile-status');
    var card = document.getElementById('profile-card');
    var avatar = document.getElementById('avatar');
    var name = document.getElementById('profile-name');
    var role = document.getElementById('profile-role');
    var email = document.getElementById('profile-email');
    var joined = document.getElementById('profile-joined');
    var bio = document.getElementById('bio');
    var displayName = document.getElementById('display-name');

    function setUserInfo(profile) {
      var initials = (profile.display_name || 'PH').slice(0, 1).toUpperCase();
      avatar.textContent = initials;
      name.textContent = profile.display_name || 'Pemuda Hijrah';
      role.textContent = profile.role === 'admin' ? 'Admin' : 'Anggota';
      email.textContent = ctx.user.email || '-';
      joined.textContent = profile.created_at ? PH.formatDate(profile.created_at) : '-';
      bio.value = profile.bio || '';
      displayName.value = profile.display_name || '';
      card.hidden = false;
    }

    try {
      var r = await PH.sb.from('profiles').select('id,display_name,role,email,bio,created_at').eq('id', ctx.user.id).maybeSingle();
      if (r.error) throw r.error;
      if (!r.data) throw new Error('Profil belum tersedia.');
      setUserInfo(r.data);
      PH.clearStatus(status);
    } catch (err) {
      console.error(err);
      PH.showStatus(status, 'error', 'Tidak dapat memuat profil.');
    }

    document.getElementById('save-profile').addEventListener('click', async function () {
      var newName = displayName.value.trim();
      var newBio = bio.value.trim();
      if (!newName) {
        PH.toast('Nama tampilan tidak boleh kosong.', 'error');
        return;
      }

      try {
        var r = await PH.sb.from('profiles').update({ display_name: newName, bio: newBio }).eq('id', ctx.user.id).select('id,display_name,role,bio,created_at');
        if (r.error) throw r.error;
        if (r.data && r.data.length) {
          setUserInfo(r.data[0]);
          PH.toast('Profil berhasil diperbarui.', 'success');
        }
      } catch (error) {
        console.error(error);
        PH.toast('Gagal menyimpan profil.', 'error');
      }
    });
  }

  initProfile();
})();
