package com.ozzun.emilocker;

import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.appcompat.app.AppCompatActivity;

import com.ozzun.emilocker.config.DeviceStore;
import com.ozzun.emilocker.databinding.ActivityMainBinding;
import com.ozzun.emilocker.net.ServerClient;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Home screen.
 *
 * Shows whether this phone is the Device Owner and — once enrolled — the live lock
 * status fetched from the server. The SERVER is the source of truth; this screen only
 * reflects it. The full-screen kiosk lock is added in a later step; for now the status
 * is shown as text so we can confirm the backend connection works end to end.
 */
public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final Handler ui = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityMainBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        refreshStatus();
    }

    @Override
    protected void onResume() {
        super.onResume();
        refreshStatus();
        checkInWithServer();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        io.shutdownNow();
    }

    private void refreshStatus() {
        DevicePolicyManager dpm =
                (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        boolean isDeviceOwner = dpm != null && dpm.isDeviceOwnerApp(getPackageName());

        DeviceStore store = new DeviceStore(this);

        if (!store.isEnrolled()) {
            binding.statusText.setText(isDeviceOwner
                    ? R.string.status_device_owner : R.string.status_not_owner);
            binding.statusDetail.setText(isDeviceOwner
                    ? R.string.status_device_owner_detail : R.string.status_not_owner_detail);
            return;
        }

        // Enrolled: reflect the last known decision (+ offline grace).
        boolean locked = store.isLocked() || store.offlineGraceExceeded();
        if (locked) {
            binding.statusText.setText(R.string.status_locked);
            String sup = store.getSupportNumber();
            binding.statusDetail.setText(getString(R.string.status_locked_detail,
                    store.getAmountDue(), sup.isEmpty() ? "your shop" : sup));
        } else {
            binding.statusText.setText(R.string.status_active);
            binding.statusDetail.setText(R.string.status_active_detail);
        }
    }

    /** Ask the server for the current decision, then refresh the UI. */
    private void checkInWithServer() {
        final String base = BuildConfig.WORKER_URL;
        final DeviceStore store = new DeviceStore(this);
        if (base == null || base.isEmpty() || !store.isEnrolled()) return; // not connected / not enrolled yet

        io.execute(() -> {
            try {
                ServerClient.Decision d = ServerClient.checkin(base, store.getDeviceId(), store.getDeviceToken());
                store.applyDecision(d.locked, d.amountDue, d.supportNumber, d.maxOfflineDays);
            } catch (Exception ignored) {
                // Offline: the cached decision + offline-grace policy continue to apply.
            }
            ui.post(this::refreshStatus);
        });
    }
}
