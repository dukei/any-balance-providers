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
	var baseurl = 'http://brsm-plus.com/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'personal.html', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'personal.html', {
		login_user: prefs.login,
		login_pass: prefs.password,
	}, addHeaders({Referer: baseurl + 'personal.html'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="messages">((?:[\s\S]*?<\/div[^>]*>){2})/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Стoрiнка тимчасoвo недoступна/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Всього балів[^>]*>[^>]*discount_all[^>]*>([\s\S]*?)<div class="clear"/i, [/\D/ig, ''], parseBalance);
	getParam(html, result, 'next', /До наступного рівня[^>]*>[^>]*discount_next[^>]*>([\s\S]*?)<div class="clear"/i, [/\D/ig, ''], parseBalance);
	
	AnyBalance.setResult(result);
}