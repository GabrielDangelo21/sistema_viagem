import buildGetJwks from 'get-jwks';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hhxaoitjibuqsybhknzc.supabase.co';
const JWKS_URL = `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`;

const getJwks = buildGetJwks({
    providerDiscovery: false,
    ttl: 600000,
});

console.log('Testing get-jwks library...');
console.log('Target Domain:', `${SUPABASE_URL}/auth/v1`);

try {
    // We simulate what the plugin does. 
    // We don't have a token header, so we just try to fetch the key for the known KID.
    // KID fetched from previous run: 92eaad8a-5745-4cfe-96f8-a621e4501b8e
    // ALG: ES256

    // First, let's fetch the KID dynamically so we don't hardcode checking a stale key
    const response = await fetch(JWKS_URL);
    const data = await response.json() as any;
    const firstKey = data.keys?.[0];

    if (!firstKey) {
        throw new Error('No keys found in JWKS endpoint');
    }

    console.log(`Found key in JWKS: kid=${firstKey.kid}, alg=${firstKey.alg}`);

    console.log('Attempting to retrieve public key via get-jwks...');
    const publicKey = await getJwks.getPublicKey({
        domain: `${SUPABASE_URL}/auth/v1`,
        alg: firstKey.alg,
        kid: firstKey.kid,
    });

    console.log('Success! Public Key retrieved:');
    console.log(publicKey.substring(0, 50) + '...');

} catch (err) {
    console.error('Error using get-jwks:', err);
}

export { };
