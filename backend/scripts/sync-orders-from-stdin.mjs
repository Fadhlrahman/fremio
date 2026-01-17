import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import readline from "readline";
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

const isPaid = (txStatus) => {
  const s = String(txStatus || "").trim().toLowerCase();
  return s === "settlement" || s === "capture";
};

const isMissingOnMidtransError = (err) => {
  const msg = String(err?.message || err || "");
  const msgLower = msg.toLowerCase();
  return (
    msgLower.includes("http 404") ||
    msgLower.includes("http status code: 404") ||
    msgLower.includes("status_code\":\"404\"") ||
    msgLower.includes("transaction doesn't exist") ||
    msgLower.includes("transaction does not exist") ||
    msgLower.includes("transaction not found")
  );
};

const normalizeOrderId = (value) => {
  let s = String(value || "").trim();
  if (!s) return "";
  // Accept formats like: "Order ID FRM-..." or "OrderID: FRM-..."
  s = s.replace(/^order\s*id\s*[:\-]?\s*/i, "").trim();
  // If there are still leading tokens before FRM-, keep the FRM-* suffix
  const idx = s.toUpperCase().indexOf("FRM-");
  if (idx > 0) s = s.slice(idx).trim();
  return s;
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

const getAccessDurationDays = () => {
  const argDays = Number(parseArg("days", NaN));
  if (Number.isFinite(argDays) && argDays > 0) return argDays;
  const raw = Number(
    process.env.PAYMENT_ACCESS_DURATION_DAYS ??
      process.env.PAYMENT_DURATION_DAYS ??
      30
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 30;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const parseLine = (line) => {
  const raw = String(line || "").trim();
  if (!raw) return null;
  if (raw.startsWith("#")) return null;

  // Accept CSV: orderId,email
  if (raw.includes(",")) {
    const [orderId, email] = raw.split(",").map((v) => String(v || "").trim());
    if (!orderId || !email) return null;
    return { orderId: normalizeOrderId(orderId), email: email.toLowerCase() };
  }

  // Accept whitespace: orderId email
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return {
      orderId: normalizeOrderId(parts[0]),
      email: String(parts[1]).trim().toLowerCase(),
    };
  }

  return null;
};

const stripBom = (text) => {
  if (!text) return text;
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
};

const normalizeHeader = (s) =>
  String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[\-_]+/g, " ")
    .replace(/\s+/g, " ");

// Minimal CSV/TSV parser for a single line, supports quoted fields.
const parseDelimitedLine = (line, delimiter) => {
  const out = [];
  let cur = "";
  let inQuotes = false;
  const s = String(line ?? "");
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') {
        const next = s[i + 1];
        if (next === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      out.push(cur.trim());
      cur = "";
      continue;
    }

    cur += ch;
  }
  out.push(cur.trim());
  return out;
};

const guessDelimiter = (line) => {
  const s = String(line ?? "");
  const commas = (s.match(/,/g) || []).length;
  const tabs = (s.match(/\t/g) || []).length;
  const semis = (s.match(/;/g) || []).length;
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
};

const pickColumnsFromHeader = (headers) => {
  const norm = headers.map(normalizeHeader);
  const findIdx = (preds) => {
    for (let i = 0; i < norm.length; i += 1) {
      for (const p of preds) {
        if (typeof p === "string") {
          if (norm[i] === p) return i;
        } else if (p instanceof RegExp) {
          if (p.test(norm[i])) return i;
        }
      }
    }
    return -1;
  };

  const orderIdIndex = findIdx([
    "order id",
    /\border\s*id\b/,
    /\border\b/,
    /\binvoice\b/,
    /\binvoice\s*number\b/,
  ]);
  const emailIndex = findIdx([
    "e-mail pelanggan",
    "email pelanggan",
    "customer email",
    "email",
    /\bemail\b/,
  ]);

  return { orderIdIndex, emailIndex };
};

const looksLikeEmail = (value) => {
  const s = String(value || "").trim().toLowerCase();
  return !!s && s.includes("@") && !s.includes(" ");
};

const looksLikeOrderId = (value) => {
  const s = normalizeOrderId(value);
  return s.toUpperCase().startsWith("FRM-");
};

