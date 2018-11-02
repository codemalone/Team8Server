//express is the framework we're going to use to handle requests
const express = require('express');

//We use this create the SHA256 hash
const crypto = require("crypto");

//Create connection to Heroku Database
let db = require('../utilities/utils').db;

let getHash = require('../utilities/utils').getHash;

let sendEmail = require('../utilities/utils').sendEmail;

var router = express.Router();

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");
router.use(bodyParser.json());

router.post('/', (req, res) => {
    res.type("application/json");

    //Retrieve data from query params
    var first = req.body['first'];
    var last = req.body['last'];
    var username = req.body['username'];
    var email = req.body['email'];
    var password = req.body['password'];

    //Verify that the caller supplied all the parameters
    //In js, empty strings or null values evaluate to false
    if(first && last && username && email && password) {
        //We're storing salted hashes to make our application more secure
        //If you're interested as to what that is, and why we should use it
        //watch this youtube video: https://www.youtube.com/watch?v=8ZtInClXe1Q
        let salt = crypto.randomBytes(32).toString("hex");
        let saltedHash = getHash(password, salt);
        let vCode = crypto.randomBytes(8).toString("hex");
        let vCodeHash = getHash(vCode, salt);

        //Use .none() since no result gets returned from an INSERT in SQL
        //We're using placeholders ($1, $2, $3) in the SQL query string to avoid SQL Injection
        //If you want to read more:https://stackoverflow.com/a/8265319
        let params = [first, last, username, email, saltedHash, salt];
        
        db.task(t => {
            return t.one("INSERT INTO MEMBERS(FirstName, LastName, Username, Email, Password, Salt)"
                    + "VALUES ($1, $2, $3, $4, $5, $6) RETURNING memberid", params)
                .then(data => {
                    return t.none("INSERT INTO REGISTRATIONHASHES(hash, memberid)" 
                        + "VALUES ($1, $2)", [vCodeHash, data.memberid]);
                });
        }).then(() => {
            // added user and verification code to db so send email
            // sendEmail(email, "Welcome!", "<strong>Welcome to our app!</strong>");
            //console.log("Sending email verification to " + email);

            let link = "http://tcss450a18-team8-test.herokuapp.com/verify?email=" + email + "&code=" + vCode;

            let msg = "Welcome to our app! Please verify this email address by clicking the link below.<p>"
                        + "<a href=\"" + link + "\">" + link + "</a>";

            sendEmail(email, "Verify your account", msg);
            res.send({
                success: true
            })

        }).catch((err) => {
            //log the error
            console.log(err);

            //If we get an error, it most likely means the account already exists
            //Therefore, let the requester know they tried to create an account that already exists
            res.send({
                success: false,
                error: err
            });
        });
    } else {
        res.send({
            success: false,
            input: req.body,
            error: "Missing required user information"
        });
    }
});

module.exports = router;
