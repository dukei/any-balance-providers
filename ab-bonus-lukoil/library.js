/**
AnyBalance (http://any-balance-providers.googlecode.com)

Содержит некоторые полезные для извлечения значений с сайтов функции.
Для конкретного провайдера рекомендуется оставлять в этом файле только те функции, которые используются.
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

function getParam (html, result, param, regexp, replaces, parser) {
	if (!isAvailable(param))
		return;

        var regexps = isArray(regexp) ? regexp : [regexp];
        for(var i=0; i<regexps.length; ++i){ //Если массив регэкспов, то возвращаем первый заматченный
                regexp = regexps[i];
		var matches = regexp ? html.match(regexp) : [, html], value;
		if (matches) {
                        //Если нет скобок, то значение - всё заматченное
			value = replaceAll(isset(matches[1]) ? matches[1] : matches[0], replaces);
			if (parser)
				value = parser (value);
	        
			if(param && isset(value))
				result[isArray(param) ? param[0] : param] = value;
			break;
		}
        }

	return value;
}

function isAvailable(param){
    if(!param)
        return true;
    var bArray = isArray(param), tariffName = '__tariff';
    if((bArray && param.indexOf(tariffName) >= 0) || (!bArray && param == '__tariff'))
        return true; //Тариф всегда нужен
    return AnyBalance.isAvailable (param);
}

//Замена пробелов и тэгов
var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /&minus;/ig, '-', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
//Замена для чисел
var replaceFloat = [/&minus;/ig, '-', /\s+/g, '', /,/g, '.'];
//Замена для Javascript строк
var replaceSlashes = [/\\(.?)/g, function(str, n){
        switch (n) {
            case '0':
              return '\0';
            case '':
              return '';
            default:
              return n;
        }
    }];

/**
 *  Проверяет, определено ли значение переменной
 */
function isset(v){
    return typeof(v) != 'undefined';
}

/**
 *  Проверяет, является ли объект массивом
 */
function isArray(arr){
	return Object.prototype.toString.call( arr ) === '[object Array]';
}

/**
 * Делает все замены в строке value. При этом, если элемент replaces массив, то делает замены по нему рекурсивно.
 */
function replaceAll(value, replaces){
	for (var i = 0; replaces && i < replaces.length; ++i) {
                if(isArray(replaces[i])){
			value = replaceAll(value, replaces[i]);
                }else{
			value = value.replace (replaces[i], replaces[i+1]);
			++i; //Пропускаем ещё один элемент, использованный в качестве замены
                }
	}
        return value;
}

/**
 * Извлекает числовое значение из переданного текста
 */
