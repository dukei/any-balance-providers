/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};
function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://web.vtbnpf.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	var match = /(\d{3})(\d{3})(\d{3})(\d{2})/i.exec(prefs.login);
	if(!prefs.login || !match)
		throw new AnyBalance.Error('Введите логин! Логин должен быть без пробелов.');
	if(!prefs.password)
		throw new AnyBalance.Error('Введите пароль!');
		
	var html = AnyBalance.requestGet(baseurl + 'ipension/fiz/login.php', g_headers);
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'ipension/code.php');
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ipension/fiz/login.php', {
		kod1:match[1],
		kod2:match[2],
		kod3:match[3],
		kod4:match[4],
		pass:prefs.password,
		code:captchaa
    }, addHeaders({Referer: baseurl + 'ipension/fiz/login.php'}));
	
	if(!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<h1[^>]*>Ошибка<\/h1>(?:[\s\S]*?\/div>){2}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    var result = {success: true};
	getParam(html, result, 'fio', /<h2[^>]*class="[^>]*first">([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'acc_num', /<th>Номер счета<\/th>(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /<th>Номер счета<\/th>(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<th>Номер счета<\/th>(?:[\s\S]*?<td[^>]*>){8}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
    AnyBalance.setResult(result);
}