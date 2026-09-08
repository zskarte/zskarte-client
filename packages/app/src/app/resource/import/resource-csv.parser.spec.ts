// Pure module, no Angular TestBed involved — import the globals explicitly (vitest `globals` is not enabled repo-wide).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { decodeResourceCsv, findHeaderIndex, parseResourceCsv, parseResourceCsvMetadata } from './resource-csv.parser';

function loadFixtureBuffer(): ArrayBuffer {
  const path = new URL('../testing/resource-fixture.csv', import.meta.url);
  const nodeBuffer = readFileSync(path);
  return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength) as ArrayBuffer;
}

describe('resource-csv.parser', () => {
  describe('parseResourceCsv (fixture)', () => {
    it('finds the header row at line index 7', () => {
      const buffer = loadFixtureBuffer();
      const text = decodeResourceCsv(buffer);
      const lines = text.split('\n');
      expect(findHeaderIndex(lines)).toBe(7);
    });

    it('parses 16 data rows with 38 columns and no fatal errors', () => {
      const result = parseResourceCsv(loadFixtureBuffer());
      expect(result.errors).toEqual([]);
      expect(result.rows.length).toBe(16);
      expect(Object.keys(result.rows[0]).length).toBe(38);
    });

    it('unescapes doubled quotes', () => {
      const result = parseResourceCsv(loadFixtureBuffer());
      expect(result.rows[0]['Artikel']).toBe('Stromaggregat "Kirsch"');
    });

    it('decodes windows-1252 umlauts', () => {
      const result = parseResourceCsv(loadFixtureBuffer());
      expect(result.rows[3]['Artikel']).toBe('Anhänger ZS');
    });

    it('preserves an embedded newline inside a quoted cell (critical regression test)', () => {
      const result = parseResourceCsv(loadFixtureBuffer());
      expect(result.rows[3]['Kommentar']).toBe('AG 719 186\nWeisse Nummer');
    });

    it('extracts the source organisation and export timestamp from the metadata rows', () => {
      const result = parseResourceCsv(loadFixtureBuffer());
      expect(result.meta.sourceOrganisation).toBe('ZSO Unteres Fricktal');
      expect(result.meta.sourceExportedAt).toEqual(new Date(2026, 8, 7, 14, 15, 45));
    });

    it('is deterministic across repeated runs on the same buffer', () => {
      const first = parseResourceCsv(loadFixtureBuffer());
      const second = parseResourceCsv(loadFixtureBuffer());
      expect(second).toEqual(first);
    });
  });

  describe('findHeaderIndex', () => {
    it('returns -1 when the header row is absent', () => {
      expect(findHeaderIndex(['a;b;c', 'd;e;f'])).toBe(-1);
    });

    it('finds a header row that starts with Organisation;Status; and contains ;Artikelnummer;', () => {
      const lines = ['noise', 'Organisation;Status;aktuelle Verwendung;Artikelnummer;Artikel', 'data'];
      expect(findHeaderIndex(lines)).toBe(1);
    });
  });

  describe('parseResourceCsvMetadata', () => {
    it('never throws and returns an empty object when nothing matches', () => {
      const lines = ['foo;bar', 'baz;qux'];
      expect(() => parseResourceCsvMetadata(lines, 2)).not.toThrow();
      expect(parseResourceCsvMetadata(lines, 2)).toEqual({});
    });

    it('parses Organisation and Exportiert am rows', () => {
      const lines = ['Organisation;Acme Corp;;;', 'Exportiert am;01.02.2024;;09:30:00;;'];
      const meta = parseResourceCsvMetadata(lines, 2);
      expect(meta.sourceOrganisation).toBe('Acme Corp');
      expect(meta.sourceExportedAt).toEqual(new Date(2024, 1, 1, 9, 30, 0));
    });

    it('does not throw on garbage export date/time', () => {
      const lines = ['Exportiert am;not-a-date;;not-a-time;;'];
      expect(() => parseResourceCsvMetadata(lines, 1)).not.toThrow();
      expect(parseResourceCsvMetadata(lines, 1).sourceExportedAt).toBeUndefined();
    });
  });

  describe('parseResourceCsv (fatal errors)', () => {
    it('reports emptyFile for an empty buffer', () => {
      const result = parseResourceCsv(new ArrayBuffer(0));
      expect(result.errors.some((e) => e.code === 'emptyFile')).toBe(true);
      expect(result.rows).toEqual([]);
    });

    it('reports headerNotFound when there is no matching header row', () => {
      const buffer = new TextEncoder().encode('foo;bar\nbaz;qux\n').buffer;
      const result = parseResourceCsv(buffer as ArrayBuffer);
      expect(result.errors.some((e) => e.code === 'headerNotFound')).toBe(true);
    });

    it('reports missingColumns listing the missing required columns', () => {
      const csv = 'Organisation;Status;aktuelle Verwendung;Artikelnummer;Artikel\nZSO;an Lager;;ZM-1;Foo\n';
      const buffer = new TextEncoder().encode(csv).buffer;
      const result = parseResourceCsv(buffer as ArrayBuffer);
      const issue = result.errors.find((e) => e.code === 'missingColumns');
      expect(issue).toBeDefined();
      expect(issue!.message).toContain('Artikelgruppe');
      expect(issue!.message).toContain('Artikeltyp');
      expect(issue!.message).toContain('Seriennummer');
      expect(issue!.message).toContain('Lagerort');
    });
  });
});

