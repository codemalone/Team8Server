const express = require('express');
const request = require('request');
const bodyParser = require("body-parser");
const API_KEY = process.env.WEATHERBIT_API_KEY;
let db = require('../utilities/utils').db;
var router = express.Router();
var d = new Date();
router.use(bodyParser.json());
router.post('/', (req, res) => {
    let zipcode = req.body['zipcode'];
    let latitude = req.body['latitude'];
    let longitude = req.body['longitude'];
    //let zipcode = 255;
    //let latitude = 47.3223;
    //let longitude = -122.3126;
    let url = `https://api.weatherbit.io/v2.0/forecast/daily?lat=` + latitude + `&lon=` + longitude + `&key=${API_KEY}&days=10`;
    request(url, function (error, response, body) {
        if (error) {
            res.send(error);
        } else {
            let dailyweather = body;
            url = `https://api.weatherbit.io/v2.0/forecast/hourly?lat=` + latitude + `&lon=` + longitude + `&key=${API_KEY}&hours=24`;
            request(url, function (error, response, body) {
                if (error) {
                    res.send(error);
                } else {
                    let hourlyweather = body;
                    body = [JSON.parse(dailyweather), JSON.parse(hourlyweather), {'zip': zipcode}];
                    res.send(body);
                }
            });
        }
    });
});

module.exports = router;
