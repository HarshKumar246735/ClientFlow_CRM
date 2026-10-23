import test from 'node:test'; import assert from 'node:assert/strict';
import { parseCsv } from '../src/utils/csvParse.js'; import { toCsv } from '../src/utils/csv.js';
test('parses quoted fields and escaped quotes', () => assert.deepEqual(parseCsv('a,b\n"x,1","he said ""hi"""\n'), [['a', 'b'], ['x,1', 'he said "hi"']]));
test('handles CRLF, blank lines and missing trailing newline', () => assert.deepEqual(parseCsv('a,b\r\n\r\n1,2'), [['a', 'b'], ['1', '2']]));
test('keeps newlines inside quotes', () => assert.deepEqual(parseCsv('a\n"x\ny"'), [['a'], ['x\ny']]));
test('toCsv neutralises spreadsheet formulas', () => assert.equal(toCsv(['a'], [{ a: '=1+1' }, { a: '@x' }]), "a\n'=1+1\n'@x"));
test('toCsv quotes commas and quotes', () => assert.equal(toCsv(['a'], [{ a: 'x,"y"' }]), 'a\n"x,""y"""'));
test('toCsv joins arrays and handles null', () => assert.equal(toCsv(['a', 'b'], [{ a: ['x', 'y'], b: null }]), 'a,b\nx; y,'));
