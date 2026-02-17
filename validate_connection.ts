import { parse } from 'pg-connection-string';

const connectionString = process.argv[2];

if (!connectionString) {
    console.error('Please provide a connection string');
    process.exit(1);
}

try {
    const config = parse(connectionString);
    console.log('Parsed Configuration:');
    console.log({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password ? '******' : undefined,
        ssl: config.ssl
    });
} catch (error) {
    console.error('Error parsing connection string:', error);
}
