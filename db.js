// ===== DATABASE (localStorage) =====

const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem('deskraf_' + key)) || null; }
    catch(e) { return null; }
  },
  set(key, val) {
    localStorage.setItem('deskraf_' + key, JSON.stringify(val));
  },

  // USERS
  getUsers() { return this.get('users') || []; },
  saveUser(user) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.email === user.email);
    if (idx >= 0) users[idx] = user;
    else users.push(user);
    this.set('users', users);
  },
  findUser(email, password) {
    return this.getUsers().find(u => u.email === email && u.password === password) || null;
  },
  getUserByEmail(email) {
    return this.getUsers().find(u => u.email === email) || null;
  },

  // CURRENT SESSION
  getSession() { return this.get('session'); },
  setSession(user) { this.set('session', user); },
  clearSession() { localStorage.removeItem('deskraf_session'); },

  // PRODUCTS
  getProducts() { return this.get('products') || []; },
  saveProduct(prod) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === prod.id);
    if (idx >= 0) products[idx] = prod;
    else products.push(prod);
    this.set('products', products);
  },
  deleteProduct(id) {
    const products = this.getProducts().filter(p => p.id !== id);
    this.set('products', products);
  },

  // LIKED
  getLiked(userEmail) { return this.get('liked_' + userEmail) || []; },
  toggleLiked(userEmail, productId) {
    const liked = this.getLiked(userEmail);
    const idx = liked.indexOf(productId);
    if (idx >= 0) liked.splice(idx, 1);
    else liked.push(productId);
    this.set('liked_' + userEmail, liked);
    return idx < 0;
  },

  // WISHLIST
  getWishlist(userEmail) { return this.get('wishlist_' + userEmail) || []; },
  toggleWishlist(userEmail, productId) {
    const wl = this.getWishlist(userEmail);
    const idx = wl.indexOf(productId);
    if (idx >= 0) wl.splice(idx, 1);
    else wl.push(productId);
    this.set('wishlist_' + userEmail, wl);
    return idx < 0;
  },

  // CART
  getCart(userEmail) { return this.get('cart_' + userEmail) || []; },
  addToCart(userEmail, productId, qty = 1) {
    const cart = this.getCart(userEmail);
    const idx = cart.findIndex(i => i.productId === productId);
    if (idx >= 0) cart[idx].qty += qty;
    else cart.push({ productId, qty });
    this.set('cart_' + userEmail, cart);
  },
  updateCartQty(userEmail, productId, qty) {
    let cart = this.getCart(userEmail);
    if (qty <= 0) {
      cart = cart.filter(i => i.productId !== productId);
    } else {
      const idx = cart.findIndex(i => i.productId === productId);
      if (idx >= 0) cart[idx].qty = qty;
    }
    this.set('cart_' + userEmail, cart);
  },
  removeFromCart(userEmail, productId) {
    const cart = this.getCart(userEmail).filter(i => i.productId !== productId);
    this.set('cart_' + userEmail, cart);
  },
  clearCart(userEmail) { this.set('cart_' + userEmail, []); },

  // NOTIFICATIONS
  getNotifs(userEmail) { return this.get('notifs_' + userEmail) || []; },
  addNotif(userEmail, msg) {
    const notifs = this.getNotifs(userEmail);
    notifs.unshift({ id: Date.now(), msg, time: new Date().toLocaleString('id-ID'), read: false });
    this.set('notifs_' + userEmail, notifs);
  },

  // CHAT
  getChatMessages(userEmail, contactEmail) {
    const key = [userEmail, contactEmail].sort().join('__');
    return this.get('chat_' + key) || [];
  },
  addChatMessage(userEmail, contactEmail, text, fromSelf) {
    const key = [userEmail, contactEmail].sort().join('__');
    const msgs = this.getChatMessages(userEmail, contactEmail);
    msgs.push({ id: Date.now(), text, from: fromSelf ? userEmail : contactEmail, time: new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'}) });
    this.set('chat_' + key, msgs);
  },

  // SERVICE HISTORY (bengkel)
  getServiceHistory(userEmail) { return this.get('history_' + userEmail) || []; },
  addServiceHistory(userEmail, item) {
    const hist = this.getServiceHistory(userEmail);
    hist.unshift({ id: Date.now(), ...item, time: new Date().toLocaleString('id-ID') });
    this.set('history_' + userEmail, hist);
  },

  // BENGKEL LIST (for nearby search)
  getBengkelList() {
    return this.get('bengkel_list') || [];
  }
};

// SEED demo data if empty
function seedData() {
  if (DB.getUsers().length === 0) {
    DB.saveUser({ email: 'pembeli@demo.com', password: '123', name: 'Budi Santoso', role: 'pembeli', phone: '+62 812 3456 7890', address: 'Jln. Tegal Mulyorejo Baru 7B, Sukolio, Surabaya', birth: '09-01-2000' });
    DB.saveUser({ email: 'bengkel@demo.com', password: '123', name: 'Pak Harto', role: 'bengkel', phone: '+62 856 1234 5678', address: 'Jln. Raya Darmo No. 12, Surabaya', birth: '15-06-1980' });
    DB.saveUser({ email: 'bengkel2@demo.com', password: '123', name: 'Bengkel Maju', role: 'bengkel', phone: '+62 812 9876 5432', address: 'Jln. Mulyosari No. 45, Surabaya', birth: '20-03-1975' });
    DB.saveUser({ email: 'bengkel3@demo.com', password: '123', name: 'AutoFix Center', role: 'bengkel', phone: '+62 821 1111 2222', address: 'Jln. Kertajaya No. 78, Surabaya', birth: '10-08-1982' });
  }
  if (DB.getProducts().length === 0) {
    const items = [
      { name: 'Oli Resiing Premium', price: 1000000, oldPrice: 2000000, owner: 'bengkel@demo.com' },
      { name: 'Filter Udara K&N', price: 350000, oldPrice: 500000, owner: 'bengkel@demo.com' },
      { name: 'Busi NGK Iridium', price: 125000, oldPrice: 200000, owner: 'bengkel@demo.com' },
      { name: 'Kampas Rem Brembo', price: 450000, oldPrice: 700000, owner: 'bengkel@demo.com' },
      { name: 'Aki GS Astra MF', price: 600000, oldPrice: 850000, owner: 'bengkel@demo.com' },
      { name: 'Chain Lube Motul', price: 89000, oldPrice: 120000, owner: 'bengkel@demo.com' },
      { name: 'Knalpot Racing HRP', price: 1800000, oldPrice: 2500000, owner: 'bengkel2@demo.com' },
      { name: 'Suspensi YSS G-Plus', price: 950000, oldPrice: 1300000, owner: 'bengkel2@demo.com' },
    ];
    items.forEach((item, i) => {
      DB.saveProduct({ id: 'prod_' + (i + 1), ...item, photo: null });
    });
    DB.addNotif('pembeli@demo.com', 'Selamat datang di DesKraf!');
    DB.addNotif('bengkel@demo.com', 'Akun bengkel Anda siap digunakan.');
  }
  // Seed bengkel locations (Surabaya area)
  if (!DB.get('bengkel_list')) {
    DB.set('bengkel_list', [
      { id: 'b1', name: 'Bengkel Pak Harto', address: 'Jln. Raya Darmo No. 12, Surabaya', phone: '+62 856 1234 5678', lat: -7.2837, lng: 112.7370, rating: 4.8, specialist: 'Motor & Mobil' },
      { id: 'b2', name: 'Bengkel Maju Jaya', address: 'Jln. Mulyosari No. 45, Surabaya', phone: '+62 812 9876 5432', lat: -7.2622, lng: 112.7891, rating: 4.5, specialist: 'Motor' },
      { id: 'b3', name: 'AutoFix Center', address: 'Jln. Kertajaya No. 78, Surabaya', phone: '+62 821 1111 2222', lat: -7.2764, lng: 112.7643, rating: 4.7, specialist: 'Mobil' },
      { id: 'b4', name: 'Bengkel Surya Motor', address: 'Jln. Pemuda No. 33, Surabaya', phone: '+62 813 5555 6666', lat: -7.2591, lng: 112.7508, rating: 4.3, specialist: 'Motor' },
      { id: 'b5', name: 'Star Garage Surabaya', address: 'Jln. HR Muhammad No. 100, Surabaya', phone: '+62 857 7777 8888', lat: -7.2958, lng: 112.7201, rating: 4.6, specialist: 'Motor & Mobil' },
    ]);
  }
}
seedData();
