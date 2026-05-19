if (!Auth.isLoggedIn()) {
    window.location.href = 'login.html?redirect=account.html';
}

const tabs = {
    profile: renderProfile,
    orders: renderOrders,
    wishlist: renderWishlist,
    password: renderPassword
};

async function renderProfile() {
    const user = Auth.getUser();
    document.getElementById('accountContent').innerHTML = `
        <div class="account-card">
            <h2><i class="fas fa-user-edit"></i> Thông tin cá nhân</h2>
            <form id="profileForm" class="account-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Họ và tên</label>
                        <input type="text" name="full_name" value="${user.full_name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Số điện thoại</label>
                        <input type="tel" name="phone" value="${user.phone || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" value="${user.email}" disabled>
                </div>
                <div class="form-group">
                    <label>Địa chỉ</label>
                    <textarea name="address" rows="3">${user.address || ''}</textarea>
                </div>
                <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Lưu thay đổi</button>
            </form>
        </div>
    `;
    
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        try {
            const res = await API.updateProfile(data);
            Auth.setUser(res.user);
            updateAuthUI();
            showToast('Cập nhật thành công!');
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function renderOrders() {
    const container = document.getElementById('accountContent');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const res = await API.getOrders();
        const orders = res.data;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div class="account-card">
                    <h2><i class="fas fa-box"></i> Đơn hàng của tôi</h2>
                    <div class="empty-state-small">
                        <i class="fas fa-box-open"></i>
                        <p>Bạn chưa có đơn hàng nào</p>
                        <a href="products.html" class="btn btn-primary">Mua sắm ngay</a>
                    </div>
                </div>`;
            return;
        }
        
        const statusMap = {
            pending: { label: 'Chờ xử lý', class: 'pending', icon: 'clock' },
            confirmed: { label: 'Đã xác nhận', class: 'confirmed', icon: 'check' },
            shipping: { label: 'Đang giao', class: 'shipping', icon: 'truck' },
            delivered: { label: 'Đã giao', class: 'delivered', icon: 'check-circle' },
            cancelled: { label: 'Đã hủy', class: 'cancelled', icon: 'times-circle' }
        };
        
        container.innerHTML = `
            <div class="account-card">
                <h2><i class="fas fa-box"></i> Đơn hàng của tôi (${orders.length})</h2>
                <div class="orders-list">
                    ${orders.map(o => {
                        const st = statusMap[o.status] || statusMap.pending;
                        return `
                        <div class="order-card">
                            <div class="order-header">
                                <div>
                                    <strong>#${o.order_code}</strong>
                                    <span class="order-date">${formatDateTime(o.created_at)}</span>
                                </div>
                                <span class="order-status order-status-${st.class}">
                                    <i class="fas fa-${st.icon}"></i> ${st.label}
                                </span>
                            </div>
                            <div class="order-items-preview">
                                ${o.items.slice(0, 3).map(i => `
                                    <div class="order-item-thumb">
                                        <img src="${i.product_image || 'images/phone1.svg'}" 
                                             onerror="this.src='images/phone1.svg'">
                                        <span class="thumb-qty">×${i.quantity}</span>
                                    </div>
                                `).join('')}
                                ${o.items.length > 3 ? `<span class="more-items">+${o.items.length - 3}</span>` : ''}
                                <div class="order-summary">
                                    <span>${o.items.length} sản phẩm</span>
                                    <strong>${formatCurrency(o.total)}</strong>
                                </div>
                            </div>
                            <div class="order-actions">
                                <button class="btn btn-outline-primary" onclick="viewOrder('${o.order_code}')">
                                    <i class="far fa-eye"></i> Chi tiết
                                </button>
                                ${o.status === 'pending' ? `
                                <button class="btn btn-outline-danger" onclick="cancelOrder(${o.id})">
                                    <i class="fas fa-times"></i> Hủy đơn
                                </button>` : ''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

async function renderWishlist() {
    const container = document.getElementById('accountContent');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const res = await API.getWishlist();
        const items = res.data;
        
        if (items.length === 0) {
            container.innerHTML = `
                <div class="account-card">
                    <h2><i class="fas fa-heart"></i> Sản phẩm yêu thích</h2>
                    <div class="empty-state-small">
                        <i class="fas fa-heart-broken"></i>
                        <p>Chưa có sản phẩm yêu thích</p>
                        <a href="products.html" class="btn btn-primary">Khám phá sản phẩm</a>
                    </div>
                </div>`;
            return;
        }
        
        container.innerHTML = `
            <div class="account-card">
                <h2><i class="fas fa-heart"></i> Sản phẩm yêu thích (${items.length})</h2>
                <div class="wishlist-grid">
                    ${items.map(p => `
                        <div class="wishlist-item">
                            <img src="${p.image}" onerror="this.src='images/phone1.svg'">
                            <div>
                                <h4><a href="product.html?slug=${p.slug}">${p.name}</a></h4>
                                <div class="price">${formatCurrency(p.price)}</div>
                            </div>
                            <div class="wishlist-actions">
                                <button class="btn btn-primary btn-sm" onclick="addToCartFromWishlist(${p.product_id})">
                                    <i class="fas fa-cart-plus"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="removeFromWishlist(${p.product_id})">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

function renderPassword() {
    document.getElementById('accountContent').innerHTML = `
        <div class="account-card">
            <h2><i class="fas fa-lock"></i> Đổi mật khẩu</h2>
            <form id="passwordForm" class="account-form">
                <div class="form-group">
                    <label>Mật khẩu hiện tại <span class="required">*</span></label>
                    <input type="password" name="current_password" required>
                </div>
                <div class="form-group">
                    <label>Mật khẩu mới <span class="required">*</span></label>
                    <input type="password" name="new_password" minlength="6" required>
                </div>
                <div class="form-group">
                    <label>Xác nhận mật khẩu mới <span class="required">*</span></label>
                    <input type="password" name="confirm" minlength="6" required>
                </div>
                <button type="submit" class="btn btn-primary"><i class="fas fa-key"></i> Đổi mật khẩu</button>
            </form>
        </div>
    `;
    
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        if (data.new_password !== data.confirm) {
            showToast('Mật khẩu xác nhận không khớp', 'error');
            return;
        }
        try {
            await API.changePassword({
                current_password: data.current_password,
                new_password: data.new_password
            });
            showToast('Đổi mật khẩu thành công!');
            e.target.reset();
        } catch (err) {
            showToast(err.message, 'error');
        }
    });
}

async function viewOrder(code) {
    try {
        const res = await API.getOrder(code);
        const o = res.data;
        const html = `
            <div class="modal-overlay" id="orderDetailModal">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>Chi tiết đơn hàng #${o.order_code}</h3>
                        <button class="modal-close" onclick="document.getElementById('orderDetailModal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="order-detail-info">
                            <div><strong>Khách hàng:</strong> ${o.customer_name}</div>
                            <div><strong>Điện thoại:</strong> ${o.customer_phone}</div>
                            <div><strong>Địa chỉ:</strong> ${o.shipping_address}</div>
                            <div><strong>Ngày đặt:</strong> ${formatDateTime(o.created_at)}</div>
                            <div><strong>Phương thức:</strong> ${o.payment_method.toUpperCase()}</div>
                            ${o.note ? `<div><strong>Ghi chú:</strong> ${o.note}</div>` : ''}
                        </div>
                        <h4>Sản phẩm</h4>
                        <div class="order-items-list">
                            ${o.items.map(i => `
                                <div class="order-item-row">
                                    <img src="${i.product_image || 'images/phone1.svg'}" onerror="this.src='images/phone1.svg'">
                                    <div>
                                        <h5>${i.product_name}</h5>
                                        <span>${formatCurrency(i.price)} × ${i.quantity}</span>
                                    </div>
                                    <strong>${formatCurrency(i.subtotal)}</strong>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-totals">
                            <div class="summary-row"><span>Tạm tính:</span><strong>${formatCurrency(o.subtotal)}</strong></div>
                            <div class="summary-row"><span>Phí ship:</span><strong>${formatCurrency(o.shipping_fee)}</strong></div>
                            <div class="summary-row total"><span>Tổng cộng:</span><strong>${formatCurrency(o.total)}</strong></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Safe close: only when mousedown AND mouseup both on overlay
        const orderModal = document.getElementById('orderDetailModal');
        let mdOrder = false;
        orderModal.addEventListener('mousedown', (e) => { mdOrder = (e.target === orderModal); });
        orderModal.addEventListener('mouseup', (e) => { if (mdOrder && e.target === orderModal) orderModal.remove(); mdOrder = false; });
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function cancelOrder(id) {
    if (!confirm('Bạn có chắc muốn hủy đơn hàng này?')) return;
    try {
        await API.cancelOrder(id);
        showToast('Đã hủy đơn hàng');
        renderOrders();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function addToCartFromWishlist(productId) {
    try {
        await API.addToCart(productId, 1);
        showToast('Đã thêm vào giỏ hàng');
        await updateCartBadge();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removeFromWishlist(productId) {
    try {
        await API.removeFromWishlist(productId);
        showToast('Đã xóa khỏi yêu thích');
        renderWishlist();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function logout() {
    if (!confirm('Đăng xuất?')) return;
    Auth.clearToken();
    window.location.href = 'index.html';
}

window.viewOrder = viewOrder;
window.cancelOrder = cancelOrder;
window.addToCartFromWishlist = addToCartFromWishlist;
window.removeFromWishlist = removeFromWishlist;
window.logout = logout;

// Tab navigation
document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('[data-tab]').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const tab = link.dataset.tab;
        if (tabs[tab]) tabs[tab]();
    });
});

// Initial load
renderProfile();
