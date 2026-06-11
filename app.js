// ===== APP STATE =====
let currentUser = null;
let currentView = '';
let prevView = '';
let currentProductId = null;
let mapInstance = null;
let nearbyMapInstance = null;
let chatOpenContact = null;
let calendarDate = new Date(2025, 8, 1); // Sep 2025
let isDarkMode = true;

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Restore theme
  const savedTheme = localStorage.getItem('deskraf_theme');
  if (savedTheme === 'light') {
    isDarkMode = false;
    document.body.classList.add('light-mode');
    document.getElementById('theme-btn').textContent = '☀️';
  }

  const session = DB.getSession();
  if (session) {
    currentUser = session;
    startApp();
  }
});

// ===== THEME =====
function toggleTheme() {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle('light-mode', !isDarkMode);
  document.getElementById('theme-btn').textContent = isDarkMode ? '🌙' : '☀️';
  localStorage.setItem('deskraf_theme', isDarkMode ? 'dark' : 'light');
  showToast(isDarkMode ? '🌙 Dark mode aktif' : '☀️ Light mode aktif', 'info');
}

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type;
  void el.offsetWidth; // force reflow
  el.classList.add('show');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('show'), 2800);
}

// ===== AUTH =====
function showLogin() { showPage('page-login'); }
function showRegister() { showPage('page-register'); }
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
    { id: 'liked', icon: heartIcon() },
    { id: 'wishlist', icon: wishIcon() },
    { id: 'cart', icon: cartIconNav(), extraClass: 'nav-cart-wrap' },
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
    const wrap = document.createElement('div');
    wrap.className = item.extraClass || '';
    wrap.style.width = '100%';
    wrap.style.display = 'flex';
    wrap.style.justifyContent = 'center';

    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.id = 'nav-' + item.id;
    btn.innerHTML = item.icon;
    btn.onclick = () => navigate(item.id);

    if (item.id === 'cart') {
      const badge = document.createElement('span');
      badge.className = 'cart-badge';
      badge.id = 'cart-badge';
      badge.style.display = 'none';
      btn.appendChild(badge);
    }

    wrap.appendChild(btn);
    nav.appendChild(wrap);
  });

  // Logout at bottom
  const logoutWrap = document.createElement('div');
  logoutWrap.style.cssText = 'width:100%;display:flex;justify-content:center;margin-top:auto;';
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'nav-btn nav-logout';
  logoutBtn.innerHTML = logoutIcon();
  logoutBtn.onclick = logout;
  logoutWrap.appendChild(logoutBtn);
  nav.appendChild(logoutWrap);

  updateCartBadge();
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
  if (view) view.classList.add('active');

  const navBtn = document.getElementById('nav-' + viewId);
  if (navBtn) navBtn.classList.add('active');

  // Load content
  if (viewId === 'home-pembeli') loadKatalogPembeli();
  else if (viewId === 'home-bengkel') loadHomeBengkel();
  else if (viewId === 'liked') loadLiked();
  else if (viewId === 'wishlist') loadWishlist();
  else if (viewId === 'cart') loadCart();
  else if (viewId === 'notif') loadNotifs();
  else if (viewId === 'stock') loadStock();
  else if (viewId === 'profile') loadProfileView();

  document.getElementById('search-input').value = '';
  document.getElementById('search-input').placeholder = viewId === 'home-pembeli' ? 'Cari produk...' : 'Butuh sesuatu hari ini?';

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

const PROD_EMOJIS = ['🔧','⚙️','🛠️','🔩','🔋','🛞','💡','🔌','🪛','🏎️'];
function prodEmoji(id) {
  let n = 0;
  for (let c of id) n += c.charCodeAt(0);
  return PROD_EMOJIS[n % PROD_EMOJIS.length];
}

