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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://bill.ellco.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	try {
		var html = AnyBalance.requestGet(baseurl + 'my/', g_headers);
	} catch(e){}
	
	if(AnyBalance.getLastStatusCode() > 400 || !html) {
		throw new AnyBalance.Error('Ошибка! Сервер не отвечает! Попробуйте обновить баланс позже.');
	}

	var form = getElement(html, /<form[^>]+loginForm/i);
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (/username/i.test(name)) 
			return prefs.login;
		else if (/password/i.test(name))
			return prefs.password;

		return value;
	});

	params['javax.faces.source'] = getParam(form, /<input[^>]+id="loginForm[^"]*"[^>]*submit/i, replaceHtmlEntities);
	params['javax.faces.partial.event'] = 'click';
	params['javax.faces.partial.execute'] = params['javax.faces.source'] + ' loginForm';
	params['javax.faces.partial.render'] = 'loginDiv';
	params['javax.faces.behavior.event'] = 'action';
	params['javax.faces.partial.ajax'] = 'true';

	var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
	
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({'Faces-Request': 'partial/ajax'}));
	
	if (!/<redirect[^>]+url="index.xhtml"/i.test(html)) {
		var error = getElement(html, /<p[^>]+text-danger/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Договор|пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + 'my/index.xhtml', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<li[^>]+balance-dropdown[\s\S]*?<\/a>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /<a[^>]*?dropdown[^>]*>\s*(\d{5,})/i, replaceTagsAndSpaces);
	
	
	AnyBalance.setResult(result);
}