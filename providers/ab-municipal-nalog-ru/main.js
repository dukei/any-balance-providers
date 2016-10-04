/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language':	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':		'keep-alive',
	'User-Agent':		'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lk2.service.nalog.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'lk/index.html', g_headers);
	if(!html || AnyBalance.getLastStatusCode() > 400) {
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	try {
		html = AnyBalance.requestPost(baseurl + 'lk/index.html', {
			username:			   prefs.login,
			password:			   prefs.password,
			__checkbox_rememberMe: false
		}, addHeaders({
			Referer: baseurl + 'lk/index.html',
			'Origin': baseurl
		}));
	} catch (e) {
		html = AnyBalance.requestGet(baseurl + 'lk/welcome.html')
	}


    if(!/logout/i.test(html)){
		var error = AB.getParam(html, null, null, /<div[^>]+class="err"[^>]*>([\s\S]*?)<\/div>/i);
		if(error) {
			throw new AnyBalance.Error(error, null, /имя|парол)/i.test(error));
		}

		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте правильность ввода логина или пароля. Так же возможно, что сайт изменен.');
    }
	var result = {success: true};

	result.__tariff = prefs.login;
	getParam(html, result, 'fio', /<div[^>]*>ФИО:\s*([\s\S]*?)\s*<\/div>/i, replaceTagsAndSpaces);
	
	var json;
	for(var i = 0; i < 5; i++) {
		AnyBalance.trace('Попробуем получить данные... Попытка №' + (i+1));
		
		html = AnyBalance.requestGet(baseurl + 'lk/totals.html?t=' + new Date().getTime(), g_headers);
		json = getJson(html);
		
		if(!json.totals) {
			AnyBalance.sleep(2000);
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
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)\s*руб/i, replaceTagsAndSpaces, parseBalance) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)\s*коп/i, replaceTagsAndSpaces, parseBalance) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}
