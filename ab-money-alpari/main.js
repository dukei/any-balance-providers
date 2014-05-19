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
	var baseurl = 'https://www.alpari.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'ru/login/', g_headers);
	
	try {
		html = AnyBalance.requestPost(baseurl + 'ru/login/', {
			'successUrl':'https://new-my.alpari.ru/ru/',
			'login':prefs.login,
			'password':prefs.password,
			'forced':'1',
		}, addHeaders({Referer: baseurl + 'ru/login/'}));		
	} catch(e) {
	}
	
	if(prefs.account == null){
		html = AnyBalance.requestGet('https://new-my.alpari.ru/ru/', addHeaders({Referer: baseurl + 'ru/login/'}));
	}else{

		if(prefs.type==2){//инвестиционные ПАММ-счета
			html = AnyBalance.requestGet('https://new-my.alpari.ru/ru/investments/pamm_accounts/'+prefs.account+'/', addHeaders({Referer: baseurl + 'ru/login/'}));
		}else{//торговые счета
			var type='mt4';
			if(prefs.account.search(/^ALPR/)==0)type='fx_option';

			html = AnyBalance.requestGet('https://new-my.alpari.ru/ru/accounts/trading/'+type+'/'+prefs.account+'/', addHeaders({Referer: baseurl + 'ru/login/'}));
		}
	}


	if (!/>Выйти</i.test(html)) {
		var error = sumParam(html, null, null, /"tooltip__phrase"[^>]*>([^<]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error){
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(html));
		}else if(/Ведутся технические работы/i.test(html)){
			throw new AnyBalance.Error('Ведутся технические работы (или неверный номер или тип счета).');
		}
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}else if(/<span class="information-fail__404">404<\/span>/i.test(html)){
		throw new AnyBalance.Error('Неверный номер или тип счета');
	}

	
	var result = {success: true};

	if(prefs.account == null){
		var currencys = ['USD', 'EUR', 'RUR', 'GLD'];
		for(var i= 0; i < currencys.length; i++) {
			var current = currencys[i];
		
			getParam(html, result, 'balance_' + current, new RegExp('"[\\d,.\\s]+' + current + '"', 'i'), replaceTagsAndSpaces, parseBalance);
			getParam(current, result, 'currency_' + current);
		}
	}else{
		result.__tariff = prefs.account;

		if(prefs.type==2){//инвестиционные ПАММ-счета
			getParam(html, result, 'equity' , /Средства<\/div><div class="dotted-list-panel__value s_position_relative s_float_r">(.*?)<\/div>/, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'end_of_tp', /Конец расчетного периода\s*<\/div><div class="dotted-list-panel__value s_position_relative s_float_r">\s*(.*?)\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'balance' , /Баланс\s*<\/div><div class="dotted-list-panel__value s_position_relative s_float_r">\s*(.*?)\s*<\/div>/, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'amount_of_shares' , /Количество паев\s*<\/div><div class="dotted-list-panel__value s_position_relative s_float_r">\s*(.*?)\s*<\/div>/, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'price_of_share' , /Цена пая\s*<\/div><div class="dotted-list-panel__value s_position_relative s_float_r">\s*(.*?)\s*<\/div>/, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'currency', /Средства<\/div><div class="dotted-list-panel__value s_position_relative s_float_r">.*? (.*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		}else{//торговые счета
			getParam(html, result, 'type', /<tr><th>Тип счета:<\/th><td>(.*?)<\/td><\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'server', /<tr><th>Торговый сервер:<\/th><td>(.*?)<\/td><\/tr>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'leverage', /<tr><th>Кредитное плечо:<\/th><td>(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'balance' , /<span class="js-balance-value">(.*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'currency', /<span class="js-balance-value">.*?<\/span>(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(html, result, 'equity' , /<span class="js-equity-value">(.*?)<\/span>/, replaceTagsAndSpaces, parseBalance);
		}
	}
	
	AnyBalance.setResult(result);
}