/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Accept-Language':'ru,en;q=0.8',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://shtrafy-gibdd.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	checkEmpty(prefs.login, 'Введите гос. номер! Номер должен быть в формате а351со190 либо 1234ав199, буквы русские!');
	checkEmpty(prefs.password, 'Введите номер свидетельства о регистрации в формате 50ХХ123456!');
	checkEmpty(prefs.license, 'Введите номер водительского удостоверения в формате 50ХХ028333!');	
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var formid = getParam(html, null, null, /"form_build_id"[^>]*value="([^"]*)/i);
	if(!formid){
		if (AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace('Server returned: ' + AnyBalance.getLastStatusString());
			throw new AnyBalance.Error('Сервис проверки штрафов временно недоступен, скоро все снова будет работать.');
		}
		// Попробуем объяснить почему
		// if(/Работа сервиса проверки[^<]*временно приостановлена/i.test(html))
			// throw new AnyBalance.Error('Работа сервиса временно приостановлена! Попробуйте зайти позже.');
		throw new AnyBalance.Error('Не удалось найти форму для запроса!');
	}
	var found = /(\D{0,1}\d+\D{2})(\d{2,3})/i.exec(prefs.login);
	if(!found)
		throw new AnyBalance.Error('Номер должен быть в формате а351со190 либо 1234ав199, буквы русские.');
	
	html = AnyBalance.requestPost(baseurl, {
		'auto_number':found[1],
		'region':found[2],
		'driver_license':prefs.license,
		//registration:123456,
		'registration_full':prefs.password,
		//email:name@email.ru,
		'form_id':'check_fines_form',
		'form_build_id':formid,
	}, addHeaders({Referer: baseurl}));	
	
	// в удачном случае вернет: { "redirect": "/myfines" }
	var href = getParam(html, null, null, /"redirect"[^"]*"\/([^"]*)/i);
	if(!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить данные о штрафах, проверьте правильность ввода.');
	}
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	
	var result = {success: true, balance:null} ;
	
	getParam(html, result, 'count', /Всего[^>]*>[^>]*"Amount"[^>]*>\s*(\d+)/i, null, parseBalance);
	getParam(html, result, ['balance', 'all'], [/на сумму[^>]*>([^<]*)/i, /Неоплаченные\s*штрафы[\s\S]{1,5}не\s*найдены/i], [replaceTagsAndSpaces, /Неоплаченные штрафы не найдены/i, '0'], parseBalance);
	
	var fines = sumParam(html, null, null, /<tr[^>]*"\s*FineDetails\s*"(?:[\s\S]*?<\/div[^>]*>){4}\s*<\/td>/ig);
	if(fines && fines.length > 0) {
		result.all = '';
		for(var i = 0; i< fines.length; i++) {
			var curr = fines[i];
			// Создаем сводку
			result.all += '<b>' + getParam(curr, null, null, /"Date2[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces) + ':</b> ' + getParam(curr, null, null, /"ArticleTip[^>]*title=['"]([^'"]*)/i, replaceTagsAndSpaces, html_entity_decode) + ' (' + getParam(curr, null, null, /"ArticleTip[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode) + '): <b>' + getParam(curr, null, null, /"Sum[^>]*>([^<]*)/i, replaceTagsAndSpaces) + ' р</b>' + 
				(i >= fines.length-1 ? '<br/><br/><b>Итого:</b> ' + fines.length + ' шт. на сумму: <b>' + result.balance + ' р</b>' : '<br/><br/>');
			
			// Только последний интересует
			if(i >= fines.length-1) {
				getParam(curr, result, 'date', /"Date2[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseDate);
				getParam(curr, result, 'postanovlenie', /"Protocol[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(curr, result, 'koap', /"ArticleTip[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(curr, result, 'descr', /"ArticleTip[^>]*title=['"]([^'"]*)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(curr, result, 'summ', /"Sum[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
				// getParam(json.request.DivList[curr.Division]+'', result, 'podrazdel', null, null, html_entity_decode);
			}
		}
	} else {
		AnyBalance.trace('Не найдено информации о штрафах. Скорее всего их нет.');
	}
	
    AnyBalance.setResult(result);
}
/** с 04.12.13 перестало работать, и даже не помогла ручная установка кук */
function mainGibdd() {
    var baseurl = 'http://www.gibdd.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + 'check/fines/');
	var token = getParam(html, null, null, /var\s+token\s*=\s*'([^']*)/i);

	var form = getParam(html, null, null, /(<form method="POST" id="tsdataform"[\s\S]*?<\/form>)/i);
	if(!form){
		if (AnyBalance.getLastStatusCode() > 400) {
			AnyBalance.trace('Server returned: ' + AnyBalance.getLastStatusString());
			throw new AnyBalance.Error('Сервис проверки штрафов временно недоступен, скоро все снова будет работать.');
		}
		// Попробуем объяснить почему
		if(/Работа сервиса проверки[^<]*временно приостановлена/i.test(html))
			throw new AnyBalance.Error('Работа сервиса временно приостановлена! Попробуйте зайти позже.');
		throw new AnyBalance.Error('Не удалось найти форму для запроса!');
	}
	checkEmpty(prefs.login, 'Введите гос. номер. Номер должен быть в формате а351со190 либо 1234ав199, буквы русские!');
	checkEmpty(prefs.password, 'Введите номер свидетельства о регистрации в формате 50ХХ123456!');
	
	var params = createFormParams(form);

	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		html = AnyBalance.requestPost(baseurl+ 'bitrix/templates/.default/components/gai/check/fines.v1.2/ajax/captchaReload.php', {}, addHeaders( {
			'X-Requested-With':'XMLHttpRequest',
			'Referer':baseurl+'check/fines/',
		}));
		params.captchaCode = getParam(html, null, null, /code"\s*:\s*"([^"]*)/i);
		var captcha = AnyBalance.requestGet(baseurl+ 'bitrix/tools/captcha.php?captcha_sid=' + params.captchaCode);
		params.captchaWord = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + params.captchaWord);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	var found = /(\D{0,1}\d+\D{2})(\d{2,3})/i.exec(prefs.login);
	if(!found)
		throw new AnyBalance.Error('Номер должен быть в формате а351со190 либо 1234ав199, буквы русские.');
	
	params.token = token;
	params.regnum = found[1];
    params.regreg = found[2];
	params.stsnum = prefs.password;
	params.captcha_code = undefined;
	params.captcha_word = undefined;
	
	AnyBalance.setCookie('gibdd.ru', 'BITRIX_SM_SVC_CHECK_FINES_NUM', found[1]);
	AnyBalance.setCookie('gibdd.ru', 'BITRIX_SM_SVC_CHECK_FINES_REG', found[2]);
	AnyBalance.setCookie('gibdd.ru', 'BITRIX_SM_SVC_CHECK_FINES_STS', prefs.password);
	AnyBalance.setCookie('gibdd.ru', 'BITRIX_SM_GUEST_ID', '48332005');
	AnyBalance.setCookie('gibdd.ru', 'BITRIX_SM_SVC_CHECK_FINES_V', '20131203');
	AnyBalance.setCookie('gibdd.ru', 'BITRIX_SM_REGKOD', '01');
	AnyBalance.setCookie('gibdd.ru', 'BITRIX_SM_LAST_VISIT', '04.12.2013+14:59:06');
	AnyBalance.setCookie('gibdd.ru', 'utmctr', 'проверка штрафов гибдд');
	AnyBalance.setCookie('gibdd.ru', 'BITRIX_SM_METOD', 'GEO');
	AnyBalance.setCookie('gibdd.ru', 'siteType', 'deleted');
	
	AnyBalance.setCookie('www.gibdd.ru', 'BITRIX_SM_SVC_CHECK_FINES_NUM', found[1]);
	AnyBalance.setCookie('www.gibdd.ru', 'BITRIX_SM_SVC_CHECK_FINES_REG', found[2]);
	AnyBalance.setCookie('www.gibdd.ru', 'BITRIX_SM_SVC_CHECK_FINES_STS', prefs.password);
	AnyBalance.setCookie('www.gibdd.ru', 'BITRIX_SM_GUEST_ID', '48332006');
	AnyBalance.setCookie('www.gibdd.ru', 'BITRIX_SM_SVC_CHECK_FINES_V', '20131203');
	AnyBalance.setCookie('www.gibdd.ru', 'BITRIX_SM_REGKOD', '01');
	AnyBalance.setCookie('www.gibdd.ru', 'BITRIX_SM_LAST_VISIT', '04.12.2013+14:59:06');
	AnyBalance.setCookie('www.gibdd.ru', 'utmctr', 'проверка штрафов гибдд');
	AnyBalance.setCookie('www.gibdd.ru', 'BITRIX_SM_METOD', 'GEO');
	AnyBalance.setCookie('www.gibdd.ru', 'siteType', 'deleted');	
	
	
	//BITRIX_SM_GUEST_ID=48332006; BITRIX_SM_LAST_VISIT=04.12.2013+11%3A49%3A12; BITRIX_SM_SVC_CHECK_FINES_V=20131203; PHPSESSID=d0e89pah83eme8e80c9117j4o5; BITRIX_SM_REGKOD=01; siteType=pda
	
	AnyBalance.trace('Пробуем запросить информацию с данными: '+prefs.login+', ' + prefs.password);
	
	html = AnyBalance.requestPost(baseurl + 'bitrix/templates/.default/components/gai/check/fines.v1.2/ajax/checker.php', params, addHeaders({
		'X-Requested-With':'XMLHttpRequest',
		'Referer':baseurl+'check/fines/'
	}));
	
	try {
		var json = JSON.parse(html);
	} catch(e) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию, свяжитесь с разработчиком провайдера');
	}
	var result = {success: true, balance:0} ;
	
	if(json.status == 1)
		throw new AnyBalance.Error("Неверно введены символы с картинки");
	
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
		getParam(curr.DateDecis+'', result, 'date', null, replaceTagsAndSpaces, parseDateGibdd);
		getParam(json.request.count+'', result, 'count', null, null, html_entity_decode);
		getParam(curr.KoAPtext.toUpperCase().substring(0,1) + curr.KoAPtext.toLowerCase().substring(1), result, 'descr', null, null, html_entity_decode);
		getParam(curr.KoAPcode, result, 'koap', null, replaceTagsAndSpaces, html_entity_decode);
		getParam(json.request.DivList[curr.Division]+'', result, 'podrazdel', null, null, html_entity_decode);
		getParam(curr.NumPost, result, 'postanovlenie', null, null, html_entity_decode);
		getParam(curr.Summa+'', result, 'summ', null, null, parseBalance);
	// Нет штрафов
	} else {
		result.descr = 'В базе данных отсутствует информация о неуплаченных штрафах по Вашему запросу';
		result.count = 0;
	}
	result.__tariff = prefs.login.toUpperCase();
    AnyBalance.setResult(result);
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