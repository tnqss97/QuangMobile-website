let currentProduct = null;
let quantity = 1;

async function loadProduct() {
    const slug = new URLSearchParams(window.location.search).get('slug');
    const container = document.getElementById('productDetail');
    
    if (!slug) {
        container.innerHTML = '<div class="empty-state"><h2>Sản phẩm không tồn tại</h2><a href="products.html" class="btn btn-primary">Quay lại</a></div>';
        return;
    }
    
    try {
        const res = await API.getProduct(slug);
        currentProduct = res.data;
        document.title = res.data.name + ' - Quang Mobile';
        renderProduct(res.data, res.related, res.reviews);
    } catch (err) {
        container.innerHTML = `<div class="empty-state"><h2>${err.message}</h2><a href="products.html" class="btn btn-primary">Về trang sản phẩm</a></div>`;
    }
}

function renderProduct(p, related, reviews) {
    const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    const rating = p.avg_rating || 0;
    const stars = Array.from({ length: 5 }, (_, i) => 
        `<i class="${i < Math.round(rating) ? 'fas' : 'far'} fa-star"></i>`
    ).join('');
    
    const specs = p.specs && typeof p.specs === 'object' ? p.specs : {};
    
    document.getElementById('productDetail').innerHTML = `
        <nav class="breadcrumb breadcrumb-page">
            <a href="index.html">Trang chủ</a> / 
            <a href="products.html">Sản phẩm</a> / 
            <a href="products.html?category=${p.category_slug}">${p.category_name || ''}</a> /
            <span>${p.name}</span>
        </nav>
        
        <div class="product-detail-grid">
            <div class="product-detail-images">
                ${discount > 0 ? `<span class="detail-badge">-${discount}%</span>` : ''}
                <div class="main-image">
                    <img src="${p.image}" alt="${p.name}" onerror="this.src='images/phone1.svg'">
                </div>
            </div>
            
            <div class="product-detail-info">
                ${p.brand_name ? `<span class="product-brand">${p.brand_name}</span>` : ''}
                <h1>${p.name}</h1>
                
                <div class="product-detail-rating">
                    <div class="stars">${stars}</div>
                    <span>${rating.toFixed(1)}/5 (${p.review_count || 0} đánh giá)</span>
                    <span class="separator">|</span>
                    <span>Đã bán ${p.sold || 0}</span>
                    <span class="separator">|</span>
                    <span><i class="far fa-eye"></i> ${p.views || 0}</span>
                </div>
                
                <div class="product-detail-price">
                    <span class="current">${formatCurrency(p.price)}</span>
                    ${p.old_price ? `
                        <span class="old">${formatCurrency(p.old_price)}</span>
                        <span class="discount-tag">Tiết kiệm ${formatCurrency(p.old_price - p.price)}</span>
                    ` : ''}
                </div>
                
                <div class="product-stock">
                    ${p.stock > 0 
                        ? `<i class="fas fa-check-circle text-success"></i> Còn hàng (${p.stock})` 
                        : `<i class="fas fa-times-circle text-danger"></i> Hết hàng`}
                </div>
                
                ${p.short_description ? `
                <div class="product-short-desc">
                    <p>${p.short_description}</p>
                </div>` : ''}
                
                ${Object.keys(specs).length > 0 ? `
                <div class="product-quick-specs">
                    <h4>Thông số nổi bật</h4>
                    <ul>
                        ${Object.entries(specs).slice(0, 5).map(([k, v]) => `
                            <li><span>${k}:</span> <strong>${v}</strong></li>
                        `).join('')}
                    </ul>
                </div>` : ''}
                
                <div class="product-purchase">
                    <div class="quantity-selector">
                        <button onclick="changeQty(-1)"><i class="fas fa-minus"></i></button>
                        <input type="number" id="qty" value="1" min="1" max="${p.stock}">
                        <button onclick="changeQty(1)"><i class="fas fa-plus"></i></button>
                    </div>
                    <button class="btn btn-primary btn-add" onclick="addToCart()" ${p.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Thêm vào giỏ
                    </button>
                    <button class="btn btn-accent btn-add" onclick="buyNow()" ${p.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-bolt"></i> Mua ngay
                    </button>
                </div>
                
                <div class="product-actions-row">
                    <button class="action-link" onclick="addToWishlist()">
                        <i class="far fa-heart"></i> Yêu thích
                    </button>
                    <button class="action-link" onclick="shareProduct()">
                        <i class="fas fa-share-alt"></i> Chia sẻ
                    </button>
                </div>
                
                <div class="product-policies">
                    <div><i class="fas fa-truck"></i> Giao hàng miễn phí từ 500k</div>
                    <div><i class="fas fa-shield-alt"></i> Bảo hành chính hãng 12 tháng</div>
                    <div><i class="fas fa-rotate-left"></i> Đổi trả 30 ngày miễn phí</div>
                </div>
            </div>
        </div>
        
        <div class="product-tabs">
            <div class="tabs-header">
                <button class="tab-btn active" data-tab="description">Mô tả</button>
                <button class="tab-btn" data-tab="specs">Thông số</button>
                <button class="tab-btn" data-tab="reviews">Đánh giá (${reviews.length})</button>
            </div>
            <div class="tabs-content">
                <div class="tab-pane active" data-pane="description">
                    <p>${(p.description || 'Đang cập nhật...').replace(/\n/g, '<br>')}</p>
                </div>
                <div class="tab-pane" data-pane="specs">
                    ${Object.keys(specs).length > 0 ? `
                    <table class="specs-table">
                        ${Object.entries(specs).map(([k, v]) => `
                            <tr><th>${k}</th><td>${v}</td></tr>
                        `).join('')}
                    </table>` : '<p>Đang cập nhật...</p>'}
                </div>
                <div class="tab-pane" data-pane="reviews">
                    <div id="reviewsContent">
                        ${renderReviews(reviews)}
                    </div>
                </div>
            </div>
        </div>
        
        ${related.length > 0 ? `
        <div class="related-products">
            <h2 class="section-title">Sản phẩm liên quan</h2>
            <div class="product-grid">
                ${related.map(rp => productCardHTML(rp)).join('')}
            </div>
        </div>` : ''}
    `;
    
    setupTabs();
}

