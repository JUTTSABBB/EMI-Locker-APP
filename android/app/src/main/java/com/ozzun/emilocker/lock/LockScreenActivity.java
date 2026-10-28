package com.ozzun.emilocker.lock;

import android.app.admin.DevicePolicyManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;

import androidx.appcompat.app.AppCompatActivity;

import com.ozzun.emilocker.BuildConfig;
import com.ozzun.emilocker.R;
import com.ozzun.emilocker.config.DeviceStore;
import com.ozzun.emilocker.databinding.ActivityLockBinding;
import com.ozzun.emilocker.net.ServerClient;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Full-screen lock shown when the installment is unpaid. It always shows the amount due
 * and the shop's support number, so the customer can always pay and get unlocked.
 *
 * On a Device Owner phone it enters Lock Task (kiosk) mode, so the user cannot leave it,
 * open settings, or uninstall. This is the on-screen enforcement of a server decision —
 * nothing covert, and it clears itself the moment the server reports the plan is paid.
 */
public class LockScreenActivity extends AppCompatActivity {

    private ActivityLockBinding binding;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());

    private final BroadcastReceiver unlockReceiver = new BroadcastReceiver() {
        @Override public void onReceive(Context context, Intent intent) { closeLock(); }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Show above the keyguard and keep the screen on.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);

        binding = ActivityLockBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        binding.payRefresh.setOnClickListener(v -> refreshFromServer());

        IntentFilter f = new IntentFilter(LockController.ACTION_UNLOCK);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(unlockReceiver, f, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(unlockReceiver, f);
        }
        bindData();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // If the plan was cleared, don't show the lock at all.
        if (!LockController.shouldLock(this)) { closeLock(); return; }
        startKioskIfOwner();
        bindData();
    }

    private void startKioskIfOwner() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        if (dpm != null && dpm.isDeviceOwnerApp(getPackageName())) {
            try { startLockTask(); } catch (Exception ignored) {}
        }
    }

    private void bindData() {
        DeviceStore store = new DeviceStore(this);
        binding.amount.setText(getString(R.string.lock_amount, store.getAmountDue()));
        String sup = store.getSupportNumber();
        binding.support.setText(getString(R.string.lock_support, sup.isEmpty() ? "your shop" : sup));
    }

    private void refreshFromServer() {
        final String base = BuildConfig.WORKER_URL;
        final DeviceStore store = new DeviceStore(this);
        if (base == null || base.isEmpty() || !store.isEnrolled()) return;
        binding.payRefresh.setEnabled(false);
        io.execute(() -> {
            try {
                ServerClient.Decision d = ServerClient.checkin(base, store.getDeviceId(), store.getDeviceToken());
                store.applyDecision(d.locked, d.amountDue, d.supportNumber, d.maxOfflineDays);
            } catch (Exception ignored) { }
            ui.post(() -> {
                binding.payRefresh.setEnabled(true);
                if (!LockController.shouldLock(this)) closeLock(); else bindData();
            });
        });
    }

    private void closeLock() {
        try { stopLockTask(); } catch (Exception ignored) {}
        finish();
    }

    @Override public void onBackPressed() { /* cannot leave the lock by Back */ }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        try { unregisterReceiver(unlockReceiver); } catch (Exception ignored) {}
        io.shutdownNow();
    }
}
