/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function getViewState(html) {
	
	return getParam(html, null, null, /"javax\.faces\.ViewState"[^>]*value="([^"]+)/i);
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://cfl.peterburgregiongaz.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'fcabinet/mainpage.xhtml', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'fcabinet/mainpage.xhtml', {
		'javax.faces.partial.ajax':true,
		'javax.faces.source':'formMain:entryButton',
		'javax.faces.partial.execute':'formMain',
		'javax.faces.partial.render':'formMain',
		'formMain:entryButton':'formMain:entryButton',
		'formMain':'formMain',
		'formMain:userLogin':prefs.login,
		'formMain:userPsw':prefs.password,
		'javax.faces.ViewState':getViewState(html),
	}, addHeaders({
		Referer: baseurl + 'fcabinet/mainpage.xhtml',
		'X-Requested-With':'XMLHttpRequest'
	}));
	
	var href = getParam(html, null, null, /<redirect url="([^"]+)/i);
	
	if (!href) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'fcabinet/'+ href, g_headers);
	
	var result = {success: true};
	
	var dolg = getParam(html, null, null, /<div class="align-left">([\s\d,.]+)(?:[^>]*>){8}\s*<\/table/i, replaceTagsAndSpaces, parseBalance) * -1;
	var ammount = getParam(html, null, null, /<div class="align-left">([\s\d,.]+)(?:[^>]*>){4}\s*<\/table/i, replaceTagsAndSpaces, parseBalance);
	
	getParam(dolg + ammount, result, 'balance');
	//getParam(html, result, 'dolg', /<div class="align-left">([\d,.]+)(?:[^>]*>){8}\s*<\/table/i, replaceTagsAndSpaces, parseBalance);
	//getParam(html, result, 'balance', /<div class="align-left">([\d,.]+)(?:[^>]*>){4}\s*<\/table/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', / class="blue2"[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'licschet', /Лицевой счет №([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}