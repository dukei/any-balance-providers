/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = 'https://komandacard.ru/';

var g_headers = {
	'Accept': 'application/json; charset=utf-8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'X-Requested-With': 'XMLHttpRequest',
	'Referer': baseurl,
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите 10 цифр номера телефона в формате 9261234567 без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login?X-Requested-With=XMLHttpRequest', g_headers);
	var json = getJson(html);

	html = AnyBalance.requestPost(baseurl + 'login?X-Requested-With=XMLHttpRequest', JSON.stringify({
    	"errors": [],
    	"success": {}, "wasSubmit": true,
    	"wait": true,
    	"validate": {},
    	"toData": {},
    	"submit": {},
    	"Phone": prefs.login,
    	"Password": prefs.password,
    	"CallbackUrl": null,
    	"Antiforgery": json.AnnotatedModel.Antiforgery,
    	"ActiveGroup": null,
    	"ServerMessage": "",
    	"IsValid": true
	}), g_headers);

	json = getJson(html);
	
	if(json.Status != 'Ok' || !json.RedirectUrl){
		var error = json.CustomData && json.CustomData.ServerMessage;
		if(error)
			throw new AnyBalance.Error(error, null, /парол/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl, addHeaders({Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'}));

	getParam(html, result, 'balance', /количество накопленных баллов[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'available', /Количество доступных баллов[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

	if(AnyBalance.isAvailable('last_sum', 'last_date', 'last_bonus', 'last_place', 'last_status')){
		html = AnyBalance.requestGet(baseurl + 'home/report?range=year', g_headers);

		var row = getElement(html, /<div[^>]+main-goods-table__row[^>]*>/i);
		getParam(row, result, 'last_date', /(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
		getParam(row, result, 'last_place', /(?:[\s\S]*?<div[^>]*>){4}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(row, result, 'last_sum', /(?:[\s\S]*?<div[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(row, result, 'last_status', /(?:[\s\S]*?<div[^>]*>){7}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		getParam(row, result, 'last_bonus', /(?:[\s\S]*?<div[^>]*>){6}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}   
	
	AnyBalance.setResult(result);
}