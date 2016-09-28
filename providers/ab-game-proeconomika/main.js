/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://proeconomica.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'login/go', g_headers);
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'login/go', {
		email: prefs.login,
		pass: prefs.password,
		login_btn: 'Login'
	}, addHeaders({Referer: baseurl + 'login/go'}));
	
	if (!/logout/i.test(html)) {
		var error = AB.getParam(html, null, null, /"log_error"([^>]*>){2}/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /E-mail or password do not match/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

	AB.getParam(html, result, 'gold',    /<div[^>]+class="gold"[^>]*>(?:[\s\S]*?<span[^>]*>){3}([^<]*)/i,   AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'eco',     /<div[^>]+class="eco"[^>]*>(?:[\s\S]*?<span[^>]*>){3}([^<]*)/i,    AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'budget',  /<div[^>]+class="stocks"[^>]*>(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'day',     /"currentDay"([^>]*>){2}/i, 									    AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'user_health', /<div[^>]+id="userHealth"[^>]*>(?:[\s\S]*?<div[^>]*>){2}([^<]*)/i,        AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'energy',      /<div[^>]+class="energy ongoing"[^>]*>(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AB.getParam(html, result, 'productivity', /<div[^>]+class="user-stats"[^>]*>(?:[\s\S]*?<li[^>]*>){1}(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'efficiency',   /<div[^>]+class="user-stats"[^>]*>(?:[\s\S]*?<li[^>]*>){2}(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'happiness',    /<div[^>]+class="user-stats"[^>]*>(?:[\s\S]*?<li[^>]*>){3}(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'culture',      /<div[^>]+class="user-stats"[^>]*>(?:[\s\S]*?<li[^>]*>){4}(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'education',    /<div[^>]+class="user-stats"[^>]*>(?:[\s\S]*?<li[^>]*>){5}(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'prestige',     /<div[^>]+class="user-stats"[^>]*>(?:[\s\S]*?<li[^>]*>){6}(?:[\s\S]*?<span[^>]*>){2}([^<]*)/i, AB.replaceTagsAndSpaces, AB.parseBalance);




	AnyBalance.setResult(result);
}