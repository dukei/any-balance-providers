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
	var baseurl = 'https://my.alden.in.ua/billing/userstats/';
	AnyBalance.setDefaultCharset('windows-1251');
	AnyBalance.restoreCookies();
	
	var html=AnyBalance.requestGet(baseurl,g_headers);
	if (!/(Проф[іи]ль)/i.test(html)) {
		clearAllCookies();
		AnyBalance.saveData();
		var html=AnyBalance.requestPost(baseurl+'index.php', {
		ulogin: prefs.login,
		upassword: prefs.password
		},g_headers);
	
		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}
		var html=AnyBalance.requestGet(baseurl,g_headers);
		if (!/(Проф[іи]ль)/i.test(html)) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}
	

	var result = {success: true};

	getParam(html, result, 'balance', /Баланс<[\w\W]*?(<td[\w\W]*?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тариф<[\w\W]*?(<td[\w\W]*?<\/td>)/i, replaceTagsAndSpaces);
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	AnyBalance.setResult(result);
}
