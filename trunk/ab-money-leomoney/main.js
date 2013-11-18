var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.69 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Phone number in international form, for example, +971552344334');
	checkEmpty(prefs.password, 'Enter password!');
	
	var baseurl = "https://leomoney.ru/";
	AnyBalance.setDefaultCharset('utf-8');
	var rePrefixes = /^\+(1|7|44|373|374|375|380|971|992|993|994|996|998)(\d+)$/;
	if (!prefs.login || !rePrefixes.test(prefs.login)) throw new AnyBalance.Error('Номер ' + prefs.login + ' введен неправильно или имеет неправильный код страны.');
	
	var matches = prefs.login.match(rePrefixes);
	
	if (matches[1] != '7' && matches[1] != '971') 
		throw new AnyBalance.Error('Провайдер пока поддерживает только российские и эмиратские номера. Для поддержки других стран обращайтесь к автору провайдера.');
	
	if (matches[1] == '7') {
		var html = AnyBalance.requestPost(baseurl + 'security/signin', {
			flags0: matches[1],
			LoginClear: matches[2],
			Password: prefs.password,
			x: 24,
			y: 22,
			ReturnUrl: '',
			Login: prefs.login.replace('+', '')
		}, addHeaders({
			Origin: baseurl,
			Referer: baseurl
		}));
		
		if (!/\/security\/signout/i.test(html)) {
			var error = getParam(html, null, null, /\$\('#window1'\)\.html\('([\s\S]*?)'\)/i, replaceSlashes);
			if (error) 
				throw new AnyBalance.Error(error);
			//Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		//Раз мы здесь, то мы успешно вошли в кабинет
		var result = {success: true};
		
		getParam(html, result, '__tariff', /((?:Кошелек №|Wallet No.)\s*\d+)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam('р', result, ['currency', 'balance', 'spent', 'limit']);
		getParam(html, result, 'balance', /(?:Ваш баланс|Your balance):([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalanceRK);
		getParam(html, result, 'spent', /(?:Из них израсходовано|Spent):([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'limit', /(?:Месячный лимит|Monthly limit):([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'wallet', /(?:Кошелек №|Wallet No.)\s*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
		
		AnyBalance.setResult(result);
	} else {
		var baseurl = "http://leomoney.ae/";
		var html = AnyBalance.requestPost(baseurl + 'security/signin2', {
			login: prefs.login,
			password: prefs.password
		}, addHeaders({Origin: baseurl, Referer: baseurl}));
		
		var json = getJson(html);
		
		if (json.Code != 0) {
			var error = json.Details;
			if (error) throw new AnyBalance.Error(error);
			//Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
			throw new AnyBalance.Error('Could not enter personal accont. Is the site changed?');
		}
		
		html = AnyBalance.requestGet(baseurl, addHeaders({ Origin: baseurl, Referer: baseurl }));
		//Раз мы здесь, то мы успешно вошли в кабинет
		var result = {success: true};
		
		getParam(html, result, '__tariff', /<span[^<]+class="auth_ewallet_num"[^<]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'balance', /<div[^<]+class="auth_money_count"[^<]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'balance'], /<div[^<]+class="auth_money_count"[^<]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseCurrency);
		getParam(html, result, 'wallet', /<span[^<]+class="auth_ewallet_num"[^<]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		
		AnyBalance.setResult(result);
	}
}

function parseBalanceRK(_text) {
	var text = _text.replace(/\s+/g, '');
	var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceFloat, parseFloat) || 0;
	var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceFloat, parseFloat) || 0;
	var val = rub + kop / 100;
	AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
	return val;
}