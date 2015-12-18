/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/45.0.2454.101 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://t-karta.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер карты!');

	AnyBalance.setCookie('t-karta.ru', 'UserCity', 'Krasnodar');
	
	var html = AnyBalance.requestGet(baseurl + 'Events/Krasnodar', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var form = getElement(html, /<form[^>]+Trip[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа.');
	}

	html = AnyBalance.requestPost(baseurl + 'EK/Cabinet/CheckUserCard', {
		pan: prefs.login, 
		currDate: fmtDate(new Date())
	}, addHeaders({
		Accept: 'application/json, text/javascript, */*; q=0.01',
		Origin: baseurl,
		Referer: baseurl + 'Events/Krasnodar',
		'X-Requested-With':'XMLHttpRequest'
	}));

	if(/false/i.test(html)){
		throw new AnyBalance.Error('Неверный номер карты!', null, true);
	}

	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'pan') 
			return prefs.login;
		else if (name == 'capcha')
			return 'xg9j'; //Вот бы все так капчу делали.
		return value;
	});

	html = AnyBalance.requestPost(baseurl + 'EK/Cabinet/Trip', params, addHeaders({
		Referer: baseurl + 'Events/Krasnodar'
	}));  	

	var json = getParam(html, null, null, /var\s+card\s*=\s*(\{[^]*?\});/i, null, getJson);
	if(!json){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет.');
	}

	var result = {success: true};

	getParam(json.CardSum/100, result, 'balance');
	getParam(json.CardPAN, result, 'num');
	getParam(json.EndDate, result, 'deadline', null, null, parseDate);
	getParam(json.CityName, result, 'city');
	getParam(json.TicketTypeDesc, result, '__tariff');
	
	AnyBalance.setResult(result);
}