const express = require('express');
const request = require('request');
const API_KEY = process.env.WEATHERBIT_API_KEY;
let db = require('../utilities/utils').db;
var router = express.Router();
var d = new Date();
router.post('/', (req, res) => {
    let zipcode = 256;
    let latitude = 38.123;
    let longitude = 78.543;
    let timestamp = "" + d.getFullYear() + "/" + d.getMonth() + "/" + d.getDate() + "/" + d.getHours();
    db.one("SELECT * FROM WEATHER WHERE zip = $1", zipcode)
    .then(row => {
        // (zip exists)
        // IF at least an hour difference = delete row + make weather call
        let parsed = row['timestamp'].split("/");
        if (parsed[0] != d.getFullYear() || parsed[1] != d.getMonth() || parsed[2] != d.getDate() || parsed[3] != d.getHours()) {
            db.none("DELETE FROM WEATHER WHERE zip = $1", zipcode);
            //weathercall(latitude, longitude, timestamp, zipcode, res);
            res.send({
                updating: true
            })
        } else {
            res.send({
                updating: false
            })
        }
    }).catch((err) => {
        console.log(err);
        // (zip doesn't exist) = make weather call
        //weathercall(latitude, longitude, timestamp, zipcode, res);
        res.send({
            weathercall(latitude, longitude, timestamp, zipcode, res)
        });
    })
});

function weathercall(lat, long, time, zip, res) {
    let url = `https://api.weatherbit.io/v2.0/forecast/hourly?city=Raleigh,NC&key=${API_KEY}&hours=48`;
    request(url, function (error, response, body) {
        if (error) {
            res.send(error);
        } else {
            // res.send(response);
            let hourlyweather = { "test": "hello" };
            let dailyweather = { "test2": "hello2" };
            let params = [zip, time, hourlyweather, dailyweather];
            db.none("INSERT INTO WEATHER(zip, timestamp, hourlyweather, dailyweather) VALUES ($1, $2, $3, $4)", params);
            response.send(body);
        }
    });
}

module.exports = router;
