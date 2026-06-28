import { ExpoWebSpeechRecognition } from 'expo-speech-recognition';

export interface SpeechResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}


let recognition: any;
try {
  recognition = new ExpoWebSpeechRecognition();
} catch (e) {
  console.warn('Speech recognition native module not found. Falling back to mock.');
  recognition = {
    start: () => console.warn('Speech recognition: start() called but module not available'),
    stop: () => console.warn('Speech recognition: stop() called but module not available'),
    onresult: null,
    onerror: null,
    onend: null,
    lang: 'en-US',
    continuous: true,
    interimResults: true,
  };
}

export class SpeechRecognitionService {
  private isListening = false;
  private transcript = '';
  private lastInterimTranscript = '';
  private stopResolver: ((value: string) => void) | null = null;

  async initialize(): Promise<boolean> {
    try {
      console.log('🎤 Speech recognition initialized');
      return true;
    } catch (error) {
      console.error('Speech recognition not available:', error);
      return false;
    }
  }

  async startListening(
    onResult: (result: SpeechResult) => void,
    language: string = 'en-US'
  ): Promise<void> {
    try {
      if (this.isListening) {
        console.warn('Already listening');
        return;
      }

      this.isListening = true;
      this.transcript = '';
      this.lastInterimTranscript = '';

      console.log('🎤 Starting speech recognition...');

      // Setup result handler
      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let hasFinalResult = false;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            this.transcript += transcript + ' ';
            hasFinalResult = true;
          } else {
            interimTranscript += transcript;
          }
        }

        // Keep track of last interim in case final is empty
        if (interimTranscript) {
          this.lastInterimTranscript = interimTranscript;
        }

        const current = this.transcript + interimTranscript;
        console.log('📝 Interim transcript:', current);
        console.log('Interim transcript:', current);
        
        onResult({
          transcript: current,
          isFinal: event.results[event.results.length - 1].isFinal,
          confidence: event.results[event.results.length - 1][0].confidence || 0.9,
        });

        // If we got a final result, resolve the stop promise
        if (hasFinalResult && this.stopResolver) {
          const finalTranscript = this.transcript.trim() || this.lastInterimTranscript.trim();
          this.stopResolver(finalTranscript);
          this.stopResolver = null;
        }
      };

      // Setup error handler
      recognition.onerror = (event: any) => {
        console.error('🚨 Speech recognition error:', event.error);
        this.isListening = false;
        if (this.stopResolver) {
          this.stopResolver(this.lastInterimTranscript.trim());
          this.stopResolver = null;
        }
      };

      // Setup end handler
      recognition.onend = () => {
        console.log('🛑 Speech recognition ended');
        this.isListening = false;
        // Resolve with best available transcript if not already resolved
        if (this.stopResolver) {
          const finalTranscript = this.transcript.trim() || this.lastInterimTranscript.trim();
          this.stopResolver(finalTranscript);
          this.stopResolver = null;
        }
      };

      // Start recognition
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.start();

      console.log('🎤 Listening...');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.isListening = false;
      throw error;
    }
  }

  async stopListening(): Promise<string> {
    try {
      if (!this.isListening) {
        return this.transcript;
      }

      console.log('🛑 Speech recognition stopped');

      // Create a promise that will be resolved when we get the final result
      const resultPromise = new Promise<string>((resolve) => {
        this.stopResolver = resolve;
        // Timeout after 2 seconds to use interim transcript
        setTimeout(() => {
          if (this.stopResolver) {
            const finalTranscript = this.transcript.trim() || this.lastInterimTranscript.trim();
            this.stopResolver(finalTranscript);
            this.stopResolver = null;
          }
        }, 2000);
      });

      recognition.stop();
      this.isListening = false;

      const finalTranscript = await resultPromise;
      console.log('✅ Final transcript:', finalTranscript);

      return finalTranscript;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      this.isListening = false;
      throw error;
    }
  }

  getTranscript(): string {
    return this.transcript;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

export const speechService = new SpeechRecognitionService();
