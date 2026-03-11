"use client";

import { Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PublicDocumentActions({
  path,
  pdfPath,
  openLabel = "Open link",
}: {
  path: string;
  pdfPath?: string | null;
  openLabel?: string;
}) {
  const copyLink = async () => {
    try {
      const absoluteUrl = new URL(path, window.location.origin).toString();
      await navigator.clipboard.writeText(absoluteUrl);
      toast.success("Public link copied.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to copy link.");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild type="button" size="sm" variant="outline">
        <a href={path} target="_blank" rel="noreferrer">
          <ExternalLink className="size-4" />
          {openLabel}
        </a>
      </Button>
      {pdfPath ? (
        <Button asChild type="button" size="sm" variant="outline">
          <a href={pdfPath} target="_blank" rel="noreferrer">
            <Download className="size-4" />
            PDF
          </a>
        </Button>
      ) : null}
      <Button type="button" size="sm" variant="outline" onClick={copyLink}>
        <Copy className="size-4" />
        Copy link
      </Button>
    </div>
  );
}
