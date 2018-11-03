//Get the connection to Heroku Database
let db = require('./utils.js').db;

//Get the connection to Mailer service
const mailer = require('./utils.js').sendEmail;

//Get the hasher
const getHash = require('./utils.js').getHash;

//We use this create the SHA256 hash
const crypto = require("crypto");

/**
 * Checks the provided credentials and returns the user details.
 * @param {string} email 
 * @param {string} theirPw 
 * @return {user} 
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

        // If provided password is valid then return the user data
        if (ourSaltedHash == theirSaltedHash) {
            return data;
        } else {
            throw("invalid credentials");
        }
    });
}



/**
 * Sends a validation email to the specified email address.
 * @param {} email address of an unvalidated user.
 */
function sendEmailValidationLink(email) {
    
    // check that a user is registered and not already validated


    // remove any existing validation codes


    // generate and store a new code


    // email a link to the user
    let link = "http://tcss450a18-team8-test.herokuapp.com/verify?email=" + email + "&code=" + vCode;
    let msg = "Welcome to our app! Please verify this email address by clicking the link below.<p>"
                + "<a href=\"" + link + "\">" + link + "</a>";
    sendEmail(email, "Verify your account", msg);
}

/**
 * Checks the provided validation code and marks a user as validated.
 * @param {*} email address of an unvalidated user.
 * @param {*} code provided in the email for validation
 */
function validateEmail(email, code) {




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
    // lookup the user data
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
