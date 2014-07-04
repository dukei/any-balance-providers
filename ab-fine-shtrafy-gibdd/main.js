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
	
	var json = getJsonEval(html);
	
	// в удачном случае вернет: { "redirect": "/myfines" }
	var href = json.redirect || json.href;
	if(!json.redirect || json.href) {
		AnyBalance.trace(html);
		
		if(json.message)
			throw new AnyBalance.Error(json.message);
		
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