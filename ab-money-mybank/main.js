/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Accept-Encoding': 'gzip, deflate',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.111 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://new.mybank.by/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!prefs.dbg) {
		var html = AnyBalance.requestGet(baseurl + 'ib/site/login', g_headers);

		if(!html || AnyBalance.getLastStatusCode() > 400){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}

		html = AnyBalance.requestPost(baseurl + 'ib/site/login', {
			name: prefs.login,
			password: prefs.password,
			session_token: '',
			lang: ''
		}, addHeaders({Referer: baseurl, Origin: baseurl}));
	} else {
		var html = AnyBalance.requestGet('https://new.mybank.by/ib/site/dashboard/v2', g_headers);
	}

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="error"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var info = getParam(html, null, null, new RegExp('<div[^>]+class="product-body"[^>]*>(?:[^>]*>){50,60}[\\d_]+' + (prefs.num || ''), 'i'));
	if(!info) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.num ? 'карту с последними цифрами ' + prefs.num : 'ни одной карты!'));
	}
	
	var result = {success: true};
	
	getParam(info, result, 'balance', /balance"[^>]*>([\s\S]*?)<\/span/i, [/'/g, '', replaceTagsAndSpaces], parseBalance);
	getParam(info, result, 'limit', /лимит([^<)]*)/i, [/'/g, '', replaceTagsAndSpaces], parseBalance);
	
	// if(isset(result.balance) && isset(result.limit)) {
		// getParam(result.balance - result.limit, result, 'cred');
	// }
	getParam(info, result, ['currency', 'balance', 'limit', 'debt', 'nachisl', 'grace_pay'], /balance"[^>]*>([\s\S]*?)<\/span/i, [/'/g, '', replaceTagsAndSpaces], parseCurrency);
	getParam(info, result, 'cardname', /showFromTemplate[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'cardnum', /card-link-one[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, '__tariff', /card-link-one[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(info, result, 'order_num', /"product-under-title"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['debt', 'nachisl', 'grace_pay', 'grace_pay_till'])) {
		var token = getParam(html, null, null, /"session_token"[^>]*value="([^"]+)/i);
		var url = getParam(info, null, null, /\.setUrl\('\\\/([^"']+)/i);
		var contractCode = getParam(info, null, null, /contractCode'\s*:\s*'(\d+)/i);
		
		if(!token && !url && !contractCode) {
			AnyBalance.trace(info);
			throw new AnyBalance.Error('Не удалось поучить дополнительную информацию по карте! Сайт изменен?');
		}
		
		html = AnyBalance.requestPost(baseurl + url, {
			'session_token': token,
			'contractCode': contractCode,
			'action': 'showFromDashboard'
		}, addHeaders({Referer: baseurl, Origin: 'https://new.mybank.by'}));
		
		getParam(html, result, 'debt', /Задолженность по основному долгу:(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/div/i, [/'/g, '', replaceTagsAndSpaces], parseBalance);
		getParam(html, result, 'nachisl', /Начисл. проценты:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/div/i, [/'/g, '', replaceTagsAndSpaces], parseBalance);
		getParam(html, result, 'grace_pay', /Сумма и дата ближайшего минимального платежа:(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/div/i, [/'/g, '', replaceTagsAndSpaces], parseBalance);
		getParam(html, result, 'grace_pay_till', /Сумма и дата ближайшего минимального платежа:(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/div/i, [/'/g, '', replaceTagsAndSpaces], parseDate);
	}
	
	AnyBalance.setResult(result);
}