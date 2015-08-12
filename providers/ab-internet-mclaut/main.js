/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.130 Safari/537.36',
};

var g_baseurl = "https://bill.mclaut.com";
var g_cities = {
	cherkassy: "1",
	smila: "2",
	kaniv: "3",
	zolotonosha: "4",
	pereyaslav: "5",
	vatutino: "6",
	zvenigorodka: "7"
};


function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
    if(!prefs.city)
    	prefs.city = 'cherkassy';
    if(!g_cities[prefs.city])
    	throw new AnyBalance.Error('Неверный город: ' + prefs.city + '! Установите правильный город в настройках', null, true);
    
    var html = AnyBalance.requestGet(g_baseurl + '/client/cherkassy', g_headers);
    
    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var html = AnyBalance.requestPost(g_baseurl + '/index.php', {
        query: 'ajax',
        app: 'client',
        module: 'auth',
        action: 'logIn',
        socketId: '0',
        login: '"' + prefs.login + '"',
        pass: '"' + prefs.password + '"',
        city: g_cities[prefs.city],
        lang: 'ua'
    }, addHeaders({ Referer: g_baseurl + '/', Origin: g_baseurl, accept: 'application/json, text/javascript, */*; q=0.01', 'X-Requested-With': 'XMLHttpRequest' }));

    var json = getJson(html);

    if(json.resultCode == 0){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Неверно указаны данные!', null, true);
    }
    
    html = AnyBalance.requestGet(g_baseurl + '/client/' + prefs.city, addHeaders({ Referer: g_baseurl + '/', Origin: g_baseurl }));

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /403 Forbidden/i);
        if(error)
            throw new AnyBalance.Error('Личный кабинет доступен только из сети McLaut. Установите WiFi соединение с домашним роутером.');
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /На рахунку([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, function(str){var val = parseBalance(str); return val && Math.round(val*100)/100;});

    var internet = getElement(html, /<div[^>]+internet[^>]*>/i);
    getParam(internet, result, 'status', /<span[^>]+status[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(internet, result, '__tariff', /Тариф:[\s\S]*?<div[^>]+class="txt"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    var client = getElement(html, /<div[^>]+client[^>]*>/i);
    getParam(html, result, 'fio', /<div[^>]+sub-title[^>]*>([\s\S]*?)(?:<\/div>|<span)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'licschet', /Рахунок:[\s\S]*?<div[^>]+class="txt"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

function makeCityList(){
	var html = AnyBalance.requestGet(g_baseurl, g_headers);
	var options = sumParam(html, null, null, /<option[^>]+data-url[\s\S]*?<\/option>/ig);
	var names = [], values = [], cities = {};
	for(var i=0; i<options.length; ++i){
		var name = getParam(options[i], null, null, null, replaceTagsAndSpaces, html_entity_decode);
		names.push(name);
		var value = getParam(options[i], null, null, /<option[^>]+data-url="([^"]*)/i, null, html_entity_decode);
		var v = getParam(options[i], null, null, /<option[^>]+value="([^"]*)/i, null, html_entity_decode);
		cities[value] = v;
		values.push(value);
	}

	var result = {success: true};
	result.names = names.join('|');
	result.values = values.join('|');
	result.cities = cities;
	AnyBalance.setResult(result);
}
