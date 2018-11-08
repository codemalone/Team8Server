//Get the connection to Heroku Database
let db = require('./utils.js').db;

//Get the connection to Mailer service
const sendEmail = require('./utils.js').sendEmail;

//Get the hasher
const getHash = require('./utils.js').getHash;

//We use this create the SHA256 hash
const crypto = require("crypto");

/**
 * Verifies the correct credentials and returns a user object.
 * @param {string} email a registered user email
 * @param {string} theirPw the associated user password
 * @return {user} an object with all user profile data
 * @throws "invalid credentials"
 */
function loginUserOnEmail(email, theirPw) {
    //get the user data
    return _getUserOnEmailNoPassword(email)
        .then(data => {
            if (!(data && _isPassword(data, theirPw))) {
                throw("invalid credentials")
            } else if (data.verification == 0) {
                throw("not verified")
            } else {
                return data;
            }
        });
}

function loginUserOnUsername(username, theirPw) {
    return _getUserOnUsernameNoPassword(username)
        .then(data => {
            if (!(data && _isPassword(data, theirPw))) {
                throw("invalid credentials")
            } else if (data.verification == 0) {
                throw("not verified")
            } else {
                return data;
            }
        });
}

function registerUser(email, username, first, last, password) {
    let salt = crypto.randomBytes(32).toString("hex");
    let saltedHash = getHash(password, salt);
    
    let params = [first, last, username, email, saltedHash, salt];
    return db.none("INSERT INTO MEMBERS(FirstName, LastName, Username, Email, Password, Salt)"
            + "VALUES ($1, $2, $3, $4, $5, $6)", params)
        .then(() => {
            // async call to send a new validation link
            sendValidationEmail(email);
            return true;
        });
}

/**
 * Checks if an email address is registered and not validated. If the
 * conditions hold then a validation link is sent to the address.
 * 
 * @param {string} email address of a registered user.
 */
function sendValidationEmail(email) {
    let user; // store user data for the promise chain
    
    return _getUserNoPassword(email)
    .then(data => {
        if (!data) {
            throw("invalid credentials");
        } else {
            user = data;
        }
        
        // check that a user has not already validated
        if (user.verification == 1) {
            throw("user email has been validated");
        } 

        // remove any existing validation codes
        return _removeRegistrationCodes(user.memberid);    
    }).then(() => {
        // generate and store a new code
        let vCode = crypto.randomBytes(8).toString("hex");
        let vCodeHash = getHash(vCode, user.salt);
        user.vCode = vCode;

        return db.none("INSERT INTO registrationhashes(hash, memberid) VALUES ($1, $2)",
                [vCodeHash, user.memberid]);
    }).then(() => {
        // email a link to the user
        let link = "http://tcss450a18-team8.herokuapp.com/account/verify?email=" + user.email + "&code=" + user.vCode;
        let msg = "Welcome to our app! Please verify this email address by clicking the link below.<p>"
                + "<a href=\"" + link + "\">" + link + "</a>";
        
        //sendEmail(user.email, "Verify your account", msg);
        console.log("sent verification email: " + user.email);
    });
}

/**
 * Checks the provided validation code and marks a user as validated.
 * @param {*} email address of an unvalidated user.
 * @param {*} code provided in the email for validation
 */
function validateEmail(email, code) {
    let user; // store user data for the promise chain
    
    return _getUserAndValidationCode(email)
    .then(data => {
        if (!data) {
            throw("invalid credentials");
        } else {
            user = data;
        }

        // user has already been verified so we can display success
        if (user.verification == 1) {
            return true;
        }

        // if the hash values match then update user account
        if (user.hash == getHash(code, user.salt)) {
            return db.none("UPDATE Members SET verification=1 WHERE memberid=$1", [user.memberid]);    
        } else {
            throw("hash codes do not match");
        }
    }).then(() => {
        return _removeRegistrationCodes(user.memberid);
    })
}

/**
 * Changes a user password to the specified value.
 * @param {string} email address of the user
 * @param {string} oldPassword the existing password of the user
 * @param {string} newPassword the new password to set
 */
