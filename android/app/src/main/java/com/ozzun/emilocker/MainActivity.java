package com.ozzun.emilocker;

import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

import com.ozzun.emilocker.admin.EmiDeviceAdminReceiver;
import com.ozzun.emilocker.databinding.ActivityMainBinding;

/**
 * Step 1 home screen.
 *
 * Its only job right now is to prove the build-and-install loop works and to show
 * whether this app is currently the Device Owner. That status drives everything later.
 */
public class MainActivity extends AppCompatActivity {

    private ActivityMainBinding binding;

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
    }

    private void refreshStatus() {
        DevicePolicyManager dpm =
                (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        boolean isDeviceOwner = dpm != null
                && dpm.isDeviceOwnerApp(getPackageName());

        if (isDeviceOwner) {
            binding.statusText.setText(R.string.status_device_owner);
            binding.statusDetail.setText(R.string.status_device_owner_detail);
        } else {
            binding.statusText.setText(R.string.status_not_owner);
            binding.statusDetail.setText(R.string.status_not_owner_detail);
        }
    }
}
