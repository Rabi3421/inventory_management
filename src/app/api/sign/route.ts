import { createSign } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

// Load once at module initialisation time (cached by the Node.js module system).
// Falls back to QZ_PRIVATE_KEY env var so the key can be injected in
// containerised / serverless environments without a filesystem mount.
function loadPrivateKey(): string {
    const envKey = process.env.QZ_SIGNING_PRIVATE_KEY;
    if (envKey) {
        // Allow "\n" escape sequences stored in env var
        return envKey.replace(/\\n/g, '\n');
    }

    const keyPath = join(process.cwd(), 'certificates', 'private-key.pem');
    try {
        return readFileSync(keyPath, 'utf-8');
    } catch {
        throw new Error(
            '[QZ] Private key not found. ' +
            'Set QZ_SIGNING_PRIVATE_KEY env var or place the key at certificates/private-key.pem',
        );
    }
}

// In production the key is stable, so caching is fine.
// In development, clear the cache when the file changes via HMR.
let _privateKey: string | null = null;

function getPrivateKey(): string {
    if (process.env.NODE_ENV !== 'production') {
        // Always re-read in dev so key rotation (certificate regeneration)
        // is picked up without a full server restart.
        return loadPrivateKey();
    }
    if (!_privateKey) _privateKey = loadPrivateKey();
    return _privateKey;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    let data: string;

    try {
        const body = await request.json() as { data?: unknown };
        if (typeof body.data !== 'string' || body.data.length === 0) {
            return NextResponse.json(
                { error: 'Missing or invalid "data" field' },
                { status: 400 },
            );
        }
        data = body.data;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    try {
        const privateKey = getPrivateKey();
        const signer = createSign('SHA512');
        signer.update(data);
        const signature = signer.sign(privateKey, 'base64');
        return NextResponse.json({ signature });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Signing failed';
        console.error('[QZ /api/sign]', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
