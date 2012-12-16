/**
AnyBalance (http://any-balance-providers.googlecode.com)

Содержит некоторые полезные для извлечения значений с сайтов функции.
Для конкретного провайдера рекомендуется оставлять в этом файле только те функции, которые используются.
*/

//Замена пробелов и тэгов
var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];

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
 *  Проверяет, определено ли значение переменной
 */
function isset(v){
    return typeof(v) != 'undefined';
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

/**
 * Получает значение, подходящее под регулярное выражение regexp, производит 
 * в нем замены replaces, результат передаёт в функцию parser, 
 * а затем записывает результат в счетчик с именем param в result
 * Результат в result помещается только если счетчик выбран пользователем 
 * в настройках аккаунта
 *
 * Очень похоже на getParam, но может получать несколько значений (при наличии 
 * в регулярном выражении флага g). В этом случае суммирует их.
 * 
 * если result и param равны null, то значение просто возвращается.
 * eсли parser == null, то возвращается результат сразу после замен
 * если replaces == null, то замены не делаются
 * do_replace - если true, то найденные значения вырезаются из переданного текста
 * 
 * replaces - массив, нечетные индексы - регулярные выражения, четные - строки, 
 * на которые надо заменить куски, подходящие под предыдущее регулярное выражение
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

    var values = [];
    if(param && isset(result[param]))
        values[values.length] = result.param;

    var html_copy = html.replace(regexp, function(str, value){
	for (var i = 0; replaces && i < replaces.length; i += 2) {
		value = value.replace (replaces[i], replaces[i+1]);
	}
	if (parser)
		value = parser (value);
            
            if(isset(value))
            	values[values.length] = value;
            return ''; //Вырезаем то, что заматчили
    });

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
          return html_copy;
    }else{
      return total_value;
    }
}
