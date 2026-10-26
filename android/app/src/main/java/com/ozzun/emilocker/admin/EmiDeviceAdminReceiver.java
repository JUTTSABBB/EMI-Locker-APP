package com.ozzun.emilocker.admin;

import android.app.admin.DeviceAdminReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * The system's entry point into our controller app.
 *
 * When this app is set as DEVICE OWNER (via QR provisioning at phone setup), Android
 * talks to it through this receiver. Because a Device Owner app cannot be uninstalled
 * by the user, declaring this receiver correctly in the manifest is the foundation of
 * the whole "installment lock" product.
 *
 * In Step 1 this only logs lifecycle callbacks so we can confirm wiring works.
 * Lock Task (kiosk) enforcement, FRP, and server check-in are added in later steps.
 */
public class EmiDeviceAdminReceiver extends DeviceAdminReceiver {

    private static final String TAG = "EmiDeviceAdmin";

    /** Convenience helper: the ComponentName used everywhere we talk to DevicePolicyManager. */
    public static ComponentName getComponentName(Context context) {
        return new ComponentName(context.getApplicationContext(), EmiDeviceAdminReceiver.class);
    }

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Log.i(TAG, "Device admin enabled");
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Log.i(TAG, "Device admin disabled");
    }

    /**
     * Called once when the device finishes Device Owner provisioning.
     * Later we will use this to apply initial policies (block uninstall, set up lock task, etc.).
     */
    @Override
    public void onProfileProvisioningComplete(Context context, Intent intent) {
        super.onProfileProvisioningComplete(context, intent);
        Log.i(TAG, "Provisioning complete — app is now the device owner");
    }
}
