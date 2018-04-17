﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'utf-8, iso-8859-1, utf-16, *;q=0.7',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Linux; U; Android 4.0.4; ru-ru; Android SDK built for x86 Build/IMM76D) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ibank.belinvestbank.by/';
	var loginurl = 'https://login.belinvestbank.by/';
	var result = {success: true};

	try {
		AnyBalance.setDefaultCharset('utf-8');
		
		checkEmpty(prefs.login, "Введите логин!");
		checkEmpty(prefs.password, "Введите пароль!");
		checkEmpty(!prefs.cardnum || /^\d{4}$/i.test(prefs.cardnum), 'Необходимо ввести 4 последние цифры номера карты, либо не вводить ничего!');
			
		var html = AnyBalance.requestGet(loginurl + 'signin', g_headers);

		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}

		var encryptArrayVar = getParam(html, /var\s*keyLang\s*=\s*\[([^\]]*)/i);
		var encryptArray = sumParam(encryptArrayVar, /\d+/ig);

		html = AnyBalance.requestPost(loginurl + 'signin', {
	        login: prefs.login,
	        password: cod(prefs.password, encryptArray),
	        typeSessionKey: 0
	    }, addHeaders({Referer: loginurl + 'signin'}));


		if(!/На Ваш номер телефона/i.test(html) && /аннулировать предыдущий запуск/i.test(html)){
			AnyBalance.trace('Аннулируем предыдущий вход');
			html = AnyBalance.requestPost(loginurl + 'confirmationCloseSession', {}, addHeaders({Referer: loginurl + 'signin'}));
		}

		if(!/На Ваш номер телефона/i.test(html)){
			var error = getElement(html, /<div[^>]+(?:error|alert__msg)/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error(error, null, /Парол/i.test(error));
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
		}

		var smsKey;
		AnyBalance.trace('Пытаемся ввести смс код.');
		smsKey = AnyBalance.retrieveCode("Пожалуйста, введите код из смс", null, {inputType: 'number', time: 180000});
		AnyBalance.trace('Код из смс получен: ' + smsKey);

		html = AnyBalance.requestPost(loginurl + 'signin2', {
	        action: 1,
	        key: smsKey
	    }, addHeaders({Referer: loginurl + 'signin2'}));

		// ПРОВЕРКА НА НЕВЕРНЫЙ КОД ИЗ СМС!
		if(!/logout/i.test(html)) {
			var error = getElement(html, /<div[^>]+(?:error|alert__msg)/i, replaceTagsAndSpaces);
			if(error)
				throw new AnyBalance.Error(error);

			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
		}
		
		html = AnyBalance.requestGet(baseurl + 'cards', addHeaders({'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36'}));
		
		var cards = sumParam(html, null, null, /<div class="table-name-card">[^]+?<\/div>\s*<div[^>]*>[^]+?<\/div>/ig);

		if(!cards.length){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти ни одной карты!');
		}

		var card = prefs.cardnum ?
				cards.filter(function(card){ return new RegExp('\\*\\*\\*\\*\\s*' + prefs.cardnum, 'i').test(card); })[0] : cards[0];

		if(!card){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти' + ( prefs.cardnum ? ' карту с последними цифрами ' + prefs.cardnum : ' ни одной карты!' ));
		}
		
		getParam(card, result, '__tariff', /(\*\*\*\*\s*\*\*\*\*\s*\*\*\*\*\s*\d{4})/i, replaceTagsAndSpaces);
		getParam(card, result, 'balance', /card-sum[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(card, result, ['currency', 'balance'], /item-card-currency[^>]*>([^<]+)/i, replaceTagsAndSpaces);
		getParam(card, result, 'validto', /item-card-expdate[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseDate);
		getParam(card, result, 'status', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\//i, replaceTagsAndSpaces);

	} finally {
		// Выходим, чтобы закончить сессию. Нужно, так как запрещено 2 одновременных подключения.
		AnyBalance.requestGet(baseurl + 'logout', g_headers);
		AnyBalance.trace("Вышли из интернет банка.");
	}
	
    AnyBalance.setResult(result);
}

function cod(str, keyLang) {
	var lang = ['Q','W','E','R','T','Y','U','I','O','P','A','S','D','F','G','H','J','K','L','Z','X','C','V','B','N','M','q','w','e','r','t','y','u','i','o','p','a','s','d','f','g','h','j','k','l','z','x','c','v','b','n','m','Й','Ц','У','К','Е','Н','Г','Ш','Щ','З','Х','Ъ','Ф','Ы','В','А','П','Р','О','Л','Д','Ж','Э','Я','Ч','С','М','И','Т','Ь','Б','Ю','й','ц','у','к','е','н','г','ш','щ','з','х','ъ','ф','ы','в','а','п','р','о','л','д','ж','э','я','ч','с','м','и','т','ь','б','ю','1','2','3','4','5','6','7','8','9','0','_','.','-'];
	var result = '';
	var pass = str.split('');
	for (n = 0; n < pass.length; n++) {
		var isLegal = false;
		if (pass[n]) {
			for (i = 0; i < lang.length; i++) {
				if (pass[n] == lang[i]) {
					result += String.fromCharCode(keyLang[i]);
					isLegal = true;
				}
			}
			if (!isLegal) {
				result += pass[n];
			}
		} else {
			break;
		}
	}
	return result;
}