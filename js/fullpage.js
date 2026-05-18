// ===== FULLPAGE SCROLL CONTROLLER (Custom smooth scroll) =====
(function() {
    'use strict';
    
    const wrapper = document.querySelector('.fullpage-wrapper');
    if (!wrapper) return;
    
    const sections = Array.from(document.querySelectorAll('.fullpage-section'));
    const dots = document.querySelectorAll('.fullpage-dot');
    if (sections.length === 0) return;
    
    // ===== STATE =====
    let currentSection = 0;
    let isFullpageMode = false;
    let isAnimating = false;
    let lastWheelTime = 0;
    
    // ===== CONFIG =====
    const SCROLL_DURATION = 700;         // ms - nhanh và mượt
    const WHEEL_THROTTLE = 750;          // ms - vừa hết animation là cuộn được
    const WHEEL_DELTA_THRESHOLD = 8;     // bỏ qua wheel quá nhỏ (inertia)
    
    // ===== UTILS =====
    function isTouchDevice() {
        return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }
    
    function shouldUseFullpage() {
        return window.innerWidth >= 1024 && !isTouchDevice();
    }
    
    // Easing easeOutCubic - decelerate nhanh, không có ease-in chậm
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    // Easing easeOutExpo - decelerate dramatic
    function easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }
    
    // ===== CUSTOM SMOOTH SCROLL using requestAnimationFrame =====
    function animateScroll(targetTop, duration) {
        const startTop = wrapper.scrollTop;
        const distance = targetTop - startTop;
        const startTime = performance.now();
        
        if (Math.abs(distance) < 1) {
            return;
        }
        
        isAnimating = true;
        document.body.classList.add('is-animating');
        
        function step(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutCubic(progress);
            
            wrapper.scrollTop = startTop + distance * eased;
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                wrapper.scrollTop = targetTop;
                isAnimating = false;
                document.body.classList.remove('is-animating');
            }
        }
        
        requestAnimationFrame(step);
    }
    
    // ===== ENABLE / DISABLE FULLPAGE =====
    function enableFullpage() {
        if (isFullpageMode) return;
        isFullpageMode = true;
        document.body.classList.add('fullpage-active');
        
        requestAnimationFrame(() => {
            // Position to current section without animation
            wrapper.scrollTop = sections[currentSection].offsetTop;
            updateActiveStates(currentSection);
        });
    }
    
    function disableFullpage() {
        if (!isFullpageMode) return;
        isFullpageMode = false;
        document.body.classList.remove('fullpage-active', 'is-animating', 'scroll-down', 'scroll-up');
        wrapper.scrollTop = 0;
        sections.forEach(s => s.classList.remove('is-active', 'just-arrived'));
    }
    
    // ===== UPDATE STATES =====
    function updateActiveStates(index) {
        sections.forEach((s, i) => {
            const wasActive = s.classList.contains('is-active');
            if (i === index) {
                if (!wasActive) {
                    // Force reflow to restart animations
                    s.classList.remove('is-active');
                    void s.offsetWidth;
                    s.classList.add('is-active');
                    s.classList.add('just-arrived');
                    setTimeout(() => s.classList.remove('just-arrived'), 600);
                } else {
                    s.classList.add('is-active');
                }
            } else {
                s.classList.remove('is-active');
            }
        });
        
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        const hint = document.querySelector('.scroll-hint');
        if (hint) {
            hint.style.opacity = index > 0 ? '0' : '';
        }
        
        // Update progress bar
        const progressBar = document.querySelector('.scroll-progress');
        if (progressBar) {
            const percent = sections.length > 1 
                ? (index / (sections.length - 1)) * 100 
                : 100;
            progressBar.style.width = percent + '%';
        }
        
        // Update section indicator
        const indicator = document.querySelector('.section-indicator');
        if (indicator) {
            const currentEl = indicator.querySelector('.current');
            const totalEl = indicator.querySelector('.total');
            if (currentEl) currentEl.textContent = String(index + 1).padStart(2, '0');
            if (totalEl) totalEl.textContent = '/ ' + String(sections.length).padStart(2, '0');
            indicator.classList.add('changing');
            setTimeout(() => indicator.classList.remove('changing'), 400);
        }
    }
    
    // ===== GO TO SECTION =====
    function goToSection(index, animate = true) {
        if (index < 0 || index >= sections.length) return;
        if (isAnimating) return;
        
        const direction = index > currentSection ? 'down' : 'up';
        document.body.classList.remove('scroll-down', 'scroll-up');
        document.body.classList.add(`scroll-${direction}`);
        
        currentSection = index;
        
        // Update active states IMMEDIATELY for instant visual feedback
        // (animation runs in parallel with scroll, no waiting)
        updateActiveStates(index);
        
        if (!isFullpageMode) {
            // Normal mobile scroll
            const target = sections[index];
            window.scrollTo({
                top: target.offsetTop - 80,
                behavior: 'smooth'
            });
            return;
        }
        
        const targetTop = sections[index].offsetTop;
        
        if (animate) {
            animateScroll(targetTop, SCROLL_DURATION);
        } else {
            wrapper.scrollTop = targetTop;
        }
        
        try {
            history.replaceState(null, null, `#section-${index}`);
        } catch (e) {}
    }
    
    function nextSection() {
        if (currentSection < sections.length - 1) {
            goToSection(currentSection + 1);
        }
    }
    
    function prevSection() {
        if (currentSection > 0) {
            goToSection(currentSection - 1);
        }
    }
    
    // ===== WHEEL EVENT =====
    function handleWheel(e) {
        if (!isFullpageMode) return;
        
        e.preventDefault();
        
        if (isAnimating) return;
        
        const now = Date.now();
        if (now - lastWheelTime < WHEEL_THROTTLE) return;
        
        if (Math.abs(e.deltaY) < WHEEL_DELTA_THRESHOLD) return;
        
        lastWheelTime = now;
        
        if (e.deltaY > 0) {
            nextSection();
        } else {
            prevSection();
        }
    }
    
    wrapper.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('wheel', handleWheel, { passive: false });
    
    // ===== KEYBOARD =====
    document.addEventListener('keydown', (e) => {
        if (!isFullpageMode) return;
        if (isAnimating) return;
        
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        
        switch(e.key) {
            case 'ArrowDown':
            case 'PageDown':
            case ' ':
                e.preventDefault();
                nextSection();
                break;
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                prevSection();
                break;
            case 'Home':
                e.preventDefault();
                goToSection(0);
                break;
            case 'End':
                e.preventDefault();
                goToSection(sections.length - 1);
                break;
        }
    });
    
    // ===== TOUCH =====
    let touchStartY = 0;
    let touchStartTime = 0;
    
    document.addEventListener('touchstart', (e) => {
        if (!isFullpageMode) return;
        touchStartY = e.changedTouches[0].screenY;
        touchStartTime = Date.now();
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
        if (!isFullpageMode) return;
        if (isAnimating) return;
        const touchEndY = e.changedTouches[0].screenY;
        const diff = touchStartY - touchEndY;
        const elapsed = Date.now() - touchStartTime;
        
        // Only respond to deliberate swipes
        if (Math.abs(diff) < 60 || elapsed > 500) return;
        
        if (diff > 0) nextSection();
        else prevSection();
    }, { passive: true });
    
    // ===== DOT NAVIGATION =====
    dots.forEach((dot, i) => {
        dot.addEventListener('click', (e) => {
            e.preventDefault();
            if (isAnimating) return;
            goToSection(i);
        });
    });
    
    // ===== HANDLE RESIZE =====
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const should = shouldUseFullpage();
            if (should && !isFullpageMode) {
                enableFullpage();
            } else if (!should && isFullpageMode) {
                disableFullpage();
            } else if (isFullpageMode) {
                // Re-position
                wrapper.scrollTop = sections[currentSection].offsetTop;
            }
        }, 200);
    });
    
    // ===== HANDLE HASH ON LOAD =====
    function handleHash() {
        const hash = window.location.hash;
        if (hash && hash.startsWith('#section-')) {
            const idx = parseInt(hash.replace('#section-', ''));
            if (!isNaN(idx) && idx >= 0 && idx < sections.length) {
                currentSection = idx;
            }
        }
    }
    
    // ===== INITIALIZE =====
    function init() {
        handleHash();
        if (shouldUseFullpage()) {
            enableFullpage();
        }
    }
    
    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
    
    // Make functions available globally
    window.fullpageGoTo = goToSection;
})();
