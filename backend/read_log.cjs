const fs = require('fs');
const path = require('path');

const logPath = path.join(__dirname, 'server.log');

try {
    // Try reading as utf8
    if (fs.existsSync(logPath)) {
        const data = fs.readFileSync(logPath, 'utf8');
        console.log('--- LOG START ---');
        // Print last 5000 chars to be sure
        console.log(data.slice(-5000));
        console.log('--- LOG END ---');
    } else {
        console.log('Log file not found at:', logPath);
    }
} catch (err) {
    console.error('Error reading log:', err);
}
