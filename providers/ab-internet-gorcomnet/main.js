/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://statistics.gorcomnet.ru:7778/";

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login.jsp', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login.jsp', {
        p_logname: prefs.login,
        p_pwd: prefs.password
	}, addHeaders({Referer: baseurl + 'login.jsp'}));
	
	if (!/exit\.jsp/i.test(html)) {
		var error = getParam(html, null, null, /<p[^>]*class=['"]hi['"][^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Проверьте логин и пароль/i.test(error));

		if(/<input[^>]+(?:id|name)="phone"/i.test(html))
			throw new AnyBalance.Error('Горком требует подтвердить ваш номер телефона. Зайдите в личный кабинет через браузер и подтвердите его.');
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
    var result = {success: true};

	getParam(html, result, 'balance', /<li>\s*Баланс:(?:<[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'days', /<li[^>]*>\s*Дней до блокировки:(?:<[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /Лицевой счет №\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);	
    getParam(html, result, 'credit', /Кредит[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'expences', /Расходы в текущем месяце[\s\S]*?<td[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Ваш тарифный план[^>]*&laquo;([^>]*)&raquo;/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')) {
        html = AnyBalance.requestGet(baseurl + 'stat.jsp');
		
        getParam(html, result, 'trafficIn', /Входящий Internet трафик[\s\S]*?<td[^>]*>([^<]*)/i, [replaceTagsAndSpaces, /([\s\S]*?)/, '$1 mb'], parseTraffic);
        getParam(html, result, 'trafficOut', /Исходящий Internet трафик[\s\S]*?<td[^>]*>([^<]*)/i, [replaceTagsAndSpaces, /([\s\S]*?)/, '$1 mb'], parseTraffic);
    }

    AnyBalance.setResult(result);
}