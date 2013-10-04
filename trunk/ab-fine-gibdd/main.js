/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://www.gibdd.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + 'check/fines/');

	var form = getParam(html, null, null, /(<form method="POST" id="tsdataform"[\s\S]*?<\/form>)/i);
	if(!form){
		// Попробуем объяснить почему
		if(/Работа сервиса проверки[^<]*временно приостановлена/i.test(html))
			throw new AnyBalance.Error('Работа сервиса временно приостановлена! Попробуйте зайти позже');
		throw new AnyBalance.Error('Не удалось найти форму для запроса!');
	}
	checkEmpty(prefs.login, 'Введите гос. номер!');
	checkEmpty(prefs.password, 'Введите номер свидетельства о регистрации!');
	
	var params = createFormParams(form);

	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		html = AnyBalance.requestPost(baseurl+ 'bitrix/templates/.default/components/nilsrus/basic/check.fines.v1.1/ajax/captchaReload.php', {}, addHeaders( {
			'X-Requested-With':'XMLHttpRequest',
			'Referer':baseurl+'check/fines/',
		}));
		params.captchaCode = getParam(html, null, null, /code":"([^"]*)/i);
		var captcha = AnyBalance.requestGet(baseurl+ 'bitrix/tools/captcha.php?captcha_sid=' + params.captchaCode);
		params.captchaWord = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + params.captchaWord);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	var found = /(\D{0,1}\d+\D{2})(\d{2,3})/i.exec(prefs.login);
	if(!found)
		throw new AnyBalance.Error('Введеный гос. номер не соответствует формату а351со190');

	params.regnum = found[1];
    params.regreg = found[2];
	params.stsnum = prefs.password;
	AnyBalance.trace('Пробуем запросить информацию с данными: '+prefs.login+', ' + prefs.password);
	
	html = AnyBalance.requestPost(baseurl + 'bitrix/templates/.default/components/nilsrus/basic/check.fines.v1.1/ajax/checker.php', params, addHeaders({
		'X-Requested-With':'XMLHttpRequest',
		'Referer':baseurl+'check/fines/'
	}));
	
	try {
		var json = getJson(html);
	}
	catch(e) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию, свяжитесь с разработчиком провайдера');
	}
	var result = {success: true, balance:0 };
	
	if(json.status == 1)
		throw new AnyBalance.Error('Не верно введены символы с картинки');
	
	if(json.request.error == 1)
		throw new AnyBalance.Error('Указанное Вами свидетельство о регистрации транспортного средства не соответствует государственным регистрационным знакам. Вероятно, Вами допущена ошибка при заполнении полей запроса.');

	else if(json.request.error > 0) 
		throw new AnyBalance.Error('Неизвестный код ошибки: ' + json.request.error);
		
	AnyBalance.trace('Штрафов: ' + json.request.count);
	if(json.request.count > 0) {
		for(var i = 0; i< json.request.count; i++){
			var curr = json.request.data[i];
			sumParam(curr.Summa+'', result, 'balance', null, null, parseBalance, aggregate_sum);
		}
		getParam(curr.DateDecis+'', result, 'date', null, null, parseDateISO);
		getParam(json.request.count+'', result, 'count', null, null, html_entity_decode);
		getParam(curr.KoAPtext.toUpperCase().substring(0,1) + curr.KoAPtext.toLowerCase().substring(1), result, 'descr', null, null, html_entity_decode);
		getParam(curr.KoAPcode, result, 'koap', null, replaceTagsAndSpaces, html_entity_decode);
		getParam(json.request.DivList[curr.Division]+'', result, 'podrazdel', null, null, html_entity_decode);
		getParam(curr.NumPost, result, 'postanovlenie', null, null, html_entity_decode);
		getParam(curr.Summa+'', result, 'summ', null, null, parseBalance);
	// Нет штрафов
	} else {
		result.descr = result.koap = result.podrazdel = result.postanovlenie = 'В базе данных отсутствует информация о неуплаченных штрафах по Вашему запросу';
		result.count = result.summ = 0;
	}
	
	result.__tariff = prefs.login.toUpperCase();
    AnyBalance.setResult(result);
}