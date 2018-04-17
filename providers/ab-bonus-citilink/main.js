﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = "https://www.citilink.ru";

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin': baseurl,
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
};

function login(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	var form = getElement(html, /<form[^>]+action="[^"]*auth\/login[^>]*>/i);
	var action = getParam(form, null, null, /<form[^>]+action="([^"]+)/i);

	if(!action) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	}

   	var json = getJsonObject(html, /window\s*\[\s*'globalSettings'\s*\]\s*=\s*/);

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'login') 
			return prefs.login;
		else if (name == 'pass')
			return prefs.password;
	    else if (name == 'token'){
	    	var obj = new te(json);
	    	return pg({a: obj}); //Весьма сложные преобразования токена
	    }

		return value;
	});

	var url = joinUrl(baseurl, action);
	params['g-recaptcha-response'] = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, json.recaptchaSiteKey);
	
	//Надо вздремнуть, а то нас палят как роботов (а зачем это делать? оставьте полезных роботов в покое.)
//	var sleeptime = 4000 + Math.floor(Math.random()*3000);
//	AnyBalance.trace('Надо вздремнуть ' + sleeptime + ' мс, а то нас палят как роботов (а зачем это делать? оставьте полезных роботов в покое.)');
//	AnyBalance.sleep(sleeptime);

	AnyBalance.trace('Posting to url: ' + url);
	html = AnyBalance.requestPost(url, params, addHeaders({Referer: baseurl + '/'})); 
	
    if(!/\/login\/exit/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="[^"]*error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    return html;
}

function main(){
	var html;

	for(var i=0; i<5; ++i){
		try{
			AnyBalance.trace('Попытка входа в Ситилинк ' + (i+1) + '/5');
			html = login();
			break;
		}catch(e){
			if(/парол/i.test(e.message) && i<4)
				continue;
			throw e;
		}
	}

	AnyBalance.trace('Успешный вход');

    var result = {success: true};
    getParam(html, result, '__tariff', /Статус(?:\s|<[^>]*>)*:([^<]*)/i,  replaceTagsAndSpaces);
    getParam(html, result, 'balance',  /Бонусы(?:\s|<[^>]*>)*:([^<]*)/i,  replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'wishes',   /Желания(?:\s|<[^>]*>)*:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('num', 'sum')){
    	html = AnyBalance.requestGet(baseurl + '/profile/', g_headers);

    	getParam(html, result, 'num', [/(\d+)\s*товар\S* на сумму/i, /Учт[ёе]нных покупок нет/i], [replaceTagsAndSpaces, /Учт[ёе]нных покупок нет/i, '0'], parseBalance);
    	getParam(html, result, 'sum', [/товар\S* на сумму:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, /Учт[ёе]нных покупок нет/i], [replaceTagsAndSpaces, /Учт[ёе]нных покупок нет/i, '0'], parseBalance);
    }
	
    if(isAvailable(['obrabotannie', 'pomosh', 'reshennie', 'zhalobi', 'rating', 'position', 'nachisleno'])) {
      AnyBalance.trace('Переходим на страницу эксперта..');
  //		html = AnyBalance.requestGet(baseurl + '/profile/expert/', g_headers);

      AnyBalance.trace('Но кабинет новый, можем счетчиков не найти... Если что, присылайте лог');
      getParam(html, result, 'obrabotannie', /Количество обработанных вопросов(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'pomosh',       /Скольким людям помогли ответы(?:[^>]*>){2}([^<]*)/i,    replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'reshennie',    /Количество решенных вопросов(?:[^>]*>){2}([^<]*)/i,     replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'zhalobi',      /Количество жалоб на эксперта(?:[^>]*>){2}([^<]*)/i,     replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'rating',       /Ваш рейтинг(?:[^>]*>){2}([^<]*)/i,                      replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'position',     /Ваше место(?:[^>]*>){2}([^<]*)/i,                       replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'nachisleno',   /Начислено бонусов(?:[^>]*>){2}([^<]*)/i,                replaceTagsAndSpaces, parseBalance);
    }

    if(isAvailable(['wo_date', 'wo_sum', 'activation_date', 'activation_sum', 'activation_type', 'card_activation_date', 'card_num'])) {
      html = AnyBalance.requestGet(baseurl + '/profile/club/', g_headers);

      getParam(html, result, 'wo_date', /дата списания(?:[\s\S]*?<td[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
      getParam(html, result, 'wo_sum',  /дата списания(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);

      getParam(html, result, 'activation_date',  /Детализация активации бонусов(?:[\s\S]*?<td[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
      getParam(html, result, 'activation_sum',   /Детализация активации бонусов(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
      getParam(html, result, 'activation_type',  /Детализация активации бонусов(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);

      getParam(html, result, 'card_activation_date', /дата активации:([^<]*)/i, replaceTagsAndSpaces, parseDateWord);
      getParam(html, result, 'card_num', /Карта №([^,<]*)/i, replaceTagsAndSpaces);
    }

    AnyBalance.setResult(result);
}

