/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var baseurl = 'https://lkkbyt.mosenergosbyt.ru/';
	
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр лицевого счета без пробелов и разделителей.');
	checkEmpty(prefs.password, 'Введите пароль!');			
	
    var parts = /^(\d{5})(\d{3})(\d{2})$/.exec(prefs.login);
	
	var html = AnyBalance.requestGet(baseurl + 'common/login.xhtml', g_headers);
	
    html = AnyBalance.requestPost(baseurl + 'backLink.xhtml?mode=auth', {
        'book':parts[1],
        'num':parts[2],
        'kr':parts[3],
        'email':'',
        'psw':prefs.password,
        'x':'44',
        'y':'10'
    }, g_headers);
	
    //Выход из кабинета
    if (!/common\/login\.xhtml\?logout/i.test(html)) {
    	if (html.length < 5000 && AnyBalance.getLevel() < 5) {
    		throw new AnyBalance.Error("Ваша версия AnyBalance не может получить информацию для этого провайдера. Пожалуйста, установите последнюю версию AnyBalance.");
    	}
    	var error = getParam(html, null, null, [/<span[^>]+id="login:fTemplateLogin:otLoginError"[^>]*>([\s\S]*?)<\/span>/i, /class="loginError"[^>]*>([\s\S]*?)<\/div>/i, /class="red[^>]*>([\s\S]*?)<\/td>/i], replaceTagsAndSpaces, html_entity_decode);
    	if (error) throw new AnyBalance.Error(error, null, /Неверно введен пароль/i.test(error));
    	
    	// Если ошибку не распознали, запишем ее в лог.
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	var result = {success: true};
	
    getParam(html, result, 'balance', /Баланс:(?:[^>]*>){2,4}([\s\d.,-]{3,})руб/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /ЛС №([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    // используем особенности AnyBalance зачем искать значение дважды, если __tariff всегда available?
    getParam(result.__tariff, result, 'agreement');
	
    html = AnyBalance.requestGet(baseurl + 'abonent/persInfo.xhtml', g_headers);
    //Величина тарифа:
    sumParam(html, result, '__tariff', /Величина тарифа:[\s\S]*?<tr>([\s\S]*?)<\/tr>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    // Однотарифный, Двухтарифный, Трехтарифный
    var type = getParam(html, null, null, /Тариф[\s\S]*?<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i);
	
    if (isAvailable(['lastdate', 'lastsum'])) {
    	html = AnyBalance.requestGet(baseurl + 'abonent/paysInfo.xhtml', g_headers);
    	var table = getParam(html, null, null, /(<tbody id="t_pays:tbody_element">[\s\S]*?<\/tbody>)/i);
    	if (!table) {
    		AnyBalance.trace('не нашли таблицу с платежами, если платежи у вас есть - свяжитесь с автором провайдера');
    	} else {
    		getParam(table, result, 'lastdate', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    		getParam(table, result, 'lastsum', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    	}
    }
    if (isAvailable(['lastcounter', 'lastcounter1', 'lastcounter2'])) {
    	html = AnyBalance.requestGet(baseurl + 'abonent/counter.xhtml', g_headers);
    	var table = getParam(html, null, null, /(<table id="r_ctr:0:t_pok"[\s\S]*?<\/tbody><\/table>)/i, null, null);
    	if (!table) {
    		AnyBalance.trace('не нашли таблицу с показаниями счетчиков, если показания у вас есть, свяжитесь с автором провайдера');
    	} else {
    		getParam(table, result, 'lastcounter', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){4}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    		getParam(table, result, 'lastcounterdate', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    		if (type.toLowerCase().indexOf("двухтарифный") != -1) getParam(table, result, 'lastcounter1', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    		if (type.toLowerCase().indexOf("трехтарифный") != -1) {
    			getParam(table, result, 'lastcounter1', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){6}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    			getParam(table, result, 'lastcounter2', /<tbody[^>]*>(?:[\s\S]*?<td[^>]*>){8}([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    		}
    	}
    }
    AnyBalance.setResult(result);
}