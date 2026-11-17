# --- Why these rules exist ---
# ML Kit registers its internal components (SharedPrefManager, task executors, the text
# recognizer, ...) through "ComponentRegistrar" classes that it instantiates REFLECTIVELY at
# startup: Class.forName(name).getDeclaredConstructor().newInstance(). R8 sees no direct call to
# those constructors, treats them as dead code and strips them. The registrar then fails to
# instantiate (silently), its components are never registered, and ML Kit's first use crashes
# with "Attempt to invoke virtual method 'java.lang.Class java.lang.Object.getClass()' on a null
# object reference" inside InputImage.fromBitmap. Keeping the registrars intact fixes that.

# Every ComponentRegistrar (ML Kit common, vision-common, text recognition, and any added later).
-keep class * implements com.google.firebase.components.ComponentRegistrar { *; }
-keep class com.google.mlkit.common.internal.CommonComponentRegistrar { *; }
-keep class com.google.mlkit.vision.common.internal.VisionCommonRegistrar { *; }
-keep class com.google.mlkit.vision.text.internal.TextRegistrar { *; }

# The discovery service that lists them, the components framework, and ML Kit's internal SDK
# plumbing that the registrars construct (e.g. SharedPrefManager, MlKitContext).
-keep class com.google.mlkit.common.internal.MlKitComponentDiscoveryService { *; }
-keep class com.google.firebase.components.** { *; }
-keep class com.google.mlkit.common.sdkinternal.** { *; }

# Keep readable class/method names in crash traces for this module and the libraries it calls
# (-keepnames only prevents renaming; unused code can still be removed).
-keepnames class expo.modules.mlkittextrecognition.** { *; }
-keepnames class com.google.mlkit.** { *; }
-keepnames class com.google.android.gms.** { *; }
-keepnames class expo.modules.kotlin.** { *; }
