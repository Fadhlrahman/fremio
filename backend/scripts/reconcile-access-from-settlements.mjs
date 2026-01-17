import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const parseArg = (name, fallback = null) => {
  const prefix = `--${name}=`;
  const raw = process.argv.find((a) => a.startsWith(prefix));
  if (!raw) return fallback;
  return raw.slice(prefix.length);
};

const findEnvFileUp = (startDir) => {
  let dir = startDir;
  for (let i = 0; i < 12; i += 1) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};

const loadEnv = () => {
  const explicit = parseArg("envFile", null) || process.env.ENV_FILE || null;
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));

  const envPath =
    explicit ||
    findEnvFileUp(process.cwd()) ||
    findEnvFileUp(scriptDir) ||
    null;

  if (envPath) {
    dotenv.config({ path: envPath });
    console.log(`🔧 Loaded env from ${envPath}`);
  } else {
    dotenv.config();
    console.log("ℹ️  No .env found; relying on process env");
  }
};

const isUuidLike = (value) => {
  const v = String(value || "").trim();
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const determinePackageIdsToGrant = ({ packages }) => {
  let packageIds = [];
  const configuredIds = String(process.env.PAYMENT_GRANT_PACKAGE_IDS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  if (configuredIds.length > 0) {
    const available = new Set((packages || []).map((p) => Number(p.id)));
    packageIds = configuredIds.filter((id) => available.has(id));
  }

  if (packageIds.length === 0) {
    packageIds = (packages || []).slice(0, 2).map((p) => p.id);
  }

  return packageIds;
};

const main = async () => {
  loadEnv();

  const { default: paymentDB, pool } = await import(
    "../services/paymentDatabaseService.js"
  );

  // Quick sanity log (no secrets)
  console.log(
    `🔧 DB target: ${process.env.DB_HOST || process.env.PGHOST || "(default localhost)"}/${
      process.env.DB_NAME || process.env.PGDATABASE || "(default fremio)"
    } as ${process.env.DB_USER || process.env.PGUSER || "(default)"}`
  );

  const sinceRaw = parseArg("since", "2026-01-11");
  const limit = Number(parseArg("limit", "500"));
  const durationDays = Number(parseArg("days", "30"));
  const checkMidtrans =
    String(parseArg("checkMidtrans", "false")).toLowerCase() === "true";
  const verbose = String(parseArg("verbose", "false")).toLowerCase() === "true";

  let midtransService = null;
  if (checkMidtrans) {
    try {
      midtransService = (await import("../services/midtransService.js")).default;
    } catch (e) {
      console.log(
        `⚠️  Midtrans not available (will skip checks): ${e?.message || e}`
      );
      midtransService = null;
    }
  }

  const since = new Date(sinceRaw);
  if (Number.isNaN(since.getTime())) {
    throw new Error(`Invalid --since date: ${sinceRaw}`);
  }

  console.log(
    `🔎 Reconciling access from settlements since ${since.toISOString()} (checkMidtrans=${checkMidtrans})`
  );

  const packages = await paymentDB.getAllPackages();
  const packageIds = determinePackageIdsToGrant({ packages });
  if (packageIds.length === 0) {
    throw new Error("No packageIds available to grant");
  }

  const { rows } = await pool.query(
    `
    WITH latest_access AS (
      SELECT DISTINCT ON (upa.transaction_id::text)
        upa.transaction_id::text AS tx_id,
        upa.is_active,
        upa.access_end,
        upa.created_at
      FROM user_package_access upa
      ORDER BY upa.transaction_id::text, upa.created_at DESC
    ),
    tx AS (
      SELECT
        pt.*,
        lower(
          coalesce(
            pt.gateway_response->>'transaction_status',
            pt.gateway_response->>'transactionStatus',
            pt.gateway_response->>'status',
            ''
          )
        ) AS gw_status
      FROM payment_transactions pt
    )
    SELECT
      pt.id,
      pt.user_id,
      pt.status,
      pt.invoice_number,
      pt.gw_status,
      pt.paid_at,
      pt.created_at,
      pt.gateway_response,
      la.is_active AS access_is_active,
      la.access_end AS access_end
    FROM tx pt
    LEFT JOIN latest_access la ON la.tx_id = pt.id::text
    WHERE (
        pt.status IN ('settlement','capture','completed','success','paid'
          ${checkMidtrans ? ", 'pending'" : ""}
        )
        OR pt.gw_status IN ('settlement','capture','success')
      )
      AND COALESCE(pt.paid_at, pt.created_at) >= $1
      AND (
        la.tx_id IS NULL
        OR la.is_active = false
        OR la.access_end IS NULL
        OR la.access_end <= NOW()
      )
    ORDER BY COALESCE(pt.paid_at, pt.created_at) ASC
    LIMIT $2
    `,
    [since, limit]
  );

  console.log(`📦 Found ${rows.length} tx needing access repair (filtered)`);

  if (verbose && rows.length > 0) {
    console.log("🔎 Candidates:");
    for (const tx of rows) {
      console.log(
        ` - tx=${tx.id} orderId=${tx.invoice_number} status=${tx.status} gw=${tx.gw_status || "-"} accessActive=${
          tx.access_is_active === null || tx.access_is_active === undefined
            ? "(none)"
            : String(tx.access_is_active)
        } accessEnd=${tx.access_end ? new Date(tx.access_end).toISOString() : "(none)"}`
      );
    }
  }

  let granted = 0;
  let skipped = 0;

  const isSettledLike = (status) => {
    const s = String(status || "").trim().toLowerCase();
    return (
      s === "settlement" ||
      s === "capture" ||
      s === "success" ||
      s === "paid" ||
      s === "completed"
    );
  };

  const resolveMidtransSettlement = async (orderId) => {
    if (!midtransService) return null;
    if (!orderId) return null;
    try {
      const status = await midtransService.getTransactionStatus(String(orderId));
      const txStatus = status?.transaction_status || status?.transactionStatus || null;
      const settlementTime = status?.settlement_time || status?.settlementTime || null;
      const transactionTime = status?.transaction_time || status?.transactionTime || null;
      return {
        transactionStatus: txStatus,
        paidAt: settlementTime || transactionTime || null,
      };
    } catch (e) {
      const msg = String(e?.message || "");
      const msgLower = msg.toLowerCase();
      const isMissingOnMidtrans =
        msgLower.includes("http status code: 404") ||
        msgLower.includes("status_code\":\"404\"") ||
        /transaction\s+doesn['’]\s*t\s+exist/.test(msgLower) ||
        msgLower.includes("transaction does not exist") ||
        msgLower.includes("transaction not found");

      if (isMissingOnMidtrans) {
        return { missing: true, message: msg };
      }

      return null;
    }
  };

  for (const tx of rows) {
    const gateway = tx.gateway_response || {};
    const email =
      gateway?.customer_details?.email ||
      gateway?.customerDetails?.email ||
      gateway?.email ||
      null;

    let effectiveUserId = tx.user_id;

    // If DB says pending, optionally confirm with Midtrans.
    let effectiveStatus = tx.status;
    let effectivePaidAt = tx.paid_at;

    if (checkMidtrans && String(tx.status || "").toLowerCase() === "pending") {
      const mid = await resolveMidtransSettlement(tx.invoice_number);
      if (mid?.missing) {
        // If Midtrans doesn't know this orderId, it's a ghost pending record.
        try {
          const updated = await paymentDB.markTransactionFailed({
            orderId: String(tx.invoice_number),
            reason: "midtrans_missing_on_reconcile",
            details: mid?.message || "Transaction doesn't exist",
          });
          if (verbose) {
            console.log(
              `⚠️  Marked failed (missing on Midtrans): orderId=${tx.invoice_number} dbStatus=${updated?.status || "(unknown)"}`
            );
          }
        } catch {
          if (verbose) {
            console.log(
              `⚠️  Failed to mark failed for orderId=${tx.invoice_number}: ${e?.message || e}`
            );
          }
          // ignore
        }
        skipped += 1;
        continue;
      }

      if (mid?.transactionStatus) {
        effectiveStatus = mid.transactionStatus;
        if (mid.paidAt) {
          const d = new Date(mid.paidAt);
          if (!Number.isNaN(d.getTime())) effectivePaidAt = d;
        }

        // Best-effort update local DB status so future checks work without Midtrans.
        // If it becomes expire/cancel/deny/etc, update that too to unblock checkout.
        const normalized = String(effectiveStatus || "").trim().toLowerCase();
        const shouldWriteStatus = normalized && normalized !== String(tx.status || "").trim().toLowerCase();
        if (shouldWriteStatus) {
          try {
            const finalStatus = isSettledLike(normalized) ? "settlement" : normalized;
            await pool.query(
              "UPDATE payment_transactions SET status = $1, paid_at = COALESCE(paid_at, $2) WHERE id = $3",
              [finalStatus, effectivePaidAt || null, tx.id]
            );
            if (verbose) {
              console.log(
                `ℹ️  Updated tx status from Midtrans: tx=${tx.id} ${tx.status} -> ${finalStatus}`
              );
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // Skip if still not successful.
    const gw = tx.gateway_response || {};
    const gwStatus =
      gw?.transaction_status || gw?.transactionStatus || gw?.status || tx.gw_status || null;

    if (!isSettledLike(effectiveStatus) && !isSettledLike(gwStatus)) {
      skipped += 1;
      if (verbose) {
        console.log(
          `↩️  Skip (not settled): tx=${tx.id} status=${effectiveStatus} gw=${gwStatus || "-"}`
        );
      }
      continue;
    }

    if (!isUuidLike(effectiveUserId) && email) {
      const local = await paymentDB.findLocalUserIdByEmail(email);
      if (local) effectiveUserId = local;
    }

    if (!effectiveUserId) {
      skipped += 1;
      console.log(`⚠️  Skip tx ${tx.id}: missing userId (email=${email || '-'})`);
      continue;
    }

    const start = effectivePaidAt || tx.created_at || new Date();
    const accessEnd = addDays(start, Number.isFinite(durationDays) ? durationDays : 30);

    try {
      await paymentDB.grantPackageAccess({
        userId: effectiveUserId,
        transactionId: tx.id,
        packageIds,
        accessEnd,
      });
      granted += 1;
      console.log(`✅ Granted access: tx=${tx.id} user=${effectiveUserId} email=${email || '-'}`);
    } catch (e) {
      skipped += 1;
      console.log(`❌ Failed tx ${tx.id}: ${e?.message || e}`);
    }
  }

  console.log(`✅ Done. Granted=${granted} Skipped=${skipped}`);
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Reconcile failed:", err);
    if (
      String(err?.message || "").toLowerCase().includes("client password must be a string")
    ) {
      console.error(
        "ℹ️  Hint: DB_PASSWORD/PGPASSWORD not loaded. Run from backend folder that has .env, or export DB env vars before running."
      );
    }
    process.exit(1);
  });
