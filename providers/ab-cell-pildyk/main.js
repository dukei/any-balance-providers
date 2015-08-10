/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Accept-Encoding':'gzip,deflate,sdch',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.95 Safari/537.36',
	'Origin':'https://mano.pildyk.lt',
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://mano.pildyk.lt/';
    AnyBalance.setDefaultCharset('utf-8'); 

	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var html = AnyBalance.requestPost(baseurl + 'Prisijungti.aspx?ReturnUrl=%2fdefault.aspx', {
		'ctl00$ctl00$main$main$login$tbUserName':prefs.login,
		'ctl00$ctl00$main$main$login$tbPassword':prefs.password,
		'__EVENTTARGET':'ctl00$ctl00$main$main$login$btnLogin',
		'__SCROLLPOSITIONX':'0',
		'__SCROLLPOSITIONY':'200',
		'ctl00$ctl00$main$ctl00$tbPhone':'tel. numeris',
		'ctl00$ctl00$main$ctl00$tbSum':'10',
		'ctl00$ctl00$main$ctl00$ddlBank':'',
		'ctl00$ctl00$main$main$registrationStart$tbUserNameReg':'',
		'__EVENTARGUMENT':getParam(html, null, null, /<input\s*type="hidden"\s*name="__EVENTARGUMENT"\s*id="__EVENTARGUMENT"\s*value="([^\"]*)"\s*\/>/i, null, null),
		'__VIEWSTATE':getParam(html, null, null, /<input\s*type="hidden"\s*name="__VIEWSTATE"\s*id="__VIEWSTATE"\s*value="([^\"]*)"\s*\/>/i, null, null),
		'__EVENTVALIDATION':getParam(html, null, null, /<input\s*type="hidden"\s*name="__EVENTVALIDATION"\s*id="__EVENTVALIDATION"\s*value="([^\"]*)"\s*\/>/i, null, null),
		'ctl00$ctl00$main$main$login$btnLogin':'Prisijungti'
	}, addHeaders({Referer:baseurl+'Prisijungti.aspx?ReturnUrl=%2fdefault.aspx'}));

	
	if (!/ctl00_ctl00_main_ctl00_userInfo_logoff/i.test(html)) {
		var error = getParam(html, null, null, /<div[\s\S]*?class="msg msg-error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
	var result = {success: true}; 
	
	getParam(html, result, 'balance', /[-\d\s,.]{2,}Eur/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'name', /<p\s*id="userinfo"\s*[^>]*>[\s\S]*?Prisijungęs:\s*<strong>([^>]*?)\s*<\/strong>[\s\S]*?<\/p>/i, replaceTagsAndSpaces, null);
    getParam(html, result, 'balanceExpire', /<th>Sąskaitos\s*likutis:[\s\S]*?<small\sclass="expiration_date">\s*galioja\s*iki\s*([^>]*?)\s*<\/small>\s*<\/th>/i, replaceTagsAndSpaces, parseDateISO);
	
	getParam(html, result, 'traf_left', /AccountInfo_DataBucketRepeater(?:[^>]*>){8}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseTraffic);
	
	result.telnum = '+370' + prefs.login;
	
    AnyBalance.setResult(result);
}
