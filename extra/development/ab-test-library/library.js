/*! AnyBalance Library (http://any-balance-providers.googlecode.com)
The uncompressed full source code of this library is here: https://code.google.com/p/any-balance-providers/source/browse/trunk/extra/development/ab-test-library/library.js
*/
/**
AnyBalance (http://any-balance-providers.googlecode.com)

Содержит некоторые полезные для извлечения значений с сайтов функции.
Для конкретного провайдера рекомендуется оставлять в этом файле только те функции, которые используются.

library.js v0.18 от 27.10.15

changelog:
27.11.15 createFormParams: доработки для универсальности

27.10.15 sumParam: добавлено сообщение об отключенном счетчике

16.09.15 добавлены n2, joinUrl, fmtDate
 
05.06.15 добавлена правильная обработка чекбоксов в createFormParams;

17.05.15 getElement, getElements - добавлены функции получения HMTL всего элемента, включая вложенные элементы с тем же тегом

24.11.14 parseDateWord - улучшено получение дат из строки '10 декабря';

24.11.14 capitalFirstLetters - новая функция, делает из строки ИВАноВ - Иванов;

07.10.14 safeEval - полностью безопасное исполнение стороннего Javascript (в плане недоступности для него AnyBalance API)

18.08.14 requestPostMultipart - эмулируем браузер, генерируя случайный boundary

14.07.14 getParam - Фикс (Если !isset(html), а не !html то не падаем, а пишем ошибку в trace)

04.06.14 parseBalance - улучшен разбор сложных балансов (,82)

27.05.14 getParam - Если !html то не падаем, а пишем ошибку в trace

26.03.14 getParam - Добавлено логирование, если счетчик выключен

16.01.14 parseMinutes - Улучшена обработка секунд с запятой 2 340,00 сек

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
	if(!isset(html)) {
		AnyBalance.trace('getParam: input ' + (param ? '(' + param + ')' : '') + ' is unset! ' + new Error().stack);
		return;
	}
	if (!isAvailable(param)) {
		AnyBalance.trace(param + ' is disabled!');
		return;
	}
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
				result[__getParName(param)] = value;
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

function __getParName(param){ //Возвращает для параметра имя после последней точки
	var name = isArray(param) ? param[0] : param;
	return name && name.substr(name.lastIndexOf('.')+1); //Оставляем только хвост до точки
}

/** Проверяет счетчик param на доступность, принимает либо один счетчик, либо массив
* __tariff - всегда вернет true */
function isAvailable(param) {
	if (!param)
		return true;
	if (/\b__/.test(param.toString())) //Если какой-то параметр начинается на __, то он обязательный, нужно возвращать true
		return true; //Тариф всегда нужен
	return AnyBalance.isAvailable(param);
}
//Замена пробелов и тэгов
var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /&minus;/ig, '-', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''],
//Замена для чисел
    replaceFloat = [/&minus;/ig, '-', /\s+/g, '', /'/g, '', /,/g, '.', /\.([^.]*)(?=\.)/g, '$1', /^\./, '0.'],
//Замена для Javascript строк
    replaceSlashes = [/\\(.?)/g, function(str, n) {
	switch (n) {
	case '0':
		return '\0';
	case '':
		return '';
	default:
		return n;
	}
}],
//Замена всех html энтитей
    replaceHtmlEntities = [/&(#(x)?)?(\w+);/ig, make_html_entity_replacement];

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
function parseBalance(text, silent) {
	var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(-?[.,]?\d[\d'.,]*)/, replaceFloat, parseFloat);
	if(!silent)
		AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
	return val;
}

function parseBalanceSilent(text){
	return parseBalance(text, true);
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
function parseMinutes(_text, silent) {
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
		hour = getParam(text, null, null, /(-?\d[\d.,]*)\s*(?:час|ч|hour|h)/i, replaceFloat, parseFloat) || 0;
		min = getParam(text, null, null, [/(-?\d[\d.,]*)\s*(?:мин|м|хв|min|m)/i, /^-?[\d.,]+$/i], replaceFloat, parseFloat) || 0;
		sec = getParam(text, null, null, /(-?\d[\d.,]*)\s*(?:сек|c|с|sec|s)/i, replaceFloat, parseFloat) || 0;
	}
	var val = (hour*3600) + (min * 60) + sec;
	if(!silent)
		AnyBalance.trace('Parsed seconds (' + val + ') from: ' + _text);
	return val;
}

function parseMinutesSilent(_text){
	return parseMinutes(_text, true);
}

/** Заменяет HTML сущности в строке на соответствующие им символы */
function html_entity_decode(string) {
	return replaceAll(string, replaceHtmlEntities);
}

function make_html_entity_replacement(str, sharp, x, m){
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

	if (!sharp) {
		var ml = m.toLowerCase(m);
		if (entities.hasOwnProperty(ml))
			return String.fromCharCode(entities[ml]);
	} else if (!x) {
		if (/^\d+$/.test(m))
			return String.fromCharCode(parseInt(m, 10));
	} else {
		if (/^[0-9a-f]+$/i.test(m))
			return String.fromCharCode(parseInt(m, 16));
	}
	return str;
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
    var params = array ? [] : {}, valueRegExp=/value\s*=\s*("[^"]*"|'[^']*'|[\w\-\/\\]+)/i, valueReplace=[/^"([^"]*)"$|^'([^']*)'$/, '$1$2'], name,
		inputRegExp = /<input[^>]+name\s*=\s*("[^"]*"|'[^']*'|[\w\-\/\\]+)[^>]*>|<select[^>]+name\s*=\s*("[^"]*"|'[^']*'|[\w\-\/\\]+)[^>]*>[\s\S]*?<\/select>/ig, nullVal = null;

	while(true) {
		var amatch = inputRegExp.exec(html);
		if (!amatch)
			break;
		var str = amatch[0], nameInp = amatch[1], nameSel = amatch[2], value = '';
        if(nameInp){
            if(/type\s*=\s*['"]?button['"]?/i.test(str))
                value=undefined;
            else if(/type\s*=\s*['"]?checkbox['"]?/i.test(str)){
            	//Чекбокс передаёт значение только если он чекед. Если чекед, а значения нет, то передаёт on
                value = /[^\w\-]checked[^\w\-]/i.test(str) ? getParam(str, nullVal, nullVal, valueRegExp, valueReplace, html_entity_decode) || 'on' : undefined;
            }else
                value = getParam(str, nullVal, nullVal, valueRegExp, valueReplace, html_entity_decode) || '';
            name = replaceAll(nameInp, valueReplace);
			
        }else if(nameSel){
			var sel = getParam(str, nullVal, nullVal, /^<[^>]*>/i);
            value = getParam(sel, nullVal, nullVal, valueRegExp, valueReplace, html_entity_decode);
            if(typeof(value) == 'undefined'){
                var optSel = getParam(str, nullVal, nullVal, /(<option[^>]+selected[^>]*>)/i);
                if(!optSel)
                    optSel = getParam(str, nullVal, nullVal, /(<option[^>]*>)/i);
				if(optSel)
				    value = getParam(optSel, nullVal, nullVal, valueRegExp, valueReplace, html_entity_decode);
            }
            name = replaceAll(nameSel, valueReplace);;
        }

        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        if(typeof(value) != 'undefined') {
			if (array)
				params.push([name, value])
			else
				params[name] = value;
		}
    }

    //AnyBalance.trace('Form params are: ' + JSON.stringify(params));
    return params;
}

/** Получает дату из строки 23.02.13*/
function parseDate(str, silent) {
	var matches = /(?:(\d+)[^\d])?(\d+)[^\d](\d{2,4})(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(str);
	if (matches) {
		var year = +matches[3];
		var date = new Date(year < 1000 ? 2000 + year : year, matches[2] - 1, +(matches[1] || 1), matches[4] || 0, matches[5] || 0, matches[6] || 0);
		var time = date.getTime();
		if(!silent)
			AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
		return time;
	}
	if(!silent)
		AnyBalance.trace('Failed to parse date from value: ' + str);
}

function parseDateSilent(str){
	return parseDate(str, true);
}

/** Парсит дату из такого вида: 27 июля 2013 без использования сторонних библиотек, результат в мс */
function parseDateWord(str){
	AnyBalance.trace('Trying to parse date from ' + str);
	var dateString = replaceAll(str, [replaceTagsAndSpaces, replaceHtmlEntities,
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
		/\D*(?:декабр(?:я|ь)|dec|december|dec)\D*/i, '.12.', /\s/g, '']);
	// Если года нет - его надо подставить
	if(endsWith(dateString,'.')) {
		dateString += new Date().getFullYear();
	}
	return parseDate(dateString);
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
       var json = safeEval('return ' + html, 'window,document,self');
	   return json;
   }catch(e){
       AnyBalance.trace('Bad json (' + e.message + '): ' + html);
       throw new AnyBalance.Error('Сервер вернул ошибочные данные: ' + e.message);
   }
}

/** Выполняет скрипт безопасно, не давая ему доступ к AnyBalance API 
    Пример использования:

    var ret = safeEval("function(input1, input2) { input1.a = 1; input2.b = 3; return 'xxx' }()", "input1,input2", [{a: 5}, {b: 8}]);
    
    а если входные параметры скрипту не нужны, то можно просто

    var ret = safeEval(" return 'xxx' }");
*/

function safeEval(script, argsNamesString, argsArray) {
   var svAB = AnyBalance, svParams = this.g_AnyBalanceApiParams, svApi = this._AnyBalanceApi;
   AnyBalance = this.g_AnyBalanceApiParams = this._AnyBalanceApi = undefined;

   try{
       var result = Function(argsNamesString || 'ja0w4yhwphgawht984h', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', script).apply(null, argsArray);
       return result;
   }catch(e){
       throw new svAB.Error('Bad javascript (' + e.message + '): ' + script);
   }finally{
   		AnyBalance = svAB, g_AnyBalanceApiParams = svParams, _AnyBalanceApi=svApi;
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
		if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:(?:T|\s+)(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3})\d*)?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
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
			Date.lastParse = 'custom';
		} else {
			timestamp = origParse ? origParse(date) : NaN;
			Date.lastParse = 'original';
		}

		return timestamp;
	};
}(Date));

/** Парсит дату вида 2013-12-26 */
function parseDateISO(str) {
	var dt = Date.parse(str);
	if (!dt) {
		AnyBalance.trace('Could not parse (' + Date.lastParse + ') date from ' + str);
		return;
	} else {
		AnyBalance.trace('Parsed (' + Date.lastParse + ') ' + new Date(dt) + ' from ' + str);
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
	if(!isset(html)) {
		AnyBalance.trace('sumParam: input ' + (param ? '(' + param + ')' : '') + ' is unset! ' + new Error().stack);
		return;
	}

	if (typeof(do_replace) == 'function') {
		var aggregate_old = aggregate;
		aggregate = do_replace;
		do_replace = aggregate_old || false;
	}

	function replaceIfNeeded() {
		if (do_replace) 
			return regexp ? html.replace(regexp, '') : '';
	}

	if (!isAvailable(param)) {
		AnyBalance.trace(param + ' is disabled!');
		//Даже если счетчик не требуется, всё равно надо вырезать его матчи, чтобы не мешалось другим счетчикам
		return replaceIfNeeded();
	}
	
	//После того, как проверили нужность счетчиков, кладем результат в первый из переданных счетчиков. Оставляем только первый
	param = __getParName(param);

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
	if (!allow_empty){
		delimiter = delimiter.trim().replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
		ret = ret.replace(new RegExp('^(?:\\s*' + delimiter + '\\s*)+|(?:\\s*' + delimiter + ']\\s*){2,}|(?:\\s*' + delimiter + '\\s*)+$', 'g'), '');
	}
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

/** Создаёт мультипарт запрос полностью прикидываясь браузером */
function requestPostMultipart(url, data, headers) {
	var b = '',  possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	
	for( var i=0; i < 16; i++ ) {
        b += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	
	var parts = [];
	
	var boundary = '------WebKitFormBoundary' + b;
	for (var name in data) {
		parts.push(boundary, 'Content-Disposition: form-data; name="' + name + '"', '', data[name]);
	}
	parts.push(boundary + '--\r\n');
	if (!headers)
		headers = {};
	headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary.substr(2);
	return AnyBalance.requestPost(url, parts.join('\r\n'), headers);
}

/** Приводим все к единому виду вместо ИВаНов пишем Иванов */
function capitalFirstLetters(str) {
	var wordSplit = html_entity_decode(str + '').toLowerCase().split(' ');
	var wordCapital = '';
	for (i = 0; i < wordSplit.length; i++) {
		wordCapital += wordSplit[i].substring(0, 1).toUpperCase() + wordSplit[i].substring(1) + ' ';
	}
	return wordCapital.replace(/^\s+|\s+$/g, '');
}

/** Все включенные счетчики, значение которых не найдено, становится равным null, 
что позволяет сохранить в программе прошлые значения для показа, но индицировать, что баланс неактивен */
function setCountersToNull(result){
	var arr = AnyBalance.getAvailableCounters();
	for(var i=0; i<arr.length; ++i){
		if(arr[i] !== '--auto--' && !isset(result[arr[i]])){
			result[arr[i]] = null;
		}
	}
	if(!isset(result.__tariff))
		result.__tariff = null;
}

/**
    Ищет элемент в указанном html, тэг которого совпадает с указанным регулярным выражением
    Возвращает весь элемент целиком, учитывая вложенные элементы с тем же тегом
    Например, 
    	getElement(html, /<div[^>]+id="somediv"[^>]*>/i)
*/
function getElement(html, re, replaces, parseFunc){
	var amatch = re.exec(html);
	if(!amatch)
		return;
	var startIndex = amatch.index;
	var startTag = html.substr(startIndex, amatch[0].length);
	var elem = getParam(startTag, null, null, /<(\w+)/);
	var endTag = new RegExp('(?:<' + elem + '|<\/' + elem + ')[^>]*>', 'ig');
	endTag.lastIndex = startIndex + amatch[0].length;
	var depth = 0;

	while(true){
		amatch = endTag.exec(html);
		if(!amatch)
			break;
		var matched = amatch[0];
		if(matched.charAt(1) == '/'){
		    if(depth == 0)
		    	break;
		    --depth;
		}else{
			++depth;
		}
		endTag.lastIndex = amatch.index + matched.length;
	}

	var endIndex = html.length;
	if(amatch)
		endIndex = amatch.index + amatch[0].length;

	re.lastIndex = endIndex;

	var str = html.substring(startIndex, endIndex);
	if(replaces)
		str = replaceAll(str, replaces);
	if(parseFunc)
		str = parseFunc(str);
	return str;
}

/**
    Ищет все элементы в указанном html, тэг которых совпадает с указанным регулярным выражением
    Возвращает все элементы целиком, учитывая вложенные элементы с тем же тегом
    ВНИМАНИЕ! Чтобы вернулись все элементы, надо указывать регулярное выражение с флагом g
    Например, 
    	getElements(html, /<div[^>]+id="somediv"[^>]*>/ig)

    //Найти див somediv, содержащий <div class="title"	
    	getElements(html, [/<div[^>]+id="somediv"[^>]*>/ig, /<div[^>]+class="title"/i])
*/
/*array*/ function getElements(html, re, replaces, parseFunc){
	var results = [];
	var regexp = isArray(re) ? re[0] : re;
	var add_re = isArray(re) ? (re.shift(), re) : null;
	do{
		var res = getElement(html, regexp, replaces, parseFunc);
		
		var good_res = res && !add_re;
		if(add_re && res){
		    for(var i=0; i<add_re.length; ++i){
		        good_res = good_res || add_re[i].test(res);
		        if(good_res)
		        	break;
		    }
		}
		if(good_res)
			results.push(res);
		
		if(!regexp.global)
			break; //Экспрешн только на один матч
	}while(isset(res));
	return results;
}

function __shouldProcess(counter, info){
	if(!AnyBalance.shouldProcess)
		return !!info.__id;
	return AnyBalance.shouldProcess(counter, info);
}

function __setLoginSuccessful(){
	if(AnyBalance.setLoginSuccessful)
		AnyBalance.setLoginSuccessful();
}

function n2(n){
	return n < 10 ? '0' + n : '' + n;
}

function fmtDate(dt, delimiter){
	if(!isset(delimiter))
		delimiter = '.';
	return n2(dt.getDate()) + delimiter + n2(dt.getMonth()+1) + delimiter + dt.getFullYear();
}

function joinUrl(url, path){
	if(!path) //Пустой путь
		return url;
	if(/^\//.test(path)) //Абсолютный путь
		return url.replace(/^(\w+:\/\/[\w.\-]+).*$/, '$1' + path);
	if(/^\w+:\/\//.test(path)) //Абсолютный урл
		return path;
	//относительный путь
	url = url.replace(/\?.*$/, ''); //Обрезаем аргументы
	if(/:\/\/.*\//.test(url))
		url = url.replace(/\/[^\/]*$/, '/'); //Сокращаем до папки
	if(!endsWith(url, '/'))
		url += '/';
	return url + path;
}

/** Пример использования
	var colsDef = {
		type: {
			re: /Тип/i,
			result_func: function(str){
				if(/мобил/i.test(str))
					return 'mobile';
				if(/эл/i.test(str))
					return 'email';
				if(/домаш/i.test(str))
					return 'home';
				if(/рабоч/i.test(str))
					return 'work';
				return str;
			}
		},
		sum_out: {
            re: /Сумма зачисления/i,
            result_name: 'sum_done',
            result_sum: true,
            result_replace: replaceSign,
        },
		loan: {
            re: /Ссуда/i,
            result_process: function(path, td, result){
                var info = this; //Остальные параметры
                td = replaceAll(td, replaceTagsAndSpaces);
                getParam(td, result, path + 'debt_main', /([^\/]*)/i, null, parseBalance);
                getParam(td, result, path + 'debt_pct', /[^\/]*\/([^\/]*)/i, null, parseBalance);
                getParam(td, result, path + 'debt_fee', /(?:[^\/]*\/){2}([^\/]*)/i, null, parseBalance);
            }
        },
		contact: {
			re: /Контакт/i,
			result_func: html_entity_decode
		}
	};
	var table = getElement(html, /<table[^>]+class="card-table"[^>]*>/i);
	if(table){
		info.contacts = [];
		processTable(table, info.contacts, 'info.contacts.', colsDef);
	}
*/
function processTable(table, result, path, colsDef, onWrongSize, onFilledResult){
    var trs = getElements(table, /<tr[^>]*>/ig);
    var cols, size;
    for (var i = 0; i < trs.length; i++) {
        var tr = trs[i];
        var tds = getElements(tr, /<td[^>]*>/ig);
        if(tds.length == 0) {
            //Заголовок
            var ths = getElements(tr, /<th[^>]*>/ig);
            size = ths.length;
            cols = initCols(colsDef, ths);
        }else if(tds.length == size){
            var t = {};

            fillColsResult(colsDef, cols, tds, t, path);
            if(onFilledResult)
                onFilledResult(t, path);

            result.push(t);
        }else if(onWrongSize){
            onWrongSize(tr, tds);
        }
    }
}


function initCols(colsDef, ths){
    var cols = {};
    for (var i = 0; i < ths.length; i++) {
        var th = ths[i];
        for(var name in colsDef){
            if(colsDef[name].re.test(th))
                cols[name] = i;
        }
    }
    return cols;
}

function fillColsResult(colsDef, cols, tds, result, path){
    function getset(val, def){
        return isset(val) ? val : def;
    }
    path = path || '';

    var rts = replaceTagsAndSpaces,
        pb = parseBalance,
        as = aggregate_sum;

    for(var name in colsDef){
        var cd = colsDef[name];
        if(isset(cols[name])){
            var td = tds[cols[name]];
            var rn = getset(cd.result_name, name);
            if(isArray(rn)){
                var rn1 = [];
                for (var i = 0; i < rn.length; i++) {
                    rn1.push(path + rn[i]);
                }
                rn = rn1;
            }else{
                rn = path + rn;
            }

            if(cd.result_process) {
                cd.result_process(path, td, result);
            }else if(cd.result_sum){
                cd.result_re && (cd.result_re.lastIndex = 0);
                sumParam(td, result, rn, cd.result_re, getset(cd.result_replace, rts), getset(cd.result_func, pb), getset(cd.result_aggregate, as));
            }else {
                getParam(td, result, rn, cd.result_re, getset(cd.result_replace, rts), getset(cd.result_func, pb));
            }
        }
    }
}


/*
Для того, чтобы было удобно писать регулярные выражения, см. пример в ab-statistic-finnopolis/main.js
*/
String.prototype.regExpExtra = function() {
	return this.replace(/[\x00-\x20]*/g, '').replace(/\./g, '[\\s\\S]');
}
