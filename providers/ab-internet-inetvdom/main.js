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
	var baseurl = 'http://stat.inetvdom.ru/cabinet/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'welcome/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');

    var moduleToken = getParam(html, null, null, /<input[^>]*module_token[^>]*value=(?:"|')([\s\S]+?)(?:"|')>/i, replaceTagsAndSpaces, html_entity_decode);

    var params = {
        'LOGIN': prefs.login,
        'PASSWD': prefs.password,
        'module_token': moduleToken
    };
	
	html = AnyBalance.requestPost(baseurl, params, addHeaders({Referer: baseurl + 'welcome'}));
	
	if (!/cabinet_logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]*class="alert alert-danger"[^>]*>[\s\S]*?<\/button>([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);

		if (error) {
            throw new AnyBalance.Error(error, null, /Неправильный/i.test(error));
        }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    html = AnyBalance.requestGet(baseurl + 'Лицевой-счет/', g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', getRegEx('Баланс'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'account', getRegEx('Договор'), replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'abon_payment', /Рекомендуемый платеж[\s\S]*?<div[^>]*>([\s\S]+?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', getRegEx('Тариф'), replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'account_number', getRegEx('Номер счета'), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status', getRegEx('Статус'), replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}

function getRegEx(search) {
    return new RegExp('<td[^>]*>' + search + '[\\s\\S]*?<td>([\\s\\S]+?)</td>', 'i');
}