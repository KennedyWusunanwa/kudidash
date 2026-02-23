"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rowsToCsv } from "@/lib/accounting/csv";

export function ExportCsvButton({
  filename,
  rows,
}: {
  filename: string;
  rows: Array<Record<string, string | number | null | undefined>>;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        const csv = rowsToCsv(rows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }}
      disabled={!rows.length}
    >
      <Download className="size-4" />
      Export CSV
    </Button>
  );
}
