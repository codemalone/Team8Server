/**
 * This script configures the Express application. To manage API resources,
 * we only need to:
 *  1) Import a router that points to a js file
 *  2) Map an endpoint name to the router
 */
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');

// Declare and configure the express application
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Map endpoints to a router
app.use('/', require('./routes/index.js'));
app.use('/register', require('./routes/register.js'));
app.use('/login', require('./routes/login.js'));

// Error handlers
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
