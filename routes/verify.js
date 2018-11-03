//express is the framework we're going to use to handle requests
const express = require('express');

//Create connection to Heroku Database
let validateEmail = require('../utilities/account').validateEmail;

var router = express.Router();

router.get('/', (req, res) => {
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

module.exports = router;