function productCard(p) {
  const liked = DB.getLiked(currentUser.email).includes(p.id);
  const newFmt = formatRp(p.price);
  const oldFmt = formatRp(p.oldPrice);
  const save = formatRp(p.oldPrice - p.price);
  return `
  <div class="prod-card" onclick="openDetail('${p.id}')">
    <div class="prod-img">
      ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : `<div class="prod-img-placeholder">${prodEmoji(p.id)}</div>`}
      <div class="prod-badge ${liked ? 'liked' : ''}"></div>
    </div>
    <div class="prod-info">
      <div class="prod-name">${p.name}</div>
      <div class="prod-prices">
        <span class="prod-price-new">${newFmt}</span>
        <span class="prod-price-old">${oldFmt}</span>
      </div>
      <div class="prod-save">Hemat ${save}</div>
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
  document.getElementById('detail-save').textContent = 'Hemat ' + formatRp(p.oldPrice - p.price);

  const img = document.getElementById('detail-img');
  const ph = document.getElementById('detail-img-placeholder');
  if (p.photo) {
    img.src = p.photo; img.style.display = 'block'; ph.style.display = 'none';
  } else {
    img.style.display = 'none'; ph.style.display = 'flex'; ph.textContent = prodEmoji(p.id);
  }

  updateDetailButtons();
  navigate('detail');
}

function updateDetailButtons() {
  if (!currentProductId) return;
  const liked = DB.getLiked(currentUser.email).includes(currentProductId);
  const wishlisted = DB.getWishlist(currentUser.email).includes(currentProductId);
  const likeBtn = document.getElementById('btn-like-detail');
  const wishBtn = document.getElementById('btn-wishlist-detail');
  if (likeBtn) likeBtn.classList.toggle('active-like', liked);
  if (wishBtn) wishBtn.classList.toggle('active-wish', wishlisted);
}

function toggleLike(id) {
  const isLiked = DB.toggleLiked(currentUser.email, id);
  DB.addNotif(currentUser.email, isLiked ? 'Produk ditambahkan ke liked.' : 'Produk dihapus dari liked.');
  updateDetailButtons();
  showToast(isLiked ? '❤️ Ditambahkan ke liked' : '💔 Dihapus dari liked', 'info');
}

function toggleWishlist(id) {
  const isAdded = DB.toggleWishlist(currentUser.email, id);
  DB.addNotif(currentUser.email, isAdded ? 'Produk ditambahkan ke wishlist.' : 'Produk dihapus dari wishlist.');
  updateDetailButtons();
  showToast(isAdded ? '🔖 Ditambahkan ke wishlist' : '📤 Dihapus dari wishlist', 'info');
}

function addToCartFromDetail() {
  if (!currentProductId) return;
  DB.addToCart(currentUser.email, currentProductId, 1);
  updateCartBadge();
  showToast('🛒 Produk ditambahkan ke keranjang!', 'success');
  DB.addNotif(currentUser.email, 'Produk berhasil ditambahkan ke keranjang.');
}

// ===== CART =====
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const cart = DB.getCart(currentUser.email);
  const total = cart.reduce((s, i) => s + i.qty, 0);
  if (total > 0) {
    badge.style.display = 'flex';
    badge.textContent = total > 99 ? '99+' : total;
  } else {
    badge.style.display = 'none';
  }
}

function loadCart() {
  const cart = DB.getCart(currentUser.email);
  const products = DB.getProducts();
  const content = document.getElementById('cart-content');

  if (cart.length === 0) {
    content.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <div class="cart-empty-msg">Keranjang kamu masih kosong.<br>Yuk, mulai belanja!</div>
        <button class="btn-add-product" style="margin-top:16px;" onclick="navigate('home-pembeli')">Lihat Katalog</button>
      </div>`;
    return;
  }

  let subtotal = 0;
  const itemsHtml = cart.map(item => {
    const p = products.find(pr => pr.id === item.productId);
    if (!p) return '';
    const total = p.price * item.qty;
    subtotal += total;
    return `
    <div class="cart-item">
      <div class="cart-item-img">
        ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : `<div class="cart-emoji">${prodEmoji(p.id)}</div>`}
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">${formatRp(p.price)}</div>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${p.id}', ${item.qty - 1})">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${p.id}', ${item.qty + 1})">+</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <span style="font-weight:700;font-size:14px;">${formatRp(total)}</span>
        <button class="cart-remove" onclick="removeFromCart('${p.id}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </div>`;
  }).join('');

  const shipping = 15000;
  const grandTotal = subtotal + shipping;

  content.innerHTML = `
    <div class="cart-layout">
      <div class="cart-list">${itemsHtml}</div>
      <div class="cart-summary">
        <div class="cart-summary-title">Ringkasan Pesanan</div>
        <div class="cart-summary-row"><span class="cart-label">Subtotal</span><span>${formatRp(subtotal)}</span></div>
        <div class="cart-summary-row"><span class="cart-label">Ongkos Kirim</span><span>${formatRp(shipping)}</span></div>
        <div class="cart-summary-row total"><span>Total</span><span>${formatRp(grandTotal)}</span></div>
        <button class="btn-checkout" onclick="doCheckout()">🛒 Checkout Sekarang</button>
      </div>
    </div>`;
}

