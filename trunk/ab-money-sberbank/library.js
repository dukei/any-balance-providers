/**
AnyBalance (http://any-balance-providers.googlecode.com)

Содержит некоторые полезные для извлечения значений с сайтов функции.
Для конкретного провайдера рекомендуется оставлять в этом файле только те функции, которые используются.

library.js v0.08 от 17.12.13

changelog:
17.12.13 parseMinutes - улучшена обработка минут с точками (28мин.40сек)

05.12.13 parseMinutes - парсинг минут вида 49,25 (т.е. 49 минут и 15 секунд) (Д. Кочин)

03.12.13 опять поправил parseMinutes, не парсились значения типа 252:22 мин

26.11.13: подправлена parseMinutes(), правильное получение данных, если на входе "300 &#65533;мин"

25.11.13: унифицирована parseMinutes() теперь поддерживает все подряд

22.11.13: parseDateWord, добавлена локализация (25 jan 2013, 25 января 2013, 25 янв 2013...), удалена parseDateWordEn, т.к. теперь все есть в parseDateWord
22.11.13: parseMinutes, добавлена локализация, 5m3sec, 5хв3сек.
22.11.13: добавлена parseMinutes().
*/

/**
 * Получает значение, подходящее под регулярное выражение regexp, производит 
 * в нем замены replaces, результат передаёт в функцию parser, 
 * а затем записывает результат в счетчик с именем param в result
 * Результат в result помещается только если счетчик выбран пользователем 
 * в настройках аккаунта
 * 
 * если result и param равны null, то значение просто возвращается.
 * eсли parser == null, то возвращается результат сразу после замен
 * если replaces == null, то замены не делаются
 * 
 * replaces - массив, нечетные индексы - регулярные выражения, четные - строки, 
 * на которые надо заменить куски, подходящие под предыдущее регулярное выражение
 * массивы могут быть вложенными
 * см. например replaceTagsAndSpaces
 */

function getParam(html, result, param, regexp, replaces, parser) {
	if (!isAvailable(param))
        return;

	var regexps = isArray(regexp) ? regexp : [regexp];
	for (var i = 0; i < regexps.length; ++i) { //Если массив регэкспов, то возвращаем первый заматченный
		regexp = regexps[i];
		var matches = regexp ? html.match(regexp) : [, html], value;
		if (matches) {
			//Если нет скобок, то значение - всё заматченное
			value = replaceAll(isset(matches[1]) ? matches[1] : matches[0], replaces);
			if (parser)
                value = parser(value);

			if (param && isset(value)) 
                result[isArray(param) ? param[0] : param] = value;
			break;
		}
	}
	return value;
}

/** Бросает фатальную ошибку, если !param, это остановит обновления по расписанию */
function checkEmpty(param, error, notfatal) {
	if (!param) 
        throw new AnyBalance.Error(error, null, !notfatal);
}

/** Проверяет счетчик param на доступность, принимает либо один счетчик, либо массив
* __tariff - всегда вернет true */
function isAvailable(param) {
	if (!param)
		return true;
	var bArray = isArray(param),
		tariffName = '__tariff';
	if ((bArray && param.indexOf(tariffName) >= 0) || (!bArray && param == '__tariff'))
		return true; //Тариф всегда нужен
	return AnyBalance.isAvailable(param);
}
//Замена пробелов и тэгов
var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /&minus;/ig, '-', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
//Замена для чисел
var replaceFloat = [/&minus;/ig, '-', /\s+/g, '', /,/g, '.', /\.([^.]*)(?=\.)/g, '$1', /^\./, '0.'];
//Замена для Javascript строк
var replaceSlashes = [/\\(.?)/g, function(str, n) {
	switch (n) {
	case '0':
		return '\0';
	case '':
		return '';
	default:
		return n;
	}
}];

/** Проверяет, определено ли значение переменной */
function isset(v) {
	return typeof(v) != 'undefined';
}

/** Проверяет, является ли объект массивом */
function isArray(arr) {
	return Object.prototype.toString.call(arr) === '[object Array]';
}

