// express is the framework we're going to use to handle requests
const express = require('express');

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");

// provides resource to verify and manage a member account
const chat = require('../utilities/chat_service');

// for now we can put the fcm module here
let fcm_functions = require('../utilities/utils').fcm_functions;
let db = require('../utilities/utils').db;

// create the router
var router = express.Router();
router.use(bodyParser.json());

/**
 * Get all messages from any conversation between the caller and another user.
 */
router.post('/message/get', (req, res) => {
    let token = req.body.token;
    let otherUser = req.body.otherUser;

    chat.doSomethingCool(token, otherUser)
        .then(user => { res.send({ success: true, user: user }) })
        .catch(err => { res.send({ success: false, message: err }) })
});



//send a message to all users "in" the chat session with chatId
router.post("/message/send", (req, res) => {
    let email = req.body['email'];
    let message = req.body['message'];
    let chatId = req.body['chatId'];
    if(!email || !message || !chatId) {
        res.send({
            success: false,
            error: "Username, message, or chatId not supplied"
        });
        return;
    }
    //add the message to the database
    let insert = 'INSERT INTO Messages(ChatId, Message, MemberId) SELECT $1, $2, '
                    + 'MemberId FROM Members WHERE email=$3';
    db.none(insert, [chatId, message, email])
    .then(() => {

        //send a notification of this message to ALL members with registered tokens
        db.manyOrNone('SELECT * FROM FCM_Token')
        .then(rows => {
            rows.forEach(element => {
                fcm_functions.sendToIndividual(element['token'], message, email);
            });
            res.send({
                success: true
            });
        }).catch(err => {
            res.send({
                success: false,
                error: err,
            });
        })
    }).catch((err) => {
        res.send({
            success: false,
            error: err,
        });
    });
});

//Get all of the messages from a chat session with id chatid
router.post("/message/getAll", (req, res) => {
    let chatId = req.body['chatId'];

    let query = `SELECT Members.Email, Messages.Message, 
                to_char(Messages.Timestamp AT TIME ZONE 'PDT', 'YYYY-MM-DD HH24:MI:SS.US' ) AS Timestamp
                FROM Messages
                INNER JOIN Members ON Messages.MemberId=Members.MemberId
                WHERE ChatId=$1 
                ORDER BY Timestamp DESC`
    db.manyOrNone(query, [chatId])
    .then((rows) => {
        res.send({
            messages: rows
        })
    }).catch((err) => {
        res.send({
            success: false,
            error: err
        })
    });
});

module.exports = router;
