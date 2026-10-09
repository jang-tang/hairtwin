import { APP_TABLES } from './schema.js';
const tables = new Set<string>(APP_TABLES);
/** Translate fixed application SQL while preserving quoted literals and comments. */
export function postgresSql(sql: string): string {
  let output = '', parameter = 0;
  const tokens = sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z_0-9]*|\?|[^A-Za-z_?'"/-]+|./g) ?? [];
  for (const token of tokens) {
    if (token === '?') output += '$' + ++parameter;
    else if (tables.has(token)) output += 'hairtwin.' + token;
    else if (token.toUpperCase() === 'LIKE') output += 'ILIKE';
    else output += token;
  }
  return output;
}
