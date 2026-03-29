'use client';
/**
 * BarcodeScanner
 * Uses @zxing/browser to access the device camera and decode barcodes in real-time.
 * Works on both Android and iOS (Safari 14.1+, Chrome on Android).
 * IMPORTANT: Requires HTTPS (or localhost) — camera is blocked on plain HTTP by browsers.
 *
 * Props:
 *   onScan(code)  — called when a barcode is successfully decoded
 *   onClose()     — called when user dismisses the scanner
 */
import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import Icon from '@/components/ui/AppIcon';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const readerRef   = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);

  const [cameras, setCameras]     = useState<MediaDeviceInfo[]>([]);
  const [activeCam, setActiveCam] = useState<string>('');
  const [error, setError]         = useState('');
  const [lastScan, setLastScan]   = useState('');
  const [scanFlash, setScanFlash] = useState(false);
  const [permState, setPermState] = useState<'requesting' | 'granted' | 'denied'>('requesting');

  // Step 1: Check HTTPS, then call getUserMedia to trigger the permission prompt,
  // THEN enumerate devices (labels are only available after permission is granted).
  useEffect(() => {
    const isSecure =
      typeof window !== 'undefined' &&
      (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (!isSecure) {
      setPermState('denied');
      setError(
        'Camera requires a secure connection (HTTPS). Please open this page over HTTPS — e.g. https://' +
        (typeof window !== 'undefined' ? window.location.host : '') +
        ' — or use the same device as the server.',
      );
      return;
    }

    // Request camera permission explicitly first
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        setPermState('granted');
        // Now enumerate — labels are populated after permission
        return BrowserMultiFormatReader.listVideoInputDevices();
      })
      .then(devices => {
        setCameras(devices);
        // Prefer back/rear camera
        const rear = devices.find(d => /back|rear|environment/i.test(d.label));
        setActiveCam((rear ?? devices[0])?.deviceId ?? '');
        // Release the preliminary stream; the reader will open its own
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      })
      .catch(err => {
        setPermState('denied');
        const msg = (err as Error)?.message ?? '';
        if (/permission|denied|notallowed/i.test(msg)) {
          setError('Camera permission denied. Please allow camera access in your browser settings and try again.');
        } else if (/notfound|devicenotfound/i.test(msg)) {
          setError('No camera found on this device.');
        } else {
          setError(`Could not start camera: ${msg || 'Unknown error'}`);
        }
      });

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Start decoding when camera is selected
  useEffect(() => {
    if (!activeCam || !videoRef.current) return;

    setError('');
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(activeCam, videoRef.current, (result, err, controls) => {
        controlsRef.current = controls;
        if (result) {
          const code = result.getText();
          if (code === lastScan) return; // debounce duplicate scans
          setLastScan(code);
          setScanFlash(true);
          setTimeout(() => setScanFlash(false), 600);
          // Small delay so user sees the flash, then callback
          setTimeout(() => onScan(code), 300);
        } else if (err && !(err instanceof NotFoundException)) {
          // NotFoundException just means nothing in frame — ignore
          console.warn('[BarcodeScanner]', err);
        }
      })
      .catch(e => {
        setError(`Camera error: ${e?.message ?? 'Unknown error'}`);
      });

    return () => {
      try { controlsRef.current?.stop(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCam]);

  const isHttpsError = error.toLowerCase().includes('https') || error.toLowerCase().includes('secure connection');

  return (
    /* Fullscreen overlay */
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 shrink-0">
        <div className="text-white font-semibold text-sm tracking-wide">Scan Barcode</div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center transition-colors"
        >
          <Icon name="XMarkIcon" className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera selector (only show if >1 camera and permission granted) */}
      {permState === 'granted' && cameras.length > 1 && (
        <div className="flex justify-center py-2 bg-black/60 shrink-0">
          <select
            value={activeCam}
            onChange={e => {
              controlsRef.current?.stop();
              setActiveCam(e.target.value);
              setLastScan('');
            }}
            className="bg-black/50 text-white text-xs border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {cameras.map(c => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label || `Camera ${c.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Main body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">

        {/* ── REQUESTING PERMISSION ── */}
        {permState === 'requesting' && !error && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center">
              <Icon name="CameraIcon" className="w-8 h-8 text-white/70 animate-pulse" />
            </div>
            <p className="text-white/80 text-sm">Requesting camera permission…</p>
            <p className="text-white/40 text-xs">Please allow camera access when your browser asks.</p>
          </div>
        )}

        {/* ── ERROR / DENIED ── */}
        {permState === 'denied' && error && (
          <div className="flex flex-col items-center gap-5 text-center max-w-xs">
            {isHttpsError ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                  <Icon name="LockClosedIcon" className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <p className="text-amber-300 font-semibold text-base mb-1">HTTPS Required</p>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Mobile browsers only allow camera access over a <span className="text-amber-300 font-medium">secure (HTTPS)</span> connection.
                  </p>
                </div>
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-left">
                  <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">How to fix</p>
                  <ol className="space-y-2 text-xs text-white/60 list-none">
                    <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">1.</span> Stop the dev server</li>
                    <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">2.</span> Run: <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono">npm run dev</code> (HTTPS is now enabled)</li>
                    <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">3.</span> Open <code className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-300 font-mono">https://</code> URL on your phone</li>
                    <li className="flex gap-2"><span className="text-emerald-400 font-bold shrink-0">4.</span> Accept the self-signed certificate warning</li>
                  </ol>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                  <Icon name="ExclamationCircleIcon" className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <p className="text-red-300 font-semibold text-base mb-1">Camera Unavailable</p>
                  <p className="text-white/60 text-sm leading-relaxed">{error}</p>
                </div>
                <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/50">
                  To fix: go to your browser settings → Site Settings → Camera → Allow for this site.
                </div>
              </>
            )}
          </div>
        )}

        {/* ── VIDEO VIEWPORT (permission granted, no error) ── */}
        {permState === 'granted' && !error && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="relative w-full max-w-sm aspect-square">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover rounded-2xl transition-all duration-150 ${scanFlash ? 'brightness-150' : ''}`}
                muted
                playsInline
                autoPlay
              />

              {/* Scan frame corners */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-56 h-56">
                  <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  <div className="absolute left-2 right-2 top-0 h-0.5 bg-emerald-400/80 animate-scan-line rounded-full" />
                </div>
              </div>

              {/* Success flash ring */}
              {scanFlash && (
                <div className="absolute inset-0 rounded-2xl ring-4 ring-emerald-400 animate-ping-once pointer-events-none" />
              )}
            </div>

            <p className="text-white/50 text-xs text-center">
              Point camera at a product barcode — it scans automatically.
            </p>

            {lastScan && (
              <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 text-xs font-mono">
                ✓ {lastScan}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Close button at bottom */}
      <div className="shrink-0 px-6 pb-8 pt-4">
        <button
          onClick={onClose}
          className="w-full py-3 bg-white/10 active:bg-white/20 text-white text-sm font-medium rounded-2xl transition-colors"
        >
          Close Scanner
        </button>
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes scan-line {
          0%   { top: 0; }
          50%  { top: calc(100% - 2px); }
          100% { top: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
        @keyframes ping-once {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.05); }
        }
        .animate-ping-once {
          animation: ping-once 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
