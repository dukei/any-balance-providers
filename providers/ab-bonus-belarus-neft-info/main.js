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
	
	var baseurl = 'http://www.belorusneft.by/';
	AnyBalance.setDefaultCharset('windows-1251');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'rcp/rests_light/logon.asp', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'rcp/rests_light/logon.asp', {
		'action': 'logon',
		iContrCode: prefs.login,
		iPasswd: prefs.password,
		iEmtCode: prefs.predpr
	}, addHeaders({Referer: baseurl + 'rcp/rests_light/logon.asp'}));

	if (!/Движение средств по договору/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	var result = {success: true};
	
	getParam(html, result, 'fio', /Клиент[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /(?:[\s\S]*?<div[^>]*class="ttxt2"[^>]*>[^>]*b>([^<]+)<\/b>){2}/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}