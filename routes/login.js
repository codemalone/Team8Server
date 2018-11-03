//express is the framework we're going to use to handle requests
const express = require('express');

//Create connection to Heroku Database
let getUser = require('../utilities/account.js').getUser;

var router = express.Router();

const bodyParser = require("body-parser");
//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(bodyParser.json());

router.post('/', (req, res) => {
    let email = req.body['email'];
    let theirPw = req.body['password'];
    
    if(email && theirPw) {
        //Using the 'one' method means that only one row should be returned
        getUser(email, theirPw)
        // if successful then check if user email is validated
        .then(user => {
            //Is the account verified
            if (user.verification == 0) {
                throw('not verified');
            } else {
                res.send({
                    success: true
                })
            }
        })
        .catch((err) => {
            //If anything happened, it wasn't successful
            res.send({
                success: false,
                message: "login failed"
            });
            console.dir('login failed: ' + email);
        });
    } else {
        res.send({
            success: false,
            message: 'missing credentials'
        });
    }
});

module.exports = router;
