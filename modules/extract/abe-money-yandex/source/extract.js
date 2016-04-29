/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.72 Safari/537.36'
};

var baseurl = 'https://money.yandex.ru/';

function loginAndGetBalance(prefs, result) {
	checkEmpty(prefs.login, 'Введите логин в Яндекс.Деньги!');
	checkEmpty(prefs.password, 'Введите пароль, используемый для входа в систему Яндекс.Деньги. Не платежный пароль, а именно пароль для входа!');
	
	AnyBalance.setDefaultCharset('UTF-8');
	
	var html = AnyBalance.requestGet("https://passport.yandex.ru", g_headers);
	
	html = loginYandex(prefs.login, prefs.password, html, baseurl + 'index.xml', 'money');
	
	if (!/user__logout/i.test(html))
		throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");
	
	getParam(html, result, 'number', /Номер кошелька(?:[^>]*>){2}(\d{10,20})/i, replaceTagsAndSpaces);
	
	var textsum = getParam(html, result, 'balance', /(?:price|sum)__amount[^>]*>([\s\S]*?)<\/span>\s*<\/span>/i, replaceTagsAndSpaces);
	AnyBalance.trace('Предположительно баланс где-то здесь: ' + textsum);

	if(/\*{3}/.test(textsum)) {
	    AnyBalance.trace('Сумма спрятана. Будем пытаться найти...');
		var text = AnyBalance.requestGet(baseurl + "tunes.xml", g_headers);
		var sk = getParam(text, null, null, /name="sk"[^>]*value="([^"]+)/i, replaceTagsAndSpaces);
		if(!sk){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удаётся найти ключ для получения баланса! Сайт изменен?');
		}
		
		text = AnyBalance.requestGet(baseurl + "ajax/sum-visibility?sk=" + sk + "&flag-hide-sum=false", addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
		var json = getJson(text);
	    getParam('' + json.sum, result, 'balance', null, null, parseBalance);
	    AnyBalance.trace('Скрываем баланс обратно, чтобы стало, как было...');
		AnyBalance.requestGet(baseurl + "ajax/sum-visibility?sk=" + sk + "&flag-hide-sum=true", addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	} else {
	    getParam(textsum, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	}
}

function processHistory(result) {
	if(!AnyBalance.isAvailable('transactions'))
		return;
	
	var maxCount = 100;
	var startCount = 0;

	result.transactions = [];
	
	for(var z=1; z<=10; z++) {
		var html = AnyBalance.requestGet(baseurl + 'ajax/history/partly?ncrnd=72010&history_shortcut=history_all&start-record=' + startCount + '&record-count=' + maxCount, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
		startCount +=maxCount;
		var json = getJson(html);		
		
		AnyBalance.trace('Найдено транзакций: ' + json.history.length);
		for(var i=0; i < json.history.length; ++i) {
			var h = {};
			
			getParam((json.history[i].type == 2 ? '-' : '') + json.history[i].sum + '', h, 'transactions.sum', null, replaceTagsAndSpaces, parseBalance);
			getParam(json.history[i].name, h, 'transactions.name', null, replaceTagsAndSpaces, html_entity_decode);
			getParam(json.history[i].date, h, 'transactions.time', null, replaceTagsAndSpaces, parseDateISO);
			
			result.transactions.push(h);
		}
		if(!json.hasMore) {
			AnyBalance.trace('Транзакций больше нет...');	
			break;
		}
	}
}