/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
    'User-Agent':'	Mozilla/5.0 (Windows NT 6.1; WOW64; rv:22.0) Gecko/20100101 Firefox/22.0'
}

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = 'https://wallet.google.com/';
    var baseurlLogin = 'https://accounts.google.com/';
    // запрашиваем форму входа, чтобы получить все параметры
    var html = AnyBalance.requestGet(baseurlLogin + 'ServiceLoginAuth', g_headers);
	
	// Ищем переменную для входа
	var GALX = '';
	var found = /GALX[\s\S]*?value="([\s\S]*?)"/i.exec(html);
	if(found)
		GALX = found[1];
	else
		throw new AnyBalance.Error('Не нашли секретный параметр, дальше продолжать нет смысла');

	html = AnyBalance.requestPost(baseurlLogin + 'ServiceLoginAuth', {
		'Passwd':prefs.password,
		'Email':prefs.login,
		'GALX':GALX,
		'PersistentCookie':'yes',
	}, g_headers);
	
	if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="errormsg[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        error = getParam(html, null, null, /(<form[^>]+name="verifyForm")/i);
        if(error)
            throw new AnyBalance.Error('This account requires 2-step authorization. Turn off 2-step authorization to use this provider.');
        throw new AnyBalance.Error('Can not log in google account.');
	}
	var result = { success: true };
	getParam(html, result, 'fio', /<span\s*id=gbi4t>([\s\S]*?)<\/span>/i, null, null);
	getParam(html, result, 'login_email', /<span class=gbps2>([\s\S]*?)<\/span>/i, null, null);
	// Получаем информацию из кошелька гугл
	html = AnyBalance.requestGet(baseurl + 'merchant/pages/', g_headers);
	
	if(/\/merchant\/logout/i.test(html)){
		var href = getParam(html, null, null, /(merchant\/pages\/bcid-[\s\S]{1,200})\/earnings\/display/i, null, null);
		// Переходим на страницу Выплаты:
		html = AnyBalance.requestGet(baseurl + href + '/transactions/display?selectedrange=LAST_THREE_MONTHS&filterchoice=ALL_TRANSACTIONS', g_headers);
		
		getParam(html, result, 'balance', /id="currentBalanceAmount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'balance'], /id="currentBalanceAmount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseCurrencyMy);
		
		getParam(html, result, 'last_payment', /lastSuccessfulPaymentAmount"[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'last_payment_date', /lastSuccessfulPaymentAmount"[^>]*>[^>]*>[^>]*>[^>]*on([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
	}
	else
		AnyBalance.trace('Can`t login to Google Wallet, do have it on this account?');

	AnyBalance.setResult(result);
}

function parseCurrencyMy(text){
    var val = getParam(html_entity_decode(text).replace(/\s+/g, ''), null, null, /(\S*?)-?\d[\d.,]*/);
    AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
    return val;
}