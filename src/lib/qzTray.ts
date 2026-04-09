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
 *  3. When prompted by QZ Tray, click "Allow" for this site.
 *
 * This module is browser-only. All functions are no-ops / throw on the server.
 */

/* ── Global qz type (the library uses a window.qz global) ─────────────────── */
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        qz?: any;
    }
}

// QZ Tray 2.2.x CDN bundle — no npm package needed
const QZ_CDN_URL = '/qz-tray.js';
let _scriptLoadPromise: Promise<void> | null = null;

// ── Script loading ────────────────────────────────────────────────────────────

/**
 * Dynamically inserts the QZ Tray <script> tag once and returns a promise that
 * resolves when the global `window.qz` is available.
 */
function loadQzScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error('[QZ] Cannot load in a server-side context.'));
    }
    if (window.qz) return Promise.resolve();
    if (_scriptLoadPromise) return _scriptLoadPromise;

    _scriptLoadPromise = new Promise<void>((resolve, reject) => {
        // Avoid adding the tag twice if somehow called in parallel
        if (document.querySelector(`script[src="${QZ_CDN_URL}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = QZ_CDN_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => {
            _scriptLoadPromise = null; // allow retrying
            reject(new Error('[QZ] Failed to load qz-tray script from CDN. Check your internet connection.'));
        };
        document.head.appendChild(script);
    });

    return _scriptLoadPromise;
}

// ── Security setup ────────────────────────────────────────────────────────────

/**
 * Applies an *unsigned* security configuration — suitable for localhost /
 * private-network deployments where the site is trusted.
 *
 * For a public-facing site you should supply a signed certificate instead.
 * See: https://qz.io/wiki/2.0-signing-messages
 */
function applyUnsignedSecurity(): void {
    const qz = window.qz!;
    // Empty certificate = QZ Tray will prompt the user to allow the connection
    qz.security.setCertificatePromise(
        (resolve: (cert: string) => void) => resolve(''),
    );
    qz.security.setSignatureAlgorithm('SHA512');
    // Return the string to-sign unchanged — no actual signing
    qz.security.setSignaturePromise(
        (toSign: string) => ({
            toPromise: (): Promise<string> => Promise.resolve(toSign),
        }),
    );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Load the QZ Tray script and open a WebSocket connection to the local daemon.
 * Safe to call multiple times — reconnects only when not already active.
 *
 * @throws if QZ Tray is not running on this machine.
 */
export async function qzConnect(): Promise<void> {
    await loadQzScript();
    const qz = window.qz!;
    if (qz.websocket.isActive()) return;
    applyUnsignedSecurity();
    await qz.websocket.connect({ retries: 2, delay: 1 });
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
