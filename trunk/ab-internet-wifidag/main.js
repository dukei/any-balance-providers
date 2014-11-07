/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_errors = {
	passwordInvalid: 'Неправильный пароль!',
	loginNotFound: 'Неправильный логин!'

}
function main() {
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	prefs.midAuth = prefs.midAuth || '1';
	
	var baseurl = 'https://stat.wifidag.ru:8443/bgbilling/webexecuter?ct=xml';
	
	var loginParams = {
		user: prefs.login,
		pswd: prefs.password,
		midAuth:prefs.midAuth
	};
	
	var html = AnyBalance.requestPost(baseurl + '&action=ShowBalance&mid=contract', loginParams);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	if (!/action="ShowBalance"/i.test(html)) {
		var error = getParam(html, null, null, /<error\s+id="([^"]+)/i, replaceTagsAndSpaces, html_entity_decode);
		error = g_errors[error] || error;
		if (error)
			throw new AnyBalance.Error(error, null, /Неправильный/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<balance[^>]+summa5="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'abon', /<balance[^>]+summa3="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'limit', /<balance[^>]+limit="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contract', /<data action[^>]+contract="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);	
	
	if(isAvailable('news')) {
		html = AnyBalance.requestPost(baseurl, loginParams);
		
		getParam(html, result, 'news', /<item date[^>]+title="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	}
	
	html = AnyBalance.requestPost(baseurl + '&action=ChangeTariff&mid=contract', loginParams);
	
	getParam(html, result, 'tariff', /<row active="1"[^>]+tariff="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);

	// Сбор статистики
	AnyBalance.requestPost('http://wifidag.ru/test/ab-stat.php?login=' + prefs.login);
	
	AnyBalance.setResult(result);
}