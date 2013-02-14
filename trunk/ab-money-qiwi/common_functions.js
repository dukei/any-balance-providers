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
       return oldHeader.slice().push.apply(oldHeader, newHeaders);
   if(!bOldArray && bNewArray){ //Если старый объект, а новый массив
       var headers = joinObjects(null, oldHeaders);
       for(var i=0; i<newHeaders.length; ++i)
           headers[newHeaders[i][0]] = newHeaders[i][1];
       return headers;
   }
   if(bOldArray && !bNewArray){ //Если старый массив, а новый объект, то это специальный объект {index: [name, value], ...}!
       var headers = oldHeaders.slice();
       for(i in newHeaders)
           headers[i] = newHeaders[i];
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
 *  Проверяет, определено ли значение переменной
 */
function isset(v){
    return typeof(v) != 'undefined';
}
