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
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите гос. номер! Номер должен быть в формате а351со190 либо 1234ав199, буквы русские!');
	checkEmpty(prefs.password, 'Введите номер свидетельства о регистрации в формате 50ХХ123456!');
	checkEmpty(prefs.license, 'Введите номер водительского удостоверения в формате 50ХХ028333!');

	var prefs = AnyBalance.getPreferences ();
    switch(prefs.type){
    case 'new':
        mainNew();
        break;
    case 'old':
        mainOld();
        break;
    case 'auto':
    default:
        try{
			mainNew();
        }catch(e){
            if(e.fatal)
                throw e;
			AnyBalance.trace('Ошибка подключения к новому сайту: ' + e.message + '\nПробуем старый...');
            mainOld();
        }
        break;
	}
}

function mainNew(){
	AnyBalance.trace('Пробуем войти на новый сайт...');
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://shtrafy-gibdd.ru/';

	var html = AnyBalance.requestGet(baseurl, g_headers);
	if (AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace('Server returned: ' + AnyBalance.getLastStatusString());
		throw new AnyBalance.Error('Сервис проверки штрафов временно недоступен, скоро все снова будет работать.');
	}

	var session = AnyBalance.requestGet(baseurl + 'frontend/authorize', addHeaders({Referer: baseurl}));
	if (AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace('Server session returned: ' + AnyBalance.getLastStatusString());
		throw new AnyBalance.Error('Сервис проверки штрафов сейчас временно недоступен, скоро все снова будет работать.');
	}

	session = getJson(session);

	var found = /(\D{0,1}\d+\D{2})(\d{2,3})/i.exec(prefs.login);
	if(!found)
		throw new AnyBalance.Error('Номер должен быть в формате а351со190 либо 1234ав199, буквы русские.', null, true);

	var driver = AnyBalance.requestPost(baseurl + 'rest/drivers', JSON.stringify({
		"access_token": session.data.access_token, 
		"driver_license": prefs.license
	}), addHeaders({Referer: baseurl, 'Content-Type': 'application/json;charset=UTF-8'}));
	driver = getJson(driver);

	if(!driver.success){
		AnyBalance.trace(JSON.stringify(driver));
		if(driver.error && driver.error.message)
			throw new AnyBalance.Error(driver.error.message);
		throw new AnyBalance.Error('Не удалось получить информацию по штрафам водителя');
	}

	var car = AnyBalance.requestPost(baseurl + 'rest/automobiles', JSON.stringify({
		"access_token": session.data.access_token, 
		"auto_number":found[1],
		"region":found[2],
		"registration_full":prefs.password
	}), addHeaders({Referer: baseurl, 'Content-Type': 'application/json;charset=UTF-8'}));
	car = getJson(car);

	if(!car.success){
		AnyBalance.trace(JSON.stringify(car));
		if(car.error && car.error.message)
			throw new AnyBalance.Error(car.error.message);
		throw new AnyBalance.Error('Не удалось получить информацию по штрафам на автомобиль');
	}

	var fines = [];
	if(driver.data.requisites.fines)
		for(var key in driver.data.requisites.fines) fines.push(driver.data.requisites.fines[key]);
	if(car.data.requisites.fines)
		for(var key in car.data.requisites.fines) fines.push(car.data.requisites.fines[key]);

	var result = {success: true, balance:null} ;
	getParam(prefs.login, result, '__tariff');
	getParam(fines.length, result, 'count');
	getParam(0, result, 'balance');

	fines.sort(function(f1, f2){ return f1.date > f2.date ? 1 : (f1.date < f2.date ? -1 : 0); });

	if(fines && fines.length > 0) {
		result.all = '';
		for(var i = 0; i< fines.length; i++) {
			var curr = fines[i];
			sumParam(curr.sum, result, ['balance', 'all'], null, null, null, aggregate_sum);
			
			var date = getParam(curr.date);
			var sum = getParam(curr.sum);
			var descr = 'Нет описания';
			var koap = 'Нет статьи';
			
			// Создаем сводку
			result.all += '<b>' + date + ':</b> ' + descr + ' (' + koap + '): <b>' + sum + ' р</b>' + 
				(i >= fines.length-1 ? '<br/><br/><b>Итого:</b> ' + fines.length + ' шт. на сумму: <b>' + result.balance + ' р</b>' : '<br/><br/>');
			
			// Только последний интересует
			if(i >= fines.length-1) {
				getParam(curr.date, result, 'date', null, null, parseDateISO);
				getParam(curr.protocol, result, 'postanovlenie');
//				getParam(curr, result, 'koap', /"ArticleTip[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
//				getParam(curr, result, 'descr', /"ArticleTip[^>]*title=['"]([^'"]*)/i, replaceTagsAndSpaces, html_entity_decode);
				getParam(curr.sum, result, 'summ');
			}
		}
	} else {
		AnyBalance.trace('Не найдено информации о штрафах. Скорее всего их нет.');
		result.all = 'Неоплаченные штрафы не найдены';
	}

	AnyBalance.setResult(result);
}