function productCardHTML(p) {
    return `
        <div class="product-card">
            <div class="product-image-wrapper">
                <div class="product-image">
                    <img src="${p.image}" onerror="this.src='images/phone1.svg'">
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${p.category_name || ''}</span>
                <h3><a href="product.html?slug=${p.slug}">${p.name}</a></h3>
                <div class="product-price">
                    <span class="current-price">${formatCurrency(p.price)}</span>
                    ${p.old_price ? `<span class="old-price">${formatCurrency(p.old_price)}</span>` : ''}
                </div>
                <button class="btn-add-cart" onclick="quickAddToCart(${p.id})">
                    <span><i class="fas fa-cart-plus"></i> Thêm vào giỏ</span>
                </button>
            </div>
        </div>
    `;
}

function renderReviews(reviews) {
    return `
        <div class="reviews-section">
            ${Auth.isLoggedIn() ? `
            <form id="reviewForm" class="review-form">
                <h4>Viết đánh giá của bạn</h4>
                <div class="rating-input">
                    ${[1,2,3,4,5].map(i => `
                        <input type="radio" name="rating" value="${i}" id="rate-${i}" ${i === 5 ? 'checked' : ''}>
                        <label for="rate-${i}"><i class="fas fa-star"></i></label>
                    `).reverse().join('')}
                </div>
                <textarea name="comment" rows="3" placeholder="Chia sẻ trải nghiệm của bạn..." required></textarea>
                <button type="submit" class="btn btn-primary">Gửi đánh giá</button>
            </form>` : `
            <div class="login-prompt">
                <p>Vui lòng <a href="login.html">đăng nhập</a> để đánh giá sản phẩm</p>
            </div>`}
            
            ${reviews.length === 0 ? '<p class="empty-text">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>' : `
            <div class="reviews-list">
                ${reviews.map(r => `
                    <div class="review-item">
                        <div class="review-author">
                            <div class="review-avatar">${r.user_name.charAt(0).toUpperCase()}</div>
                            <div>
                                <strong>${r.user_name}</strong>
                                <div class="review-rating">
                                    ${Array.from({length: 5}, (_, i) => 
                                        `<i class="${i < r.rating ? 'fas' : 'far'} fa-star"></i>`
                                    ).join('')}
                                </div>
                            </div>
                            <span class="review-date">${formatDate(r.created_at)}</span>
                        </div>
                        ${r.comment ? `<p class="review-comment">${r.comment}</p>` : ''}
                    </div>
                `).join('')}
            </div>`}
        </div>
    `;
}

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.querySelector(`.tab-pane[data-pane="${btn.dataset.tab}"]`).classList.add('active');
        });
    });
    
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.target));
            try {
                await API.addReview({
                    product_id: currentProduct.id,
                    rating: parseInt(data.rating),
                    comment: data.comment
                });
                showToast('Cảm ơn đánh giá của bạn!');
                loadProduct();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }
}

function changeQty(delta) {
    const input = document.getElementById('qty');
    const newVal = parseInt(input.value) + delta;
    if (newVal >= 1 && newVal <= currentProduct.stock) {
        input.value = newVal;
        quantity = newVal;
    }
}

async function addToCart() {
    if (!Auth.isLoggedIn()) {
        if (confirm('Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?')) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }
        return;
    }
    const qty = parseInt(document.getElementById('qty').value) || 1;
    try {
        await API.addToCart(currentProduct.id, qty);
        showToast(`Đã thêm ${qty} sản phẩm vào giỏ hàng!`);
        await updateCartBadge();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function quickAddToCart(productId) {
    if (!Auth.isLoggedIn()) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    try {
        await API.addToCart(productId, 1);
        showToast('Đã thêm vào giỏ hàng!');
        await updateCartBadge();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function buyNow() {
    if (!Auth.isLoggedIn()) {
        if (confirm('Bạn cần đăng nhập để mua hàng. Đăng nhập ngay?')) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }
        return;
    }
    await addToCart();
    setTimeout(() => window.location.href = 'checkout.html', 500);
}

async function addToWishlist() {
    if (!Auth.isLoggedIn()) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    try {
        await API.addToWishlist(currentProduct.id);
        showToast('Đã thêm vào yêu thích!');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function shareProduct() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: currentProduct.name, url });
    } else {
        navigator.clipboard.writeText(url);
        showToast('Đã sao chép link!');
    }
}

window.changeQty = changeQty;
window.addToCart = addToCart;
window.quickAddToCart = quickAddToCart;
window.buyNow = buyNow;
window.addToWishlist = addToWishlist;
window.shareProduct = shareProduct;

document.addEventListener('DOMContentLoaded', loadProduct);
