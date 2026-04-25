import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export function parseCsv(buffer) {
  return parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
  });
}

export function stringifyCsv(rows, columns) {
  return stringify(rows, { header: true, columns });
}
