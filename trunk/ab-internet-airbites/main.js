/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_cities = {
    lviv: 1,
    kharkiv: 5,
    'ivano-frankivsk': 2,
    khmelnyczkyj: 14,
    rivne: 4,
    lutsk: 3
};

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.79 Safari/537.4'
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://airbites.net.ua/";
    var city = prefs.city || 'lviv';

    AnyBalance.trace('Entering city: ' + city);

	var html = AnyBalance.requestGet(baseurl + 'forma-pop-apu', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'enteruser', {
        txt_login:prefs.login,
        txt_pass:prefs.password,
        txt_city:g_cities[city],
		btn_enter:'Вход'
	}, addHeaders({Referer: baseurl + 'forma-pop-apu'}));
	
	if(!/<div[^>]*class="exit"[^>]*>/.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};

    getParam(html, result, 'balance', /(?:Остаток на счете|Залишок на рахунку|Remains on account):[\S\s]*?<a[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'statusInet', /(?:Статус Интернета|Стан Інтернету|Internet status):[\S\s]*?<a[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    var inetStatus = getParam(html, null, null, /(?:Статус Интернета|Стан Інтернету|Internet status):[\S\s]*?<a[^>]*class="([^"]*)/i);
    getParam(html, result, 'statusTv', /(?:Статус ТВ|Стан ТВ|TV status):[\S\s]*?<a[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);
    var tvStatus = getParam(html, null, null, /(?:Статус ТВ|Стан ТВ|TV status):[\S\s]*?<a[^>]*class="([^"]*)/i);
    getParam(html, result, 'statusVoip', /(?:Статус VOIP|Стан VOIP|VOIP status):[\S\s]*?<a[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, html_entity_decode);

    if(inetStatus != 'nonactive'){
        html = AnyBalance.requestGet(baseurl + city + '/pryvatnyj/my/internet/myinternet', g_headers);
        getParam(html, result, '__tariff', /(?:Название пакета|Назва пакету|Name of tariff)[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'abon', /(?:Сумма абонентской платы|Сума абонентської плати|Amount of fee)[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}