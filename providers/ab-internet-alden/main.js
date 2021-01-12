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
	var baseurl = 'http://alden.pp.ua:1010/index.cgi';
	AnyBalance.setDefaultCharset('windows-1251');
	var html=AnyBalance.requestPost(baseurl, {
        DOMAIN_ID: '',
	REFERRER: 'http://alden.pp.ua:1010/',
	language: 'russian',
	user: prefs.login,
	passwd: prefs.password,
	logined:'Войти'
	},g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	if (!/(Лицевой счет|Особовий рахунок):/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	getParam(html, result, 'balance', /Депозит(?:[^>]*>){2}([\s\S]*?)грн/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тарифный план:\<\/td\>\<td\>([\s\S]*?)\<\/td\>/i, replaceTagsAndSpaces);
	AnyBalance.setResult(result);
}
