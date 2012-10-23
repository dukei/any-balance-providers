/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для дагестанского интернет-провайдера Эрлайн.

Сайт оператора: http://www.r-line.ru/
Личный кабинет: https://state.r-line.ru/cgi-bin/utm5/aaa5
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

var replaceTagsAndSpaces = [/&nbsp;/g, ' ', /<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTrafficGb(str){
  var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
  return parseFloat((val/1024).toFixed(2));
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://state.r-line.ru/cgi-bin/utm5/";

    html = AnyBalance.requestPost(baseurl + 'aaa5', {
        login:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/cmd=logout/i.test(html)){
        var error = getParam(html, null, null, /<BR[^>]*>\s*Ошибка:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс основного счета[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Основной счет[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'credit', /Кредит основного счета[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Блокировка[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var skey = getParam(html, null, null, /skey=([0-9a-f]{32})/i);

    html = AnyBalance.requestGet(baseurl + "user5?cmd=user_services_list&skey=" + skey);
    getParam(html, result, '__tariff', /Тарифный план(?:[\S\s]*?<td[^>]*>){7}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var now = new Date();
        var begin = new Date(now.getFullYear(), now.getMonth(), 1);
        html = AnyBalance.requestGet(baseurl + "user5?s_hour=0&s_min=0&s_mday=1&s_mon=" + begin.getMonth() + "&s_year=" + begin.getFullYear() + 
                      "&e_hour=23&e_min=59&e_mday=" + now.getDate() + "&e_mon=" + now.getMonth() + "&e_year=" + now.getFullYear() + "&cmd=user_reports_traffic&skey=" + skey);

       getParam(html, result, 'trafficIn', /Incoming[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
       getParam(html, result, 'trafficOut', /Outgoing[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceFloat, parseTrafficGb);
    }
    
    AnyBalance.setResult(result);
}

function html_entity_decode(str)
{
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

