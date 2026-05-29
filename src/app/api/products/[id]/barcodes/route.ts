/**
 * GET /api/products/:id/barcodes
 *
 * Returns an HTML page containing one barcode label per unit of the product.
 * The HTML is designed to be opened in a new browser tab and printed on A4.
 * The screen preview renders exact A4 sheets with labels laid out across each
 * page, so the printed result matches the preview.
 *
 * Query params:
 *   copies  – number of copies to print per unit (default 1)
 *   size    – label size preset: small, medium, large (default medium)
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bwipjs from 'bwip-js/node';
import { connectToDatabase } from '@/lib/db';
import { ProductModel } from '@/lib/models/Product';
import { getBarcodeLabelSize } from '@/lib/barcodeLabelSizes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

function zeroPad(n: number, width: number) {
  return String(n).padStart(width, '0');
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

function inchesToMm(value: number) {
  return Number((value * 25.4).toFixed(2));
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Same logic as in the POST route — derives a short prefix from the product name.
 * e.g. "Steel Glass" → "SG", "Fogg Perfume" → "FP", "Samsung" → "SAM"
 */
function unitPrefix(name: string): string {
  const words = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length >= 2)
    return words
      .map((w) => w[0])
      .join('')
      .slice(0, 4);
  return (words[0] ?? 'P').slice(0, 4);
}

