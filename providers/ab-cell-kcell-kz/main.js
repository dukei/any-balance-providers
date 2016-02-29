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
	
	var baseurl = "https://www.kcell.kz/" + lang + "/ics.security/authenticate";
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

            var isFatal = /(?:неверный номер телефона или пароль|енгізген телефон нөміріңіз немесе пароліңіз|incorrect phone number or password)/i.test(error);
			throw new AnyBalance.Error(error, null, isFatal);
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
	var result = {success: true, balance: 0};
	
	getParam(html, result, 'balance', /(?:Баланс|Теңгерім|Balance):[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /(?:Номер лицевого счета|Дербес шот нөмірі|Account):[\s\S]*?<font[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'userName', '<span[^>]*class="cvet\s+account_name">([\s\S]+?)<\/span>', replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'bonuses', /(?:Бонусы|Бонустар|Bonuses):[\s\S]*?<font[^>]*>([^<]+?)<\/font>/, replaceTagsAndSpaces, html_entity_decode);

	getParam(html, result, '__tariff', /(?:Тарифный план|Тариф|Tariff):[\s\S]*?<font[^>]*>([^<]+?)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'internet', /(?:Остатки по доп. услугам|Қосымша қызметтер бойынша қалдық|Available for VAS):[^<]*?GPRS\s*-?([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable(['internet']) && !isset(result.internet)) {
		try {
			html = AnyBalance.requestGet('https://www.kcell.kz/ru/ics.account/getconnectedservices/1200', g_headers);
			var json = getJson(html);
			for(var i = 0; i < json.enabledPacks.length; i++) {
				var current = json.enabledPacks[i];
				
				if(/internet/i.test(current.serviceUrl) || /интернет/i.test(current.localizedName)) {
					getParam(current.packInfoDto.bytes + 'bytes', result, 'internet', null, replaceTagsAndSpaces, parseTraffic);
				}
			}
		} catch(e) {
			AnyBalance.trace('Не удалось получить данные по подключенным услугам.');
		}
	}

	AnyBalance.setResult(result);
}