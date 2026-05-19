if (!Auth.isAdmin()) {
    alert('Bạn không có quyền truy cập trang quản trị');
    window.location.href = 'login.html';
}

const statusMap = {
    pending: { label: 'Chờ xử lý', class: 'pending' },
    confirmed: { label: 'Đã xác nhận', class: 'confirmed' },
    shipping: { label: 'Đang giao', class: 'shipping' },
    delivered: { label: 'Đã giao', class: 'delivered' },
    cancelled: { label: 'Đã hủy', class: 'cancelled' }
};

const tabs = {
    dashboard: { title: 'Tổng quan', render: renderDashboard },
    orders: { title: 'Quản lý đơn hàng', render: renderOrders },
    products: { title: 'Quản lý sản phẩm', render: renderProducts },
    categories: { title: 'Quản lý danh mục', render: renderCategories },
    brands: { title: 'Quản lý thương hiệu', render: renderBrands },
    news: { title: 'Quản lý tin tức', render: renderNews },
    contacts: { title: 'Tin nhắn liên hệ', render: renderContacts }
};

// ===== DASHBOARD =====
async function renderDashboard() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const res = await API.getAdminStats();
        const s = res.data;
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card stat-purple">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                    <div class="stat-info"><span>Người dùng</span><h3>${s.users}</h3></div>
                </div>
                <div class="stat-card stat-blue">
                    <div class="stat-icon"><i class="fas fa-mobile-alt"></i></div>
                    <div class="stat-info"><span>Sản phẩm</span><h3>${s.products}</h3></div>
                </div>
                <div class="stat-card stat-green">
                    <div class="stat-icon"><i class="fas fa-shopping-bag"></i></div>
                    <div class="stat-info"><span>Đơn hàng</span><h3>${s.orders}</h3></div>
                </div>
                <div class="stat-card stat-orange">
                    <div class="stat-icon"><i class="fas fa-coins"></i></div>
                    <div class="stat-info"><span>Doanh thu</span><h3>${formatCurrency(s.revenue)}</h3></div>
                </div>
                <div class="stat-card stat-red">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-info"><span>Chờ xử lý</span><h3>${s.pending_orders}</h3></div>
                </div>
                <div class="stat-card stat-pink">
                    <div class="stat-icon"><i class="fas fa-envelope"></i></div>
                    <div class="stat-info"><span>Tin nhắn mới</span><h3>${s.new_contacts}</h3></div>
                </div>
            </div>
            
            <div class="dashboard-grid">
                <div class="dashboard-card">
                    <h3>Đơn hàng gần đây</h3>
                    <table class="admin-table">
                        <thead>
                            <tr><th>Mã ĐH</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th></tr>
                        </thead>
                        <tbody>
                            ${s.recent_orders.map(o => {
                                const st = statusMap[o.status] || statusMap.pending;
                                return `<tr>
                                    <td><strong>${o.order_code}</strong></td>
                                    <td>${o.customer_name}</td>
                                    <td>${formatCurrency(o.total)}</td>
                                    <td><span class="status-badge status-${st.class}">${st.label}</span></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="dashboard-card">
                    <h3>Sản phẩm bán chạy</h3>
                    <div class="top-products">
                        ${s.top_products.map((p, i) => `
                            <div class="top-product-item">
                                <span class="rank">#${i + 1}</span>
                                <img src="${p.image}" onerror="this.src='images/phone1.svg'">
                                <div>
                                    <h5>${p.name}</h5>
                                    <span>${formatCurrency(p.price)} • Đã bán ${p.sold}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

// ===== ORDERS =====
async function renderOrders() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const res = await API.getAdminOrders({ limit: 100 });
        const orders = res.data;
        
        container.innerHTML = `
            <div class="admin-toolbar">
                <div class="filter-tabs">
                    <button class="filter-tab active" data-status="">Tất cả</button>
                    <button class="filter-tab" data-status="pending">Chờ xử lý</button>
                    <button class="filter-tab" data-status="confirmed">Đã xác nhận</button>
                    <button class="filter-tab" data-status="shipping">Đang giao</button>
                    <button class="filter-tab" data-status="delivered">Đã giao</button>
                    <button class="filter-tab" data-status="cancelled">Đã hủy</button>
                </div>
                <input type="text" id="orderSearch" placeholder="Tìm mã đơn, tên, SĐT..." class="admin-search">
            </div>
            <div class="dashboard-card">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Mã ĐH</th><th>Khách hàng</th><th>SĐT</th><th>Tổng tiền</th>
                            <th>Ngày</th><th>Trạng thái</th><th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody id="ordersTableBody">${renderOrderRows(orders)}</tbody>
                </table>
            </div>
        `;
        
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const r = await API.getAdminOrders({ status: tab.dataset.status, limit: 100 });
                document.getElementById('ordersTableBody').innerHTML = renderOrderRows(r.data);
            });
        });
        
        let searchTimer;
        document.getElementById('orderSearch').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(async () => {
                const r = await API.getAdminOrders({ search: e.target.value, limit: 100 });
                document.getElementById('ordersTableBody').innerHTML = renderOrderRows(r.data);
            }, 300);
        });
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

