// express is the framework we're going to use to handle requests
const express = require('express');

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");

// provides resource to verify and manage a member account
const chat = require('../utilities/chat_service');

// for now we can put the fcm module here

let db = require('../utilities/utils').db;

// create the router
var router = express.Router();
router.use(bodyParser.json());

/**
 * Begin a new chat session with an existing connection. Returns the chatId.
 * If a chat already exists then it also returns the previous messages.
 */
router.post('/add', (req, res) => {
    let token = req.body.token;
    let theirEmail = req.body.theirEmail;

    chat.addConversation(token, theirEmail)
        .then(data => { res.send({ success: true, data: data }) })
        .catch(err => { res.send({ success: false, message: err }) })

})

/**
 * Get all messages from any conversation between the caller and another user.
 */
router.post('/message/getAll', (req, res) => {
    let token = req.body.token;
    let chatId = req.body.chatId;

    chat.getAllMessages(token, chatId)
        .then(data => { res.send({ success: true, data: data }) })
        .catch(err => { res.send({ success: false, message: err }) })
});

router.post('/message/send', (req, res) => {
    let token = req.body.token;
    let chatId = req.body.chatId;
    let message = req.body.message;

    chat.sendMessage(token, chatId, message)
        .then(() => { res.send({ success: true }) })
        .catch(err => { res.send({ success: false, message: err }) })
});

module.exports = router;
