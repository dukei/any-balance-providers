
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
	'Accept-Language': 	'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://ssl.vgarant.by/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var token = AB.getParam(html, null, null, /input[^>]*name="authenticity_token"[^>]*value="([^"]*)/i) || '';

	html = AnyBalance.requestPost(baseurl + 'login', {
        'user[login]': prefs.login,
        'user[password]': prefs.password,
		'commit': 'Войти',
		'authenticity_token': token,
		'utf8': '✓'
	}, AB.addHeaders({
		Referer: baseurl + 'login'
	}));

	if (!/context.Application/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]*class="error_container"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};

	var account = parseBalance(prefs.login);

	html = AnyBalance.requestGet(baseurl + 'accounts/' + account + '?_=' + new Date().getTime(), addHeaders({
        'X-Requested-With': 'XMLHttpRequest',
		'Accept': 'application/json, text/javascript, */*; q=0.01'
	}));

	var json = getJson(html);
	if(json.data.personal_account) {
		var data = json.data.personal_account;
        AB.getParam(data.n_sum_bal ? data.n_sum_bal + '' : '0', result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
        AB.getParam(data.vc_subj_name, result, 'fio');
        AB.getParam(data.d_accounting_end, result, 'deadline', null, AB.replaceTagsAndSpaces, AB.parseDateISO);

        var internet_data = json.data.servs ? json.data.servs[0] : '';
        AB.getParam(internet_data.vc_code, result, '__tariff');
        AB.getParam(internet_data.detailed_info.n_quant_cur, result, 'traffic', null, null, AB.parseBalance);

    } else {
		AnyBalance.trace('Не удалось получить данные аккаунта.');
    }

	AnyBalance.setResult(result);
}
