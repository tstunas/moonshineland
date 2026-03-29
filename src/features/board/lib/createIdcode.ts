export function createIdcode(userId: number) {
  const kstDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  const dateStr = kstDate.toISOString().split("T")[0].replace(/-/g, "");
  const combined = dateStr + userId.toString().padStart(8, "0");

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const absHash = Math.abs(hash);
  return Array.from({ length: 8 }, (_, i) =>
    (Math.floor(absHash / Math.pow(36, i)) % 36).toString(36),
  ).join("");
}
