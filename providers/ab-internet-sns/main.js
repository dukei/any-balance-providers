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
	var baseurl = 'http://sns.net.ua/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cgi-bin/new_stat/ustat.cgi?mode=user_profile', addHeaders({
		Authorization: 'Basic ' + Base64.encode(prefs.login + ':' + prefs.password)
	}));

	if(AnyBalance.getLastStatusCode() === 401)
		throw new AnyBalance.Error('Неверный логин или пароль', null, true);

	if(/Для продолжения работы в Личном Кабинете/i.test(html)){
		var params = createFormParams(html, function(params, str, name, value){
			return value;
		});

		html = AnyBalance.requestPost(baseurl + 'cgi-bin/new_stat/ustat.cgi?mode=user_profile', params, addHeaders({
			Authorization: 'Basic ' + Base64.encode(prefs.login + ':' + prefs.password),
			Referer: baseurl + 'cgi-bin/new_stat/ustat.cgi?mode=user_profile'
		}));
	}

	if (!/Общая информация/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Текущее состояние счета([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Владелец[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Состояние:?([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'accnum', /Лицевой счет:?([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}