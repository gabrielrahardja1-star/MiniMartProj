# Keep DTOs for Gson reflection-based (de)serialization.
-keep class com.minimart.field.data.remote.dto.** { *; }
-keep class com.minimart.field.data.local.** { *; }

# security-crypto pulls in Google Tink, which references errorprone
# annotation classes only used for compile-time checks (not present at
# runtime and not needed there) - safe to tell R8 to ignore them.
-dontwarn com.google.errorprone.annotations.**
