// ===== CART PAGE =====
let cartData = { items: [], subtotal: 0 };
let appliedCoupon = null;

async function loadCart() {
    const container = document.getElementById('cartContent');
    
    if (!Auth.isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-lock"></i>
                <h2>Bạn cần đăng nhập</h2>
                <p>Đăng nhập để xem giỏ hàng và mua sắm</p>
                <a href="login.html?redirect=cart.html" class="btn btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Đăng nhập ngay
                </a>
            </div>
        `;
        return;
    }
    
    try {
        const res = await API.getCart();
        cartData.items = res.data;
        cartData.subtotal = res.subtotal;
        renderCart();
    } catch (err) {
        container.innerHTML = `<div class="error-state"><p>Lỗi: ${err.message}</p></div>`;
    }
}

function renderCart() {
    const container = document.getElementById('cartContent');
    
    if (cartData.items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag"></i>
                <h2>Giỏ hàng trống</h2>
                <p>Hãy chọn sản phẩm yêu thích để thêm vào giỏ hàng</p>
                <a href="products.html" class="btn btn-primary">
                    <i class="fas fa-shopping-cart"></i> Khám phá sản phẩm
                </a>
            </div>
        `;
        return;
    }
    
    const shipping = cartData.subtotal >= 500000 ? 0 : 30000;
    const discount = appliedCoupon?.discount || 0;
    const total = cartData.subtotal + shipping - discount;
    
    container.innerHTML = `
        <div class="cart-layout">
            <div class="cart-items">
                <div class="cart-header">
                    <h3>${cartData.items.length} sản phẩm trong giỏ</h3>
                    <button class="btn-link" onclick="clearAllCart()">
                        <i class="fas fa-trash"></i> Xóa tất cả
                    </button>
                </div>
                ${cartData.items.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-image">
                            <img src="${item.image}" alt="${item.name}" onerror="this.src='images/phone1.svg'">
                        </div>
                        <div class="cart-item-info">
                            <h4><a href="product.html?slug=${item.slug}">${item.name}</a></h4>
                            <div class="cart-item-price">
                                ${formatCurrency(item.price)}
                                ${item.old_price ? `<span class="old-price">${formatCurrency(item.old_price)}</span>` : ''}
                            </div>
                        </div>
                        <div class="cart-item-quantity">
                            <button class="qty-btn" onclick="updateQty(${item.id}, ${item.quantity - 1})">
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" value="${item.quantity}" min="1" max="${item.stock}" 
                                   onchange="updateQty(${item.id}, parseInt(this.value))">
                            <button class="qty-btn" onclick="updateQty(${item.id}, ${item.quantity + 1})">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="cart-item-subtotal">
                            ${formatCurrency(item.price * item.quantity)}
                        </div>
                        <button class="cart-item-remove" onclick="removeItem(${item.id})" title="Xóa">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
            
            <div class="cart-summary">
                <h3>Tóm tắt đơn hàng</h3>
                
                <div class="coupon-input">
                    <input type="text" id="couponCode" placeholder="Nhập mã giảm giá">
                    <button class="btn btn-outline-primary" onclick="applyCoupon()">Áp dụng</button>
                </div>
                <div class="coupon-hint">
                    <small>Mã thử: <strong>WELCOME10</strong>, <strong>SAVE50K</strong>, <strong>FREESHIP</strong></small>
                </div>
                
                <div class="summary-row">
                    <span>Tạm tính:</span>
                    <strong>${formatCurrency(cartData.subtotal)}</strong>
                </div>
                <div class="summary-row">
                    <span>Phí vận chuyển:</span>
                    <strong>${shipping === 0 ? '<span class="text-success">Miễn phí</span>' : formatCurrency(shipping)}</strong>
                </div>
                ${appliedCoupon ? `
                <div class="summary-row text-success">
                    <span>Giảm giá (${appliedCoupon.code}):</span>
                    <strong>-${formatCurrency(discount)}</strong>
                </div>` : ''}
                <div class="summary-row total">
                    <span>Tổng cộng:</span>
                    <strong>${formatCurrency(total)}</strong>
                </div>
                
                ${shipping > 0 ? `
                <div class="shipping-info">
                    <i class="fas fa-info-circle"></i>
                    Mua thêm ${formatCurrency(500000 - cartData.subtotal)} để được miễn phí vận chuyển
                </div>` : ''}
                
                <button class="btn btn-primary btn-full" onclick="proceedCheckout()">
                    <i class="fas fa-credit-card"></i> Tiến hành đặt hàng
                </button>
                <a href="products.html" class="btn btn-outline-primary btn-full">
                    <i class="fas fa-arrow-left"></i> Tiếp tục mua sắm
                </a>
            </div>
        </div>
    `;
}

async function updateQty(id, qty) {
    if (qty < 1) {
        if (confirm('Xóa sản phẩm này khỏi giỏ?')) await removeItem(id);
        return;
    }
    try {
        await API.updateCartItem(id, qty);
        await loadCart();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function removeItem(id) {
    try {
        await API.removeCartItem(id);
        showToast('Đã xóa sản phẩm');
        await loadCart();
        await updateCartBadge();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function clearAllCart() {
    if (!confirm('Xóa tất cả sản phẩm khỏi giỏ hàng?')) return;
    try {
        await API.clearCart();
        showToast('Đã xóa giỏ hàng');
        await loadCart();
        await updateCartBadge();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function applyCoupon() {
    const code = document.getElementById('couponCode').value.trim().toUpperCase();
    if (!code) {
        showToast('Vui lòng nhập mã giảm giá', 'error');
        return;
    }
    try {
        const res = await API.validateCoupon(code, cartData.subtotal);
        appliedCoupon = { code, discount: res.data.discount };
        showToast(res.message);
        renderCart();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function proceedCheckout() {
    if (appliedCoupon) {
        sessionStorage.setItem('qm_coupon', JSON.stringify(appliedCoupon));
    } else {
        sessionStorage.removeItem('qm_coupon');
    }
    window.location.href = 'checkout.html';
}

window.updateQty = updateQty;
window.removeItem = removeItem;
window.clearAllCart = clearAllCart;
window.applyCoupon = applyCoupon;
window.proceedCheckout = proceedCheckout;

document.addEventListener('DOMContentLoaded', loadCart);
