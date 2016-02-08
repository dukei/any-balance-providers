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
	var baseurl = 'https://voltmart.su/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	checkEmpty(prefs.card, 'Введите номер бонусной карты!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl + 'login.aspx', g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	/* Пробуем залогиниться */

	var params = AB.createFormParams(html, function(params, str, name, value) {
		if (name == 'ctl00$cphMain$txtEmail')
			return prefs.login;
		else if (name == 'ctl00$cphMain$txtPassword')
			return prefs.password;
			else if (name == '__EVENTTARGET')
				return 'ctl00$cphMain$btnLogin';
		return value;
	});

	// есть ли капча?
	if(/Код подтверждения/i.test(html)){
		var imgUrl = getParam(html, null, null, /Код подтверждения[\s\S]*?<div[^>]*?class\s*?=\s*?"captha-img"[\s\S]*?<img[^>]*src\s*?=\s*?['"]([\s\S]*?)['"]/i, null, html_entity_decode);
		var img = AnyBalance.requestGet(baseurl + imgUrl, g_headers);
		var captcha = AnyBalance.retrieveCode('Введите код с картинки', img);
		params['ctl00$cphMain$dnfValid$txtValidCode'] = captcha;
	}

	html = AnyBalance.requestPost(baseurl + 'login.aspx', params, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	// по наличию ссылки 'Выйти' проверяем залогинились или нет
	var exitLink = getElementById(html, 'lbLogOut', replaceTagsAndSpaces);
	if (!/Выйти/i.test(exitLink)) {
		// определяем ошибку
		var error = getElementsByClassName(html, 'notify-item type-error', replaceTagsAndSpaces);
		if (error.length) {
			throw new AnyBalance.Error(error[0], null, /Неверный логин или пароль/i.test(error[0]));
		} else {
			// если не смогли определить ошибку, то показываем дефолтное сообщение
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
	}

	/* Получаем данные */

	html = AnyBalance.requestPost(baseurl + 'HttpHandlers/MyAccount/BonusOperationsHandler.ashx', {
		numBonCard: prefs.card
	}, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при получении данных о карте! Попробуйте позже.');
	}

	var result = {success: true};

	getParam(html, result, 'balance', /На[\s\S]*?счету[\s\S]*?бонусов[\s\S]*?:([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /Процент[\s\S]*?бонусов[\s\S]*?:([\s\S]*?)%/i, replaceTagsAndSpaces, parseBalance);

	AnyBalance.setResult(result);
}
