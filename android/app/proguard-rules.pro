# Keep the DeviceAdminReceiver name stable (referenced by the system via the manifest).
-keep class com.ozzun.emilocker.admin.EmiDeviceAdminReceiver { *; }

# (More keep-rules will be added as we introduce FCM, Play Integrity, and the NDK layer.)