/**
 * The template shipped for download (`assets/doc/resource/mittel-beispiel.csv`) is what people
 * fill in with their own stock, so it has to survive the very same import path as a real
 * export - including the encoding it happens to be saved in.
 */
describe('shipped example template', () => {
  function loadExampleBuffer(): ArrayBuffer {
    const path = new URL('../../../assets/doc/resource/mittel-beispiel.csv', import.meta.url);
    const nodeBuffer = readFileSync(path);
    return nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength) as ArrayBuffer;
  }

  it('parses without fatal errors and keeps its explanatory rows out of the data', () => {
    const result = parseResourceCsv(loadExampleBuffer());
    expect(result.errors).toEqual([]);
    expect(result.rows.length).toBe(9);
    expect(result.meta.sourceOrganisation).toBe('ZSO Musterstadt');
  });

  it('keeps umlauts intact - it is stored as utf-8, unlike the windows-1252 export', () => {
    const result = parseResourceCsv(loadExampleBuffer());
    const groups = result.rows.map((row) => row['Artikelgruppe']);
    expect(groups).toContain('Sanitätsmaterial');
    expect(groups).toContain('Ausrüstung AdZS');
  });

  it('demonstrates every state the catalogue can show', () => {
    const result = parseResourceCsv(loadExampleBuffer());
    const statuses = new Set(result.rows.map((row) => row['Status']));
    expect(statuses).toEqual(new Set(['an Lager', 'in Reparatur', 'ausgeliehen']));
    // serialised pieces and interchangeable ones side by side
    expect(result.rows.some((row) => row['Seriennummer'])).toBe(true);
    expect(result.rows.some((row) => !row['Seriennummer'])).toBe(true);
  });
});

describe('decodeResourceCsv', () => {
  const header =
    'Organisation;Status;Artikelnummer;Artikel;Artikelgruppe;Artikeltyp;Seriennummer;Lagerort\nZSO;an Lager;ZM-1;Anhänger;Transport/Logistik;Kat. B;;Lager\n';

  it('decodes a utf-8 file (a filled-in template) without mojibake', () => {
    const bytes = new TextEncoder().encode(header);
    expect(decodeResourceCsv(bytes.buffer as ArrayBuffer)).toContain('Anhänger');
  });

  it('still decodes the windows-1252 export, whose umlauts are single bytes', () => {
    const bytes = Uint8Array.from(header, (character) => character.charCodeAt(0));
    expect(decodeResourceCsv(bytes.buffer as ArrayBuffer)).toContain('Anhänger');
  });
});
