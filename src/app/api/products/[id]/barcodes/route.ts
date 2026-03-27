/**
 * GET /api/products/:id/barcodes
 *
 * Returns an HTML page containing one barcode label per unit of the product.
 * The HTML is designed to be opened in a new browser tab and printed directly
 * (window.print()).  Each label is sized for a standard 2″×1″ thermal label
 * (50.8 mm × 25.4 mm) but looks fine on A4 too — the browser wraps labels
 * automatically.
 *
 * Query params:
 *   copies  – number of copies to print per unit (default 1)
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bwipjs from 'bwip-js/node';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function zeroPad(n: number, width: number) {
  return String(n).padStart(width, '0');
}

/**
 * Same logic as in the POST route — derives a short prefix from the product name.
 * e.g. "Steel Glass" → "SG", "Fogg Perfume" → "FP", "Samsung" → "SAM"
 */
function unitPrefix(name: string): string {
  const words = name.trim().toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.map(w => w[0]).join('').slice(0, 4);
  return (words[0] ?? 'P').slice(0, 4);
}

/** Render a single barcode as a base64 PNG using bwip-js */
async function renderBarcodePng(text: string): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 3,
    height: 12,       // bar height in mm
    includetext: true,
    textxalign: 'center',
    textsize: 9,
    paddingwidth: 4,
    paddingheight: 2,
  });
  return `data:image/png;base64,${png.toString('base64')}`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    }

    const product = await ProductModel.findById(id).lean();
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const copies = Math.min(
      10,
      Math.max(1, Number(request.nextUrl.searchParams.get('copies') ?? 1)),
    );

    // `from` lets a restock print only the newly added units (e.g. ?from=141)
    const counter = (product as { unitCounter?: number }).unitCounter ?? product.totalQty;
    const fromParam = request.nextUrl.searchParams.get('from');
    const fromUnit = fromParam ? Math.max(1, Number(fromParam)) : 1;
    const toUnit = counter;

    const prefix = unitPrefix(product.name);
    const padWidth = String(toUnit).length;

    // Build one barcode code per unit using sequential product numbers
    // e.g. "SG-0001", "SG-0002" … "SG-0140"
    const unitCodes: string[] = [];
    for (let i = fromUnit; i <= toUnit; i++) {
      const code = `${prefix}-${zeroPad(i, padWidth)}`;
      for (let c = 0; c < copies; c++) {
        unitCodes.push(code);
      }
    }
    const totalUnits = toUnit - fromUnit + 1;

    // Generate all PNG barcodes in parallel (chunked to avoid OOM for huge qty)
    const CHUNK = 50;
    const images: string[] = [];
    for (let i = 0; i < unitCodes.length; i += CHUNK) {
      const chunk = unitCodes.slice(i, i + CHUNK);
      const rendered = await Promise.all(chunk.map(renderBarcodePng));
      images.push(...rendered);
    }

    // Build the printable HTML page
    const labelItems = images
      .map(
        (src, idx) => {
          const unitNum = fromUnit + Math.floor(idx / copies);
          const code = `${prefix}-${zeroPad(unitNum, padWidth)}`;
          return `
      <div class="label">
        <p class="unit-price">$${product.price.toFixed(2)}</p>
        <p class="product-name">${escapeHtml(product.name)}</p>
        <img src="${src}" alt="barcode" />
        <p class="unit-info">${code}</p>
      </div>`;
        },
      )
      .join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Barcodes — ${escapeHtml(product.name)}</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f8f9fa;
      padding: 16px;
    }

    /* ── Screen toolbar ── */
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 20px;
      margin-bottom: 20px;
      gap: 12px;
    }
    .toolbar h1 {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
    }
    .toolbar p {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 10px;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .btn-print:hover { background: #4338ca; }

    /* ── Label grid ── */
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .label {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      width: 192px;   /* ~50.8 mm at 96 dpi */
      padding: 6px 8px;
      text-align: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .label .product-name {
      font-size: 9px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .label .unit-price {
      font-size: 10px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 2px;
    }

    .label img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    .label .unit-info {
      font-size: 8px;
      color: #64748b;
      margin-top: 4px;
      font-family: monospace;
    }

    /* ── Print styles ── */
    @media print {
      body { background: #fff; padding: 4mm; }
      .toolbar { display: none !important; }
      .grid { gap: 4mm; }

      /* 2 × 1 inch label for thermal; ~50.8 × 25.4 mm */
      .label {
        width: 50.8mm;
        border: 0.4pt solid #aaa;
        border-radius: 0;
        padding: 1.5mm 2mm;
      }

      .label .unit-price   { font-size: 7pt; font-weight: 800; }
      .label .product-name { font-size: 7pt; }
      .label .unit-info    { font-size: 6pt; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <h1>📦 ${escapeHtml(product.name)}</h1>
      <p>SKU: ${escapeHtml(product.sku)} &nbsp;·&nbsp; ${unitCodes.length} label${unitCodes.length !== 1 ? 's' : ''} total (${totalUnits} unit${totalUnits !== 1 ? 's' : ''}${copies > 1 ? ` × ${copies} copies` : ''}${fromParam ? ` · restocked batch` : ''})</p>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Print Labels</button>
  </div>
  <div class="grid">
${labelItems}
  </div>
  <script>
    // Auto-open print dialog when the page loads (useful for direct printing)
    window.addEventListener('load', () => {
      // Small delay so images are fully rendered
      setTimeout(() => { window.print(); }, 600);
    });
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[GET /api/products/:id/barcodes]', err);
    return NextResponse.json({ error: 'Failed to generate barcodes.' }, { status: 500 });
  }
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
