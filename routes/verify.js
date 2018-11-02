//express is the framework we're going to use to handle requests
const express = require('express');

//Create connection to Heroku Database
let db = require('../utilities/utils').db;

let getHash = require('../utilities/utils').getHash;

var router = express.Router();

router.get('/', (req, res) => {
    let user = { email: req.query.email, vCode: req.query.code };
    let response = {title: "Account Verification"};

        
    if(user.email && user.vCode) {
        db.one('SELECT MemberID, Salt, Hash FROM Members NATURAL JOIN RegistrationHashes WHERE Email=$1', [user.email])
        .then(data => {
            // if the hash values do not match then throw an exception
            if (data.hash != getHash(user.vCode, data.salt)) {
                throw({ message: "registration hash codes do not match"});
            } else {
                user.memberid = data.memberid;
                console.log("Verified");
            }
        }).then(() => {
            return db.none("UPDATE Members SET verification=1 WHERE memberid=$1", [user.memberid]);
        }).then(() => {
            return db.none("DELETE FROM RegistrationHashes WHERE memberid=$1", [user.memberid]);
        }).then(() => {
            response.message = "Your email address has been confirmed. You may now use our app!";
            res.render('index', response);
        }).catch((err) => {
            //If anything happened, send generic error to user and print stacktrace to console
            console.dir(err.message);
            response.message = "Unable to verify email address."
            res.render('index', response);
        })
    } else {
        response.message = "Invalid input.";
        res.render('index', response);
    }

});

module.exports = router;
