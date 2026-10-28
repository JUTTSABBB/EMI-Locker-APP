package com.ozzun.emilocker.admin;

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.os.UserManager;
import android.util.Log;

/**
 * Applies and clears the enterprise policies that make this a true "first owner" app.
 *
 * These only take effect when the app is the DEVICE OWNER (set via QR provisioning on a
 * factory-fresh phone). As Device Owner we can:
 *   - block our own uninstall,
 *   - forbid factory reset from Settings,
 *   - forbid adding other users / safe boot (common ways to dodge a lock),
 *   - whitelist ourselves for Lock Task (kiosk) mode used by the lock screen.
 *
 * Nothing here is hidden: the customer agreed to it at purchase, and the lock screen
 * always shows how to pay and a support number.
 */
public final class DevicePolicyController {

    private static final String TAG = "EmiPolicy";

    private DevicePolicyController() {}

    public static boolean isDeviceOwner(Context ctx) {
        DevicePolicyManager dpm = (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
        return dpm != null && dpm.isDeviceOwnerApp(ctx.getPackageName());
    }

    /** Lock the device down against removal / reset. Safe to call repeatedly. */
    public static void applyOwnershipPolicies(Context ctx) {
        DevicePolicyManager dpm = (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
        if (dpm == null || !dpm.isDeviceOwnerApp(ctx.getPackageName())) {
            Log.w(TAG, "Not device owner — ownership policies skipped");
            return;
        }
        ComponentName admin = EmiDeviceAdminReceiver.getComponentName(ctx);
        String pkg = ctx.getPackageName();

        // The core requirement: the app cannot be uninstalled.
        dpm.setUninstallBlocked(admin, pkg, true);

        // Close the common escape routes.
        addRestriction(dpm, admin, UserManager.DISALLOW_FACTORY_RESET);
        addRestriction(dpm, admin, UserManager.DISALLOW_ADD_USER);
        addRestriction(dpm, admin, UserManager.DISALLOW_SAFE_BOOT);
        addRestriction(dpm, admin, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA);

        // Keep our app launchable even if a customer tries to disable it.
        try { dpm.setApplicationHidden(admin, pkg, false); } catch (Exception ignored) {}

        // Allow this package to enter Lock Task (kiosk) mode — used by the lock screen (Step 3).
        try { dpm.setLockTaskPackages(admin, new String[]{ pkg }); } catch (Exception e) { Log.w(TAG, "setLockTaskPackages: " + e.getMessage()); }

        // Make this app the Home launcher is NOT done here — that is part of the lock screen step.
        Log.i(TAG, "Ownership policies applied");
    }

    /** Fully release the device — call only when the plan is completed / cleared. */
    public static void releaseOwnership(Context ctx) {
        DevicePolicyManager dpm = (DevicePolicyManager) ctx.getSystemService(Context.DEVICE_POLICY_SERVICE);
        if (dpm == null || !dpm.isDeviceOwnerApp(ctx.getPackageName())) return;
        ComponentName admin = EmiDeviceAdminReceiver.getComponentName(ctx);
        String pkg = ctx.getPackageName();

        dpm.setUninstallBlocked(admin, pkg, false);
        clearRestriction(dpm, admin, UserManager.DISALLOW_FACTORY_RESET);
        clearRestriction(dpm, admin, UserManager.DISALLOW_ADD_USER);
        clearRestriction(dpm, admin, UserManager.DISALLOW_SAFE_BOOT);
        clearRestriction(dpm, admin, UserManager.DISALLOW_MOUNT_PHYSICAL_MEDIA);

        // Last: clear device owner so the phone is fully free.
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) dpm.clearDeviceOwnerApp(pkg);
        } catch (Exception e) {
            Log.w(TAG, "clearDeviceOwnerApp: " + e.getMessage());
        }
        Log.i(TAG, "Ownership released — device is free");
    }

    private static void addRestriction(DevicePolicyManager dpm, ComponentName admin, String key) {
        try { dpm.addUserRestriction(admin, key); } catch (Exception e) { Log.w(TAG, "addUserRestriction " + key + ": " + e.getMessage()); }
    }
    private static void clearRestriction(DevicePolicyManager dpm, ComponentName admin, String key) {
        try { dpm.clearUserRestriction(admin, key); } catch (Exception e) { Log.w(TAG, "clearUserRestriction " + key + ": " + e.getMessage()); }
    }
}
