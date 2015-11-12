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
	var baseurl = 'http://jet.kg/jet/';
	AnyBalance.setDefaultCharset('Windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestGet(baseurl + 'balance_show.php?bill_type=2&acc_id=' + prefs.login)
	
	if (!/Состояние лицевого счёта/i.test(html)) {
		if(/номер не найден/i.test(html))
			throw new AnyBalance.Error('Лицевой счёт не найден.', null, true);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию по счету. Сайт изменен?');
	}

	var result = {success: true};
	
	getParam(html, result, 'balance', /<div[^>]+?class="balans"[^>]*>[\s\S]*?Состояние\s+лицевого\s+счёта[\s\S]*?<\/div>/i , replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}