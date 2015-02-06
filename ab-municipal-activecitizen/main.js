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

function main(){
	var baseurl = 'http://ag.mos.ru/';

	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	var phone = getParam(prefs.phone || '', null, null, /^\d{10}$/i, [/^(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 ($1) $2-$3-$4']);
	checkEmpty(phone, 'Введите номер телефона, 10 цифр подряд!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestPost(baseurl + 'site/login',{
		"LoginForm[username]": phone,
		"LoginForm[password]": prefs.password,
		"LoginForm[verifyCode]": "",
		"LoginForm[offer]": "true",
	}, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
	
	// Нужно завернуть в try/catch иначе будет падать при неверно
	var json = getJson(html);
	
	if(!json.redirect) {
		var errorJson = [];
		for(var key in json) {
			errorJson.push(json[key]);
		}
		var error = errorJson.join(', ');
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный номер телефона или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');		
	}
	
	html = AnyBalance.requestGet(baseurl);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /"current_points"[^>]*>\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}