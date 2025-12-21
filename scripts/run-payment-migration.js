// Run payment system database migration
// Run this from backend directory: node ../scripts/run-payment-migration.js
import("../backend/node_modules/pg/lib/index.js")
  .then((pg) => {
    const { Pool } = pg.default;
    import("fs").then((fsModule) => {
      const fs = fsModule.default;
      import("path").then((pathModule) => {
        const path = pathModule.default;
        import("url").then((urlModule) => {
          const { fileURLToPath } = urlModule;

          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);

          // Database configuration
          const pool = new Pool({
            host: process.env.DB_HOST || "localhost",
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || "fremio",
            user: process.env.DB_USER || "salwa",
            password: process.env.DB_PASSWORD || "",
          });

          async function runMigration() {
            console.log("🚀 Running payment system migration...");

            try {
              // Read migration file
              const migrationPath = path.join(
                __dirname,
                "..",
                "database",
                "migrations",
                "002_create_payment_system.sql"
              );
              const migrationSQL = fs.readFileSync(migrationPath, "utf8");

              console.log("📄 Migration file loaded");
              console.log("🔗 Connecting to database...");

              // Execute migration
              await pool.query(migrationSQL);

              console.log(
                "✅ Payment system migration completed successfully!"
              );
              console.log("\nCreated tables:");
              console.log("  - frame_packages");
              console.log("  - payment_transactions");
              console.log("  - user_package_access");
              console.log("\nCreated indexes and triggers");

              await pool.end();
              process.exit(0);
            } catch (error) {
              console.error("❌ Migration failed:", error.message);
              console.error("Stack:", error.stack);
              await pool.end();
              process.exit(1);
            }
          }

          runMigration();
        });
      });
    });
  })
  .catch((err) => {
    console.error("❌ Failed to load modules:", err);
    process.exit(1);
  });
