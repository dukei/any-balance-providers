
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
	var baseurl = 'https://bonus.fix-price.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'ulogin', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var grc_response = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', baseurl, '6LcxEwkUAAAAAHluJu_MhGMLI2hbzWPNAATYetWH');

	html = AnyBalance.requestPost(baseurl + 'crm_cabinet_api/auth', JSON.stringify({
		captcha: {
			class_type: 'GoogleRecaptcha',
			g_recaptcha_response: grc_response
		},
		login: prefs.login,
		password: prefs.password,
		remember: true
	}), AB.addHeaders({
		'Content-Type': 'application/json',
		Referer: baseurl + 'ulogin'
	}), {HTTP_METHOD: 'PUT'});

	var json = AB.getJson(html);

	if (!json.authorized) {
		var error = json.reason;
		if(json.reason == 'credentials not suitable')
			error = 'Неверный логин или пароль';
		if (error) {
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	var join_space = create_aggregate_join(' ');
	if(AnyBalance.isAvailable('fio')){
		html = AnyBalance.requestGet(baseurl + 'crm_cabinet_api/anketa', g_headers);
		json = getJson(html);
		AB.sumParam(json.last_name, result, 'fio', null, null, null, join_space);
		AB.sumParam(json.first_name, result, 'fio', null, null, null, join_space);
		AB.sumParam(json.middle_name, result, 'fio', null, null, null, join_space);
	}

	if(AnyBalance.isAvailable('balance')){
		html = AnyBalance.requestGet(baseurl + 'crm_cabinet_api/balance', g_headers);
		json = getJson(html);
		AB.getParam(json.active/100, result, 'balance');
		AB.getParam(json.inactive/100, result, 'balance_inactive');
	}

//	AB.getParam(html, result, 'card', /на\s+вашей\s+карте\s+№([\s\S]*?)<\/p>/i, AB.replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
