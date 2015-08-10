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

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://rucaptcha.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.email, 'Введите e-mail!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var	html = AnyBalance.requestGet(baseurl+'/ru/cabinet');	
	html = AnyBalance.requestPost(baseurl +'/auth', {
		email: prefs.email,
		password: prefs.password,
		auth_redirect:''});
	if (!/Профиль/i.test(html)){
		var error = getParam(html, null, null, /<div[^>]+class="error">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (/заблокирован/i.test(html)) error=html;
		if (error) throw new AnyBalance.Error(error, null, /Неверные логин или пароль/i.test(error));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	getParam(html, result, 'balance', /Баланс: <b>(.*) р/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'reputation', /Репутация.*<b>(.*) </i, replaceTagsAndSpaces, parseBalance);
	html = AnyBalance.requestGet(baseurl+'/auth/logout');
	AnyBalance.setResult(result);

}