/** Делает все замены в строке value. При этом, если элемент replaces массив, то делает замены по нему рекурсивно. */
function replaceAll(value, replaces) {
	for (var i = 0; replaces && i < replaces.length; ++i) {
		if (isArray(replaces[i])) {
			value = replaceAll(value, replaces[i]);
		} else {
			value = value.replace(replaces[i], replaces[i + 1]);
			++i; //Пропускаем ещё один элемент, использованный в качестве замены
		}
	}
	return value;
}

/** Извлекает числовое значение из переданного текста */
function parseBalance(text) {
	var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(-?\.?\d[\d.,]*)/, replaceFloat, parseFloat);
	AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
	return val;
}

/** Извлекает валюту из переданного текста (типичная реализация) */
function parseCurrency(text) {
	var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /-?\d[\d.,]*(\S*)/);
	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
	return val;
}

/** Извлекает время в секундах из переданного текста, на разных языках, из разных форматов (1:30, 01:02:03, 1 м 3 сек, 3 сек, 1 час...) 
Если на входе будет просто число - вернет минуты.
Если на входе будет 02:03 будет принят формат ММ:СС*/
function parseMinutes(_text) {
	var text = html_entity_decode(_text).replace(/[\s�]+/g, '');
	var hour = 0, min = 0, sec = 0;
	// Это формат ЧЧ:ММ:СС	
	if(/^\d+:\d+:\d+$/i.test(text)) {
		var regExp = /^(\d+):(\d+):(\d+)$/i.exec(text);
		hour = parseFloat(regExp[1]);
		min = parseFloat(regExp[2]);
		sec = parseFloat(regExp[3]);
	// Это формат ММ:СС
	} else if(/^\d+:\d+/i.test(text)) {
		var regExp = /^(\d+):(\d+)/i.exec(text);
		hour = 0;
		min = parseFloat(regExp[1]);
		sec = parseFloat(regExp[2]);
	// Это любой другой формат, со словами либо просто число
	} else {
		hour = getParam(text, null, null, /(-?[\d\.,]*)\s*(?:час|ч|hour|h)/i, replaceFloat, parseFloat) || 0;
		min = getParam(text, null, null, [/([\d.,]*)\s*(?:мин|м|хв|min|m)/i, /^[\d.,]+$/i], replaceFloat, parseFloat) || 0;
		sec = getParam(text, null, null, /([\d]+)\s*(?:сек|c|с|sec|s)/i, [/&minus;/ig, '-', /\s+/g, '', /,/g, '.'], parseFloat) || 0;
	}
	var val = (hour*3600) + (min * 60) + sec;
	AnyBalance.trace('Parsed seconds (' + val + ') from: ' + _text);
	return val;
}

/** Заменяет HTML сущности в строке на соответствующие им символы */
function html_entity_decode(string) {
	var entities = get_html_translation_table();
	var replaced = string.replace(/&(#(x)?)?(\w+);/ig, function(str, sharp, x, m) {
		if (!sharp) {
			var ml = m.toLowerCase(m);
			if (entities.hasOwnProperty(ml))
				return String.fromCharCode(entities[ml]);
		} else if (!x) {
			if (/^\d+$/.test(m))
				return String.fromCharCode(parseInt(m));
		} else {
			if (/^[0-9a-f]+$/i.test(m))
				return String.fromCharCode(parseInt(m, 16));
		}
		return str;
	});
	return replaced;
}

