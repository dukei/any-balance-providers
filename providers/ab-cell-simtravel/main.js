 /**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

SimTravel Мобильная связь за границей
Сайт оператора: http://www.sim-travel.ru
Личный кабинет: http://www.sim-travel.ru/account/private/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-encoding': 'gzip, deflate, br',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
};

var g_currency = {
	'RU₽': '₽',
	'US$': '$',
	'EU€': '€'
};

var baseurl = 'https://ws.simtravel.ru/abonents/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    if(prefs.num && !/^\d{10,}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите номер SIM-карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой SIM-карте");

    AnyBalance.setDefaultCharset('utf-8');    
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var PHPSESSID = getParam(html, null, null, /name="PHPSESSID" value="([^"]*)/i, replaceTagsAndSpaces);
    var html = AnyBalance.requestPost(baseurl, [
		['PHPSESSID', PHPSESSID],
        ['option', 'do_login'],
        ['email', prefs.login],
        ['password', prefs.password]
    ], addHeaders({
			Referer: baseurl
	}));

    if(!/option=logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class="errMessage[^>]*>([\s\S]*?)<\/div>/i);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Проверьте логин/пароль");
    }

    var result = {success: true};

    var num = prefs.num ? prefs.num : '\\d{10,}';
    var refBal = getParam(html, null, null, new RegExp('(\\?option=balance&sim=' + num + ')', 'i'));
	var refBalExt = getParam(html, null, null, new RegExp('(\\?option=balance_extended&sim=' + num + ')', 'i'));
    if(!refBal || !refBalExt)
        throw new AnyBalance.Error(prefs.num ? 'Не найдена сим-карта с номером ' + prefs.num : 'Не найдено ни одной сим-карты');

    html = AnyBalance.requestGet(baseurl + refBal, g_headers);

    getParam(html, result, ['balance', 'currency'], /Баланс сим-карты[\s\S]*?&mdash;([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, ['currency', 'balance'], /Баланс сим-карты[\s\S]*?&mdash;([^<]*)/i, replaceTagsAndSpaces, parseCurrencyMy);
    getParam(html, result, 'number', /Баланс сим-карты([\s\S]*?)&mdash;/i, replaceTagsAndSpaces);

    html = AnyBalance.requestGet(baseurl + refBalExt, g_headers);
	
	getParam(html, result, '__tariff', /Текущий тарифный план[^>]*>([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	
	html = AnyBalance.requestGet(baseurl + '?option=account', g_headers);
	
	getParam(html, result, 'id', /<label[^>]*>ID[\s\S]*?value="([^"]*)?/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /<label[^>]*>Мобильный телефон[\s\S]*?value="([^"]*)?/i, replaceNumber);
	var firstName = getParam(html, null, null, /<label[^>]*>Имя[\s\S]*?value="([^"]*)?/i, replaceTagsAndSpaces);
	var lastName = getParam(html, null, null, /<label[^>]*>Фамилия[\s\S]*?value="([^"]*)?/i, replaceTagsAndSpaces);
	getParam(firstName + ' ' + lastName, result, 'fio', null, null);
		
    AnyBalance.setResult(result);
}

function parseCurrencyMy(text) {
 	var match = /(\S*?)\s*-?\d[\d.,]*\s*(\S*)/i.exec(text);
 	if (match) {
 		var first = match[1];
 		var second = match[2];
 	} else {
 		AnyBalance.trace('Не удалось определить валюту из: ' + text);
 		return text;
 	}
 	var val = getParam(first || second, null, null, null, replaceTagsAndSpaces);
 	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
 	return g_currency[val] ? '' + g_currency[val] : val;
}
