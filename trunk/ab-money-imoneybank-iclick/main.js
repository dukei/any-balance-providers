/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://iclick.imoneybank.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0'
};
var baseurl = 'https://iclick.imoneybank.ru/';

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	var found = /(\d{3})(\d{3})(\d{2})(\d{2})/i.exec(prefs.login);
	if(found)
		var phoneNumber = '+7 (' + found[1] + ') ' + found[2] + '-' + found[3] + '-' + found[4];
	else
		throw new AnyBalance.Error('Введите логин! Логин должен быть в формате 9001234567!');
	
	var token = getParam(html, null, null, /"_token"[^>]*value="([^"]*)/i);
	html = AnyBalance.requestPost(baseurl + 'login', {
        '_cellphone':phoneNumber,
		'submit':'',
		'_token':token
    }, addHeaders({Referer: baseurl + 'login'}));

	html = AnyBalance.requestPost(baseurl + 'login_check', {
		'_cellphone':phoneNumber,
		'_password':prefs.password,
		'submit':'',
		'_token':token
    }, addHeaders({Referer: AnyBalance.getLastUrl()}));

    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	var result = {success: true};
	
	if(!prefs.cardnum) {
		fetch(html, result);
	} else {
		/*var cardnum = prefs.cardnum ? prefs.cardnum : '\\d{4}';
		var re = new RegExp('class="code"[^>]*>([^<]*)(?:[^>]*>){2,3}[^<]*' + cardnum + '\\s*<', 'i');
		var code = getParam(html, null, null, re);
		if(!code)
			throw new AnyBalance.Error('Не удаётся получить данные, свяжитесь с разработчиком');
			
		AnyBalance.trace('Нашли код нужной карты '+code);
		
		html = AnyBalance.requestPost(baseurl + 'frontend/frontend', {
			RQ_TYPE:'WORK',
			Step_ID:3,
			SCREEN_ID:'MAIN',
			SID:sid,
			MENU_ID:'CONTRACT_LIST',
			ITEM_ID:'SELECT',
			CONTRACT_TO:code,
		}, addHeaders({Referer: baseurl + 'frontend/frontend'}));

		fetch(html, result);*/
	}
	
    AnyBalance.setResult(result);
}

function fetch(html, result) {
	var table = getParam(html, null, null, /<span>Карты<\/span>[^>]*>\s*(<table[\s\S]*?<\/table>)/i);
	if(!table)
		throw new AnyBalance.Error('Не удаётся найти ни одной карты или счета');
		
	getParam(table, result, 'balance', /Остаток[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(table, result, ['currency', 'balance'], /Остаток[^>]*>(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
	getParam(table, result, 'card_num', /Номер[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(table, result, 'type', /Продукт[^>]*>(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	result.__tariff = result.type;
	if(isAvailable(['deadline', 'status', 'acc_num'])) {
		table = AnyBalance.requestGet(baseurl + getParam(table, null, null, /Остаток[^>]*>(?:[\s\S]*?<td[^>]*>){1}[\s\S]*?href="\/([^"]*)/i), g_headers);
		
		getParam(table, result, 'deadline', /Действительна по(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
		getParam(table, result, 'status', /Статус карты(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		getParam(table, result, 'acc_num', /Счет карты(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	}
}