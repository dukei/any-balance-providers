/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.130 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://www.wellsfargo.com';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Enter login!');
	checkEmpty(prefs.password, 'Enter password!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Error connecting provider site. Try to refresh later.');
	}

	var form = getParam(html, null, null, /<form[^>]+name="signon"[\s\S]*?<\/form>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Could not find signon form. Is the site changed?');
	}
	
	var userPrefs = 'TF1;015;;;;;;;;;;;;;;;;;;;;;;Mozilla;Netscape;5.0%20%28Windows%20NT%2010.0%3B%20WOW64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/44.0.2403.130%20Safari/537.36;20030107;undefined;true;;true;Win32;undefined;Mozilla/5.0%20%28Windows%20NT%2010.0%3B%20WOW64%29%20AppleWebKit/537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome/44.0.2403.130%20Safari/537.36;ru;windows-1251;www.wellsfargo.com;undefined;undefined;undefined;undefined;false;false;1438931609093;3;07.06.2005%2C%2022%3A33%3A44;1920;1080;;18.0;;;;;6;-180;-180;07.08.2015%2C%2010%3A13%3A29;24;1920;1040;0;0;;;;;;Shockwave%20Flash%7CShockwave%20Flash%2018.0%20r0;;;;;;;;;;;;;15;';
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'j_username') 
			return prefs.login;
		else if (name == 'j_password')
			return prefs.password;
	    else if(name == 'u_p')
	    	return userPrefs;
	    else if(name == 'btnSignon')
	    	return;
	    else if(name == 'jsenabled')
	    	return 'true';

		return value;
	});
	
	html = AnyBalance.requestPost('https://connect.secure.wellsfargo.com/auth/login/do', params, addHeaders({Origin: baseurl, Referer: baseurl + '/'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /баланс:(?:[^>]*>){1}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'fio', /Имя абонента:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}