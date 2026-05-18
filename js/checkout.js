let cartData = { items: [], subtotal: 0 };
let appliedCoupon = null;

async function loadCheckout() {
    const container = document.getElementById('checkoutContent');
    
    if (!Auth.isLoggedIn()) {
        window.location.href = 'login.html?redirect=checkout.html';
        return;
    }
    
    try {
        const res = await API.getCart();
        cartData.items = res.data;
        cartData.subtotal = res.subtotal;
        
        if (cartData.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-shopping-bag"></i>
                    <h2>Giỏ hàng trống</h2>
                    <a href="products.html" class="btn btn-primary">Mua sắm ngay</a>
                </div>`;
            return;
        }
        
        // Try to load saved coupon
        const savedCoupon = sessionStorage.getItem('qm_coupon');
        if (savedCoupon) {
            try { appliedCoupon = JSON.parse(savedCoupon); } catch (e) {}
        }
        
        renderCheckout();
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

function renderCheckout() {
    const container = document.getElementById('checkoutContent');
    const user = Auth.getUser();
    const shipping = cartData.subtotal >= 500000 ? 0 : 30000;
    const discount = appliedCoupon?.discount || 0;
    const total = cartData.subtotal + shipping - discount;
    
    container.innerHTML = `
        <div class="checkout-layout">
            <div class="checkout-form-wrap">
                <form id="checkoutForm">
                    <div class="checkout-section">
                        <h3><i class="fas fa-user"></i> Thông tin giao hàng</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Họ và tên <span class="required">*</span></label>
                                <input type="text" name="customer_name" required value="${user?.full_name || ''}">
                            </div>
                            <div class="form-group">
                                <label>Số điện thoại <span class="required">*</span></label>
                                <input type="tel" name="customer_phone" required value="${user?.phone || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" name="customer_email" value="${user?.email || ''}">
                        </div>
                        <div class="form-group">
                            <label>Địa chỉ giao hàng <span class="required">*</span></label>
                            <textarea name="shipping_address" rows="3" required placeholder="Số nhà, đường, phường, quận, thành phố">${user?.address || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Ghi chú đơn hàng</label>
                            <textarea name="note" rows="2" placeholder="Ghi chú thêm cho người giao hàng..."></textarea>
                        </div>
                    </div>
                    
                    <div class="checkout-section">
                        <h3><i class="fas fa-credit-card"></i> Phương thức thanh toán</h3>
                        <label class="payment-option">
                            <input type="radio" name="payment_method" value="cod" checked>
                            <div class="payment-content">
                                <i class="fas fa-money-bill-wave"></i>
                                <div>
                                    <strong>Thanh toán khi nhận hàng (COD)</strong>
                                    <small>Thanh toán bằng tiền mặt khi nhận được hàng</small>
                                </div>
                            </div>
                        </label>
                        <label class="payment-option">
                            <input type="radio" name="payment_method" value="bank">
                            <div class="payment-content">
                                <i class="fas fa-university"></i>
                                <div>
                                    <strong>Chuyển khoản ngân hàng</strong>
                                    <small>Chuyển khoản qua tài khoản ngân hàng</small>
                                </div>
                            </div>
                        </label>
                        <label class="payment-option">
                            <input type="radio" name="payment_method" value="momo">
                            <div class="payment-content">
                                <i class="fas fa-mobile-alt"></i>
                                <div>
                                    <strong>Ví MoMo</strong>
                                    <small>Thanh toán qua ví điện tử MoMo</small>
                                </div>
                            </div>
                        </label>
                    </div>
                </form>
            </div>
            
            <div class="checkout-summary">
                <h3>Đơn hàng của bạn</h3>
                <div class="checkout-items">
                    ${cartData.items.map(i => `
                        <div class="checkout-item">
                            <div class="checkout-item-img">
                                <img src="${i.image}" onerror="this.src='images/phone1.svg'">
                                <span class="checkout-item-qty">${i.quantity}</span>
                            </div>
                            <div class="checkout-item-info">
                                <h5>${i.name}</h5>
                                <span>${formatCurrency(i.price)} × ${i.quantity}</span>
                            </div>
                            <strong>${formatCurrency(i.price * i.quantity)}</strong>
                        </div>
                    `).join('')}
                </div>
                <div class="summary-row">
                    <span>Tạm tính:</span>
                    <strong>${formatCurrency(cartData.subtotal)}</strong>
                </div>
                <div class="summary-row">
                    <span>Phí vận chuyển:</span>
                    <strong>${shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}</strong>
                </div>
                ${appliedCoupon ? `
                <div class="summary-row text-success">
                    <span>Giảm giá (${appliedCoupon.code}):</span>
                    <strong>-${formatCurrency(discount)}</strong>
                </div>` : ''}
                <div class="summary-row total">
                    <span>Tổng:</span>
                    <strong>${formatCurrency(total)}</strong>
                </div>
                <button type="button" class="btn btn-primary btn-full" onclick="placeOrder()">
                    <i class="fas fa-check-circle"></i> Đặt hàng ngay
                </button>
                <p class="checkout-note">
                    Bằng cách đặt hàng, bạn đồng ý với <a href="#">Điều khoản dịch vụ</a> của chúng tôi
                </p>
            </div>
        </div>
    `;
}

async function placeOrder() {
    const form = document.getElementById('checkoutForm');
    const formData = Object.fromEntries(new FormData(form));
    
    if (!formData.customer_name || !formData.customer_phone || !formData.shipping_address) {
        showToast('Vui lòng nhập đủ thông tin', 'error');
        return;
    }
    
    const btn = document.querySelector('.checkout-summary button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    btn.disabled = true;
    
    try {
        const data = {
            ...formData,
            coupon_code: appliedCoupon?.code
        };
        const res = await API.createOrder(data);
        sessionStorage.removeItem('qm_coupon');
        showToast('Đặt hàng thành công!');
        setTimeout(() => {
            window.location.href = `orders.html?code=${res.data.order_code}`;
        }, 1000);
    } catch (err) {
        showToast(err.message, 'error');
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
}

window.placeOrder = placeOrder;
document.addEventListener('DOMContentLoaded', loadCheckout);
