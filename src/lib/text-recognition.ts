import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * On-device OCR through our local Expo module (modules/mlkit-text-recognition), which wraps
 * Google's official ML Kit text recognition v2 with the bundled Latin model. Android only for now.
 *
 * Loaded optionally so the app still runs where the native code is missing (Expo Go, older
 * builds, iOS, web) and simply hides scanning there.
 */
type MlkitTextRecognition = {
  isSupported: boolean;
  recognizeAsync(uri: string): Promise<string[]>;
};

const native = Platform.OS === 'android' ? requireOptionalNativeModule<MlkitTextRecognition>('MlkitTextRecognition') : null;

export const textRecognitionAvailable = !!native?.isSupported;

/** Recognised text blocks from a local image (file:// or content:// URI); a block may span several lines. */
export async function recognizeText(uri: string): Promise<string[]> {
  if (!native) throw new Error('Text recognition is not available in this build of the app.');
  return native.recognizeAsync(uri);
}