const main = async () => {
  loadEnv();

  const { default: paymentDB } = await import("../services/paymentDatabaseService.js");
  const midtransService = (await import("../services/midtransService.js")).default;

  // Firebase fallback (for deployments that don't persist all users in the SQL users table).
  const auth = (() => {
    try {
      // Lazy import to avoid crashing if Firebase isn't configured.
      // eslint-disable-next-line no-undef
      return null;
    } catch {
      return null;
    }
  })();

  let firebaseAuth = null;
  try {
    const mod = await import("../config/firebase.js");
    firebaseAuth = mod?.getAuth ? mod.getAuth() : null;
  } catch {
    firebaseAuth = null;
  }

  const packages = await paymentDB.getAllPackages();
  const packageIds = determinePackageIdsToGrant({ packages });
  if (packageIds.length === 0) {
    throw new Error("No packageIds available to grant");
  }

  const durationDays = getAccessDurationDays();
  const force = String(parseArg("force", "false")).toLowerCase() === "true";

  const defaultFile = "/root/midtrans_dana.csv";
  const fileArg = parseArg("file", null);
  const stdinIsPiped = !process.stdin.isTTY;

  let inputStream = process.stdin;
  let sourceLabel = "stdin";
  let hasFile = false;

  if (fileArg) {
    // Explicit override: --file=- forces stdin
    if (String(fileArg).trim() !== "-" && fs.existsSync(fileArg)) {
      inputStream = fs.createReadStream(fileArg, { encoding: "utf8" });
      sourceLabel = fileArg;
      hasFile = true;
    }
  } else if (!stdinIsPiped && fs.existsSync(defaultFile)) {
    inputStream = fs.createReadStream(defaultFile, { encoding: "utf8" });
    sourceLabel = defaultFile;
    hasFile = true;
  } else if (!stdinIsPiped) {
    console.log("📥 Tidak menemukan file export otomatis.");
    console.log(`   Taruh export Midtrans di ${defaultFile} (recommended), atau jalankan dengan --file=/path/file.csv`);
    console.log("   Atau paste manual: orderId,email (1 baris per transaksi), lalu Ctrl-D");
  }

  console.log(`🔎 Input source: ${sourceLabel}`);
  if (force) {
    console.log("⚠️  FORCE enabled: will grant even if Midtrans returns 404");
  }

  const rl = readline.createInterface({ input: inputStream, crlfDelay: Infinity });

  let total = 0;
  let granted = 0;
  let skipped = 0;
  let notFoundUser = 0;
  let notPaid = 0;

  let delimiter = null;
  let headerParsed = false;
  let columnMap = null;

  for await (const rawLine of rl) {
    const line = stripBom(String(rawLine ?? ""));
    const trimmed = String(line).trim();
    if (!trimmed) continue;

    // If reading from file, try to detect & parse header row once.
    if (!headerParsed && hasFile) {
      delimiter = guessDelimiter(trimmed);
      const headers = parseDelimitedLine(trimmed, delimiter);
      const map = pickColumnsFromHeader(headers);
      // If header seems valid (contains both columns), store it and continue to next line.
      if (map.orderIdIndex >= 0 && map.emailIndex >= 0) {
        columnMap = map;
        headerParsed = true;
        continue;
      }
      // Heuristic: common header row like "email,order_id" (underscore) or similar.
      if (headers.length >= 2) {
        const h0 = normalizeHeader(headers[0]);
        const h1 = normalizeHeader(headers[1]);
        const isHeaderish =
          (h0.includes("email") && (h1.includes("order") || h1.includes("invoice"))) ||
          ((h0.includes("order") || h0.includes("invoice")) && h1.includes("email"));
        if (isHeaderish) {
          headerParsed = true;
          continue;
        }
      }
      // Not a recognizable header; fall back to generic parsing below.
      headerParsed = true;
    }

    let parsed = null;

    if (hasFile) {
      if (!delimiter) delimiter = guessDelimiter(trimmed);
      const cols = parseDelimitedLine(trimmed, delimiter);

      if (columnMap && columnMap.orderIdIndex >= 0 && columnMap.emailIndex >= 0) {
        const orderId = normalizeOrderId(cols[columnMap.orderIdIndex] || "");
        const email = cols[columnMap.emailIndex] || "";
        if (orderId && email) {
          parsed = { orderId: String(orderId).trim(), email: String(email).trim().toLowerCase() };
        }
      }

      // Fallback for file rows: detect which column is email/order.
      if (!parsed && cols.length >= 2) {
        const c0 = String(cols[0] || "").trim();
        const c1 = String(cols[1] || "").trim();
        if (looksLikeEmail(c0) && looksLikeOrderId(c1)) {
          parsed = { orderId: normalizeOrderId(c1), email: c0.toLowerCase() };
        } else if (looksLikeOrderId(c0) && looksLikeEmail(c1)) {
          parsed = { orderId: normalizeOrderId(c0), email: c1.toLowerCase() };
        } else {
          // Last resort: assume orderId,email
          const a = normalizeOrderId(c0);
          const b = String(c1).trim();
          if (a && b) parsed = { orderId: a, email: b.toLowerCase() };
        }
      }
    } else {
      parsed = parseLine(trimmed);
    }

    if (!parsed) continue;

    total += 1;
    const orderId = normalizeOrderId(parsed.orderId);
    const email = String(parsed.email || "").trim().toLowerCase();

    if (!orderId || !email) continue;

    let userId = null;
    try {
      userId = await paymentDB.findLocalUserIdByEmail(email);
    } catch {
      userId = null;
    }

    if (!userId && firebaseAuth) {
      try {
        const record = await firebaseAuth.getUserByEmail(email);
        userId = record?.uid ? String(record.uid) : null;
      } catch {
        userId = null;
      }
    }

    if (!userId) {
      notFoundUser += 1;
      skipped += 1;
      console.log(`⚠️  Skip (user not found): ${orderId} email=${email}`);
      continue;
    }

    let st;
    try {
      st = await midtransService.getTransactionStatus(orderId);
    } catch (e) {
      if (force && isMissingOnMidtransError(e)) {
        // Proceed using the provided list as source of truth.
        st = {
          transaction_status: "settlement",
          payment_type: "dana",
          transaction_time: new Date().toISOString(),
          settlement_time: new Date().toISOString(),
          transaction_id: null,
          forced: true,
          forced_reason: "midtrans_404_transaction_missing",
        };
      } else {
        skipped += 1;
        console.log(`❌ Skip (Midtrans error): ${orderId} ${e?.message || e}`);
        continue;
      }
    }

    const txStatus = String(st?.transaction_status || "").trim().toLowerCase();
    if (!isPaid(txStatus)) {
      notPaid += 1;
      skipped += 1;
      console.log(`↩️  Skip (not paid): ${orderId} status=${txStatus || "-"}`);
      continue;
    }

    let tx = await paymentDB.getTransactionByOrderId(orderId);
    if (tx) {
      await paymentDB.updateTransactionStatus({
        orderId,
        transactionStatus: txStatus,
        paymentType: st?.payment_type || null,
        transactionTime: st?.transaction_time || new Date().toISOString(),
        settlementTime: st?.settlement_time || null,
        midtransTransactionId: st?.transaction_id || null,
        midtransResponse: {
          ...st,
          source: hasFile ? "sync_orders_from_file" : "sync_orders_from_stdin",
          source_file: hasFile ? inputFile : null,
          source_email: email,
        },
      });
      tx = await paymentDB.getTransactionByOrderId(orderId);
    } else {
      tx = await paymentDB.createTransactionFromWebhook({
        userId,
        orderId,
        grossAmount: st?.gross_amount,
        transactionStatus: txStatus,
        paymentType: st?.payment_type || null,
        transactionTime: st?.transaction_time || new Date().toISOString(),
        midtransTransactionId: st?.transaction_id || null,
        midtransResponse: {
          ...st,
          source: hasFile ? "sync_orders_from_file" : "sync_orders_from_stdin",
          source_file: hasFile ? inputFile : null,
          source_email: email,
        },
      });
    }

    if (!tx?.id) {
      skipped += 1;
      console.log(`❌ Skip (failed to ensure local tx): ${orderId}`);
      continue;
    }

    const alreadyGranted = await paymentDB.hasAccessForTransaction(tx.id);
    if (alreadyGranted) {
      skipped += 1;
      console.log(`ℹ️  Already has access: ${orderId} email=${email}`);
      continue;
    }

    // Compensation mode: grant full duration starting from now.
    const accessEnd = addDays(new Date(), durationDays);

    await paymentDB.grantPackageAccess({
      userId,
      transactionId: tx.id,
      packageIds,
      durationDays,
      accessEnd,
    });

    granted += 1;
    console.log(`✅ Granted: ${orderId} email=${email}`);
  }

  console.log(
    `✅ Done. Total=${total} Granted=${granted} Skipped=${skipped} UserNotFound=${notFoundUser} NotPaid=${notPaid}`
  );
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Sync failed:", err);
    process.exit(1);
  });
