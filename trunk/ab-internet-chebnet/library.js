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
 *  Проверяет, определено ли значение переменной
 */
function isset(v){
    return typeof(v) != 'undefined';
}
