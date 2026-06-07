// ===== APP STATE =====
let currentUser = null;
let currentView = '';
let prevView = '';
let currentProductId = null;
let mapInstance = null;
let chatOpenContact = null;
let calendarDate = new Date(2025, 8, 1); // Sep 2025

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const session = DB.getSession();
  if (session) {
    currentUser = session;
    startApp();
  }
});

// ===== AUTH =====
function showLogin() {
  showPage('page-login');
}
function showRegister() {
  showPage('page-register');
}
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const user = DB.findUser(email, pass);
  if (!user) {
    document.getElementById('login-error').classList.remove('hidden');
    return;
  }
  document.getElementById('login-error').classList.add('hidden');
  currentUser = user;
  DB.setSession(user);
  startApp();
}

function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const pass = document.getElementById('reg-password').value;
  const role = document.getElementById('reg-role').value;
  const errEl = document.getElementById('reg-error');
  if (!name || !email || !pass || !role) {
    errEl.classList.remove('hidden');
    return;
  }
  errEl.classList.add('hidden');
  const user = { email, password: pass, name, role, phone: '', address: '', birth: '' };
  DB.saveUser(user);
  DB.addNotif(email, `Selamat datang di DesKraf, ${name}!`);
  currentUser = user;
  DB.setSession(user);
  startApp();
}

function logout() {
  DB.clearSession();
  currentUser = null;
  showPage('page-login');
}

// ===== APP START =====
function startApp() {
  showPage('page-app');
  buildSidebar();
  loadProfileData();
  loadChatContacts();

  if (currentUser.role === 'pembeli') navigate('home-pembeli');
  else navigate('home-bengkel');
}

// ===== SIDEBAR =====
function buildSidebar() {
  const nav = document.getElementById('nav-items');
  nav.innerHTML = '';

  const pembeli = [
    { id: 'notif', icon: bellIcon() },
    { id: 'home-pembeli', icon: homeIcon() },
    { id: 'liked', icon: tagIcon() },
    { id: 'wishlist', icon: wishIcon() },
    { id: 'profile', icon: personIcon() },
  ];
  const bengkel = [
    { id: 'notif', icon: bellIcon() },
    { id: 'home-bengkel', icon: homeIcon() },
    { id: 'stock', icon: tagIcon() },
    { id: 'profile', icon: personIcon() },
  ];

  const items = currentUser.role === 'pembeli' ? pembeli : bengkel;
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.id = 'nav-' + item.id;
    btn.innerHTML = item.icon;
    btn.onclick = () => navigate(item.id);
    nav.appendChild(btn);
  });

  // Logout at bottom
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'nav-btn nav-logout';
  logoutBtn.innerHTML = logoutIcon();
  logoutBtn.onclick = logout;
  nav.appendChild(logoutBtn);
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('expanded');
}

// ===== NAVIGATION =====
function navigate(viewId) {
  if (viewId === currentView) return;
  prevView = currentView;
  currentView = viewId;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const view = document.getElementById('view-' + viewId);
  if (view) {
    view.classList.add('active');
    view.classList.add('slide-in');
    setTimeout(() => view.classList.remove('slide-in'), 400);
  }
  const navBtn = document.getElementById('nav-' + viewId);
  if (navBtn) navBtn.classList.add('active');

  // Load content
  if (viewId === 'home-pembeli') loadKatalogPembeli();
  else if (viewId === 'home-bengkel') loadHomeBengkel();
  else if (viewId === 'liked') loadLiked();
  else if (viewId === 'wishlist') loadWishlist();
  else if (viewId === 'notif') loadNotifs();
  else if (viewId === 'stock') loadStock();
  else if (viewId === 'profile') loadProfileView();

  // Search bar placeholder
  document.getElementById('search-input').value = '';
  document.getElementById('search-input').placeholder = viewId === 'home-pembeli' ? 'Cari produk...' : 'Butuh sesuatu hari ini?';

  // Chat sidebar only for pembeli
  if (currentUser.role === 'pembeli') {
    document.getElementById('chat-sidebar').classList.remove('hidden');
  } else {
    document.getElementById('chat-sidebar').classList.add('hidden');
  }
}

function goBack() {
  if (prevView) navigate(prevView);
}

// ===== KATALOG PEMBELI =====
function loadKatalogPembeli() {
  const products = DB.getProducts();
  const grid = document.getElementById('katalog-pembeli');
  grid.innerHTML = products.length ? products.map(p => productCard(p)).join('') : '<p class="empty-msg">Belum ada produk.</p>';
}

