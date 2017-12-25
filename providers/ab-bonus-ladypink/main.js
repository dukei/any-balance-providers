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
	var baseurl = 'https://www.podrygka.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	checkEmpty((''+prefs.login).length === 13 && (''+prefs.login).substring(0, 4) === "2977", 'Введен некорректный номер карты. Пожалуйста, проверьте правильность ввода!');
	
	var html = AnyBalance.requestGet(baseurl + 'discount/', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'local/templates/.default/components/girlfriend/discount.card.check/gf.17.0.modal/ajax.php', {
        number: prefs.login
	}, addHeaders({
		Referer: baseurl + 'discount/',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var result = {success: true};

	// По указанному номеру карты данных о покупках за текущий и предыдущий месяц нет.
	if(/ERROR/.test(html)){
		getParam('0', result, 'balance', null, null, parseBalance);
		getParam('0', result, 'discount', null, null, parseBalance);
		getParam('0', result, 'currentBalance', null, null, parseBalance);
		getParam('0', result, 'futureDiscount', null, null, parseBalance);
	} else {
		var rows = getElementsByClassName(html, 'info-row');

		getDiscount(rows[0], result, 'balance', 'discount');
		getDiscount(rows[1], result, 'currentBalance', 'futureDiscount');
	}
	
	AnyBalance.setResult(result);
}

function getDiscount(html, result, balancePar, discountPar){
	getParam(html, result, balancePar, /<span[^>]*class="large">([^<]*)</i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, discountPar, /<div class="[^"]*circle--small"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
}