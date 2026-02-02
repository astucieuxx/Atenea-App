/**
 * Script para actualizar DATABASE_URL en .env
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");

try {
  const envContent = readFileSync(envPath, "utf-8");
  
  // Nueva connection string con Transaction Pooler (puerto 6543)
  const newDbUrl = "postgresql://postgres.fxesmafcpbtbtmlksvbb:jH2BgFXNqgcVqXTP@aws-1-us-east-1.pooler.supabase.com:6543/postgres";
  
  // Reemplazar DATABASE_URL
  const updatedContent = envContent.replace(
    /DATABASE_URL=.*/,
    `DATABASE_URL=${newDbUrl}`
  );
  
  writeFileSync(envPath, updatedContent, "utf-8");
  console.log("✅ DATABASE_URL actualizada en .env");
  console.log("\nNueva URL:");
  console.log(newDbUrl);
} catch (error) {
  console.error("❌ Error al actualizar .env:", error);
  process.exit(1);
}
