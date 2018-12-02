//Get the connection to Heroku Database
let db = require('./utils.js').db;

//Error codes returned on failure
const error = require('./error_codes.js');

//FCM Module
const fcm = require('./firebase_services.js').fcm_functions;

/**
 * Standardized requests: select members based on some constraints. Results are stripped down and returned to caller.
 * Additional parameters can be passed as an array. Note that the first query variable is reserved for the caller's
 * memberid. Additional query parameters must be referenced begin with '$2'.
 * @throws DB_ERROR if query is not valid
 * @throws INVALID_TOKEN if a caller is not authenticated
 */

function getAllConnections(token) {
    let query = `(SELECT * FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_b WHERE memberid_a=$1)
                 UNION
                 (SELECT * FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_a WHERE memberid_b=$1)`
    return _executeConnectionRequest(token, query);
}

function getActiveConnections(token) {
    let query = `(SELECT * FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_b WHERE memberid_a=$1 AND verified=1)
                 UNION
                 (SELECT * FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_a WHERE memberid_b=$1 AND verified=1)`
    return _executeConnectionRequest(token, query);
}

function getActiveConnectionsNotInChat(token, chatId) {
    let query = `SELECT * FROM
                 (  
                  (SELECT Members.* FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_b WHERE memberid_a=$1 AND verified=1)
                  UNION
                  (SELECT Members.* FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_a WHERE memberid_b=$1 AND verified=1)
                 ) AS Connections
                 WHERE Connections.memberid NOT IN (SELECT memberid FROM Chatmembers WHERE chatid=$2)`
    return _executeConnectionRequest(token, query, [chatId]);
}

function getPendingConnections(token) {
    let query = `SELECT * FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_b WHERE memberid_a=$1 AND verified=0`
    return _executeConnectionRequest(token, query);
}

function getReceivedConnections(token) {
    let query = `SELECT * FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_a WHERE memberid_b=$1 AND verified=0`
    return _executeConnectionRequest(token, query);    
}

/**
 * A user is returned with all information. Package only the desired information for return.
 */
function _packageUsers(rows) {
    let data = new Array();

    rows.forEach(element => {
        data.push({

            // change these as needed for ALL returned results            
            firstname: element.firstname,
            lastname: element.lastname,
            username: element.username,
            email: element.email,
            memberid: element.memberid,
            memberid_a: element.memberid_a,
            memberid_b: element.memberid_b,
            verified: element.verified

        });
    });
    return data;
}

/**
 * Executes a standardized request.
 * @param {string} token valid token will link to a registered user
 * @param {string} query standardized request for users
 */
function _executeConnectionRequest(token, query, params) {
    if (!(token && query)) {
        _handleMissingInputError();
    }
        
    return _getIdFromToken(token)
    .then(id => {
        return _executeQuery(query, [id].concat(params));
    }).then(rows => {
        return _packageUsers(rows);
    });
}

function notifyConnectionRequest(senderId, recipientId) {
    // get recipient token and sender's screen name
    let senderName;
    
    return _getDisplayNameFromId(senderId)
        .then(sender => {
            senderName = sender['username'];
            return _getTokenFromId(recipientId);
        }).then(recipient => {
            fcm.notifyConnectionRequest(recipient['token'], senderName);
        }).catch(err => {
            console.dir({message: "Failed to send notification request!", error: err});
        })
}


// helpers
function _getIdFromToken(token) {
    return db.one("SELECT memberid FROM FCM_Token WHERE token=$1", [token])
        .then(data => {
            return data['memberid'];
        })
        .catch(err => {
            if (err.code == 0) {
                _handleSessionError(error.INVALID_TOKEN);
            } else {
                _handleDbError(err);
            }
        });
}

function _getTokenFromId(memberid) {
    return db.one("SELECT token FROM FCM_Token WHERE memberid=$1", [memberid])
        .catch(err => _handleDbError(err));
}

function _getDisplayNameFromId(memberid) {
    return db.one("SELECT username FROM Members WHERE memberid=$1", [memberid])
        .catch(err => _handleDbError(err));        
}


function _executeQuery(query, params) {
    return db.any(query, params)
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
    getAllConnections, getActiveConnections, getPendingConnections, getReceivedConnections, _getIdFromToken,
    notifyConnectionRequest, getActiveConnectionsNotInChat
}
