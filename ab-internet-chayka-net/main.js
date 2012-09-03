/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у тверского провайдера интернет Чайка.NET.

Сайт оператора: http://www.chayka-net.ru/
Личный кабинет: https://stat.myttk.ru/
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

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://stats.chayka-net.ru/cgi-bin/utm5/";

    var headers = {
        Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.83 Safari/537.1'
    };

    var result = {success: true};
    
    var html = AnyBalance.requestPost(baseurl + 'aaa5', {
        login:prefs.login,
        password:prefs.password,
        cmd:'login'
    }, headers);
 

    if(!/\?cmd=logout/i.test(html)){
        var error = getParam(html, null, null, /Ошибка:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    getParam(html, result, 'userName', /Полное имя[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', />ID<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс основного счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /Кредит основного счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Блокировка[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var href = getParam(html, null, null, /<a[^>]*href="([^"]*cmd=user_services_list[^"]*)/i, [/&amp;/g, '&']);
    if(href){
        html = AnyBalance.requestGet(baseurl + href, headers);
        getParam(html, result, '__tariff', /Тарифный план(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    }else{
        AnyBalance.trace('Не удалось получить ссылку на Список услуг');
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

