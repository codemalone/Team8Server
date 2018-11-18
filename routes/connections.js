// express is the framework we're going to use to handle requests
const express = require('express');

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");

// provides resource to verify and manage a member account
const connections = require('../utilities/connections_service.js');

// connection to Heroku database
let db = require('../utilities/utils').db;

// create the router
var router = express.Router();
router.use(bodyParser.json());

// get list of current OR sent OR received connections
router.post('/get', (req, res) => {
    let token = req.body['token'];
    
    connections.getAllConnections(token)
    .then(result => res.send({ id:connections._getIdFromToken(token), data: result}))
    .catch(err => res.send({ success: false, error: err}));
});


router.post('/get/active', (req, res) => {
    let token = req.body['token'];
    db.one("SELECT memberid FROM fcm_token WHERE token=$1", token)
    .then(data => {
        connections.getActiveConnections(token)
        .then(result => res.send({ id:data['memberid'], data: result}))
        .catch(err => res.send({ success: false, error: err}));
    }).catch(err => res.send({ success: false, error: err}));
});

router.post('/get/pending', (req, res) => {
    let token = req.body['token'];
    db.one("SELECT memberid FROM fcm_token WHERE token=$1", token)
    .then(data => {
        connections.getPendingConnections(token)
        .then(result => res.send({ id:data['memberid'], data: result}))
        .catch(err => res.send({ success: false, error: err}));
    }).catch(err => res.send({ success: false, error: err}));
});

router.post('/get/received', (req, res) => {
    let token = req.body['token'];
    db.one("SELECT memberid FROM fcm_token WHERE token=$1", token)
    .then(data => {
        connections.getReceivedConnections(token)
        .then(result => res.send({ id:data['memberid'], data: result}))
        .catch(err => res.send({ success: false, error: err}));
    }).catch(err => res.send({ success: false, error: err}));
});

// connection search
router.post('/search', (req, res) => {
    let token = req.body['token'];
    let searchStrings = "" + req.body['string'].toLowerCase();
    searchStrings = searchStrings.split(" ", 2);
    let id;
    db.one("SELECT memberid FROM fcm_token WHERE token=$1", token)
        .then(data => {
            id = data['memberid']
            if (searchStrings[1] === undefined) {
                db.any('SELECT DISTINCT members.firstname, members.lastname, members.username, members.email, members.memberid, contacts.memberid_a, contacts.memberid_b, contacts.verified FROM members LEFT JOIN contacts ON ((contacts.memberid_a=members.memberid OR contacts.memberid_b=members.memberid) AND (contacts.memberid_a=$2 OR contacts.memberid_b=$2)) WHERE (LOWER(members.firstname) LIKE \'%$1#%\' OR LOWER(members.lastname) LIKE \'%$1#%\' OR LOWER(members.username) LIKE \'%$1#%\'' +
                    'OR LOWER(members.email)=$1) AND NOT members.memberid=$2', [searchStrings[0], id])
                    .then(data => {
                        data =
                            res.send({
                                "id": id,
                                "data": data
                            })
                    }).catch(err =>
                        console.log(err));
            } else {
                db.any('SELECT DISTINCT members.firstname, members.lastname, members.username, members.email, members.memberid, contacts.memberid_a, contacts.memberid_b, contacts.verified FROM members LEFT JOIN contacts ON ((contacts.memberid_a=members.memberid OR contacts.memberid_b=members.memberid) AND (contacts.memberid_a=$3 OR contacts.memberid_b=$3)) WHERE (LOWER(members.firstname) LIKE \'%$1#%\' OR LOWER(members.firstname) LIKE \'%$2#%\' OR LOWER(members.lastname) LIKE \'%$1#%\' OR LOWER(members.lastname) LIKE \'%$2#%\' OR LOWER(members.username) LIKE \'%$1#%\'' +
                    'OR LOWER(members.email)=$1) AND NOT members.memberid=$3', [searchStrings[0], searchStrings[1], id])
                    .then(data => {
                        res.send({
                            "id": id,
                            "data": data
                        })
                    }).catch(err =>
                        console.log(err));
            }
        }).catch(err =>
            console.log(err));
});

// cancel invite OR decline invite OR delete connection
router.post('/remove', (req, res) => {
    let token = req.body['token'];
    let otherUser = req.body['email'];
    db.one('SELECT memberid FROM fcm_token WHERE token=$1', token)
        .then(data => {
            id = data['memberid']
            db.one('SELECT memberid FROM members WHERE email=$1', otherUser)
                .then(otherData => {
                    db.none('DELETE FROM contacts WHERE (memberid_a=$1 OR memberid_b=$1) AND (memberid_a=$2 OR memberid_b=$2)', [otherData['memberid'], id])
                    .then(data => {
                        res.send({
                            "success": true
                        })
                    }).catch(err => 
                        console.log(err));
                }).catch(err =>
                    console.log(err));
        }).catch(err =>
            console.log(err));
});

// send invite
router.post('/add', (req, res) => {
    let token = req.body['token'];
    let otherUser = req.body['email'];
    db.one('SELECT memberid FROM fcm_token WHERE token=$1', token)
    .then(data => {
        db.one('SELECT memberid FROM members WHERE email=$1', otherUser)
        .then(otherData => {
            db.any('INSERT INTO contacts (memberid_a, memberid_b, verified) VALUES ($1, $2, 0) ON CONFLICT ON CONSTRAINT memberConstraint DO UPDATE SET verified=1', [data['memberid'], otherData['memberid']])
            .then(nullData => {
                connections.notifyConnectionRequest(data['memberid'], otherData['memberid']);
                res.send({
                    "success": true
                })
            }).catch(err => 
                db.any('UPDATE contacts SET verified=1 WHERE (memberid_a=$1 AND memberid_b=$2) OR (memberid_a=$2 AND memberid_b=$1)', [data['memberid'], otherData['memberid']])
                .then(data => {
                    res.send({
                        "success": true
                    })
                }).catch(err => console.log(err)));
        }).catch(err => console.log(err));
    }).catch(err => 
        console.log(err));
});

module.exports = router;