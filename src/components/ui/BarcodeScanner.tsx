'use client';
/**
 * BarcodeScanner
 * Uses @zxing/browser to access the device camera and decode barcodes in real-time.
 * Works on both Android and iOS (Safari 14.1+, Chrome on Android).
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
  const videoRef   = useRef<HTMLVideoElement>(null);
  const readerRef  = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [cameras, setCameras]       = useState<MediaDeviceInfo[]>([]);
  const [activeCam, setActiveCam]   = useState<string>('');
  const [error, setError]           = useState('');
  const [lastScan, setLastScan]     = useState('');
  const [scanFlash, setScanFlash]   = useState(false);

  // Load available cameras
  useEffect(() => {
    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        setCameras(devices);
        // Prefer back/rear camera on mobile
        const rear = devices.find(d =>
          /back|rear|environment/i.test(d.label),
        );
        setActiveCam((rear ?? devices[0])?.deviceId ?? '');
      })
      .catch(() => setError('Could not access cameras. Please allow camera permission.'));
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

  return (
    /* Fullscreen overlay */
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-safe-top py-4">
        <div className="text-white font-semibold text-sm">Scan Barcode</div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <Icon name="XMarkIcon" className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera selector (only show if >1 camera) */}
      {cameras.length > 1 && (
        <div className="absolute top-14 left-0 right-0 flex justify-center">
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

      {/* Video viewport */}
      <div className="relative w-full max-w-sm mx-auto aspect-square">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover rounded-2xl transition-all duration-150 ${scanFlash ? 'brightness-150' : ''}`}
          muted
          playsInline
          autoPlay
        />

        {/* Scan frame overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Corner brackets */}
          <div className="relative w-56 h-56">
            {/* Top-left */}
            <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            {/* Top-right */}
            <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            {/* Bottom-left */}
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            {/* Bottom-right */}
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

            {/* Scan line animation */}
            {!error && (
              <div className="absolute left-2 right-2 top-0 h-0.5 bg-emerald-400/80 animate-scan-line rounded-full" />
            )}
          </div>
        </div>

        {/* Success flash ring */}
        {scanFlash && (
          <div className="absolute inset-0 rounded-2xl ring-4 ring-emerald-400 animate-ping-once pointer-events-none" />
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-6 mx-4 flex items-center gap-2 bg-red-500/20 border border-red-400/40 text-red-300 text-sm px-4 py-3 rounded-xl">
          <Icon name="ExclamationCircleIcon" className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Instructions */}
      <p className="mt-6 text-white/50 text-xs text-center px-8">
        Point the camera at a product barcode. It will scan automatically.
      </p>

      {/* Last scanned */}
      {lastScan && (
        <div className="mt-3 px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 text-xs font-mono">
          ✓ {lastScan}
        </div>
      )}

      {/* Close button at bottom */}
      <button
        onClick={onClose}
        className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors"
      >
        Close Scanner
      </button>

      {/* CSS animation for scan line */}
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
