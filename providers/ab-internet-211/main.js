/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
};

function isLoggedIn(html){
	return /\/logout/.test(html);
}

function parseBalanceRK(_text) {
  var text = _text.replace(/\s+/g, '');
  var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceTagsAndSpaces, parseBalance) || 0;
  var _sign = rub < 0 || /-\d[\d\.,]*руб/i.test(text) ? -1 : 1;
  var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceTagsAndSpaces, parseBalance) || 0;
  var val = _sign*(Math.abs(rub) + kop / 100);
  AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
  return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');

    var baseurl = 'http://cabinet.sibset.ru/';

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var url = AnyBalance.getLastUrl();

    if(!isLoggedIn(html)){
    	
    	checkEmpty(/^\d{10}$/i.test(prefs.login), 'Для входа в кабинет не из сети провайдера введите в настройки провайдера ваш телефон (10 цифр без пробелов и разделителей) в формате 9001234567');

    	AnyBalance.trace('Не в кабинете, значит, надо залогиниться');

    	var csrf = getParam(html, null, null, /<meta[^>]+name="csrf-token"[^>]*content="([^"]*)/i, replaceHtmlEntities);

    	//Обязательно надо капчу запросить, иначе не отсылает смс
    	AnyBalance.requestGet(baseurl + getParam(html, null, null, /\/(captcha\/[^"]*)/i, replaceHtmlEntities), addHeaders({
    		Referer: url
    	}));

    	html = AnyBalance.requestPost(baseurl + 'check_phone', {
    		phone: '8' + prefs.login, 
    		_csrf: csrf
    	}, addHeaders({
    		'X-Requested-With': 'XMLHttpRequest',
    		Accept: 'application/json, text/javascript, */*; q=0.01',
    		'X-CSRF-Token': csrf,
    		Origin: baseurl.replace(/\/$/i, ''),
    		Referer: url
    	}));

    	var json = getJson(html);
    	if(json.success != 100){
    		var error = getElement(json.data, /<div[^>]+wrap_text_block/i, [/Попробовать ещё раз/i, '', replaceTagsAndSpaces]);
    		if(error)
    			throw new AnyBalance.Error(error, null, /не связан/i.test(error));
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    	}

    	var sms = AnyBalance.retrieveCode('На ваш телефон отправлено SMS с кодом для входа в личный кабинет. Пожалуйста, введите его.');
    	html = AnyBalance.requestPost(baseurl + 'check_sms', {
    		auth_code: sms, 
    	}, addHeaders({
    		Accept: 'application/json, text/javascript, */*; q=0.01',
    		'X-Requested-With': 'XMLHttpRequest',
    		'X-CSRF-Token': csrf,
    		Origin: baseurl.replace(/\/$/i, ''),
    		Referer: url
    	}));

    	json = getJson(html);
    	if(!json.success){
    		AnyBalance.trace(html);
    		var error = json.text;
    		if(error)
    			throw new AnyBalance.Error(error);
    		throw new AnyBalance.Error('Не удалось зайти в личный кабинет после ввода смс кода. Сайт изменен?');
    	}

    	html = AnyBalance.requestGet(baseurl + '?login=success', addHeaders({Referer: url}));
    	url = AnyBalance.getLastUrl();
    }else{
    	AnyBalance.trace('Уже залогинены');
    }

    if(!isLoggedIn(html)){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось в итоге войти в личный кабинет. Сайт изменен?');
    }


    var csrf = getParam(html, null, null, /<meta[^>]+name="csrf-token"[^>]*content="([^"]*)/i, replaceHtmlEntities);
    html = AnyBalance.requestPost(baseurl + 'index_ajax', '', addHeaders({
   		'X-Requested-With': 'XMLHttpRequest',
   		'X-CSRF-Token': csrf,
   		Origin: baseurl.replace(/\/$/i, ''),
   		Referer: url
    }));
	
    var result = {success: true};

	getParam(html, result, 'balance', /<div[^>]*class="balance"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalanceRK);
    getParam(html, result, '__tariff', /Текущий тариф интернет:([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'licschet', /Номер счёта:([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'daysleft', /Средств на балансе хватит на([^<]+)/i, replaceTagsAndSpaces, parseBalance);
//    getParam(html, result, 'bonus', /<a[^>]*class="header-bonus-button[^"]*"[^>]*>([\S\s]*?)<\/a>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
