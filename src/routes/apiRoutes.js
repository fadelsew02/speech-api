const express = require('express');
const { submitFile, upload } = require('../controllers/apiController');

const router = express.Router();

router.post('/submit', upload.single('file'), submitFile);

module.exports = router;