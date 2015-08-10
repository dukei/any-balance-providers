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
	var baseurl = 'http://komplat.by/';
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'index.php?controller=user&action=login', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	
	AnyBalance.setDefaultCharset('utf8');

	html = AnyBalance.requestPost(baseurl + 'index.php?controller=user&action=login', {
		login: prefs.login,
		passwd: prefs.password
	}, addHeaders({
		Referer: baseurl + 'hello',
		'X-Requested-With': 'XMLHttpRequest',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
	}));

	AnyBalance.setDefaultCharset('windows-1251');
    
    var json = getJson(html);
	
	if (json.Response == 'FAIL') {
		AnyBalance.trace(html);

		var error = getErrorMessage(json.errorMessage);
		if(error)
			throw new AnyBalance.Error(error, null, /Неправильный логин или пароль|Нет пароля|Вы не в системе/.test(error));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	if(prefs.num) {
		var acountJson;
		html = AnyBalance.requestGet(baseurl + 'cabinet.php?action=getAccountData', addHeaders({Referer: baseurl + 'hello', 'X-Requested-With': 'XMLHttpRequest'}));
		json = getJson(html);
		
		for(var account in json.bclient) {
			AnyBalance.trace('Got account: ' + account);
			
			if(new RegExp(prefs.num.replace(/.$/i, '.?$'), 'i').test(account)) {
				AnyBalance.trace('Account: ' + account + ' is what we need!');
				acountJson = json.bclient[account];
				break;
			} else {
				AnyBalance.trace('No match, skipping...');
			}
		}
		if(!isset(acountJson)) {
			throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
		}
		
		html = AnyBalance.requestPost(baseurl + 'cabinet.php', {
			'action': 'setLicsSelected',
			'lics': account,
			'adres': acountJson.cabLicsInfoAdres,
		}, addHeaders({Referer: baseurl + 'user.php?action=cabinet', 'X-Requested-With': 'XMLHttpRequest'}));
	}
	
	html = AnyBalance.requestPost(baseurl + 'cabinet.php', {
		'action': 'getReport',
        'rep': 'nachxml'
	}, addHeaders({Referer: baseurl + 'user.php?action=cabinet', 'X-Requested-With': 'XMLHttpRequest'}));
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Итого к оплате за(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'period', /Итого к оплате за([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'account', /Информация по лицевому счету([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'to_pay', /Начислено по тарифам[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'benefit', /Льготная скидка[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'recalc', /Перерасчеты[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'subsidy', /Субсидия[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'summary', /Итого начислено[^>]*>([\s\S]*?)<\/td[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'debt', /Пени за месяц[^>]*>([\s\S]*?)<\/td[^>]*>([\s\S]*?)<\/td/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function getErrorMessage(code) {
    switch(code) {
        case 'accdenied':
            return 'Вы не в системе или у Вас нет прав на просмотр страницы';
        case 'nolp':
            return 'Логин и пароль не могут быть пустыми';
        case 'nfnd':
            return 'Неправильный логин или пароль';
        case 'wpass':
            return 'Неправильный логин или пароль';
        case 'nopass':
            return 'Нет пароля, позвоните в службу поддержки';
        case 'lock':
            return 'Доступ закрыт. Вы пять раз неправильно вводите данные, ' +
                'попробуйте через 20 минут.';
        default:
            return false;
    }
}