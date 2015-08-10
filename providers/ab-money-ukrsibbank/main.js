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
	
	var html = AnyBalance.requestGet(baseurl + 'protected/welcome.jsf', g_headers);
	
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
		var curr = prefs.password[i]*1;
		j_password += digitsArray[curr == 0 ? 9 : curr-1] + '_';
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
	var reCard = new RegExp('<tr class="darkRow"(?:[^>]*>){15}\\s*\\d+' + lastdigits + '(?:[^>]*>){10,20}\\s*</tr>', 'i');
	
	var tr = getParam(html, null, null, reCard);
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту или счет с последними цифрами '+prefs.lastdigits : 'ни одного счета или карты!'));
	
	AnyBalance.trace(tr);
	
	var result = {success: true};
	
	getParam(tr, result, 'balance', /(?:[^>]*>){20}([\d\s.,]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance'], /(?:[^>]*>){18}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /(?:[^>]*>){15}(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'account', /(?:[^>]*>){15}(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'acc_name', /(?:[^>]*>){2}[^>]*title="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Дополнительная инфа по картам.
	if (AnyBalance.isAvailable('own', 'avail', 'debt', 'fill', 'expense', 'overdraft', 'blocked')) {
		var wForm = getParam(tr, null, null, /(welcomeForm:j_id_jsp_[^']+)/i);
		var accountId = getParam(tr, null, null, /accountId'\s*,\s*'(\d+)/i);
		
		if(wForm && accountId) {
			html = AnyBalance.requestPost(baseurl + 'protected/welcome.jsf', {
				'welcomeForm_SUBMIT':'1',
				'javax.faces.ViewState':getViewState(html),
				'accountId':accountId,
				'welcomeForm:_idcl': wForm,
			}, addHeaders({Referer: baseurl + 'protected/welcome.jsf'}));
			
			getParam(html, result, ['own', 'blocked'], /&#1042;&#1083;&#1072;&#1089;&#1085;&#1110; &#1082;&#1086;&#1096;&#1090;&#1080;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, ['avail', 'blocked'], /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1072; &#1089;&#1091;&#1084;&#1072;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'debt', /&#1047;&#1072;&#1075;&#1072;&#1083;&#1100;&#1085;&#1072; &#1079;&#1072;&#1073;&#1086;&#1088;&#1075;&#1086;&#1074;&#1072;&#1085;&#1110;&#1089;&#1090;&#1100; &#1079;&#1072; &#1088;&#1072;&#1093;&#1091;&#1085;&#1082;&#1086;&#1084; &#1089;&#1082;&#1083;&#1072;&#1076;&#1072;&#1108;([\d\s.,]+)/i, replaceTagsAndSpaces, parseBalance);
			
			if(isAvailable(['blocked'])) {
				getParam(result.own - result.avail, result, 'blocked');
			}
			
			if(isAvailable(['fill', 'expense', 'overdraft'])) {
				var periodParams = {
					'cardAccountInfoForm:reportPeriod':'1',
					'accountId':accountId,
					'cardAccountInfoForm_SUBMIT':'1',
					'javax.faces.ViewState':getViewState(html),
				};
				
				var params = sumParam(html, null, null, /(cardAccountInfoForm:[^']+)'\),'dd.MM.yyyy'/ig);
				
				var dt = new Date();
				var month = dt.getMonth()+1;
				var year = dt.getFullYear();
				
				periodParams[params[0]] = '01.' + month + '.' + year;
				periodParams[params[1]] = dt.getDate() + '.' + month + '.' + year;
				
				html = AnyBalance.requestPost(baseurl + 'protected/reports/sap_card_account_info.jsf', periodParams, addHeaders({Referer: baseurl + 'protected/welcome.jsf'}));
				
				getParam(html, result, 'fill', /&#1056;&#1072;&#1079;&#1086;&#1084; &#1087;&#1086;&#1087;&#1086;&#1074;&#1085;&#1077;&#1085;&#1100;([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
				getParam(html, result, 'expense', /&#1056;&#1072;&#1079;&#1086;&#1084; &#1089;&#1087;&#1080;&#1089;&#1072;&#1085;&#1085;&#1103; &#1082;&#1086;&#1096;&#1090;&#1110;&#1074;([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
				getParam(html, result, 'overdraft', /&#1044;&#1086;&#1089;&#1090;&#1091;&#1087;&#1085;&#1080;&#1081; &#1086;&#1074;&#1077;&#1088;&#1076;&#1088;&#1072;&#1092;&#1090;:([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			}
		} else {
			AnyBalance.trace('Не нашли ссылку на дополнительную информацию, возможно, сайт изменился?');
		}
	}
	
	AnyBalance.setResult(result);
}

function getViewState(html) {
	return getParam(html, null, null, /javax.faces.ViewState[^>]*value="([^"]+)/i);
}