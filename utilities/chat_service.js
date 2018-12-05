//Get the connection to Heroku Database
let db = require('./utils.js').db;

// firebase module
let fcm_functions = require('../utilities/utils').fcm_functions;

//Error codes returned on failure
const error = require('./error_codes.js');

function addUserToConversation(token, theirEmail, chatId) {
    if(!(token && theirEmail && chatId)) {
        return _handleMissingInputError();
    }

    let thisUser;
    let theirMemberId;
    
    return _getUserOnToken(token)
        .then(user => {
            thisUser = user;
            // check if the other user has a connection to the caller
            return _getConnectionId(thisUser.memberid, theirEmail);
        }).then(connection => {
            theirMemberId = connection.memberid;
            // check if the caller is part of the specified chat
            return _isUserInChat(thisUser.memberid, chatId)
        }).then(result => {
            if (result) {
                _inviteUserToChat(theirMemberId, thisUser.username, chatId);
            } else {
                _handleSessionError(error.INVALID_CHATID);
                
            }
        })
}

function addConversation(token, theirEmail) {
    if(!(token && theirEmail)) {
        return _handleMissingInputError();
    }

    let myMemberId;
    let theirMemberId;
    let isNewConversation;
    let result = new Object();
    
    return _getUserOnToken(token)
        .then(user => {
            myMemberId = user.memberid;
            // check if the other user has a connection to the caller
            return _getConnectionId(myMemberId, theirEmail);
        }).then(connection => {
            theirMemberId = connection.memberid;
            // check if the two users have an active chat
            return _getChatId(myMemberId, theirMemberId)
        }).then(chat => {
            if (chat) {
                result.chatId = chat.chatid;
                return _getAllMessages(chat.chatid);
            } else {
                isNewConversation = true;
                return _createNewChat(myMemberId, theirMemberId);
            }
        }).then(data => {
            if (isNewConversation) {
                result.chatId = data.chatid;
                result.messages = new Array();
            } else {
                result.messages = data;
            }
            
            return result;
        })
}

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

    let result = { chatId };

    return _getUserOnToken(token)
        .then(() => _getAllMessages(chatId))
        .then(messages => {
            result.messages = messages;
            return result;
        })
}       

function getAllMembers(token, chatid) {
    if (!(token && chatid)) {
        return _handleMissingInputError();
    }

    let result = { chatid };

    return _getUserOnToken(token)
        .then(() => {
            return _addAllUsers(result);
        }).then(() => {
            return result;
        })    
}

function leavePrivateChat(myId, theirId) {
    _getChatId(myId, theirId)
    .then(chatId => {
        if (chatId)
            _removeFromChat(myId, chatId);
    })
}

function leaveChat(token, chatid) {
    if (!(token && chatid)) {
        return _handleMissingInputError();
    }

    return _getUserOnToken(token)
        .then(user => {
            return _removeFromChat(user.memberid, chatid);
        })    
}

function sendMessage(token, chatId, message) {
    if (!(chatId && message && token)) {
        // token not required yet because we are not passing it from app
        return _handleMissingInputError();
    }
    
    // get user on email because that's all we have
    return _getUserOnToken(token)
        .then(data => {
            user = data;
            return _addMessage(chatId, message, user.memberid);
        }).then(() => _sendChatMessage(user.username, user.memberid, chatId, message));
}

/**
 * Returns details for all chats that the user belongs to.
 * @param {String} token 
 */
