//express is the framework we're going to use to handle requests
const express = require('express');

//Create a new instance of express router
var router = express.Router();

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");
router.use(bodyParser.json());

router.get("/", (req, res) => {
    setTimeout(() => {
        res.send({
            message: "Thanks for waiting"
        });
    }, 1000);
});

router.post("/", (req, res) => {
    setTimeout(() => {
        res.send({
            message: "Thanks for waiting"
        });
    }, 1000);
});

module.exports = router;
