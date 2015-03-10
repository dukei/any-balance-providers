/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.idc.md/';
	// Это не ошибка, смена кодировок между запросами реализована на сайте, уже не знаю зачем.
	AnyBalance.setOptions({forceCharset: 'UTF-8'});
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		// Это не ошибка, смена кодировок между запросами реализована на сайте, уже не знаю зачем.
		AnyBalance.setOptions({forceCharset: 'base64'});
		var captcha = AnyBalance.requestGet(baseurl+ 'keypic.php?r=' + Math.random(), g_headers);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	// Это не ошибка, смена кодировок между запросами реализована на сайте, уже не знаю зачем.
	AnyBalance.setOptions({forceCharset: 'UTF-8'});
	
	html = AnyBalance.requestPost(baseurl, {
        user:prefs.login,
        pass:prefs.password,
        secretkey:captchaa
    }, addHeaders({Referer: baseurl})); 
	
	if (!/Личный кабинет/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="alert-box error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error && /Неверный логин или пароль./i.test(error))
			throw new AnyBalance.Error(error, null, true);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	// Ищем по наименованию или по номеру лиц счета
	var href = getParam(html, null, null, new RegExp('wuxify-me[^>]*?href="([^"]*)[^>]*>\\s*' + (prefs.account || '') + '[\\s\\S]*?<\\/a>', 'i'));
	if(!href)
		href = getParam(html, null, null, new RegExp('wuxify-me[^>]+?href="\\?acc=' + (prefs.account || '[^"]*') + '">', 'i'));
	if(!href)
		throw new AnyBalance.Error('Не найден ' + (prefs.account ? 'лицевой счет "' + prefs.account + '"' : 'ни один счет'));
	
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	html = AnyBalance.requestGet(baseurl + 'issa_acc/', g_headers);

    var result = {success: true},
    	table, rows, row;

    table = getParam(html, null, null, /Состояние счета:[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
	getParam(table, result, 'balance_usd', /<tr[^>]*>(?:\s*<td[^>]*>[\s\S]*?<\/td>){3}\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, 'balance', /<\/tr>\s*<tr[^>]*>(?:\s*<td[^>]*>[\s\S]*?<\/td>){3}\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

	table = getParam(html, null, null, /Ресурсы Номера:[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
	rows = sumParam(table, null, null, /<tr[^>]*>([\s\S]*?)<\/tr>/ig);

	for(var i = 0, toi = rows.length; i < toi; i++){
		row = rows[i];
		if(/SMS/i.test(row)) {
			// SMS 
			sumParam(row, result, 'sms', /(?:\s*<td[^>]*>[\s\S]*?<\/td>){4}\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(/Время/i.test(row)) {
			// Минуты
			sumParam(row, result, 'minutes', /(?:\s*<td[^>]*>[\s\S]*?<\/td>){4}\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
		} else if(/Трафик/i.test(row)) {
			// Трафик
			sumParam(row, result, 'traf', /(?:\s*<td[^>]*>[\s\S]*?<\/td>){4}\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(/Simple/i.test(row)) {
			// Мини-пакет Simple
			sumParam(row, result, 'simple', /(?:\s*<td[^>]*>[\s\S]*?<\/td>){4}\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else {
			AnyBalance.trace('Unknown option, contact the developers, please.');
			AnyBalance.trace(row);
		}
	}

	if(isAvailable('traf_used')){
		html = AnyBalance.requestGet(baseurl + 'issa_charge/', g_headers);

		table = getParam(html, null, null, /Суммарная статистика за месяц[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
		getParam(table, result, 'traf_used', /<tr[^>]*>(?:\s*<td[^>]*>[\s\S]*?<\/td>){2}\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseTraffic);
	}

	getParam(prefs.currency || 'rub', result, ['currency', 'simple']);
	getParam(html, result, 'account_id', /\?acc=(\d+)/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}