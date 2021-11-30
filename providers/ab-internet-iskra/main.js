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

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 $2 $3-$4-$5'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
	var cabinet = prefs.cabinet || '7sky';
	
	AnyBalance.trace('Выбран кабинет: ' + cabinet);
	
	if(cabinet == '7sky') {
		doSevenSky(prefs);
	} else if(cabinet == 'gorkom') {
		doGorkom(prefs);
	}
}

function doSevenSky(prefs){
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = 'https://lk.seven-sky.net/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
	
	AnyBalance.sleep(2000);
	
	html = AnyBalance.requestPost(baseurl + 'ajax/login.jsp', {
        login: prefs.login,
        password: prefs.password
    }, addHeaders({ Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest' }));

    var json = getJson(html);

    if(!json.res) {
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Неверный логин или пароль', null, true);
    }

    html = AnyBalance.requestGet(baseurl + 'index.jsp', addHeaders({Referer: baseurl}));

    var result = {success: true};

    getParam(html, result, 'balance', /<li>\s*Баланс:(?:<[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'days', /<li[^>]*>\s*Дней до блокировки:(?:<[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<b[^>]*>Тариф\s«?([\s\S]*?)»?<\/b>/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /<div[^>]+class="account"[^>]*>\s*?Лицевой счет([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'speed', /<span[^>]*>\s*?Скорость (?:\S*)?([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'abon', /<td[^>]+class="price"[^>]*>\s*?([\s\S]*?)<a/i, replaceTagsAndSpaces);
    /*
    if(/lk.seven-sky\.net/.test(url)){	
    } else if(/stat.seven-sky\.net/.test(url)){
    	//Может, этого уже и нет...
        getParam(html, result, 'balance', /Ваш баланс(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'licschet', /счет N([^<]+)/i, replaceTagsAndSpaces);
    } else{
    	throw new AnyBalance.Error('Кабинет по адресу ' + url + ' не поддерживается. Сайт изменен?');
    }
    */
	
	html = AnyBalance.requestGet(baseurl + 'stat.jsp', addHeaders({Referer: baseurl}));
	
	var incom = getParam(html, null, null, /(?:Входящий Internet трафик[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(incom + ' Mb', result, 'incoming', null, replaceTagsAndSpaces, parseTraffic);
    var outgo = getParam(html, null, null, /(?:Исходящий Internet трафик[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceSilent);
	getParam(outgo + ' Mb', result, 'outgoing', null, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'onetimeabon', /Разовая абонентская плата(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'ipaddressabon', /Плата за внешний IP-адрес(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'dailyrefundabon', /Ежедневная плата с возвратом(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthallabon', /Итого(?:[\s\S]*?<td[^>]*>){1}<strong>([\s\S]*?)<\/strong><\/td>/i, replaceTagsAndSpaces, parseBalance);
	
	html = AnyBalance.requestGet(baseurl + 'settings.jsp', addHeaders({Referer: baseurl}));
	getParam(html, result, 'phone', /Мобильный телефон(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceNumber);
	getParam(html, result, 'fio', /Ф И О(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function doGorkom(prefs) {
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = 'https://stat.seven-sky.net/cgi-bin/';

    var html = AnyBalance.requestGet(baseurl + 'clients/login', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
	// Иначе выбрасывает ошибку
	AnyBalance.sleep(2000);
	
    html = AnyBalance.requestPost(baseurl + 'clients/login', {
        login: prefs.login,
        password: prefs.password
    }, addHeaders({Referer: baseurl}));
	
    if(!/action=logout/.test(html)) {
        var error = getParam(html, null, null, /<span\s+style="color:#101010"[^>]*>([\s\S]*?)<\/span>/, [replaceTagsAndSpaces, /[\n\r\t]/g, ' ']);
        if(error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
	
	var result = {success: true};
	
    getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Статистика пользователя:[\s\S]*?сч[ёе]т [N#№]\s*([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'fio', /Статистика пользователя:[\s\S]*?<b>([^<,]+)/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}

