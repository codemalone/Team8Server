var express = require('express');
var router = express.Router();

// GET hello message
router.get('/', function(req, res, next) {
  var message;
  var name;
  
  if (req.query.name) {
    name = req.query.name;
  } else {
    name = "World";
  }
  
  message = "Hello, " + name + "!";
  
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ message: message }));
})

module.exports = router;
