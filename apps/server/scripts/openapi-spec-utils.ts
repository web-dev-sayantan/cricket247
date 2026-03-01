import { stringify as toYaml } from "yaml";

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

export const deepSortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => deepSortKeys(item));
  }

  if (isRecord(value)) {
    const sortedEntries = Object.entries(value)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entryValue]) => [key, deepSortKeys(entryValue)]);
    return Object.fromEntries(sortedEntries);
  }

  return value;
};

export const toDeterministicJson = (value: unknown): string => {
  return `${JSON.stringify(deepSortKeys(value), null, 2)}\n`;
};

export const toDeterministicYaml = (value: unknown): string => {
  return toYaml(deepSortKeys(value));
};
