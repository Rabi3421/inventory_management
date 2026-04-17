/**
 * QZ Tray bridge — direct browser-to-printer WebSocket integration.
 *
 * QZ Tray is a free desktop app (https://qz.io) that lets a web page send
 * print jobs straight to any locally-connected printer (USB, network, thermal)
 * without the browser's print dialog ever appearing.
 *
 * Prerequisites (one-time setup on the machine running the browser):
 *  1. Download & install QZ Tray:  https://qz.io/download/
 *  2. Launch QZ Tray — it sits silently in the system tray / menu bar.
 *  3. When first prompted, click "Allow" AND check "Remember this decision".
 *     Subsequent connections will be silent (no popup).
 *
 * Signing flow:
 *  - The server (Next.js API route /api/sign) signs each request with RSA-SHA512
 *    using the private key stored in certificates/private-key.pem.
 *  - The matching public certificate (/public/certificate.pem) is sent to QZ Tray
 *    so it can verify the signature.
 *  - A valid signature enables the "Remember this decision" checkbox in QZ Tray,
 *    which is disabled for unsigned (or tampered) requests.
 *
 * This module is browser-only — all functions throw in a server-side context.
 */

/* ── Global qz type (the library uses a window.qz global) ─────────────────── */
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        qz?: any;
    }
}

/** Local path — served by Next.js from the /public folder */
const QZ_SCRIPT_URL = '/qz-tray.js';

/** Public certificate fetched from /public/certificate.pem */
const QZ_CERT_URL = '/certificate.pem';

/** Next.js API route that signs data server-side with RSA-SHA512 */
const QZ_SIGN_URL = '/api/sign';

let _scriptLoadPromise: Promise<void> | null = null;

// ── Script loading ────────────────────────────────────────────────────────────

/**
 * Dynamically inserts the QZ Tray <script> tag exactly once and resolves when
 * `window.qz` is available.
 */
function loadQzScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('[QZ] Cannot load in a server-side context.'));
    }
    if (window.qz) return Promise.resolve();
    if (_scriptLoadPromise) return _scriptLoadPromise;

    _scriptLoadPromise = new Promise<void>((resolve, reject) => {
        // Guard against duplicate script tags (e.g. React StrictMode double-invoke)
        if (document.querySelector(`script[src="${QZ_SCRIPT_URL}"]`)) {
            // Script tag exists — wait for window.qz to appear
            const check = setInterval(() => {
                if (window.qz) { clearInterval(check); resolve(); }
            }, 50);
            return;
        }

        const script = document.createElement('script');
        script.src = QZ_SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            _scriptLoadPromise = null; // allow retry
            reject(new Error('[QZ] Failed to load qz-tray.js from /public. Ensure the file exists.'));
        };
        document.head.appendChild(script);
    });

    return _scriptLoadPromise;
}

// ── Security setup (signed) ───────────────────────────────────────────────────

/**
 * Configures QZ Tray to use RSA-SHA512 signed requests.
 *
 * - Certificate is fetched once from /certificate.pem (public directory).
 * - Each message is signed by POSTing to /api/sign (server-side, never exposes
 *   the private key to the browser).
 *
 * With a valid signed certificate, QZ Tray enables "Remember this decision",
 * so the user only needs to approve the connection once.
 */
