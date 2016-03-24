
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
МТС Корпоративный Ураина
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
	var baseurl = 'https://manager.mts.ua/';
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '', g_headers);

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}


	html = AnyBalance.requestPost(baseurl + 'Ncih/Security.mvc/LogOn', {
		'Name': prefs.login,
		'Password': prefs.password
	}, AB.addHeaders({
		Referer: baseurl + 'Ncih/Security.mvc/LogOn'
	}));

	if (!/LogOff|Выход/i.test(html)) {
		var error = AB.getParam(html, null, null, /<div[^>]*class="[^"]*warning[^"]*"[^>]*>([\s\S]*?)<\/div>/i, AB.replaceTagsAndSpaces);
		if (error) {
			throw new AnyBalance.Error(error, null, /парол|номер/i.test(error));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	AnyBalance.trace('успешный вход');

	var
		result = {
			success: true
		},
		json;

	if (AnyBalance.isAvailable('balance', 'billsForCurrentYear')) {
		try {

			html = AnyBalance.requestGet(baseurl + 'Ncih/Bills.mvc', g_headers);

			var
				dateFrom = AB.getParam(html, null, null, /filters[\s\S]*?DateFrom[\s\S]*?"([^"]*)"/i, AB.replaceTagsAndSpaces, AB.parseDate),
				dateTo = AB.getParam(html, null, null, /filters[\s\S]*?DateTo[\s\S]*?"([^"]*)"/i, AB.replaceTagsAndSpaces, AB.parseDate),
				currency = AB.getParam(html, null, null, /moneySuffix[\s\S]*?['"]([^'"]*)['"]/i, AB.parseCurrency);

			html = AnyBalance.requestPost(baseurl + 'Ncih/Bills.mvc/GetBills', {
				'sort': 'BillNumber',
				'dir': 'ASC',
				'start': 0,
				'limit': 300,
				'filter': '',
				'dateFrom': new Date(dateFrom).getUTCFullYear() + '-01-01T00:00:00+3',
				'dateTo': setIsoYear(dateTo) + 'T23:59:59+3',
				'xaction': 'read'
			}, AB.addHeaders({
				Referer: baseurl + 'Ncih/Bills.mvc'
			}));

			json = AB.getJson(html);

			var freshest = json.Data.length - 1;

			AB.getParam(json.Data[freshest].SpentAmount, result, 'paymentAmount', null, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(json.Data[freshest].PaymentAmount, result, 'balance', null, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(json.Data[freshest].ItemsCount, result, 'itemsCount', null, AB.replaceTagsAndSpaces, AB.parseBalance);
			AB.getParam(json.Data[freshest].AccountNumber, result, 'account', null, AB.replaceTagsAndSpaces);
			AB.getParam(json.Data[freshest].BillNumber, result, 'billNumber', null, AB.replaceTagsAndSpaces);
			AB.getParam(json.Data[freshest].ServiceProviderName, result, 'region', null, AB.replaceTagsAndSpaces);
			AB.getParam(json.Data[freshest].IssueDate, result, 'issueDate', null, AB.replaceTagsAndSpaces, AB.parseBalance);

			var billsForCurrentYear = [];

			for (var i = freshest; i >= 0; i--) {
				billsForCurrentYear.push(
					'№ счёта:' + getParam(json.Data[i].BillNumber, null, null, null, AB.replaceTagsAndSpaces) +
					' № ЛС:' + getParam(json.Data[i].AccountNumber, null, null, null, AB.replaceTagsAndSpaces) +
					' Регион:' + getParam(json.Data[i].ServiceProviderName, null, null, null, AB.replaceTagsAndSpaces) +
					' Дата выставления:' + new Date(getParam(json.Data[i].IssueDate, null, null, null, AB.replaceTagsAndSpaces, AB.parseBalance)).toLocaleDateString() +
					' Израсходовано за период: ' + getParam(json.Data[i].SpentAmount, null, null, null, AB.replaceTagsAndSpaces, AB.parseBalance) + ' ' +
					currency +
					'  К оплате: ' + getParam(json.Data[i].PaymentAmount, null, null, null, AB.replaceTagsAndSpaces, AB.parseBalance) + ' ' + currency +
					'  Количество номеров: ' + getParam(json.Data[i].ItemsCount, null, null, null, AB.replaceTagsAndSpaces, AB.parseBalance)
				);
			}

			AB.getParam(billsForCurrentYear.join(', '), result, 'billsForCurrentYear');
			AB.getParam(currency, result, 'currency');


		} catch (e) {

			AnyBalance.trace(' не удалось получать данные по балансам ' + e);
		}
	}

	if (AnyBalance.isAvailable('users')) {
		try {

			html = AnyBalance.requestGet(baseurl + 'Ncih/Users.mvc', g_headers);

            var objectId = AB.getParam(html, null, null, /"objectId":(\d+)/i);

			html = AnyBalance.requestPost(baseurl + 'Ncih/Users.mvc/GetUsers', {
				'sort': 'FullName',
				'dir': 'ASC',
				'start': 0,
				'limit': 300,
				'filter': '',
				'xaction': 'read'
			}, AB.addHeaders({
				Referer: baseurl + 'Ncih/Users.mvc'
			}));

			json = AB.getJson(html);

			var users = [];

			for (var j = 0; j < json.Data.length; j++) {
				users.push(
					'Имя:' + json.Data[j].FullName +
					' Абонентский номер:' + json.Data[j].PhoneNumber +
					' Роль:' + json.Data[j].Role +
					' Доступ к иерархиям:' + json.Data[j].Hierarchy
				);
			}

			AB.getParam(users.join(', '), result, 'users');

            html = AnyBalance.requestPost(
                baseurl + 'Ncih/ObjectInfo.mvc/CurrentUser',
                {
                    'objectId': objectId,
                    '__LOCAL_DATETIME__': getLocalDateTime()
                },
                AB.addHeaders({'X-Requested-With': 'XMLHttpRequest'})
            );
            json = AB.getJson(html);

            AB.getParam(json.infoHtml, result, '__tariff', /тарифный план([^>]+>){3}/i, AB.replaceTagsAndSpaces);
            AB.getParam(json.infoHtml, result, 'smsRemained', /название пакета услуг[\s\S]*?Осталось\D*(\d+)\D*sms/i, AB.replaceTagsAndSpaces, AB.parseBalance);
            AB.getParam(json.infoHtml, result, 'minRemained', /название пакета услуг[\s\S]*?Осталось\D*(\d+)\D*мин/i, AB.replaceTagsAndSpaces, AB.parseBalance);

            html = AnyBalance.requestPost(
                baseurl + 'Ncih/ObjectInfo.mvc/PersonalAccount',
                {
                    'objectId': getPersonalAccountObjectId(baseurl),
                    '__LOCAL_DATETIME__': getLocalDateTime()
                },
                AB.addHeaders({
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': baseurl + 'Ncih/Hierarchy.mvc'
                })
            );
            AB.getParam(html, result, 'realBalance', /Баланс([^>]+>){3}/i, AB.replaceTagsAndSpaces, AB.parseBalance);

		} catch (e) {
			AnyBalance.trace(' не удалось получать данные по пользователям ' + e);
		}
	}

	AnyBalance.setResult(result);
}

function getPersonalAccountObjectId(baseurl) {
    var url = baseurl + 'Ncih/Hierarchy.mvc/GetHierarchyNodes',
        nodes = [],
        lastNode,
        iterations = 10, // to prevent eternal loop if something goes wrong
        html,
        json,
        hierarchyId;

    html = AnyBalance.requestGet(baseurl + 'Ncih/Hierarchy.mvc', g_headers);
    hierarchyId = AB.getParam(html, null, null, /availableHierarchy:[\s\S]*?id:\D+(\d+)/i);

    while (iterations--) {
        var params = {
            from: 0,
            to: 299,
            'objectSubtypeCodesFilter[0': 'Mobile',
            'objectSubtypeCodesFilter[1]': 'Virtual',
            'hierarchyType': 'Billing',
            'id': hierarchyId,
            'markCurrentSelection': true,
            '__LOCAL_DATETIME__': getLocalDateTime()

        };

        for (var i = 0; i < nodes.length; i++) {
            params['expanded[' + i + ']'] = nodes[i].data.id;
        }

        html = AnyBalance.requestPost(
            url,
            params,
            AB.addHeaders({'X-Requested-With': 'XMLHttpRequest'})
        );
        json = AB.getJson(html);

        nodes = json.nodes;
        lastNode = nodes.slice(-1)[0];

        if (lastNode.type == 'Account') {
            return lastNode.data.objectId;
        }
    }

    return 0;
}

function getLocalDateTime() {
    var now = new Date();
    var timezone = now.getTimezoneOffset() / -60;
    if (timezone > 0) {
        timezone = '+' + timezone;
    }
    return now.toISOString().replace(/\.\d+Z$/, timezone);
}

function setIsoYear(milliseconds) {

	var date = new Date(milliseconds);

	return date.getUTCFullYear() + '-' + pad(date.getUTCMonth() + 1) + '-' + pad(date.getUTCDate());
}


function pad(number) {
	if (number < 10) {
		return '0' + number;
	}
	return number;
}
