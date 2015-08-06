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
	var baseurl = 'http://login.gvoip.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'reg/aut.php', {
		login:prefs.login,
		pass:prefs.password,
		submit: 'Войти'
	},g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	if (!/<FRAME[^>]+NAME="topframe"/i.test(html)) {
		var error = getParam(html, null, null, /<big2[^>]*>([\s\S]*?)<\/big2>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + 'usr/info.php', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тарифный план:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'sipid', /SIP ID[\s\S]*?<b[^>]*>([\s\S]*?)(?:<br|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'access', /Доступ из города Москва:\s*(?:тел.)?([\s\S]*?)(?:<br|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'status', /Статус аккаунта:([\s\S]*?)(?:<br|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}