
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Tele2 Business
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
	var baseurl = 'https://lk.tele2.ru/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var
		loginPageToken = AB.getParam(html, null, null, /id:'bscLoginPage'[\s\S]*?dt:'([^']*)'/i, AB.replaceTagsAndSpaces),
		loginToken = AB.getParam(html, null, null, /'([^']*)',\{id:'loginUserName'/i, AB.replaceTagsAndSpaces),
		passwordToken = AB.getParam(html, null, null, /'([^']*)',\{id:'loginUserPassword'/i, AB.replaceTagsAndSpaces),
		loginFormToken = AB.getParam(html, null, null, /'([^']*)',\{id:'bscLoginForm'/i, AB.replaceTagsAndSpaces);

	AnyBalance.trace(loginPageToken + ' | ' + loginToken + ' | ' + passwordToken + ' | ' + loginFormToken);

	var
		data_0 = {
			'value': prefs.login,
			'start': prefs.login.length
		},
		data_1 = {
			'value': prefs.password,
			'start': prefs.password.length
		},
		data_2 = {
			'': prefs.password
		};

	var authData = {
		'dtid': loginPageToken,
		'cmd_0': 'onChange',
		'uuid_0': loginToken,
		'data_0': JSON.stringify(data_0),
		'cmd_1': 'onChange',
		'uuid_1': passwordToken,
		'data_1': JSON.stringify(data_1),
		'cmd_2': 'onLoginRequest',
		'opt_2': 'i',
		'uuid_2': loginFormToken,
		'data_2': JSON.stringify(data_2)
	};

	html = AnyBalance.requestPost(baseurl + 't2bsc/zkau', authData, AB.addHeaders({
		Referer: baseurl + 't2bsc/login_bsc.zul'
	}));

	var error = AB.getParam(html, null, null, /value:['"]([^"']*)['"]/i, AB.replaceTagsAndSpaces);
	if (error) {
		throw new AnyBalance.Error(error, null, /логин|пароль/i.test(error));
	}

	html = AnyBalance.requestGet(baseurl + 't2bsc/start', g_headers);

	if (!/logout|Выход/i.test(html)) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	AnyBalance.trace('Успешная авторизация');

	var
		json,
		result = {
			success: true
		};

	AB.getParam(html, result, 'contractNumber', /Номер\s+контракта[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'accountNumber', /Номер\s+л\/с[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'contractName', /Контактное\s+лицо[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'contractEmail', /лицо[\s\S]*?Email[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);
	AB.getParam(html, result, 'contractPhone', /Контактный\s+телефон[\s\S]*?value:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces);


	if (AnyBalance.isAvailable('balance', 'creditLimit')) {
		try {

			html = AnyBalance.requestGet(baseurl + 't2bsc/base_bsc.zul?page=start', g_headers);

			var
				balancePageToken = AB.getParam(html, null, null, /dt:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces),
				balanceTabToken = AB.getParam(html, null, null, /['"]([^']*)['"],{id:['"]contractBalanceTab/i, AB.replaceTagsAndSpaces);

			AnyBalance.trace(balancePageToken + ' | ' + balanceTabToken);

			data_0 = {
				'items': [balanceTabToken],
				'reference': balanceTabToken
			};

			authData = {
				'dtid': balancePageToken,
				'cmd_0': 'onSelect',
				'uuid_0': balanceTabToken,
				'data_0': JSON.stringify(data_0)
			};

			html = AnyBalance.requestPost(baseurl + 't2bsc/zkau', authData, AB.addHeaders({
				Referer: baseurl + 't2bsc/base_bsc.zul?page=start'
			}));

			json = AB.getJson(html);
			// TODO: проверить на разных типах абонентов
			// TODO: проверить валюту
			AB.getParam(json.rs[0][1][2], result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(json.rs[0][1][2], result, 'creditLimit', null, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam('50   рублей  ', result, ['currency', 'balance'], null, AB.replaceTagsAndSpaces, AB.parseCurrency);

		} catch (e) {
			AnyBalance.trace('Не удалось получить данные об остатке средств ' + e);
		}
	}

	if (AnyBalance.isAvailable('subscribersList', 'subscribersNumber',
			'personalFunds', 'personalBalance', 'personalPhone', 'personalStatus', 'personalName', 'personalTimestamp', 'personalType')) {
		try {

			html = AnyBalance.requestGet(baseurl + 't2bsc/base_bsc.zul?page=start', g_headers);

			var
				subscribersPageToken = AB.getParam(html, null, null, /dt:['"]([^'"]*)['"]/i, AB.replaceTagsAndSpaces),
				subscribersTabToken = AB.getParam(html, null, null, /['"]([^']*)['"],{id:['"]subscribersTab/i, AB.replaceTagsAndSpaces);

			AnyBalance.trace(subscribersPageToken + ' | ' + subscribersTabToken);

			data_0 = {
				'items': [subscribersTabToken],
				'reference': subscribersTabToken
			};

			authData = {
				'dtid': subscribersPageToken,
				'cmd_0': 'onSelect',
				'uuid_0': subscribersTabToken,
				'data_0': JSON.stringify(data_0)
			};

			html = AnyBalance.requestPost(baseurl + 't2bsc/zkau', authData, AB.addHeaders({
				Referer: baseurl + 't2bsc/base_bsc.zul?page=start'
			}));

			setSubscribersList(html, result);
			setPersonalBalance(html, result);

		} catch (e) {
			AnyBalance.trace('Не удалось получить данные по абонентам ' + e);
		}

	}

	AnyBalance.setResult(result);
}

function setSubscribersList(html, result) {
	try {
		var
			phone,
			name, tariff, status, date, timestamp,
			data = {
				prefix: '[\'"]',
				phone: ['x3', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]'],
				tariff: ['z3', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]'],
				status: ['_4', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]'],
				name: ['y3', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]'],
				timestamp: ['24', '[\'"][\\s\\S]*?label:[\'"]([^\'"]*)[\'"]']
			},
			subscribersList = [],
			elements = AB.sumParam(html, null, null, /['"]([^'"]*)x3['"]/gi);

		AB.getParam(elements.length, result, 'subscribersNumber');

		for (var i = 0; i < elements.length; i++) {
			phone = AB.getParam(html, null, null, setRegular(elements[i], data.phone[0], [data.prefix, data.phone[1]]), AB.replaceTagsAndSpaces);
			tariff = AB.getParam(html, null, null, setRegular(elements[i], data.tariff[0], [data.prefix, data.tariff[1]]), AB.replaceTagsAndSpaces);
			status = AB.getParam(html, null, null, setRegular(elements[i], data.status[0], [data.prefix, data.status[1]]), AB.replaceTagsAndSpaces);
			name = AB.getParam(html, null, null, setRegular(elements[i], data.name[0], [data.prefix, data.name[1]]), AB.replaceTagsAndSpaces);
			timestamp = AB.getParam(html, null, null, setRegular(elements[i], data.timestamp[0], [data.prefix, data.timestamp[1]]),
				AB.replaceTagsAndSpaces);

			subscribersList.push('номер:' + phone + ' тариф:' + tariff + '  статус:' + status + ' подключено:' +
				timestamp + ' абонент:' + name);
		}

		AB.getParam(subscribersList.join(', '), result, 'subscribersList');

	} catch (e) {
		AnyBalance.trace('Не удалось получить данные по списку абонентов ' + e);
	}
}


function setPersonalBalance(html, result) {
	// TODO: адаптировать для разных типов учётных записей
	//	тестировалось на обычном типе учётной записи
	try {
		var
			data = {
				prefix: '[\'"]',
				phone: ['5i', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
				tariff: ['2i', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
				status: ['_i', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
				name: ['uh', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
				timestamp: ['hi', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
				type: ['xh', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
				funds: ['bj', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]'],
				balance: ['ej', '[\'"][\\s\\S]*?value[\'"],[\'"]([^\'"]*)[\'"]']
			},
			elements = AB.sumParam(html, null, null, /['"]([^'"]*)x3['"]/gi);

		AB.getParam(html, result, 'personalFunds', setRegular(elements[0], data.funds[0], [data.prefix, data.funds[1]]), AB.replaceTagsAndSpaces,
			AB.parseBalance);
		AB.getParam(html, result, 'personalBalance', setRegular(elements[0], data.balance[0], [data.prefix, data.balance[1]]),
			AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, '__tariff', setRegular(elements[0], data.tariff[0], [data.prefix, data.tariff[1]]), AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'personalPhone', setRegular(elements[0], data.phone[0], [data.prefix, data.phone[1]]), AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'personalStatus', setRegular(elements[0], data.status[0], [data.prefix, data.status[1]]),
			AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'personalName', setRegular(elements[0], data.name[0], [data.prefix, data.name[1]]), AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'personalTimestamp', setRegular(elements[0], data.timestamp[0], [data.prefix, data.timestamp[1]]), AB.replaceTagsAndSpaces);
		AB.getParam(html, result, 'personalType', setRegular(elements[0], data.type[0], [data.prefix, data.type[1]]), AB.replaceTagsAndSpaces);
	} catch (e) {
		AnyBalance.trace('Не удалось получить персональные данные ' + e);
	}
}

function setRegular(str, postfix, arr) {
	return new RegExp(arr[0] + str + postfix + arr[1], 'i');
}
