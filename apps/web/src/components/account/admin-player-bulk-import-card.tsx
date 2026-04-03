import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildPlayerImportPreview } from "@/lib/entity-import-configs";
import { client } from "@/utils/orpc";

const MAX_VISIBLE_IMPORT_ERRORS = 15;

export function AdminPlayerBulkImportCard() {
  const queryClient = useQueryClient();
  const [selectedFileName, setSelectedFileName] = useState("");
  const [preview, setPreview] = useState<{
    totalRows: number;
    validRows: Parameters<typeof client.bulkImportPlayers>[0]["rows"];
    rowErrors: Array<{ rowNumber: number; field?: string; message: string }>;
  } | null>(null);
  const [validationError, setValidationError] = useState("");

  const bulkImportMutation = useMutation({
    mutationFn: async (
      payload: Parameters<typeof client.bulkImportPlayers>[0]
    ) => client.bulkImportPlayers(payload),
    onSuccess: async (result) => {
      toast.success(
        `Imported ${result.importedCount} players. Skipped ${result.skippedDuplicateCount} duplicates.`
      );

      if (result.failedRows.length > 0) {
        toast.error(`${result.failedRows.length} rows failed to import.`);
      }

      setSelectedFileName("");
      setPreview(null);
      setValidationError("");
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import players");
    },
  });

  const handleImportFileSelection = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedFileName(file.name);
    setValidationError("");
    setPreview(null);

    try {
      const parsedPreview = await buildPlayerImportPreview(file);
      setPreview(parsedPreview);

      if (parsedPreview.rowErrors.length > 0) {
        toast.error("Fix validation errors before importing.");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to parse import file";
      setValidationError(message);
      toast.error(message);
    }
  };

  return (
    <section
      aria-labelledby="bulk-import-heading"
      className="overflow-hidden border border-foreground/10 bg-[color-mix(in_oklab,var(--color-card)_90%,var(--color-accent)_10%)]"
      id="bulk-player-import"
    >
      <div className="border-foreground/10 border-b px-6 py-4">
        <p className="text-[0.66rem] text-muted-foreground uppercase tracking-[0.24em]">
          Admin
        </p>
        <h2
          className="mt-0.5 font-sans font-semibold text-lg tracking-tight"
          id="bulk-import-heading"
        >
          Bulk Player Import
        </h2>
        <p className="mt-1 max-w-prose font-sans text-muted-foreground text-sm leading-6">
          Upload CSV or JSON. Import starts only after all rows pass validation.
        </p>
      </div>

      <div className="space-y-4 px-6 py-6">
        <Input
          accept=".csv,.json"
          onChange={handleImportFileSelection}
          type="file"
        />

        {selectedFileName.length > 0 ? (
          <p className="text-muted-foreground text-sm">
            Selected file: {selectedFileName}
          </p>
        ) : null}

        {validationError.length > 0 ? (
          <p className="text-destructive text-sm">{validationError}</p>
        ) : null}

        {preview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Rows: {preview.totalRows}</Badge>
              <Badge variant="secondary">
                Valid: {preview.validRows.length}
              </Badge>
              <Badge
                variant={
                  preview.rowErrors.length > 0 ? "destructive" : "default"
                }
              >
                Errors: {preview.rowErrors.length}
              </Badge>
            </div>

            {preview.rowErrors.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[0.64rem] text-muted-foreground uppercase tracking-[0.22em]">
                  Validation Errors
                </p>
                <ul className="space-y-1.5 border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm">
                  {preview.rowErrors
                    .slice(0, MAX_VISIBLE_IMPORT_ERRORS)
                    .map((rowError) => (
                      <li
                        className="text-destructive"
                        key={`${rowError.rowNumber}-${rowError.field}-${rowError.message}`}
                      >
                        Row {rowError.rowNumber}
                        {rowError.field ? ` (${rowError.field})` : ""}:{" "}
                        {rowError.message}
                      </li>
                    ))}
                </ul>
                {preview.rowErrors.length > MAX_VISIBLE_IMPORT_ERRORS ? (
                  <p className="text-muted-foreground text-xs">
                    Showing first {MAX_VISIBLE_IMPORT_ERRORS} errors.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 border-foreground/10 border-t pt-4">
              <Button
                disabled={
                  preview.rowErrors.length > 0 ||
                  preview.validRows.length === 0 ||
                  bulkImportMutation.isPending
                }
                onClick={async () => {
                  await bulkImportMutation.mutateAsync({
                    rows: preview.validRows,
                  });
                }}
                type="button"
              >
                {bulkImportMutation.isPending
                  ? "Importing..."
                  : "Import Players"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
