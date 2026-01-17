import paymentDB, { pool } from "./paymentDatabaseService.js";
import midtransService from "./midtransService.js";

const envBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  const s = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(s)) return true;
  if (["0", "false", "no", "n", "off"].includes(s)) return false;
  return fallback;
};

const envInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const getAccessDurationDays = () => {
  const raw = Number(
    process.env.PAYMENT_ACCESS_DURATION_DAYS ??
      process.env.PAYMENT_DURATION_DAYS ??
      30
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
};

const determinePackageIdsToGrant = async () => {
  const configuredIds = String(process.env.PAYMENT_GRANT_PACKAGE_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  try {
    const packages = await paymentDB.getAllPackages();
    const available = new Set((packages || []).map((p) => Number(p.id)));
    const filtered = configuredIds.filter((id) => available.has(id));
    if (filtered.length > 0) return filtered;

    const fallback = (packages || [])
      .map((p) => Number(p.id))
      .filter((n) => Number.isFinite(n))
      .slice(0, 2);
    return fallback.length > 0 ? fallback : [1];
  } catch {
    return configuredIds.length > 0 ? configuredIds : [1];
  }
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const isPaidStatus = (txStatus) => {
  const s = String(txStatus || "").trim().toLowerCase();
  return s === "settlement" || s === "capture";
};

const shouldRun = () => {
  const raw = process.env.AUTO_RECONCILE_PENDING;
  const isProd =
    String(process.env.NODE_ENV || "").toLowerCase() === "production" ||
    String(process.env.MIDTRANS_IS_PRODUCTION || "").toLowerCase() === "true";

  // If explicitly configured, respect it.
  if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
    return envBool(raw, false);
  }

  // Default: on in production (can be disabled via env), off otherwise.
  return isProd;
};

const LOCK_ID = 9242001001; // stable bigint-ish identifier

const withAdvisoryLock = async (fn) => {
  const got = await pool.query("SELECT pg_try_advisory_lock($1::bigint) AS ok", [
    LOCK_ID,
  ]);
  const ok = Boolean(got?.rows?.[0]?.ok);
  if (!ok) return { ran: false };

  try {
    await fn();
    return { ran: true };
  } finally {
    try {
      await pool.query("SELECT pg_advisory_unlock($1::bigint)", [LOCK_ID]);
    } catch {
      // ignore
    }
  }
};

const reconcileOnce = async () => {
  const limit = envInt(process.env.AUTO_RECONCILE_PENDING_LIMIT, 25);
  const minAgeMinutes = envInt(process.env.AUTO_RECONCILE_PENDING_MIN_AGE_MINUTES, 1);
  const maxAgeHours = envInt(process.env.AUTO_RECONCILE_PENDING_MAX_AGE_HOURS, 48);

  const pending = await paymentDB.getTransactionsForReconcile({
    limit,
    minAgeMinutes,
    maxAgeHours,
  });

  if (!pending.length) return;

  const durationDays = getAccessDurationDays();
  const packageIds = await determinePackageIdsToGrant();

  for (const tx of pending) {
    const orderId = String(tx?.invoice_number || "").trim();
    const userId = tx?.user_id ? String(tx.user_id) : null;
    if (!orderId || !userId) continue;

    let status;
    try {
      status = await midtransService.getTransactionStatus(orderId);
    } catch (e) {
      // Midtrans can briefly return "Transaction doesn't exist" for new orders.
      // We simply keep it pending; other parts of the system may mark it failed
      // after a grace period.
      continue;
    }

    const txStatus = String(status?.transaction_status || "")
      .trim()
      .toLowerCase();

    await paymentDB.updateTransactionStatus({
      orderId,
      transactionStatus: txStatus || "pending",
      paymentType: status?.payment_type || null,
      transactionTime: status?.transaction_time || new Date().toISOString(),
      settlementTime: status?.settlement_time || null,
      midtransTransactionId: status?.transaction_id || null,
      midtransResponse: status,
    });

    if (!isPaidStatus(txStatus)) continue;

    const alreadyGranted = await paymentDB.hasAccessForTransaction(tx.id);
    if (alreadyGranted) continue;

    const baseTime =
      status?.settlement_time ||
      status?.transaction_time ||
      tx?.created_at ||
      new Date().toISOString();

    const accessEnd = addDays(new Date(baseTime), durationDays);

    await paymentDB.grantPackageAccess({
      userId,
      transactionId: tx.id,
      packageIds,
      durationDays,
      accessEnd,
    });
  }
};

export const startAutoReconcilePendingService = () => {
  if (!shouldRun()) {
    console.log(
      "ℹ️ Auto-reconcile pending payments: disabled (set AUTO_RECONCILE_PENDING=true to enable)"
    );
    return;
  }

  const intervalSeconds = envInt(
    process.env.AUTO_RECONCILE_PENDING_INTERVAL_SECONDS,
    60
  );
  const intervalMs = Math.max(10, intervalSeconds) * 1000;

  console.log(
    `🔄 Auto-reconcile pending payments enabled (every ${Math.round(
      intervalMs / 1000
    )}s)`
  );

  const tick = async () => {
    try {
      await withAdvisoryLock(reconcileOnce);
    } catch (e) {
      console.error("Auto-reconcile pending payments error:", e?.message || e);
    }
  };

  // Run soon after boot, then on interval.
  setTimeout(tick, 5000);
  setInterval(tick, intervalMs);
};
