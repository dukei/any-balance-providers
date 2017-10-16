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
	var baseurl = 'https://support.selectel.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 402){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login/', {
		login: prefs.login,
		password: prefs.password,
	}, AB.addHeaders({Referer: baseurl}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var info = getJsonObject(html, /var\s+client_info\s*=/i);
	if(!info) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию по пользователю. Сайт изменен?');
	}
	
	getParam(getJsonObjSafe(info, ['cloud', 'balance']), result, 'cloudBalance', null, AB.replaceTagsAndSpaces, parseBalanceDivision);
	getParam(getJsonObjSafe(info, ['storage', 'balance']), result, 'storageBalance', null, AB.replaceTagsAndSpaces, parseBalanceDivision);
	getParam(getJsonObjSafe(info, 'balance'), result, 'Balance', null, AB.replaceTagsAndSpaces, parseBalanceDivision);
	getParam(getJsonObjSafe(info, 'vk_balance'), result, 'vkBalance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
	getParam(getJsonObjSafe(info, 'id'), result, 'id', null, AB.replaceTagsAndSpaces);
	getParam(getJsonObjSafe(info, 'username'), result, 'username', null, AB.replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}

function parseBalanceDivision(str) {
	var val = AB.parseBalance(str + '');
	
	if(isset(val))
		return val/100;
}