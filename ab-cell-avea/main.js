/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://www.avea.com.tr',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function getXLogin(html) {
	return getParam(html, null,null, /placeholder=['"]5xxxxxxxxx['"][^>]*name=['"]([0-9a-f]{32})['"]/i);
}

function getXpass(html) {
	return getParam(html, null,null, /for=['"]redpassword['"](?:[\s\S](?!name))+\s+name=['"]([0-9a-f]{32})['"]/i);
}

function checkErrors(html) {
	var error = getParam(html, null,null, /<script type=['"]text\/javascript['"]>ShowModalAlert\(['"]((?:[\s\S](?!['"]\)))*\S)['"]\)/i, replaceTagsAndSpaces, html_entity_decode);
	if(error)
		throw new AnyBalance.Error(error, null, /Kullanıcı adınız ya da şifreniz hatalıdır/i.test(error));
}


function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.avea.com.tr/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'mps/portal?cmd=onlineTransactionsHome&lang=tr&tb=redTab', g_headers);
	
	var params = {
		'SubmitImage':'Giriş'
	};
	
	params[getXLogin(html)] = prefs.login;
	params[getXpass(html)] = prefs.password;
	
	html = AnyBalance.requestPost(baseurl + 'mps/portal?cmd=Login&lang=tr', params, addHeaders({Referer: baseurl + 'mps/portal?cmd=Login&lang=tr'}));

	if(!/logout/i.test(html)) {
		checkErrors(html);

		// Иногда оно не хочет входить и требует капчу, но так не навязчиво, что если еще раз авторизоваться, то все ок
		params[getXLogin(html)] = prefs.login;
		params[getXpass(html)] = prefs.password;
		
		html = AnyBalance.requestPost(baseurl + 'mps/portal?cmd=Login&lang=tr', params, addHeaders({Referer: baseurl + 'mps/portal?cmd=Login&lang=tr'}));
		
		if(!/logout/i.test(html)) {
			checkErrors(html);

			throw new AnyBalance.Error('Login failed, is site changed?');
		}
	}
	if(/Şifrenizi değiştirmek i&ccedil;in aşağıdaki alanları doldurup G&ouml;nder butonuna tıklamanız gerekmektedir./i.test(html))
		throw new AnyBalance.Error('Login failed, your password correct, but you need to change it. Please enter seflcare from desktop and change password.');
	
	var result = {success: true};
	// Предоплата
	if(prefs.billing) {
		AnyBalance.trace('It looks like we are in pre paid selfcare...');
		html = AnyBalance.requestGet(baseurl + 'mps/portal?cmd=dashboard&lang=tr&pagemenu=paket.mevcutPaket', g_headers);
		
		getParam(html, result, '__tariff', /Tarifeniz:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'balance', /Kalan Bakiyeniz:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
		var rowsTitles = sumParam(html, null, null, /<div class="package-list-title">[\s\S]*?<\/div>/ig);
		for(var i = 0, toi = rowsTitles.length; i < toi; i++){
			var rowTitle = rowsTitles[i],
				rowValue = getParam(html, null, null, new RegExp(rowTitle + '[\\s\\S]+?<div class="progress-text text-center">\\s*([^<]+)', 'i'), replaceTagsAndSpaces);
			if(/bonus/i.test(rowTitle)){
				// Это бонусные пакеты
				// Трафик
				if(/\d+\s*(?:K|M|G)B/i.test(rowValue)) {
					sumParam(rowValue, result, 'bonus_traf', /[\s\S]+/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
				// SMS 
				} else if(/\d+\s*SMS/i.test(rowValue)) {
					sumParam(rowValue, result, 'bonus_sms', /[\s\S]+/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				// Минуты
				} else if(/\d+\s*(?:dk|Dakika)/i.test(rowValue)) {
					sumParam(rowValue, result, 'bonus_minutes', /[\s\S]+/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else {
					AnyBalance.trace('Unknown bonus-option, contact the developers, please.');
					AnyBalance.trace(rowValue);
				}
			} else {
				// Это обычные пакеты
				// Трафик
				if(/\d+\s*(?:K|M|G)B/i.test(rowValue)) {
					sumParam(rowValue, result, 'traf', /[\s\S]+/i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
				// SMS 
				} else if(/\d+\s*SMS/i.test(rowValue)) {
					sumParam(rowValue, result, 'sms', /[\s\S]+/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				// Минуты
				} else if(/\d+\s*(?:dk|Dakika)/i.test(rowValue)) {
					sumParam(rowValue, result, 'minutes', /[\s\S]+/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				} else {
					AnyBalance.trace('Unknown bonus-option, contact the developers, please.');
					AnyBalance.trace(rowValue);
				}
			}
		}
	// Постоплата
	} else {
		AnyBalance.trace('It looks like we are in post paid selfcare...');
		html = AnyBalance.requestGet(baseurl + 'mps/portal?cmd=guncelKullanim&lang=tr&pagemenu=faturaislemleri.guncelfatura', g_headers);
		
		getParam(html, result, '__tariff', /Tarife:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'fatura', /G&uuml;ncel Fatura:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'bill_date', /Fatura Kesim Tarihi:(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		// не работает больше
		//getParam(html, result, 'bonus_minutes', /Kalan S\&uuml;re:(?:[^>]*>){3}[^<]*?kadar gecerli([^<]*?)DKniz/i, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'minutes', /Kalan S\&uuml;re:(?:[^>]*>){3}[^<]*kadar gecerli([^<]*?)DKniz/i, replaceTagsAndSpaces, parseBalance);
		
		var time = getParam(html, null, null, /Kalan S\&uuml;re:(?:[^>]*>){2}([^<]*)/i);
		if(time) {
			// Это минуты на все звонки, есть еще внутри сетевые вызовы, но пока таких тарифов нет
			sumParam(time, result, 'minutes', /Heryone([^<]*?)DK(?:niz)?/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			sumParam(time, result, 'minutes_local', /\s+ici([^<]*?)DK(?:niz)?/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			getParam(time, result, 'total_minutes', null, replaceTagsAndSpaces, html_entity_decode);
			
			// Это переделывать надо
			sumParam(html, result, 'traf', /kadar gecerli([^<]*MB)/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			sumParam(html, result, 'sms', /kadar gecerli([^<]*)SMS/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else {
			AnyBalance.trace('Can`t find minutes table!');
		}
	}
	
    AnyBalance.setResult(result);
}