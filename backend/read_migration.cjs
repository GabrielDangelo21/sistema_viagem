const fs = require('fs');
// Start reading from file
try {
    // Try reading as utf-16le first since PowerShell created it
    let content = fs.readFileSync('migration.sql', 'utf16le');

    // If it looks like garbage or empty, try utf-8
    if (!content || content.trim().length === 0 || content.includes('')) {
        content = fs.readFileSync('migration.sql', 'utf8');
    }

    console.log(content);
} catch (err) {
    console.error(err);
}
