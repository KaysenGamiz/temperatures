const express = require('express');
const path = require('path');
const router = express.Router();

const readings_router = require(path.join(__dirname, '..', 'routes', 'route_reading'));

router.use('/temperatures', readings_router);

module.exports = router;