import { inferSchema, initParser } from 'udsv';

/**
 * Pure, dependency-free CSV parsing for the "Material - Übersicht Bestand" export.
 *
 * The export is a windows-1252 encoded CSV with a handful of metadata rows above the
 * actual header row, `;`-separated columns, `"`-enclosed values (escaped by doubling the
 * quote) and, unfortunately, at least one column (`Kommentar`) that can contain a bare
 * `\n` inside a quoted value while every row is otherwise terminated by `\r\n`.
 */

export interface ResourceCsvIssue {
  code: string;
  message: string;
  line?: number;
  count?: number;
}

export interface ResourceCsvParseResult {
  rows: Record<string, string>[];
  meta: { sourceOrganisation?: string; sourceExportedAt?: Date };
  /** Fatal — caller must not import when this is non-empty. */
  errors: ResourceCsvIssue[];
  /** Informational. */
  warnings: ResourceCsvIssue[];
}

/** Columns that must be present in the header row for the import to make sense. */
export const RESOURCE_CSV_REQUIRED_COLUMNS = [
  'Status',
  'Artikelnummer',
  'Artikel',
  'Artikelgruppe',
  'Artikeltyp',
  'Seriennummer',
  'Lagerort',
];

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

/**
 * Decodes the raw CSV bytes, utf-8 first and windows-1252 (what the export itself uses)
 * second. Line endings are always normalised to `\n`.
 *
 * Being valid utf-8 is the decisive signal, and it is a reliable one: the umlauts of a
 * windows-1252 export are single bytes (`ü` = 0xFC) that are not legal utf-8, so strict
 * decoding of a real export throws and the fallback takes over; a pure-ASCII file decodes
 * identically either way. Sniffing windows-1252 first cannot work: utf-8 umlaut bytes
 * (`ü` = 0xC3 0xBC) are perfectly valid windows-1252 characters, so a hand-made utf-8 file -
 * a filled-in template, or an export opened and re-saved in a spreadsheet - was silently
 * imported as mojibake ("Ausrüstung").
 */
export function decodeResourceCsv(buffer: ArrayBuffer): string {
  try {
    const utf8Text = normalizeLineEndings(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
    if (findHeaderIndex(utf8Text.split('\n')) !== -1) {
      return utf8Text;
    }
  } catch {
    // not valid utf-8 - the windows-1252 export case
  }
  return normalizeLineEndings(new TextDecoder('windows-1252').decode(buffer));
}

/** Finds the index of the actual data header row, or -1 when it cannot be found. */
export function findHeaderIndex(lines: string[]): number {
  return lines.findIndex((line) => line.startsWith('Organisation;Status;') && line.includes(';Artikelnummer;'));
}

function parseSwissDateTime(datePart: string, timePart: string): Date | undefined {
  const dateMatch = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(datePart.trim());
  if (!dateMatch) {
    return undefined;
  }
  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);

  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  const timeMatch = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/.exec(timePart.trim());
  if (timeMatch) {
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2]);
    seconds = Number(timeMatch[3]);
  }

  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

/**
 * Extracts the metadata rows above the header row: `Organisation;<name>;…` and
 * `Exportiert am;<dd.mm.yyyy>;;<hh:mm:ss>;…`. Never throws; both fields are optional.
 */
export function parseResourceCsvMetadata(
  lines: string[],
  headerIndex: number,
): { sourceOrganisation?: string; sourceExportedAt?: Date } {
  const meta: { sourceOrganisation?: string; sourceExportedAt?: Date } = {};
  try {
    for (const line of lines.slice(0, Math.max(headerIndex, 0))) {
      const cells = line.split(';');
      const label = (cells[0] ?? '').trim();
      if (label === 'Organisation') {
        const value = (cells[1] ?? '').trim();
        if (value) {
          meta.sourceOrganisation = value;
        }
      } else if (label === 'Exportiert am') {
        const datePart = cells[1] ?? '';
        const timePart = cells[3] ?? '';
        const exportedAt = parseSwissDateTime(datePart, timePart);
        if (exportedAt) {
          meta.sourceExportedAt = exportedAt;
        }
      }
    }
  } catch {
    // metadata is best-effort — never let it break the import
  }
  return meta;
}

export function parseResourceCsv(buffer: ArrayBuffer): ResourceCsvParseResult {
  const errors: ResourceCsvIssue[] = [];
  const warnings: ResourceCsvIssue[] = [];
  const meta: { sourceOrganisation?: string; sourceExportedAt?: Date } = {};

  if (!buffer || buffer.byteLength === 0) {
    errors.push({ code: 'emptyFile', message: 'The CSV file is empty.' });
    return { rows: [], meta, errors, warnings };
  }

  const text = decodeResourceCsv(buffer);
  if (text.trim() === '') {
    errors.push({ code: 'emptyFile', message: 'The CSV file is empty.' });
    return { rows: [], meta, errors, warnings };
  }

  const lines = text.split('\n');
  const headerIndex = findHeaderIndex(lines);
  if (headerIndex === -1) {
    errors.push({
      code: 'headerNotFound',
      message: 'Could not find the CSV header row (expected a row starting with "Organisation;Status;" containing "Artikelnummer").',
    });
    return { rows: [], meta, errors, warnings };
  }

  Object.assign(meta, parseResourceCsvMetadata(lines, headerIndex));

  const headerColumns = lines[headerIndex].split(';').map((column) => column.trim());
  const missingColumns = RESOURCE_CSV_REQUIRED_COLUMNS.filter((column) => !headerColumns.includes(column));
  if (missingColumns.length > 0) {
    errors.push({
      code: 'missingColumns',
      message: `The CSV is missing required column(s): ${missingColumns.join(', ')}.`,
    });
    return { rows: [], meta, errors, warnings };
  }

  const body = lines.slice(headerIndex).join('\n');
  const schema = inferSchema(body, { col: ';', row: '\n', encl: '"', esc: '"' });
  const rows = initParser(schema).stringObjs(body);

  return { rows, meta, errors, warnings };
}
