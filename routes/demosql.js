//express is the framework we're going to use to handle requests
const express = require('express');
var router = express.Router();

// create connection to heroku database
let db = require('../utilities/utils').db;

//This allows parsing of the body of POST requests, that are encoded in JSON
const bodyParser = require("body-parser");
router.use(bodyParser.json());

router.post("/", (req, res) => {
    var name = req.body['name'];

    if (name) {
        db.none("INSERT INTO DEMO(Text) VALUES ($1)", name)
        .then(() => {
            //We successfully addevd the name, let the user know
            res.send({
                success: true
            });
        }).catch((err) => {
            //log the error
            console.log(err);
            res.send({
                success: false,
                error: err
            });
        });
    } else {
        res.send({
            success: false,
            input: req.body,
            error: "Missing required information"
        });
    }
});

router.get("/", (req, res) => {
    db.manyOrNone('SELECT Text FROM Demo')
    //If successful, run function passed into .then()
    .then((data) => {
        res.send({
            success: true,
            names: data
        });
    }).catch((error) => {
        console.log(error);
        res.send({
            success: false,
            error: error
        })
    });
});

module.exports = router;
