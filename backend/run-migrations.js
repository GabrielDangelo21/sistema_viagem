
import { execSync } from 'child_process';

console.log('Running migrations...');
try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Migrations completed successfully.');
} catch (error) {
    console.error('Migration failed:', error);
    // Optional: exit(1) if you want to stop deployment on failure
    // process.exit(1);
}
