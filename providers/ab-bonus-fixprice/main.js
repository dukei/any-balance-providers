
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


function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://fix-price.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var grc_response = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', baseurl, '6LcxEwkUAAAAAHluJu_MhGMLI2hbzWPNAATYetWH');

	html = AnyBalance.requestPost(baseurl + 'ajax/crm1.php', {
		mail: prefs.login,
		pass: prefs.password,
		uri: '/',
		recaptcha: grc_response,
		action: /@/.test(prefs.login) ? 'auth_by_email' : 'auth_by_phone'
	}, AB.addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		Referer: baseurl
	}));


	if(html != '0'){
		if(html == '1')
			throw new AnyBalance.Error('Неправильный логин или пароль', null, true);
	    
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	if(/062139c3908199a.png/i.test(html))
		throw new AnyBalance.Error('FixPrice временно приостановил бонусную программу. Более подробная информация на https://bonus.fix-price.ru/rules#bt_regulations1');

	var result = {
		success: true
	};

	if(AnyBalance.isAvailable('fio')){
		html = AnyBalance.requestGet(baseurl + 'account/', g_headers);
		AB.getParam(html, result, 'fio', /Здравствуйте,([\s\S]*?)<\/h1>/i, AB.replaceTagsAndSpaces);
	}

	if(AnyBalance.isAvailable('balance', 'card')){
		html = AnyBalance.requestGet(baseurl + 'account/bonuses/', g_headers);
	    
		AB.getParam(html, result, 'balance', /У меня накоплено(.*?)балл/i, AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'card', /на\s+вашей\s+карте\s+№([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);
	}

	AnyBalance.setResult(result);
}
