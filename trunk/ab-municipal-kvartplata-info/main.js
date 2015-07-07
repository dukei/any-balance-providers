﻿/**
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
	var baseurl = 'http://gcjs.kvartplata.info/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'lich_kab/Home/Login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'lich_kab/Home/Login', {
		UserNameEmail: prefs.login,
		PasswordEntered: prefs.password
	}, addHeaders({Referer: baseurl + 'lich_kab/Home/Login'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="error-box"[^>]*>[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь с таким адресом электронной почты и паролем не найден|Адрес электронной почты введен некорректно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var form = getParam(html, null, null, /<form[^>]+action="[^"]*AccountInfo"[^>]*>([\s\S]*?)<\/form>/i);

	if(prefs.digits) {
		var accs = sumParam(html, null, null, /<option value="(\d+)/ig);
		if(!accs || accs.length < 1) {
			AnyBalance.trace(html);
			AnyBalance.trace('Не удалось найти счета в кабинете. Похоже на кабинет с одним счетом');
		}
		
		for(var i = 0; i < accs.length; i++) {
			
			if(endsWith(accs[i], prefs.digits)) {
				var account = accs[i];
				break;
			}
		}
		if(!account)
			throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.digits);
		
		var dt = new Date();
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'AccauntNum') 
				return account;
			else if (name == 'Month')
				return dt.getMonth() + 1;
			else if (name == 'Year')
				return dt.getFullYear();
	    
			return value;
		});

		html = AnyBalance.requestPost(baseurl + 'lich_kab/Home/AccountInfo', params, addHeaders({Referer: baseurl + 'lich_kab/Home/Login'}));
	}

	var error;

	for(var i=1; i<=3; ++i){
		if(/Нет данных для лицевого счета/i.test(html)){
			error = getParam(html, null, null, /Нет данных для лицевого счета[^<]*/i);
			AnyBalance.trace(error);
			var dtNow = new Date();
			var dt = new Date(dtNow.getFullYear(), dtNow.getMonth()-i, dtNow.getDate());

			var params = createFormParams(html, function(params, str, name, value) {
				if (name == 'Month')
					return dt.getMonth() + 1;
				else if (name == 'Year')
					return dt.getFullYear();
	        
				return value;
			});
			
			html = AnyBalance.requestPost(baseurl + 'lich_kab/Home/AccountInfo', params, addHeaders({Referer: baseurl + 'lich_kab/Home/Login'}));
		}else{
			break;
		}
	}

	if(i > 3)
		throw new AnyBalance.Error(error);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<b>Начислено:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'debt', /Вы не заплатили([^<]*)/i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, '__tariff', /<b>Период:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'fine', /<b>Пеня:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'payment', /<b>К оплате:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'prev_payment', /Оплачено ранее([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalanceRK);
	getParam(html, result, 'cold_last_counter', /Последнее показание(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'hot_last_counter', /Последнее показание(?:[^>]*>){16}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)\s*р/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)\s*к/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}