# Multi-Code Tag Scanning Guide

## Overview
The barcode scanner now supports **scanning entire product tags** that contain:
- **Product Barcode** (required)
- **IMEI 1** (optional - primary IMEI)
- **IMEI 2** (optional - secondary IMEI)

All in one scan! No need to manually select fields.

## How It Works

### Supported Tag Formats

Your product tags should be **QR codes** that encode data in one of these formats:

#### Format 1: Just Barcode
```
123456789
```
Extracts: Barcode only

#### Format 2: Barcode + IMEI 1
```
123456789|351234567890123
```
Extracts:
- Barcode: `123456789`
- IMEI 1: `351234567890123`

#### Format 3: Barcode + IMEI 1 + IMEI 2 (Full)
```
123456789|351234567890123|351234567890124
```
Extracts:
- Barcode: `123456789`
- IMEI 1: `351234567890123`
- IMEI 2: `351234567890124`

#### Format 4: Comma-Separated (Alternative)
```
123456789,351234567890123,351234567890124
```
Same result as pipe-separated format.

## Usage

1. **Open Scanner** → Tap "Scan Barcode"
2. **Point at Tag** → Point camera at your product tag/sticker
3. **Data Auto-Extracted** → App automatically parses barcode and both IMEIs
4. **Review** → See all extracted values at bottom:
   - ✅ Barcode: `123456789`
   - ✅ IMEI 1: `351234567890123`
   - ✅ IMEI 2: `351234567890124` (if available)
5. **Confirm** → Tap "Process Scan"
6. **Form Auto-Fill** → All fields populate from extracted data

## Validation Rules

| Field | Rules |
|-------|-------|
| **Barcode** | Any alphanumeric value (required) |
| **IMEI 1** | Must be exactly 15 digits (if provided) |
| **IMEI 2** | Must be exactly 15 digits (if provided) |

✅ Valid: `123456789\|351234567890123\|351234567890124`
❌ Invalid: `123456789\|123\|wrong_imei` (IMEI not 15 digits)

## Examples

### Example 1: Phone with Both IMEIs
```
QR Code Content: Apple-iPhone15-256GB|351234567890123|351234567890124

Results:
✓ Barcode: Apple-iPhone15-256GB
✓ IMEI 1: 351234567890123  
✓ IMEI 2: 351234567890124
```

### Example 2: Product with One IMEI
```
QR Code Content: Samsung-A54|351234567890123

Results:
✓ Barcode: Samsung-A54
✓ IMEI 1: 351234567890123
✓ IMEI 2: (Optional)
```

### Example 3: Simple Product (No IMEI)
```
QR Code Content: Tablet-123456789

Results:
✓ Barcode: Tablet-123456789
✓ IMEI 1: (Optional)
✓ IMEI 2: (Optional)
```

## Features

✅ **One-Scan Multiple Fields** — No need to scan barcode and IMEI separately  
✅ **Automatic Parsing** — Instantly extracts all data from QR  
✅ **Smart Detection** — Validates IMEI format (15 digits)  
✅ **Flexible** — Works with or without IMEIs  
✅ **Format Agnostic** — Supports pipe (`|`) or comma (`,`) separators  
✅ **Error Handling** — Falls back gracefully if format is invalid  

## Troubleshooting

### "No data extracted" error
- Ensure QR code contains pipe (`|`) or comma (`,`) separators
- Check IMEI values are exactly 15 digits
- Verify barcode is not empty

### IMEI not detected
- IMEIs must be exactly 15 digits
- Check format: `barcode|15digit|15digit`
- Invalid: `barcode|123|456` (not 15 digits each)

### Wrong values extracted
- Verify QR code format matches expected format
- Check for extra spaces or characters
- Ensure proper separator (pipe or comma)

## API Integration

When you process a scan, all three values are sent to the backend:

```
POST /api/scans/ingest/
{
  "product_barcode": "123456789",
  "imei_primary": "351234567890123",      // Optional
  "imei_secondary": "351234567890124",    // Optional
  "source": "fe-image-processing"
}
```

Backend responds with:
```json
{
  "product_found": true,
  "action": "quantity_increased",
  "product": { ... },
  "prefill": {
    "product_barcode": "123456789",
    "imei_primary": "351234567890123",
    "imei_secondary": "351234567890124",
    "quantity": 1
  }
}
```

## Generating QR Codes

To create your product tags:

1. **Choose QR Code Generator** → Use any online tool:
   - https://www.qr-code-generator.com/
   - https://goqr.me/
   - Any QR code library

2. **Format Data** → Use one of these formats:
   ```
   barcode|imei1|imei2      (recommended)
   barcode|imei1            (if no IMEI2)
   barcode                  (if no IMEIs)
   ```

3. **Generate QR** → Paste into generator, create QR code

4. **Print** → Print and attach to product labels

### Example QR Code Generator Command
```bash
# Using qrencode (Linux/Mac)
qrencode -o product_tag.png "123456789|351234567890123|351234567890124"

# Using Python
python -c "import qrcode; qr = qrcode.QRCode(); qr.add_data('123456789|351234567890123|351234567890124'); qr.make(); qr.make_image().save('product_tag.png')"
```

## Technical Details

- **Parser Location**: `src/utils/tagParser.ts`
- **Scanner Location**: `src/screens/Scan/ScanScreen.tsx`
- **API Endpoint**: `POST /api/scans/ingest/`
- **Supported Separators**: Pipe (`|`), Comma (`,`)
- **IMEI Validation**: Exactly 15 digits
- **Error Handling**: Graceful fallback to raw data if parsing fails

## Next Steps

1. ✅ Generate QR codes with your product data
2. ✅ Print and attach to product labels
3. ✅ Point camera at tags and scan
4. ✅ Auto-fill form and create products
5. ✅ Track inventory efficiently
