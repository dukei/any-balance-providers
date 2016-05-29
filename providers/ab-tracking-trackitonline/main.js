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
	var baseurl = 'http://trackitonline.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.cargo, 'Введите номер отправления!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var cap_href = getParam(html, null, null, /(cap\/cap\.php[\s\S]*?)"/i);
    
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		AnyBalance.setOptions({forceCharset: 'base64'});
		var captcha = AnyBalance.requestGet(baseurl + cap_href);
		AnyBalance.setOptions({forceCharset: 'utf-8'});
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha, {inputType: 'number'});
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + '?service=track', {
		barCode: prefs.cargo,
        keystring: captchaa
	}, addHeaders({Referer: baseurl}));
	
	var linkdiv = getElement(html, /<div[^>]+postlink[^>]*>/i);
	if (!linkdiv) {
		var error = getElement(html, /<div[^>]+warning[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error);                
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить результат. Сайт изменен?');
	}
	
	var result = {success: true};

	var link = getParam(linkdiv, null, null, /<a[^>]+href="([^"]*)/i, replaceHtmlEntities);
	html = AnyBalance.requestGet(joinUrl(baseurl, link), g_headers);

	var table = getElements(html, [/<table[^>]*>/ig, /Дата и время|Дата і час/i])[0];
	if(!table){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти таблицу статусов. Сайт изменен?');
	}
		
    var colsDef = {
        date: {
            re: /Дата и время|Дата і час/i,
            result_replace: null,
            result_func: null
        },
        descr: {
            re: /Событие|Подія/i,
            result_replace: null,
            result_func: null
        },
        weight: {
            re: /Вес|Вага/i,
        },
        extra: {
            re: /Дополнительно|Додатково/i,
            result_func: null,
        },
    };

    var rows = [];
    processTable(table, rows, '__', colsDef);
	var row = rows[rows.length-1];
	if(!row){
		var error = getElement(html, /<div[^>]+warning[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error(error);                
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить результат. Сайт изменен?');
	}

    getParam(row.__date, result, 'trace_date', /<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
    getParam(row.__date, result, 'index', /<div[^>]*center[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(row.__descr, result, 'status', /<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
    getParam(row.__descr, result, 'place', /<div[^>]*(?:место|Місце)[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    sumParam(row.__extra, result, 'place', null, null, null, aggregate_join);

	if (AnyBalance.isAvailable('fulltext')) {
        var res = [];
        for (var i = 0; i < rows.length; i++) {
        	var row = rows[i];
            var trace_date = getParam(row.__date, null, null, /<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
            var place = getParam(row.__descr, null, null, /<div[^>]*(?:место|Місце)[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
            var status = getParam(row.__descr, null, null, /<a[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
            res.push('<b>' + trace_date + '</b> ' + status + '. Место: ' + (place || '-'));
        }
        result.fulltext = res.join('<br/>');
	}
	
	AnyBalance.setResult(result);
}