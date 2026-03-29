import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

function resolveMariaDbConfig() {
  const urlValue = process.env.DATABASE_URL?.trim();
  let parsedFromUrl: URL | null = null;

  if (urlValue) {
    try {
      parsedFromUrl = new URL(urlValue);
    } catch {
      parsedFromUrl = null;
    }
  }

  const host = process.env.DATABASE_HOST?.trim() || parsedFromUrl?.hostname || "127.0.0.1";
  const port = process.env.DATABASE_PORT
    ? parseInt(process.env.DATABASE_PORT, 10)
    : parsedFromUrl?.port
      ? parseInt(parsedFromUrl.port, 10)
      : 3306;
  const user = process.env.DATABASE_USER?.trim() || parsedFromUrl?.username || "";
  const password = process.env.DATABASE_PASSWORD ?? parsedFromUrl?.password ?? "";
  const database =
    process.env.DATABASE_NAME?.trim() ||
    parsedFromUrl?.pathname.replace(/^\//, "") ||
    "";

  return {
    host,
    port: Number.isInteger(port) ? port : 3306,
    user,
    password,
    database,
  };
}

const mariaDbConfig = resolveMariaDbConfig();

const adapter = new PrismaMariaDb({
  host: mariaDbConfig.host,
  port: mariaDbConfig.port,
  user: mariaDbConfig.user,
  password: mariaDbConfig.password,
  database: mariaDbConfig.database,
  connectionLimit: 5,
});

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
export default prisma;
