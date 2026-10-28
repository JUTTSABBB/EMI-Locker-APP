package com.ozzun.emilocker.lock;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.ozzun.emilocker.BuildConfig;
import com.ozzun.emilocker.config.DeviceStore;
import com.ozzun.emilocker.net.ServerClient;

/**
 * Periodic background check-in. Asks the server for the current decision, stores it, and
 * enforces the lock. Runs even if the app is not open, so a locked phone stays locked and
 * a paid phone unlocks on its own. The offline-grace policy (in DeviceStore) handles the
 * case where the phone can't reach the server.
 */
public class CheckinWorker extends Worker {

    public CheckinWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        DeviceStore store = new DeviceStore(ctx);
        String base = BuildConfig.WORKER_URL;

        if (store.isEnrolled() && base != null && !base.isEmpty()) {
            try {
                ServerClient.Decision d = ServerClient.checkin(base, store.getDeviceId(), store.getDeviceToken());
                store.applyDecision(d.locked, d.amountDue, d.supportNumber, d.maxOfflineDays);
            } catch (Exception ignored) {
                // Offline: cached decision + offline-grace policy still apply below.
            }
        }
        LockController.enforce(ctx);
        return Result.success();
    }
}
