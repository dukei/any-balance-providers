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
 * см. например replaceTagsAndSpaces
 */
function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var matches = regexp.exec (html), value;
	if (matches) {
		value = matches[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
	}
   return value
}

//Замена пробелов и тэгов
var replaceTagsAndSpaces = [/&nbsp;/ig, ' ', /<!--[\s\S]*?-->/g, '', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
//Замена для чисел
var replaceFloat = [/\s+/g, '', /,/g, '.'];

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
function createFormParams(html, process){
    var params = {};
    html.replace(/<input[^>]+name=['"]([^'"]*)["'][^>]*>|<select[^>]+name=["']([^"']*)["'][^>]*>[\s\S]*?<\/select>/ig, function(str, nameInp, nameSel){
        var value = '';
        if(nameInp){
            value = getParam(str, null, null, /value=["']([^"']*)["']/i, null, html_entity_decode);
            name = nameInp;
        }else if(nameSel){
            value = getParam(str, null, null, /^<[^>]*value=["']([^"']*)["']/i, null, html_entity_decode);
            if(typeof(value) == 'undefined'){
                var optSel = getParam(str, null, null, /(<option[^>]+selected[^>]*>)/i);
                if(!optSel)
                    optSel = getParam(str, null, null, /(<option[^>]*>)/i);
                value = getParam(optSel, null, null, /value=["']([^"']*)["']/i, null, html_entity_decode);
            }
            name = nameSel;
        }

        name = html_entity_decode(name);
        if(process){
            value = process(params, str, name, value);
        }
        if(typeof(value) != 'undefined')
            params[name] = value;
    });

    //AnyBalance.trace('Form params are: ' + JSON.stringify(params));
    return params;
}
