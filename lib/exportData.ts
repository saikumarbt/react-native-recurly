import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

type ExportFormat = "csv" | "json";

const CSV_COLUMNS: (keyof Subscription)[] = [
  "name",
  "category",
  "plan",
  "status",
  "price",
  "billingCycle",
  "customIntervalDays",
  "startDate",
  "renewalDate",
  "isTrial",
  "trialEndDate",
  "paymentMethod",
];

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Quote if the value contains a comma, quote or newline (RFC 4180).
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (subs: Subscription[]): string => {
  const header = CSV_COLUMNS.join(",");
  const rows = subs.map((s) =>
    CSV_COLUMNS.map((col) => csvCell(s[col])).join(","),
  );
  return [header, ...rows].join("\n");
};

/**
 * Write all subscriptions to a cache file and open the OS share sheet. Local-
 * first data portability — no server involved. Returns false if there's nothing
 * to export so the caller can inform the user.
 */
export async function exportSubscriptions(
  subs: Subscription[],
  format: ExportFormat,
): Promise<boolean> {
  if (subs.length === 0) return false;

  const isCsv = format === "csv";
  const content = isCsv ? toCsv(subs) : JSON.stringify(subs, null, 2);
  const filename = `myrev-subscriptions.${isCsv ? "csv" : "json"}`;

  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: isCsv ? "text/csv" : "application/json",
      UTI: isCsv ? "public.comma-separated-values-text" : "public.json",
      dialogTitle: "Export my subscriptions",
    });
  }
  return true;
}
