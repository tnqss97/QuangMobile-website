// ===== LOAD DYNAMIC DATA FOR HOMEPAGE =====
async function loadFeaturedProducts() {
    const grid = document.querySelector('.featured-products .product-grid');
    if (!grid) return;
    
    try {
        const res = await API.getFeaturedProducts(4);
        if (!res.data || res.data.length === 0) return;
        
        grid.innerHTML = res.data.map(p => {
            const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
            const rating = p.avg_rating || 0;
            const stars = Array.from({ length: 5 }, (_, i) => 
                `<i class="${i < Math.round(rating) ? 'fas' : 'far'} fa-star"></i>`
            ).join('');
            
            return `
                <div class="product-card" data-product-id="${p.id}">
                    ${p.badge ? `<div class="product-badge ${discount > 0 ? 'sale' : ''}">${p.badge}</div>` : 
                      discount > 0 ? `<div class="product-badge sale">-${discount}%</div>` : ''}
                    <div class="product-image-wrapper">
                        <div class="product-image">
                            <a href="product.html?slug=${p.slug}">
                                <img src="${p.image}" alt="${p.name}" onerror="this.src='images/phone1.svg'">
                            </a>
                        </div>
                        <div class="product-actions">
                            <button class="product-action-btn" title="Yêu thích" onclick="addToFav(${p.id})">
                                <i class="far fa-heart"></i>
                            </button>
                            <button class="product-action-btn" title="Xem nhanh" onclick="window.location.href='product.html?slug=${p.slug}'">
                                <i class="far fa-eye"></i>
                            </button>
                            <button class="product-action-btn" title="So sánh">
                                <i class="fas fa-exchange-alt"></i>
                            </button>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-category">${p.category_name || ''}</span>
                        <h3><a href="product.html?slug=${p.slug}">${p.name}</a></h3>
                        <div class="product-price">
                            <span class="current-price">${formatCurrency(p.price)}</span>
                            ${p.old_price ? `<span class="old-price">${formatCurrency(p.old_price)}</span>` : ''}
                        </div>
                        <div class="product-rating">
                            <span class="stars">${stars}</span>
                            <span>(${p.review_count || 0} đánh giá)</span>
                        </div>
                        <button class="btn-add-cart" data-product-id="${p.id}">
                            <span><i class="fas fa-cart-plus"></i> Thêm vào giỏ</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Re-attach click handlers
        attachAddToCartHandlers();
    } catch (err) {
        console.error('Load products error:', err);
    }
}

async function loadLatestNews() {
    const grid = document.querySelector('.latest-news .news-grid');
    if (!grid) return;
    
    try {
        const res = await API.getNews({ limit: 3 });
        if (!res.data || res.data.length === 0) return;
        
        grid.innerHTML = res.data.map(n => `
            <article class="news-card">
                <div class="news-image">
                    <a href="news.html#${n.slug}">
                        <img src="${n.image}" alt="${n.title}" onerror="this.src='images/news1.svg'">
                    </a>
                </div>
                <div class="news-content">
                    <div class="news-meta-top">
                        <span class="news-tag">${n.category || 'Tin tức'}</span>
                        <span class="news-date"><i class="far fa-calendar"></i> ${formatDate(n.created_at)}</span>
                    </div>
                    <h3><a href="news.html#${n.slug}">${n.title}</a></h3>
                    <p>${n.excerpt || ''}</p>
                    <a href="news.html#${n.slug}" class="read-more">Đọc thêm <i class="fas fa-arrow-right"></i></a>
                </div>
            </article>
        `).join('');
    } catch (err) {
        console.error('Load news error:', err);
    }
}

async function loadCategoryCounts() {
    try {
        const res = await API.getCategories();
        const grid = document.querySelector('.category-grid');
        if (!grid) return;
        
        // Render real categories dynamically (replace static HTML)
        grid.innerHTML = res.data.map(c => `
            <a href="products.html?category=${c.slug}" class="category-item">
                <div class="category-icon"><i class="fas ${c.icon || 'fa-tag'}"></i></div>
                <span>${c.name}</span>
                <small>${c.product_count}+ sản phẩm</small>
            </a>
        `).join('');
    } catch (err) {
        console.error('Load categories error:', err);
    }
}

function attachAddToCartHandlers() {
    document.querySelectorAll('.btn-add-cart').forEach(btn => {
        if (btn._handlerAttached) return;
        btn._handlerAttached = true;
        
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const productId = btn.dataset.productId;
            const card = btn.closest('.product-card');
            const productName = card?.querySelector('h3')?.textContent || 'Sản phẩm';
            
            if (!Auth.isLoggedIn()) {
                if (confirm('Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?')) {
                    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
                }
                return;
            }
            
            if (!productId) return;
            
            try {
                await API.addToCart(parseInt(productId), 1);
                showToast(`Đã thêm "${productName}" vào giỏ hàng!`);
                await updateCartBadge();
                
                const span = btn.querySelector('span');
                if (span) {
                    const originalHTML = span.innerHTML;
                    span.innerHTML = '<i class="fas fa-check"></i> Đã thêm';
                    btn.style.background = '#10b981';
                    btn.style.color = '#fff';
                    setTimeout(() => {
                        span.innerHTML = originalHTML;
                        btn.style.background = '';
                        btn.style.color = '';
                    }, 1500);
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    });
}

async function addToFav(productId) {
    if (!Auth.isLoggedIn()) {
        showToast('Vui lòng đăng nhập', 'error');
        return;
    }
    try {
        await API.addToWishlist(productId);
        showToast('Đã thêm vào yêu thích!');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

window.addToFav = addToFav;

document.addEventListener('DOMContentLoaded', () => {
    if (window.API) {
        loadFeaturedProducts();
        loadLatestNews();
        loadCategoryCounts();
    }
});
