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

var replaces = [replaceTagsAndSpaces, /,/g, ''];

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://support.anybalance.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'scp/login.php', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	var params = createFormParams(html, function(params, str, name, value) {
		if (name == 'userid') 
			return prefs.login;
		else if (name == 'passwd')
			return prefs.password;

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'scp/login.php', params, addHeaders({Referer: baseurl + 'scp/login.php'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<h3>([\s\S]*?)<\/h3>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'open', /Открытые\s\(([\d,]+)\)/i, replaces, parseBalance);
	getParam(html, result, 'answered', /Получившие ответ\s\(([\d,]+)\)/i, replaces, parseBalance);
	getParam(html, result, 'my', /Мои заявки\s\(([\d,]+)\)/i, replaces, parseBalance);
	getParam(html, result, 'overdue', /Просрочено\s\(([\d,]+)\)/i, replaces, parseBalance);
	getParam(html, result, 'closed', /Закрытые\s\(([\d,]+)\)/i, replaces, parseBalance);
	
	AnyBalance.setResult(result);
}