function productCard(p) {
  const liked = DB.getLiked(currentUser.email).includes(p.id);
  const oldFmt = formatRp(p.oldPrice);
  const newFmt = formatRp(p.price);
  const save = formatRp(p.oldPrice - p.price);
  return `
  <div class="prod-card" onclick="openDetail('${p.id}')">
    <div class="prod-img">
      ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : '<div class="prod-img-placeholder"></div>'}
      <div class="prod-badge ${liked ? 'liked' : ''}"></div>
    </div>
    <div class="prod-info">
      <div class="prod-name">${p.name}</div>
      <div class="prod-prices">
        <span class="prod-price-new">Rp1,00</span>
        <span class="prod-price-old">${oldFmt}</span>
      </div>
      <div class="prod-save">Save - ${save}</div>
    </div>
  </div>`;
}

// ===== PRODUCT DETAIL =====
function openDetail(productId) {
  currentProductId = productId;
  const p = DB.getProducts().find(p => p.id === productId);
  if (!p) return;

  document.getElementById('detail-name').textContent = p.name;
  document.getElementById('detail-old-price').textContent = formatRp(p.oldPrice);
  document.getElementById('detail-new-price').textContent = formatRp(p.price);
  document.getElementById('detail-save').textContent = 'Save - ' + formatRp(p.oldPrice - p.price);

  const img = document.getElementById('detail-img');
  if (p.photo) { img.src = p.photo; img.style.display = 'block'; }
  else { img.style.display = 'none'; }

  // Update like/wishlist button states
  updateDetailButtons();
  navigate('detail');
}

function updateDetailButtons() {
  const liked = DB.getLiked(currentUser.email).includes(currentProductId);
  const wishlisted = DB.getWishlist(currentUser.email).includes(currentProductId);
  document.querySelector('.btn-like').style.background = liked ? 'var(--accent)' : '';
  document.querySelector('.btn-wishlist').style.background = wishlisted ? 'var(--blue)' : '';
}

function toggleLike(id) {
  const isLiked = DB.toggleLiked(currentUser.email, id);
  DB.addNotif(currentUser.email, isLiked ? `Produk ditambahkan ke liked.` : `Produk dihapus dari liked.`);
  updateDetailButtons();
}

function toggleWishlist(id) {
  const isAdded = DB.toggleWishlist(currentUser.email, id);
  DB.addNotif(currentUser.email, isAdded ? `Produk ditambahkan ke wishlist.` : `Produk dihapus dari wishlist.`);
  updateDetailButtons();
}

// ===== SEARCH =====
function handleSearch(val) {
  if (!val.trim()) {
    if (currentView === 'search') navigate(currentUser.role === 'pembeli' ? 'home-pembeli' : 'home-bengkel');
    return;
  }
  const results = DB.getProducts().filter(p => p.name.toLowerCase().includes(val.toLowerCase()));
  document.getElementById('search-label').textContent = `Result for "${val}"`;
  document.getElementById('search-results').innerHTML = results.length ? results.map(p => productCard(p)).join('') : '<p class="empty-msg">Produk tidak ditemukan.</p>';
  if (currentView !== 'search') {
    prevView = currentUser.role === 'pembeli' ? 'home-pembeli' : 'home-bengkel';
    currentView = 'search';
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-search').classList.add('active');
  }
}

// ===== LIKED =====
function loadLiked() {
  const ids = DB.getLiked(currentUser.email);
  const products = DB.getProducts().filter(p => ids.includes(p.id));
  document.getElementById('liked-grid').innerHTML = products.length ? products.map(p => productCard(p)).join('') : '<p class="empty-msg">Belum ada produk yang dilike.</p>';
}

// ===== WISHLIST =====
function loadWishlist() {
  const ids = DB.getWishlist(currentUser.email);
  const products = DB.getProducts().filter(p => ids.includes(p.id));
  document.getElementById('wishlist-grid').innerHTML = products.length ? products.map(p => productCard(p)).join('') : '<p class="empty-msg">Wishlist kosong.</p>';
}

