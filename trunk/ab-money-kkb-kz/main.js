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
	var baseurl = 'https://www.homebank.kz/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
    var ft = getParam(html, null, null, /value="([0-9]*?)"[\s]name="ft_"/i, replaceTagsAndSpaces, html_entity_decode);
    
	html = AnyBalance.requestPost(baseurl + 'login/login.htm', {
		tbUserId: prefs.login,
		tbPassword: prefs.password,
		ft_: ft,
        isKeyBoard: 'false'
	}, addHeaders({Referer: baseurl}));
	
    // html = AnyBalance.requestGet(baseurl + 'main.htm', g_headers);
    html = AnyBalance.requestGet(baseurl + 'finance/accounts/allaccounts.htm', g_headers);
    
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="t-error"[^>]*>[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	var numPart = '';
	if(prefs.num) {
		for(var i = 0; i < prefs.num.length; i++) {
			numPart += '\\s*' + prefs.num[i];
		}
	}
	
	var tr = getParam(html, null, null, new RegExp('title="[^"]*Идентификационный[^>]*>[^<]+' + numPart + '(?:[^>]*>){14,20}\\s*</tr>', 'i'));
	checkEmpty(tr, 'Не удалось найти ' + (prefs.num ? 'продукт с последними цифрами ' + prefs.num : 'ни одного банковского продукта!'), true);

	getParam(tr, result, 'balance', / /i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(tr, result, 'fio', /Имя абонента:(?:[\s\S]*?<b[^>]*>){1}([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(tr, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}