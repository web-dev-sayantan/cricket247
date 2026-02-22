import type { ZodType } from "zod";

const SUPPORTED_FILE_EXTENSIONS = new Set(["csv", "json"]);
const DEFAULT_MAX_ROWS = 1000;

interface UnknownRecord {
  [key: string]: unknown;
}

export interface BulkImportRowError {
  field?: string;
  message: string;
  rowNumber: number;
}

export interface BulkImportPreview<TParsed> {
  fileType: "csv" | "json";
  rowErrors: BulkImportRowError[];
  totalRows: number;
  validRows: TParsed[];
}

export interface BulkImportConfig<TParsed> {
  maxRows?: number;
  normalizeRecord: (record: UnknownRecord) => unknown;
  requiredFields: readonly string[];
  schema: ZodType<TParsed>;
}

function getFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.trim().toLowerCase();
  return extension ?? "";
}

function detectFileType(fileName: string): "csv" | "json" {
  const extension = getFileExtension(fileName);

  if (!SUPPORTED_FILE_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported file type. Please upload a CSV or JSON file.");
  }

  return extension as "csv" | "json";
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  const pushCurrentRow = () => {
    currentRow.push(currentCell);
    rows.push(currentRow);
    currentRow = [];
    currentCell = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      pushCurrentRow();
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function parseCsv(text: string): UnknownRecord[] {
  const rows = parseCsvRows(text);

  const nonEmptyRows = rows.filter((row) =>
    row.some((cell) => cell.trim().length > 0)
  );

  if (nonEmptyRows.length < 2) {
    return [];
  }

  const headers = nonEmptyRows[0].map(normalizeHeader);

  return nonEmptyRows.slice(1).map((row) => {
    const record: UnknownRecord = {};

    headers.forEach((header, columnIndex) => {
      record[header] = row[columnIndex]?.trim() ?? "";
    });

    return record;
  });
}

function parseJson(text: string): UnknownRecord[] {
  const parsed: unknown = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error("JSON import must be an array of player objects.");
  }

  return parsed.map((value) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return {};
    }

    const normalized: UnknownRecord = {};
    for (const [key, entryValue] of Object.entries(value)) {
      normalized[normalizeHeader(key)] = entryValue;
    }

    return normalized;
  });
}

function getRecords(text: string, fileType: "csv" | "json"): UnknownRecord[] {
  if (fileType === "csv") {
    return parseCsv(text);
  }

  return parseJson(text);
}

function hasMissingRequiredField(
  record: UnknownRecord,
  fieldName: string
): boolean {
  const value = record[normalizeHeader(fieldName)];

  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  return false;
}

export async function buildBulkImportPreview<TParsed>(
  file: File,
  config: BulkImportConfig<TParsed>
): Promise<BulkImportPreview<TParsed>> {
  const fileType = detectFileType(file.name);
  const text = await file.text();
  const records = getRecords(text, fileType);
  const maxRows = config.maxRows ?? DEFAULT_MAX_ROWS;

  if (records.length === 0) {
    throw new Error("No data rows found in file.");
  }

  if (records.length > maxRows) {
    throw new Error(`Too many rows. Maximum allowed is ${maxRows}.`);
  }

  const validRows: TParsed[] = [];
  const rowErrors: BulkImportRowError[] = [];

  records.forEach((record, index) => {
    const rowNumber = fileType === "csv" ? index + 2 : index + 1;

    for (const fieldName of config.requiredFields) {
      if (hasMissingRequiredField(record, fieldName)) {
        rowErrors.push({
          rowNumber,
          field: fieldName,
          message: `${fieldName} is required`,
        });
      }
    }

    const normalizedRow = config.normalizeRecord(record);
    const parsedRow = config.schema.safeParse(normalizedRow);

    if (!parsedRow.success) {
      for (const issue of parsedRow.error.issues) {
        rowErrors.push({
          rowNumber,
          field: issue.path.join("."),
          message: issue.message,
        });
      }
      return;
    }

    validRows.push(parsedRow.data);
  });

  return {
    fileType,
    totalRows: records.length,
    validRows,
    rowErrors,
  };
}
