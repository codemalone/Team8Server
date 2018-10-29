const API_KEY = process.env.PHISH_DOT_NET_KEY;
//express is the framework we're going to use to handle requests
const express = require('express');

//request module is needed to make a request to a web service
const request = require('request');

var router = express.Router();

router.get("/blog/get", (req, res) => {
    // for info on use of tilde (`) making a String literal, see below. 
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String

    let url = `https://api.phish.net/v3/blog/get?apikey=${API_KEY}`;

    //find the query string (parameters) sent to this end point and pass them on to
    // phish.net api call 
    let n = req.originalUrl.indexOf('?') + 1;
    if(n > 0) {
        url += '&' + req.originalUrl.substring(n);
    }

    //When this web service gets a request, make a request to the Phish Web service
    request(url, function (error, response, body) {
        if (error) {
            res.send(error);
        } else {
            // pass on everything (try out each of these in Postman to see the difference)
            // res.send(response);
            // or just pass on the body
            res.send(body);
        }
    });    
});

router.get("/setlists/recent", (req, res) => {
    // use the phish.net API
    let url = `https://api.phish.net/v3/setlists/recent?apikey=${API_KEY}`;

    //find the query string (parameters) sent to this end point and pass them on to
    // phish.net api call 
    let n = req.originalUrl.indexOf('?') + 1;
    if(n > 0) {
        url += '&' + req.originalUrl.substring(n);
    }

    //When this web service gets a request, make a request to the Phish Web service
    request(url, function (error, response, body) {
        if (error) {
            res.send(error);
        } else {
            // pass on everything (try out each of these in Postman to see the difference)
            // res.send(response);
            // or just pass on the body
            res.send(body);
        }
    });
});

module.exports = router;
