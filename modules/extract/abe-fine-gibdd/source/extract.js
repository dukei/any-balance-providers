/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Accept-Language':'ru,en;q=0.8',
	'Connection':'keep-alive',
	'Origin':'http://www.gibdd.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'
};

function getGibddJson(html){
	try {
		var json = getJson(html);
	} catch(e) {
		AnyBalance.trace(html);
		
		if(/При загрузке страницы произошла ошибка|Страницу загрузить не удалось/i.test(html))
			throw new AnyBalance.Error('Сайт временно работает с перебоями, попробуйте обновить данные позже.');
		
		throw new AnyBalance.Error('Не удалось получить информацию, свяжитесь, пожалуйста, с разработчиками.');
	}

	return json;
}

function requestFines(prefs) {
    var baseurlUser = 'https://xn--90adear.xn--p1ai/';
    var baseurl = 'http://check.gibdd.ru/';
    AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurlUser + 'check/fines/', g_headers);
	
	if (AnyBalance.getLastStatusCode() >= 400) {
		AnyBalance.trace('Server returned: ' + AnyBalance.getLastStatusString());
		throw new AnyBalance.Error('Сервис проверки штрафов временно недоступен, скоро все снова будет работать.');
	}

	checkEmpty(prefs.login, 'Введите гос. номер. Номер должен быть в формате а351со190 либо 1234ав199, буквы русские!');
	checkEmpty(prefs.password, 'Введите номер свидетельства о регистрации в формате 50ХХ123456!');
	var found = /(\D{0,1}\d+\D{2})(\d{2,3})/i.exec(prefs.login);
	if(!found)
		throw new AnyBalance.Error('Номер должен быть в формате а123вс190 либо 1234ав199, буквы русские.');
	
	var captcha = AnyBalance.requestGet(baseurl + 'proxy/captcha.jpg?', addHeaders({
		Referer: baseurlUser + 'check/fines/',
	}));
	if (AnyBalance.getLastStatusCode() >= 400) {
		AnyBalance.trace('Server returned for captcha: ' + AnyBalance.getLastStatusString());
		throw new AnyBalance.Error('Капча на сервисе штрафов временно недоступна, скоро все снова будет работать.');
	}
	if(!captcha)
		throw new AnyBalance.Error('Не удалось получить капчу. Временные проблемы на сайте или сайт изменен.');

	var captchaWord = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha, {inputType: 'number'});
	AnyBalance.trace('Капча получена: ' + captchaWord);
	
	var params2 = [
		['regnum',found[1].toUpperCase()],
		['regreg',found[2]],
		['stsnum',prefs.password.toUpperCase()],
		['captchaWord',captchaWord],
	];
	
	AnyBalance.trace('Пробуем запросить информацию с данными: '+prefs.login+', ' + prefs.password);
	
	html = AnyBalance.requestPost(baseurl + 'proxy/check/fines', params2, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Referer': baseurlUser + 'check/fines/',
		'Connection': 'keep-alive'
	}));
	
	var json = getGibddJson(html);
	
	return json;
}

function parseFines(result, json) {
	var code = json.code || json.status;
	if(code != 200) {
		var error = json.error || json.message;
		if(error)
			throw new AnyBalance.Error(error, null, code == 404);	
		
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error("Не удалось получить данные по штрафам, сайт изменен?");
	}
	
	if(!json.data) {
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error("Вероятно, Вами допущена ошибка при заполнении полей запроса.");
	}
	
	AnyBalance.trace('Штрафов: ' + json.data.length);
	
	if(json.data.length > 0) {
		result.fines = [];
		
		for(var i = 0; i< json.data.length; i++) {
			var curr = json.data[i];
			var fine = {__id: curr.id, __name: curr.NumPost};
			
			if(__shouldProcess('fines', fine)) {
				getParam(curr.Summa + '', fine, 'fines.summ', null, null, parseBalance);
				getParam(curr.SummaDiscount + '', fine, 'fines.summDiscount', null, null, parseBalance);

				getParam(curr.DateDecis + '', fine, 'fines.date', null, null, parseDateGibdd);
				getParam(curr.DateDiscount + '', fine, 'fines.dateDiscount', null, null, parseDateGibdd);
				getParam(curr.DatePost + '', fine, 'fines.datePost', null, null, parseDateGibdd);
				
				getParam(curr.KoAPcode, fine, 'fines.koap');
				getParam(curr.KoAPtext.toUpperCase().substring(0,1) + curr.KoAPtext.toLowerCase().substring(1), fine, 'fines.descr');
				getParam(curr.NumPost, fine, 'fines.postanovlenie');
				getParam(json.divisions[curr.Division].name, fine, 'fines.podrazdel');
			}
			
			result.fines.push(fine);
			sumParam(curr.Summa + '', result, 'balance', null, null, parseBalance, aggregate_sum);
		}
		getParam(json.data.length, result, 'count');
		// Нет штрафов
	} else {
		result.descr = 'Штрафов нет.';
		result.count = 0;
	}
}

/** Получает дату из строки, почему-то parseDateISO на устройстве не может распарсить вот такую дату 2013-11-23 21:16:00 */
function parseDateGibdd(str){
	//new Date(year, month, date[, hours, minutes, seconds, ms] )
	//2013-11-23 21:16:00

    var matches = /(\d{4})\D(\d{2})\D(\d{2})(?:\D(\d{1,2}):(\d{1,2}):(\d{1,2}))?/.exec(str);
    if(matches) {
		var date = new Date(matches[1], matches[2]-1, +matches[3], matches[4] || 0, matches[5] || 0, matches[6] || 0);
		var time = date.getTime();
		AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
		return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}