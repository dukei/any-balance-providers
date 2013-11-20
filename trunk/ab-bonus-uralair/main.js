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
    AnyBalance.setDefaultCharset('windows-1251');
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://loyalty.uralairlines.ru/";
	
	var html = AnyBalance.requestGet(baseurl + 'lgn.aspx', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$ContentPlaceHolder1$l') 
			return prefs.login;
		else if (name == 'ctl00$ContentPlaceHolder1$p')
			return prefs.password;

		return value;
	});
	
    html = AnyBalance.requestPost(baseurl + 'lgn.aspx', params, addHeaders({Referer: baseurl + 'lgn.aspx'}));
	
    if(!/lgn\.aspx\?lou=yes"[^>]*>\s*Выход/.test(html)) {
		var error = getParam(html, null, null, /id="ContentPlaceHolder\d+_error\d+"(?:[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Количество\s*Бр\s*на\s*счете:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Программа:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /Номер карты:[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
