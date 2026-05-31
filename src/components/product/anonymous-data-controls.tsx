"use client";

import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ApiRequestError,
  deleteAnonymousData,
  downloadAnonymousDataExport,
} from "@/lib/api/client";
import { clearAllJourneyStorage } from "@/lib/session/journey-storage";

export function AnonymousDataControls() {
  const router = useRouter();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="mindbridge-ambient-shadow rounded-[2rem] border border-border/60 bg-card p-5 sm:p-7">
      <h2 className="text-lg font-semibold text-foreground">
        Anonymous journey data
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        This browser journey is not an account. Export downloads retained
        server data for this browser&apos;s anonymous owner. Delete removes
        retained server journey data for this browser and clears this
        browser&apos;s MindBridge cache. MindBridge does not provide clinical
        review or emergency monitoring.
      </p>

      {notice ? (
        <p className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-3 text-sm leading-6 text-foreground">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-6 text-destructive">
          {error}
        </p>
      ) : null}

      {confirmingDelete ? (
        <div className="mt-5 rounded-[1.5rem] border border-destructive/25 bg-destructive/10 p-4">
          <p className="font-semibold text-foreground">
            Delete retained journey data?
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This removes retained anonymous journey data for this browser and
            clears the local MindBridge cache. This cannot be undone.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setConfirmingDelete(false)}
            >
              Keep journey
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={() => void handleDelete()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete now"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isExporting || isDeleting}
            onClick={() => void handleExport()}
          >
            <Download className="size-4" aria-hidden="true" />
            {isExporting ? "Preparing export..." : "Export retained data"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isExporting || isDeleting}
            onClick={() => {
              setError(null);
              setNotice(null);
              setConfirmingDelete(true);
            }}
            className="border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete anonymous journey data
          </Button>
        </div>
      )}
    </section>
  );

  async function handleExport() {
    setError(null);
    setNotice(null);
    setIsExporting(true);

    try {
      downloadBlob(await downloadAnonymousDataExport());
      setNotice("Your retained-data download is ready.");
    } catch (caught) {
      setError(
        isRateLimited(caught)
          ? "Please wait before trying to export again."
          : "A retained server export is not available for this browser journey right now.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setNotice(null);
    setIsDeleting(true);

    try {
      await deleteAnonymousData();
      clearAllJourneyStorage();
      router.replace("/onboarding");
    } catch (caught) {
      setError(
        isRateLimited(caught)
          ? "Please wait before trying to delete again."
          : "We could not delete this anonymous journey data. Please try again.",
      );
      setIsDeleting(false);
    }
  }
}

function downloadBlob(blob: Blob) {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = "mindbridge-anonymous-export.json";
  anchor.click();
  URL.revokeObjectURL(href);
}

function isRateLimited(error: unknown) {
  return error instanceof ApiRequestError && error.code === "RATE_LIMITED";
}
