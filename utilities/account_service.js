//Get the connection to Heroku Database
let db = require('./utils.js').db;

//Get the hasher
const getHash = require('./utils.js').getHash;

//We use this create the SHA256 hash
const crypto = require("crypto");

//Nodemailer
const sendEmail = require('./utils.js').sendEmail;

//Error codes returned on failure
const error = require('./error_codes.js');

// Configuration
const ACCOUNT_VERIFICATION_CODE_EXPIRATION = 1440; // 1440 minutes = 24 hours
const ACCOUNT_RECOVERY_CODE_EXPIRATION = 60; // minutes

/**
 * Checks if the provided email and password are correct.
 * @param {string} email a registered user email
 * @param {string} theirPw the associated user password
 * @return {user} an object with user profile data
 * @throws {MISSING_PARAMETERS} null email or password
 * @throws {INVALID_CREDENTIALS} email or password not valid
 * @throws {USER_NOT_VERIFIED} email has not been verified
 */
function loginUserOnEmail(email, theirPw, token) {
    if (!(email && theirPw)) {
        return _handleMissingInputError();
    }

    let storedUser;

    return _getUserOnEmailNoPassword(email)
        .then(user => {
            if (!(user && _isPassword(user, theirPw))) {
                _handleAccountError(error.INVALID_CREDENTIALS);
            } else if (user.verification == 0) {
                _handleAccountError(error.USER_NOT_VERIFIED);
            } 
            
            storedUser = user;
                        
            if (token) {
                return _setSessionToken(user.memberid, token);
            } else {
                return Promise.resolve();
            }
        }).then(() => {
            return _stripUser(storedUser);
        });        
}

/**
 * Checks if the provided username and password are correct.
 * @param {string} email a registered user email
 * @param {string} theirPw the associated user password
 * @return {user} an object with user profile data
 * @throws {MISSING_PARAMETERS} null email or password
 * @throws {INVALID_CREDENTIALS} email or password not valid
 * @throws {USER_NOT_VERIFIED} email has not been verified
 */
function loginUserOnUsername(username, theirPw, token) {
    if (!(username && theirPw)) {
        return _handleMissingInputError();
    }

    return _getUserOnUsernameNoPassword(username)
        .then(user => {
            if (!(user && _isPassword(user, theirPw))) {
                _handleAccountError(error.INVALID_CREDENTIALS);
            } else if (user.verification == 0) {
                _handleAccountError(error.USER_NOT_VERIFIED);
            } 
            
            storedUser = user;
                        
            if (token) {
                return _setSessionToken(user.memberid, token);
            } else {
                return Promise.resolve();
            }
        }).then(() => {
            return _stripUser(storedUser);
        });    
}

/**
 * Adds a new user to the database.
 * @param {string} first 
 * @param {string} last 
 * @param {string} username 
 * @param {string} email 
 * @param {string} password 
 * @throws {MISSING_PARAMETERS} if any parameters are null
 */
function registerUser(first, last, username, email, password) {
    if (first && last && username && email && password) {
        // salt provided password for security
        let salt = crypto.randomBytes(32).toString("hex");
        let saltedHash = getHash(password, salt);
        
        return _addUser(first, last, username, email, saltedHash, salt)
            .then(() => {
                sendVerificationEmail(email); // async call
                //return Promise.resolve();
            })
    } else {
        return _handleMissingInputError();
    }
}

/**
 * Checks if an email address is registered and not validated. If the
 * conditions hold then a validation link is sent to the address.
 * 
 * @param {string} email address of a registered user.
 */
function sendVerificationEmail(email) {
    // email is required
    if (!email) {
        return _handleMissingInputError();
    }
    
    // store user data for the promise chain
    let storedUser; 
    
    return _getUserOnEmailNoPassword(email)
        .then(user => {
            if (!user) {
                _handleAccountError(error.INVALID_EMAIL);
            } else if (user.verification == 1) {
                _handleAccountError(error.USER_IS_VERIFIED);
            } 

            storedUser = user;        
            return _removeRegistrationCodes(storedUser.memberid);    
        }).then(() => {
            // generate and store a new code
            let vCode = crypto.randomBytes(8).toString("hex");
            let vCodeHash = getHash(vCode, storedUser.salt);
            storedUser.vCode = vCode;

            return _addRegistrationCode(storedUser.memberid, vCodeHash);
        }).then(() => {
            // email a link to the user
            let link = "http://tcss450a18-team8.herokuapp.com/account/verification?email=" 
                        + storedUser.email + "&code=" + storedUser.vCode;
            let msg = "Welcome to our app! Please verify this email address by clicking the link below.<p>"
                    + "<a href=\"" + link + "\">" + link + "</a>";
            
            sendEmail(storedUser.email, "Verify your account", msg);
            
            return storedUser.email
        });
}

