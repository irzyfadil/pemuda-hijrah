// Halaman percakapan antaranggota
(async function () {
  'use strict';

  var ctx = await PH.requireAuth();
  if (!ctx) return;
  PH.renderHeader(ctx, 'meeting');

  var memberSearch = document.getElementById('member-search');
  var memberList = document.getElementById('member-list');
  var threadHeader = document.getElementById('thread-header');
  var messageList = document.getElementById('message-list');
  var messageForm = document.getElementById('message-form');
  var messageInput = document.getElementById('message-input');

  var members = [];
  var activeId = null;

  function initials(name) {
    return (name || 'A').slice(0, 1).toUpperCase();
  }

  function getLocalMessages(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (err) {
      return [];
    }
  }

  function saveLocalMessages(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function renderMembers(filter) {
    var q = (filter || '').trim().toLowerCase();
    var list = members.filter(function (member) {
      return !q || (member.display_name || '').toLowerCase().indexOf(q) >= 0 || (member.email || '').toLowerCase().indexOf(q) >= 0;
    });
    memberList.textContent = '';
    if (!list.length) {
      memberList.appendChild(PH.el('div', { class: 'status' }, [
        PH.el('p', { text: 'Tidak ada anggota yang cocok.' })
      ]));
      return;
    }

    list.forEach(function (member) {
      var isActive = activeId === member.id;
      var item = PH.el('button', { type: 'button', class: isActive ? 'member-item active' : 'member-item', onclick: function () { activeId = member.id; renderThread(); renderMembers(memberSearch.value); } }, [
        PH.el('span', { class: 'member-avatar', text: initials(member.display_name) }),
        PH.el('span', { class: 'member-meta' }, [
          PH.el('strong', { text: member.display_name || 'Anggota' }),
          PH.el('small', { text: member.role === 'admin' ? 'Admin' : 'Anggota' })
        ])
      ]);
      memberList.appendChild(item);
    });
  }

  function renderThread() {
    var chosen = members.find(function (member) { return member.id === activeId; }) || members[0];
    if (!chosen) {
      threadHeader.textContent = 'Tidak ada anggota aktif.';
      messageList.textContent = '';
      return;
    }

    activeId = chosen.id;
    threadHeader.textContent = '';
    threadHeader.appendChild(PH.el('div', { class: 'member-meta' }, [
      PH.el('strong', { text: chosen.display_name || 'Anggota' }),
      PH.el('small', { text: chosen.role === 'admin' ? 'Admin' : 'Anggota' })
    ]));

    var key = 'ph-thread-' + [ctx.user.id, chosen.id].sort().join('_');
    var list = getLocalMessages(key);
    messageList.textContent = '';
    if (!list.length) {
      messageList.appendChild(PH.el('div', { class: 'status' }, [
        PH.el('p', { text: 'Belum ada pesan. Mulai percakapan sekarang.' })
      ]));
      return;
    }

    list.forEach(function (msg) {
      var isMe = msg.sender_id === ctx.user.id;
      var row = PH.el('div', { class: isMe ? 'message-row me' : 'message-row' }, [
        PH.el('div', { class: 'message-bubble' }, [
          PH.el('div', { text: msg.text || '' }),
          PH.el('time', { text: PH.formatRelativeTime(msg.created_at) })
        ])
      ]);
      messageList.appendChild(row);
    });
  }

  async function loadMembers() {
    try {
      var r = await PH.sb.from('profiles').select('id,display_name,email,role').order('created_at', { ascending: true });
      if (r.error) throw r.error;
      members = r.data || [];
      if (!members.find(function (member) { return member.id === ctx.user.id; })) {
        members.unshift({ id: ctx.user.id, display_name: ctx.profile.display_name || 'Saya', email: ctx.user.email, role: ctx.profile.role || 'member' });
      }
      if (!activeId) activeId = members.find(function (member) { return member.id !== ctx.user.id; }) ? members.find(function (member) { return member.id !== ctx.user.id; }).id : ctx.user.id;
      renderMembers();
      renderThread();
    } catch (e) {
      console.error(e);
      members = [{ id: ctx.user.id, display_name: ctx.profile.display_name || 'Saya', email: ctx.user.email, role: ctx.profile.role || 'member' }];
      activeId = ctx.user.id;
      renderMembers();
      renderThread();
    }
  }

  messageForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var chosen = members.find(function (member) { return member.id === activeId; });
    if (!chosen) return;
    var text = messageInput.value.trim();
    if (!text) return;

    var key = 'ph-thread-' + [ctx.user.id, chosen.id].sort().join('_');
    var list = getLocalMessages(key);
    list.push({ sender_id: ctx.user.id, text: text, created_at: new Date().toISOString() });
    saveLocalMessages(key, list);
    messageInput.value = '';
    renderThread();
  });

  memberSearch.addEventListener('input', function () { renderMembers(memberSearch.value); });
  loadMembers();
})();
