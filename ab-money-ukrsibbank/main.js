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
	var baseurl = 'https://secure.my.ukrsibbank.com/web_banking/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	try {
		var html = AnyBalance.requestGet(baseurl + 'protected/welcome.jsf', g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}
	
	var ar = getParam(html, null, null, /var digitsArray = new Array\(([^)]+)\);/i);
	var digitsArray = sumParam(ar, null, null, /'(\d+)'/ig);
	
	if(!ar || digitsArray.length < 1) {
		throw new AnyBalance.Error('Не удалось найти ключи шифрования пароля. Сайт изменен?');
	}
	
	var fake_password = '', j_password =  '';
	
	for(var i = 0; i < prefs.password.length; i++) {
		fake_password +=  '*';
		j_password += digitsArray[(prefs.password[i]*1)-1] + '_';
	}

	html = AnyBalance.requestPost(baseurl + 'j_security_check', {
		j_username: prefs.login,
		j_password: j_password,
		fake_password: fake_password
	}, addHeaders({Referer: baseurl + 'protected/welcome.jsf'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<h2 class="message">([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	fetchCard(html, baseurl)
}

function fetchCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '';
	
	// <tr class="darkRow"(?:[^>]*>){15}\s*\d+0885(?:[^>]*>){14}\s*<\/tr>
	var reCard = new RegExp('<tr class="darkRow"(?:[^>]*>){15}\\s*\\d+' + lastdigits + '(?:[^>]*>){14}\\s*</tr>', 'i');
	
	var tr = getParam(html, null, null, reCard);
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту или счет с последними цифрами '+prefs.lastdigits : 'ни одного счета или карты!'));
	
	var result = {success: true};
	
	getParam(tr, result, 'balance', /(?:[^>]*>){20}([\d\s.,]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance'], /(?:[^>]*>){18}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /(?:[^>]*>){15}(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /(?:[^>]*>){15}(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'acc_name', /(?:[^>]*>){2}[^>]*title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	/*
	// Дополнительная инфа по картам.
	if (AnyBalance.isAvailable('till', 'cardName', '', '', '', '', '', '', '', '')) {
		//https://ibank.sbrf.com.ua/ifobsClientSBRF/BankingCardShow.action?accountid=1027820&cardid=52ec16d582d302adec054869fa0030ee
		var href = getParam(tr, null, null, /<a\s+href="([^"]*)/i);
		if(href) {
			html = AnyBalance.requestGet(baseurl + 'ifobsClientSBRF/' + href, g_headers);
			
			getParam(html, result, 'till', /Срок действия карты:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
			getParam(html, result, 'cardName', /Имя держателя карты:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
			getParam(html, result, 'accNum', /Номер счета:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
		} else {
			AnyBalance.trace('Не нашли ссылку на дополнительную информацию по картам, возможно, сайт изменился?');
		}
	}*/
	
	AnyBalance.setResult(result);
}