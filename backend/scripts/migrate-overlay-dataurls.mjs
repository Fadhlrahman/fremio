import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: path.join(process.cwd(), ".env") });

defaultExport();

async function defaultExport() {
  const connectionString = process.env.DATABASE_URL;
  const ssl = String(process.env.DATABASE_SSL || "").toLowerCase() === "true";

  const pool = connectionString
    ? new pg.Pool({ connectionString, ssl: ssl ? { rejectUnauthorized: false } : false })
    : new pg.Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: ssl ? { rejectUnauthorized: false } : false,
      });

  const uploadsDir = path.join(process.cwd(), "uploads", "overlays");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const client = await pool.connect();
  try {
    console.log("🔎 Searching frames with data:image overlays...");

    const { rows } = await client.query(
      "SELECT id, layout FROM frames WHERE layout::text LIKE '%data:image%'"
    );

    let touchedFrames = 0;
    let migratedImages = 0;

    for (const row of rows) {
      const frameId = row.id;
      let layout;
      try {
        layout = typeof row.layout === "string" ? JSON.parse(row.layout) : row.layout;
      } catch {
        continue;
      }

      if (!layout || !Array.isArray(layout.elements) || layout.elements.length === 0) continue;

      let changed = false;

      const nextElements = layout.elements.map((el) => {
        if (!el || el.type !== "upload" || !el.data) return el;

        const image = el.data.image;
        if (typeof image !== "string" || !image.startsWith("data:image/")) return el;

        const match = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
        if (!match) return el;

        const extRaw = match[1].toLowerCase();
        const ext = extRaw === "jpeg" ? "jpg" : extRaw;
        const base64 = match[2];

        const bytes = Buffer.from(base64, "base64");
        const filename = `${crypto.randomUUID()}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, bytes);

        migratedImages += 1;
        changed = true;

        const { originalImage, ...restData } = el.data;
        return {
          ...el,
          data: {
            ...restData,
            image: `/uploads/overlays/${filename}`,
          },
        };
      });

      if (!changed) continue;

      const nextLayout = {
        ...layout,
        elements: nextElements,
      };

      await client.query("UPDATE frames SET layout = $1 WHERE id = $2", [nextLayout, frameId]);
      touchedFrames += 1;

      if (touchedFrames % 20 === 0) {
        console.log(`✅ Migrated ${touchedFrames} frames so far...`);
      }
    }

    console.log("✅ Done");
    console.log("Frames updated:", touchedFrames);
    console.log("Images migrated:", migratedImages);
  } finally {
    client.release();
    await pool.end();
  }
}