function get_html_translation_table() {
	var entities = {
		amp		: 38,
		nbsp	: 160,
		iexcl	: 161,
		cent	: 162,
		pound	: 163,
		curren	: 164,
		yen		: 165,
		brvbar	: 166,
		sect	: 167,
		uml		: 168,
		copy	: 169,
		ordf	: 170,
		laquo	: 171,
		not		: 172,
		shy		: 173,
		reg		: 174,
		macr	: 175,
		deg		: 176,
		plusmn	: 177,
		sup2	: 178,
		sup3	: 179,
		acute	: 180,
		micro	: 181,
		para	: 182,
		middot	: 183,
		cedil	: 184,
		sup1	: 185,
		ordm	: 186,
		raquo	: 187,
		frac14	: 188,
		frac12	: 189,
		frac34	: 190,
		iquest	: 191,
		agrave	: 192,
		aacute	: 193,
		acirc	: 194,
		atilde	: 195,
		auml	: 196,
		aring	: 197,
		aelig	: 198,
		ccedil	: 199,
		egrave	: 200,
		eacute	: 201,
		ecirc	: 202,
		euml	: 203,
		igrave	: 204,
		iacute	: 205,
		icirc	: 206,
		iuml	: 207,
		eth		: 208,
		ntilde	: 209,
		ograve	: 210,
		oacute	: 211,
		ocirc	: 212,
		otilde	: 213,
		ouml	: 214,
		times	: 215,
		oslash	: 216,
		ugrave	: 217,
		uacute	: 218,
		ucirc	: 219,
		uuml	: 220,
		yacute	: 221,
		thorn	: 222,
		szlig	: 223,
		agrave	: 224,
		aacute	: 225,
		acirc	: 226,
		atilde	: 227,
		auml	: 228,
		aring	: 229,
		aelig	: 230,
		ccedil	: 231,
		egrave	: 232,
		eacute	: 233,
		ecirc	: 234,
		euml	: 235,
		igrave	: 236,
		iacute	: 237,
		icirc	: 238,
		iuml	: 239,
		eth		: 240,
		ntilde	: 241,
		ograve	: 242,
		oacute	: 243,
		ocirc	: 244,
		otilde	: 245,
		ouml	: 246,
		divide	: 247,
		oslash	: 248,
		ugrave	: 249,
		uacute	: 250,
		ucirc	: 251,
		uuml	: 252,
		yacute	: 253,
		thorn	: 254,
		yuml	: 255,
		quot	: 34,
		lt		: 60,
		gt		: 62
	};

	return entities;
}
/**
 * Получает объект с параметрами форм (ищет в html все <input и <select и возвращает объект с их именами-значениями.
 * 
 * process - функция function(params, str, name, value). Возвращаемое значение будет положено в объект params под именем name. Если возвратит undefined, то ничего не будет сделано.
 * params - объект, который вернется из createFormParams
 * str - весь <input или <select
 * name - атрибут name <input или <select
 * value - атрибут value <input или <select
 * 
 * Типичное использование:
 *
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'password')
			return prefs.password;

		return value;
	});
*/
function createFormParams(html, process, array){
    var params = array ? [] : {};
    html.replace(/<input[^>]+name=['"]([^'"]*)['"][^>]*>|<select[^>]+name=['"]([^'"]*)['"][^>]*>[\s\S]*?<\/select>/ig, function(str, nameInp, nameSel){
        var value = '';
        if(nameInp){
            if(/type=['"]button['"]/i.test(str))
                value=undefined;
            else
                value = getParam(str, null, null, /value=['"]([^'"]*)['"]/i, null, html_entity_decode) || '';
            name = nameInp;
			
        }else if(nameSel){
            value = getParam(str, null, null, /^<[^>]*value=['"]([^'"]*)['"]/i, null, html_entity_decode);
            if(typeof(value) == 'undefined'){
                var optSel = getParam(str, null, null, /(<option[^>]+selected[^>]*>)/i);
                if(!optSel)
                    optSel = getParam(str, null, null, /(<option[^>]*>)/i);
				if(optSel)
				    value = getParam(optSel, null, null, /value=['"]([^'"]*)["']/i, null, html_entity_decode);
            }
            name = nameSel;
        }

        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        if(typeof(value) != 'undefined')
            if(array) params.push([name, value])
            else params[name] = value;
    });

    //AnyBalance.trace('Form params are: ' + JSON.stringify(params));
    return params;
}

/** Получает дату из строки 23.02.13*/
function parseDate(str) {
	var matches = /(?:(\d+)[^\d])?(\d+)[^\d](\d{2,4})(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(str);
	if (matches) {
		var year = +matches[3];
		var date = new Date(year < 1000 ? 2000 + year : year, matches[2] - 1, +(matches[1] || 1), matches[4] || 0, matches[5] || 0, matches[6] || 0);
		var time = date.getTime();
		AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
		return time;
	}
	AnyBalance.trace('Failed to parse date from value: ' + str);
}

/** Парсит дату из такого вида: 27 июля 2013 без использования сторонних библиотек, результат в мс */
function parseDateWord(str){
	AnyBalance.trace('Trying to parse date from ' + str);
	return getParam(str, null, null, null, [replaceTagsAndSpaces, 
		/\D*(?:январ(?:я|ь)|янв|january|jan)\D*/i, '.01.', 
		/\D*(?:феврал(?:я|ь)|фев|febrary|feb)\D*/i, '.02.', 
		/\D*(?:марта|март|мар|march|mar)\D*/i, '.03.', 
		/\D*(?:апрел(?:я|ь)|апр|april|apr)\D*/i, '.04.', 
		/\D*(?:ма(?:я|й)|may)\D*/i, '.05.', 
		/\D*(?:июн(?:я|ь)|июн|june|jun)\D*/i, '.06.', 
		/\D*(?:июл(?:я|ь)|июл|july|jul)\D*/i, '.07.', 
		/\D*(?:августа|август|авг|august|aug)\D*/i, '.08.', 
		/\D*(?:сентябр(?:я|ь)|сен|september|sep)\D*/i, '.09.', 
		/\D*(?:октябр(?:я|ь)|окт|october|oct)\D*/i, '.10.', 
		/\D*(?:ноябр(?:я|ь)|ноя|november|nov)\D*/i, '.11.', 
		/\D*(?:декабр(?:я|ь)|dec|december|dec)\D*/i, '.12.', /\s/g, ''], parseDate);
}

/** Объединяет два объекта. Свойства с общими именами берутся из newObject */
function joinObjects(newObject, oldObject) {
	var obj = {};
	for (var i in oldObject) {
		obj[i] = oldObject[i];
	}
	if (newObject) {
		for (i in newObject) {
			obj[i] = newObject[i];
		}
	}
	return obj;
}

function joinArrays(arr1, arr2) {
	var narr = arr1.slice();
	narr.push.apply(narr, arr2);
	return narr;
}

/** Добавляет хедеры к переданным или к g_headers */
function addHeaders(newHeaders, oldHeaders) {
	oldHeaders = oldHeaders || g_headers;
	var bOldArray = isArray(oldHeaders);
	var bNewArray = isArray(newHeaders);
	if (!bOldArray && !bNewArray) 
		return joinObjects(newHeaders, oldHeaders);
	if (bOldArray && bNewArray) //Если это массивы, то просто делаем им join
		return joinArrays(oldHeaders, newHeaders);
	if (!bOldArray && bNewArray) { //Если старый объект, а новый массив
		var headers = joinObjects(null, oldHeaders);
		for (var i = 0; i < newHeaders.length; ++i)
			headers[newHeaders[i][0]] = newHeaders[i][1];
		
		return headers;
	}
	if (bOldArray && !bNewArray) { //Если старый массив, а новый объект, то это специальный объект {index: [name, value], ...}!
		var headers = oldHeaders.slice();
		for (i in newHeaders)
	           headers.push([i, newHeaders[i]]);		
		return headers;
	}
}

/** Получает JSON из переданного текста, кидает ошибку, если не парсится */
function getJson(html) {
	try {
		var json = JSON.parse(html);
		return json;
	} catch (e) {
		AnyBalance.trace('Bad json (' + e.message + '): ' + html);
		throw new AnyBalance.Error('Сервер вернул ошибочные данные: ' + e.message);
	}
}

/** Получает JSON из переданного текста, выполняя его (требуется для невалидного JSON) */
function getJsonEval(html){
   try{
       //Запрещаем использование следующих переменных из функции:
       var json = new Function('window', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', 'document', 'self', 'return ' + html).apply(null);
       return json;
   }catch(e){
       AnyBalance.trace('Bad json (' + e.message + '): ' + html);
       throw new AnyBalance.Error('Сервер вернул ошибочные данные: ' + e.message);
   }
}

/** Проверяет, не оканчивается ли строка на заданную */
function endsWith(str, suffix) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function(Date, undefined) {
	var origParse = Date.parse, numericKeys = [1, 4, 5, 6, 7, 10, 11];
	Date.parse = function(date) {
		var timestamp, struct, minutesOffset = 0;
		// ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
		// before falling back to any implementation-specific date parsing, so that’s what we do, even if native
		// implementations could be faster
		//              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
		if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
			// avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
			for (var i = 0, k;
			(k = numericKeys[i]); ++i) {
				struct[k] = +struct[k] || 0;
			}
			// allow undefined days and months
			struct[2] = (+struct[2] || 1) - 1;
			struct[3] = +struct[3] || 1;

			if (struct[8] !== 'Z' && struct[9] !== undefined) {
				minutesOffset = struct[10] * 60 + struct[11];

				if (struct[9] === '+') {
					minutesOffset = 0 - minutesOffset;
				}
			}

			timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
		} else {
			timestamp = origParse ? origParse(date) : NaN;
		}

		return timestamp;
	};
}(Date));

/** Парсит дату вида 2013-12-26 */
function parseDateISO(str) {
	var dt = Date.parse(str);
	if (!dt) {
		AnyBalance.trace('Could not parse date from ' + str);
		return;
	} else {
		AnyBalance.trace('Parsed ' + new Date(dt) + ' from ' + str);
		return dt;
	}
}

function parseDateJS(str) {
	//Рассчитывает на библиотеку date-ru-RU.js
	var _str = str.replace(/(\d+)\s*г(?:\.|ода?)?,?/i, '$1 '); //Убираем г. после года, чтобы не мешалось
	var dt = Date.parse(_str);
	if (!dt) {
		AnyBalance.trace('Can not parse date from ' + str);
		return;
	}

	dt = new Date(dt);

	AnyBalance.trace('Parsed date ' + dt.toString() + ' from ' + str);
	return dt.getTime();
}

/**
 * Получает значение, подходящее под регулярное выражение regexp, производит 
 * в нем замены replaces, результат передаёт в функцию parser, 
 * а затем записывает результат в счетчик с именем param в result
 * Результат в result помещается только если счетчик выбран пользователем 
 * в настройках аккаунта
 *
 * Очень похоже на getParam, но может получать несколько значений (при наличии 
 * в регулярном выражении флага g). В этом случае применяет к ним функцию aggregate, 
 * а если она не передана, то возвращает массив всех совпадений.
 * 
 * если result и param равны null, то значение просто возвращается.
 * eсли parser == null, то возвращается результат сразу после замен
 * если regexp == null, то значением является переданный html
 * если replaces == null, то замены не делаются
 * do_replace - если true, то найденные значения вырезаются из переданного текста 
 * и новый текст возвращается (только при param != null)
 * 
 * replaces - массив, нечетные индексы - регулярные выражения, четные - строки, 
 * на которые надо заменить куски, подходящие под предыдущее регулярное выражение. Эти массивы могут быть вложенными.
 * см. например replaceTagsAndSpaces
 */
function sumParam(html, result, param, regexp, replaces, parser, do_replace, aggregate) {
	if (typeof(do_replace) == 'function') {
		var aggregate_old = aggregate;
		aggregate = do_replace;
		do_replace = aggregate_old || false;
	}

	function replaceIfNeeded() {
		if (do_replace) 
			return regexp ? html.replace(regexp, '') : '';
	}

	if (!isAvailable(param)) //Даже если счетчик не требуется, всё равно надо вырезать его матчи, чтобы не мешалось другим счетчикам
		return replaceIfNeeded();

	//После того, как проверили нужность счетчиков, кладем результат в первый из переданных счетчиков. Оставляем только первый
	param = isArray(param) ? param[0] : param;

	var values = [], matches;
	if (param && isset(result[param])) 
		values.push(result[param]);

	function replaceAndPush(value) {
		value = replaceAll(value, replaces);
		if (parser)
			value = parser(value);
		if (isset(value))
			values.push(value);
	}

	var regexps = isArray(regexp) ? regexp : [regexp];
	for (var i = 0; i < regexps.length; ++i) { //Пройдемся по массиву регулярных выражений
		regexp = regexps[i];
		if (!regexp) {
			replaceAndPush(html);
		} else {
			regexp.lastIndex = 0; //Удостоверяемся, что начинаем поиск сначала.
			while (matches = regexp.exec(html)) {
				replaceAndPush(isset(matches[1]) ? matches[1] : matches[0]);
				if (!regexp.global)
					break; //Если поиск не глобальный, то выходим из цикла
			}
		}
		if (do_replace) //Убираем все матчи, если это требуется
			html = regexp ? html.replace(regexp, '') : '';
	}

	var total_value;
	if (aggregate) 
		total_value = aggregate(values);
	else if (!param) //Если не требуется записывать в резалт, и функция агрегации отсутствует, то вернем массив
		total_value = values;

	if (param) {
		if (isset(total_value)) {
			result[param] = total_value;
		}
		return html;
	} else {
		return total_value;
	}
}

function aggregate_sum(values) {
	if (values.length == 0)
		return;
	var total_value = 0;
	for (var i = 0; i < values.length; ++i) {
		total_value += values[i];
	}
	return total_value;
}
function aggregate_join(values, delimiter, allow_empty) {
	if (values.length == 0) 
		return;
	if (!isset(delimiter)) 
		delimiter = ', ';
	var ret = values.join(delimiter);
	if (!allow_empty) 
		ret = ret.replace(/^(?:\s*,\s*)+|(?:\s*,\s*){2,}|(?:\s*,\s*)+$/g, '');
	return ret;
}

function create_aggregate_join(delimiter, allow_empty) {
	return function(values) {
		return aggregate_join(values, delimiter, allow_empty);
	}
}

function aggregate_min(values) {
	if (values.length == 0)
		return;
	var total_value;
	for (var i = 0; i < values.length; ++i) {
		if (!isset(total_value) || total_value > values[i]) total_value = values[i];
	}
	return total_value;
}

function aggregate_max(values) {
	if (values.length == 0)
		return;
	var total_value;
	for (var i = 0; i < values.length; ++i) {
		if (!isset(total_value) || total_value < values[i]) total_value = values[i];
	}
	return total_value;
}

/** Вычисляет трафик в мегабайтах из переданной строки. */
function parseTraffic(text, defaultUnits) {
	return parseTrafficEx(text, 1024, 2, defaultUnits);
}

/** Вычисляет трафик в гигабайтах из переданной строки. */
function parseTrafficGb(text, defaultUnits) {
	return parseTrafficEx(text, 1024, 3, defaultUnits);
}

/** Вычисляет трафик в нужных единицах из переданной строки. */
function parseTrafficEx(text, thousand, order, defaultUnits) {
	var _text = html_entity_decode(text.replace(/\s+/g, ''));
	var val = getParam(_text, null, null, /(-?\.?\d[\d\.,]*)/, replaceFloat, parseFloat);
	if (!isset(val) || val === '') {
		AnyBalance.trace("Could not parse traffic value from " + text);
		return;
	}
	var units = getParam(_text, null, null, /([kmgtкмгт][бb]?|[бb](?![\wа-я])|байт|bytes)/i);
	if (!units && !defaultUnits) {
		AnyBalance.trace("Could not parse traffic units from " + text);
		return;
	}
	if (!units) 
		units = defaultUnits;
	switch (units.substr(0, 1).toLowerCase()) {
		case 'b':
		case 'б':
			val = Math.round(val / Math.pow(thousand, order) * 100) / 100;
			break;
		case 'k':
		case 'к':
			val = Math.round(val / Math.pow(thousand, order - 1) * 100) / 100;
			break;
		case 'm':
		case 'м':
			val = Math.round(val / Math.pow(thousand, order - 2) * 100) / 100;
			break;
		case 'g':
		case 'г':
			val = Math.round(val / Math.pow(thousand, order - 3) * 100) / 100;
			break;
		case 't':
		case 'т':
			val = Math.round(val / Math.pow(thousand, order - 4) * 100) / 100;
			break;
		}
		var textval = '' + val;
		if (textval.length > 6)
			val = Math.round(val);
		else if (textval.length > 5)
			val = Math.round(val * 10) / 10;
		var dbg_units = {
			0: 'b',
			1: 'kb',
			2: 'mb',
			3: 'gb',
			4: 'tb'
	};
	AnyBalance.trace('Parsing traffic (' + val + dbg_units[order] + ') from: ' + text);
	return val;
}

/** Создаёт мультипарт запрос */
function requestPostMultipart(url, data, headers) {
	var parts = [];
	var boundary = '------WebKitFormBoundaryrceZMlz5Js39A2A6';
	for (var name in data) {
		parts.push(boundary, 'Content-Disposition: form-data; name="' + name + '"', '', data[name]);
	}
	parts.push(boundary + '--\r\n');
	if (!headers)
		headers = {};
	headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary.substr(2);
	return AnyBalance.requestPost(url, parts.join('\r\n'), headers);
}