/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://stat.odintv.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'webexecuter', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'user') 
			return prefs.login;
		else if (name == 'pswd')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'webexecuter', params, addHeaders({Referer: baseurl + 'webexecuter'}));
	
	if(!/\?action=Exit/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+id="idDiv"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var href = getParam(html, null, null, /\?action=GetBalance[^"]+/i, replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(href, 'Не удалось найти ссылку на просмотр баланса, сайт изменен?', true);
	
    html = AnyBalance.requestGet(baseurl + 'webexecuter' + href, g_headers);

    var result = {success: true};
	
    getParam(html, result, 'balance', /Входящий остаток на начало месяца([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'coming', /Приход за месяц([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'consumption', /Расход за месяц([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'working', /Наработка за месяц([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'outgoing', /Исходящий остаток на конец месяца([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'limit', /Лимит([^>]*>){3}/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
