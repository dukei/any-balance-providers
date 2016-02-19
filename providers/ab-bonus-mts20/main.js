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

var g_baseurl = 'https://20.ssl.mts.ru/';

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://login.mts.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(/^.{10}$/.test(prefs.login), 'Введите номер телефона (10 цифр)!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 401){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = enterMTS({
		baseurl: g_baseurl,
		url: baseurl+'amserver/UI/Login?goto='+encodeURIComponent(g_baseurl+'#!/login'),
		login: prefs.login,
		password: prefs.password,
	});

	var result = {success: true};
	var json;

	if(isAvailable(['fio', 'balance'])) {
		html = AnyBalance.requestGet(g_baseurl+'api/user ', g_headers);
		json = getJson(html);

		getParam(json.fullName || undefined, result, 'fio');
		getParam(json.balance ? json.balance.toFixed(2) : undefined, result, 'balance', null, null, parseBalance);
	}
	if(isAvailable(['lastCharge', 'allAccrued', 'date'])) {
		html = AnyBalance.requestGet(g_baseurl+'api/user/history', g_headers);
		json = getJson(html);

		var sumAllAccured = 0;
		for(var i=0; i< json.length; i++)
			sumAllAccured +=json[i].value;
		result.allAccured = sumAllAccured;

		getParam(json[0] ? json[0].value + '' : undefined, result, 'lastCharge', null, null, parseBalance);
		getParam(json[0] ? json[0].date : undefined, result, 'date');
	}

	AnyBalance.setResult(result);

}