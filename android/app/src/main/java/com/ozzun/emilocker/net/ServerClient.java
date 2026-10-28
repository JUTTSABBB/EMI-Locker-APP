package com.ozzun.emilocker.net;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Minimal HTTPS client for the Cloudflare Worker backend. No third-party HTTP library —
 * just HttpURLConnection, so the app stays small. The SERVER decides lock state; this
 * client only reports the device id + its secret token and reads back the decision.
 */
public final class ServerClient {

    public static final class Decision {
        public final boolean locked;
        public final int amountDue;
        public final String supportNumber;
        public final int maxOfflineDays;
        Decision(boolean locked, int amountDue, String supportNumber, int maxOfflineDays) {
            this.locked = locked; this.amountDue = amountDue;
            this.supportNumber = supportNumber; this.maxOfflineDays = maxOfflineDays;
        }
    }

    private ServerClient() {}

    /** POST /api/checkin — throws IOException on any network/HTTP failure. */
    public static Decision checkin(String baseUrl, String deviceId, String deviceToken) throws IOException {
        JSONObject body = new JSONObject();
        try {
            body.put("deviceId", deviceId);
            body.put("deviceToken", deviceToken);
        } catch (Exception e) {
            throw new IOException("bad request body", e);
        }

        HttpURLConnection conn = (HttpURLConnection) new URL(baseUrl + "/api/checkin").openConnection();
        try {
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(15000);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json");
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body.toString().getBytes(StandardCharsets.UTF_8));
            }

            int code = conn.getResponseCode();
            InputStream is = (code >= 200 && code < 300) ? conn.getInputStream() : conn.getErrorStream();
            String resp = readAll(is);
            if (code < 200 || code >= 300) {
                throw new IOException("server returned " + code + ": " + resp);
            }

            JSONObject json = new JSONObject(resp);
            return new Decision(
                    json.optBoolean("locked", false),
                    json.optInt("amountDue", 0),
                    json.optString("supportNumber", ""),
                    json.optInt("maxOfflineDays", 7)
            );
        } catch (IOException e) {
            throw e;
        } catch (Exception e) {
            throw new IOException("checkin failed", e);
        } finally {
            conn.disconnect();
        }
    }

    private static String readAll(InputStream is) throws IOException {
        if (is == null) return "";
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
        }
        return sb.toString();
    }
}
