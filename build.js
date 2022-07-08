const { execSync } = require('child_process');
const fs = require('fs');
const YAML = require('yaml');
const CSVToJSON = require('csvtojson');

if (!fs.existsSync('dependencies')) {
  fs.mkdirSync('dependencies');
}

const repositories = [
  ['grosser', 'i18n_data'],
  ['cospired', 'i18n-iso-languages'],
  ['onomojo', 'i18n-country-translations'],
  ['ladjs', 'country-language'],
];

for (const [owner, name] of repositories) {
  const dest = `dependencies/${name}`;
  if (!fs.existsSync(dest)) {
    execSync(`git clone https://github.com/${owner}/${name}.git ${dest}`);
  }
}

async function main() {
  // Clear build
  if (fs.existsSync('build')) {
    fs.rmSync('build', { recursive: true });
  }
  fs.mkdirSync('build');

  const build = {
    countries: {},
    languages: {},
    signedLanguages: {},
  };

  function add(type, code, obj) {
    if (!(code in build[type])) {
      build[type][code] = {};
    }
    for (const [k, v] of Object.entries(obj)) {
      build[type][code][k.toLowerCase()] = v;
    }
  }

  // Both
  const dataDir = 'dependencies/i18n_data/cache/file_data_provider/';
  for (const fName of fs.readdirSync(dataDir)) {
    const [type, f] = fName.split('-');
    const [code, _] = f.split('.');

    const contents = String(fs.readFileSync(dataDir + fName));
    const map = {};
    for (const line of contents.split('\n')) {
      const [code, name] = line.split(';;');
      map[code] = name;
    }

    add(type, code.toLowerCase().replace('_', '-'), map);
  }

  // Countries
  const countriesDir = 'dependencies/i18n-country-translations/rails/locale/iso_639-1/';
  for (const fName of fs.readdirSync(countriesDir)) {
    const [country, _] = fName.split('.');
    const contents = YAML.parse(String(fs.readFileSync(countriesDir + fName)));
    const { countries } = Object.values(contents)[0];
    add('countries', country, countries);
  }

  // Languages
  const languagesDir = 'dependencies/i18n-iso-languages/langs/';
  for (const fName of fs.readdirSync(languagesDir)) {
    const [language, _] = fName.split('.');
    const { languages } = JSON.parse(String(fs.readFileSync(languagesDir + fName)));
    add('languages', language, languages);
  }

  // Generic - languages in their own language
  const csvPath = 'dependencies/country-language/dataCompilation/dataSources/ISO639_codes.csv';
  const rows = await CSVToJSON().fromFile(csvPath);
  const obj = {};
  for (const row of rows) {
    obj[row.ab] = row['аҧсуа бызшәа, аҧсшәа'];
  }
  add('languages', 'local', obj);

  // Custom
  const customDir = 'custom/';
  for (const type of fs.readdirSync(customDir)) {
    for (const fName of fs.readdirSync(customDir + type)) {
      const [code, _] = fName.split('.');
      const map = JSON.parse(String(fs.readFileSync(customDir + type + '/' + fName)));
      add(type, code, map);
    }
  }

  // Duplicate inconsistent codes
  build.languages['pt-pt'] = build.languages['pt'];
  build.countries['pt-pt'] = build.countries['pt'];

  build.countries['no'] = build.countries['nn']; // Norwegian

  const missingLanguages = [
    'su',
    'sd',
    'ny',
    'st',
    'ig',
    'tk',
    'ha',
    'ky',
    'co',
    'km',
    'so',
    'gd',
    'fy',
    'sn',
    'kk',
    'ku',
    'ceb',
    'ne',
    'mg',
    'jv',
    'uz',
    'ht',
    'haw',
    'sw',
    'yo',
    'ur',
    'si',
    'hy',
    'fil',
    'my',
    'yi',
    'ka',
    'lo',
  ];

  for (const missingLang of missingLanguages) {
    if (missingLang in build.languages) {
      console.error('Language', missingLang, 'Not longer missing');
    }
    build.languages[missingLang] = build.languages['local'];
  }

  const missingCountries = ['su', 'ny', 'haw', 'ku', 'yi', 'jv', 'ceb', 'co', 'st', 'fil'];
  for (const missingCountry of missingCountries) {
    if (missingCountry in build.countries) {
      console.error('Country', missingCountry, 'Not longer missing');
    }
    build.countries[missingCountry] = {};
  }

  for (const [type, i18n] of Object.entries(build)) {
    fs.mkdirSync(`build/${type}`);
    for (const [code, map] of Object.entries(i18n)) {
      const codeNames = [code];
      if (code.split('-').length === 2) {
        const [lang, country] = code.split('-');
        codeNames.push(`${lang}-${country.toUpperCase()}`);
      }
      for (const codeName of codeNames) {
        fs.writeFileSync(`build/${type}/${codeName}.json`, JSON.stringify(map, null, 2) + '\n');
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
