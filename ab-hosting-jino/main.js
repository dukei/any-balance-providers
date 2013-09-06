/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'Accept-Encoding': 'gzip, deflate',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection':'keep-alive',
};

function main()
{
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://cp.jino.ru/cpanel';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl, {
		auth:'true',
		login:prefs.login,
		next:'/',
		password:prefs.password,
    }, g_headers); 

    if(!/logout=true/i.test(html)){
        var error = getParam(html, null, null, /msgs"[^>]*>[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Баланс[^>]*>:\s*[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Истекает[^>]*>:\s*[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseDateMoment);
	getParam(html, result, 'state', /Статус[^>]*>:\s*[^>]*>\s*([^<]*?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
	// Дисковое простанство
	if(isAvailable('storage_percent','storage_used','monthly_fee','daily_fee', 'storage_percent_left', 'storage_total', 'storage_left')){
		html = AnyBalance.requestGet(baseurl + '?area=services_srv&srv=disk');
		getParam(html, result, 'monthly_fee', /Оплата в месяц(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, null, parseBalance);
		getParam(html, result, 'daily_fee', /Оплата в сутки(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, null, parseBalance);
		
		var ptc = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>){1}[\s\S]*?(\d[\d.,]*)%/i, null, parseBalance);
		if(ptc){
			result.storage_percent = ptc;
			result.storage_percent_left = 100-ptc;
		}
		var storageTotal = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>)[^<]*Мб{1}([^<]*)Мб/i, null, parseBalance);
		var storageUsed = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>){1}([^<]*)Мб/i, null, parseBalance);
		result.storage_total = storageTotal;
		result.storage_used = storageUsed;
		if(storageTotal && storageUsed){
			result.storage_left = storageTotal-storageUsed;
		}
	}
	// Почтовый сервис
	if(isAvailable('mail_used','mail_total','mail_left','mail_percent', 'mail_percent_left')){
		html = AnyBalance.requestGet(baseurl + '?area=services_srv&srv=mail');
		
		var ptc = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>){1}[\s\S]*?(\d[\d.,]*)%/i, null, parseBalance);
		if(ptc){
			result.mail_percent = ptc;
			result.mail_percent_left = 100-ptc;
		}
		var storageTotal = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>)[^<]*Мб{1}([^<]*)Мб/i, null, parseBalance);
		var storageUsed = getParam(html, null, null, /Использование услуги:(?:[\s\S]*?<p[^>]*>){1}([^<]*)Мб/i, null, parseBalance);
		result.mail_total = storageTotal;
		result.mail_used = storageUsed;
		if(storageTotal && storageUsed){
			result.mail_left = storageTotal-storageUsed;
		}
	}
	
    AnyBalance.setResult(result);
}
// Парсит дату из такого вида в мс 27 июля 2013
function parseDateMoment(str){
	var found = /(\d{1,2})\s*([\s\S]*?)\s*(\d{1,4})/i.exec(str);
	if(found)
	{
		var day = found[1];
		var month = found[2];
		var year = found[3];

		if(month == 'января')
			month = '01';
		else if(month == 'февраля')
			month = '02';
		else if(month == 'марта')
			month = '03';
		else if(month == 'апреля')
			month = '04';
		else if(month == 'мая')
			month = '05';
		else if(month == 'июня')
			month = '06';
		else if(month == 'июля')
			month = '07';
		else if(month == 'августа')
			month = '08';
		else if(month == 'сентября')
			month = '09';
		else if(month == 'октября')
			month = '10';
		else if(month == 'ноября')
			month = '11';
		else if(month == 'декабря')
			month = '12';

		return getParam(day+'.'+month+'.'+ year, null, null, null, replaceTagsAndSpaces, parseDate);
	}
	else
		AnyBalance.trace('Failed to parse date from ' + str);
}