function renderOrderRows(orders) {
    if (orders.length === 0) {
        return '<tr><td colspan="7" style="text-align:center;padding:30px;color:#999">Không có đơn hàng</td></tr>';
    }
    return orders.map(o => {
        const st = statusMap[o.status] || statusMap.pending;
        return `
            <tr>
                <td><strong>${o.order_code}</strong></td>
                <td>${o.customer_name}</td>
                <td>${o.customer_phone}</td>
                <td>${formatCurrency(o.total)}</td>
                <td>${formatDateTime(o.created_at)}</td>
                <td>
                    <select onchange="updateOrderStatus(${o.id}, this.value)" class="status-select status-${st.class}">
                        <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Chờ xử lý</option>
                        <option value="confirmed" ${o.status === 'confirmed' ? 'selected' : ''}>Đã xác nhận</option>
                        <option value="shipping" ${o.status === 'shipping' ? 'selected' : ''}>Đang giao</option>
                        <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Đã giao</option>
                        <option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Đã hủy</option>
                    </select>
                </td>
                <td>
                    <button class="btn-icon" onclick="window.open('orders.html?code=${o.order_code}', '_blank')" title="Xem">
                        <i class="far fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateOrderStatus(id, status) {
    try {
        await API.updateOrderStatus(id, status);
        showToast('Đã cập nhật trạng thái');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== PRODUCTS CRUD =====
async function renderProducts() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const [productsRes, categoriesRes] = await Promise.all([
            API.getProducts({ limit: 100 }),
            API.getCategories()
        ]);
        const products = productsRes.data;
        const categories = categoriesRes.data;
        
        container.innerHTML = `
            <div class="admin-toolbar">
                <div class="filter-tabs">
                    <button class="filter-tab active" data-cat="">Tất cả (${products.length})</button>
                    ${categories.map(c => `
                        <button class="filter-tab" data-cat="${c.slug}">${c.name} (${c.product_count})</button>
                    `).join('')}
                </div>
                <input type="text" id="productSearch" placeholder="Tìm sản phẩm..." class="admin-search">
                <button class="btn btn-primary" onclick="openProductModal()">
                    <i class="fas fa-plus"></i> Thêm sản phẩm
                </button>
            </div>
            <div class="dashboard-card">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Ảnh</th>
                            <th>Tên sản phẩm</th>
                            <th>Danh mục</th>
                            <th>Giá</th>
                            <th>Tồn kho</th>
                            <th>Đã bán</th>
                            <th>Trạng thái</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody id="productsTableBody">${renderProductRows(products)}</tbody>
                </table>
            </div>
        `;
        
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', async () => {
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const r = await API.getProducts({ category: tab.dataset.cat, limit: 100 });
                document.getElementById('productsTableBody').innerHTML = renderProductRows(r.data);
            });
        });
        
        let searchTimer;
        document.getElementById('productSearch').addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(async () => {
                const r = await API.getProducts({ search: e.target.value, limit: 100 });
                document.getElementById('productsTableBody').innerHTML = renderProductRows(r.data);
            }, 300);
        });
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

function renderProductRows(products) {
    if (products.length === 0) {
        return '<tr><td colspan="8" style="text-align:center;padding:30px;color:#999">Không có sản phẩm</td></tr>';
    }
    return products.map(p => `
        <tr>
            <td><img src="${p.image}" class="admin-thumb" onerror="this.src='images/phone1.svg'"></td>
            <td>
                <strong>${p.name}</strong>
                ${p.featured ? '<span class="featured-badge"><i class="fas fa-star"></i></span>' : ''}
            </td>
            <td>${p.category_name || '-'}</td>
            <td>
                <strong style="color:var(--primary)">${formatCurrency(p.price)}</strong>
                ${p.old_price ? `<br><small style="text-decoration:line-through;color:#999">${formatCurrency(p.old_price)}</small>` : ''}
            </td>
            <td>
                <span class="${p.stock < 10 ? 'stock-low' : ''}">${p.stock}</span>
            </td>
            <td>${p.sold}</td>
            <td>
                <span class="status-badge status-${p.status === 'active' ? 'delivered' : 'cancelled'}">
                    ${p.status === 'active' ? 'Hiển thị' : 'Ẩn'}
                </span>
            </td>
            <td>
                <button class="btn-icon" onclick="editProduct(${p.id})" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-danger" onclick="deleteProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function openProductModal(productId = null) {
    let product = null;
    if (productId) {
        try {
            const res = await API.getProduct(productId);
            product = res.data;
        } catch (err) {
            showToast(err.message, 'error');
            return;
        }
    }
    
    let categories = [];
    let brands = [];
    try {
        const [catsRes, brandsRes] = await Promise.all([API.getCategories(), API.getBrands()]);
        categories = catsRes.data || [];
        brands = brandsRes.data || [];
    } catch (err) {
        showToast('Lỗi tải danh mục: ' + err.message, 'error');
        return;
    }
    
    if (categories.length === 0) {
        showToast('Vui lòng tạo danh mục trước khi thêm sản phẩm', 'error');
        return;
    }
    
    const specsObj = product?.specs && typeof product.specs === 'object' ? product.specs : {};
    const specsText = Object.entries(specsObj).map(([k, v]) => `${k}: ${v}`).join('\n');
    
    // Remove any existing modal first
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3><i class="fas fa-${product ? 'edit' : 'plus'}"></i> ${product ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                    <button type="button" class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <form id="productForm">
                        <div class="form-section">
                            <h4>Thông tin cơ bản</h4>
                            <div class="form-group">
                                <label>Tên sản phẩm <span class="required">*</span></label>
                                <input type="text" name="name" required value="${product?.name || ''}">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Danh mục <span class="required">*</span></label>
                                    <select name="category_id" required>
                                        <option value="">-- Chọn danh mục --</option>
                                        ${categories.map(c => `
                                            <option value="${c.id}" ${product?.category_id == c.id ? 'selected' : ''}>${c.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Thương hiệu</label>
                                    <select name="brand_id">
                                        <option value="">-- Chọn --</option>
                                        ${brands.map(b => `
                                            <option value="${b.id}" ${product?.brand_id == b.id ? 'selected' : ''}>${b.name}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Mô tả ngắn</label>
                                <textarea name="short_description" rows="2">${product?.short_description || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label>Mô tả chi tiết</label>
                                <textarea name="description" rows="4">${product?.description || ''}</textarea>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>Giá & Tồn kho</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Giá bán (VND) <span class="required">*</span></label>
                                    <input type="number" name="price" required min="0" value="${product?.price || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Giá gốc (VND)</label>
                                    <input type="number" name="old_price" min="0" value="${product?.old_price || ''}">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Số lượng tồn kho <span class="required">*</span></label>
                                    <input type="number" name="stock" required min="0" value="${product?.stock ?? 0}">
                                </div>
                                <div class="form-group">
                                    <label>Trạng thái</label>
                                    <select name="status">
                                        <option value="active" ${product?.status === 'active' ? 'selected' : ''}>Hiển thị</option>
                                        <option value="inactive" ${product?.status === 'inactive' ? 'selected' : ''}>Ẩn</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>Hình ảnh & Hiển thị</h4>
                            <div class="form-group">
                                <label>Hình ảnh sản phẩm</label>
                                <div class="image-upload-area">
                                    <div class="image-preview" id="imagePreview">
                                        ${product?.image ? `<img src="${product.image}" alt="Preview">` : '<i class="fas fa-cloud-upload-alt"></i><span>Chọn ảnh từ máy tính</span>'}
                                    </div>
                                    <div class="image-upload-controls">
                                        <input type="file" id="imageFile" accept="image/*" style="display:none">
                                        <button type="button" class="btn btn-outline-primary btn-sm" id="btnChooseImage">
                                            <i class="fas fa-upload"></i> Chọn ảnh
                                        </button>
                                        <span class="upload-status" id="uploadStatus"></span>
                                    </div>
                                    <input type="hidden" name="image" id="imageUrl" value="${product?.image || 'images/phone1.svg'}">
                                    <small>Chọn ảnh từ máy tính (JPG, PNG, WebP) hoặc nhập URL trực tiếp bên dưới</small>
                                    <input type="text" id="imageUrlManual" placeholder="Hoặc nhập URL ảnh..." value="${product?.image || ''}" style="margin-top:8px">
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Nhãn hiển thị (badge)</label>
                                    <input type="text" name="badge" placeholder="Hot, Mới, -10%..." value="${product?.badge || ''}">
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-inline">
                                        <input type="checkbox" name="featured" ${product?.featured ? 'checked' : ''}>
                                        Sản phẩm nổi bật (hiển thị trang chủ)
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-section">
                            <h4>Thông số kỹ thuật</h4>
                            <p style="font-size:0.85rem;color:var(--text-light);margin-bottom:8px">Mỗi dòng 1 thông số, định dạng "Tên: Giá trị"</p>
                            <div class="form-group">
                                <textarea name="specs_text" rows="6" placeholder="Màn hình: 6.7 inch&#10;Chip: A17 Pro&#10;RAM: 8GB&#10;Bộ nhớ: 256GB">${specsText}</textarea>
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline-primary modal-cancel">Hủy</button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${product ? 'Cập nhật' : 'Thêm sản phẩm'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    
    // Only close when BOTH mousedown and mouseup happen on overlay (not when dragging text out)
    let mouseDownOnOverlay = false;
    modal.addEventListener('mousedown', (e) => {
        mouseDownOnOverlay = (e.target === modal);
    });
    modal.addEventListener('mouseup', (e) => {
        if (mouseDownOnOverlay && e.target === modal) {
            modal.remove();
        }
        mouseDownOnOverlay = false;
    });
    
    // Image upload handler
    const imageFileInput = modal.querySelector('#imageFile');
    const imagePreview = modal.querySelector('#imagePreview');
    const imageUrlInput = modal.querySelector('#imageUrl');
    const imageUrlManual = modal.querySelector('#imageUrlManual');
    const uploadStatus = modal.querySelector('#uploadStatus');
    const btnChooseImage = modal.querySelector('#btnChooseImage');
    
    // Click nút "Chọn ảnh" hoặc click vào vùng preview → mở file picker
    btnChooseImage.addEventListener('click', () => imageFileInput.click());
    imagePreview.addEventListener('click', () => imageFileInput.click());
    
    imageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate
        if (!file.type.startsWith('image/')) {
            showToast('Vui lòng chọn file ảnh', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ảnh quá lớn (tối đa 5MB)', 'error');
            return;
        }
        
        // Show preview immediately
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const base64 = ev.target.result;
            imagePreview.innerHTML = `<img src="${base64}" alt="Preview">`;
            
            // Upload to server
            uploadStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang upload...';
            
            try {
                const res = await API.uploadImage(base64);
                imageUrlInput.value = res.data.url;
                imageUrlManual.value = res.data.url;
                uploadStatus.innerHTML = '<i class="fas fa-check-circle" style="color:var(--success)"></i> Upload thành công';
            } catch (err) {
                uploadStatus.innerHTML = `<i class="fas fa-exclamation-circle" style="color:var(--danger)"></i> ${err.message}`;
                // Fallback: keep base64 as preview but use placeholder URL
                imageUrlInput.value = 'images/phone1.svg';
            }
        };
        reader.readAsDataURL(file);
    });
    
    // Manual URL input sync
    imageUrlManual.addEventListener('input', (e) => {
        imageUrlInput.value = e.target.value;
        if (e.target.value) {
            imagePreview.innerHTML = `<img src="${e.target.value}" alt="Preview" onerror="this.src='images/phone1.svg'">`;
        }
    });
    
    // Form submit handler
    const form = modal.querySelector('#productForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const fd = new FormData(form);
        const data = {};
        for (const [key, value] of fd.entries()) {
            data[key] = value;
        }
        
        // Parse specs from text
        const specsObj = {};
        (data.specs_text || '').split('\n').forEach(line => {
            const idx = line.indexOf(':');
            if (idx > 0) {
                const key = line.substring(0, idx).trim();
                const val = line.substring(idx + 1).trim();
                if (key && val) specsObj[key] = val;
            }
        });
        delete data.specs_text;
        data.specs = specsObj;
        data.featured = form.querySelector('[name="featured"]').checked;
        
        // Convert empty strings to null/undefined for optional fields
        if (data.old_price === '') delete data.old_price;
        if (data.brand_id === '') delete data.brand_id;
        if (data.badge === '') delete data.badge;
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const original = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        submitBtn.disabled = true;
        
        try {
            if (product) {
                await API.updateProduct(product.id, data);
                showToast('Đã cập nhật sản phẩm');
            } else {
                await API.createProduct(data);
                showToast('Đã thêm sản phẩm mới');
            }
            modal.remove();
            renderProducts();
        } catch (err) {
            console.error('Product save error:', err);
            showToast(err.message || 'Lỗi không xác định', 'error');
            submitBtn.innerHTML = original;
            submitBtn.disabled = false;
        }
    });
}

function editProduct(id) {
    openProductModal(id);
}

async function deleteProduct(id, name) {
    if (!confirm(`Xóa sản phẩm "${name}"?\nHành động này không thể hoàn tác.`)) return;
    try {
        await API.deleteProduct(id);
        showToast('Đã xóa sản phẩm');
        renderProducts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function closeModal(e) {
    // Legacy function - kept for backward compat
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
}

// ===== CATEGORIES CRUD =====
async function renderCategories() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const res = await API.getCategories();
        const categories = res.data;
        
        container.innerHTML = `
            <div class="admin-toolbar">
                <h3 style="margin:0">Tổng cộng: ${categories.length} danh mục</h3>
                <div style="margin-left:auto"></div>
                <button class="btn btn-primary" onclick="openCategoryModal()">
                    <i class="fas fa-plus"></i> Thêm danh mục
                </button>
            </div>
            <div class="dashboard-card">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Icon</th>
                            <th>Tên danh mục</th>
                            <th>Slug</th>
                            <th>Số sản phẩm</th>
                            <th>Thứ tự</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${categories.map(c => `
                            <tr>
                                <td>${c.id}</td>
                                <td><i class="fas ${c.icon || 'fa-tag'}" style="font-size:1.4rem;color:var(--primary)"></i></td>
                                <td><strong>${c.name}</strong></td>
                                <td><code>${c.slug}</code></td>
                                <td>${c.product_count}</td>
                                <td>${c.sort_order}</td>
                                <td>
                                    <button class="btn-icon" onclick="editCategory(${c.id})" title="Sửa">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon btn-danger" onclick="deleteCategory(${c.id}, '${c.name.replace(/'/g, "\\'")}')" title="Xóa">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

const ICON_OPTIONS = [
    'fa-mobile-alt', 'fa-mobile-screen', 'fa-shield-alt', 'fa-bolt', 'fa-headphones',
    'fa-battery-full', 'fa-tablet-alt', 'fa-laptop', 'fa-camera', 'fa-tv',
    'fa-watch', 'fa-gamepad', 'fa-plug', 'fa-microchip', 'fa-tools',
    'fa-tag', 'fa-gift', 'fa-star', 'fa-heart', 'fa-fire'
];

async function openCategoryModal(categoryId = null) {
    let cat = null;
    if (categoryId) {
        try {
            const res = await API.getCategory(categoryId);
            cat = res.data;
        } catch (err) {
            showToast(err.message, 'error');
            return;
        }
    }
    
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-${cat ? 'edit' : 'plus'}"></i> ${cat ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h3>
                    <button type="button" class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <form id="categoryForm">
                        <div class="form-group">
                            <label>Tên danh mục <span class="required">*</span></label>
                            <input type="text" name="name" required value="${cat?.name || ''}" placeholder="VD: Điện thoại">
                        </div>
                        <div class="form-group">
                            <label>Mô tả</label>
                            <textarea name="description" rows="2">${cat?.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Icon (Font Awesome)</label>
                            <div class="icon-picker">
                                ${ICON_OPTIONS.map(ic => `
                                    <label class="icon-option ${cat?.icon === ic ? 'selected' : ''}">
                                        <input type="radio" name="icon" value="${ic}" ${cat?.icon === ic || (!cat && ic === 'fa-tag') ? 'checked' : ''}>
                                        <i class="fas ${ic}"></i>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Thứ tự hiển thị</label>
                            <input type="number" name="sort_order" value="${cat?.sort_order ?? 0}" min="0">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline-primary modal-cancel">Hủy</button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> ${cat ? 'Cập nhật' : 'Thêm'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    let mdCat = false;
    modal.addEventListener('mousedown', (e) => { mdCat = (e.target === modal); });
    modal.addEventListener('mouseup', (e) => { if (mdCat && e.target === modal) modal.remove(); mdCat = false; });
    
    // Icon picker visual selection
    modal.querySelectorAll('.icon-option input').forEach(input => {
        input.addEventListener('change', () => {
            modal.querySelectorAll('.icon-option').forEach(o => o.classList.remove('selected'));
            input.parentElement.classList.add('selected');
        });
    });
    
    modal.querySelector('#categoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {};
        for (const [key, value] of new FormData(e.target).entries()) {
            data[key] = value;
        }
        
        const btn = e.target.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        btn.disabled = true;
        
        try {
            if (cat) {
                await API.updateCategory(cat.id, data);
                showToast('Đã cập nhật danh mục');
            } else {
                await API.createCategory(data);
                showToast('Đã thêm danh mục');
            }
            modal.remove();
            renderCategories();
        } catch (err) {
            console.error('Category save error:', err);
            showToast(err.message || 'Lỗi không xác định', 'error');
            btn.innerHTML = original;
            btn.disabled = false;
        }
    });
}

function editCategory(id) {
    openCategoryModal(id);
}

async function deleteCategory(id, name) {
    if (!confirm(`Xóa danh mục "${name}"?`)) return;
    try {
        await API.deleteCategory(id);
        showToast('Đã xóa danh mục');
        renderCategories();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== BRANDS =====
async function renderBrands() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const res = await API.getBrands();
        const brands = res.data;
        
        container.innerHTML = `
            <div class="admin-toolbar">
                <h3 style="margin:0">Tổng cộng: ${brands.length} thương hiệu</h3>
                <div style="margin-left:auto"></div>
                <button class="btn btn-primary" onclick="openBrandModal()">
                    <i class="fas fa-plus"></i> Thêm thương hiệu
                </button>
            </div>
            <div class="dashboard-card">
                <table class="admin-table">
                    <thead>
                        <tr><th>#</th><th>Tên</th><th>Slug</th><th>Số sản phẩm</th><th>Hành động</th></tr>
                    </thead>
                    <tbody>
                        ${brands.map(b => `
                            <tr>
                                <td>${b.id}</td>
                                <td><strong>${b.name}</strong></td>
                                <td><code>${b.slug}</code></td>
                                <td>${b.product_count}</td>
                                <td>
                                    <button class="btn-icon btn-danger" onclick="deleteBrand(${b.id}, '${b.name.replace(/'/g, "\\'")}')" title="Xóa">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

function openBrandModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-plus"></i> Thêm thương hiệu</h3>
                    <button type="button" class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <form id="brandForm">
                        <div class="form-group">
                            <label>Tên thương hiệu <span class="required">*</span></label>
                            <input type="text" name="name" required placeholder="VD: Apple, Samsung...">
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn btn-outline-primary modal-cancel">Hủy</button>
                            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Thêm</button>
                        </div>
                    </form>
                </div>
            </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    let mdBrand = false;
    modal.addEventListener('mousedown', (e) => { mdBrand = (e.target === modal); });
    modal.addEventListener('mouseup', (e) => { if (mdBrand && e.target === modal) modal.remove(); mdBrand = false; });
    
    modal.querySelector('#brandForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.target));
        const btn = e.target.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        
        try {
            await API.createBrand(data);
            showToast('Đã thêm thương hiệu');
            modal.remove();
            renderBrands();
        } catch (err) {
            showToast(err.message, 'error');
            btn.innerHTML = original;
            btn.disabled = false;
        }
    });
}

async function deleteBrand(id, name) {
    if (!confirm(`Xóa thương hiệu "${name}"?`)) return;
    try {
        await API.deleteBrand(id);
        showToast('Đã xóa');
        renderBrands();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ===== CONTACTS =====
async function renderContacts() {
    const container = document.getElementById('adminContent');
    try {
        const res = await fetch('/api/contact', {
            headers: { Authorization: 'Bearer ' + Auth.getToken() }
        });
        const data = await res.json();
        const contacts = data.data || [];
        
        container.innerHTML = `
            <div class="dashboard-card">
                ${contacts.length === 0 ? '<p style="text-align:center;padding:30px;color:#999">Chưa có tin nhắn</p>' : `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Họ tên</th><th>SĐT</th><th>Email</th><th>Chủ đề</th><th>Nội dung</th><th>Ngày</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${contacts.map(c => `
                            <tr>
                                <td><strong>${c.name}</strong></td>
                                <td>${c.phone}</td>
                                <td>${c.email || '-'}</td>
                                <td>${c.subject || '-'}</td>
                                <td style="max-width:300px;white-space:normal">${c.message}</td>
                                <td>${formatDateTime(c.created_at)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>`}
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

// ===== NEWS CRUD =====
async function renderNews() {
    const container = document.getElementById('adminContent');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i></div>';
    
    try {
        const res = await API.getNews({ limit: 50 });
        const news = res.data;
        
        container.innerHTML = `
            <div class="admin-toolbar">
                <h3 style="margin:0">Tổng cộng: ${news.length} bài viết</h3>
                <div style="margin-left:auto"></div>
                <button class="btn btn-primary" onclick="openNewsModal()">
                    <i class="fas fa-plus"></i> Thêm bài viết
                </button>
            </div>
            <div class="dashboard-card">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Ảnh</th>
                            <th>Tiêu đề</th>
                            <th>Chuyên mục</th>
                            <th>Lượt xem</th>
                            <th>Ngày tạo</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${news.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:30px;color:#999">Chưa có bài viết</td></tr>' : 
                        news.map(n => `
                            <tr>
                                <td><img src="${n.image || 'images/news1.svg'}" class="admin-thumb" onerror="this.src='images/news1.svg'"></td>
                                <td>
                                    <strong>${n.title}</strong>
                                    ${n.featured ? '<span class="featured-badge"><i class="fas fa-star"></i></span>' : ''}
                                </td>
                                <td>${n.category || '-'}</td>
                                <td>${n.views || 0}</td>
                                <td>${formatDate(n.created_at)}</td>
                                <td>
                                    <button class="btn-icon btn-danger" onclick="deleteNews(${n.id}, '${n.title.replace(/'/g, "\\'").substring(0, 30)}')" title="Xóa">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<div class="error-state">${err.message}</div>`;
    }
}

function openNewsModal() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content modal-large">
            <div class="modal-header">
                <h3><i class="fas fa-plus"></i> Thêm bài viết mới</h3>
                <button type="button" class="modal-close">×</button>
            </div>
            <div class="modal-body">
                <form id="newsForm">
                    <div class="form-section">
                        <h4>Thông tin bài viết</h4>
                        <div class="form-group">
                            <label>Tiêu đề <span class="required">*</span></label>
                            <input type="text" name="title" required placeholder="Tiêu đề bài viết">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Chuyên mục</label>
                                <select name="category">
                                    <option value="">-- Chọn --</option>
                                    <option value="Điện thoại">Điện thoại</option>
                                    <option value="Phụ kiện">Phụ kiện</option>
                                    <option value="Mẹo hay">Mẹo hay</option>
                                    <option value="So sánh">So sánh</option>
                                    <option value="AI & Mobile">AI & Mobile</option>
                                    <option value="Đánh giá">Đánh giá</option>
                                    <option value="Khuyến mãi">Khuyến mãi</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Tags (phân cách bằng dấu phẩy)</label>
                                <input type="text" name="tags" placeholder="iphone, samsung, review">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Tóm tắt</label>
                            <textarea name="excerpt" rows="2" placeholder="Mô tả ngắn hiển thị ở danh sách bài viết..."></textarea>
                        </div>
                        <div class="form-group">
                            <label>Nội dung <span class="required">*</span></label>
                            <textarea name="content" rows="10" required placeholder="Nội dung đầy đủ bài viết..."></textarea>
                        </div>
                    </div>
                    <div class="form-section">
                        <h4>Hình ảnh & Hiển thị</h4>
                        <div class="form-group">
                            <label>URL hình ảnh đại diện</label>
                            <input type="text" name="image" placeholder="https://... hoặc images/news1.svg" value="images/news1.svg">
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label class="checkbox-inline">
                                    <input type="checkbox" name="featured">
                                    Bài viết nổi bật
                                </label>
                            </div>
                            <div class="form-group">
                                <label>Trạng thái</label>
                                <select name="status">
                                    <option value="published">Xuất bản</option>
                                    <option value="draft">Bản nháp</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-outline-primary modal-cancel">Hủy</button>
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Đăng bài</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.modal-cancel').addEventListener('click', () => modal.remove());
    let mdOverlay = false;
    modal.addEventListener('mousedown', (e) => { mdOverlay = (e.target === modal); });
    modal.addEventListener('mouseup', (e) => { if (mdOverlay && e.target === modal) modal.remove(); mdOverlay = false; });
    
    modal.querySelector('#newsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = {};
        for (const [key, value] of fd.entries()) data[key] = value;
        
        // Auto-generate slug from title
        data.slug = data.title.toLowerCase().trim()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-')
            .replace(/^-+|-+$/g, '') + '-' + Date.now().toString(36);
        
        data.featured = modal.querySelector('[name="featured"]').checked;
        
        const btn = e.target.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        btn.disabled = true;
        
        try {
            await apiRequest('/news', { method: 'POST', body: JSON.stringify(data) });
            showToast('Đã đăng bài viết');
            modal.remove();
            renderNews();
        } catch (err) {
            showToast(err.message, 'error');
            btn.innerHTML = original;
            btn.disabled = false;
        }
    });
}

async function deleteNews(id, title) {
    if (!confirm(`Xóa bài viết "${title}..."?`)) return;
    try {
        await apiRequest(`/news/${id}`, { method: 'DELETE' });
        showToast('Đã xóa bài viết');
        renderNews();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

window.openNewsModal = openNewsModal;
window.deleteNews = deleteNews;

function logout() {
    Auth.clearToken();
    window.location.href = 'login.html';
}

window.updateOrderStatus = updateOrderStatus;
window.openProductModal = openProductModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.openCategoryModal = openCategoryModal;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.openBrandModal = openBrandModal;
window.deleteBrand = deleteBrand;
window.closeModal = closeModal;
window.logout = logout;

document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('[data-tab]').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const tab = link.dataset.tab;
        if (tabs[tab]) {
            document.getElementById('pageTitle').textContent = tabs[tab].title;
            tabs[tab].render();
        }
    });
});

renderDashboard();
