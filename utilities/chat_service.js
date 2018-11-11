//Get the connection to Heroku Database
let db = require('./utils.js').db;

//Get the hasher
const getHash = require('./utils.js').getHash;

//Error codes returned on failure
const error = require('./error_codes.js');

/**
 * A service function can be called by an endpoint. Pass in a token and
 * whatever else is needed.
 * @param {string} token
 * @param {string} otherUser
 */
function doSomethingCool(token, otherUser) {
    // args must not be null
    if (!(token && otherUser)) {
        return _handleMissingInputError();
    }

    // start a chain of events that eventually returns something useful
    return _getUserOnToken(token)
        .then(thisUser => {

            //if a user not returned then the token is bogus
            if (!thisUser) {
                _handleSessionError(error.INVALID_TOKEN);
            }

            // token is good and we have the associated thisUser
            // to do something with
            
            

            // put a return statement here to end the chain, or to pass
            // a value on to the next chain member
            return _addNewContact(thisUser, otherUser)
            
        }).then(() => {
            // when the call to _addNewContact completes it will return here
            // so assume that it was a success!



            return finalResultToEndpoint;
        })
}


// Helper functions for synchronous repeated work

function _isPassword(theUser, theirPassword) {
    let salt = theUser.salt;
    let ourSaltedHash = theUser.password; 

    //Combined their password with our salt, then hash
    let theirSaltedHash = getHash(theirPassword, salt); 

    // If provided password is valid then return true
    return ourSaltedHash == theirSaltedHash;
}


// Database queries

function _addUser(first, last, username, email, password, salt) {
    let params = [first, last, username, email, password, salt]
    
    return db.none("INSERT INTO MEMBERS(FirstName, LastName, Username, Email, Password, Salt)"
            + "VALUES ($1, $2, $3, $4, $5, $6)", params)
        .catch(err => {
            //custom error handler to determine if user already exists
            if (err.code == "23505" && err.constraint == "members_email_key") {
                _handleAccountError(error.EMAIL_ALREADY_EXISTS);
            } else if (err.code == "23505" && err.constraint == "members_username_key") {
                _handleAccountError(error.USERNAME_ALREADY_EXISTS);
            } else {
                _handleDbError(err);
            }
        })
}

function _getUserOnEmailNoPassword(email) {
    return db.oneOrNone('SELECT * FROM Members WHERE Email=$1', [email])
        .catch(err => _handleDbError(err));
}

function _getUserOnUsernameNoPassword(username) {
    return db.oneOrNone('SELECT * FROM Members WHERE Username=$1', [username])
        .catch(err => _handleDbError(err));
}

function  _getUserAndResetCode(email) {
    return db.oneOrNone('SELECT * FROM Members LEFT JOIN ResetCodes ON ' +
            'Members.MemberID = ResetCodes.MemberID ' +
            'WHERE Email=$1 AND current_timestamp - interval \'$2 minute\' < timestamp',
            [email, ACCOUNT_RECOVERY_CODE_EXPIRATION])
        .catch(err => _handleDbError(err));
}

function _getUserAndValidationCode(email) {
    return db.oneOrNone('SELECT * FROM Members LEFT JOIN RegistrationHashes ON ' + 
            'Members.memberid = RegistrationHashes.memberid ' +
            'WHERE Email=$1 AND current_timestamp - interval \'$2 minute\' < timestamp',
            [email, ACCOUNT_VERIFICATION_CODE_EXPIRATION])
        .catch(err => _handleDbError(err));
}

function _removeRegistrationCodes(memberid) {
    return db.none("DELETE FROM registrationhashes WHERE memberid=$1", [memberid])
        .catch(err => _handleDbError(err));
}

function _removeResetCode(memberid) {
    return db.none("DELETE FROM ResetCodes WHERE MemberID = $1", [memberid])
        .catch(err => _handleDbError(err));
}

function _setUserIsVerified(memberid) {
    return db.none("UPDATE Members SET verification=1 WHERE memberid=$1", [memberid])
        .catch(err => _handleDbError(err));
}

function _setUserPassword(memberid, newPassword) {
    let salt = crypto.randomBytes(32).toString("hex");
    let saltedHash = getHash(newPassword, salt);

    return db.none("UPDATE Members SET Password=$1, Salt=$2 WHERE Memberid=$3", [saltedHash, salt, memberid])
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
    doSomethingCool
}
