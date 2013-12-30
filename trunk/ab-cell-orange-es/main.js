/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/27.0.1453.116 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.login, 'Enter login!');
    checkEmpty(prefs.password, 'Enter password!');

	var baseurl = 'https://areaprivada.orange.es/';
	var baseurlLogin = 'https://sso.orange.es/';
	var html;
    AnyBalance.setDefaultCharset('utf-8'); 

	html = AnyBalance.requestPost(baseurlLogin + 'amserver/gateway', {
		'gotoOnFail':'http://m.orange.es/miorange/?eCode=1',
		'goto':baseurl+'neos/init-mobile.neos',
		'encoded':'false',
		'gx_charset':'ISO-8859-1',
		'service':'EcareAuthService',
		'IDToken1':prefs.login,
		'IDToken2':prefs.password
	}, addHeaders({Referer: 'http://m.orange.es/miorange/?', Origin: 'http://m.orange.es'}));

    if(!/div id="balance"/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /Error de logado[\s\S]{1,50}<p>\s*([\s\S]*?)\s*<br\/>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Login failed, please contact to developer!');
    }
	// balances
	html = AnyBalance.requestGet(baseurl+'ecare/usage/index.htm?reqCode=maverickBalance', g_headers);
	var result = {success: true};
	getParam(html, result, 'balance', /saldo actual[\s\S]*?(-?\d[\d\s]*[.,]?\d*[.,]?\d*)[\s\S]{1,10}euro/i, null, parseBalance);
	getParam(html, result, 'bonus', /saldo extra[\s\S]*?(-?\d[\d\s]*[.,]?\d*[.,]?\d*)[\s\S]{1,10}euro/i, null, parseBalance);
	getParam(html, result, 'valid', /Tu tarjeta es válida hasta el día[\s\S]*?"negrita">\s*([\s\S]*?)\s*<\/span/i, null, parseDate);
	// tarif
	try{
		html = AnyBalance.requestGet(baseurl+'neos/show-co-header.neos?p=rateplan1st', g_headers);
		var json = getJson(html);
		getParam(json.name, result, '__tariff', null, null, null);
	} catch(e){
		AnyBalance.trace('Cant parse JSON object from ' + baseurl+'neos/show-co-header.neos?p=rateplan1st');
	}
    //Возвращаем результат
    AnyBalance.setResult(result);
}
