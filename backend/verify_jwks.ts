
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hhxaoitjibuqsybhknzc.supabase.co';
const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;

console.log('Testing JWKS connectivity...');
console.log('URL:', JWKS_URL);

try {
    const response = await fetch(JWKS_URL);
    if (!response.ok) {
        console.error(`Failed: ${response.status} ${response.statusText}`);
    } else {
        const data = await response.json() as any;
        console.log('Success!');
        console.log('Keys found:', data.keys?.length);
        data.keys?.forEach((k: any) => console.log(` - kid: ${k.kid}, alg: ${k.alg}`));
    }
} catch (err) {
    console.error('Network Error:', err);
}
