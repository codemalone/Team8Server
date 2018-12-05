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
    let token = req.body.token;

    account.loginUserOnEmail(email, password, token)
        .then(user => { res.send({ success: true, user: user }) })
        .catch(err => { res.send({ success: false, message: err }) })
});

/**
 * Checks that a username and password are valid. Returns a user object.
 */
router.post('/login/username', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;
    let token = req.body.token;

    account.loginUserOnUsername(username, password, token)
        .then(user => { res.send({ success: true, user: user }) })
        .catch(err => { res.send({ success: false, message: err }) })
});

/**
 * Submits provided information to create a new user.
 */
router.post('/register', (req, res) => {
    var first = req.body.first;
    var last = req.body.last;
    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;

    account.registerUser(first, last, username, email, password)
        .then(() => { res.send({ success: true }) })
        .catch(err => { res.send({ success: false, message: err }) })
});

/**
 * Sends an account email verification code. A response message is sent in HTML
 * format unless the query parameter response=json is received.
 */
router.get('/verification/send', (req, res) => {
    let email = req.query.email;
    let username = req.query.username;
    let responseFormat = req.query.response;

    let response = {title: "Account Verification"};

    //determine action based on query
    if (email) {
        var action = account.sendVerificationEmail(email);
    } else {
        var action = account.sendVerificationOnUsername(username);
    }

    action.then(theEmail => {
        if (responseFormat == 'json') {
            res.send({ success: 'true', email: theEmail });
        } else {
            //render html response
            response.message = "A verification link has been sent to " + theEmail + ".";
            res.render('index', response);
        }
    }).catch(err => {
        if (responseFormat == 'json') {
            res.send({ success: 'false', message: err });
        } else {
            response.message = err.message; 
            res.render('index', response);
        }
    });
});

/**
 * Checks an account email verification code.
 * 
 */
router.get('/verification', (req, res) => {
    let email = req.query.email;
    let code = req.query.code;
    let response = {title: "Account Verification"};
        
    if(email && code) {
        account.validateEmail(email, code)
        .then(() => {
            response.message = "Your email has been verified. You can now use our app!";
            res.render('index', response);
    }).catch((err) => {
            //If anything happened, send generic error to user and print stacktrace to console
            response.message = "Unable to verify email address. " + err.message;
            
            if (err.code == 209) {
                //link is expired or otherwise invalid so give user option to send another one
                let link = "http://tcss450a18-team8.herokuapp.com/account/verification/send?email=" 
                    + email;
                response.link = "a href=\"" + link + "\">Send another link.</a"
            }
            
            res.render('index', response);
            console.dir(err);
        })
    } else {
        response.message = "Invalid input.";
        res.render('index', response);
    }
});

/**
 * Sends a password reset code to the email.
 */
router.post("/recover/initiate", (req, res) => {
    let email = req.body.email;

    account.sendRecoveryEmail(email)
    .then(() => { res.send({ success: true }) })
    .catch(err => { res.send({ success: false, message: err }) })
});

/**
 * Verifies that a password reset code is valid. Does not change the user state.
 */
router.post("/recover/check", (req, res) => {
    let email = req.body.email;
    let code = req.body.code;

    account.isRecoveryCodeValid(email, code)
    .then(() => { res.send({ success: true }) })
    .catch(err => { res.send({ success: false, message: err }) })
});

/**
 * Resets a password to the new password given a
 * valid reset code.
 */
router.post("/password/reset", (req, res) => {
    let email = req.body.email;
    let code = req.body.code;
    let newPassword = req.body.newPassword;

    account.resetPassword(email, code, newPassword)
    .then(() => { res.send({ success: true }) })
    .catch(err => { res.send({ success: false, message: err }) })
});

/**
 * Changes a password to the new password given the
 * valid old password.
 */
router.post("/password/change", (req, res) => {
    let email = req.body.email;
    let oldPassword = req.body.oldPassword;
    let newPassword = req.body.newPassword;

    account.changePassword(email, oldPassword, newPassword)
    .then(() => { res.send({ success: true }) })
    .catch(err => { res.send({ success: false, message: err }) })
});

/**
 * Changes a username given the valid account password.
 */
router.post("/username/change", (req, res) => {
    let token = req.body.token;
    let newUsername = req.body.newUsername;

    account.changeUsername(token, newUsername)
    .then(() => { res.send({ success: true }) })
    .catch(err => { res.send({ success: false, message: err }) })
});

module.exports = router;
