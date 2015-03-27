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

function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин в Яндекс.Деньги!');
	checkEmpty(prefs.password, 'Введите пароль, используемый для входа в систему Яндекс.Деньги. Не платежный пароль, а именно пароль для входа!');
	
	AnyBalance.setDefaultCharset('UTF-8');
	
	var baseurl = 'https://money.yandex.ru/';
	
	var html = AnyBalance.requestGet("https://passport.yandex.ru", g_headers);
	
	html = loginYandex(prefs.login, prefs.password, html, baseurl + 'index.xml', 'money');
	
	if (!/user__logout/i.test(html))
		throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /Номер кошелька(?:[^>]*>){2}(\d{10,20})/i, replaceTagsAndSpaces);
	getParam(result['__tariff'], result, 'number');
	getParam(html, result, 'balance', /b-sum__amount[^>]*>\s*([-\d,.]+)<\/span>/i, replaceTagsAndSpaces, parseBalance);

	// if(/sum__amount[^>]*>\s*\*{3}/i.test(html)) {
	//     AnyBalance.trace('Сумма спрятана. Будем пытаться найти...');
	// 	var text = AnyBalance.requestGet(baseurl + "tunes.xml", g_headers);
	// 	var sk = getParam(text, null, null, /name="sk"[^>]*value="([^"]+)/i, replaceTagsAndSpaces);
	// 	if(!sk){
	// 		AnyBalance.trace(html);
	// 		throw new AnyBalance.Error('Не удаётся найти ключ для получения баланса! Сайт изменен?');
	// 	}
		
	// 	text = AnyBalance.requestGet(baseurl + "internal/index-ajax.xml?action=updateSumVisibility&sk=" + sk + "&showSum=1", addHeaders({Referer: baseurl, 'X-Requested-With':'XMLHttpRequest'}));
	// 	var json = getJson(text);
	//     getParam('' + json.sum, result, 'balance', null, null, parseBalance);
	// } else {
	//     getParam(html, result, 'balance', /balance[^>]*button(?:[^>]*>){3}[^>]*amount[^>]*>([\s\S]*?)<d/i, replaceTagsAndSpaces, parseBalance);
	// }
	
	AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /([\s\S]*)руб/i, replaceTagsAndSpaces, parseBalance);
    var kop = getParam(text, null, null, /((?:[\s\S](?!руб))*)коп/i, [/руб\.?/i, '', replaceTagsAndSpaces], parseBalance);
    var val;
    if(isset(rub) || isset(kop)){
    	val = (rub || 0) + (kop || 0)/100;
    }
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}