// ===== NOTIF =====
function loadNotifs() {
  const notifs = DB.getNotifs(currentUser.email);
  document.getElementById('notif-list').innerHTML = notifs.length ? notifs.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-msg">${n.msg}</div>
      <div class="notif-time">${n.time}</div>
    </div>`).join('') : '<p class="empty-msg">Tidak ada notifikasi.</p>';
}

// ===== PROFILE =====
function loadProfileData() {
  const u = DB.getUserByEmail(currentUser.email) || currentUser;
  document.getElementById('profile-account-label').textContent = 'Account ' + u.email;
  document.getElementById('profile-name-display').textContent = u.name || 'Username';
  document.getElementById('profile-userid-display').textContent = '#' + (u.email.split('@')[0]);
  document.getElementById('pinfo-phone').textContent = u.phone || '+62 xxx';
  document.getElementById('pinfo-mail').textContent = u.email;
  document.getElementById('pinfo-address').textContent = u.address || 'Alamat belum diisi';
  document.getElementById('pinfo-birth').textContent = u.birth || '-';
}

function loadProfileView() {
  loadProfileData();
  // Show chat panel only for pembeli
  const chatPanel = document.getElementById('profile-chat-panel');
  if (currentUser.role === 'pembeli') chatPanel.style.display = 'flex';
  else chatPanel.style.display = 'none';
  loadChatContactsInProfile();
}

function editProfile() {
  const u = DB.getUserByEmail(currentUser.email) || currentUser;
  document.getElementById('edit-name').value = u.name || '';
  document.getElementById('edit-phone').value = u.phone || '';
  document.getElementById('edit-address').value = u.address || '';
  document.getElementById('edit-birth').value = u.birth || '';
  openModal('profile-modal');
}

function saveProfile() {
  const u = DB.getUserByEmail(currentUser.email) || currentUser;
  u.name = document.getElementById('edit-name').value;
  u.phone = document.getElementById('edit-phone').value;
  u.address = document.getElementById('edit-address').value;
  u.birth = document.getElementById('edit-birth').value;
  DB.saveUser(u);
  DB.setSession(u);
  currentUser = u;
  loadProfileData();
  closeModal('profile-modal');
  DB.addNotif(u.email, 'Profil berhasil diperbarui.');
}

// ===== STOCK BENGKEL =====
function loadStock() {
  renderStockGrid();
}

function renderStockGrid() {
  const mine = DB.getProducts().filter(p => p.owner === currentUser.email);
  document.getElementById('stock-grid').innerHTML = mine.length ? mine.map(p => `
    <div class="prod-card">
      <div class="prod-img">
        ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : '<div class="prod-img-placeholder"></div>'}
        <div class="prod-badge"></div>
      </div>
      <div class="prod-info">
        <div class="prod-name">${p.name}</div>
        <div class="prod-prices"><span class="prod-price-new">Rp1,00</span><span class="prod-price-old">${formatRp(p.oldPrice || p.price * 2)}</span></div>
        <div class="prod-save">Save - ${formatRp((p.oldPrice || p.price * 2) - p.price)}</div>
        <button class="btn-del-prod" onclick="deleteProduct('${p.id}')">🗑</button>
      </div>
    </div>`).join('') : '<p class="empty-msg">Belum ada produk. Tambahkan di atas!</p>';
}

let prodPhotoData = null;
function previewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    prodPhotoData = e.target.result;
    const preview = document.getElementById('prod-photo-preview');
    preview.src = prodPhotoData;
    preview.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function addProduct() {
  const name = document.getElementById('prod-name').value.trim();
  const priceRaw = document.getElementById('prod-price').value.replace(/[^\d]/g, '');
  const price = parseInt(priceRaw) || 0;

  if (!name || !price) {
    alert('Isi nama dan harga produk!');
    return;
  }

  const prod = {
    id: 'prod_' + Date.now(),
    name,
    price,
    oldPrice: Math.round(price * 2),
    owner: currentUser.email,
    photo: prodPhotoData || null
  };
  DB.saveProduct(prod);
  DB.addNotif(currentUser.email, `Produk "${name}" berhasil ditambahkan.`);

  // Reset form
  document.getElementById('prod-name').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-stock').value = '';
  document.getElementById('prod-photo-preview').style.display = 'none';
  document.getElementById('prod-photo-input').value = '';
  prodPhotoData = null;

  renderStockGrid();
}

function deleteProduct(id) {
  if (confirm('Hapus produk ini?')) {
    DB.deleteProduct(id);
    renderStockGrid();
  }
}

// ===== HOME BENGKEL =====
function loadHomeBengkel() {
  renderCalendar();
  renderServiceHistory();
}

function renderCalendar() {
  const cal = document.getElementById('mini-calendar');
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  let html = `<div class="cal-nav">
    <button onclick="prevMonth()">‹</button>
    <select id="cal-month" onchange="calMonthChange(this.value)">${monthNames.map((m,i)=>`<option value="${i}" ${i===month?'selected':''}>${m}</option>`).join('')}</select>
    <select id="cal-year" onchange="calYearChange(this.value)">${[2024,2025,2026].map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}</select>
    <button onclick="nextMonth()">›</button>
  </div>`;

  html += `<div class="cal-grid">`;
  days.forEach(d => html += `<div class="cal-day-name">${d}</div>`);
  for (let i = 0; i < firstDay; i++) html += `<div></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const sel = d >= 10 && d <= 12 ? ' cal-sel' : '';
    html += `<div class="cal-day ${isToday ? 'cal-today' : ''}${sel}">${d}</div>`;
  }
  html += `</div>`;
  cal.innerHTML = html;
}