function changeQty(productId, newQty) {
  DB.updateCartQty(currentUser.email, productId, newQty);
  updateCartBadge();
  loadCart();
}

function removeFromCart(productId) {
  DB.removeFromCart(currentUser.email, productId);
  updateCartBadge();
  loadCart();
  showToast('🗑 Produk dihapus dari keranjang', 'warning');
}

function doCheckout() {
  const cart = DB.getCart(currentUser.email);
  const products = DB.getProducts();
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => {
    const p = products.find(pr => pr.id === i.productId);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  DB.clearCart(currentUser.email);
  updateCartBadge();
  DB.addNotif(currentUser.email, `Pesanan ${itemCount} item senilai ${formatRp(total)} berhasil dibuat!`);
  document.getElementById('checkout-detail-text').textContent = `${itemCount} item senilai ${formatRp(total)} berhasil dipesan!`;
  openModal('checkout-modal');
}

// ===== SEARCH =====
function handleSearch(val) {
  if (!val.trim()) {
    if (currentView === 'search') navigate(currentUser.role === 'pembeli' ? 'home-pembeli' : 'home-bengkel');
    return;
  }
  const results = DB.getProducts().filter(p => p.name.toLowerCase().includes(val.toLowerCase()));
  document.getElementById('search-label').textContent = `${results.length} hasil untuk "${val}"`;
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
  document.getElementById('wishlist-grid').innerHTML = products.length ? products.map(p => productCard(p)).join('') : '<p class="empty-msg">Wishlist masih kosong.</p>';
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
  document.getElementById('profile-account-label').textContent = 'Akun: ' + u.email;
  document.getElementById('profile-name-display').textContent = u.name || 'Username';
  document.getElementById('profile-userid-display').textContent = '#' + (u.email.split('@')[0]);
  document.getElementById('profile-avatar-display').textContent = (u.name || 'U').charAt(0).toUpperCase();
  document.getElementById('pinfo-phone').textContent = u.phone || '+62 xxx';
  document.getElementById('pinfo-mail').textContent = u.email;
  document.getElementById('pinfo-address').textContent = u.address || '-';
  document.getElementById('pinfo-birth').textContent = u.birth || '-';
}

function loadProfileView() {
  loadProfileData();
  const chatPanel = document.getElementById('profile-chat-panel');
  const nearbySection = document.getElementById('nearby-bengkel-section');
  if (currentUser.role === 'pembeli') {
    chatPanel.style.display = 'flex';
    nearbySection.style.display = 'block';
  } else {
    chatPanel.style.display = 'none';
    nearbySection.style.display = 'none';
  }
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
  showToast('✅ Profil berhasil disimpan!', 'success');
}

// ===== NEARBY BENGKEL =====
function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function findNearbyBengkel() {
  const statusEl = document.getElementById('nearby-status');
  const listEl = document.getElementById('bengkel-nearby-list');

  statusEl.className = 'nearby-status-pill detecting';
  statusEl.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Mendeteksi lokasi...';
  listEl.innerHTML = '<p class="empty-msg">⏳ Mengakses GPS...</p>';

  if (!navigator.geolocation) {
    showNearbyError('Browser tidak mendukung GPS');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;
      renderNearbyBengkel(userLat, userLng);
    },
    (err) => {
      // Fallback ke koordinat Surabaya jika GPS ditolak
      const fallbackLat = -7.2575;
      const fallbackLng = 112.7521;
      showToast('📍 Menggunakan lokasi Surabaya (GPS diblokir)', 'warning');
      renderNearbyBengkel(fallbackLat, fallbackLng, true);
    },
    { timeout: 8000, maximumAge: 60000 }
  );
}

