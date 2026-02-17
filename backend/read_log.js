const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'server.log');

try {
    const data = fs.readFileSync(logPath, 'utf8'); // Try utf8 first, maybe log is not unicode?
    console.log('--- LOG START ---');
    console.log(data.slice(-2000)); // Last 2000 chars
    console.log('--- LOG END ---');
} catch (err) {
    try {
        const data = fs.readFileSync(logPath, 'utf16le');
        console.log('--- LOG START (UTF16) ---');
        console.log(data.slice(-2000));
        console.log('--- LOG END ---');
    } catch (e) {
        console.error('Error reading log:', e);
    }
}
