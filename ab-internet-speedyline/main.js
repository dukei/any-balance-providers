/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = 'https://web.speedyline.ru/';
	
    checkEmpty (prefs.login, 'Введите логин!');
    checkEmpty (prefs.password, 'Введите пароль!');
	
    AnyBalance.trace('Trying to enter selfcare at address: ' + baseurl);
	
    var html = AnyBalance.requestPost(baseurl, {
    	login: prefs.login,
    	password: prefs.password,
    	submit: 'Войти'
    });
    // Проверка на корректный вход
    if (!/logout.html/i.test(html)) {
    	var error = getParam(html, null, null, /class='no-border red'>[\s*]*([^<]+?)\s*</i, replaceTagsAndSpaces, html_entity_decode);
    	if (error) {
    		if (error.indexOf('Доступ разрешен только с ip адресов') >= 0)
				throw new AnyBalance.Error(error + ' Для корректной работы провайдера необходимо в личном кабинете в разделе Настройки включить опцию "Разрешить вход в личный кабинет с чужих ip адресов".');
    		else if (error.indexOf('Логин или пароль указаны неверно') >= 0) 
				throw new AnyBalance.Error(error, null, true);
			
    		throw new AnyBalance.Error(error);
    	}
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    AnyBalance.trace ('It looks like we are in selfcare...');

    var result = {success: true};
	
	getParam(html, result, 'id', /<th[^>]*>ID(?:\s|&nbsp;)*пользователя[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'client', /<th[^>]*>Клиент[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'speed', /<th[^>]*>Скорость[\s\S]*?<td[^>]*>([\s\S]*?)(?:<a|<\/td>)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'download', /<th[^>]*>Скачано[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, function(str) {return parseTraffic(str, 'мб')});
	getParam(html, result, 'state', /<th[^>]*>Состояние[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'stateinternet', /<th[^>]*>Интернет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /<th[^>]*>Текущий баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'credit', /<th[^>]*>Кредит[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /<th[^>]*>Тарифный план[\s\S]*?<tr[^>]*?>\s*<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);
}