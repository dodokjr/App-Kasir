import bcrypt from "bcryptjs";
import { all, add, uid, now } from "./sheets";

// Membuat akun developer pertama dari .env jika belum ada
export async function seedDeveloper() {
  const users = await all("users");
  if (users.some((u) => u.role === "developer")) return users;
  const email = process.env.DEVELOPER_EMAIL?.toLowerCase();
  const pw = process.env.DEVELOPER_PASSWORD;
  if (!email || !pw) return users;
  await add("users", {
    id: uid(), storeId: "", branchId: "", name: "Developer", email,
    passwordHash: await bcrypt.hash(pw, 10), role: "developer", active: "TRUE", createdAt: now(),
  });
  return all("users");
}
