package expo.modules.mlkittextrecognition

import android.graphics.BitmapFactory
import android.media.ExifInterface
import android.net.Uri
import com.google.mlkit.common.sdkinternal.MlKitContext
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.IOException
import java.io.InputStream

/** Longest side we decode to. Label text stays well above ML Kit's 16px-per-character minimum. */
private const val MAX_SIDE = 2048

class ImageReadException(uri: String, cause: Throwable) :
  CodedException("ERR_IMAGE_READ", "Could not read the image ($uri): ${cause.message}", cause)

class RecognitionException(cause: Throwable) :
  CodedException("ERR_RECOGNITION", "Text recognition failed: ${cause.message}", cause)

/**
 * On-device text recognition using Google's official ML Kit (bundled Latin model).
 *
 * The image is decoded here and passed to ML Kit with InputImage.fromBitmap, so ML Kit never has
 * to open file paths itself. Accepts file:// URIs, plain paths and content:// URIs, in any format
 * Android can decode (JPEG, PNG, WebP, HEIC on Android 9+).
 *
 * Release builds depend on the keep rules in ../proguard-rules.pro: without them R8 strips ML Kit's
 * reflectively-created component registrars and the first scan crashes with a null-pointer error.
 */
class MlkitTextRecognitionModule : Module() {
  private var recognizer: TextRecognizer? = null

  override fun definition() = ModuleDefinition {
    Name("MlkitTextRecognition")

    Constant("isSupported") { true }

    // Resolves with ML Kit's text blocks; each block can contain several lines separated by "\n".
    AsyncFunction("recognizeAsync") { uri: String, promise: Promise ->
      // ML Kit normally initializes itself through its manifest ContentProvider; doing it here too
      // is idempotent and protects against that provider being unavailable.
      try {
        appContext.reactContext?.applicationContext?.let { MlKitContext.initializeIfNeeded(it) }
      } catch (error: Throwable) {
        promise.reject(RecognitionException(error))
        return@AsyncFunction
      }

      val image = try {
        loadImage(uri)
      } catch (error: Throwable) {
        promise.reject(ImageReadException(uri, error))
        return@AsyncFunction
      }

      val client = try {
        recognizer ?: TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS).also { recognizer = it }
      } catch (error: Throwable) {
        promise.reject(RecognitionException(error))
        return@AsyncFunction
      }

      client.process(image)
        .addOnSuccessListener { text -> promise.resolve(text.textBlocks.map { it.text }) }
        .addOnFailureListener { error ->
          promise.reject(RecognitionException(error))
        }
    }

    OnDestroy {
      recognizer?.close()
      recognizer = null
    }
  }

  private fun open(uri: String): InputStream {
    val parsed = Uri.parse(uri)
    return when (parsed.scheme) {
      // Only content:// needs the app context; plain file paths never touch it.
      "content" -> {
        val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
        context.contentResolver.openInputStream(parsed) ?: throw IOException("No data for this image")
      }
      "file" -> File(requireNotNull(parsed.path) { "Missing file path" }).inputStream()
      null -> File(uri).inputStream()
      else -> throw IOException("Unsupported image address scheme: ${parsed.scheme}")
    }
  }

  private fun loadImage(uri: String): InputImage {
    // Read the size first, so huge camera photos are downsampled instead of filling memory.
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    open(uri).use { BitmapFactory.decodeStream(it, null, bounds) }
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) throw IOException("Unsupported or damaged image file")

    var sampleSize = 1
    while (maxOf(bounds.outWidth, bounds.outHeight) / (sampleSize * 2) >= MAX_SIDE) sampleSize *= 2

    val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
    val bitmap = open(uri).use { BitmapFactory.decodeStream(it, null, options) }
      ?: throw IOException("Android could not decode this image")

    return InputImage.fromBitmap(bitmap, open(uri).use { rotationOf(it) })
  }

  /** Camera photos are often stored sideways with an EXIF rotation flag; ML Kit needs upright text. */
  private fun rotationOf(stream: InputStream): Int = try {
    when (ExifInterface(stream).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90
      ExifInterface.ORIENTATION_ROTATE_180 -> 180
      ExifInterface.ORIENTATION_ROTATE_270 -> 270
      else -> 0
    }
  } catch (_: Exception) {
    0 // No readable EXIF (e.g. many PNGs): treat as upright.
  }
}
