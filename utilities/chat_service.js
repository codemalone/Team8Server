//Get the connection to Heroku Database
let db = require('./utils.js').db;

// firebase module
let fcm_functions = require('../utilities/utils').fcm_functions;

//Error codes returned on failure
const error = require('./error_codes.js');

/**
 * Get all messages for the given chatId.
 * @param {*} token 
 * @param {*} chatId 
 */
function getAllMessages(token, chatId) {
    // args must not be null
    if (!(token && chatId)) {
        return _handleMissingInputError();
    }

    // start a chain of events that eventually returns something useful
    return _getUserOnToken(token)
        .then(() => _getAllMessages(chatId));
}


function somethingThatNeedsUser(token) {
    if (!(token)) {
        return _handleMissingInputError();
    }

    //check the token
    return _getUserOnToken(token)
        .then(user => {

            //now we have a user object
            console.log("Hello " + user.firstname);

            return _stripUser(user);
        });
}

function sendMessage(token, email, chatId, message) {
    if (!(email, chatId, message)) {
        // token not required yet because we are not passing it from app
        return _handleMissingInputError();
    }

    // get user on email because that's all we have
    return _getUserOnEmailNoPassword(email) 
        .then(user => _addMessage(chatId, message, user.memberid))
        .then(() => _sendGlobalMessage(email, message));
}

// Helper functions for synchronous repeated work

/**
 * returns a user object without any sensitive information
 */ 
function _stripUser(theUser) {
    return {
        first: theUser.firstname,
        last: theUser.lastname,
        username: theUser.username,
        email: theUser.email
    }
}


// Database queries
function _getUserOnToken(token) {
    return db.one('SELECT * FROM Members NATURAL JOIN FCM_Token WHERE token=$1', [token])
        .catch(err => {
            if (err.code == 0) {
                _handleSessionError(error.INVALID_TOKEN);
            } else {
                _handleDbError(err);
            }
        });            
}

function _getAllMessages(chatId) {
    let query = `SELECT Members.Email, Messages.Message, 
    to_char(Messages.Timestamp AT TIME ZONE 'PDT', 'YYYY-MM-DD HH24:MI:SS.US' ) AS Timestamp
    FROM Messages
    INNER JOIN Members ON Messages.MemberId=Members.MemberId
    WHERE ChatId=$1 
    ORDER BY Timestamp DESC`

    return db.any(query, [chatId])
        .catch(err => _handleDbError(err));
}

function _addMessage(chatId, message, memberId) {
    let insert = 'INSERT INTO Messages(ChatId, Message, MemberId) VALUES($1, $2, $3)';
                        
    return db.none(insert, [chatId, message, memberId])
        .catch(err => _handleDbError(err));
}

function _sendGlobalMessage(senderEmail, message) {
    return db.manyOrNone('SELECT * FROM FCM_Token')
        .then(rows => {
            rows.forEach(element => {
                fcm_functions.sendToIndividual(element['token'], message, senderEmail);
            });
            Promise.resolve();
        })
        .catch(err => _handleDbError(err));
}

// take this out after token passing is implemented in app
function _getUserOnEmailNoPassword(email) {
    return db.oneOrNone('SELECT * FROM Members WHERE Email=$1', [email])
        .catch(err => _handleDbError(err));
}


// Error handlers
function _handleDbError(err) {
    // print detailed error message to console
    console.dir({error: error.DATABASE, message: err});
    // must throw error to prevent return to caller
    throw(error.DATABASE);
}

function _handleSessionError(err) {
    // print error message to console
    console.dir({error: err});
    // must throw error to prevent return to caller
    throw(err);
}

function _handleMissingInputError() {
    // simple handling of null parameters rejects promise execution
    return Promise.reject(error.MISSING_PARAMETERS);
}

// any function included in exports will be public
module.exports = {
    getAllMessages, sendMessage, somethingThatNeedsUser
}
