/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет-провайдера Kvidex.

Сайт оператора: http://kvidex.ru/
Личный кабинет: https://stat.kvidex.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTraffic(text){
    var _text = text.replace(/\s+/, '');
    var val = getParam(_text, null, null, /(-?\d[\d\.,]*)/, replaceFloat, parseFloat);
    var units = getParam(_text, null, null, /(kb|mb|gb|кб|мб|гб|байт|bytes)/i);
    switch(units.toLowerCase()){
      case 'bytes':
      case 'байт':
        val = Math.round(val/1024/1024/1024*100)/100;
        break;
      case 'kb':
      case 'кб':
        val = Math.round(val/1024/1024*100)/100;
        break;
      case 'gb':
      case 'гб':
        val = Math.round(val*100)/100;
        break;
    }
    var textval = ''+val;
    if(textval.length > 6)
      val = Math.round(val);
    else if(textval.length > 5)
      val = Math.round(val*10)/10;

    AnyBalance.trace('Parsing traffic (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://stat.kvidex.ru";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password
    });

    var error = getParam(html, null, null, /<h2>Ошибка<\/h2><p>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var result = {success: true};

    getParam(html, result, 'userName', /<strong>Абонент<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /<strong>Лицевой счет<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /<strong>Баланс<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /<strong>Интернет<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<strong>Тарифный план<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'abon', /<strong>Стоимость<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'trafficIn', /<strong>Входящий трафик<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseTraffic);
    getParam(html, result, 'trafficOut', /<strong>Исходящий трафик<\/strong>[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseTraffic);

    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

