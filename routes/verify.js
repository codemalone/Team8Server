//express is the framework we're going to use to handle requests
const express = require('express');

//Create connection to Heroku Database
let db = require('../utilities/utils').db;

let getHash = require('../utilities/utils').getHash;

var router = express.Router();

router.get('/', (req, res) => {
    let email = req.query.email;
    let vCode = req.query.code;
    let vCodeHash;
    let response = {title: "Account Verification"};
    
    if(email && vCode) {
        db.task(t => {
            // get the memberid and salt for this email, hash the supplied verification code,
            // and then lookup the stored hashvalue.
            return t.one('SELECT MemberID, Salt FROM Members WHERE Email=$1', [email])
                .then(data => {
                    vCodeHash = getHash(vCode, data.salt);
                    return t.one('SELECT hash FROM registrationhashes WHERE memberid=$1', [data.memberid]);
                });
        }).then(data => {
            // if the hash values match then change the member status to verified
            if (data.hash != vCodeHash) {
                throw({ message: "registration hash codes do not match"});
            } else {
                console.log("Verified");
                return db.none("UPDATE Members SET verification=1 WHERE email=$1", [email]);
            }
        }).then(() => {
            response.message = "Your email address has been confirmed. You may now use our app!";
            res.render('index', response);
        }).catch((err) => {
            //If anything happened, it wasn't successful
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
