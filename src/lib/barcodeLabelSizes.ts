export const BARCODE_LABEL_SIZES = {
  small: {
    label: 'Small',
    sizeText: '38.1 x 21.2 mm',
    hint: 'For small items',
    widthIn: 1.5,
    heightIn: 0.8346456692913385,
    screenWidthPx: 144,
    screenPadding: '5px 6px',
    sheetMarginMm: 8,
    sheetGapMm: 0,
    printPadding: '0.9mm 1mm',
    barcodeScale: 2,
    barcodeHeightMm: 4,
    barcodeTextSize: 7,
    barcodePaddingWidth: 3,
    barcodePaddingHeight: 1,
    printLogoWidth: '8.5mm',
    printLogoHeight: '2.4mm',
    printTopMinHeight: '2.8mm',
    printProductFont: '5pt',
    printPriceFont: '5pt',
    printBarcodeMaxWidth: '35mm',
    printBarcodeMaxHeight: '8mm',
  },
  medium: {
    label: 'Standard',
    sizeText: '52.5 x 29.7 mm',
    hint: 'Default thermal label',
    widthIn: 2.0669291338582676,
    heightIn: 1.169291338582677,
    screenWidthPx: 192,
    screenPadding: '6px 8px',
    sheetMarginMm: 0,
    sheetGapMm: 0,
    printPadding: '1.3mm 1.8mm',
    barcodeScale: 3,
    barcodeHeightMm: 6.5,
    barcodeTextSize: 9,
    barcodePaddingWidth: 4,
    barcodePaddingHeight: 2,
    printLogoWidth: '13mm',
    printLogoHeight: '3.5mm',
    printTopMinHeight: '3.8mm',
    printProductFont: '7pt',
    printPriceFont: '7pt',
    printBarcodeMaxWidth: '48mm',
    printBarcodeMaxHeight: '12mm',
  },
  large: {
    label: 'Large',
    sizeText: '2.52" x 1.34"',
    hint: 'For larger products',
    widthIn: 2.52,
    heightIn: 1.34,
    screenWidthPx: 288,
    screenPadding: '8px 10px',
    sheetMarginMm: 6,
    sheetGapMm: 1.5,
    printPadding: '1.6mm 2mm',
    barcodeScale: 3,
    barcodeHeightMm: 6,
    barcodeTextSize: 8,
    barcodePaddingWidth: 1,
    barcodePaddingHeight: 1,
    printLogoWidth: '20mm',
    printLogoHeight: '5.2mm',
    printTopMinHeight: '5.6mm',
    printProductFont: '8pt',
    printPriceFont: '8pt',
    printBarcodeMaxWidth: '59mm',
    printBarcodeMaxHeight: '15mm',
  },
} as const;

export type BarcodeLabelSizeKey = keyof typeof BARCODE_LABEL_SIZES;

export const DEFAULT_BARCODE_LABEL_SIZE: BarcodeLabelSizeKey = 'medium';

export const BARCODE_LABEL_SIZE_OPTIONS = Object.entries(BARCODE_LABEL_SIZES).map(
  ([value, config]) => ({
    value: value as BarcodeLabelSizeKey,
    label: config.label,
    sizeText: config.sizeText,
    hint: config.hint,
  })
);

export function getBarcodeLabelSize(value: string | null | undefined) {
  if (value && value in BARCODE_LABEL_SIZES) {
    return BARCODE_LABEL_SIZES[value as BarcodeLabelSizeKey];
  }
  return BARCODE_LABEL_SIZES[DEFAULT_BARCODE_LABEL_SIZE];
}
