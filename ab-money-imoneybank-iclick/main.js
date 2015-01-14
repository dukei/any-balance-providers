/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Origin':'https://iclick.imoneybank.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:23.0) Gecko/20100101 Firefox/23.0',
	'X-Requested-With':'XMLHttpRequest'
};
var baseurl = 'https://iclick.imoneybank.ru/';

function main(){
    var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите логин! Логин должен быть в формате 9001234567!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	html = AnyBalance.requestPost(baseurl + 'login_check', {
		'_cellphone':prefs.login,
		'_password':prefs.password,
		'submit':'',
    }, addHeaders({Referer: AnyBalance.getLastUrl()}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /window.msg\(["']([^"']+)["'],\s*["']error/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Номер не зарегистрирован в системе|Неверная пара логин\/пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	if(prefs.type == 'card')
		fetchCard(html, baseurl);
	/*else if(prefs.type == 'crd')
		fetchCredit(html, baseurl);
	else if(prefs.type == 'dep')
		fetchDeposit(html, baseurl);*/
	else if(prefs.type == 'acc')
		fetchAccount(html, baseurl);
	else
		fetchCard(html, baseurl);
}
function fetchAccount(html, baseurl){
    var prefs = AnyBalance.getPreferences();
	html = AnyBalance.requestGet(baseurl + 'account/list?_=' + new Date().getTime(), g_headers);
	var json = getJson(html);
	if(!json)
		throw new AnyBalance.Error('Не удалось найти инофрмацию по счетам. Сайт изменен?');
	// Если что-то указано то будем искать, если нет, то надо просто взять первый объект
	if(prefs.num) {
		for(i=0; i<json.length; i++) {
			if(endsWith(json[i].name, prefs.num)) {
				var firstAcc = json[i];
				break;
			}
		}
	}
	else 
		var firstAcc = json[0];
	
	if(!firstAcc)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти счет с номером ' + prefs.num : 'Не удалось найти ни одного счета');

	var result = {success: true};
	getParam(firstAcc.rest+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(firstAcc.rest+'', result, ['currency', 'balance'], null, replaceTagsAndSpaces, parseCurrency);
	getParam(firstAcc.name+'', result, 'acc_num', null, replaceTagsAndSpaces);
	getParam(firstAcc.doc+'', result, 'type', null, replaceTagsAndSpaces);
	result.__tariff = result.type;
	/*if(isAvailable(['deadline', 'status', 'acc_num'])) {
		html = AnyBalance.requestGet(baseurl + 'account/' + firstAcc.id, g_headers);
		
		getParam(html, result, 'deadline', /Действительна по(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'status', /Статус карты(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		getParam(html, result, 'acc_num', /Счет карты(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	}*/
	AnyBalance.setResult(result);
}

function fetchCard(html, baseurl){
    var prefs = AnyBalance.getPreferences();
	html = AnyBalance.requestGet(baseurl + 'card/list?_=' + new Date().getTime(), g_headers);
	var json = getJson(html);
	if(!json)
		throw new AnyBalance.Error('Не удалось найти инофрмацию по картам. Сайт изменен?');
	// Если что-то указано то будем искать, если нет, то надо просто взять первый объект
	if(prefs.num) {
		for(i=0; i<json.length; i++) {
			if(endsWith(json[i].name, prefs.num)) {
				var firstCard = json[i];
				break;
			}
		}
	}
	else 
		var firstCard = json[0];
	
	if(!firstCard)
		throw new AnyBalance.Error(prefs.num ? 'Не удалось найти карту с номером ' + prefs.num : 'Не удалось найти ни одной карты!');

	var result = {success: true};
	
	getParam(firstCard.rest+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	getParam(firstCard.rest+'', result, ['currency', 'balance'], null, replaceTagsAndSpaces, parseCurrency);
	getParam(firstCard.name+'', result, 'card_num', null, replaceTagsAndSpaces);
	getParam(firstCard.doc+'', result, 'type', null, replaceTagsAndSpaces);
	result.__tariff = result.type;
	if(isAvailable(['deadline', 'status', 'acc_num'])) {
		html = AnyBalance.requestGet(baseurl + 'card/' + firstCard.id, g_headers);
		
		getParam(html, result, 'deadline', /Действительна по(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'status', /Статус карты(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
		getParam(html, result, 'acc_num', /Счет карты(?:[\s\S]*?<dd[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces);
	}
	AnyBalance.setResult(result);
}