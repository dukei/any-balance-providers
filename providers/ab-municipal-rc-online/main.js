/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.rc-online.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
		
	var html = AnyBalance.requestPost(baseurl + 'go/', {
        e_login:prefs.login,
        e_password:prefs.password,
		e_cookie:'on',
        form_logon_submitted:'yes'
    }, addHeaders({Referer: baseurl + 'login'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+#ffc0c0[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /корректный логин и пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};

    if(prefs.reseller){
        var select = getElement(html, /<select[^>]+name="RESELLER"/i);
        var options = getElements(select, /<option/ig);
        for(var i=0; i<options.length; ++i){
        	var name = replaceAll(options[i], replaceTagsAndSpaces);
        	AnyBalance.trace('Нашли организацию ' + name);
        	if(name.toLowerCase().indexOf(prefs.reseller.toLowerCase()) >= 0){
        		if(/<option[^>]+selected/i.test(options[i])){
        			AnyBalance.trace('Организация ' + name + ' уже выбрана');
        			break;
        		}else{
        			AnyBalance.trace('Выбираем ' + name);
        			var value = getParam(options[i], /<option[^>]+value="([^"]*)/i, replaceHtmlEntities);
        			html = AnyBalance.requestPost(baseurl + 'go/', {RESELLER: value}, addHeaders({Referer: baseurl + 'go'}));
        			break;
        		}
        	}
        }

        if(i >= options.length)
        	throw new AnyBalance.Error('Не удалось найти организацию по части названия "' + prefs.reseller + '"');
    }

    var organization = getParam(getElement(html, /<select[^>]+name="RESELLER"/i), /<option[^>]+selected[\s\S]*?<\/option>/i, replaceTagsAndSpaces);
    getParam(organization, result, '__tariff');
	
	var balance = getParam(html, /(?:Баланс по счету|Переплата)[^>]*>\s*<[^>]+>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	if(!isset(balance))
		balance = getParam(html, /Долг[^>]*>\s*<[^>]+>([^<]*)/i, replaceTagsAndSpaces, parseBalance) * -1;
	
	getParam(balance, result, 'balance');
	
	getParam(html, result, 'fio', /Абонент:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
	
	if(isAvailable(['nachisl'])) {
		html = AnyBalance.requestGet(baseurl+'go/charges', g_headers);
		var table = getParam(html, new RegExp('Обслуживающая организация:\\s+' + escapeRegExp(organization) + '[\\s\\S]*?</table>', 'i'));
		getParam(table, result, 'nachisl', /Итого:(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
	if(isAvailable(['last_pay_date','last_pay_sum'])) {
		html = AnyBalance.requestGet(baseurl+'go/pays_history', g_headers);
		var table = getParam(html, new RegExp('<td[^>]+colspan[^>]*>(?:[\\s\\S](?!</td>))*?' + escapeRegExp(organization) + '([\\s\\S]*?)</table>', 'i'));
		getParam(table, result, 'last_pay_date', /(?:[\s\S]*?<td(?:[^>](?!colspan))*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		getParam(table, result, 'last_pay_sum', /(?:[\s\S]*?<td(?:[^>](?!colspan))*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}	
	
    AnyBalance.setResult(result);
}