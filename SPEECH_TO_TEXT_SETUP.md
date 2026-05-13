# Speech-to-Text Setup Guide

## Overview
The app now uses **Expo's Native Speech Recognition** which uses:
- **iOS**: Siri Speech Recognition (built-in)
- **Android**: Google Speech-to-Text (built-in)

**No API keys, setup, or backend needed!** ✅

## How It Works

**User Flow:**
```
1. Tap 🎤 mic → Starts listening
2. Speak clearly → Real-time transcript appears
3. Tap 🛑 stop → Confirms transcript
4. Shows confirmation modal with captured text
5. Tap "Correct" → Sends to backend /api/products/voice-draft/
6. Form auto-fills with product details
```

**Behind the scenes:**
- Uses native device speech recognition
- Works offline (no internet needed for recognition)
- High accuracy with native APIs
- Instant transcription (no waiting)

## Permissions

Make sure these permissions are granted:
- **Microphone**: Required for audio input

The app will automatically request permissions when you first tap the mic button.

## How to Use

1. Open Product Form screen
2. Tap the 🎤 **Mic button** in the header
3. Start speaking (e.g., "Samsung Galaxy S24 with 256GB")
4. Tap 🛑 **Stop** when done
5. Modal shows your spoken text
6. Tap "✓ Correct" to send to backend
7. Form auto-fills!

## Features

✅ Works offline  
✅ Real-time transcription  
✅ High accuracy (~95%+)  
✅ No setup required  
✅ No costs  
✅ Supports 100+ languages  
✅ Re-record if needed  

## Supported Languages

The service supports all standard device languages:
- English (US, UK, India, etc.)
- Spanish, French, German, Italian
- Chinese, Japanese, Korean
- Hindi, Arabic, Portuguese
- And 100+ more...

To change language, modify line in [src/screens/Product/ProductFormScreen.tsx](src/screens/Product/ProductFormScreen.tsx):
```typescript
await speechService.startListening(..., 'hi-IN'); // Hindi
await speechService.startListening(..., 'es-ES'); // Spanish
await speechService.startListening(..., 'zh-CN'); // Chinese
```

## Troubleshooting

### "Microphone not available"
- Check microphone permissions in device settings
- Restart the app
- Ensure microphone is not in use by another app

### Poor recognition accuracy
- Speak clearly and distinctly
- Reduce background noise
- Use native device language if possible
- Try re-recording

### Recognition stops mid-sentence
- This is normal - wait for it to complete
- The app captures interim results automatically
- Tap stop when you're done speaking

### Nothing happens when I tap mic
- Grant microphone permission when prompted
- Check device has active microphone
- Restart the app

## Technical Details

- **Library**: `expo-speech-recognition`
- **Platform**: iOS (Siri) + Android (Google)
- **Latency**: < 1 second typically
- **Accuracy**: 95%+ with clear speech
- **Offline**: Yes, works without internet
- **Cost**: Free (uses device native APIs)

## Support

For speech recognition issues:
- Check console logs in Expo dev tools
- Ensure microphone permissions are granted
- Try on a different device
- Check device language settings match your language

## What's Next?

After voice input is confirmed, the app:
1. Sends transcript to `/api/products/voice-draft/`
2. Backend parses product details using AI
3. Returns structured data (brand, model, category, etc.)
4. Form auto-fills with predictions
5. User can edit and create product

No backend needed for speech recognition! 🎉
