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
	var baseurl = 'https://cabinet.poig.ru/user/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'login', {
		username: prefs.login,
		password: prefs.password,
		'enter': 'Войти'
	}, addHeaders({Referer: baseurl + 'login'}));
	
	if (!/logout/i.test(html)) {
		var error = getElements(html, [/<div[^>]+class="bubble3"[^>]*>/ig, /<font[^>]+color="red"/i])[0];
		if (error){
			error = html_entity_decode(replaceAll(error, replaceTagsAndSpaces));
			throw new AnyBalance.Error(error, null, /присутствуют недопустимые символы|логин или пароль/i.test(error));
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'agreement', />\s*Номер договора[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'ip', />\s*Основной IP-адрес[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', />\s*Тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fio', />\s*Полное имя[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', />\s*Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'blocked', />\s*Заблокирован[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'credit', />\s*Кредит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	var selectStatus = getParam(html, null, null, /<select[^>]+name="int_status"[\s\S]*<\/select>/i);
	getParam(selectStatus, result, 'status', /<option[^>]+selected[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);

	getParam(html, result, 'trafficIn', /Входящий:([\s\S]*?)(?:<br|<\/p)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'trafficOut', /Исходящий:([\s\S]*?)(?:<br|<\/p)/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'trafficLeft', /Остаток:([\s\S]*?)(?:<br|<\/p)/i, replaceTagsAndSpaces, parseTraffic);
	
	AnyBalance.setResult(result);
}