/** Render a single barcode as a base64 PNG using bwip-js */
async function renderBarcodePng(
  text: string,
  labelSize: ReturnType<typeof getBarcodeLabelSize>
): Promise<string> {
  const png = await bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: labelSize.barcodeScale,
    height: labelSize.barcodeHeightMm,
    includetext: false,
    textxalign: 'center',
    textsize: labelSize.barcodeTextSize,
    paddingwidth: labelSize.barcodePaddingWidth,
    paddingheight: labelSize.barcodePaddingHeight,
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
      Math.max(1, Number(request.nextUrl.searchParams.get('copies') ?? 1))
    );
    const labelSize = getBarcodeLabelSize(request.nextUrl.searchParams.get('size'));

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
      const rendered = await Promise.all(chunk.map((code) => renderBarcodePng(code, labelSize)));
      images.push(...rendered);
    }

    // ── JSON response for QZ Tray direct printing ─────────────────────────
    // When ?format=json is passed, return raw base64 label data instead of HTML.
    // The browser-side QZ Tray client consumes this to print without any dialog.
    const format = request.nextUrl.searchParams.get('format');
    if (format === 'json') {
      const labels = images.map((src, idx) => {
        const unitNum = fromUnit + Math.floor(idx / copies);
        const code = `${prefix}-${zeroPad(unitNum, padWidth)}`;
        return { code, pngBase64: src };
      });
      return NextResponse.json(
        {
          productName: product.name,
          sku: product.sku,
          price: product.price,
          labelSize: {
            widthIn: labelSize.widthIn,
            heightIn: labelSize.heightIn,
          },
          labels,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const labelWidthMm = inchesToMm(labelSize.widthIn);
    const labelHeightMm = inchesToMm(labelSize.heightIn);
    const sheetContentWidthMm = A4_WIDTH_MM - labelSize.sheetMarginMm * 2;
    const sheetContentHeightMm = A4_HEIGHT_MM - labelSize.sheetMarginMm * 2;
    const labelsPerRow = Math.max(
      1,
      Math.floor((sheetContentWidthMm + labelSize.sheetGapMm) / (labelWidthMm + labelSize.sheetGapMm))
    );
    const labelsPerColumn = Math.max(
      1,
      Math.floor((sheetContentHeightMm + labelSize.sheetGapMm) / (labelHeightMm + labelSize.sheetGapMm))
    );
    const labelsPerSheet = labelsPerRow * labelsPerColumn;

    // Build the printable A4 preview pages.
    const labelItems = images.map((src, idx) => {
      const unitNum = fromUnit + Math.floor(idx / copies);
      const code = `${prefix}-${zeroPad(unitNum, padWidth)}`;
      return `
        <div class="label">
          <div class="label-top">
            <img class="brand-logo" src="${request.nextUrl.origin}/assets/images/app_logo.png" alt="SRS brand logo" />
            <p class="product-name">${escapeHtml(product.name)}</p>
            <p class="unit-price">₹${product.price.toFixed(2)}</p>
          </div>
          <div class="barcode-wrap">
            <img src="${src}" alt="barcode ${escapeHtml(code)}" />
          </div>
          <p class="barcode-code">${escapeHtml(code)}</p>
        </div>`;
    });

    const sheets = chunkArray(labelItems, labelsPerSheet)
      .map((sheetLabels, idx) => {
        const emptySlots = Math.max(0, labelsPerSheet - sheetLabels.length);
        const fillers = Array.from({ length: emptySlots }, () => '<div class="label empty"></div>').join(
          '\n'
        );
        return `
      <section class="sheet" aria-label="A4 barcode sheet ${idx + 1}">
${sheetLabels.join('\n')}
${fillers}
      </section>`;
      })
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
      padding: 16px 0 32px;
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
      margin: 0 auto 20px;
      gap: 12px;
      width: 210mm;
      max-width: calc(100vw - 32px);
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

    /* ── A4 sheet preview ── */
    .sheets {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 18px;
    }

    .sheet {
      width: ${A4_WIDTH_MM}mm;
      height: ${A4_HEIGHT_MM}mm;
      padding: ${labelSize.sheetMarginMm}mm;
      background: #fff;
      border: 1px solid #cbd5e1;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
      display: grid;
      grid-template-columns: repeat(${labelsPerRow}, ${labelWidthMm}mm);
      grid-auto-rows: ${labelHeightMm}mm;
      gap: ${labelSize.sheetGapMm}mm;
      align-content: start;
      justify-content: center;
    }

    .label {
      background: #fff;
      border: 1px solid #cbd5e1;
      border-radius: 3px;
      width: ${labelWidthMm}mm;
      height: ${labelHeightMm}mm;
      padding: ${labelSize.printPadding};
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .label.empty {
      border-color: transparent;
    }

    .label .label-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.2mm;
      margin-bottom: 0.3mm;
      min-height: ${labelSize.printTopMinHeight};
      position: relative;
      width: 100%;
    }

    .label .brand-logo {
      width: ${labelSize.printLogoWidth};
      max-width: ${labelSize.printLogoWidth};
      height: ${labelSize.printLogoHeight};
      object-fit: contain;
      object-position: left center;
      margin: 0;
      display: block;
      flex-shrink: 0;
    }

    .label .product-name {
      font-size: ${labelSize.printProductFont};
      font-weight: 700;
      color: #1e293b;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      left: 50%;
      max-width: 42%;
      position: absolute;
      text-align: center;
      transform: translateX(-50%);
      width: max-content;
    }

    .label .unit-price {
      font-size: ${labelSize.printPriceFont};
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 0;
    }

    .label img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    .label .barcode-wrap {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex: 1;
      min-height: 0;
      margin-top: -0.3mm;
    }

    .barcode-wrap img {
      width: 100%;
      height: auto;
      max-width: ${labelSize.printBarcodeMaxWidth};
      max-height: ${labelSize.printBarcodeMaxHeight};
    }

    .label .barcode-code {
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: calc(${labelSize.printProductFont} + 0.2pt);
      font-weight: 400;
      line-height: 1;
      letter-spacing: 0.45mm;
      margin-top: 0.4mm;
      white-space: nowrap;
    }

    .label .unit-info {
      font-size: 8px;
      color: #64748b;
      margin-top: 4px;
      font-family: monospace;
    }

    /* ── A4 paper ── */
    @page {
      size: A4 portrait;
      margin: 0;
    }

    /* ── Print styles ── */
    @media print {
      html, body { background: #fff; margin: 0; padding: 0; }
      .toolbar { display: none !important; }
      .sheets {
        display: block;
      }
      .sheet {
        width: ${A4_WIDTH_MM}mm;
        height: ${A4_HEIGHT_MM}mm;
        padding: ${labelSize.sheetMarginMm}mm;
        border: none;
        box-shadow: none;
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: always;
        break-after: page;
      }
      .sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <h1>📦 ${escapeHtml(product.name)}</h1>
      <p>SKU: ${escapeHtml(product.sku)} &nbsp;·&nbsp; ${unitCodes.length} label${unitCodes.length !== 1 ? 's' : ''} total (${totalUnits} unit${totalUnits !== 1 ? 's' : ''}${copies > 1 ? ` × ${copies} copies` : ''}${fromParam ? ` · restocked batch` : ''}) &nbsp;·&nbsp; ${labelWidthMm}mm × ${labelHeightMm}mm labels &nbsp;·&nbsp; ${labelsPerSheet} per A4 sheet</p>
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Print Labels</button>
  </div>
  <div class="sheets">
${sheets}
  </div>
  <script>
    // Print button in toolbar — send to physical printer
    document.addEventListener('DOMContentLoaded', function () {
      var btn = document.querySelector('.btn-print');
      if (btn) {
        btn.addEventListener('click', function () { window.print(); });
        btn.removeAttribute('onclick');
      }
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
