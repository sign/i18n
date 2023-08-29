const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = [
  'af',
  'sq',
  'am',
  'ar',
  'hy',
  'as',
  'ay',
  'az',
  'bm',
  'eu',
  'be',
  'bn',
  'bho',
  'bs',
  'bg',
  'ca',
  'ceb',
  'zh-CN',
  'zh-TW',
  'co',
  'hr',
  'cs',
  'da',
  'dv',
  'doi',
  'nl',
  'en',
  'eo',
  'et',
  'ee',
  'fil',
  'fi',
  'fr',
  'fy',
  'gl',
  'ka',
  'de',
  'el',
  'gn',
  'gu',
  'ht',
  'ha',
  'haw',
  'he',
  'hi',
  'hmn',
  'hu',
  'is',
  'ig',
  'ilo',
  'id',
  'ga',
  'it',
  'ja',
  'jv',
  'kn',
  'kk',
  'km',
  'rw',
  'gom',
  'ko',
  'kri',
  'ku',
  'ckb',
  'ky',
  'lo',
  'la',
  'lv',
  'ln',
  'lt',
  'lg',
  'lb',
  'mk',
  'mai',
  'mg',
  'ms',
  'ml',
  'mt',
  'mi',
  'mr',
  'lus',
  'mn',
  'my',
  'ne',
  'no',
  'ny',
  'or',
  'om',
  'ps',
  'fa',
  'pl',
  'pt',
  'pa',
  'qu',
  'ro',
  'ru',
  'sm',
  'sa',
  'gd',
  'nso',
  'sr',
  'st',
  'sn',
  'sd',
  'si',
  'sk',
  'sl',
  'so',
  'es',
  'su',
  'sw',
  'sv',
  'tl',
  'tg',
  'ta',
  'tt',
  'te',
  'th',
  'ti',
  'ts',
  'tr',
  'tk',
  'ak',
  'uk',
  'ur',
  'ug',
  'uz',
  'vi',
  'cy',
  'xh',
  'yi',
  'yo',
  'zu',
];

const langsDir = __dirname + `${path.sep}custom${path.sep}/signedLanguages`;

const languages = {};
for (const language of SUPPORTED_LANGUAGES) {
  languages[language] = {
    filePath: langsDir + path.sep + language.toLowerCase() + '.json',
    content: {},
  };
}

// Load existing language files
for (const file of fs.readdirSync(langsDir)) {
  const [lang] = file.split('.');
  const filePath = langsDir + path.sep + file;
  languages[lang] = {
    filePath,
    content: JSON.parse(String(fs.readFileSync(filePath))),
  };
}

async function translate(text, sourceLanguage, targetLanguage) {
  console.log('translate', { text, sourceLanguage, targetLanguage });
  const requestStr = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLanguage}&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(
    text
  )}`;

  const req = await fetch(requestStr);
  const json = await req.json();
  return json[0][0][0];
}

async function translateMissingEntries(source, target, targetLanguage) {
  for (const [key, value] of Object.entries(source)) {
    if (!(key in target)) {
      if (typeof value === 'string') {
        target[key] = await translate(value, DEFAULT_LANGUAGE, targetLanguage);
      } else {
        target[key] = {};
        await translateMissingEntries(value, target[key], targetLanguage);
      }
    } else {
      if (typeof value !== 'string') {
        await translateMissingEntries(value, target[key], targetLanguage);
      }
    }
  }
}

function removeExtraEntries(source, target) {
  for (const [key, value] of Object.entries(target)) {
    if (!(key in source)) {
      delete target[key];
    } else {
      if (typeof value !== 'string') {
        removeExtraEntries(source[key], value);
      }
    }
  }
}

async function main() {
  // Iterate files and translate missing entries
  for (const [lang, { content, filePath }] of Object.entries(languages)) {
    if (lang !== DEFAULT_LANGUAGE) {
      const source = languages[DEFAULT_LANGUAGE].content;
      await translateMissingEntries(source, content, lang);
      removeExtraEntries(source, content);
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
