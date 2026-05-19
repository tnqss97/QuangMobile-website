const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Upload image as base64 → Cloudinary
// Frontend sends: { image: "data:image/jpeg;base64,/9j/4AAQ..." }
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        const { image } = req.body;
        
        if (!image) {
            return res.status(400).json({ success: false, message: 'Không có ảnh để upload' });
        }
        
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        
        if (!cloudName || !apiKey || !apiSecret) {
            return res.status(500).json({ 
                success: false, 
                message: 'Cloudinary chưa được cấu hình. Thêm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET vào Environment Variables.' 
            });
        }
        
        // Upload to Cloudinary using REST API (no SDK needed)
        const timestamp = Math.round(Date.now() / 1000);
        const folder = 'quangmobile/products';
        
        // Generate signature
        const crypto = require('crypto');
        const signStr = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(signStr).digest('hex');
        
        // Send to Cloudinary
        const formBody = new URLSearchParams({
            file: image,
            folder: folder,
            timestamp: timestamp.toString(),
            api_key: apiKey,
            signature: signature
        });
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formBody
        });
        
        const data = await response.json();
        
        if (data.error) {
            return res.status(400).json({ success: false, message: data.error.message });
        }
        
        res.json({
            success: true,
            message: 'Upload thành công',
            data: {
                url: data.secure_url,
                public_id: data.public_id,
                width: data.width,
                height: data.height
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
