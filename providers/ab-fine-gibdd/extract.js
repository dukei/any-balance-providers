/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Accept-Language':'ru,en;q=0.8',
	'Connection':'keep-alive',
	'Origin':'http://www.gibdd.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36'
};

function requestFines(prefs) {
    var baseurl = 'http://www.gibdd.ru/';
    AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + 'check/fines/', g_headers);
	
	var token = getParam(html, null, null, /var _token\s*=\s*[^'"]+['"]([a-f\d]+)/i);
	
	var form = getParam(html, null, null, /(<form method="POST" id="tsdataform"[\s\S]*?<\/form>)/i);
	if(!form || !token) {
		if (AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace('Server returned: ' + AnyBalance.getLastStatusString());
			throw new AnyBalance.Error('Сервис проверки штрафов временно недоступен, скоро все снова будет работать.');
		}
		// Попробуем объяснить почему
		if(/временно приостановлена/i.test(html))
			throw new AnyBalance.Error('Работа сервиса временно приостановлена! Попробуйте обновить данные позже.');
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму для запроса!');
	}
	checkEmpty(prefs.login, 'Введите гос. номер. Номер должен быть в формате а351со190 либо 1234ав199, буквы русские!');
	checkEmpty(prefs.password, 'Введите номер свидетельства о регистрации в формате 50ХХ123456!');
	
	AnyBalance.trace('token = ' + token);
	g_headers = addHeaders({'X-Csrf-Token':token});
	
	html = AnyBalance.requestGet(baseurl + 'proxy/check/getSession.php', g_headers);
	var dataJson = getJson(html);
	AnyBalance.setCookie('www.gibdd.ru', 'captchaSessionId', dataJson.id);
	
	var captchaWord;
	
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		
		var captcha = AnyBalance.requestGet(baseurl + 'proxy/check/getCaptcha.php?PHPSESSID=' + dataJson.id + '&' + new Date().getTime(), addHeaders({Referer: baseurl + 'check/fines/'}));
		captchaWord = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha, {inputType: 'number'});
		AnyBalance.trace('Капча получена: ' + captchaWord);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	var found = /(\D{0,1}\d+\D{2})(\d{2,3})/i.exec(prefs.login);
	if(!found)
		throw new AnyBalance.Error('Номер должен быть в формате а123вс190 либо 1234ав199, буквы русские.');
	
	var params2 = [
		['req','fines:' + found[1].toUpperCase()+':'+found[2]+':'+prefs.password.toUpperCase()],
		['captchaWord',captchaWord],
//		['token',''],
		['regnum',found[1].toUpperCase()],
		['regreg',found[2]],
		['stsnum',prefs.password.toUpperCase()],
	];
	
	AnyBalance.trace('Пробуем запросить информацию с данными: '+prefs.login+', ' + prefs.password);
	
	html = AnyBalance.requestPost(baseurl + 'proxy/check/fines/2.0/client.php', params2, addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Referer': baseurl + 'check/fines/',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Connection': 'keep-alive'
	}));
	
	try {
		var json = getJson(html);
	} catch(e) {
		AnyBalance.trace(html);
		
		if(/При загрузке страницы произошла ошибка/i.test(html))
			throw new AnyBalance.Error('Сайт временно работает с перебоями, попробуйте обновить данные позже.');
		
		throw new AnyBalance.Error('Не удалось получить информацию, свяжитесь, пожалуйста, с разработчиками.');
	}
	
	return json;
}

function parseFines(result, json) {
	if(json.status != 200) {
		if(json.error)
			throw new AnyBalance.Error(json.error);	
		
		if(json.status == 1) 
			throw new AnyBalance.Error("Цифры с картинки введены не верно!");
		
		throw new AnyBalance.Error("Не удалось получить данные по штрафам, сайт изменен?");
	}
	
	if(!json.request || json.request.error != '0') {
		throw new AnyBalance.Error("Указанное Вами свидетельство о регистрации транспортного средства не соответствует государственным регистрационным знакам или более недействительно. Вероятно, Вами допущена ошибка при заполнении полей запроса.");
	}
	
	AnyBalance.trace('Штрафов: ' + json.request.count);
	
	if(json.request.count > 0) {
		result.fines = [];
		
		for(var i = 0; i< json.request.count; i++) {
			var curr = json.request.data[i];
			var fine = {__id: curr.id, __name: curr.NumPost};
			
			if(__shouldProcess('fines', fine)) {
				getParam(curr.DateDecis + '', fine, 'fines.date', null, replaceTagsAndSpaces, parseDateGibdd);
				getParam(curr.KoAPcode, fine, 'fines.koap', null, replaceTagsAndSpaces, html_entity_decode);
				getParam(curr.KoAPtext.toUpperCase().substring(0,1) + curr.KoAPtext.toLowerCase().substring(1), fine, 'fines.descr', null, null, html_entity_decode);
				getParam(curr.Summa + '', fine, 'fines.summ', null, null, parseBalance);
				getParam(curr.NumPost, fine, 'fines.postanovlenie', null, null, html_entity_decode);
				getParam(json.request.cacheDiv[curr.Division]+'', fine, 'fines.podrazdel', null, null, html_entity_decode);
			}
			
			result.fines.push(fine);
			sumParam(curr.Summa + '', result, 'balance', null, null, parseBalance, aggregate_sum);
		
		}
		getParam(json.request.count + '', result, 'count', null, null, html_entity_decode);
		// Нет штрафов
	} else {
		result.descr = 'Неуплаченных штрафов в федеральной информационной системе ГИБДД по указанным данным не найдено.';
		result.count = 0;
	}
}

/** Получает дату из строки, почему-то parseDateISO на устройстве не может распарсить вот такую дату 2013-11-23 21:16:00 */
function parseDateGibdd(str){
	//new Date(year, month, date[, hours, minutes, seconds, ms] )
	//2013-11-23 21:16:00

    var matches = /(\d{4})\D(\d{2})\D(\d{2})\D(\d{1,2}):(\d{1,2}):(\d{1,2})/.exec(str);
    if(matches){
          var date = new Date(matches[1], matches[2]-1, +matches[3], matches[4] || 0, matches[5] || 0, matches[6] || 0);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}