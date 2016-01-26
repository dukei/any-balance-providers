
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
	var baseurl = 'https://my.ispserver.com/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + 'billmgr', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	html = AnyBalance.requestPost(baseurl + 'billmgr', {
		'username': prefs.login,
		'password': prefs.password,
		lang: 'ru',
		func: 'auth'
	}, AB.addHeaders({
		Referer: baseurl + 'billmgr'
	}));

	var error = AB.getParam(html, null, null, /<div[^>]+id="login-error"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
	if (error) {
		throw new AnyBalance.Error(error, null, /пароль/i.test(error));
	}

	html = AnyBalance.requestGet(baseurl, g_headers);

	if (!/logout/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	var result = {
		success: true
	};



	var
		json, content;

	if (AnyBalance.isAvailable('code', 'provider', 'acc_num', 'balance')) {
		try {
			html = AnyBalance.requestGet(baseurl +
				'billmgr?func=dashboard.info&p_num=1&dashboard=info&sfrom=ajax&operafake=' + new Date().getTime()
			);

			json = AB.getJson(html);

			content = json.rows[1];
			AB.getParam(content.value, result, 'code');

			content = json.rows[5];
			AB.getParam(content.value, result, 'provider');

			content = json.rows[6];
			AB.getParam(content.value, result, 'acc_num');

			content = json.rows[7];
			AnyBalance.trace(content.value);
			AB.getParam(content.value, result, 'balance', null, null, AB.parseBalance);
			AB.getParam(content.value, result, ['currency', 'balance'], null, null, AB.parseCurrency);

		} catch (e) {
			AnyBalance.trace(AnyBalance.getLastUrl());
			AnyBalance.trace('Ошибка при получении информации об аккаунте: ' + e);
		}
	}


	if (AnyBalance.isAvailable('allBalances')) { //получение балансов со всех провайдеров
		try {
			html = AnyBalance.requestGet(baseurl +
				'billmgr?func=dashboard.providers&p_num=1&dashboard=providers&p_cnt=50&sfrom=ajax&operafake=' + new Date().getTime()
			);

			json = AB.getJson(html);

			var allBalances = [];

			for (var i = 0, amount = json.content.length; i < amount; ++i) {
				content = json.content[i];
				allBalances.push(content.name.v + ' ' + content.balance.v);
			}

			AB.getParam(allBalances.join('<br/>'), result, 'allBalances');

		} catch (e) {
			AnyBalance.trace(AnyBalance.getLastUrl());
			AnyBalance.trace('Ошибка при получении информации о балансах: ' + e);
		}
	}

	if (AnyBalance.isAvailable('allServices')) { //получения информации об услугах и их сроке действия
		try {
			//https://my.ispserver.com/billmgr?func=dashboard.items&p_num=1&dashboard=items&p_cnt=5&sfrom=ajax&operafake=1453820697064
			html = AnyBalance.requestGet(baseurl +
				'billmgr?func=dashboard.items&p_num=1&dashboard=items&p_cnt=5&sfrom=ajax&operafake=' + new Date().getTime()
			);

			json = AB.getJson(html);

			var allServices = [];

			for (var i = 0, amount = json.content.length; i < amount; ++i) {
				content = json.content[i];
				allServices.push(content.name.v + ' действует до: ' + content.expiredate.v);
			}

			AB.getParam(allServices.join('<br/>'), result, 'allServices');

		} catch (e) {
			AnyBalance.trace(AnyBalance.getLastUrl());
			AnyBalance.trace('Ошибка при получении информации об услугах: ' + e);
		}
	}

	AnyBalance.setResult(result);
}
