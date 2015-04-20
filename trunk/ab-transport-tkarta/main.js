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
	var baseurl = 'https://t-karta.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');
	
	var html = AnyBalance.requestGet(baseurl + 'ek/SitePages/default.aspx', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	var captchaKey, captchaHtml, captchaSrc, captcha;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		captchaHtml = AnyBalance.requestGet(baseurl + '/ek/SitePages/Captcha.aspx');
		captchaSrc = getParam(captchaHtml, null, null, /src="(CaptchaImage\.axd[^"]+)/i);
		captcha = AnyBalance.requestGet(baseurl + captchaSrc);
		if(!captcha)
			throw new AnyBalance.Error('Не удалось получить капчу! Попробуйте обновить данные позже.');
		captchaKey = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaKey);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}

	var params = createFormParams(captchaHtml, function(params, str, name, value) {
		return value;
	});
	params.txtAnswer = captchaKey
	
	html = AnyBalance.requestPost(baseurl + 'ek/SitePages/Captcha.aspx', params, addHeaders({
		Referer: baseurl + 'ek/SitePages/default.aspx',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	if(!/Верно!/.test(html)){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не верный код с картинки.');
	}

	var now = new Date();
	var formattedDate = [('0' + now.getDay()).substr(-2), ('0' + (now.getMonth() + 1)).substr(-2), now.getFullYear()].join('.');

	html = AnyBalance.requestGet(baseurl + 'ek/SitePages/TransportServicePage.aspx?functionName=GetCardInfo&pan=' + prefs.login + '&dateFrom=' + formattedDate + '&dateTo=' + formattedDate, 
		addHeaders({Referer: baseurl + 'Pages/default.aspx', 'X-Requested-With': 'XMLHttpRequest'}));
	
	try {
		var json = getJson(html);
	} catch(e) {
		throw new AnyBalance.Error('Проверьте номер карты. Возмоджно сайт изменился.');
	}

	var result = {success: true};
	
	getParam(json.CardSum / 100, result, 'balance');
	getParam(json.EndDate, result, 'deadline', null, replaceTagsAndSpaces, parseDate);
	getParam(json.TicketTypeDesc, result, '__tariff');
	
	AnyBalance.setResult(result);
}