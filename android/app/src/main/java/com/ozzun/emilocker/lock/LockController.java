package com.ozzun.emilocker.lock;

import android.content.Context;
import android.content.Intent;

import com.ozzun.emilocker.config.DeviceStore;

/**
 * Central decision point on the device side: given the last server decision (and the
 * offline-grace policy), either raise the full-screen lock or clear it. The SERVER
 * decides locked/unlocked; this only enforces that decision on screen.
 */
public final class LockController {

    public static final String ACTION_UNLOCK = "com.ozzun.emilocker.ACTION_UNLOCK";

    private LockController() {}

    public static boolean shouldLock(Context ctx) {
        DeviceStore store = new DeviceStore(ctx);
        if (!store.isEnrolled()) return false;
        return store.isLocked() || store.offlineGraceExceeded();
    }

    /** Apply the current decision: show the lock screen, or tell it to close. */
    public static void enforce(Context ctx) {
        if (shouldLock(ctx)) {
            Intent i = new Intent(ctx, LockScreenActivity.class);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            ctx.startActivity(i);
        } else {
            ctx.sendBroadcast(new Intent(ACTION_UNLOCK).setPackage(ctx.getPackageName()));
        }
    }
}
