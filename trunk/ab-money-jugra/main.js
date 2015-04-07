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
	var baseurl = 'https://jugra.handybank.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;
		return value;
	});
	
	html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl}));
	
	if (!/exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный пароль|Неверный Handy-номер или код доступа/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	var entities = sumParam(html, null, null, /<tr[^>]*class="(?:account|last)"[^>]*>[^]+?<\/tr>/ig);
	var entity;

	if(prefs.num){
		if(!/\d{4}/i.test(prefs.num))
			throw new AnyBalance.Error('Необходимо ввести последние 4 цифры счета, либо не вводить ничего!');
		for(var i = 0, toi = entities.length; i < toi; i++)
			if(new RegExp(prefs.num + '\\b' , 'i').test(entities[i]))
				entity = entities[i];
	} else {
		entity = entities[0];
	}

	if(!entity)
		throw new AnyBalance.Error('Не удалось найти ' + (!prefs.num ? 'ни одного счета' : 'счета с поледними цифрами ' + prefs.num) + '. Сайт изменен?');
	
	
	getParam(entity, result, 'balance', /(?:<td[^>]*>[^]*?<\/td>){2}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(entity, result, ['currency', 'balance'], /(?:<td[^>]*>[^]*?<\/td>){2}(<td[^>]*>[^]*?<\/td>)/i, replaceTagsAndSpaces, parseCurrency);
	
	AnyBalance.setResult(result);
}