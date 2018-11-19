if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

/**
 * This script configures the Express application. To manage API resources,
 * we only need to map an endpoint to a valid router.
 */
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');

// Configure options for the the express application
var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

/*
 * Endpoints
 */
app.use('/account', require('./routes/account.js'));
app.use('/weather', require('./routes/weather.js'));
app.use('/connections', require('./routes/connections.js'));
app.use('/chats', require('./routes/chats.js'));
app.use('/hello', require('./routes/hello.js'));

// Index page is not used
app.get('/', function(req, res) {
  res.setHeader('Content-Type', 'text/plain');
  res.send();
});

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
