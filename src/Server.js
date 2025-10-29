const path = require('path');
const app = require(path.join(__dirname, 'MainApp.js'));
const https = require('https');
const fs = require('fs');
const tls = require('tls');

// Helper to safely load certificates
function safeReadFileSync(filePath) {
    try {
        return fs.readFileSync(filePath);
    } catch (err) {
        console.error(`Failed to read certificate file: ${filePath}`, err);
        return undefined;
    }
}

// Default certificate for SNI
const sniDefaultCert = safeReadFileSync(path.join(__dirname, '..', 'certs', 'osm.growplus.asia', 'fullchain.pem'));
const sniDefaultKey = safeReadFileSync(path.join(__dirname, '..', 'certs', 'osm.growplus.asia', 'privkey.pem'));

/**
 * SNI callback for dynamic certificate selection
 */
const sniCallback = (serverName, callback) => {
    console.log(`[SNI] Requested for: ${serverName}`);
    let cert = sniDefaultCert;
    let key = sniDefaultKey;

    if (serverName === 'www.growtopia1.com' || serverName === 'www.growtopia2.com') {
        cert = safeReadFileSync(path.join(__dirname, '..', 'certs', 'growtopia1.com', 'gt-crt.pem'));
        key = safeReadFileSync(path.join(__dirname, '..', 'certs', 'growtopia1.com', 'gt-key.pem'));
    }

    try {
        const context = tls.createSecureContext({ cert, key });
        callback(null, context);
    } catch (err) {
        console.error(`[SNI] Failed to create secure context for ${serverName}:`, err);
        callback(err);
    }
};

const serverOptions = {
    cert: sniDefaultCert,
    key: sniDefaultKey,
    ca: sniDefaultChain,
    SNICallback: sniCallback,
    keepAliveTimeout: 60000, // 60 seconds
    headersTimeout: 65000, // 65 seconds
};

/**
 * HTTP server (port 80)
 */
app.listen(80, () => {
    console.log('Server started at http://localhost:80');
}).on('request', (req, res) => {
    try {
        const currentTime = new Date().toISOString();
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
        console.log(
            `[HTTP][${req.get('host')}][${clientIP}] ${req.method} -> ${req.originalUrl} - ${currentTime}`,
        );
    } catch (error) {
        console.error('Error logging HTTP request:', error);
    }
}).on('tlsClientError', (err, socket) => {
    console.error('HTTP TLS handshake error:', err.message);
    socket.destroy();
}).on('clientError', (err, socket) => {
    console.error('HTTP client error:', err.message);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

/**
 * HTTPS server (port 443)
 */
https.createServer(serverOptions, app).listen(443, () => {
    console.log('Secure server started at https://localhost:443');
}).on('request', (req, res) => {
    try {
        const currentTime = new Date().toISOString();
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || req.ip;
        console.log(
            `[HTTPS][${req.get('host')}][${clientIP}] ${req.method} -> ${req.originalUrl} - ${currentTime}`,
        );
    } catch (error) {
        console.error('Error logging HTTPS request:', error);
    }
}).on('tlsClientError', (err, socket) => {
    console.error('HTTPS TLS handshake error:', err.message);
    socket.destroy();
}).on('clientError', (err, socket) => {
    console.error('HTTPS client error:', err.message);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});