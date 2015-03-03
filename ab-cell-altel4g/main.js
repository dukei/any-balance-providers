 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Origin': 'https://cabinet.altel.kz',
	'Referer': 'https://cabinet.altel.kz/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/535.19 (KHTML, like Gecko) Chrome/18.0.1025.162 Safari/535.19'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://cabinet.altel.kz/?lang=ru";
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestPost(baseurl, {
        form_login:prefs.login,
        form_pass:prefs.password,
        x:81,
        y:18
    }, g_headers);
	
	if(!/logout=1/i.test(html)) {
		var error = getParam(html, null, null, /<ul[^>]+class="error"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    getParam(html, result, 'fio', /"account-title"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'phone', /(?:Ваш номер|Сіздің нөміріңіз):([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /"plan-title"[^>]*>([^<]+)[^>]*>[^>]*plan-subtitle/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /"account-balance split">[\s\S]*?"split-title"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonus', /"bonus-balance split">[\s\S]*?"split-title"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'till', /бонусный счет[^>]*>\s*до([^<]+)/i, replaceTagsAndSpaces, parseDate);

	var counters = sumParam(html, null, null, /<div[^>]+class="[^"]*\bcounter\b[^>]*>([\s\S]*?)<\/div>/ig);
	AnyBalance.trace('Found counters: ' + counters.length);
	for(var i=0; i<counters.length; ++i){
		var counter = counters[i];
		var units = getParam(counter, null, null, /<span[^>]+class="icon-[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		var note = getParam(counter, null, null, /<div[^>]+class="counter-note"[^>]*>([\s\S]*)/i, null, html_entity_decode);
		var counter_name = null;
		if(/Мин/i.test(units)){
			if(/Внутри сети|Желі ішінде/i.test(note)){
				counter_name = 'min_left'; // Минуты внутри сети
			}else if(/GSM/i.test(note)){
				counter_name = 'min_left_gsm'; // Минуты на GSM
			}else if(/на город/i.test(note)){
				counter_name = 'min_left_city'; // Минуты на город
			}
			if(counter_name)
				getParam(counter, result, counter_name, /(\d+:\d+)/i, replaceTagsAndSpaces, parseMinutes);
		}else if(/[МГКMGK][бb]/i.test(units)){
			// трафик
			counter_name = 'traffic_left';
			getParam(counter, result, counter_name, /([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseTraffic);
		}else if(/СМС|SMS/i.test(units)){
			// Смс внутри сети
			counter_name = 'sms_left';
			getParam(counter, result, counter_name, /([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		}
		if(!counter_name){
			AnyBalance.trace('Неизвестная опция: ' + counter);
		}else{
			getParam(note, result, counter_name + '_till', /<br[^>]*>([^>]*)/i, replaceTagsAndSpaces, parseDateLocal);
		}
	}
    
    AnyBalance.setResult(result);
}

function parseDateLocal(str){
	if(/До конца дня|Күннің соңына дейін/i.test(str)){
		var dt = new Date();
		var today = new Date(dt.getYear(), dt.getMonth(), dt.getDate(), 23, 59, 59);
		AnyBalance.trace('Parsed date ' + today + ' from ' + str);
		return dt.getTime();
	}else{
		return parseDate(str);
	}
}