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
	
	if (!/issa_exit/i.test(html)) {
		var error = getElement(html, /<div[^>]+error[^>]*>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	// Ищем по наименованию или по номеру лиц счета
	var href = getParam(html, null, null, new RegExp('wuxify-me[^>]*?href="([^"]*)[^>]*>\\s*' + (prefs.account || '') + '[\\s\\S]*?<\\/a>', 'i'), replaceHtmlEntities);
	if(!href)
		href = getParam(html, null, null, new RegExp('wuxify-me[^>]+?href="([^"]*\\?acc=' + (prefs.account || '') + '[^"]*)', 'i'), replaceHtmlEntities);
	if(!href)
		throw new AnyBalance.Error('Не найден ' + (prefs.account ? 'лицевой счет "' + prefs.account + '"' : 'ни один счет'));
	
    var result = {success: true},
    	table, rows, row;

	getParam(href, result, 'account_id', /\?acc=(\d+)/i, decodeURIComponent);
	html = AnyBalance.requestGet(baseurl + href, g_headers);
	html = AnyBalance.requestGet(baseurl + 'issa_acc/', g_headers);

    table = getParam(html, null, null, /Состояние счета:[\s\S]*?(<table[^>]*>([\s\S]*?)<\/table>)/i);

    var colsDef = {
        __sum: {
            re: /Исходящий остаток/i,
            result_process: function(path, td, result){
            	if(/руб/i.test(td)){
                	getParam(td, result, path + '__balance', null, replaceTagsAndSpaces, parseBalance);
            	}else{
                	getParam(td, result, path + '__balance_usd', null, replaceTagsAndSpaces, parseBalance);
            	}
            }
        },
    };

    var balances = [];
    processTable(table, balances, '', colsDef);

    for(var i=0; i<balances.length; ++i){
    	for(var name in balances[i]){
			getParam(balances[i][name], result, name.replace(/^_+/, ''));
		}
    }

    table = getParam(html, null, null, /Ресурсы Номера:[\s\S]*?(<table[^>]*>([\s\S]*?)<\/table>)/i);
    colsDef = {
        name: {
            re: /РЕСУРС/i,
            result_func: null
        },
        till: {
            re: /КОНЕЦ ДЕЙСТВИЯ/i,
            result_func: parseDate
        },
        value: {
            re: /ОСТАТОК/i,
            result_func: null
        },
    };
    var resources = [];
    processTable(table, resources, '__', colsDef);

	for(var i = 0; i < resources.length; i++){
		var row = resources[i];
		if(/SMS/i.test(row.__name)) {
			// SMS 
			sumParam(row.__value, result, 'sms', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(/Время/i.test(row.__name)) {
			// Минуты
			sumParam(row.__value, result, 'minutes', null, replaceTagsAndSpaces, parseMinutes, aggregate_sum);
		} else if(/Трафик/i.test(row.__name)) {
			// Трафик
			sumParam(row.__value, result, 'traf', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
		} else if(/Simple/i.test(row.__name)) {
			// Мини-пакет Simple
			sumParam(row.__value, result, 'simple', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			getParam(prefs.currency || 'rub', result, ['currency', 'simple']);
		} else {
			AnyBalance.trace('Unknown option, contact the developers, please.');
			AnyBalance.trace(JSON.stringify(row));
		}
	}

	if(isAvailable('traf_used')){
		html = AnyBalance.requestGet(baseurl + 'issa_charge/', g_headers);

		table = getParam(html, null, null, /Начисления:[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
		sumParam(table, result, 'traf_used', /Трафик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
		sumParam(table, result, 'traf_used_sum', /Трафик(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
	}
	
    AnyBalance.setResult(result);
}