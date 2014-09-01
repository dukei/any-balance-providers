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
	var baseurl = 'http://norbi-tv.ru/licevoy-schet/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите Номер Вашего лицевого счета!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	
	var order_id = getParam(html, null, null, /name="oper_id"[^>]*value="([^"]+)/i);
	
	if(!order_id) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму запроса баланса, сайт изменен?');
	}
	
	html = AnyBalance.requestGet('http://atirra.com/get_balance.php?oper_id=' + order_id + '&account=' + prefs.login);
	
	var json = getJson(html);
	
	if (!json.result) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить данные. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(json.balance + '', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}