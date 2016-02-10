
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
	var baseurl = 'https://app.sotel-ccb.ru/issa/';

	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

    var params = {
        'error_win': 'Passport.login_input',
        'method': 'MTPassport.start_session',
        'login_phone_id': prefs.login,
        'password': prefs.password
    };

	html = AnyBalance.requestPost(
        baseurl + 'index.php',
        params,
        AB.addHeaders({
		    Referer: baseurl
	    })
    );

	if (/passport.login_input/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]+class="error"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Ошибка при вводе пароля/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	AB.getParam(html, result, 'full_name', /ФИО[\s\S]*?<td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'personal_account', /номер лицевого счета[\s\S]*?<td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'user_category', /Абонентская категория[\s\S]*?<td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'contract_date', /дата заключения[\s\S]*?<td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseDate);
	AB.getParam(html, result, 'registration', /пункт приписки[\s\S]*?<td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces);

    html = AnyBalance.requestGet(baseurl + 'index.php?win=passport.balance');

	AB.getParam(html, result, 'balance', /итоговый баланс[\s\S]*?<td>([\s\S]*?)<\/td>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
