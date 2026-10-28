package com.ozzun.emilocker.config;

import android.content.Context;
import android.content.SharedPreferences;

/**
 * Small persistent store for this device's enrollment + last known server decision.
 * Written at provisioning (deviceId + deviceToken) and after every server check-in.
 */
public class DeviceStore {
    private static final String PREF = "emi_device";
    private final SharedPreferences sp;

    public DeviceStore(Context ctx) {
        sp = ctx.getApplicationContext().getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public boolean isEnrolled() { return getDeviceId() != null && getDeviceToken() != null; }

    public String getDeviceId()    { return sp.getString("deviceId", null); }
    public String getDeviceToken() { return sp.getString("deviceToken", null); }

    public void setEnrollment(String deviceId, String deviceToken) {
        sp.edit().putString("deviceId", deviceId).putString("deviceToken", deviceToken).apply();
    }

    public boolean isLocked()        { return sp.getBoolean("locked", false); }
    public int getAmountDue()        { return sp.getInt("amountDue", 0); }
    public String getSupportNumber() { return sp.getString("supportNumber", ""); }
    public long getLastServerContact(){ return sp.getLong("lastServerContact", 0L); }
    public int getMaxOfflineDays()   { return sp.getInt("maxOfflineDays", 7); }

    /** Record a successful server decision. */
    public void applyDecision(boolean locked, int amountDue, String supportNumber, int maxOfflineDays) {
        sp.edit()
          .putBoolean("locked", locked)
          .putInt("amountDue", amountDue)
          .putString("supportNumber", supportNumber == null ? "" : supportNumber)
          .putInt("maxOfflineDays", maxOfflineDays)
          .putLong("lastServerContact", System.currentTimeMillis())
          .apply();
    }

    /**
     * Offline grace policy: if the device has not reached the server for longer than
     * maxOfflineDays, it must lock itself — so turning off the internet can't dodge a lock.
     */
    public boolean offlineGraceExceeded() {
        long last = getLastServerContact();
        if (last == 0L) return false; // never contacted yet; don't brick a fresh device
        long deadline = last + (long) getMaxOfflineDays() * 24L * 60L * 60L * 1000L;
        return System.currentTimeMillis() > deadline;
    }
}
