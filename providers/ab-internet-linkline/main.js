/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Referer': 'https://stat.linkline.ru/',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36'
};

var baseurl = 'https://stat.linkline.ru';
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseTrafficGb(str){
    var val = getParam(str.replace(/\s+/g, ''), null, null, /(-?\d[\d\s.,]*)/, replaceFloat, parseFloat);
    return parseFloat((val/1024).toFixed(2));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('windows-1251');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	html = AnyBalance.requestGet(baseurl + '/cgi-bin/utm/aaa', g_headers);
	
	var form = AB.getElement(html, /<form[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменен?');
	}
	        
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'login') {
			return prefs.login;
		} else if (name == 'password') {
			return prefs.password;
		}
	        
		return value;
	});
			
	var action = getParam(form, null, null, /<form[\s\S]*?action=\"([\s\S]*?)\"/i, replaceHtmlEntities);
			
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
       	'Content-Type': 'application/x-www-form-urlencoded',
		'Origin': baseurl,
       	'Referer': baseurl + '/cgi-bin/utm/aaa'
	}), g_headers);

	var href = getParam(html, null, null, /['"](\/cgi-bin\/utm\/utm_stat\?cmd=user_report&sid=[^"']*)/i);
    if(!href){
        var error = getParam(html, null, null, /<h6[^>]*>([\s\S]*?)<\/h6>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось найти ссылку на пользовательские данные! Сайт изменен?");
    }
	
	html = AnyBalance.requestGet(baseurl + href);
	
	var result = {success: true};

    getParam(html, result, 'balance', /Баланс:([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', />Тарифный план[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'ipAddress', />IP-адрес[\s\S]*?<td[^>]*>([\S\s]*?)(?:<\/td>|\.?<\/b>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'status', />Состояние счета[\s\S]*?<td[^>]*>([\S\s]*?)(?:<\/td>|\.?<\/b>)/i, replaceTagsAndSpaces);
    getParam(html, result, 'trafficLocal', />Локальный[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'trafficIn', />Входящий[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
    getParam(html, result, 'trafficOut', />Исходящий[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseTrafficGb);
	getParam(html, result, 'dateStart', />Дата начала учетного периода[\s\S]*?<td[^>]*>([\S\s]*?)(?:<\/td>|\.?<\/b>)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'dateEnd', />Дата окончания учетного периода[\s\S]*?<td[^>]*>([\S\s]*?)(?:<\/td>|\.?<\/b>)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'till', />Баланс будет исчерпан:[\s\S]*?([\S\s]*?)(?:<\/td>|\.?<\/b>)/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'fio', />Полное имя[\s\S]*?<td[^>]*>([\S\s]*?)(?:<\/td>|\.?<\/b>)/i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
