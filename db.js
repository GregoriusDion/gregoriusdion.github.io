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
  }
};

// SEED demo data if empty
function seedData() {
  if (DB.getUsers().length === 0) {
    DB.saveUser({ email: 'pembeli@demo.com', password: '123', name: 'Budi Santoso', role: 'pembeli', phone: '+62 812 3456 7890', address: 'Jln. Tegal Mulyorejo Baru 7B, Sukolio, Surabaya', birth: '09-01-2000' });
    DB.saveUser({ email: 'bengkel@demo.com', password: '123', name: 'Pak Harto', role: 'bengkel', phone: '+62 856 1234 5678', address: 'Jln. Raya Darmo No. 12, Surabaya', birth: '15-06-1980' });
  }
  if (DB.getProducts().length === 0) {
    const items = [
      { name: 'Oli Resiing Premium', price: 1000000, oldPrice: 2000000, owner: 'bengkel@demo.com' },
      { name: 'Filter Udara K&N', price: 350000, oldPrice: 500000, owner: 'bengkel@demo.com' },
      { name: 'Busi NGK Iridium', price: 125000, oldPrice: 200000, owner: 'bengkel@demo.com' },
      { name: 'Kampas Rem Brembo', price: 450000, oldPrice: 700000, owner: 'bengkel@demo.com' },
      { name: 'Aki GS Astra MF', price: 600000, oldPrice: 850000, owner: 'bengkel@demo.com' },
      { name: 'Chain Lube Motul', price: 89000, oldPrice: 120000, owner: 'bengkel@demo.com' },
    ];
    items.forEach((item, i) => {
      DB.saveProduct({ id: 'prod_' + (i + 1), ...item, photo: null });
    });
    DB.addNotif('pembeli@demo.com', 'Selamat datang di DesKraf!');
    DB.addNotif('bengkel@demo.com', 'Akun bengkel Anda siap digunakan.');
  }
}
seedData();
