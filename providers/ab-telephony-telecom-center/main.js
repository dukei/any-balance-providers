/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 			'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Charset': 	'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 	'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 		'keep-alive',
	'User-Agent': 		'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://lc.telecom-center.ru:8011/';
	AnyBalance.setDefaultCharset('UTF-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
	}

	var auth_token = AB.getParam(html, null, null, /<input[^>]+authenticity_token[^>]+value="([^"]*)/i);
	if(!auth_token) {
		throw new AnyBalance.Error("Не удалось найти токер авторизации. Сайт изменён?");
	}

	html = AnyBalance.requestPost(baseurl + 'login', {
		'utf8': 			  '✓',
		'user[login]': 		  prefs.login,
		'user[password]': 	  prefs.password,
		'authenticity_token': auth_token,
		'commit':			  'Войти'
	}, AB.addHeaders({
		Referer: baseurl + 'login'
	}));
	
	if (!/application\.init/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+error_container[^>]*>([^<]*)/i, AB.replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {success: true};

	var text 	= AB.getParam(html, null, null, /application\s*=\s*[^\(]*\(([\s\S]*?),\s*\{loglevel/i),
		json 	= getJsonEval(text),
		account = json.data.personal_accounts[0],
		token 	= AB.getParam(html, null, null, /<meta[^>]+content="([^"]*)"[^>]+csrf-token/i);

	if(!token || !account.vc_account) {
		throw new AnyBalance.Error("Не удалось найти параметры запроса. Сайт изменён?")
	}

	html = AnyBalance.requestGet(baseurl + 'accounts/' + account.vc_account + '?_=' + new Date().getTime(), addHeaders({
		'X-Requested-With': 'XMLHttpRequest',
		'Accept': 'application/json, text/javascript, */*; q=0.01',
		'X-CSRF-Token': token
	}));

	json = getJson(html);
	var current_acc = json.data.personal_account,
		internet    = json.data.servs;

	if(current_acc) {
		AB.getParam(current_acc.n_sum_bal + '', 		result, 'balance', 	   null, null, AB.parseBalance);
		AB.getParam(current_acc.n_sum_reserved + '', 	result, 'reserved',    null, null, AB.parseBalance);
		AB.getParam(current_acc.n_recommended_pay + '', result, 'recommended', null, null, AB.parseBalance);
		AB.getParam(current_acc.d_accounting_begin, 	result, 'date_start',  null, null, AB.parseDateISO);
		AB.getParam(current_acc.d_accounting_end, 		result, 'date_end',    null, null, AB.parseDateISO);
		AB.getParam(current_acc.vc_account, 			result, 'account');
		AB.getParam(current_acc.vc_subj_name, 			result, 'fio');
	} else AnyBalance.trace("Не удалось найти информацио о контракте. Сайт изменён?");

	if(internet && internet[0]) {
		AB.getParam(internet[0].n_good_sum + '', result, 'cost', 	null, null, AB.parseBalance);
		AB.getParam(internet[0].vc_name, 		  result, '__tariff');
	} else AnyBalance.trace("Не удалось найти инфомацию о тарифе. Сайт изменён?");

	AnyBalance.setResult(result);
}
