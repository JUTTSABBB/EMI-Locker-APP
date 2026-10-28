package com.ozzun.emilocker.receiver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.ozzun.emilocker.admin.DevicePolicyController;
import com.ozzun.emilocker.lock.LockController;

/**
 * On reboot: re-apply ownership policies and re-assert the lock immediately, so a restart
 * never frees a locked phone.
 */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)) {
            DevicePolicyController.applyOwnershipPolicies(context);
            LockController.enforce(context);
        }
    }
}
