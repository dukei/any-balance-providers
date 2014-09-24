/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	// Mobile
	//'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+',
	// Desktop
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://issa.magadan.ru/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'pls/startip/www.GetHomePage', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	html = AnyBalance.requestPost(baseurl + 'pls/startip/www.GetHomePage', {
		p_logname: prefs.login,
		p_pwd: prefs.password
	}, addHeaders({Referer: baseurl + 'pls/startip/www.GetHomePage'}));
    
	if (!/\?page_name=S\*ADM_DIALUP_HOME/i.test(html)) {
		var error = getParam(html, null, null, /Сообщение об ошибке\s*<\/TD>(?:[^>]*>){5}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
    
    var href = getParam(html, null, null, /URL=([^"]+)/i, [replaceTagsAndSpaces, /ADM_DIALUP_HOME/, 'ADM_DIALUP_INFO'], html_entity_decode);
   
    html = AnyBalance.requestGet(baseurl + 'pls/startip/' + href, g_headers);

	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Текущее состояние лицевого счета(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /ФИО(?:[^>]*>){2}[^>]*value\s*=\s*"([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'lic_schet', /Номер лицевого счета(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тариф(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'login', /Логин&(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}