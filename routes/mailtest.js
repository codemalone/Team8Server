//express is the framework we're going to use to handle requests
const express = require('express');
var router = express.Router();

let sendEmail = require('../utilities/utils').sendEmail;

router.get('/', (req, res) => {
    sendEmail(req.query.email, "Test Message", "<strong>Did you get this?</strong>");
    res.send('Sent to ' + req.query.email);
});

module.exports = router;