async function applySignedSecurity(): Promise<void> {
    const qz = window.qz!;

    // Fetch the certificate (public key / cert presented to QZ Tray for verification)
    const certResponse = await fetch(QZ_CERT_URL);
    if (!certResponse.ok) {
        throw new Error(`[QZ] Failed to fetch certificate from ${QZ_CERT_URL} (${certResponse.status})`);
    }
    const certificate = await certResponse.text();

    // Tell QZ Tray which certificate to use for verifying signatures
    qz.security.setCertificatePromise(
        (resolve: (cert: string) => void, _reject: (err: Error) => void) => {
            resolve(certificate);
        },
    );

    // Algorithm must be declared before setSignaturePromise
    qz.security.setSignatureAlgorithm('SHA512');

    // Each outgoing QZ Tray message is signed via the backend API
    qz.security.setSignaturePromise((toSign: string) => ({
        toPromise: async (): Promise<string> => {
            const res = await fetch(QZ_SIGN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // `toSign` is the plaintext string QZ Tray wants signed
                body: JSON.stringify({ data: toSign }),
            });

            if (!res.ok) {
                const text = await res.text().catch(() => res.statusText);
                throw new Error(`[QZ] Signing request failed (${res.status}): ${text}`);
            }

            const json = await res.json() as { signature?: string; error?: string };
            if (!json.signature) {
                throw new Error(`[QZ] Signing API did not return a signature: ${json.error ?? 'unknown error'}`);
            }
            return json.signature;
        },
    }));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load the QZ Tray script, configure RSA-SHA512 signing, and open a WebSocket
 * connection to the local QZ Tray daemon.
 *
 * Safe to call multiple times — reconnects only when the socket is not active.
 *
 * @throws if QZ Tray is not running on this machine or signing fails.
 */
export async function qzConnect(): Promise<void> {
    await loadQzScript();
    const qz = window.qz!;

    // Re-apply security on every call so that a fresh certificate/signature
    // handler is always registered (important after page navigations).
    await applySignedSecurity();

    if (qz.websocket.isActive()) return;

    await qz.websocket.connect({ retries: 3, delay: 1 });
}

/**
 * Gracefully close the WebSocket connection to QZ Tray.
 */
export async function qzDisconnect(): Promise<void> {
    if (typeof window === 'undefined' || !window.qz) return;
    if (window.qz.websocket.isActive()) {
        await window.qz.websocket.disconnect();
    }
}

/**
 * Returns `true` when the WebSocket link to QZ Tray is currently live.
 */
export function qzIsConnected(): boolean {
    if (typeof window === 'undefined' || !window.qz) return false;
    return !!window.qz.websocket.isActive();
}

/**
 * List every printer that QZ Tray can see (USB, network, virtual, etc.).
 * Requires an active connection.
 */
export async function qzGetPrinters(): Promise<string[]> {
    if (!window.qz) throw new Error('[QZ] Script not loaded yet.');
    const result: unknown = await window.qz.printers.find();
    return Array.isArray(result) ? (result as string[]) : [result as string];
}

/**
 * Return the OS-level default printer name.
 * Requires an active connection.
 */
export async function qzGetDefaultPrinter(): Promise<string> {
    if (!window.qz) throw new Error('[QZ] Script not loaded yet.');
    return window.qz.printers.getDefault() as Promise<string>;
}

/**
 * Print an array of base64-encoded PNG label images **directly** to the named
 * printer — no browser print dialog, no PDF, no preview.
 *
 * Each PNG is treated as one thermal label (2 × 1 inch by default).
 *
 * @param printerName  Exact printer name as returned by `qzGetPrinters()`.
 * @param labelsBase64 Array of base64 PNG strings (with or without data-URI prefix).
 * @param opts         Optional overrides for label dimensions / copies.
 */
export async function qzPrintLabels(
    printerName: string,
    labelsBase64: string[],
    opts: { widthIn?: number; heightIn?: number; copies?: number } = {},
): Promise<void> {
    if (!window.qz) throw new Error('[QZ] Script not loaded yet.');

    const { widthIn = 2, heightIn = 1, copies = 1 } = opts;

    const config = window.qz.configs.create(printerName, {
        size: { width: widthIn, height: heightIn },
        units: 'in',
        scaleContent: true,
        margins: 0,
        colorType: 'blackwhite',
        duplex: false,
        copies,
    });

    const printData = labelsBase64.map((b64: string) => ({
        type: 'pixel',
        format: 'image',
        flavor: 'base64',
        // Strip data-URI prefix if present
        data: b64.replace(/^data:image\/[^;]+;base64,/, ''),
    }));

    await window.qz.print(config, printData);
}
