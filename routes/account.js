//express is the framework we're going to use to handle requests
const express = require('express');

// checks a provided validation code
let validateEmail = require('../utilities/account').validateEmail;

// sends a new validation email
let sendEmailValidationLink = require('../utilities/account').sendEmailValidationLink;

var router = express.Router();

const bodyParser = require("body-parser");
//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(bodyParser.json());

router.get('/verify', (req, res) => {
    let email = req.query.email;
    let code = req.query.code;
    let response = {title: "Account Verification"};
        
    if(email && code) {
        validateEmail(email, code)                
        .then(() => {
            response.message = "Your email has been verified. You can now use our app!";
            res.render('index', response);
    }).catch((err) => {
            //If anything happened, send generic error to user and print stacktrace to console
            response.message = "Unable to verify email address."
            res.render('index', response);
            console.dir(err.message);
        })
    } else {
        response.message = "Invalid input.";
        res.render('index', response);
    }
});

router.post('/sendVerification', (req, res) => {
    let email = req.body.email;

    if(email) {
        sendEmailValidationLink(email)
        .then(() => {
            res.send({ success: true });
        })
        .catch(() => {
            res.send({ success: false, message: 'error'});
        })
    } else {
        res.send({ success: false });
    }
});

module.exports = router;
