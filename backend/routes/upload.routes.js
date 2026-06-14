const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer.middleware');
const { handleUpload } = require('../controllers/upload.controller');

// POST /api/upload
// The 'upload.single('pdf')' middleware handles the file with the field name 'pdf'
router.post('/', upload.single('pdf'), handleUpload);

module.exports = router;
