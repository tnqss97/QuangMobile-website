// ===== API CLIENT =====
// API_BASE được lấy từ js/config.js (window.QM_CONFIG)
const API_BASE = (window.QM_CONFIG && window.QM_CONFIG.API_BASE) || (window.location.origin + '/api');

const Auth = {
    getToken() { return localStorage.getItem('qm_token'); },
    setToken(t) { localStorage.setItem('qm_token', t); },
    clearToken() { localStorage.removeItem('qm_token'); localStorage.removeItem('qm_user'); },
    getUser() {
        try { return JSON.parse(localStorage.getItem('qm_user') || 'null'); }
        catch (e) { return null; }
    },
    setUser(u) { localStorage.setItem('qm_user', JSON.stringify(u)); },
    isLoggedIn() { return !!this.getToken(); },
    isAdmin() { return this.getUser()?.role === 'admin'; }
};

async function apiRequest(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const token = Auth.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    
    try {
        const res = await fetch(API_BASE + endpoint, { ...options, headers });
        const data = await res.json();
        if (!res.ok) {
            const err = new Error(data.message || 'Request failed');
            err.status = res.status;
            err.data = data;
            throw err;
        }
        return data;
    } catch (err) {
        if (err.name === 'TypeError' || err.message === 'Failed to fetch') {
            throw new Error('Không thể kết nối server. Hãy chắc chắn backend đang chạy tại http://localhost:3000 (chạy "npm start" trong thư mục backend)');
        }
        throw err;
    }
}

const API = {
    // Auth
    register: (data) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    login: (data) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
    me: () => apiRequest('/auth/me'),
    updateProfile: (data) => apiRequest('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (data) => apiRequest('/auth/password', { method: 'PUT', body: JSON.stringify(data) }),
    
    // Products
    getProducts: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('/products' + (qs ? '?' + qs : ''));
    },
    getFeaturedProducts: (limit = 4) => apiRequest(`/products/featured?limit=${limit}`),
    getProduct: (slug) => apiRequest(`/products/${slug}`),
    
    // Categories
    getCategories: () => apiRequest('/categories'),
    getCategory: (id) => apiRequest(`/categories/${id}`),
    createCategory: (data) => apiRequest('/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id, data) => apiRequest(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id) => apiRequest(`/categories/${id}`, { method: 'DELETE' }),
    getBrands: () => apiRequest('/categories/brands'),
    createBrand: (data) => apiRequest('/categories/brands', { method: 'POST', body: JSON.stringify(data) }),
    deleteBrand: (id) => apiRequest(`/categories/brands/${id}`, { method: 'DELETE' }),
    
    // Products admin
    createProduct: (data) => apiRequest('/products', { method: 'POST', body: JSON.stringify(data) }),
    updateProduct: (id, data) => apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteProduct: (id) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
    
    // Cart
    getCart: () => apiRequest('/cart'),
    addToCart: (product_id, quantity = 1) => apiRequest('/cart', {
        method: 'POST', body: JSON.stringify({ product_id, quantity })
    }),
    updateCartItem: (id, quantity) => apiRequest(`/cart/${id}`, {
        method: 'PUT', body: JSON.stringify({ quantity })
    }),
    removeCartItem: (id) => apiRequest(`/cart/${id}`, { method: 'DELETE' }),
    clearCart: () => apiRequest('/cart', { method: 'DELETE' }),
    
    // Orders
    createOrder: (data) => apiRequest('/orders', { method: 'POST', body: JSON.stringify(data) }),
    getOrders: () => apiRequest('/orders'),
    getOrder: (code) => apiRequest(`/orders/${code}`),
    cancelOrder: (id) => apiRequest(`/orders/${id}/cancel`, { method: 'POST' }),
    
    // Reviews
    getReviews: (productId) => apiRequest(`/reviews/${productId}`),
    addReview: (data) => apiRequest('/reviews', { method: 'POST', body: JSON.stringify(data) }),
    
    // News
    getNews: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('/news' + (qs ? '?' + qs : ''));
    },
    getNewsArticle: (slug) => apiRequest(`/news/${slug}`),
    getPopularNews: () => apiRequest('/news/popular'),
    getNewsCategories: () => apiRequest('/news/categories'),
    getNewsTags: () => apiRequest('/news/tags'),
    
    // Misc
    sendContact: (data) => apiRequest('/contact', { method: 'POST', body: JSON.stringify(data) }),
    subscribeNewsletter: (email) => apiRequest('/newsletter', {
        method: 'POST', body: JSON.stringify({ email })
    }),
    validateCoupon: (code, subtotal) => apiRequest('/coupons/validate', {
        method: 'POST', body: JSON.stringify({ code, subtotal })
    }),
    
    // Wishlist
    getWishlist: () => apiRequest('/wishlist'),
    addToWishlist: (product_id) => apiRequest('/wishlist', {
        method: 'POST', body: JSON.stringify({ product_id })
    }),
    removeFromWishlist: (productId) => apiRequest(`/wishlist/${productId}`, { method: 'DELETE' }),
    
    // Admin
    getAdminStats: () => apiRequest('/admin/stats'),
    getAdminOrders: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return apiRequest('/admin/orders' + (qs ? '?' + qs : ''));
    },
    updateOrderStatus: (id, status) => apiRequest(`/orders/${id}/status`, {
        method: 'PUT', body: JSON.stringify({ status })
    })
};

// ===== UTILS =====
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + '₫';
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function showToast(message, type = 'success') {
    const toast = document.querySelector('.toast');
    if (!toast) {
        alert(message);
        return;
    }
    const msgEl = toast.querySelector('.toast-message');
    const iconEl = toast.querySelector('.toast-icon');
    if (msgEl) msgEl.textContent = message;
    
    const colors = { success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
    const icons = { success: 'check', error: 'times', warning: 'exclamation', info: 'info' };
    
    toast.style.borderLeftColor = colors[type] || colors.success;
    if (iconEl) {
        iconEl.style.background = colors[type] || colors.success;
        iconEl.innerHTML = `<i class="fas fa-${icons[type] || 'check'}"></i>`;
    }
    
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Make available globally
window.API = API;
window.Auth = Auth;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.showToast = showToast;

// ===== UPDATE UI BASED ON LOGIN STATE =====
function updateAuthUI() {
    const user = Auth.getUser();
    document.querySelectorAll('[data-auth="logged-in"]').forEach(el => {
        el.style.display = user ? '' : 'none';
    });
    document.querySelectorAll('[data-auth="logged-out"]').forEach(el => {
        el.style.display = user ? 'none' : '';
    });
    document.querySelectorAll('[data-auth="admin"]').forEach(el => {
        el.style.display = (user?.role === 'admin') ? '' : 'none';
    });
    document.querySelectorAll('[data-user-name]').forEach(el => {
        el.textContent = user?.full_name || '';
    });
    document.querySelectorAll('[data-user-email]').forEach(el => {
        el.textContent = user?.email || '';
    });
}

// ===== UPDATE CART BADGE =====
async function updateCartBadge() {
    const badges = document.querySelectorAll('.cart-count');
    if (!Auth.isLoggedIn()) {
        // Use local cart count
        const localCount = parseInt(localStorage.getItem('cartCount') || '0');
        badges.forEach(b => b.textContent = localCount);
        return;
    }
    try {
        const res = await API.getCart();
        const count = res.data?.length || 0;
        badges.forEach(b => b.textContent = count);
    } catch (e) {
        // Silent fail
    }
}

window.updateAuthUI = updateAuthUI;
window.updateCartBadge = updateCartBadge;

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    updateCartBadge();
});
