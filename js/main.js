// ===== MOBILE MENU TOGGLE =====
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.add('fa-bars');
            icon.classList.remove('fa-times');
        });
    });
}

// ===== HEADER SCROLL EFFECT =====
const header = document.querySelector('.header');
function handleHeaderScroll() {
    const inFullpage = document.body.classList.contains('fullpage-active');
    const wrapperEl = document.querySelector('.fullpage-wrapper');
    let scrollPos = inFullpage && wrapperEl ? wrapperEl.scrollTop : window.scrollY;
    
    if (scrollPos > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}
window.addEventListener('scroll', handleHeaderScroll);
const fpWrapper = document.querySelector('.fullpage-wrapper');
if (fpWrapper) {
    fpWrapper.addEventListener('scroll', handleHeaderScroll, { passive: true });
}

// ===== SCROLL ANIMATIONS =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('in-view');
            }, index * 80);
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
});

// ===== TOAST NOTIFICATION (defined in api.js, this is fallback if api.js not loaded) =====
if (typeof showToast === 'undefined') {
    window.showToast = function(message, type = 'success') {
        const toast = document.querySelector('.toast');
        if (!toast) { alert(message); return; }
        const toastMessage = toast.querySelector('.toast-message');
        if (toastMessage) toastMessage.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };
}

// ===== CART FUNCTIONALITY =====
document.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const card = btn.closest('.product-card');
        const productName = card?.querySelector('h3')?.textContent || 'Sản phẩm';
        
        // If logged in and has API, use it
        if (window.Auth && Auth.isLoggedIn() && card?.dataset.productId) {
            try {
                await API.addToCart(parseInt(card.dataset.productId), 1);
                showToast(`Đã thêm "${productName}" vào giỏ hàng!`);
                await updateCartBadge();
            } catch (err) {
                showToast(err.message, 'error');
            }
        } else if (window.Auth && !Auth.isLoggedIn()) {
            // Show login prompt
            if (confirm('Bạn cần đăng nhập để thêm vào giỏ hàng. Đăng nhập ngay?')) {
                window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
            }
            return;
        } else {
            // Fallback: local count
            let cartCount = parseInt(localStorage.getItem('cartCount') || '0');
            cartCount++;
            localStorage.setItem('cartCount', cartCount);
            document.querySelectorAll('.cart-count').forEach(el => el.textContent = cartCount);
            showToast(`Đã thêm "${productName}" vào giỏ hàng!`);
        }
        
        // Visual feedback
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
    });
});

// ===== PRODUCT ACTION BUTTONS =====
document.querySelectorAll('.product-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const icon = btn.querySelector('i');
        if (icon.classList.contains('fa-heart')) {
            icon.classList.toggle('far');
            icon.classList.toggle('fas');
            if (icon.classList.contains('fas')) {
                icon.style.color = '#ef4444';
                showToast('Đã thêm vào danh sách yêu thích!');
            } else {
                icon.style.color = '';
                showToast('Đã xóa khỏi danh sách yêu thích!');
            }
        } else if (icon.classList.contains('fa-eye')) {
            showToast('Tính năng xem nhanh đang phát triển');
        } else if (icon.classList.contains('fa-exchange-alt')) {
            showToast('Đã thêm vào danh sách so sánh');
        }
    });
});

// ===== CONTACT FORM =====
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = Object.fromEntries(new FormData(contactForm));
        
        if (!formData.name || !formData.phone || !formData.message) {
            showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
            return;
        }

        const submitBtn = contactForm.querySelector('.btn-submit');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang gửi...';
        submitBtn.disabled = true;

        try {
            if (window.API) {
                await API.sendContact(formData);
            }
            showToast('Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm.');
            contactForm.reset();
        } catch (err) {
            showToast(err.message || 'Lỗi khi gửi tin nhắn', 'error');
        } finally {
            submitBtn.innerHTML = originalHTML;
            submitBtn.disabled = false;
        }
    });
}

// ===== NEWSLETTER FORM =====
function handleNewsletter(e) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const btn = e.target.querySelector('button');
    const email = input.value;
    
    if (!email) return false;
    
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    const finishUp = (msg, type = 'success') => {
        showToast(msg, type);
        input.value = '';
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    };
    
    if (window.API) {
        API.subscribeNewsletter(email)
            .then(res => finishUp(res.message))
            .catch(err => finishUp(err.message || 'Lỗi đăng ký', 'error'));
    } else {
        setTimeout(() => finishUp('Đăng ký nhận tin thành công!'), 800);
    }
    
    return false;
}
window.handleNewsletter = handleNewsletter;

