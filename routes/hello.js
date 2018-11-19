// express is the framework we're going to use to handle requests
const express = require('express');

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");

// provides resource to verify and manage a member account
const chat = require('../utilities/chat_service');

// create the router
var router = express.Router();
router.use(bodyParser.json());

//add a post route to the router.
router.post("/", (req, res) => {
    require('../utilities/utils').fcm_functions.sendToTopic("test", "test", "all");
    res.send({
        message: "Hello, you sent a POST request"
    });
});

module.exports = router;
