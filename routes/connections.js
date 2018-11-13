// express is the framework we're going to use to handle requests
const express = require('express');

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");

// provides resource to verify and manage a member account
const connections = require('../utilities/connections_service');
const firebase = require('../utilities/firebase_services');
let db = require('../utilities/utils').db;

// create the router
var router = express.Router();
router.use(bodyParser.json());

/**
 * Get all messages from any conversation between the caller and another user.
 */
router.post('/add', (req, res) => {
    let token = req.body['token'];
    let otherUser = req.body['email'];
    res.send({"test":"testestes"});
});

router.post('/get', (req, res) => {
    let token = req.body['token'];
    let otherUser = req.body['email'];
    res.send({"test":"testestes"});
});

router.post('/search', (req, res) => {
    let token = req.body['token'];
    let searchStrings = "" + req.body['string'].toLowerCase();
    searchStrings = searchStrings.split(" ", 2);
    let id;
    //res.send({"test":connections.getIdFromToken(token)['memberid']});
    db.one("SELECT memberid FROM fcm_token WHERE token=$1", token)
    .then(data => {
        id = data['memberid']
        if (searchStrings[1] === undefined) {
            db.any('SELECT * FROM members WHERE (LOWER(firstname) LIKE \'%$1#%\' OR LOWER(lastname) LIKE \'%$1#%\' OR LOWER(username) LIKE \'%$1#%\'' +
             'OR LOWER(email)=$1) AND NOT memberid=$2', [searchStrings[0], id])
            .then(data => {
                res.send({
                    "data":data
                })
            }).catch(err => 
                console.log(err));
        } else {
            db.any('SELECT * FROM members WHERE (LOWER(firstname) LIKE \'%$1#%\' OR LOWER(firstname) LIKE \'%$2#%\' OR LOWER(lastname) LIKE \'%$1#%\'' + 
            'OR LOWER(lastname) LIKE \'%$2#%\' OR LOWER(username) LIKE \'%$1#%\' OR LOWER(email)=$1) AND NOT memberid=$3', [searchStrings[0], searchStrings[1], id])
            .then(data => {
                res.send({
                    "data":data
                })
            }).catch(err => 
                console.log(err));
        }
    }).catch(err => 
        console.log(err));
});

router.post('/remove', (req, res) => {
    let token = req.body['token'];
    let otherUser = req.body['email'];
    res.send({"test":"testestes"});
});

module.exports = router;