function getAllChatDetails(token) {
    let result = new Array();
    let user;

    return _getUserOnToken(token)
        .then(data => {
            user = data;
            return _getAllChats(user.memberid)
        }).then(chats => {
            result = chats;
            let promises = new Array();
            
            result.forEach(element => {
                // add an array of all users belonging to the chat
                promises.push(_addAllUsers(element));
            })
            return Promise.all(promises);
        }).then(() => {
            let promises = new Array();
            
            result.forEach(element => {
                // add the most recent message for the chat
                promises.push(_addRecentMessage(element, user));
            })
            return Promise.all(promises);
        }).then(() => {
            // the finished chat object array is returned
            return result;
        })
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

// add user to conversation and then send notification
function _inviteUserToChat(theirId, senderName, chatId) {
    let insert = `INSERT INTO chatmembers(memberid, chatid) VALUES ($1,$2)`

    return db.none(insert, [theirId, chatId])
        .then(() => {
            return db.oneOrNone('SELECT * FROM FCM_Token WHERE memberid=$1', [theirId])
        }).then(rows => {
                fcm_functions.notifyChatRequest(rows['token'], senderName, chatId);
        }).catch(err => _handleDbError(err));
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
    let query = `SELECT Members.Email, Members.Username, Messages.Message, 
    to_char(Messages.Timestamp AT TIME ZONE 'PST', 'YYYY-MM-DD HH24:MI:SS.US' ) AS Timestamp
    FROM Messages
    INNER JOIN Members ON Messages.MemberId=Members.MemberId
    WHERE ChatId=$1 
    ORDER BY Timestamp DESC`

    return db.any(query, [chatId])
        .catch(err => _handleDbError(err));
}

function _getConnectionId(myId, theirEmail) {
    let query = `SELECT DISTINCT AllConnections.memberid FROM
                 (
                    (SELECT * FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_b WHERE memberid_a=$1 AND verified=1)
                    UNION
                    (SELECT * FROM Members INNER JOIN Contacts ON Members.memberid=Contacts.memberid_a WHERE memberid_b=$1 AND verified=1)
                 ) AS AllConnections
                 WHERE AllConnections.email=$2`

    return db.one(query, [myId, theirEmail])
        .catch(err => {
            if (err.code == 0) {
                _handleSessionError(error.INVALID_CONNECTION);
            } else {
                _handleDbError(err);
            }
        });
}

function _isUserInChat(myId, chatId) {
    let query = `select * FROM chatmembers WHERE memberid=$1 and chatid=$2`

    return db.oneOrNone(query, [myId, chatId])
        .then(row => {
            if (row) {
                return true;
            } else {
                return false;
            }
        }).catch(err => _handleDbError(err));
}

function _removeFromChat(myId, chatId) {
    let query = `DELETE FROM Chatmembers WHERE memberid=$1 and chatid=$2`

    return db.none(query, [myId, chatId])
        .catch(err => _handleDbError(err));
}

function _getChatId(myId, theirId) {
    let query = `select TblA.chatid FROM chatmembers AS TblA INNER JOIN chatmembers AS TblB ON TblA.chatid=TblB.chatid
                 WHERE TblA.memberid=$1 AND TblB.memberid=$2`
    
    let query2 = `select count(*) FROM Chatmembers WHERE chatid=$1 group by chatid`

    let result = false;

    // this query only works for "private chat" where exactly one chat includes both users
    return db.any(query, [myId, theirId])
        .then(rows => {
            let tasks = new Array();

            rows.forEach(element => {
                tasks.push(db.one(query2, element['chatid'])
                    .then(data => {
                        if (data.count == 2) {
                            result = element['chatid'];
                        }
                    })
                );
            })

            return Promise.all(tasks);
        }).then(() => {
            return result;
        }).catch(err => _handleDbError(err));
}

function _createNewChat(myId, theirId) {
    let newChatInsert = `INSERT INTO Chats(name) VALUES ('Private Chat') RETURNING chatid`
    let membersInsert = `INSERT INTO ChatMembers(chatid, memberid) VALUES ($1, $2),($1, $3)`

    let result;

    return db.task(t => {
        return t.one(newChatInsert)
            .then(data => {
                result = data;
                return t.none(membersInsert, [data.chatid, myId, theirId]);
            }).then(() => {
                return result;
            }).catch(err => _handleDbError(err));
    });
}

function _getAllChats(memberId) {
    let chatQuery = `SELECT chatid FROM Chatmembers WHERE memberid=$1`
    
    return db.manyOrNone(chatQuery, [memberId])
        .catch(err => _handleDbError(err));
}

function _addAllUsers(chat) {
    let userQuery = `SELECT username FROM Members NATURAL JOIN Chatmembers WHERE chatid=$1`

    let usernames = new Array();

    return db.manyOrNone(userQuery, [chat.chatid])
        .then(users => {
            if (users) {
                users.forEach(element => {
                    usernames.push(element.username);
                });
                chat.users = usernames;
            }
        })
        .catch(err => _handleDbError(err));
}

function _addRecentMessage(chat, user) {
    let msgQuery = `SELECT Messages.*, Members.username
                    FROM Messages NATURAL JOIN Members
                    WHERE timestamp=(
                      SELECT MAX(timestamp) FROM messages WHERE chatid=$1
                    )`

    return db.oneOrNone(msgQuery, [chat.chatid])
        .then(msg => {
            if (msg) {
                let displayName = "";

                if (msg.username == user.username) {
                    displayName = "You: ";
                } else if (chat.users.length > 2) {
                    displayName = msg.username + ": ";
                }
                                
                chat.recentMessage = displayName + msg.message;
            } else {
                chat.recentMessage = "";
            }
        })
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
        })
        .catch(err => _handleDbError(err));
}

function _sendChatMessage(senderName, senderId, chatId, message) {
    return db.manyOrNone('SELECT token, memberid FROM FCM_Token NATURAL JOIN ChatMembers WHERE chatid=$1', [chatId])
        .then(rows => {
            rows.forEach(element => {
                fcm_functions.sendToIndividual(element['token'], message, senderName, chatId, element['memberid'] != senderId);
            });
        })
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
    getAllMessages, sendMessage, addConversation, addUserToConversation,
    getAllChatDetails, getAllMembers, leaveChat, leavePrivateChat
}
