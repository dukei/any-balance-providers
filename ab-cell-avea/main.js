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
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.avea.com.tr/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl + 'mps/portal?cmd=onlineTransactionsHome&lang=tr&tb=redTab', g_headers);

	var Xlogin = getParam(html, null,null, /value="5xxxxxxxxx"[^>]*([0-9a-f]{32})/i);
	var Xpass = getParam(html, null,null, /focusssPass[^>]*([0-9a-f]{32})/i);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if(name == Xlogin)
			return prefs.login;
		else if(name == Xpass)
			return prefs.password;
		return value;
	});
	html = AnyBalance.requestPost(baseurl + 'mps/portal?cmd=Login&lang=tr', params, addHeaders({Referer: baseurl + 'mps/portal?cmd=Login&lang=tr'}));

	if(!/logout/i.test(html)) {
		// Иногда оно не хочет входить и требует капчу, но так не навязчиво, что если еще раз авторизоваться, то все ок
		Xlogin = getParam(html, null,null, /value="5xxxxxxxxx"[^>]*([0-9a-f]{32})/i);
		Xpass = getParam(html, null,null, /focusssPass[^>]*([0-9a-f]{32})/i);
		
		params[Xlogin] = prefs.login;
		params[Xpass] = prefs.password;
		
		html = AnyBalance.requestPost(baseurl + 'mps/portal?cmd=Login&lang=tr', params, addHeaders({Referer: baseurl + 'mps/portal?cmd=Login&lang=tr'}));
		
		if(!/logout/i.test(html)) {
			var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);
			throw new AnyBalance.Error('Login failed, is site changed?');
		}
	}
	
	var result = {success: true};
	
	// Предоплата
	if(prefs.billing) {
		html = AnyBalance.requestGet(baseurl + 'mps/portal?cmd=dashboard&lang=tr&pagemenu=paket.mevcutPaket', g_headers);
		
		getParam(html, result, '__tariff', /Tarifeniz:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'balance', /Kalan Bakiyeniz:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
		var bonusesTable = getParam(html, null, null, /(<table[^>]*class="oim_table"[\s\S]*?<\/table>)/i);
		if(bonusesTable) {
			var bonusRows = sumParam(bonusesTable, null, null, /<tr>[\s\S]*?<\/tr>/ig);
			for(i=0; i< bonusRows.length; i++) {
				var curr = bonusRows[i];
				var optionName = getParam(curr, null, null, /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\//i);
				// Это бонусные пакеты
				if(/bonus/i.test(optionName)) {
					//AnyBalance.trace('Found bonuses: ' + curr);
					// Трафик
					if(/\d+\s*GB/i.test(optionName)) {
						sumParam(curr, result, 'bonus_traf', /(?:[\s\S]*?<td[^>]*>){5}[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					// SMS 
					} else if(/\d+\s*SMS/i.test(optionName)) {
						sumParam(curr, result, 'bonus_sms', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					// Минуты
					} else if(/\d+\s*(?:dk|Dakika)/i.test(optionName)) {
						sumParam(curr, result, 'bonus_minutes', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
						//getParam(curr, result, 'minutes', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					} else {
						AnyBalance.trace('Unknown bonus-option: ' + optionName + ', contact the developers, please.');
						AnyBalance.trace(curr);
					}
				// это обычные пакеты
				} else {
					// Трафик
					if(/\d+\s*GB/i.test(optionName)) {
						sumParam(curr, result, 'traf', /(?:[\s\S]*?<td[^>]*>){5}[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
					// SMS 
					} else if(/\d+\s*SMS/i.test(optionName)) {
						sumParam(curr, result, 'sms', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					// Минуты
					} else if(/\d+\s*(?:dk|Dakika)/i.test(optionName)) {
						sumParam(curr, result, 'minutes', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
						//getParam(curr, result, 'minutes', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
					} else {
						AnyBalance.trace('Unknown option: ' + optionName + ', contact the developers, please.');
						AnyBalance.trace(curr);
					}
				}
			}
		}
	// Постоплата
	} else {
		html = AnyBalance.requestGet(baseurl + 'mps/portal?cmd=guncelKullanim&lang=tr&pagemenu=faturaislemleri.guncelfatura', g_headers);
		
		getParam(html, result, '__tariff', /Tarife:(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'fatura', /<\s*b\s*>\s*G&uuml;ncel Fatura(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'bill_date', /<\s*b\s*>\s*Fatura Kesim Tarihi(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		// не работает больше
		//getParam(html, result, 'bonus_minutes', /Kalan S\&uuml;re:(?:[^>]*>){3}[^<]*?kadar gecerli([^<]*?)DKniz/i, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'minutes', /Kalan S\&uuml;re:(?:[^>]*>){3}[^<]*kadar gecerli([^<]*?)DKniz/i, replaceTagsAndSpaces, parseBalance);
		
		var time = getParam(html, null, null, /Kalan S\&uuml;re:(?:[^>]*>){3}([^<]*)/i);
		// Это минуты на все звонки, есть еще внутри сетевые вызовы, но пока таких тарифов нет
		sumParam(time, result, 'minutes', /Heryone([^<]*?)DKniz/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		sumParam(time, result, 'minutes_local', /\s+ici([^<]*?)DKniz/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		getParam(time, result, 'total_minutes', null, replaceTagsAndSpaces, html_entity_decode);
		
		// Это переделывать надо
		sumParam(html, result, 'traf', /kadar gecerli([^<]*MB)/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
		sumParam(html, result, 'sms', /kadar gecerli([^<]*)SMS/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	}
	
    AnyBalance.setResult(result);
}