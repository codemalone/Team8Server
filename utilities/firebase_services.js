var admin = require("firebase-admin");
var serviceAccount = require("./firebase-team8app.json");

// add private key from environment variable and initialize firebase
serviceAccount.private_key = 
        serviceAccount.private_key.toString()
            .replace('VOID', process.env.FIREBASE_PRIVATE_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://team8app-59cc9.firebaseio.com"
});

//use to send message to all clients register to the Topoic (ALL)
function sendToTopic(msg, from, topic) {
    //build the message for FCM to send
    var message = {
    notification: {
        title: 'New Message from '.concat(from),
        body: msg,
    },
    data: {
        "type": "contacrt",
        "sender": from,
        "message": msg,
    },
        "topic": topic
    };

    console.log(message);

    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

//use to send message to a specific client by the token
function sendToIndividual(token, msg, from) {
    //build the message for FCM to send
    var message = {
        android: {
            notification: {
                title: 'New Message from '.concat(from),
                body: msg,
                color: "#0000FF",
                icon: '@drawable/ic_notification_overlay',
                click_action: "OPEN_CHAT"
            },
        data: {
            "type": "contacrt",
            "sender": from,
            "message": msg,
        }
    },
    "token": token
    };

    //console.log(message);

    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

function notifyConnectionRequest(token, sender) {
    //build the message for FCM to send
    var message = {
        android: {
            notification: {
                title: 'New Connection Request',
                body: sender.concat(' has added you as a Connection.'),
                color: "#0000FF",
                icon: '@drawable/ic_notification_overlay',
                click_action: "OPEN_CONNECTIONS"
            },
        data: {
            "type": "newcontact",
            "sender": sender,
            "message": sender.concat(' has added you as a Connection.')
        }
    },
    "token": token
    };

    // Send a message to the device corresponding to the provided
    // registration token.
    admin.messaging().send(message)
        .then((response) => {
            // Response is a message ID string.
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
}

let fcm_functions = { sendToTopic, sendToIndividual, notifyConnectionRequest };

module.exports = {
    admin, fcm_functions
};