function parseBalance(text){
    var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

/**
 * Извлекает валюту из переданного текста (типичная реализация)
 */
function parseCurrency(text){
    var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /-?\d[\d.,]*(\S*)/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}

/**
 * Заменяет HTML сущности в строке на соответствующие им символы
 */
function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
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
        var params = createFormParams(html, function(params, str, name, value){
            if(name == 'login')
                return prefs.login;
            return value;
        });
 */
function createFormParams(html, process, array){
    var params = array ? [] : {};
    html.replace(/<input[^>]+name="([^"]*)"[^>]*>|<select[^>]+name="([^"]*)"[^>]*>[\s\S]*?<\/select>/ig, function(str, nameInp, nameSel){
        var value = '';
        if(nameInp){
            if(/type="button"/i.test(str))
                value=undefined;
            else
                value = getParam(str, null, null, /value="([^"]*)"/i, null, html_entity_decode) || '';
            name = nameInp;
        }else if(nameSel){
            value = getParam(str, null, null, /^<[^>]*value="([^"]*)"/i, null, html_entity_decode);
            if(typeof(value) == 'undefined'){
                var optSel = getParam(str, null, null, /(<option[^>]+selected[^>]*>)/i);
                if(!optSel)
                    optSel = getParam(str, null, null, /(<option[^>]*>)/i);
                value = getParam(optSel, null, null, /value="([^"]*)"/i, null, html_entity_decode);
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

/**
 *  Получает дату из строки
 */
function parseDate(str){
    var matches = /(?:(\d+)[^\d])?(\d+)[^\d](\d{2,4})(?:[^\d](\d+):(\d+)(?::(\d+))?)?/.exec(str);
    if(matches){
          var year = +matches[3];
          var date = new Date(year < 1000 ? 2000 + year : year, matches[2]-1, +(matches[1] || 1), matches[4] || 0, matches[5] || 0, matches[6] || 0);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

/**
 *  Объединяет два объекта. Свойства с общими именами берутся из newObject
 */
function joinObjects(newObject, oldObject){
   var obj = {};
   for(var i in oldObject){
       obj[i] = oldObject[i];
   }
   if(newObject){
      for(i in newObject){
          obj[i] = newObject[i];
      }
   }
   return obj;
}

function joinArrays(arr1, arr2){
   var narr = arr1.slice();
   narr.push.apply(narr, arr2);
   return narr;
}

/**
 *  Добавляет хедеры к переданным или к g_headers
 */
function addHeaders(newHeaders, oldHeaders){
   oldHeaders = oldHeaders || g_headers;
   var bOldArray = isArray(oldHeaders);
   var bNewArray = isArray(newHeaders);
   if(!bOldArray && !bNewArray)
       return joinObjects(newHeaders, oldHeaders);
   if(bOldArray && bNewArray) //Если это массивы, то просто делаем им join
       return joinArrays(oldHeaders, newHeaders);
   if(!bOldArray && bNewArray){ //Если старый объект, а новый массив
       var headers = joinObjects(null, oldHeaders);
       for(var i=0; i<newHeaders.length; ++i)
           headers[newHeaders[i][0]] = newHeaders[i][1];
       return headers;
   }
   if(bOldArray && !bNewArray){ //Если старый массив, а новый объект, то это специальный объект {index: [name, value], ...}!
       var headers = oldHeaders.slice();
       for(i in newHeaders)
           headers.push([i, newHeaders[i]]);
       return headers;
   }
}

/**
 *  Получает JSON из переданного текста, кидает ошибку, если не парсится
 */
function getJson(html){
   try{
       var json = JSON.parse(html);
       return json;
   }catch(e){
       AnyBalance.trace('Bad json (' + e.message + '): ' + html);
       throw new AnyBalance.Error('Сервер вернул ошибочные данные: ' + e.message);
   }
}

/**
 *  Получает JSON из переданного текста, выполняя его (требуется для невалидного JSON)
 */
function getJsonEval(html){
   try{
       //Запрещаем использование следующих переменных из функции:
       var json = new Function('window', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', 'document', 'return ' + html).apply(null);
       return json;
   }catch(e){
       AnyBalance.trace('Bad json (' + e.message + '): ' + html);
       throw new AnyBalance.Error('Сервер вернул ошибочные данные: ' + e.message);
   }
}


/**
 *  Проверяет, не оканчивается ли строка на заданную
 */
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * В© 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function (Date, undefined) {
    var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
    Date.parse = function (date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 В§15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so thatвЂ™s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 В±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:(?:T|\s+)(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by вЂњundefinedвЂќ values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
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

            timestamp = new Date(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]).getTime();
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));

function parseDateISO(str){
    var dt = Date.parse(str);
    if(!dt){
        AnyBalance.trace('Could not parse date from ' + str);
        return;
    }else{
        AnyBalance.trace('Parsed ' + new Date(dt) + ' from ' + str);
        return dt;
    }
}

function parseDateJS(str){
  //Рассчитывает на библиотеку date-ru-RU.js
  var _str = str.replace(/(\d+)\s*г(?:\.|ода?)?,?/i, '$1 '); //Убираем г. после года, чтобы не мешалось
  var dt = Date.parse(_str);
  if(!dt){
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
function sumParam (html, result, param, regexp, replaces, parser, do_replace, aggregate) {
    if(typeof(do_replace) == 'function'){
        var aggregate_old = aggregate;
        aggregate = do_replace;
        do_replace = aggregate_old || false;
    }

    function replaceIfNeeded(){
	if(do_replace) 
		return regexp ? html.replace(regexp, '') : '';
    }

    if (!isAvailable(param))  //Даже если счетчик не требуется, всё равно надо вырезать его матчи, чтобы не мешалось другим счетчикам
        return replaceIfNeeded();

    //После того, как проверили нужность счетчиков, кладем результат в первый из переданных счетчиков. Оставляем только первый
    param = isArray(param) ? param[0] : param;

    var values = [], matches;
    if(param && isset(result[param]))
        values.push(result[param]);

    function replaceAndPush(value){
        value = replaceAll(value, replaces);
	if (parser)
		value = parser (value);
        if(isset(value))
        	values.push(value);
    }

    var regexps = isArray(regexp) ? regexp : [regexp];
    for(var i=0; i<regexps.length; ++i){ //Пройдемся по массиву регулярных выражений
        regexp = regexps[i];
        if(!regexp){
            replaceAndPush(html);
        }else{
            regexp.lastIndex = 0; //Удостоверяемся, что начинаем поиск сначала.
            while(matches = regexp.exec(html)){
                replaceAndPush(isset(matches[1]) ? matches[1] : matches[0]);
            	if(!regexp.global)
                    break; //Если поиск не глобальный, то выходим из цикла
	    }
        }
        if(do_replace) //Убираем все матчи, если это требуется
            html = regexp ? html.replace(regexp, '') : '';
    }

    var total_value;
    if(aggregate)
        total_value = aggregate(values);
    else if(!param) //Если не требуется записывать в резалт, и функция агрегации отсутствует, то вернем массив
        total_value = values;

    if(param){
      if(isset(total_value)){
          result[param] = total_value;
      }
      return html;
    }else{
      return total_value;
    }
}

function aggregate_sum(values){
    if(values.length == 0)
        return;
    var total_value = 0;
    for(var i=0; i<values.length; ++i){
        total_value += values[i];
    }
    return total_value;
}

function aggregate_join(values, delimiter, allow_empty){
    if(values.length == 0)
        return;
    if(!isset(delimiter))
        delimiter = ', ';
    var ret = values.join(delimiter);
    if(!allow_empty)
        ret = ret.replace(/^(?:\s*(,\s*)?)+|(?:\s*,\s*){2,}|(?:(\s*,)?\s*)+$/g, '');
    return ret;
}

function create_aggregate_join(delimiter, allow_empty){
    return function(values){ return aggregate_join(values, delimiter, allow_empty); }
}

function aggregate_min(values){
    if(values.length == 0)
        return;
    var total_value;
    for(var i=0; i<values.length; ++i){
        if(!isset(total_value) || total_value > values[i])
            total_value = values[i];
    }
    return total_value;
}

function aggregate_max(values){
    if(values.length == 0)
        return;
    var total_value;
    for(var i=0; i<values.length; ++i){
        if(!isset(total_value) || total_value < values[i])
            total_value = values[i];
    }
    return total_value;
}

/**
 * Вычисляет трафик в мегабайтах из переданной строки.
 */
function parseTraffic(text, defaultUnits){
    return parseTrafficEx(text, 1024, 2, defaultUnits);
}

/**
 * Вычисляет трафик в гигабайтах из переданной строки.
 */
function parseTrafficGb(text, defaultUnits){
    return parseTrafficEx(text, 1024, 3, defaultUnits);
}

/**
 * Вычисляет трафик в нужных единицах из переданной строки.
 */
function parseTrafficEx(text, thousand, order, defaultUnits){
    var _text = html_entity_decode(text.replace(/\s+/g, ''));
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    if(!isset(val)){
        AnyBalance.trace("Could not parse traffic value from " + text);
        return;
    }
    var units = getParam(_text, null, null, /([kmgкмг][бb]?|[бb](?![\wа-я])|байт|bytes)/i);
    if(!units && !defaultUnits){
        AnyBalance.trace("Could not parse traffic units from " + text);
        return;
    }
    if(!units) units = defaultUnits;
    switch(units.substr(0,1).toLowerCase()){
      case 'b':
      case 'б':
        val = Math.round(val/Math.pow(thousand, order)*100)/100;
        break;
      case 'k':
      case 'к':
        val = Math.round(val/Math.pow(thousand, order-1)*100)/100;
        break;
      case 'm':
      case 'м':
        val = Math.round(val/Math.pow(thousand, order-2)*100)/100;
        break;
      case 'g':
      case 'г':
        val = Math.round(val/Math.pow(thousand, order-3)*100)/100;
        break;
    }
    var textval = ''+val;
    if(textval.length > 6)
      val = Math.round(val);
    else if(textval.length > 5)
      val = Math.round(val*10)/10;
    var dbg_units = {0: 'b', 1: 'kb', 2: 'mb', 3: 'gb'};
    AnyBalance.trace('Parsing traffic (' + val + dbg_units[order] + ') from: ' + text);
    return val;
}

/**
 * Создаёт мультипарт запрос
 */
function requestPostMultipart(url, data, headers){
	var parts = [];
	var boundary = '------WebKitFormBoundaryrceZMlz5Js39A2A6';
	for(var name in data){
		parts.push(boundary, 
		'Content-Disposition: form-data; name="' + name + '"',
		'',
		data[name]);
	}
	parts.push(boundary, '--');
        if(!headers) headers = {};
	headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary.substr(2);
	return AnyBalance.requestPost(url, parts.join('\r\n'), headers);
}