function changePassword(email, oldPassword, newPassword) {
    return _getUserOnEmailNoPassword(email)
        .then(user => {
            if (!user) {
                throw("the email was not found")
            } else if (_isPassword(user, oldPassword) == false) {
                throw("invalid username or password");
            } else {
                return _setUserPassword(email, newPassword);
            }
        });
}

/**
 * Resets a user password to a new random value. The new password is 
 * emailed to the user with a message reminding them to change it again.
 * @param {*} email address of the user
 */
function resetPassword(email, newPassword, code) {
    let user; // lookup the user data and pass it to the next promise

    return _getUserAndResetCode(email)
    .then(data => {
        if (!data) {
            throw("invalid credentials");
        } else {
            user = data;
        }

        if (user.code == code) {
            return _setUserPassword(email, newPassword);
        } else {
            throw("codes do not match");
        }
    }).then(() => {
        return _removeResetCode(user.memberid);
    });
}

function sendRecoveryEmail(email) {
    let user; // store user data for the promise chain

    return _getUserNoPassword(email)
        .then(data => {
            if (!data) {
                throw("invalid credentials");
            } else {
                user = data;
            }

            // remove any existing validation codes
            return _removeResetCode(user.memberid);
        }).then(() => {
            // generate and store a new code
            let rCode = crypto.randomBytes(8).toString("hex");
            user.rCode = rCode;

            return db.none("INSERT INTO ResetCodes(Code, MemberID) VALUES ($1, $2)",
                [rCode, user.memberid]);
        }).then(() => {
            // email a code to the user
            let msg = "A password reset has been requested. Enter the code in the app when requested.<p>"
                + user.rCode;

            //sendEmail(user.email, "Password Reset Code", msg);
            console.log("sent recovery email: " + user.email);
        });
}

function isRecoveryCodeValid(email, code) {
    return _getUserAndResetCode(email)
    .then(data => {
        if (!data) {
            throw("invalid credentials");
        } else {
            user = data;
        }

        if (user.code == code) {
            return {success: true};
        } else {
            throw("codes do not match");
        }
    });
}

// Private helper functions below here

function _isPassword(theUser, theirPassword) {
    let salt = theUser.salt;
    let ourSaltedHash = theUser.password; 

    //Combined their password with our salt, then hash
    let theirSaltedHash = getHash(theirPassword, salt); 

    // If provided password is valid then return true
    return ourSaltedHash == theirSaltedHash;
}

function _getUserOnEmailNoPassword(email) {
    return db.one('SELECT * FROM Members WHERE Email=$1', [email]);
}

function _getUserOnUsernameNoPassword(username) {
    return db.one('SELECT * FROM Members WHERE Username=$1', [username]);
}

function _getUserAndValidationCode(email) {
    return db.one('SELECT * FROM Members LEFT JOIN RegistrationHashes ON ' + 
                    'Members.memberid = RegistrationHashes.memberid ' +
                    'WHERE Email=$1', [email]);
}

function  _getUserAndResetCode(email) {
    return db.one('SELECT * FROM Members LEFT JOIN ResetCodes ON ' +
        'Members.MemberID = ResetCodes.MemberID ' +
        'WHERE Email=$1', [email])
}

function _removeRegistrationCodes(memberid) {
    return db.none("DELETE FROM registrationhashes WHERE memberid=$1", [memberid]);
}

function _removeResetCode(memberid) {
    return db.none("DELETE FROM ResetCodes WHERE MemberID = $1", [memberid])
}

function _setUserPassword(email, newPassword) {
    let salt = crypto.randomBytes(32).toString("hex");
    let saltedHash = getHash(password, salt);

    return db.none("UPDATE Members SET Password = $1, Salt = $2 WHERE Email = $3", [saltedHash, salt, email]);
}

module.exports = {
    loginUserOnEmail, loginUserOnUsername, registerUser, sendValidationEmail, validateEmail,
    sendRecoveryEmail, isRecoveryCodeValid, resetPassword, changePassword
}
