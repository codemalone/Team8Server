//Get the connection to Heroku Database
let db = require('./sql_conn.js');

//Get the connection to Mailer service
const nodemailer = require('nodemailer');

//We use this create the SHA256 hash
const crypto = require("crypto");

/** 
 * Function to send an email address to the specified address.
 * @param {string} recipient a valid email address
 * @param {string} subj the subject line
 * @param {string} message body in html or text format 
*/
function sendEmail(recipient, subj, message) {

    let transport = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'noreply.84920b3', 
            pass: process.env.MAILER_PASSWORD 
        }
    });
            
    let mailOptions = {
        from: '"8 Way Connections" <noreply.84920b3@gmail.com>', 
        to: recipient, 
        subject: subj, 
        html: message 
    };

    transport.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
    });
}

/**
* Method to get a salted hash.
* We put this in its own method to keep consistency
* @param {string} pw the password to hash
* @param {string} salt the salt to use when hashing
*/
function getHash(pw, salt) {
    return crypto.createHash("sha256").update(pw + salt).digest("hex");
}

module.exports = { 
    db, getHash, sendEmail 
};