// ===== SEARCH FUNCTIONALITY =====
const searchBar = document.querySelector('.search-bar');
if (searchBar) {
    const searchInput = searchBar.querySelector('input');
    const searchBtn = searchBar.querySelector('button');
    
    // Create suggestions dropdown
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'search-suggestions';
    suggestionsDiv.style.display = 'none';
    searchBar.appendChild(suggestionsDiv);
    searchBar.style.position = 'relative';
    
    let searchTimer;
    
    searchInput.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        clearTimeout(searchTimer);
        
        if (q.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        
        searchTimer = setTimeout(async () => {
            try {
                if (!window.API) return;
                const res = await API.searchSuggestions(q);
                if (res.data && res.data.length > 0) {
                    suggestionsDiv.innerHTML = res.data.map(p => `
                        <a href="product.html?slug=${p.slug}" class="suggestion-item">
                            <img src="${p.image}" onerror="this.src='images/phone1.svg'" alt="">
                            <div class="suggestion-info">
                                <span class="suggestion-name">${p.name}</span>
                                <span class="suggestion-price">${formatCurrency(p.price)}</span>
                            </div>
                            <span class="suggestion-category">${p.category_name || ''}</span>
                        </a>
                    `).join('') + `
                        <a href="products.html?search=${encodeURIComponent(q)}" class="suggestion-all">
                            Xem tất cả kết quả cho "${q}" <i class="fas fa-arrow-right"></i>
                        </a>
                    `;
                    suggestionsDiv.style.display = 'block';
                } else {
                    suggestionsDiv.innerHTML = '<div class="suggestion-empty">Không tìm thấy sản phẩm</div>';
                    suggestionsDiv.style.display = 'block';
                }
            } catch (err) {
                suggestionsDiv.style.display = 'none';
            }
        }, 300);
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchBar.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });
    
    // Search on Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const q = searchInput.value.trim();
            if (q) {
                suggestionsDiv.style.display = 'none';
                window.location.href = `products.html?search=${encodeURIComponent(q)}`;
            }
        }
    });
    
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const q = searchInput.value.trim();
        if (q) {
            suggestionsDiv.style.display = 'none';
            window.location.href = `products.html?search=${encodeURIComponent(q)}`;
        }
    });
    
    // Show suggestions on focus if has value
    searchInput.addEventListener('focus', () => {
        if (searchInput.value.trim().length >= 2 && suggestionsDiv.innerHTML) {
            suggestionsDiv.style.display = 'block';
        }
    });
}

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.length > 1) {
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                window.scrollTo({
                    top: target.offsetTop - 90,
                    behavior: 'smooth'
                });
            }
        }
    });
});

// ===== BACK TO TOP =====
const backToTop = document.querySelector('.back-to-top');
if (backToTop) {
    function checkBackToTop() {
        const inFullpage = document.body.classList.contains('fullpage-active');
        const wrapperEl = document.querySelector('.fullpage-wrapper');
        let scrollPos;
        
        if (inFullpage && wrapperEl) {
            scrollPos = wrapperEl.scrollTop;
        } else {
            scrollPos = window.scrollY;
        }
        
        if (scrollPos > 400) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }
    }
    
    window.addEventListener('scroll', checkBackToTop);
    const wrapperEl = document.querySelector('.fullpage-wrapper');
    if (wrapperEl) {
        wrapperEl.addEventListener('scroll', checkBackToTop, { passive: true });
    }

    backToTop.addEventListener('click', () => {
        if (document.body.classList.contains('fullpage-active') && window.fullpageGoTo) {
            window.fullpageGoTo(0);
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

// ===== FAQ ACCORDION =====
document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
        const isActive = item.classList.contains('active');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
        if (!isActive) item.classList.add('active');
    });
});

// ===== STATS COUNTER ANIMATION =====
function animateCounter(el) {
    const text = el.textContent;
    const match = text.match(/(\d+(?:\.\d+)?)/);
    if (!match) return;
    
    const target = parseFloat(match[1]);
    const suffix = text.replace(match[1], '');
    const duration = 2000;
    const start = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = (target * eased).toFixed(target % 1 ? 1 : 0);
        el.textContent = current + suffix;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.stat-number').forEach(el => animateCounter(el));
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);

// ===== FILTER ACTIVE STATE =====
document.querySelectorAll('.filter-group ul li a').forEach(link => {
    link.addEventListener('click', (e) => {
        const parentList = link.closest('ul');
        parentList.querySelectorAll('a').forEach(a => a.classList.remove('filter-active'));
        link.classList.add('filter-active');
    });
});

// ===== PARALLAX EFFECT FOR HERO SHAPES =====
if (window.matchMedia('(min-width: 1024px)').matches && !('ontouchstart' in window)) {
    const heroShapes = document.querySelectorAll('.hero-shape');
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 30;
        const y = (e.clientY / window.innerHeight - 0.5) * 30;
        heroShapes.forEach((shape, index) => {
            const speed = (index + 1) * 0.5;
            shape.style.transform = `translate(${x * speed}px, ${y * speed}px)`;
        });
    });
}

// ===== TILT EFFECT ON CARDS =====
if (window.matchMedia('(min-width: 1024px)').matches && !('ontouchstart' in window)) {
    document.querySelectorAll('.product-card, .testimonial-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 30;
            const rotateY = (centerX - x) / 30;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
}

console.log('🚀 Quang Mobile Website loaded successfully!');

// ===== COUNTDOWN TIMER =====
(function() {
    const dayEl = document.querySelector('[data-cd="days"]');
    const hourEl = document.querySelector('[data-cd="hours"]');
    const minEl = document.querySelector('[data-cd="minutes"]');
    const secEl = document.querySelector('[data-cd="seconds"]');
    
    if (!dayEl || !hourEl || !minEl || !secEl) return;
    
    // Set countdown to end in ~12 days from page load
    const targetDate = new Date(Date.now() + (12 * 24 * 60 * 60 * 1000) + (8 * 60 * 60 * 1000));
    
    function pad(num) {
        return String(num).padStart(2, '0');
    }
    
    function updateCountdown() {
        const now = Date.now();
        let diff = targetDate.getTime() - now;
        
        if (diff < 0) diff = 0;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        dayEl.textContent = pad(days);
        hourEl.textContent = pad(hours);
        minEl.textContent = pad(minutes);
        secEl.textContent = pad(seconds);
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
})();
