/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lk2.service.nalog.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'lk/index.html', g_headers);
/*
    var tform = getParam(html, null, null, /<input[^>]+name="t:formdata"[^>]*value="([^"]*)/i, null, html_entity_decode);
    if(!tform) //Если параметр не найден, то это, скорее всего, свидетельствует об изменении сайта или о проблемах с ним
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
*/
	html = AnyBalance.requestPost(baseurl + 'lk/index.html', {
        username:prefs.login,
        password:prefs.password,
        __checkbox_rememberMe:false
    }, addHeaders({Referer: baseurl + 'lk/index.html'})); 

    if(!/logout/i.test(html)){
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте правильность ввода логина или пароля. Так же возможно, что сайт изменен.');
    }
	var result = {success: true};
	result.__tariff = prefs.login;
    getParam(html, result, 'fio', / <div>ФИО:\s*([\s\S]*?)\s*<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	
	var json;
	for(var i = 0; i < 5; i++) {
		AnyBalance.trace('Попробуем получить данные... Попытка №' + (i+1));
		
		html = AnyBalance.requestGet(baseurl + 'lk/totals.html?t=' + new Date().getTime(), g_headers);
		json = getJson(html);
		
		if(!json.totals) {
			sleep(2000);
		} else {
			AnyBalance.trace('Данные успешно получены!');
			break;
		}
	}
	
	if(json && json.totals){
		getParam(json.totals.arrears, result, 'arrears', null, replaceTagsAndSpaces, parseBalanceRK);
		getParam(json.totals.overpay, result, 'overpay', null, replaceTagsAndSpaces, parseBalanceRK);
		getParam(json.totals.income, result, 'income', null, replaceTagsAndSpaces, parseBalanceRK);
		getParam(json.totals.paid, result, 'paid', null, replaceTagsAndSpaces, parseBalanceRK);
		getParam(json.totals.unpaid, result, 'unpaid', null, replaceTagsAndSpaces, parseBalanceRK);
	} else {
		throw new AnyBalance.Error('Не удалось получить данные, возможно сервис временно недоступен.');
	}
    AnyBalance.setResult(result);
}

function parseBalanceRK(_text){
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)\s*руб/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)\s*коп/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

function sleep(delay) {
	if(AnyBalance.getLevel() < 6) {
		var startTime = new Date();
		var endTime = null;
		do {
			endTime = new Date();
		} while (endTime.getTime() - startTime.getTime() < delay);
	} else {
		AnyBalance.sleep(delay);
	}
}