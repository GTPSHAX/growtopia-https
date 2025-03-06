// importing required modules
const express = require('express');
const path = require('path');
const ejs = require('ejs');
const bodyParser = require('body-parser');

// creating an express app
const app = express();

// setting the middleware
app.use(require(path.join(__dirname, 'middleware', 'DefaultHeader.js')));
app.use(require(path.join(__dirname, 'middleware', 'Compression.js')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(require(path.join(__dirname, 'middleware', 'CacheHandler.js')));

// setting the security
app.use(require(path.join(__dirname,'security', 'IPBlacklist.js')));
app.use(require(path.join(__dirname,'security', 'RequestSizeLimiter.js')));
app.use(require(path.join(__dirname,'security', 'RateLimiter.js')));
app.use(require(path.join(__dirname,'security', 'XssProtection.js')));

// setting the routes
app.use('/', require(path.join(__dirname,'routes', 'IndexRoute.js')));
app.use('/player', require(path.join(__dirname,'routes', 'PlayerSupport.js')));
app.use('/growtopia', require(path.join(__dirname,'routes', 'GrowtopiaGame.js')));

// setting the static files
app.use(express.static(path.join(__dirname, '..', 'public'), {
    setHeaders: (res, path) => {
        // Remove automatic Content-Length setting for cached files
        if (path.includes('/cache/')) {
            // Remove Content-Length header if Transfer-Encoding is present
            res.removeHeader('Content-Length');
            // Ensure proper content type for RTTEX files
            if (path.endsWith('.rttex')) {
                res.set('Content-Type', 'application/octet-stream');
            }
        }
    }
}));

// setting the 404 page
app.use((req, res) => {
    const currentTime = new Date().toISOString();
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
    console.warn(
        `[${req.get('host')}] ${clientIP} Missing File -> ${req.method} ${req.originalUrl} - ${currentTime}`,
    );
    res.sendStatus(200);
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(200).send('Internal Server Error');
});

// exposing the app
module.exports = app;