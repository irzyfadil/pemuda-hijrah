// Halaman beranda: galeri foto (terbaru di urutan pertama)
(async function () {
  'use strict';

  var ctx = await PH.requireAuth();
  if (!ctx) return;
  PH.renderHeader(ctx, "home");
  document.getElementById('fab').hidden = false;

  var PAGE_SIZE = 24;
  var offset = 0;
  var loading = false;
  var total = 0;

  var grid = document.getElementById('grid');
  var statusBox = document.getElementById('status');
  var moreBtn = document.getElementById('more');

  function makeCard(photo, urlMap) {
    var thumb = urlMap[photo.thumb_path];
    var when = photo.taken_on ? PH.formatDateOnly(photo.taken_on) : PH.formatDate(photo.created_at);
    return PH.el('a', { class: 'card', href: 'foto.html?id=' + encodeURIComponent(photo.id) }, [
      thumb
        ? PH.el('img', { src: thumb, alt: PH.displayTitle(photo), loading: 'lazy', decoding: 'async' })
        : PH.el('div', { class: 'ph-missing', text: 'Foto tidak tersedia' }),
      PH.el('div', { class: 'card-info' }, [
        PH.el('strong', { text: PH.displayTitle(photo) }),
        PH.el('span', { text: PH.uploaderName(photo) + ' · ' + when })
      ])
    ]);
  }

  async function loadMore() {
    if (loading) return;
    loading = true;
    moreBtn.hidden = true;
    if (offset === 0) PH.showStatus(statusBox, 'loading', 'Memuat kenangan…');

    try {
      var r = await PH.sb
        .from('photos')
        .select('id,title,caption,taken_on,thumb_path,created_at,profiles(display_name)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (r.error) throw r.error;

      var rows = r.data || [];
      total = r.count || 0;

      if (offset === 0 && rows.length === 0) {
        PH.clearStatus(statusBox);
        statusBox.appendChild(PH.el('div', { class: 'status' }, [
          PH.el('h2', { text: 'Belum ada kenangan' }),
          PH.el('p', { text: 'Jadilah yang pertama membagikan momen bersama teman-teman.' }),
          PH.el('a', { class: 'btn', href: 'upload.html', text: 'Unggah foto pertama' })
        ]));
        return;
      }

      var urlMap = await PH.signedUrls(rows.map(function (p) { return p.thumb_path; }), 3600);
      rows.forEach(function (p) { grid.appendChild(makeCard(p, urlMap)); });
      offset += rows.length;
      PH.clearStatus(statusBox);
      moreBtn.hidden = offset >= total;
    } catch (e) {
      console.error(e);
      PH.showStatus(statusBox, 'error', 'Gagal memuat galeri. Periksa koneksi internetmu.', 'Coba lagi', function () {
        loading = false;
        loadMore();
      });
    } finally {
      loading = false;
    }
  }

  moreBtn.addEventListener('click', loadMore);
  loadMore();
})();
