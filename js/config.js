// ===== FRONTEND CONFIG =====
// Tự động chọn API URL dựa trên môi trường:
// - Local development: dùng cùng origin (http://localhost:3000)
// - Production (Vercel): dùng URL backend trên Render
//
// Sau khi deploy backend lên Render, sửa PROD_API_URL bên dưới
// rồi commit + push để Vercel auto-deploy lại

(function() {
    // ⚠️ Sau khi deploy backend lên Render, thay URL này bằng URL Render của bạn
    const PROD_API_URL = 'https://quangmobile-backend.onrender.com/api';
    
    const isLocal = location.hostname === 'localhost' 
                 || location.hostname === '127.0.0.1'
                 || location.protocol === 'file:';
    
    window.QM_CONFIG = {
        API_BASE: isLocal ? `${location.origin}/api` : PROD_API_URL
    };
})();
