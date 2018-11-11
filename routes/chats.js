// express is the framework we're going to use to handle requests
const express = require('express');

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");

// provides resource to verify and manage a member account
const chat = require('../utilities/chat_service');

// create the router
var router = express.Router();
router.use(bodyParser.json());

/**
 * Get all messages from any conversation between the caller and another user.
 */
router.post('/message/get', (req, res) => {
    let token = req.body.token;
    let otherUser = req.body.otherUser;

    chat.doSomethingCool(token, otherUser)
        .then(user => { res.send({ success: true, user: user }) })
        .catch(err => { res.send({ success: false, message: err }) })
});

module.exports = router;
