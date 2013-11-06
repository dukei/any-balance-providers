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

function main() {
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = 'https://auth.jino.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	if(!prefs.dbg) {
		var html = AnyBalance.requestGet(baseurl + 'login/cpanel/', g_headers);
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'login') 
				return prefs.login;
			else if (name == 'password')
				return prefs.password;

			return value;
		});
		
		html = AnyBalance.requestPost(baseurl + 'login/cpanel/', params, addHeaders({Referer: baseurl + 'login/cpanel/'})); 		
		
		if(!/logout=true/i.test(html)){
			var error = getParam(html, null, null, /msgs"[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	} else {
		var html = AnyBalance.requestGet('https://cp.jino.ru/', g_headers);
	}
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Баланс[^>]*>:\s*[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Истекает[^>]*>:\s*[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, 'state', /Статус[^>]*>:\s*[^>]*>\s*([^<]*?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
	// Дисковое простанство
	if(isAvailable(['storage_percent','storage_used','monthly_fee','daily_fee', 'storage_percent_left', 'storage_total', 'storage_left'])) {
		html = AnyBalance.requestGet('https://cp.jino.ru/?area=services_srv&srv=disk');
		
		getParam(html, result, 'monthly_fee', /Оплата в месяц(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'daily_fee', /Оплата в сутки(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		
		var ptc = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>){1}[\s\S]*?(\d[\d.,]*)%/i, replaceTagsAndSpaces, parseBalance);
		if(ptc){
			getParam(ptc, result, 'storage_percent');
			getParam(100-ptc, result, 'storage_percent_left');
		}
		var storageTotal = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>)[^<]*Мб{1}([^<]*)Мб/i, replaceTagsAndSpaces, parseBalance);
		var storageUsed = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>){1}([^<]*)Мб/i, replaceTagsAndSpaces, parseBalance);
		
		getParam(storageTotal, result, 'storage_total');
		getParam(storageUsed, result, 'storage_used');

		if(storageTotal && storageUsed){
			getParam(storageTotal-storageUsed, result, 'storage_left');
		}
	}
	// Почтовый сервис
	if(isAvailable(['mail_used','mail_total','mail_left','mail_percent', 'mail_percent_left'])){
		html = AnyBalance.requestGet('https://cp.jino.ru/?area=services_srv&srv=mail');
		
		var ptc = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>){1}[\s\S]*?(\d[\d.,]*)%/i, replaceTagsAndSpaces, parseBalance);
		if(ptc){
			getParam(ptc, result, 'mail_percent');
			getParam(100-ptc, result, 'mail_percent_left');
		}
		var mail_total = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>)[^<]*Мб{1}([^<]*)Мб/i, null, parseBalance);
		var mail_used = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>){1}([^<]*)Мб/i, null, parseBalance);
		
		getParam(mail_total, result, 'mail_total');
		getParam(mail_used, result, 'mail_used');
		
		if(mail_total && mail_used){
			getParam(mail_total-mail_used, result, 'mail_left');
		}
	}
	
    AnyBalance.setResult(result);
}