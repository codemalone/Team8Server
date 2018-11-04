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
function getUser(email, theirPw) {
    //get the user data
    return _getUserNoPassword(email)
        .then(data => {
            let salt = data['salt'];
            //Retrieve our copy of the password
            let ourSaltedHash = data['password']; 

            //Combined their password with our salt, then hash
            let theirSaltedHash = getHash(theirPw, salt); 

        // If provided password is valid then finally return the user data
        if (ourSaltedHash == theirSaltedHash) {
            return data;
        } else {
            throw("invalid credentials");
        }
    });
}

/**
 * Checks if an email address is registered and not validated. If the
 * conditions hold then a validation link is sent to the address.
 * 
 * @param {} email address of a registered user.
 */
function sendEmailValidationLink(email) {
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
        let link = "http://tcss450a18-team8.herokuapp.com/verify?email=" + user.email + "&code=" + user.vCode;
        let msg = "Welcome to our app! Please verify this email address by clicking the link below.<p>"
                + "<a href=\"" + link + "\">" + link + "</a>";
        
        sendEmail(user.email, "Verify your account", msg);
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
 * @param {string} newPassword the new password to send
 */
function changePassword(email, oldPassword, newPassword) {
    // check if old password is valid

    // set the new password


}

/**
 * Resets a user password to a new random value. The new password is 
 * emailed to the user with a message reminding them to change it again.
 * @param {*} email address of the user
 */
function resetPassword(email) {
    // lookup the user data and pass it to the next promise
    return _getUserNoPassword(email)
    .then(user => {
        // check if the user email has been validated.

        // generate a new password 
        
        // set the new password

    }).then(data => {
        // send the new password by email


    });
}

/**
 * Helper function gets and returns a user without requiring a valid password.
 * @param {string} email 
 */
function _getUserNoPassword(email) {
    return db.one('SELECT * FROM Members WHERE Email=$1', [email]);
}

/**
 * Helper function gets and returns a user with the validation hash.
 * @param {string} email 
 */
function _getUserAndValidationCode(email) {
    return db.one('SELECT * FROM Members NATURAL JOIN RegistrationHashes WHERE Email=$1', [email]);
}

/**
 * Helper function to remove any existing registration hashes for the user.
 * @param {int} memberid
 */
function _removeRegistrationCodes(memberid) {
    return db.none("DELETE FROM registrationhashes WHERE memberid=$1", [memberid]);
}

/**
 * Helper function to set a new password for the specified user.
 * @param {string} email of a register user
 * @param {string} newPassword to set
 */
function _setUserPassword(email, newPassword) {
    // db function here
}

module.exports = {
    getUser, sendEmailValidationLink, validateEmail, 
    changePassword, resetPassword
}