/**
 * Checks if a username is registered and the email is not validated. If the
 * conditions hold then a validation link is sent to the user email address.
 * 
 * @param {string} username of a registered user.
 */
function sendVerificationOnUsername(username) {
    // username is required
    if (!username) {
        return _handleMissingInputError();
    }        
        
    // lookup email and then forward the request
    return _getUserOnUsernameNoPassword(username)
        .then(user => {
            if (!user) {
                _handleAccountError(error.INVALID_CREDENTIALS);
            }
            
            return sendVerificationEmail(user.email);    
        });
}

/**
 * Checks the provided validation code and marks a user as validated.
 * @param {*} email address of an unvalidated user.
 * @param {*} code provided in the email for validation
 */
function validateEmail(email, code) {
    if (!(email && code)) {
        return _handleMissingInputError(error.MISSING_PARAMETERS);
    }
        
    return _getUserOnEmailNoPassword(email)
        .then(user => {
            if (!user) {
                _handleAccountError(error.INVALID_EMAIL);
            } 
            
            // a user that has already been verified returns gracefully
            if (user.verification == 1) {
                return Promise.resolve();
            } 

            //otherwise we check the code
            return _getUserAndValidationCode(email)
                .then(user => {
                    // if the hash values match then update user account
                    if (user && user.hash == getHash(code, user.salt)) {
                        return _setUserIsVerified(user.memberid)
                            .then(() => _removeRegistrationCodes(user.memberid));
                    } else {
                        _handleAccountError(error.INVALID_VERIFICATION_CODE);
                    }
                });
        });
}

/**
 * Changes a user password to the specified value.
 * @param {string} email address of the user
 * @param {string} oldPassword the existing password of the user
 * @param {string} newPassword the new password to set
 */
function changePassword(email, oldPassword, newPassword) {
    if (!(email && oldPassword && newPassword)) {
        return _handleMissingInputError(error.MISSING_PARAMETERS);
    }   
    
    return _getUserOnEmailNoPassword(email)
        .then(user => {
            if (!(user && _isPassword(user, oldPassword))) {
                _handleAccountError(error.INVALID_CREDENTIALS);
            } else {
                return _setUserPassword(user.memberid, newPassword);
            }
        });
}

/**
 * Resets a user password to a new random value. The new password is 
 * emailed to the user with a message reminding them to change it again.
 * @param {*} email address of the user
 */
function resetPassword(email, code, newPassword) {
    if (!(email && code && newPassword)) {
        return _handleMissingInputError(error.MISSING_PARAMETERS);
    }   
        
    return _getUserAndResetCode(email)
        .then(user => {
            if (!user) {
                _handleAccountError(error.INVALID_RESET_CODE);
            } 

            if (user.code == getHash(code, user.salt)) {
                return _setUserPassword(user.memberid, newPassword)
                    .then(() => _removeResetCode(user.memberid));
            } else {
                _handleAccountError(error.INVALID_RESET_CODE);
            }
        });
}

function sendRecoveryEmail(email) {
    if (!(email)) {
        return _handleMissingInputError(error.MISSING_PARAMETERS);
    }
    
    // store user data for the promise chain
    let storedUser; 

    return _getUserOnEmailNoPassword(email)
        .then(user => {
            if (!user) {
                _handleAccountError(error.INVALID_EMAIL);
            } 
            
            storedUser = user;
            
            // remove any existing validation codes
            return _removeResetCode(storedUser.memberid);
        }).then(() => {
            // generate and store a new code
            let rCode = crypto.randomBytes(4).toString("hex");
            let rCodeHash = getHash(rCode, storedUser.salt);
            storedUser.rCode = rCode;

            return _addResetCode(storedUser.memberid, rCodeHash);
        }).then(() => {
            // email a code to the user
            let msg = "A password reset has been requested. Enter the code in the app when requested.<p>"
                + storedUser.rCode;

            sendEmail(storedUser.email, "Password Reset Code", msg);
            
            return Promise.resolve();
        });
}

