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
	var baseurl = 'https://my.khvschool.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'index.php', {
		auth_ok: 1,
		uidn: prefs.login,
		upswd: prefs.password
	}, addHeaders({Referer: baseurl + 'index.php'}));
	
	if (!/\?exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="blinkingDiv"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Не верный Код\/№ л\/с/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'accnum', /Добрый день! Л\/С:([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

	if(isAvailable(['food_offerta', 'food_offerta_date', 'food_balance'])){
		html = AnyBalance.requestGet(baseurl + 'index.php?pays', g_headers);

		getParam(html, result, 'food_offerta', /Оферта на питание(?:[^>]*>\s*){5}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'food_offerta_date', /#last_accm_dt'\)\.html\('на <b>([^<]+)/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'food_balance', /Лимит на питание(?:[^>]*>\s*){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);		
	}
	
	AnyBalance.setResult(result);
}