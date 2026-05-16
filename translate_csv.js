const fs = require('fs');
const path = 'e:/Antigravity/elm327/K9k_common_translated.csv';
let content = fs.readFileSync(path, 'utf8');

const dict = {
    'ПРОТИВОСАЖ': 'ANTIPARTICULAS',
    'ДИФФЕРЕНЦИАЛЬН': 'DIFERENCIAL',
    'ДИФФЕРЕНЦ': 'DIFERENCIAL',
    'ТЕМПЕРАТУР': 'TEMPERATURA',
    'ДАВЛЕНИ': 'PRESION',
    'ДАВЛЕН': 'PRESION',
    'ДАВЛ': 'PRESION',
    'МАССА': 'MASA',
    'ХОЛЛИН': 'HOLLIN',
    'РЕГЕНЕРАЦ': 'REGENERACION',
    'РЕГЕНЕР': 'REGENERACION',
    'ПОСЛЕ': 'DESPUES',
    'ПЕРЕД': 'ANTES DE',
    'ВХОДЕ': 'ENTRADA',
    'ВХОД': 'ENTRADA',
    'ВЫХОДЕ': 'SALIDA',
    'ВЫХОД': 'SALIDA',
    'НАПРЯЖ': 'VOLTAJE',
    'ПИТАНИ': 'ALIMENTACION',
    'ДАТЧИК': 'SENSOR',
    'ОШИБК': 'ERROR',
    'НЕИСПРАВН': 'ERROR',
    'НЕИСПР': 'ERROR',
    'ПОЯВЛ': 'APARICION',
    'УСПЕШН': 'EXITOSA',
    'ПОСЛ': 'ULTIMA',
    'ОБ/МИН': 'RPM',
    'МБАР': 'mbar',
    'ГРАММ': 'g',
    'Г/С': 'g/s',
    'БАР': 'bar',
    'М3/Ч': 'm3/h',
    'СЕК': 'seg',
    'МИН': 'min',
    'ГРАДУС': 'grados',
    'ВЕЛИЧИН': 'VALOR',
    'ЗНАЧЕН': 'VALOR',
    'КОМАНДА': 'COMANDO',
    'MOMENTOА': 'MOMENTO',
    'ВЫПОЛН': 'EJECUCION',
    'ТЕКУЩ': 'ACTUAL',
    'ПРЕДЫД': 'PREVIO',
    'ОБЩ': 'TOTAL',
    'ВКЛ': 'ON',
    'ВЫКЛ': 'OFF',
    'ТРУБКИ': 'TUBOS',
    'ТРУБКА': 'TUBO',
    'ВЕНТИЛЯТОР': 'VENTILADOR',
    'ЖИДКОСТЬ': 'LIQUIDO',
    'ОХЛАЖД': 'REFRIGERANTE',
    'ЭКРАН': 'PANTALLA',
    'ВИЗУАЛИЗ': 'VISUALIZADA',
    'СКОРОСТЬ': 'VELOCIDAD',
    'об/min': 'RPM',
    'м3/ч': 'm3/h',
    'грамм': 'g',
    'мbar': 'mbar',
    'мбар': 'mbar',
    'км': 'km'
};

// Also replace any individual Cyrillic letters that might be hanging around (like the 'A' in MOMENTOА)
// but only if they are part of words.
const cyrillicRegex = /[а-яА-Я]+/g;

// Sort keys by length descending
const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);

for (const key of sortedKeys) {
    const regex = new RegExp(key, 'gi');
    content = content.replace(regex, dict[key]);
}

// Final pass to catch any missed Cyrillic words and replace with blank or [?] to see them
content = content.replace(cyrillicRegex, (match) => {
    console.log('Final catch-all replaced:', match);
    return ''; // Remove remaining Cyrillic to avoid user confusion
});

// Clean up any double spaces or leading/trailing separators created
content = content.replace(/  +/g, ' ');
content = content.replace(/ ,/g, ',');

fs.writeFileSync(path, content, 'utf8');
fs.writeFileSync('e:/Antigravity/elm327/public/pids.csv', content, 'utf8');
console.log('Total Localization complete.');