function showNearbyError(msg) {
  const statusEl = document.getElementById('nearby-status');
  statusEl.className = 'nearby-status-pill error';
  statusEl.innerHTML = '⚠ ' + msg;
  document.getElementById('bengkel-nearby-list').innerHTML = `<p class="empty-msg">${msg}</p>`;
}

function renderNearbyBengkel(userLat, userLng, isFallback = false) {
  const statusEl = document.getElementById('nearby-status');
  const listEl = document.getElementById('bengkel-nearby-list');
  const bengkelList = DB.getBengkelList();

  const withDist = bengkelList.map(b => ({
    ...b,
    dist: getDistance(userLat, userLng, b.lat, b.lng)
  })).sort((a, b) => a.dist - b.dist);

  statusEl.className = 'nearby-status-pill found';
  statusEl.innerHTML = `✓ ${isFallback ? 'Surabaya (estimasi)' : 'Lokasi terdeteksi'}`;

  const rankClasses = ['r1', 'r2', 'r3'];
  const rankLabels = ['1', '2', '3'];

  listEl.innerHTML = withDist.map((b, i) => {
    const distKm = b.dist < 1 ? (b.dist * 1000).toFixed(0) + ' m' : b.dist.toFixed(1) + ' km';
    const rankClass = rankClasses[i] || 'rn';
    const rankLabel = rankLabels[i] || (i + 1);
    return `
    <div class="bengkel-nearby-card" onclick="openBengkelMap(${b.lat},${b.lng},'${b.name}','${b.address}')">
      <div class="bengkel-rank ${rankClass}">${rankLabel}</div>
      <div class="bengkel-nearby-info">
        <div class="bengkel-nearby-name">${b.name}</div>
        <div class="bengkel-nearby-addr">${b.address}</div>
        <div class="bengkel-nearby-meta">
          <span class="bengkel-meta-tag">⚙️ ${b.specialist}</span>
          <span class="bengkel-rating">⭐ ${b.rating}</span>
        </div>
      </div>
      <div>
        <div class="bengkel-dist">${distKm}</div>
        <div style="font-size:11px;color:var(--text3);text-align:right;margin-top:3px;">📞 ${b.phone}</div>
      </div>
    </div>`;
  }).join('');
}

