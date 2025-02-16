#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { stringify, parse } from "ftbq-nbt";

const INPUT_FOLDER = "quests";
const OUTPUT_FOLDER = "out";

const csvEntries = new Map();

function containsChinese(text) {
  return /[\u4e00-\u9fff]/.test(text);
}

function traverseAndReplace(node, context) {
  if (typeof node === "string") {
    if (containsChinese(node)) {
      const placeholder = `{quest.${context.join('.')}}`;
      csvEntries.set(placeholder, node);
      return placeholder;
    }
    return node;
  } else if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = traverseAndReplace(node[i], context.concat(i));
    }
    return node;
  } else if (node && typeof node === "object") {
    for (const key in node) {
      node[key] = traverseAndReplace(node[key], context.concat(key));
    }
    return node;
  }
  return node;
}

async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log("Processing :", filePath);
    const data = parse(content, { skipComma: true, useBoolean: true, typePostfix: true });
    const fileId = data.filename || path.basename(filePath, path.extname(filePath));
    
    traverseAndReplace(data, [fileId]);
    
    const outPath = filePath.replace(/quests/, OUTPUT_FOLDER);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, stringify(data, { skipComma: true, pretty: true, useBoolean: true, typePostfix: true }), 'utf-8');
    console.log(`Traitement de ${filePath} terminé.`);
  } catch (e) {
    console.error(`Failed processing ${filePath} :`, e);
  }
}

async function processDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await processDirectory(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.snbt')) {
      await processFile(fullPath);
    }
  }
}

async function main() {
  const inputDir = `./${INPUT_FOLDER}`;
  await processDirectory(inputDir);

  let csvContent = "PLACEHOLDER;ZH;EN\n";
  for (const [placeholder, zh] of csvEntries) {
    csvContent += `${placeholder};${zh};\n`;
  }
  await fs.writeFile( `./${OUTPUT_FOLDER}/translations.csv`, csvContent, 'utf-8');
  console.log("file translations.csv done.");
}

main().catch(err => console.error(err));
