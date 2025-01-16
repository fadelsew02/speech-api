require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/api', apiRoutes);

app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server is running on port ${PORT}`);
});