function mainOld(){		
	AnyBalance.trace('Пробуем войти через старый сайт...');		
    var prefs = AnyBalance.getPreferences();		
    var baseurl = 'http://old.shtrafy-gibdd.ru/';		
			
	var html = AnyBalance.requestGet(baseurl, g_headers);		
		
	var formid = getParam(html, null, null, /"form_build_id"[^>]*value="([^"]*)/i);		
	if(!formid){		
		if (AnyBalance.getLastStatusCode() > 400) {		
			AnyBalance.trace('Server returned: ' + AnyBalance.getLastStatusString());		
			throw new AnyBalance.Error('Сервис проверки штрафов временно недоступен, скоро все снова будет работать.');		
		}		
		
		// Попробуем объяснить почему		
		var error = getElement(html, /<div[^>]+FineForm[^>]*>/i, replaceTagsAndSpaces);		
		if(error)		
			throw new AnyBalance.Error(error);		
		AnyBalance.trace(html);		
		throw new AnyBalance.Error('Не удалось найти форму для запроса!');		
	}		
	var found = /(\D{0,1}\d+\D{2})(\d{2,3})/i.exec(prefs.login);		
	if(!found)		
		throw new AnyBalance.Error('Номер должен быть в формате а351со190 либо 1234ав199, буквы русские.', null, true);		
			
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
			
	var json = getJsonEval(html);		
			
	// в удачном случае вернет: { "redirect": "/myfines" }		
	var href = json.redirect || json.href;		
	if(!json.redirect || json.href) {		
		AnyBalance.trace(html);		
				
		if(json.message)		
			throw new AnyBalance.Error(replaceAll(json.message, replaceTagsAndSpaces));		
				
		throw new AnyBalance.Error('Не удалось получить данные о штрафах, проверьте правильность ввода.');		
	}		
	html = AnyBalance.requestGet(joinUrl(baseurl, href), g_headers);		
			
	var result = {success: true, balance:null} ;		
	getParam(prefs.login, result, '__tariff');		
	getParam(html, result, 'count', /Всего[^>]*>[^>]*"Amount"[^>]*>\s*(\d+)/i, null, parseBalance);		
	getParam(html, result, ['balance', 'all'], [/Неоплаченные\s+штрафы[\s\S]{1,7}не\s*найдены/i, /на сумму[^>]*>([^<]*)/i], [replaceTagsAndSpaces, /Неоплаченные\s+штрафы\s+не\s+найдены/i, '0'], parseBalance);		
			
	var fines = sumParam(html, null, null, /<tr[^>]*"\s*FineDetails\s*"(?:[\s\S]*?<\/div[^>]*>){4}\s*<\/td>/ig);		
	if(fines && fines.length > 0) {		
		result.all = '';		
		for(var i = 0; i< fines.length; i++) {		
			var curr = fines[i];		
					
			var date = getParam(curr, null, null, /"Date2[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces);		
			var sum = getParam(curr, null, null, /"Sum[^>]*>([^<]*)/i, replaceTagsAndSpaces);		
			// Это не всегда есть на сайте		
			var descr = getParam(curr, null, null, /"ArticleTip[^>]*title=['"]([^'"]*)/i, replaceTagsAndSpaces, html_entity_decode) || 'Нет описания';		
			var koap = getParam(curr, null, null, /"ArticleTip[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode) || 'Нет статьи';		
					
			// Создаем сводку		
			result.all += '<b>' + date + ':</b> ' + descr + ' (' + koap + '): <b>' + sum + ' р</b>' + 		
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
        result.all = 'Неоплаченные штрафы не найдены';
	}		
			
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