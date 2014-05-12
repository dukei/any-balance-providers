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
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = 'https://lk.mango-office.ru/';
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
    
	html = AnyBalance.requestPost(baseurl + 'auth', {
		'request-uri':'/',
		'auth-type':'mo',
		'username':prefs.login,
		'password':prefs.password,
	}, addHeaders({Referer: baseurl}));
	
	if (!/auth\/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*class="b-error-message[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
	
    if(prefs.prodid){
		var regExp = new RegExp('<a href="\/([^"]*vats)[^>]*Перейти на страницу продукта[^>]*>[^№]+№' + prefs.prodid, 'i');
		
		var product_href = getParam(html, null, null, regExp);
		if(!product_href)
			throw new AnyBalance.Error("Не удаётся найти ссылку на продукт №" + prefs.prodid);
		
		html = AnyBalance.requestGet(baseurl + product_href);
    }
	
	getParam(html, result, 'balance', /class="balance\s*"(?:[^>]*>){4}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'licschet', /span>\s*Лицевой счет(?:[^>]*>){2}([\s\d]{6,})/i, replaceTagsAndSpaces);
	getParam(html, result, 'product', /"product-title(?:[^>]*>){2}([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Продукт «([^»]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'freespace', />Свободно(?:[^>]*>){2}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, parseTraffic);
	getParam(html, result, 'incline', /<span class="number" title="Имя линии:([^"]+)/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}