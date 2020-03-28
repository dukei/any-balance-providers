/**
 AnyBalance (https://github.com/dukei/any-balance-providers/)
 
 Содержит некоторые полезные для извлечения значений с сайтов функции.
 
 Changelog:
 
 01.05.2016 Убрана привязка к началу/концу строки и parseDateISO

 29.03.2016 Добавлен метод getJsonObjSafe(where, what)
 
 27.02.2016 В методах getElement/getElements добавлена возможность указать группу в регексе

 19.01.2016 Добавлен метод getElementById(), см. KRPROV-8

 12.01.16 Исправлена ошибка с зависанием getJsonObject(), см. KRPROV-5
 12.01.16 Исправлена ошибка с некорректным вырезанием HTML тегов, см. KRPROV-6

 11.12.15 добавлена функция getFormattedDate, на нее переключена fmtDate для сохранения совместимости
 getFormattedDate на входе получает json: options = {
 format: 'DD/MM/YYYY', // DD=09, D=9, MM=08, М=8, YYYY=2015, YY=15
 offsetDay: 0, // Смещение по дням
 offsetMonth: 0, // Смещение по месяцам
 offsetYear: 5, // Смещение по годам
 }
 и вторым параметром Date (необязательно)
 
 10.12.15 Добавлена getJsonObject
 
 06.12.15 Полностью переработаны html_entity_decode и replaceTagsAndSpaces, добавлен XRegExp (http://xregexp.com/)
 ВНИМАНИЕ!!! replaceTagsAndSpaces теперь уже включает html_entity_decode, поэтому при использовании replaceTagsAndSpaces уже не надо пользовать html_entity_decode
 Если значение берется из атрибута, и теги удалять не надо, то заменить сущности можно массивом replaceHtmlEntities
 
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

 **
 * @namespace AB
 */
