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
	var baseurl = 'http://travel.vtb24.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + '_api/vtb/authenticate/', {
		id: prefs.login,
		password: prefs.password,
		'source': 'vtb24'
	}, addHeaders({Referer: baseurl}));

	var json = getJson(html);

	if (json.error) {
		var error = json.error ? json.error.name : undefined;
		//Здесь у них хранятся расшифровки ошибок
		var rusJson = getJson(AnyBalance.requestGet('http://travel.vtb24.ru/app/js/translations/translation_ru.json', g_headers));
		if (error)
			throw new AnyBalance.Error(rusJson.ERRORS[error], null, /(NoSuchUser|WrongAuthParams)/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam((json.firstName || '') + ' ' + (json.midName || '') + ' ' + (json.lastName || ''), result, 'fio');
	html = AnyBalance.requestGet(baseurl+'_api/buyermanager/getUserInfo/?_='+ new Date().getTime()+'&source=vtb24');
	json = getJson(html);
	getParam((json.bonuses.total)/0.33, result, 'balance');

	AnyBalance.setResult(result);
}