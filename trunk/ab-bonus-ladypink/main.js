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
	var baseurl = 'http://www.podrygka.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	checkEmpty((''+prefs.login).length === 13 && (''+prefs.login).substring(0, 4) === "2977", 'Введен некорректный номер карты. Пожалуйста, проверьте правильность ввода!');
	
	var html = AnyBalance.requestGet(baseurl + 'check-savings/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ajax/savings.php', {
		card: prefs.login
	}, addHeaders({Referer: baseurl + 'check-savings', 'X-Requested-With': 'XMLHttpRequest'}));
	
	var result = {success: true};

	// По указанному номеру карты данных о покупках за текущий и предыдущий месяц нет.
	if(/ERROR/.test(html)){
		getParam('0', result, 'balance', null, null, parseBalance);
		getParam('0', result, 'discount', null, null, parseBalance);
	} else {
		throw new AnyBalance.Error('Данные по карте получены, пожалуйста, обратитесь к разработчикам для доработки провайдера!');	
	}

	// getParam(text, result, 'balance', /покупки на сумму([^<]+)коп/i, [replaceTagsAndSpaces, /руб/i, ''], parseBalance);
	// getParam(text, result, 'discount', /составляет([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	// getParam(text, result, 'text');
	
	AnyBalance.setResult(result);
}