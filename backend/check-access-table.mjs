import pg from "pg";

const pool = new pg.Pool({
  host: "localhost",
  port: 5432,
  database: "fremio",
  user: "postgres",
  password: "postgres123",
});

console.log("Checking user_package_access table structure...\n");

// Check table columns
const columnsResult = await pool.query(`
  SELECT column_name, data_type, is_nullable 
  FROM information_schema.columns 
  WHERE table_name = 'user_package_access'
  ORDER BY ordinal_position
`);

console.log("user_package_access columns:");
columnsResult.rows.forEach((col) => {
  console.log(`  ${col.column_name} (${col.data_type})`);
});

// Check if is_active and access_end exist
console.log("\n✅ Checking if table has required columns:");
const hasIsActive = columnsResult.rows.some(
  (c) => c.column_name === "is_active"
);
const hasAccessEnd = columnsResult.rows.some(
  (c) => c.column_name === "access_end"
);
const hasPackageIds = columnsResult.rows.some(
  (c) => c.column_name === "package_ids"
);

console.log(`  is_active: ${hasIsActive ? "✅" : "❌"}`);
console.log(`  access_end: ${hasAccessEnd ? "✅" : "❌"}`);
console.log(`  package_ids: ${hasPackageIds ? "✅" : "❌"}`);

await pool.end();
