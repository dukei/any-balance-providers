/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите 10 цифр номера телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var lang = prefs.lang || 'kk';
	
	var baseurl = "http://www.kcell.kz/" + lang + "/ics.security/authenticate";
	var ibaseurl = 'https://i.kcell.kz/';
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestPost(baseurl, {
		msisdn: '7' + prefs.login,
		password: prefs.password
	}, g_headers);
	
	if (!/\/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*class="[^"]*error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) {
			if (/Activ/i.test(error)) 
				error += ' Пожалуйста, воспользуйтесь отдельным провайдером для Activ (Казахстан).';
			
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
	var result = {success: true, balance: null};
	
	getParam(html, result, 'balance', /(?:Доступные средства|Пайдалануға болатын қаржы|Available:|Ваш баланс|Сіздің теңгеріміңіз|Your balance is)([\s\d.,\-]*тг)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /(?:Номер лицевого счета|Дербес шот нөмірі|Account):[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'userName', [/"cvet account_name"[^>]*>([^<]+)/i, /<h2[^>]*>([\s\S]*?)<\/h2>/i], replaceTagsAndSpaces, html_entity_decode);
	// Не отображается
	getParam(html, result, '__tariff', /(?:Тарифный план|Тариф|Tariff):[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'internet', /(?:Остатки по доп. услугам|Қосымша қызметтер бойынша қалдық|Available for VAS):[^<]*?GPRS\s*-?([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'sms_left', /(?:Остатки по доп. услугам|Қосымша қызметтер бойынша қалдық|Available for VAS):[^<]*?(?:Бонусные смс|Бонустық SMS|Bonus SMS)\s*-?([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'min_left', [/(?:Остатки по доп. услугам|Қосымша қызметтер бойынша қалдық|Available for VAS):[^<]*?(\d+)\s*(?:бонусных мин|бонустық минут|bonus on-net min)/i, /(?:Остатки по доп. услугам|Қосымша қызметтер бойынша қалдық|Available for VAS):[^<]*?(?:Бонустық минуттар|Бонусные минуты|Bonus Minutes)\s*-?([^<]*)\s*(?:мин|min)/i], replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable(['internet']) && !isset(result.internet)) {
		try {
			html = AnyBalance.requestGet('https://www.kcell.kz/ru/ics.account/getconnectedservices/1200', g_headers);
			var json = getJson(html);
			for(var i = 0; i < json.enabledPacks.length; i++) {
				var current = json.enabledPacks[i];
				
				if(/internet/i.test(current.serviceUrl)) {
					getParam(current.packInfoDto.bytes + 'bytes', result, 'internet', null, replaceTagsAndSpaces, parseTraffic);
				}
			}
		} catch(e) {
			AnyBalance.trace('Не удалось получить данные по подключенным услугам.');
		}
	}
	
	// PUK получаем в переменную, но не отображаем из соображений безопасности
	// var puk = getParam(html, result, null, /PUK[\s\S]*?(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	// if (puk) {
		// AnyBalance.trace('Нашли puk-код, пробуем зайти на i.kcell.kz...');
		// // Нашли PUK код
		// html = AnyBalance.requestPost(ibaseurl + 'enter', {
			// 'msisdn': prefs.login,
			// 'puk': puk,
			// token: ''
		// }, g_headers);
		// getParam(html, result, 'inet_unlim', /До снижения скорости\s*-([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic);
	// }
	AnyBalance.setResult(result);
}