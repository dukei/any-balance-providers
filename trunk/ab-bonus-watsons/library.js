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
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp ? html.match(regexp) : [, html], value;
	if (matches) {
                //Если нет скобок, то значение - всё заматченное
		value = replaceAll(isset(matches[1]) ? matches[1] : matches[0], replaces);
		if (parser)
			value = parser (value);

		if(param)
			result[param] = value;
	}
	return value;
}

//Замена пробелов и тэгов
var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
//Замена для чисел
var replaceFloat = [/\s+/g, '', /,/g, '.'];

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

/**
 *  Проверяет, не оканчивается ли строка на заданную
 */
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

/**
 *  Проверяет, определено ли значение переменной
 */
function isset(v){
    return typeof(v) != 'undefined';
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
 * и новый текст возвращается (только при param == null)
 * 
 * replaces - массив, нечетные индексы - регулярные выражения, четные - строки, 
 * на которые надо заменить куски, подходящие под предыдущее регулярное выражение. Эти массивы могут быть вложенными.
 * см. например replaceTagsAndSpaces
 */
function sumParam (html, result, param, regexp, replaces, parser, do_replace, aggregate) {
    if (param && (param != '__tariff' && !AnyBalance.isAvailable (param))){
	if(do_replace)
		return html;
        else
		return;
    }

    if(typeof(do_replace) == 'function'){
        aggregate = do_replace;
        do_replace = false;
    }

    var values = [], matches;
    if(param && isset(result[param]))
        values.push(result[param]);

    if(!regexp){
        values.push(replaceAll(html, replaces));
    }else{
        regexp.lastIndex = 0; //Удостоверяемся, что начинаем поиск сначала.
        while(matches = regexp.exec(html)){
		value = isset(matches[1]) ? matches[1] : matches[0];
        	value = replaceAll(value, replaces);
		if (parser)
			value = parser (value);
            
        	values.push(value);
        	if(!regexp.global)
            		break; //Если поиск не глобальный, то выходим из цикла
	}
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
      if(do_replace)
          return regexp ? html.replace(regexp, '') : html;
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

function aggregate_join(values, delimiter){
    if(values.length == 0)
        return;
    if(!isset(delimiter))
        delimiter = ', ';
    return values.join(delimiter);
}

function create_aggregate_join(delimiter){
    return function(values){ return aggregate_join(values, delimiter); }
}

