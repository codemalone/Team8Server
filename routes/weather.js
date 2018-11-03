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
    let longitude = req.body['longititude'];
    let timestamp = "" + d.getFullYear() + "/" + d.getMonth() + "/" + d.getDate() + "/" + d.getHours();
    db.one("SELECT * FROM WEATHER WHERE zip = $1", zipcode)
        .then(row => {
            // (zip exists)
            // IF at least an hour difference = delete row + make weather call
            let parsed = row['timestamp'].split("/");
            if (parsed[0] != d.getFullYear() || parsed[1] != d.getMonth() || parsed[2] != d.getDate() || parsed[3] != (d.getHours())) {
                db.none("DELETE FROM WEATHER WHERE zip = $1", zipcode);
                console.log("DELETED + ADDING");
                weathercall(latitude, longitude, timestamp, zipcode, res);
            } else {
                db.one("SELECT hourlyweather, dailyweather FROM WEATHER WHERE zip = $1", zipcode)
                .then(row => {
                    let temp = JSON.stringify(row['dailyweather']);
                    temp.concat(JSON.stringify(row['hourlyweather']));
                    res.send(temp);
                });
            }
        }).catch((err) => {
            console.log(err);
            // (zip doesn't exist) = make weather call
            weathercall(latitude, longitude, timestamp, zipcode, res);
        })
});

function weathercall(lat, long, time, zip, res) {
    let url = `https://api.weatherbit.io/v2.0/forecast/daily?city=Raleigh,NC&key=${API_KEY}&days=10`;
    let dailyweather = { "test1": "hello1" };
    request(url, function (error, response, body) {
        if (error) {
            res.send(error);
        } else {
            dailyweather = body;
            //dailyweather = { 'test':'testernion'};
            JSON.stringify(dailyweather);
            //res.write(body);
        }
    });
    url = `https://api.weatherbit.io/v2.0/forecast/hourly?city=Raleigh,NC&key=${API_KEY}&hours=24`;
    request(url, function (error, response, body) {
        if (error) {
            res.send(error);
        } else {
            // res.send(response);
            let hourlyweather = body;
            JSON.stringify(hourlyweather);
            let params = [zip, time, hourlyweather, dailyweather];
            db.none("INSERT INTO WEATHER(zip, timestamp, hourlyweather, dailyweather) VALUES ($1, $2, $3, $4)", params);
            db.one("SELECT hourlyweather, dailyweather FROM WEATHER WHERE zip = $1", zip)
            .then(row => {
                //body = Object.assign(dailyweather, hourlyweather);
                dailyweather = dailyweather.concat(hourlyweather);
                //body = dailyweather;
                res.send(dailyweather.concat(hourlyweather));
            });
        }
    });
}

module.exports = router;
