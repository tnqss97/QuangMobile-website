let currentFilters = {
    page: 1,
    limit: 12,
    sort: 'newest',
    category: '',
    brand: '',
    search: ''
};

async function loadProductsPage() {
    await Promise.all([
        loadCategories(),
        loadBrands(),
        loadProducts()
    ]);
    
    // Read URL params
    const params = new URLSearchParams(window.location.search);
    if (params.get('category')) {
        currentFilters.category = params.get('category');
        loadProducts();
    }
    if (params.get('search')) {
        currentFilters.search = params.get('search');
        loadProducts();
    }
}

async function loadCategories() {
    try {
        const res = await API.getCategories();
        const list = document.getElementById('categoriesFilter');
        if (!list) return;
        list.innerHTML = `
            <li><a href="#" class="filter-active" data-category="">Tất cả sản phẩm</a></li>
            ${res.data.map(c => `
                <li><a href="#" data-category="${c.slug}">${c.name} (${c.product_count})</a></li>
            `).join('')}
        `;
        list.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                list.querySelectorAll('a').forEach(x => x.classList.remove('filter-active'));
                a.classList.add('filter-active');
                currentFilters.category = a.dataset.category;
                currentFilters.page = 1;
                loadProducts();
            });
        });
    } catch (err) {
        console.error('Load categories error', err);
    }
}

async function loadBrands() {
    try {
        const res = await API.getBrands();
        const list = document.getElementById('brandsFilter');
        if (!list) return;
        list.innerHTML = res.data.map(b => `
            <li><label><input type="checkbox" value="${b.slug}"> ${b.name} (${b.product_count})</label></li>
        `).join('');
        
        list.querySelectorAll('input').forEach(input => {
            input.addEventListener('change', () => {
                const checked = Array.from(list.querySelectorAll('input:checked')).map(i => i.value);
                currentFilters.brand = checked[0] || '';  // Single brand for simplicity
                currentFilters.page = 1;
                loadProducts();
            });
        });
    } catch (err) {
        console.error('Load brands error', err);
    }
}

async function loadProducts() {
    const grid = document.getElementById('productsGrid');
    const countEl = document.getElementById('resultsCount');
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading-state" style="grid-column:1/-1"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const params = { ...currentFilters };
        Object.keys(params).forEach(k => !params[k] && delete params[k]);
        const res = await API.getProducts(params);
        
        if (countEl) {
            countEl.innerHTML = `Hiển thị <strong>${res.data.length}</strong> trong tổng <strong>${res.pagination.total}</strong> sản phẩm`;
        }
        
        if (res.data.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:#999"><i class="fas fa-search" style="font-size:3rem;margin-bottom:15px"></i><p>Không tìm thấy sản phẩm nào</p></div>';
            return;
        }
        
        grid.innerHTML = res.data.map(productCardHTML).join('');
        renderPagination(res.pagination);
    } catch (err) {
        grid.innerHTML = `<div class="error-state" style="grid-column:1/-1">${err.message}</div>`;
    }
}

function productCardHTML(p) {
    const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
    const rating = p.avg_rating || 0;
    const stars = Array.from({ length: 5 }, (_, i) => 
        `<i class="${i < Math.round(rating) ? 'fas' : 'far'} fa-star"></i>`
    ).join('');
    
    return `
        <div class="product-card animate-on-scroll">
            ${p.badge ? `<div class="product-badge ${discount > 0 ? 'sale' : ''}">${p.badge}</div>` : 
              discount > 0 ? `<div class="product-badge sale">-${discount}%</div>` : ''}
            <div class="product-image-wrapper">
                <div class="product-image">
                    <a href="product.html?slug=${p.slug}">
                        <img src="${p.image}" alt="${p.name}" onerror="this.src='images/phone1.svg'">
                    </a>
                </div>
                <div class="product-actions">
                    <button class="product-action-btn" onclick="addToWishlistQuick(${p.id})" title="Yêu thích">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="product-action-btn" onclick="window.location.href='product.html?slug=${p.slug}'" title="Xem chi tiết">
                        <i class="far fa-eye"></i>
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
                    <span>(${p.review_count || 0})</span>
                </div>
                <button class="btn-add-cart" onclick="quickAddToCart(${p.id})">
                    <span><i class="fas fa-cart-plus"></i> Thêm vào giỏ</span>
                </button>
            </div>
        </div>
    `;
}

function renderPagination(p) {
    const container = document.getElementById('pagination');
    if (!container) return;
    if (p.total_pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    if (p.page > 1) {
        html += `<a href="#" class="page-btn" data-page="${p.page - 1}"><i class="fas fa-chevron-left"></i></a>`;
    }
    for (let i = 1; i <= p.total_pages; i++) {
        if (i === p.page || i === 1 || i === p.total_pages || Math.abs(i - p.page) <= 1) {
            html += `<a href="#" class="page-btn ${i === p.page ? 'active' : ''}" data-page="${i}">${i}</a>`;
        } else if (i === p.page - 2 || i === p.page + 2) {
            html += `<span class="page-btn" style="cursor:default;border:none">...</span>`;
        }
    }
    if (p.page < p.total_pages) {
        html += `<a href="#" class="page-btn" data-page="${p.page + 1}"><i class="fas fa-chevron-right"></i></a>`;
    }
    
    container.innerHTML = html;
    container.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            currentFilters.page = parseInt(a.dataset.page);
            loadProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

async function quickAddToCart(productId) {
    if (!Auth.isLoggedIn()) {
        if (confirm('Bạn cần đăng nhập để thêm vào giỏ. Đăng nhập ngay?')) {
            window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        }
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

async function addToWishlistQuick(productId) {
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

window.quickAddToCart = quickAddToCart;
window.addToWishlistQuick = addToWishlistQuick;

// Sort change
document.addEventListener('DOMContentLoaded', () => {
    const sortSelect = document.querySelector('.sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            currentFilters.sort = sortSelect.value || 'newest';
            currentFilters.page = 1;
            loadProducts();
        });
    }
    
    // Price filter
    document.querySelectorAll('input[name="price"]').forEach(input => {
        input.addEventListener('change', () => {
            const value = input.value;
            if (value) {
                const [min, max] = value.split('-');
                currentFilters.min_price = min;
                currentFilters.max_price = max;
            } else {
                delete currentFilters.min_price;
                delete currentFilters.max_price;
            }
            currentFilters.page = 1;
            loadProducts();
        });
    });
    
    // Search bar
    const searchInputs = document.querySelectorAll('.search-bar input');
    searchInputs.forEach(input => {
        let timer;
        input.addEventListener('input', (e) => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                currentFilters.search = e.target.value.trim();
                currentFilters.page = 1;
                loadProducts();
            }, 400);
        });
    });
    
    loadProductsPage();
});
