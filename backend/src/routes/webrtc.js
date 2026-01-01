const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const parseUrls = (raw) =>
  String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const buildStunServers = () => [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

// TURN REST API (coturn: --use-auth-secret --static-auth-secret)
const makeTurnRestCredentials = ({ secret, ttlSeconds }) => {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + ttlSeconds;
  const username = String(expiry);

  const hmac = crypto.createHmac("sha1", String(secret));
  hmac.update(username);
  const credential = hmac.digest("base64");

  return { username, credential, ttlSeconds };
};

router.get("/turn", (req, res) => {
  const urls = parseUrls(process.env.TURN_URLS || process.env.VITE_WEBRTC_TURN_URL);
  const secret = String(process.env.TURN_SECRET || "").trim();
  const ttlSeconds = Math.max(60, Math.min(24 * 3600, Number(process.env.TURN_TTL_SECONDS || 3600)));

  const iceServers = [...buildStunServers()];

  if (urls.length && secret) {
    const creds = makeTurnRestCredentials({ secret, ttlSeconds });
    iceServers.push({
      urls,
      username: creds.username,
      credential: creds.credential,
    });
  }

  res.json({
    iceServers,
    ttlSeconds,
    hasTurn: Boolean(urls.length && secret),
  });
});

module.exports = router;