function isRecoveryCodeValid(email, code) {
    if (!(email && code)) {
        return _handleMissingInputError(error.MISSING_PARAMETERS);
    }
    
    return _getUserAndResetCode(email)
        .then(user => {
            if (!user) {
                _handleAccountError(error.INVALID_RESET_CODE);
            } else if (user.code == getHash(code, user.salt)) {
                return Promise.resolve();
            } else {
                _handleAccountError(error.INVALID_RESET_CODE);
            }
        });
}

function changeUsername(token, newUsername) {
    if (!(token && newUsername)) {
        return _handleMissingInputError(error.MISSING_PARAMETERS);
    }

    return _getUserOnToken(token)
        .then(user => {
            if (user.username == newUsername) {
                _handleAccountError(error.USERNAME_ALREADY_EXISTS);
            } else {
                return _setUsername(user.memberid, newUsername);
            }
        });
}

// Helper functions
function _isPassword(theUser, theirPassword) {
    let salt = theUser.salt;
    let ourSaltedHash = theUser.password; 

    //Combined their password with our salt, then hash
    let theirSaltedHash = getHash(theirPassword, salt); 

    // If provided password is valid then return true
    return ourSaltedHash == theirSaltedHash;
}

function _stripUser(theUser) {
    return {
        first: theUser.firstname,
        last: theUser.lastname,
        username: theUser.username,
        email: theUser.email
    }
}

// Error handlers
function _handleDbError(err) {
    // print detailed error message to console
    console.dir({error: error.DATABASE, message: err});
    // must throw error to prevent return to caller
    throw(error.DATABASE);
}

function _handleAccountError(err) {
    // print error message to console
    console.dir({error: err});
    // must throw error to prevent return to caller
    throw(err);
}

function _handleMissingInputError() {
    // simple handling of null parameters rejects promise execution
    return Promise.reject(error.MISSING_PARAMETERS);
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

function _addRegistrationCode(memberId, hashCode) {
    return db.none("INSERT INTO registrationhashes(memberid, hash) VALUES ($1, $2)",
            [memberId, hashCode])
        .catch(err => _handleDbError(err));
}

function _addResetCode(memberId, hashCode) {
    return db.none("INSERT INTO ResetCodes(MemberID, code) VALUES ($1, $2)",
            [memberId, hashCode])
        .catch(err => _handleDbError(err));
}

function _getUserOnEmailNoPassword(email) {
    return db.oneOrNone('SELECT * FROM Members WHERE Email=$1', [email])
        .catch(err => _handleDbError(err));
}

function _getUserOnUsernameNoPassword(username) {
    return db.oneOrNone('SELECT * FROM Members WHERE Username=$1', [username])
        .catch(err => _handleDbError(err));
}

function _getUserOnToken(token) {
    return db.one("SELECT Members.* FROM Members NATURAL JOIN FCM_Token WHERE token=$1", [token])
        .then(data => {
            return data;
        })
        .catch(err => {
            if (err.code == 0) {
                _handleSessionError(error.INVALID_TOKEN);
            } else {
                _handleDbError(err);
            }
        });
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

function _setUsername(memberid, newUsername) {
    return db.none("UPDATE Members SET Username=$1 WHERE Memberid=$2", [newUsername, memberid])
        .catch(err => {
            //custom error handler to determine if username already exists
            if (err.code == "23505" && err.constraint == "members_username_key") {
                _handleAccountError(error.USERNAME_ALREADY_EXISTS);
            } else {
                _handleDbError(err);
            }
        })
}

function _setSessionToken(memberid, token) {
    return db.manyOrNone("INSERT INTO FCM_Token (memberId, token) VALUES ($1, $2) " +
            "ON CONFLICT (memberId) DO UPDATE SET token=$2;", [memberid, token])
        .catch(err => _handleDbError(err));
}

function _setUserPassword(memberid, newPassword) {
    let salt = crypto.randomBytes(32).toString("hex");
    let saltedHash = getHash(newPassword, salt);

    return db.none("UPDATE Members SET Password=$1, Salt=$2 WHERE Memberid=$3", [saltedHash, salt, memberid])
        .catch(err => _handleDbError(err));
}

module.exports = {
    loginUserOnEmail, loginUserOnUsername, registerUser, sendVerificationEmail, sendVerificationOnUsername,
    validateEmail, sendRecoveryEmail, isRecoveryCodeValid, resetPassword, changePassword, changeUsername
}
