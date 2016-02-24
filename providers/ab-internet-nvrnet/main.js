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
	var baseurl = 'https://nvrnet.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	/* Проверяем не забыл ли пользователь ввести данные */

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	/* Проверяем доступность ресурса */

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	/* Пробуем залогиниться */

	html = AnyBalance.requestPost(baseurl, {
		auth_id: prefs.login,
		auth_password: prefs.password,
		ajax: 1
	}, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при входе в личный кабинет! Попробуйте обновить данные позже.');
	}

	var json = JSON.parse(html);
	if (json.status !== 1) {
		// ошибка, фатальная
		throw new AnyBalance.Error(json.msg, null, true);
	}

	/* Получаем данные */

	var result = {success: true};

	html = AnyBalance.requestGet(baseurl + json.data.url.substring(0), g_headers);
	// получаем лицевой счет (licschet) он же accound_id
	getParam(html, result, 'licschet', /\([^)]*?account_tariffs_block[^)]*?,([\s\S]*?)\)/i, replaceTagsAndSpaces);

	// получаем баланс
	html = AnyBalance.requestPost(baseurl + 'utm5/office', {
		ajax_action: 'get_account_panel',
		account_id: result.licschet,
		ajax: 1
	}, g_headers);

	json = JSON.parse(html);
	if (json.status !== 1) {
		// ошибка
		throw new AnyBalance.Error('Ошибка при получении баланса. Сайт изменён?', null, false);
	}

	html = json.data.account_panel_html;
	getParam(html, result, 'balance', /Баланс[\s\S]*?utm_value[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces, parseBalance);

	// получаем тариф
	html = AnyBalance.requestPost(baseurl + 'utm5/office', {
		ajax_action: 'get_tariffs_block',
		account_id: result.licschet,
		ajax: 1
	}, g_headers);

	json = JSON.parse(html);
	if (json.status !== 1) {
		// ошибка
		throw new AnyBalance.Error('Ошибка при получении тарифа. Сайт изменён?', null, false);
	}

	html = json.data.tariffs_block_html;
	getParam(html, result, '__tariff', /utm_acctariffs_tariff_info[\s\S]*?TARIFF\s*?NAME[\s\S]*?utm_label[^>]*?>([\s\S]*?)</i, replaceTagsAndSpaces);

	AnyBalance.setResult(result);
}
