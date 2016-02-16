
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
	var baseurl = 'https://www.belqi.by/belqi/!iSOU';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '.Login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var params = {
        'aMode': 'A',
        'sso_p_Login': prefs.login,
        'sso_p_Password': prefs.password,
        'auth_login_type': 'PWD'
    };

	html = AnyBalance.requestPost(
        baseurl + '.Authentication',
		params,
        AB.addHeaders({
		    'Referer': baseurl + '.Login',
            'X-Requested-With': 'XMLHttpRequest'
	    })
    );

    var error = AB.getParam(html, null, null, /<div[^>]*error[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
    if (error) {
        throw new AnyBalance.Error(error, null, /логин или пароль/i.test(error));
    }

    html = AnyBalance.requestGet(baseurl + '.ShowPage?name=zero_page');

	if (!/iSOU\.Logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

    var balance = AnyBalance.requestGet(baseurl + '.GetBalanceT?b_curr=974&password=&token=&ClientAuth2=1&_=' + new Date().getTime());

	AB.getParam(balance, result, 'balance', /\('#id_balance'\)\.html\('([\s\S]*?)'\)/i, AB.replaceTagsAndSpaces, AB.parseBalance);
	AB.getParam(html, result, 'user_name', /Пользователь[\s\S]*?<span>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'wallet', /Номер кошелька[\s\S]*?<span>([\s\S]*?)<\/span>/i, AB.replaceTagsAndSpaces, AB.parseBalance);

	AnyBalance.setResult(result);
}
