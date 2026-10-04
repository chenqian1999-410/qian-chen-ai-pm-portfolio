import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(root, 'dist');
const errors = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function lineFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function report(file, message, index = 0) {
  errors.push(`${path.relative(root, file)}:${lineFor(fs.readFileSync(file, 'utf8'), index)} ${message}`);
}

function localTarget(fromFile, rawReference) {
  const reference = rawReference.trim();
  if (!reference || reference.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(reference)) return null;
  const pathname = reference.split('#')[0].split('?')[0];
  if (!pathname) return null;
  const decoded = decodeURIComponent(pathname);
  const target = decoded.startsWith('/') ? path.join(siteRoot, decoded) : path.resolve(path.dirname(fromFile), decoded);
  return target.endsWith(path.sep) ? path.join(target, 'index.html') : target;
}

function checkHtml(file) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/^\s*<!doctype html>/i.test(source)) report(file, 'missing <!doctype html>');
  if (!/<html\b[^>]*\blang=["'][^"']+["']/i.test(source)) report(file, 'missing html lang attribute');
  if (!/<meta\b[^>]*\bname=["']viewport["']/i.test(source)) report(file, 'missing viewport meta tag');
  if (!/<title>[^<]+<\/title>/i.test(source)) report(file, 'missing non-empty title');
  if (/file:\/\//i.test(source)) report(file, 'contains a local file:// URL');

  const ids = new Map();
  for (const match of source.matchAll(/\bid=["']([^"']+)["']/gi)) {
    if (ids.has(match[1])) report(file, `duplicate id "${match[1]}"`, match.index);
    ids.set(match[1], match.index);
  }

  for (const match of source.matchAll(/<(?:a|link|img|script)\b[^>]*\b(?:href|src)=["']([^"']+)["'][^>]*>/gi)) {
    const target = localTarget(file, match[1]);
    if (target && !fs.existsSync(target)) report(file, `missing linked resource "${match[1]}"`, match.index);
  }

  for (const match of source.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(match[1])) report(file, 'image is missing an alt attribute', match.index);
  }

  for (const match of source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { new vm.Script(match[1], { filename: path.relative(root, file) }); }
    catch (error) { report(file, `inline JavaScript syntax error: ${error.message}`, match.index); }
  }
}

function checkJavaScript(file) {
  try { new vm.Script(fs.readFileSync(file, 'utf8'), { filename: path.relative(root, file) }); }
  catch (error) { report(file, `JavaScript syntax error: ${error.message}`); }
}

if (!fs.existsSync(siteRoot)) {
  console.error('dist directory is missing');
  process.exit(1);
}

const files = walk(siteRoot);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const jsFiles = files.filter((file) => file.endsWith('.js'));
htmlFiles.forEach(checkHtml);
jsFiles.forEach(checkJavaScript);

if (errors.length) {
  console.error(`Site checks failed (${errors.length}):\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(`Site checks passed: ${htmlFiles.length} HTML pages, ${jsFiles.length} JavaScript files, ${files.length} total files.`);