var AB = (function (global_scope) {
	"use strict";

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
    	if (result instanceof RegExp || isArray(result)){
    		//Пропустили два параметра (result и param), остальные надо сдвинуть
    		parser = regexp;
    		replaces = param;
    		regexp = result;
    		result = param = null;
    	}
    		
        if (!isset(html)) {
            AnyBalance.trace('getParam: input ' + (param ? '(' + param + ')' : '') + ' is unset! ' + new Error().stack);
            return;
        }
        if(html === null && regexp){
            AnyBalance.trace('getParam: input ' + (param ? '(' + param + ')' : '') + ' is null! ' + new Error().stack);
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

    function __getParName(param) { //Возвращает для параметра имя после последней точки
        var name = isArray(param) ? param[0] : param;
        return name && name.substr(name.lastIndexOf('.') + 1); //Оставляем только хвост до точки
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
    var replaceTagsAndSpaces = [String.REPLACE_TAGS_AND_SPACES, /[\uFEFF\xA0]/ig, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''],
//Замена для чисел (&minus, &mdash, &ndash)
		replaceSpaces = [/[\s�]+/g, ''],
        replaceFloat = [/[\u2212\u2013\u2014–]/ig, '-', replaceSpaces, /'/g, '', /,/g, '.', /\.([^.]*)(?=\.)/g, '$1', /^\./, '0.'],
//Замена для Javascript строк
        replaceSlashes = [/\\(.?)/g, function (str, n) {
            switch (n) {
                case '0':
                    return '\0';
                case '':
                    return '';
                default:
                    return n;
            }
        }],
        replaceHtmlEntities = String.REPLACE_HTML_ENTITIES;

    /** Проверяет, определено ли значение переменной */
    function isset(v) {
        return typeof(v) != 'undefined';
    }

    /** Проверяет, является ли объект массивом */
    function isArray(arr) {
        return Array.isArray(arr);
    }

    function isObject(obj){
    	return Object.prototype.toString.call(obj) === "[object Object]";
    }

    /** Делает все замены в строке value. При этом, если элемент replaces массив, то делает замены по нему рекурсивно. */
    function replaceAll(value, replaces) {
        if (!replaces) return value;
        if (typeof value != 'string')
            value += '';
        return value.replaceAll(replaces);
    }

    /** Извлекает числовое значение из переданного текста */
    function parseBalance(text, silent) {
        var val = getParam(replaceAll(text, replaceSpaces), /([\u2212\u2013\u2014–\-]?[.,]?\d[\d'.,]*)/, replaceFloat, parseFloat);
        if (!silent)
            AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
        return val;
    }

    function parseBalanceSilent(text) {
        return parseBalance(text, true);
    }

    /** Извлекает валюту из переданного текста (типичная реализация) */
    function parseCurrency(text, silent) {
        var val = getParam(replaceAll(text, replaceSpaces), /-?\d[\d.,]*(\S*)/);
        if(!silent)
            AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
        return val;
    }

    /** Извлекает валюту из переданного текста (типичная реализация) */
    function parseCurrencySilent(text){
        return parseCurrency(text, true);
    }

    /** Извлекает время в секундах из переданного текста, на разных языках, из разных форматов (1:30, 01:02:03, 1 м 3 сек, 3 сек, 1 час...)
     Если на входе будет просто число - вернет минуты.
     Если на входе будет 02:03 будет принят формат ММ:СС*/
    function parseMinutes(_text, silent) {
        var text = replaceAll(_text, replaceSpaces);
        var hour = 0, min = 0, sec = 0;
        // Это формат ЧЧ:ММ:СС
        if (/^\d+:\d+:\d+$/i.test(text)) {
            var regExp = /^(\d+):(\d+):(\d+)$/i.exec(text);
            hour = +regExp[1];
            min = +regExp[2];
            sec = +regExp[3];
            // Это формат ММ:СС
        } else if (/^\d+:\d+/i.test(text)) {
            var regExp = /^(\d+):(\d+)/i.exec(text);
            hour = 0;
            min = +regExp[1];
            sec = +regExp[2];
            // Это любой другой формат, со словами либо просто число
        } else {
            hour = getParam(text, /(-?\d[\d.,]*)(?:час|ч|год|г|hour|h)/i, replaceFloat, parseFloat) || 0;
            min = getParam(text, [/(-?\d[\d.,]*)(?:мин|м|хв|min|m)/i, /^-?[\d.,]+$/i], replaceFloat, parseFloat) || 0;
            sec = getParam(text, /(-?\d[\d.,]*)(?:сек|c|с|sec|s)/i, replaceFloat, parseFloat) || 0;
        }
        var val = (hour * 3600) + (min * 60) + sec;
        if (!silent)
            AnyBalance.trace('Parsed seconds (' + val + ') from: ' + _text);
        return val;
    }

    function parseMinutesSilent(_text) {
        return parseMinutes(_text, true);
    }

    /** Заменяет HTML сущности в строке на соответствующие им символы */
    function html_entity_decode(string) {
        return string.htmlEntityDecode();
    }

    /**
     * @name callbackCreateFormParams
     * @function
     * @param {Array|Object} params Создаваемые параметры
     * @param {String} str HTML представление инпута или селекта
     * @param {String} name Имя инпута или селекта (атрибут name)
     * @param {String} value Текущее значение инпута или селекта (атрибут value)
     * @returns {String} новое значение
     */

    /**
     * Получает объект с параметрами форм (ищет в html все input и select и возвращает объект с их именами-значениями.
     *
     * @param {String} html - текст, в котором надо искать элементы формы
     * @param {callbackCreateFormParams} [process] функция для обработки. Возвращаемое значение будет положено в объект params под именем name. Если возвратит undefined, то ничего не будет сделано.
     * @param {Boolean} [array=false] если true, то вернуть массив, а не объект
     * @returns {Array|Object} сформированные параметры
     *
     *
     * Типичное использование:
     *  <pre>
     *  var params = createFormParams(html, function(params, str, name, value) {
     *		if (name == 'login')
     *			return prefs.login;
     *		else if (name == 'password')
     *			return prefs.password;
     *
     *		return value;
     *	});
     *	</pre>
     */
    function createFormParams(html, process, array) {
        var params = array ? [] : {}, 
        	valueRegExp = /value\s*=\s*("[^"]*"|'[^']*'|[\w\-\/\\]+)/i, 
        	valueReplace = [/^"([^"]*)"$|^'([^']*)'$/, '$1$2', replaceHtmlEntities], 
        	name,
            inputRegExp = /<button(?:[^>"']+|"[^"]*"|'[^']*')*>[\s\S]*?<\/button>|<input(?:[^>"']+|"[^"]*"|'[^']*')*>|<select(?:[^>"']+|"[^"]*"|'[^']*')*>[\s\S]*?<\/select>/ig;

        while (true) {
            var amatch = inputRegExp.exec(html);
            if (!amatch)
                break;
            var str = amatch[0], value = '';
            name = getParam(str, /^<[^>]+?[\s'"]name\s*=\s*("[^"]*"|'[^']*'|[\w\-\/\\]+)/i, valueReplace);

            if (name) { //В форму попадают только поля с именем
                if (/^<input/i.test(str)) {  //<input type="...">
                    if (/[\s'"]type\s*=\s*['"]?button['"]?/i.test(str))
                        value = undefined;
                    else if (/[\s'"]type\s*=\s*['"]?checkbox['"]?/i.test(str)) {
                        //Чекбокс передаёт значение только если он чекед. Если чекед, а значения нет, то передаёт on
                        value = /[^\w\-]checked[^\w\-]/i.test(str) ? getParam(str, valueRegExp, valueReplace) || 'on' : undefined;
                    } else
                        value = getParam(str, valueRegExp, valueReplace) || '';
                } else if (/^<button/i.test(str)) { //<button type="submit" ...>
                    if (!/[\s'"]type\s*=\s*['"]?submit['"]?/i.test(str)){
                        value = undefined;
                    } else
                        value = getParam(str, valueRegExp, valueReplace) || '';
                } else if (/^<select/i.test(str)) { //<select>...</select>
                    var sel = getParam(str, /^<[^>]*>/i);
                    value = getParam(sel, valueRegExp, valueReplace);
                    if (!isset(value)) {
                        var optSel = getParam(str, /(<option[^>]*[\s'"]selected[^>]*>[\s\S]*?<\/option>)/i);
                        if (!optSel)
                            optSel = getParam(str, /(<option[^>]*>[\s\S]*?<\/option>)/i);
                        if (optSel){
                            value = getParam(optSel, valueRegExp, valueReplace);
                        	if(!isset(value))
                        		value = replaceAll(optSel, replaceTagsAndSpaces);
                        }
                    }
                }

                if (process) {
                    value = process(params, str, name, value);
                }
                if (typeof(value) != 'undefined') {
                    if (array)
                        params.push([name, value])
                    else
                        params[name] = value;
                }
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
            if (!silent)
                AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
            return time;
        }
        if (!silent)
            AnyBalance.trace('Failed to parse date from value: ' + str);
    }

    function parseDateSilent(str) {
        return parseDate(str, true);
    }

    /** Парсит дату из такого вида: 27 июля 2013 без использования сторонних библиотек, результат в мс */
    function parseDateWord(str, silent) {
        if(!silent)
            AnyBalance.trace('Trying to parse date from ' + str);
        var dateString = replaceAll(str, [replaceTagsAndSpaces,
            /\D*(?:январ(?:я|ь)|янв|january|jan|Січ(?:ень)?)\D*/i, '.01.',
            /\D*(?:феврал(?:я|ь)|фев|febrary|feb|Лют(?:ий)?)\D*/i, '.02.',
            /\D*(?:марта|март|мар|march|mar|Бер(?:езень)?)\D*/i, '.03.',
            /\D*(?:апрел(?:я|ь)|апр|april|apr|Кві(?:тень)?)\D*/i, '.04.',
            /\D*(?:ма(?:я|й)|may|Тра(?:вень)?)\D*/i, '.05.',
            /\D*(?:июн(?:я|ь)|июн|june|jun|Чер(?:вень)?)\D*/i, '.06.',
            /\D*(?:июл(?:я|ь)|июл|july|jul|Лип(?:ень)?)\D*/i, '.07.',
            /\D*(?:августа|август|авг|august|aug|Сер(?:пень)?)\D*/i, '.08.',
            /\D*(?:сентябр(?:я|ь)|сен|september|sep|Вер(?:есень)?)\D*/i, '.09.',
            /\D*(?:октябр(?:я|ь)|окт|october|oct|Жов(?:тень)?)\D*/i, '.10.',
            /\D*(?:ноябр(?:я|ь)|ноя|november|nov|Лис(?:топад)?)\D*/i, '.11.',
            /\D*(?:декабр(?:я|ь)|dec|december|dec|Гру(?:день)?)\D*/i, '.12.', /\s+/g, '']);
        // Если года нет - его надо подставить
        if (endsWith(dateString, '.')) {
            dateString += new Date().getFullYear();
        }
        return parseDate(dateString, silent);
    }

    function parseDateWordSilent(str) {
        return parseDateWord(str, true);
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
    function getJsonEval(html) {
        try {
            //Запрещаем использование следующих переменных из функции:
            var json = safeEval('return ' + html, 'window,document,self');
            return json;
        } catch (e) {
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
        var svAB = AnyBalance, svParams = global_scope.g_AnyBalanceApiParams, svApi = global_scope._AnyBalanceApi;
        global_scope.AnyBalance = global_scope.g_AnyBalanceApiParams = global_scope._AnyBalanceApi = undefined;

        try {
            var result = Function(argsNamesString || 'ja0w4yhwphgawht984h', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', script).apply(null, argsArray);
            return result;
        } catch (e) {
        	svAB.trace(e.message + '\n' + e.stack);
            throw new svAB.Error('Bad javascript (' + e.message + '): ' + script);
        } finally {
            AnyBalance = svAB, global_scope.g_AnyBalanceApiParams = svParams, global_scope._AnyBalanceApi = svApi;
        }
    }

    /** Проверяет, не оканчивается ли строка на заданную */
    function endsWith(str, suffix) {
        return str ? str.indexOf(suffix, str.length - suffix.length) !== -1 : false;
    }

    /**
     * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
     * © 2011 Colin Snover <http://zetafleet.com>
     * Released under MIT license.
     */
    (function (Date, undefined) {
        var origParse = Date.parse, numericKeys = [1, 4, 5, 6, 7, 10, 11];
        Date.parse = function (date) {
            var timestamp, struct, minutesOffset = 0;
            // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
            // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
            // implementations could be faster
            //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
            if ((struct = /(\d{4}|[+\-\.\/]\d{6})(?:[\.\-\/](\d{2})(?:[\.\-\/](\d{2}))?)?(?:(?:T|\s+)(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3})\d*)?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?)?)?/.exec(date))) {
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
    function parseDateISO(str, silent) {
        var dt = Date.parse(str);
        if (!dt) {
        	if(!silent)
            	AnyBalance.trace('Could not parse (' + Date.lastParse + ') date from ' + str);
            return;
        } else {
        	if(!silent)
            	AnyBalance.trace('Parsed (' + Date.lastParse + ') ' + new Date(dt) + ' from ' + str);
            return dt;
        }
    }

    function parseDateISOSilent(str) {
    	return parseDateISO(str, true);
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
    	if (result instanceof RegExp || isArray(result)){
    		//Пропустили два параметра (result и param), остальные надо сдвинуть
    		aggregate = parser;
    		do_replace = replaces;
    		parser = regexp;
    		replaces = param;
    		regexp = result;
    		result = param = null;
    	}

        if (!isset(html)) {
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
                return html = regexp ? replaceAll(html, [regexp, '']) : '';
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

            replaceIfNeeded(); //Убираем все матчи, если это требуется
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
        if (!allow_empty) {
            delimiter = regexEscape(delimiter);
            ret = ret.replace(new RegExp('^(?:\\s*' + delimiter + '\\s*)+|(?:\\s*' + delimiter + ']\\s*){2,}|(?:\\s*' + delimiter + '\\s*)+$', 'g'), '');
        }
        return ret;
    }

    function create_aggregate_join(delimiter, allow_empty) {
        return function (values) {
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
        var _text = replaceAll(text, replaceSpaces);
        var val = getParam(_text, /(-?\.?\d[\d\.,]*)/, replaceFloat, parseFloat);
        if (!isset(val) || val === '') {
            AnyBalance.trace("Could not parse traffic value from " + text);
            return;
        }
        var units = getParam(_text, /([kmgtкмгт][бb]?|[бb](?![\wа-я])|байт|bytes)/i);
        if (!units && !defaultUnits) {
            AnyBalance.trace("Could not parse traffic units from " + text);
            return;
        }
        if (!units)
            units = defaultUnits;

        function scaleTraffic(odr){
        	val = Math.round(val / Math.pow(thousand, order - (odr || 0)) * 100) / 100;
        }

        switch (units.substr(0, 1).toLowerCase()) {
            case 'b':
            case 'б':
                scaleTraffic();
                break;
            case 'k':
            case 'к':
                scaleTraffic(1);
                break;
            case 'm':
            case 'м':
                scaleTraffic(2);
                break;
            case 'g':
            case 'г':
                scaleTraffic(3);
                break;
            case 't':
            case 'т':
                scaleTraffic(4);
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

    /** Создаёт мультипарт запрос полностью прикидываясь браузером
    *   data может быть объектом {key: value} или массивом [ [key, value], ...]
    *	value может быть строкой или объектом {attributes: {name: 'name', ...}, subheaders: {headername: 'header-name', ...}, value: 'datavalue'}
    * 	attributes и subheaders могут быть не объектами, а массивами [ ['name', 'value'], ...], чтобы гарантировать порядок полей
    */
    function requestPostMultipart(url, data, headers, requestPost) {
        let b = '', possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for (let i = 0; i < 16; i++) {
            b += possible.charAt(Math.floor(Math.random() * possible.length));
        }

        const boundary = '------WebKitFormBoundary' + b;
        let parts = processKeyValues(data, (key, value) => {
        	//Формирование значения одного key => value
        	let parts = [];
        	let attributes = {name: key}, subheaders, datavalue = value;
        	if(isObject(value)){
        		attributes = value.attributes;
        		subheaders = value.subheaders;
        		datavalue = value.value;
        	}
        	attributes = processKeyValues(attributes, (key, value) => key + '="' + value + '"');
        	parts.push(boundary, 'Content-Disposition: form-data; ' + attributes.join('; '));
        	if(subheaders){
        		subheaders = processKeyValues(subheaders, (key, value) => key + ': ' + value);
        		parts.push.apply(parts, subheaders);
        	}
           	parts.push('', datavalue);
           	return parts.join('\r\n');
        });

        parts.push(boundary + '--\r\n');
        if (!headers)
            headers = {};
        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary.substr(2);
        return (requestPost || AnyBalance.requestPost)(url, parts.join('\r\n'), headers);
    }

    /** Приводим все к единому виду вместо ИВаНов пишем Иванов */
    function capitalFirstLetters(str) {
        var wordSplit = str.toLowerCase().split(' ');
        for (var i = 0; i < wordSplit.length; i++) {
            wordSplit[i] = wordSplit[i].substr(0, 1).toUpperCase() + wordSplit[i].substr(1);
        }
        return wordSplit.join(' ');
    }

    /** Все включенные счетчики, значение которых не найдено, становится равным null,
     что позволяет сохранить в программе прошлые значения для показа, но индицировать, что баланс неактивен */
    function setCountersToNull(result) {
        var arr = AnyBalance.getAvailableCounters();
        for (var i = 0; i < arr.length; ++i) {
            if (arr[i] !== '--auto--' && !isset(result[arr[i]])) {
                result[arr[i]] = null;
            }
        }
        if (!isset(result.__tariff))
            result.__tariff = null;
    }

    function regexEscape(str){
    	return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

	/**
	 * Реализация браузерного метода document.getElementById() без использования DOM
	 * 
	 * @param {string} type
	 * @param {string} html
	 * @param {string} id
	 * @param {array} replaces
	 * @param {function} parseFunc
	 * @returns {undefined|string}
	 */
	function _getElementBy(type, html, id, replaces, parseFunc) {
	/*
		var searchRe = XRegExp(`
			<[a-zA-Z]
			(?=(#1
					(?:
							(?:	(?!\\b {attr} \\b)
								[^>"']
							)+
						|	" [^"]* "
						|	' [^']* '
					)*
			))\\1
			(?=(#2
				[-a-zA-Z]+
				\\s* = \\s*
				(#3
						[^>"'\\s]+
					|	" [^"]* "
					|	' [^']* '
				)
			))\\2
			(?:
					(?=(#4
						[^>"']+
					))\\4
				|	" [^"]* "
				|	' [^']* '
			)*
			>`.replace('{attr}', type === 'id' ? '[iI][dD]' : '[cC][lL][aA][sS][sS]'), 'xsg');
	*/
		var searchRe = type === 'id' ? 
			/<[a-zA-Z](?=((?:(?:(?!\b[iI][dD]\b)[^>"'])+|"[^"]*"|'[^']*')*))\1(?=([-a-zA-Z]+\s*=\s*([^>"'\s]+|"[^"]*"|'[^']*')))\2(?:(?=([^>"']+))\4|"[^"]*"|'[^']*')*>/g :
			/<[a-zA-Z](?=((?:(?:(?!\b[cC][lL][aA][sS][sS]\b)[^>"'])+|"[^"]*"|'[^']*')*))\1(?=([-a-zA-Z]+\s*=\s*([^>"'\s]+|"[^"]*"|'[^']*')))\2(?:(?=([^>"']+))\4|"[^"]*"|'[^']*')*>/g;
		var m, val, found = false;
		
		while (m = searchRe.exec(html)) {
			if (/^['"]/.test(m[3])) m[3] = m[3].slice(1, -1);
			val = html_entity_decode(m[3]);
			if (
					(type === 'id' && val === id) || 
					(type === 'class' && RegExp('\\b' + regexEscape(id) + '\\b').test(val) )
				) {
				found = true;
				break;
			}
		}
		if (! found) return type === 'id' ? undefined : [];
		
		var re = /<\w+/g;
		re.lastIndex = m.index;
		return (type === 'id')	? getElement(html, re, replaces, parseFunc) 
								: getElements(html, re, replaces, parseFunc);
	}

	/**
	 * Реализация браузерного метода document.getElementById() без использования DOM
	 * 
	 * @param {string} html
	 * @param {string} id
	 * @param {array} replaces
	 * @param {function} parseFunc
	 * @returns {undefined|string}
	 */
	function getElementById(html, id, replaces, parseFunc) {
		return _getElementBy('id', html, id, replaces, parseFunc);
	}

	/**
	 * Реализация браузерного метода document.getElementsByClassName() без использования DOM
	 * 
	 * @param {string} html
	 * @param {string} id
	 * @param {array} replaces
	 * @param {function} parseFunc
	 * @returns {undefined|string}
	 */
	function getElementsByClassName(html, id, replaces, parseFunc) {
		return _getElementBy('class', html, id, replaces, parseFunc);
	}

	/**
     Ищет элемент в указанном html, тэг которого совпадает с указанным регулярным выражением
     Возвращает весь элемент целиком, учитывая вложенные элементы с тем же тегом
     Например,
     getElement(html, /<div[^>]+id="somediv"[^>]*>/i)
     Если в конце регекса есть группа (match[0] оканчивается на match[1]), то сам тег берется ез match[1],
     а все что перед группой будет как условие lookbehind, коих в js регексах до сих пор нет.
     */
    function getElement(html, re, replaces, parseFunc) {
        var amatch = re.exec(html);
        if (!amatch)
            return;
        var startIndex = amatch.index;
        var startTag = amatch[0];
        if (amatch[1] && (amatch[0].indexOf(amatch[1], amatch[0].length - amatch[1].length) > 0)) {
            startIndex += amatch[0].length - amatch[1].length;
            startTag = amatch[1];
        }
        var elem = getParam(startTag, /<(\w+)/);
        var reStart = new RegExp('<' + elem + '[^>]*>', 'ig');
        var reEnd = new RegExp('<\/' + elem + '[^>]*>', 'ig');
        reStart.lastIndex = startIndex;

        elem = getRecursiveMatch(html, reStart, reEnd, replaces, parseFunc);
        re.lastIndex = reStart.lastIndex;
        return elem;
    }

    /**
     Находит в html JSON объект, начиная с позиции первого вхождения регулярного выражения reStartSearch (если оно указано).
     Ищется либо массив, либо объект, что встретится ранее

     Возвращается объект (или массив) или undefined, если объект не найден.
     */
    function getJsonObject(html, reStartSearch, replaces) {
		if (false) { //development mode
			//http://hjson.org/
			//https://regex101.com/#javascript
			//http://blog.stevenlevithan.com/archives/match-innermost-html-element
			//We use atomic group (trick with lookahead, capturing group and link after) to speed improve, significantly reduce backtracking!
			var OPEN						= /([\{\[])/,	//group $1
				CLOSE						= /([\}\]])/,	//group $2
				ANY_WITH_EXCEPTIONS			= /(?= ([^\{\}\[\]"'`\/]+) )\1/,
				STRING_IN_DOUBLE_QUOTES		= /"				(?= ((?:[^"\\\r\n]+|\\.)*) )\1	"/,
				STRING_IN_SINGLE_QUOTES		= /'				(?= ((?:[^'\\\r\n]+|\\.)*) )\1	'/,
				STRING_IN_BACKTICK_QUOTES	= /`				(?= ((?:[^`\\]+    |\\.)*) )\1	`/,		//ECMA6+
				REGEXP_INLINE				= /\/	(?![\*\/])	(?= ((?:[^\/\\\r\n]+|\\[^\r\n])+) )\1	\/[gimy]{0,4}/,
				COMMENT_MULTILINE			= /\/\*				.*?								\*\//,
				COMMENT_SINGLELINE			= /\/\/				(?= ([^\r\n]*) )\1				/,
				ALL = XRegExp.union([
					OPEN,
					CLOSE,
					ANY_WITH_EXCEPTIONS,
					STRING_IN_DOUBLE_QUOTES,
					STRING_IN_SINGLE_QUOTES,
					STRING_IN_BACKTICK_QUOTES,
					REGEXP_INLINE,
					COMMENT_MULTILINE,
					COMMENT_SINGLELINE
				], 'xs');
			ALL = RegExp(ALL.source.replace(/\(\?:\)/g, ''), '');
			console.log(ALL);
		}
		else { //production mode
			var ALL = /([\{\[])|([\}\]])|(?=([^\{\}\[\]"'`\/]+))\3|"(?=((?:[^"\\\r\n]+|\\[\s\S])*))\4"|'(?=((?:[^'\\\r\n]+|\\[\s\S])*))\5'|`(?=((?:[^`\\]+|\\[\s\S])*))\6`|\/(?![\*\/])(?=((?:[^\/\\\r\n]+|\\[^\r\n])+))\7\/[gimy]{0,4}|\/\*[\s\S]*?\*\/|\/\/(?=([^\r\n]*))\8/;
		}

        var startIndex = 0;
        if (reStartSearch) {
            var amatch = reStartSearch.exec(html);
            if (!amatch)
                return;
            startIndex = amatch.index + amatch[0].length;
        }

        //var source = AFTER_BRACE_PART.source;
        //var reStart = XRegExp.union([RegExp('(?:' + source + ')*'), RegExp('(?:' + source + ')*')], 'g', /[\{\[]/.source);
        //var reStart = new RegExp('(?:' + source + ')*[\\\{\\\[](?:' + source + ')*', 'g');
        //var rePreStart = new RegExp('(?:' + source + ')*(?=[\\\{\\\[])', 'g'); //Чтобы убрать мусор до первой правильной скобки
        //rePreStart.lastIndex = startIndex;
        //amatch = rePreStart.exec(html);
        //if (!amatch)
        //    return;
        //reStart.lastIndex = rePreStart.lastIndex;
        //var json = getRecursiveMatch(html, reStart, /[\}\]]/, null, getJsonEval);
		
		html = html.substring(startIndex).trim();
		var json = html.matchRecursive(ALL, {open: 1, close: 2, parts: false});
		if(replaces) json = replaceAll(json, replaces); 
		json = getJsonEval(json);

		//if(reStartSearch)
        //	reStartSearch.lastIndex = reStart.lastIndex;

		return json;
    }
	
	function getRecursiveMatch(html, reStart, reEnd, replaces, parseFunc) {
        var amatch = reStart.exec(html);
        if (!amatch)
            return;

        var startIndex = amatch.index;

        var depth = 0;
        var reStartOrEnd = new RegExp('(?:' + reStart.source + ')|(?:' + reEnd.source + ')', 'ig');
        var reStartWithEnd = new RegExp('^(?:' + reEnd.source + ')', reEnd.ignoreCase ? 'i' : '');

        reStartOrEnd.lastIndex = startIndex + amatch[0].length;

        while (true) {
            amatch = reStartOrEnd.exec(html);
            if (!amatch)
                break;
            var matched = amatch[0];
            if (reStartWithEnd.test(matched)) { //Закрывающий тег
                if (depth == 0)
                    break;
                --depth;
            } else {
                ++depth;
            }
            reStartOrEnd.lastIndex = amatch.index + matched.length;
        }

        var endIndex = html.length;
        if (amatch)
            endIndex = amatch.index + amatch[0].length;

        reStart.lastIndex = endIndex;

        var str = html.substring(startIndex, endIndex);

        if (replaces)
            str = replaceAll(str, replaces);
        if (parseFunc)
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

     @returns {Array}
     */
    function getElements(html, re, replaces, parseFunc) {
        var results = [];
        var regexp = isArray(re) ? re[0] : re;
        var add_re = isArray(re) ? (re.shift(), re) : null;
        do {
            var res = getElement(html, regexp, replaces, parseFunc);

            var good_res = res && !add_re;
            if (add_re && res) {
                for (var i = 0; i < add_re.length; ++i) {
                    good_res = good_res || add_re[i].test(res);
                    if (good_res)
                        break;
                }
            }
            if (good_res)
                results.push(res);

            if (!regexp.global)
                break; //Экспрешн только на один матч
        } while (isset(res));
        return results;
    }

    function __shouldProcess(counter, info) {
        if (!AnyBalance.shouldProcess)
            return !!info.__id;
        return AnyBalance.shouldProcess(counter, info);
    }

    function __setLoginSuccessful() {
        if (AnyBalance.setLoginSuccessful)
            AnyBalance.setLoginSuccessful();
    }

    function fmtDate(dt, delimiter) {
        if (!isset(delimiter))
            delimiter = '.';

        return getFormattedDate({format: 'DD' + delimiter + 'MM' + delimiter + 'YYYY'}, dt);
    }

    /**
     * Преобразует число в двухсимвольную строку, дополняя ведущим нулём по необходимости
     * @param {int} n
     * @returns {string}
     */
    function n2(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    /**
     * Форматирует дату, как необходимо, при этом предоставляет возможность сместиться от передаваемой даты на заданное время. Полезно использовать при передаче в запросы, требующие указания интервалов дат.
     *
     * @param {Object|String} options - формат и смещение
     * @param [dt=new Date()]
     * @returns {String}
     *
     *  Пример параметра options:
     *  <pre>
     *  {
     *      format: 'DD.MM.YYYY', // DD=09, D=9, MM=08, М=8, YYYY=2015, YY=15
     *      offsetDay: 0, // Смещение по дням
     *      offsetMonth: 0, // Смещение по месяцам
     *      offsetYear: 5, // Смещение по годам
     *  }
     *  </pre>
     *
     */
    function getFormattedDate(options, dt) {
        if (!dt)
            var dt = new Date();
        if (!options || typeof options == 'string')
            options = {format: options};
        if(!options.format)
        	options.format = 'DD.MM.YYYY';

        //Формируем дату со смещением
        dt = new Date(dt.getFullYear() - (options.offsetYear || 0), dt.getMonth() - (options.offsetMonth || 0), 
        	dt.getDate() - (options.offsetDay || 0), dt.getHours() - (options.offsetHours || 0), 
        	dt.getMinutes() - (options.offsetMinutes || 0), dt.getSeconds() - (options.offsetSeconds || 0));
        var day = dt.getDate();
        var month = (dt.getMonth() + 1);
        var year = dt.getFullYear();
		var hours = dt.getHours();
		var minutes = dt.getMinutes();
		var seconds = dt.getSeconds();
	
        return replaceAll(options.format, [
            /DD/, n2(day), /D/, day,
            /MM/, n2(month), /M/, month,
            /YYYY/, year, /YY/, (year + '').substring(2, 4),
	    	/HH/,n2(hours),/H/,hours,
	    	/NN/,n2(minutes),/N/,minutes,
	    	/SS/,n2(seconds),/S/,seconds
        ]);
    }

    /**
     * Корректно соединяет базовый урл (например, адрес текущей страницы) и относительную ссылку
     *
     * @param {string} url - базовый адрес
     * @param {string} path - относительная ссылка
     * @returns {string} результирующий адрес
     */
    function joinUrl(url, path) {
        if (!path) //Пустой путь
            return url;
        if (/^\//.test(path)) //Абсолютный путь
            return replaceAll(url, [/^(\w+:\/\/[\w.:\-]+).*$/, '$1' + path]);
        if (/^\w+:\/\//.test(path)) //Абсолютный урл
            return path;
        path = replaceAll(path, [
        	/^\.\//, '', //Убираем ./
        ]);

        //относительный путь
        url = replaceAll(url, [
        	/\?.*$/, '' //Обрезаем аргументы
        ]); 
        if (/:\/\/.*\//.test(url))
            url = replaceAll(url, [/\/[^\/]*$/, '/']); //Сокращаем до папки
        if(/^\.\.\//i.test(path)){
        	path = path.substr(3); //Надо подняться на папку вверх
        	url = replaceAll(url, [/\/[^\/]*\/?$/, '/']); //Сокращаем до папки
        }
        if (!endsWith(url, '/'))
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
			result_func: null //Текст
		}
	};
     var table = getElement(html, /<table[^>]+class="card-table"[^>]*>/i);
     if(table){
		info.contacts = [];
		processTable(table, info.contacts, 'info.contacts.', colsDef);
	}
     */
    function processTable(table, result, path, colsDef, onWrongSize, onFilledResult) {
        var trs = getElements(table, /<tr[^>]*>/ig);
        var cols, size;
        for (var i = 0; i < trs.length; i++) {
            var tr = trs[i];
            var tds = getElements(tr, /<td[^>]*>/ig);
            if (tds.length == 0) {
                //Заголовок
                var ths = getElements(tr, /<th[^>]*>/ig);
                size = ths.length;
                cols = initCols(colsDef, ths);
            } else if (tds.length == size) {
                var t = {};

                fillColsResult(colsDef, cols, tds, t, path);
                if (onFilledResult)
                    onFilledResult(t, path);

                result.push(t);
            } else if (onWrongSize) {
                onWrongSize(tr, tds);
            }
        }
    }


    function initCols(colsDef, ths) {
        var cols = {};
        for (var i = 0; i < ths.length; i++) {
            var th = ths[i];
            for (var name in colsDef) {
                var def = colsDef[name];
                if (def.re.test(th)) {
                    //if_assigned указывает, после какой колонки должна быть эта колонка, если у них одинаковые названия.
                    //Для первой такой колонки null, каждая следующая ссылается на предыдущую
                    var if_assigned = def.if_assigned;
                    if(isset(if_assigned)){
                        if(isset(cols[name]))
                            continue;
                        if(if_assigned && (!isset(cols[if_assigned]) || cols[if_assigned] == i))
                            continue;
                    }
                    cols[name] = i;
                }
            }
        }
        return cols;
    }

    function fillColsResult(colsDef, cols, tds, result, path) {
        function getset(val, def) {
            return isset(val) ? val : def;
        }

        path = path || '';

        var rts = replaceTagsAndSpaces,
            pb = parseBalance,
            as = aggregate_sum;

        for (var name in colsDef) {
            var cd = colsDef[name];
            if (isset(cols[name])) {
                var td = tds[cols[name]];
                var rn = getset(cd.result_name, name);
                if (isArray(rn)) {
                    var rn1 = [];
                    for (var i = 0; i < rn.length; i++) {
                        rn1.push(path + rn[i]);
                    }
                    rn = rn1;
                } else {
                    rn = path + rn;
                }

                if (cd.result_process) {
                    cd.result_process(path, td, result);
                } else if (cd.result_sum) {
                    cd.result_re && (cd.result_re.lastIndex = 0);
                    sumParam(td, result, rn, cd.result_re, getset(cd.result_replace, rts), getset(cd.result_func, pb), getset(cd.result_aggregate, as));
                } else {
                    getParam(td, result, rn, cd.result_re, getset(cd.result_replace, rts), getset(cd.result_func, pb));
                }
            }
        }
    }
	
	/**
	where - json object
	what - string or array
	*/
	function getJsonObjSafe(where, what) {
		if(isArray(what)) {
			for(var i = 0; i < what.length; i++) {
				var k = what[i];
				var val = where[k];
				
				// object - going deeper
				if(typeof val === 'object') {
					where = val;
				// Not an object - returning result
				} else {
					return val;
				}
			}
			// In case if we need an object to return
			return where;
		} else {
			return isset(where) ? where[what] : '';
		}
	}

	function processKeyValues(params, processKeyValue){
		var out = [];
		if(isArray(params)){
			for(var i=0; i<params.length; ++i){
				var p = params[i];
				if(!isset(p[1])) continue;
				out.push(processKeyValue(p[0], p[1]));
			}
		}else{
			for(var p in params){
				if(!isset(params[p])) continue;
				out.push(processKeyValue(p, params[p]));
			}
		}
		return out;
	}

	function createUrlEncodedParams(params){
		return processKeyValues(params, (key, value) => encodeURIComponent(key) + '=' + encodeURIComponent(value)).join('&');
	}

	function clearAllCookies(){
		var cookies = AnyBalance.getCookies();
		for(var i=0; i<cookies.length; ++i){
			var cookie = cookies[i];
			AnyBalance.setCookie(cookie.domain, cookie.name, null, cookie);
		}
	}

	function solveRecaptcha(text, url, sitekey, time){
		if(AnyBalance.getCapabilities().recaptcha2){
			var grc_response = AnyBalance.retrieveCode(text, null, {
				type: 'recaptcha2',
				time: time || 120000,
				sitekey: sitekey,
				url: url
			});
			return grc_response;
		}else{
			throw new AnyBalance.Error('Провайдер требует распознавания ReCaptcha, но текущая версия AnyBalance API не позволяет это сделать. Обновите программу или обратитесь к разработчикам.');
		}
	}

    return {
        getParam: getParam,
        checkEmpty: checkEmpty,
        isAvailable: isAvailable,
        /**
         * Удаление тегов и замена html сущностей
         * @type {*[]}
         */
        replaceTagsAndSpaces: replaceTagsAndSpaces,
        /**
         * Замена слешей в js строках
         * @type {*[]}
         */
        replaceSlashes: replaceSlashes,
        /**
         * Замена html сущностей
         * @type {*[]}
         */
        replaceHtmlEntities: replaceHtmlEntities,
        isset: isset,
        isArray: isArray,
        replaceAll: replaceAll,
        parseBalance: parseBalance,
        parseBalanceSilent: parseBalanceSilent,
        parseCurrency: parseCurrency,
        parseCurrencySilent: parseCurrencySilent,
        parseMinutes: parseMinutes,
        parseMinutesSilent: parseMinutesSilent,
        html_entity_decode: html_entity_decode,
        createFormParams: createFormParams,
        parseDate: parseDate,
        parseDateSilent: parseDateSilent,
        parseDateWord: parseDateWord,
        parseDateWordSilent: parseDateWordSilent,
        joinObjects: joinObjects,
        joinArrays: joinArrays,
        addHeaders: addHeaders,
        getJson: getJson,
        getJsonEval: getJsonEval,
        safeEval: safeEval,
        endsWith: endsWith,
        parseDateISO: parseDateISO,
        parseDateISOSilent: parseDateISOSilent,
        sumParam: sumParam,
        aggregate_sum: aggregate_sum,
        aggregate_join: aggregate_join,
        create_aggregate_join: create_aggregate_join,
        aggregate_min: aggregate_min,
        aggregate_max: aggregate_max,
        parseTraffic: parseTraffic,
        parseTrafficGb: parseTrafficGb,
        parseTrafficEx: parseTrafficEx,
        requestPostMultipart: requestPostMultipart,
        capitalFirstLetters: capitalFirstLetters,
        setCountersToNull: setCountersToNull,
        getElement: getElement,
        getElementById: getElementById,
        getElementsByClassName: getElementsByClassName,
        getJsonObject: getJsonObject,
        getRecursiveMatch: getRecursiveMatch,
        getElements: getElements,
        __shouldProcess: __shouldProcess,
        __setLoginSuccessful: __setLoginSuccessful,
        fmtDate: fmtDate,
        n2: n2,
        getFormattedDate: getFormattedDate,
        joinUrl: joinUrl,
        processTable: processTable,
        initCols: initCols,
        fillColsResult: fillColsResult,
        getJsonObjSafe: getJsonObjSafe,
        createUrlEncodedParams: createUrlEncodedParams,
        clearAllCookies: clearAllCookies,
        solveRecaptcha: solveRecaptcha,
        regexEscape: regexEscape
    };
})(this);

//Скопируем все переменные из AB в глобальный скоуп для совместимости
(function(){
	for (var name in AB) {
    	this[name] = AB[name]; 
	}
})();
