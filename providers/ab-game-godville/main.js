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

var baseurl = 'http://godville.net/';

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	if(prefs.login && !prefs.password) {
		AnyBalance.trace('Входим по имени Бога...');
		mainOld(prefs);
	} else {
		AnyBalance.trace('Входим по имени Бога и паролю...');
		mainNew(prefs);
		AnyBalance.trace('Авторизовались, переходим к получению данных...');
		mainOld(prefs);
	}
}

function mainNew(prefs) {
	checkEmpty(prefs.login, 'Введите ваше имя бога!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login/login', {
		username: prefs.login,
		password: prefs.password,
		'commit': 'Войти!'
	}, addHeaders({Referer: baseurl + 'login/login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
}

function mainOld(prefs) {
	checkEmpty(prefs.login, 'Введите ваше имя бога!');
	
	var pd = AnyBalance.requestGet(baseurl + 'gods/api/' + encodeURIComponent(prefs.login) + '.json');
	
	if(!pd)
		throw new AnyBalance.Error('Не удалось получить данные!');

	if(pd == 'Not found')
		throw new AnyBalance.Error('Герой не найден');
	
	var json = getJson(pd);

	if(json.health === undefined)
		AnyBalance.trace('API вернуло не все данные. Если хотите все данные, необходимо включить в профиле игры галочку "Оперативные данные в API"');

	var result = {success: true};

	getParam(json.name, result, '__tariff', null, replaceTagsAndSpaces);
	getParam(json.name, result, 'name', null, replaceTagsAndSpaces);
	getParam(json.level + '', result, 'level', null, replaceTagsAndSpaces);
	getParam(json.health + '', result, 'health', null, replaceTagsAndSpaces, parseBalance);
	getParam((json.health === undefined ? '?' : json.health) + '/' + json.max_health, result, 'health_t', null, replaceTagsAndSpaces);
	getParam(json.bricks_cnt/10 + '', result, 'bricks_p', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.bricks_cnt + '', result, 'bricks', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.godpower + '', result, 'godpower', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.wood_cnt ? (json.wood_cnt / 10) + '' : 0 + '', result, 'wood_p', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.wood_cnt + '', result, 'wood', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.inventory_num + '', result, 'inventory', null, replaceTagsAndSpaces, parseBalance);
	getParam(((json.health / json.max_health) * 100).toFixed(1) + '', result, 'health_p', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.exp_progress + '', result, 'level_p', null, replaceTagsAndSpaces, parseBalance);
	getParam(json.quest_progress + '', result, 'quest_p', null, replaceTagsAndSpaces, parseBalance);
	
	if(AnyBalance.isAvailable('savings')) {
		var html = AnyBalance.requestGet(baseurl + 'gods/' + encodeURIComponent(prefs.login));
		
		getParam(html, result, 'savings', /<td class="label">Сбережения<\/td>\s+?<td class="name">(\d+)/i, replaceTagsAndSpaces, parseBalance);
	}

	AnyBalance.setResult(result);

}