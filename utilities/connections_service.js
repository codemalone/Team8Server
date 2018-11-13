//Get the connection to Heroku Database
let db = require('./utils.js').db;

//Error codes returned on failure
const error = require('./error_codes.js');

function getIdFromToken(token) {
    //return db.any("SELECT memberid FROM fcm_token WHERE token=$1;", token)
    let id;
    db.one("SELECT memberid FROM fcm_token WHERE token=$1", token)
    .then(data => {
        id = data['memberid']
    })
    .catch(err => _handleDbError(err));
    return id;
}

// any function included in exports will be public
module.exports = {
    getIdFromToken
}
