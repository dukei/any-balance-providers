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
	var baseurl = 'http://lk.spbinfinity.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(/^u\d+$/.test(prefs.login), 'Введите логин с префиксом u, напрмер u1234!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'submit.php', {
		user_login: prefs.login,
		user_pass: prefs.password,
		app: 'app'
	}, addHeaders({
		Referer: baseurl + 'index.php',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json;

	try{ json = getJsonEval(html); }catch(e){};

	if(!json || json.status !== 1){
		if(json.status === 0)
			throw new AnyBalance.Error(json.txt, null, /Неверный логин или пароль/i.test(json.txt));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + json.txt.replace(/^\.\//, ''), g_headers);

	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /balanceAll[^>]*>\s*<span[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'accnum', /Номер договора:[^>]*>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[^>]*>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'abon', /Абонентская плата:[^>]*>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'blocking', /Блокировка через:[^>]*>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'prom', /Обещанный платёж:[^>]*>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', /Статус интернет:[^>]*>\s*<td[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}