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
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + '?service=track', {
		barCode: prefs.cargo,
        keystring: captchaa
	}, addHeaders({Referer: baseurl}));
	
	if (/color=red|notered|bgcolor="yellow"/i.test(html)) {
        if (/color=red/i.test(html)) {
            var error = getParam(html, null, null, /color=red[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
            if (error)
                throw new AnyBalance.Error(error, null, /Мы Не знаем какой компанией было выслано ваше отправление/i.test(error));      
        } else if (/notered/i.test(html)) {
            var error = getParam(html, null, null, /class="notered"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
            if (error)
                throw new AnyBalance.Error(error, null, /Вы не верно ввели код защиты/i.test(error));          
        } else if (/bgcolor="yellow"/i.test(html)) {
            var error = getParam(html, null, null, /bgcolor="yellow"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
            if (error)
                throw new AnyBalance.Error(error, null, /запрашиваемый номер отсутствует в базе данных/i.test(error));                
        } else {
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось получить результат. Сайт изменен?');
        }
	}
	
	var result = {success: true};

    var trs = sumParam(html, null, null, /<tr class="result"\s*?[\s\S]*?<\/tr>/ig);
    var len = trs.length - 1;
    
    getParam(trs[len], result, 'trace_date', /class="tr_date"([^>]*>){3}/i, replaceTagsAndSpaces, parseDate);
    getParam(trs[len], result, 'index', /<td>([^>]*>){1}/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(trs[len], result, 'place', /<td>([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(trs[len], result, 'status', /class="tr_action"[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);

	if (AnyBalance.isAvailable('fulltext')) {
        var res = [];
        for (var i = 1; i < trs.length; i++) {       
            var trace_date = getParam(trs[i], null, null, /class="tr_date"([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
            var place = getParam(trs[i], null, null, /<td>([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
            var status = getParam(trs[i], null, null, /class="tr_action"[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, html_entity_decode);
            res.push('<b>' + trace_date + '</b> ' + 'Место: ' + place + '. ' + status);
        }
        result.fulltext = res.join('<br/>');
	}
	
	AnyBalance.setResult(result);
}