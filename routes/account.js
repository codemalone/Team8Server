// express is the framework we're going to use to handle requests
const express = require('express');

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");

// provides resource to verify and manage a member account
const account = require('../utilities/account_service');

// create the router
var router = express.Router();
router.use(bodyParser.json());

/**
 * Checks that an email and password are valid. Returns a user object. 
 */
router.post('/login/email', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    if (email && password) {
        account.loginUserOnEmail(email, password)
            .then(user => { res.send({ success: true, user: user }) })
            .catch(err => { res.send({ success: false, message: err }) })
    } else {
        res.send({
            success: false,
            message: "missing information"
        })
    }
});

/**
 * Checks that a username and password are valid. Returns a user object.
 */
router.post('/login/username', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    if (username && password) {
        account.loginUserOnUsername(username, password)
            .then(user => { res.send({ success: true, user: user }) })
            .catch(err => { res.send({ success: false, message: err }) })
    } else {
        res.send({
            success: false,
            message: "missing information"
        })
    }
});

/**
 * Submits provided information to create a new user.
 */
router.post('/register', (req, res) => {
    var first = req.body['first'];
    var last = req.body['last'];
    var username = req.body['username'];
    var email = req.body['email'];
    var password = req.body['password'];

    //Verify that the caller supplied all the parameters
    //In js, empty strings or null values evaluate to false
    if(first && last && username && email && password) {
        account.registerUser(email, username, first, last, password)
            .then(() => { res.send({ success: true }) })
            .catch(err => { res.send({ success: false, message: err }) })
        } else {
            res.send({
                success: false,
                message: "missing information"
            })
        }
});

/**
 * Sends an account email verification code.
 */
router.get('/verification', (req, res) => {
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

/**
 * Checks an account email verification code.
 * 
 */
router.post('/verification', (req, res) => {
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


/**
 * Sends a password reset code to the email.
 */
router.get("/recover", (req, res) => {
    let email = req.query.email;

    if (email) {
        sendPasswordResetCode(email);
        res.send({ success: true });
    } else {
        res.send({ success: false });
    }
});

/**
 * Verifies that a password reset code is valid.
 */
router.post("/recover", (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let code = req.body.code;

    if (email && password && code) {
        //
    } else {
        res.send({ success: false });
    }
});

/**
 * Resets a password to the new password given a
 * valid reset code.
 */
router.post("/password/reset", (req, res) => {
    


});

/**
 * Resets a password to the new password given the
 * valid old password.
 */
router.post("/password/change", (req, res) => {



});

module.exports = router;
