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
var replaceTagsAndSpaces = [/Мбит&#047;с/ig, ' Мбит/с', /&nbsp;/ig, ' ', /&minus;/ig, '-', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
//Замена для чисел
var replaceFloat = [/&minus;/ig, '-', /\s+/g, '', /,/g, '.', /\.([^.]*)(?=\.)/g, '$1', /^\./, '0.'];
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
    var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(-?\.?\d[\d.,]*)/, replaceFloat, parseFloat);
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
function html_entity_decode (string) {
    var entities = get_html_translation_table();
    var replaced = string.replace(/&(#(x)?)?(\w+);/ig, function(str, sharp, x, m){
        if(!sharp){
            var ml = m.toLowerCase(m);
            if(entities.hasOwnProperty(ml))
                return String.fromCharCode(entities[ml]);
        }else if(!x){
            if(/^\d+$/.test(m))
                return String.fromCharCode(parseInt(m));
        }else{
            if(/^[0-9a-f]+$/i.test(m))
		return String.fromCharCode(parseInt(m, 16));
        }
        return str;
    });
    return replaced;
}

function get_html_translation_table () {
  var entities = {
    amp:	38,
    nbsp:	160,
    iexcl:	161,
    cent:	162,
    pound:	163,
    curren:	164,
    yen:	165,
    brvbar:	166,
    sect:	167,
    uml:	168,
    copy:	169,
    ordf:	170,
    laquo:	171,
    not:	172,
    shy:	173,
    reg:	174,
    macr:	175,
    deg:	176,
    plusmn:	177,
    sup2:	178,
    sup3:	179,
    acute:	180,
    micro:	181,
    para:	182,
    middot:	183,
    cedil:	184,
    sup1:	185,
    ordm:	186,
    raquo:	187,
    frac14:	188,
    frac12:	189,
    frac34:	190,
    iquest:	191,
    agrave:	192,
    aacute:	193,
    acirc:	194,
    atilde:	195,
    auml:	196,
    aring:	197,
    aelig:	198,
    ccedil:	199,
    egrave:	200,
    eacute:	201,
    ecirc:	202,
    euml:	203,
    igrave:	204,
    iacute:	205,
    icirc:	206,
    iuml:	207,
    eth:	208,
    ntilde:	209,
    ograve:	210,
    oacute:	211,
    ocirc:	212,
    otilde:	213,
    ouml:	214,
    times:	215,
    oslash:	216,
    ugrave:	217,
    uacute:	218,
    ucirc:	219,
    uuml:	220,
    yacute:	221,
    thorn:	222,
    szlig:	223,
    agrave:	224,
    aacute:	225,
    acirc:	226,
    atilde:	227,
    auml:	228,
    aring:	229,
    aelig:	230,
    ccedil:	231,
    egrave:	232,
    eacute:	233,
    ecirc:	234,
    euml:	235,
    igrave:	236,
    iacute:	237,
    icirc:	238,
    iuml:	239,
    eth:	240,
    ntilde:	241,
    ograve:	242,
    oacute:	243,
    ocirc:	244,
    otilde:	245,
    ouml:	246,
    divide:	247,
    oslash:	248,
    ugrave:	249,
    uacute:	250,
    ucirc:	251,
    uuml:	252,
    yacute:	253,
    thorn:	254,
    yuml:	255,
    quot:	34,
    lt:		60,
    gt:		62
  };

  return entities;
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
           headers[i] = newHeaders[i];
       return headers;
   }
}