function prevMonth() { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); }
function nextMonth() { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); }
function calMonthChange(m) { calendarDate.setMonth(parseInt(m)); renderCalendar(); }
function calYearChange(y) { calendarDate.setFullYear(parseInt(y)); renderCalendar(); }

function renderServiceHistory() {
  const hist = DB.getServiceHistory(currentUser.email);
  const el = document.getElementById('service-history');
  el.innerHTML = hist.length ? hist.map(h => `<div class="hist-item"><div>${h.desc || 'Service dilakukan'}</div><div class="hist-time">${h.time}</div></div>`).join('') : '<p style="color:#666;font-size:13px;padding:10px;">Belum ada riwayat service.</p>';
}

// ===== MAP =====
function openMap(type) {
  const modal = document.getElementById('map-modal');
  const header = document.getElementById('map-header');
  const headerText = document.getElementById('map-header-text');
  const addrBar = document.getElementById('map-address-bar');
  const inner = modal.querySelector('.map-modal-inner');

  if (type === 'bengkel') {
    header.style.background = 'var(--red)';
    headerText.textContent = 'Warning! Butuh bantuan segera!';
    addrBar.style.background = 'rgba(200,30,30,0.4)';
  } else {
    header.style.background = 'var(--blue)';
    headerText.textContent = 'Tunjukkan Lokasi Anda';
    addrBar.style.background = 'rgba(30,80,200,0.3)';
  }

  modal.classList.remove('hidden');

  setTimeout(() => {
    if (!mapInstance) {
      mapInstance = L.map('leaflet-map').setView([-7.2879, 112.7679], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance);
    } else {
      mapInstance.invalidateSize();
    }
    const markerColor = type === 'bengkel' ? '#e53e3e' : '#3b82f6';
    const icon = L.divIcon({
      html: `<div style="background:${markerColor};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [16, 16], iconAnchor: [8, 8]
    });
    L.marker([-7.2879, 112.7679], { icon }).addTo(mapInstance).bindPopup('Jln. Tegal Mulyorejo Baru 7B, Surabaya').openPopup();
  }, 100);
}

function closeMap() {
  document.getElementById('map-modal').classList.add('hidden');
}

// ===== CHAT =====
function loadChatContacts() {
  const users = DB.getUsers().filter(u => u.email !== currentUser.email);
  const list = document.getElementById('chat-contacts');
  if (!list) return;
  list.innerHTML = users.map(u => `
    <div class="chat-contact" onclick="openChatWindow('${u.email}','${u.name}')">
      <div class="chat-avatar">${u.name.charAt(0)}</div>
      <span>${u.name}</span>
    </div>`).join('');
}

function loadChatContactsInProfile() {
  const users = DB.getUsers().filter(u => u.email !== currentUser.email);
  const list = document.getElementById('chat-list');
  if (!list) return;
  list.innerHTML = users.map(u => `
    <div class="chat-contact" onclick="openChatWindow('${u.email}','${u.name}')">
      <div class="chat-avatar">${u.name.charAt(0)}</div>
      <span>${u.name}</span>
    </div>`).join('');
}

function toggleChat() {
  const sidebar = document.getElementById('chat-sidebar');
  sidebar.classList.toggle('open');
}

function openChatWindow(email, name) {
  chatOpenContact = email;
  document.getElementById('chat-win-name').textContent = name;
  document.getElementById('chat-window').classList.remove('hidden');
  renderChatMessages();
}

function closeChatWindow() {
  document.getElementById('chat-window').classList.add('hidden');
  chatOpenContact = null;
}

function renderChatMessages() {
  const msgs = DB.getChatMessages(currentUser.email, chatOpenContact);
  document.getElementById('chat-messages').innerHTML = msgs.map(m => `
    <div class="chat-msg ${m.from === currentUser.email ? 'sent' : 'recv'}">
      <div class="chat-bubble">${m.text}</div>
      <div class="chat-time">${m.time}</div>
    </div>`).join('');
  const el = document.getElementById('chat-messages');
  el.scrollTop = el.scrollHeight;
}

function sendChatMsg() {
  const input = document.getElementById('chat-msg-input');
  const text = input.value.trim();
  if (!text || !chatOpenContact) return;
  DB.addChatMessage(currentUser.email, chatOpenContact, text, true);
  input.value = '';
  renderChatMessages();
}

// ===== MODALS =====
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ===== HELPERS =====
function formatRp(n) {
  return 'Rp' + Number(n).toLocaleString('id-ID') + ',00';
}

// ===== ICONS =====
function bellIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
}
function homeIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
}
function tagIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
}
function wishIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
}
function personIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
function logoutIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
}
