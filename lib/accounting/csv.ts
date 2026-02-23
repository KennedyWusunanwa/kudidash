export function parseBasicCsv(input: string): string[][] {
  // UNSPECIFIED: CSV dialect. This uses a safe, minimal parser for simple comma-delimited imports.
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      line
        .split(",")
        .map((value) => value.trim().replace(/^\"|\"$/g, ""))
    );
}

export function rowsToCsv(
  rows: Array<Record<string, string | number | null | undefined>>
) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const value = row[h] ?? "";
          const str = String(value).replace(/\"/g, '""');
          return /,|\n|\"/.test(str) ? `\"${str}\"` : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}
