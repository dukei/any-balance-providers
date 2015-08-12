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

function getToken(html){
	return getParam(html, null, null, /<input[^>]+type="hidden"[^>]*value="([^"]*)/i, null, html_entity_decode);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://siplink.pro/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'auth', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'src/ajaxPublic.php', {
		action: 'authorization',
		authLogin: prefs.login,
		authPassword: prefs.password,
		token: getToken(html)
	}, addHeaders({Referer: baseurl + 'auth', 'X-Requested-With': 'XMLHttpRequest'}));

	var json = getJson(html);
	
	if (!json.refreshHREF) {
		var error = getParam(json.messages && json.messages.join(', '), null, null, null, [/error\s*,\s*/ig, '', replaceTagsAndSpaces]);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestGet(baseurl + json.refreshHREF, g_headers);

	var result = {success: true};
	
	getParam(html, result, 'balance', /<span[^>]+id="userCashInfo"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'id', /ID:([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

	html = AnyBalance.requestPost(baseurl + 'src/ajaxSection.php', {
		action: 'showSection',
		section: 'homeTarif',
		token: getToken(html)
	}, addHeaders({Referer: baseurl + 'auth', 'X-Requested-With': 'XMLHttpRequest'}));

	json = getJson(html);
	html = json.updateElements[0].join('\n');

	getParam(html, result, 'abon', /thisAbonPrice="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	sumParam(html, result, '__tariff', /<label[^>]+class="unlinkNumber"[^>]*>([\s\S]*?)<\/label>/ig, [/отключить/ig, '', replaceTagsAndSpaces], html_entity_decode, aggregate_join);
	
	AnyBalance.setResult(result);
}