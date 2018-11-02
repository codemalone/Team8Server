//express is the framework we're going to use to handle requests
const express = require('express');

//Create connection to Heroku Database
let db = require('../utilities/utils').db;

let getHash = require('../utilities/utils').getHash;

var router = express.Router();

const bodyParser = require("body-parser");
//This allows parsing of the body of POST requests, that are encoded in JSON
router.use(bodyParser.json());

router.post('/', (req, res) => {
    let email = req.body['email'];
    let theirPw = req.body['password'];
    
    if(email && theirPw) {
        //Using the 'one' method means that only one row should be returned
        db.one('SELECT Password, Salt, Verification FROM Members WHERE Email=$1', [email])
        //If successful, run function passed into .then()
        .then(row => {
            let salt = row['salt'];
            //Retrieve our copy of the password
            let ourSaltedHash = row['password']; 

            //Combined their password with our salt, then hash
            let theirSaltedHash = getHash(theirPw, salt); 

            //Did our salted hash match their salted hash?
            if (ourSaltedHash != theirSaltedHash) {
                throw('invalid credentials');
            }
            
            //Is the account verified
            if (row.verification == 0) {
                throw('not verified');
            }

            //After error checking send success message
            res.send({
                success: true
            });
        })
        //More than one row shouldn't be found, since table has constraint on it
        .catch((err) => {
            //If anything happened, it wasn't successful
            res.send({
                success: false,
                message: err
            });
        });
    } else {
        res.send({
            success: false,
            message: 'missing credentials'
        });
    }
});

module.exports = router;
