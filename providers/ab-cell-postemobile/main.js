/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.postemobile.it/';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting to the site! Try to refresh the data later.');
	}
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$Login$user')
			return prefs.login;
		else if (name == 'ctl00$Login$pw')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'AreaProtetta/pagine/login.aspx', params, addHeaders({
		Referer: baseurl
	}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="txt_errore_login"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Verifica che username e password siano stati inseriti correttamente./i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Can`t login to selfcare. Site changed?');
	}
	
	var result = {success: true};
	getParam(html, result, 'balance', /<div[^>]+id="credit_subtitle"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<div[^>]+class="actions"(?:[^>]*>){5}([\s\S]*?)<\/a>/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /Scegli il tuo numero(?:[^>]*>){3}([\s\S]*?)<\/option>/i, replaceTagsAndSpaces);

	if(isAvailable('FIO')) {
		html = AnyBalance.requestGet(baseurl+'areapersonale/privati/Pagine/PM13/ITuoiDati.aspx?ut=CO', g_headers);
		var fName = getParam(html, null, null, /INFORMAZIONI PERSONALI(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces) || '';
		var sName = getParam(html, null, null, /INFORMAZIONI PERSONALI(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces) || '';
		getParam(fName+' '+sName, result, 'FIO');
	}

	AnyBalance.setResult(result);
}