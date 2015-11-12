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
	var baseurl = 'https://www.gkh-kemerovo.ru/portal/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var hintPage = AnyBalance.requestPost(baseurl + 'hint.php', {
		t:'street'
	})

	var treadValue = getParam(hintPage, null, null, /(\d+)$/i, replaceTagsAndSpaces);


	html = AnyBalance.requestPost(baseurl+'index.php', {
		logintype:	'1',
		fit: 'user',
		lc: prefs.login,
		passwordlc: prefs.password,
		tread: treadValue,
		'Remember': 'false'
	}, addHeaders({Referer: baseurl + 'index.php'}));


	if (!/\?s=exit/i.test(html)) {
		var error = getParam(html, null, null, /id=["']el["'][^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error, null, /Неверный логин\/пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
	}

	var result = {success: true};

	getParam(html, result, 'balance', /<td[^>]*>(?:(?!<\/?td>)[\s\S])*?вашего счета((?:(?!<\/?td>)[\s\S])*?)<\/td>/i, [[ /(задолженность:)/i, '-'], replaceTagsAndSpaces], parseBalance);
	getParam(html, result, 'acc_num', /Лицевой счет[\s\S]*?<\/big>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'adress', /<big[^>]*>\(([\s\S]*?)\)[\s\S]*?<\/big>/i);

	html = AnyBalance.requestGet(baseurl+'index.php?show=param', g_headers);

	getParam(html, result, 'fio', /name=["']lgn["'][\s\S]*?value=['"]([\s\S]*?)['"][^>]*>/i)
	AnyBalance.setResult(result);
}