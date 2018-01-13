/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Charset':	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':	'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.84 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://mano.pildyk.lt/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() >= 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

	html = AnyBalance.requestPost(baseurl + 'api/authentication/login', {
		'Msisdn': 	prefs.login,
		'Password': prefs.password

	}, addHeaders({
		'X-Requested-With': 'XMLHttpRequest'
	}));

    var json = getJson(html);
	
	if (!json.redirect) {
		var error = json.errors ? json.errors[0].message : undefined;
		if (error)
			throw new AnyBalance.Error(error, null, true);
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
	var result = {success: true};

	html = AnyBalance.requestGet(json.redirect, g_headers);
	getParam(html, result, 'name', /dashboard(?:[\s\S]*?)profile-wrapper(?:[\s\S]*?<p[^>]*>)([^<]*)/i, replaceTagsAndSpaces, null);

    getParam(html, result, 'balanceExpire', /<th>Sąskaitos\s*likutis:[\s\S]*?<small\sclass="expiration_date">\s*galioja\s*iki\s*([^>]*?)\s*<\/small>\s*<\/th>/i, replaceTagsAndSpaces, parseDateISO);
	getParam(html, result, 'traf_left', /AccountInfo_DataBucketRepeater(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic);

    json = getJson(AnyBalance.requestGet(baseurl + 'api/accountinformation/get-price-plan-and-account-balance', g_headers));
    getParam(json.result.balance ? json.result.balance + '': '0', result, 'balance', null, null, parseBalance);
    getParam(json.result.bonsBalance ? json.result.bonsBalance + '': '0', result, 'bonus', null, null, parseBalance);

	result.telnum = '+370' + prefs.login;
	
    AnyBalance.setResult(result);
}
