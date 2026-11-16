import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * On-device OCR from `expo-text-extractor` (ML Kit on Android, Apple Vision on iOS).
 *
 * The package's own entry point calls `requireNativeModule`, which throws at import time
 * wherever its native code is missing (Expo Go, builds made before it was added, web).
 * Loading the native module optionally lets the app run there and just hide scanning.
 */
type TextExtractor = {
  isSupported: boolean;
  extractTextFromImage(uri: string): Promise<string[]>;
};

const native = Platform.OS === 'web' ? null : requireOptionalNativeModule<TextExtractor>('ExpoTextExtractor');

export const textRecognitionAvailable = !!native?.isSupported;

/** Recognised text from a local image. Each entry may span several lines (Android returns blocks). */
export async function recognizeText(uri: string): Promise<string[]> {
  if (!native) throw new Error('Text recognition is not available in this build of the app.');
  // Same path handling as the package's JS wrapper.
  return native.extractTextFromImage(uri.replace('file://', ''));
}