function openBengkelMap(lat, lng, name, address) {
  const modal = document.getElementById('map-modal');
  const header = document.getElementById('map-header');
  const headerText = document.getElementById('map-header-text');
  const addrBar = document.getElementById('map-address-bar');

  header.style.background = 'var(--cyan)';
  headerText.textContent = '🔧 ' + name;
  addrBar.textContent = address;
  addrBar.style.background = 'rgba(6,182,212,0.2)';
  modal.classList.remove('hidden');

  setTimeout(() => {
    if (!mapInstance) {
      mapInstance = L.map('leaflet-map').setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance);
    } else {
      mapInstance.setView([lat, lng], 15);
      mapInstance.invalidateSize();
    }
    const icon = L.divIcon({
      html: `<div style="background:#06b6d4;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9]
    });
    L.marker([lat, lng], { icon }).addTo(mapInstance).bindPopup(`<b>${name}</b><br>${address}`).openPopup();
  }, 120);
}

// ===== MAP =====
function openMap(type) {
  const modal = document.getElementById('map-modal');
  const header = document.getElementById('map-header');
  const headerText = document.getElementById('map-header-text');
  const addrBar = document.getElementById('map-address-bar');

  const lat = -7.2879, lng = 112.7679;
  if (type === 'bengkel') {
    header.style.background = 'var(--red)';
    headerText.textContent = '🚨 Warning! Butuh bantuan segera!';
    addrBar.textContent = 'Jln. Tegal Mulyorejo Baru 7B, Surabaya';
    addrBar.style.background = 'rgba(200,30,30,0.3)';
  } else {
    header.style.background = 'var(--blue)';
    headerText.textContent = '📍 Tunjukkan Lokasi Anda';
    addrBar.textContent = 'Jln. Tegal Mulyorejo Baru 7B, Surabaya';
    addrBar.style.background = 'rgba(30,80,200,0.2)';
  }

  modal.classList.remove('hidden');

  setTimeout(() => {
    if (!mapInstance) {
      mapInstance = L.map('leaflet-map').setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapInstance);
    } else {
      mapInstance.setView([lat, lng], 15);
      mapInstance.invalidateSize();
    }
    const color = type === 'bengkel' ? '#ef4444' : '#3b82f6';
    const icon = L.divIcon({
      html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9]
    });
    L.marker([lat, lng], { icon }).addTo(mapInstance).bindPopup('Jln. Tegal Mulyorejo Baru 7B, Surabaya').openPopup();
  }, 100);
}

function closeMap() {
  document.getElementById('map-modal').classList.add('hidden');
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
  el.innerHTML = hist.length ? hist.map(h => `<div class="hist-item"><div>${h.desc || 'Service dilakukan'}</div><div class="hist-time">${h.time}</div></div>`).join('') : '<p style="color:var(--text3);font-size:13px;padding:10px;">Belum ada riwayat service.</p>';
}

// ===== CHAT =====
function loadChatContacts() {
  const users = DB.getUsers().filter(u => u.email !== currentUser.email);
  const list = document.getElementById('chat-contacts');
  if (!list) return;
  list.innerHTML = users.map(u => `
    <div class="chat-contact" onclick="openChatWindow('${u.email}','${u.name}')">
      <div class="chat-avatar">${u.name.charAt(0).toUpperCase()}</div>
      <span>${u.name}</span>
    </div>`).join('');
}

function loadChatContactsInProfile() {
  const users = DB.getUsers().filter(u => u.email !== currentUser.email);
  const list = document.getElementById('chat-list');
  if (!list) return;
  list.innerHTML = users.map(u => `
    <div class="chat-contact" onclick="openChatWindow('${u.email}','${u.name}')">
      <div class="chat-avatar">${u.name.charAt(0).toUpperCase()}</div>
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

// ===== STOCK BENGKEL =====
function loadStock() {
  renderStockGrid();
}

function renderStockGrid() {
  const mine = DB.getProducts().filter(p => p.owner === currentUser.email);
  document.getElementById('stock-grid').innerHTML = mine.length ? mine.map(p => `
    <div class="prod-card">
      <div class="prod-img">
        ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : `<div class="prod-img-placeholder">${prodEmoji(p.id)}</div>`}
        <div class="prod-badge"></div>
      </div>
      <div class="prod-info">
        <div class="prod-name">${p.name}</div>
        <div class="prod-prices">
          <span class="prod-price-new">${formatRp(p.price)}</span>
          <span class="prod-price-old">${formatRp(p.oldPrice || p.price * 2)}</span>
        </div>
        <div class="prod-save">Hemat ${formatRp((p.oldPrice || p.price * 2) - p.price)}</div>
        <button class="btn-del-prod" onclick="deleteProduct('${p.id}')">🗑 Hapus</button>
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
    showToast('⚠️ Isi nama dan harga produk!', 'warning');
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

  document.getElementById('prod-name').value = '';
  document.getElementById('prod-price').value = '';
  document.getElementById('prod-stock').value = '';
  document.getElementById('prod-photo-preview').style.display = 'none';
  document.getElementById('prod-photo-input').value = '';
  prodPhotoData = null;

  renderStockGrid();
  showToast('✅ Produk berhasil ditambahkan!', 'success');
}

function deleteProduct(id) {
  if (confirm('Hapus produk ini?')) {
    DB.deleteProduct(id);
    renderStockGrid();
    showToast('🗑 Produk dihapus', 'warning');
  }
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

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
function heartIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
}
function tagIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`;
}
function wishIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
}
function cartIconNav() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`;
}
function personIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
}
function logoutIcon() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
}
