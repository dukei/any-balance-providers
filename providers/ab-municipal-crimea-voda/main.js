
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

function getError(id) {
	var errors = {
		// SUCCESS
		"REG_SUCCESS": "Регистрация проведена успешно",
		// ERRORS
		"LS_VALID_ERR": "Лицевой счет не должен быть пустым",
		"LOGIN_VALID_ERR": "Логин должен состоять только из латинских букв и цифр",
		"PASS_VALID_ERR": "Пароль должен состоять только из латинских букв и цифр",
		"BUILD_VALID_ERR": "Номер дома может содержать только кириллицу, цифры и знак дроби",
		"FLAT_VALID_ERR": "Номер квартиры может содержать только кириллицу, цифры и знак дроби",
		"EMAIL_VALID_ERR": "Почтовый адрес введен некорректно",
		"LS_DOESNT_EXIST_ERR": "Такого лицевого счета в базе нет",
		"LS_ADDR_NOT_MATCH_ERR": "Указанному лицевому счету соответствует другой адрес",
		"LOGIN_NOT_FOUND": "Ошибка авторизации: логин не найден в базе данных",
		"PASSWORD_INCORRECT": "Ошибка авторизации: пароль указан не верно",
		"LOGIN_TEST_FAIL": "Ошибка регистрации: такой логин уже занят",
		"LS_TEST_FAIL": "Учетные данные с таким лицевым счетом уже зарегистрированы",
		"REST_EMAIL_VALID_ERR": "Почтовый адрес введен некорректно",
		"EMAIL_NOT_FOUND": "Этот почтовый адрес не был использован при регистрации в Личном кабинете",
		"MAIL_ERR": "Ошибка отправления. Проверьте правильность написания почтового адреса",
	};

	if (errors[id])
		return errors[id];

	return "Неизвестная ошибка в системе (" + id + ')';
}

function formatMonth(monthno) {
	// MONTH IN CALC
	var month = (monthno % 12) + 1;
	var year = (monthno - (month - 1)) / 12;
	var str = "";
	switch (String(month)) {
		case "1":
			str = "Январь";
			break;
		case "2":
			str = "Февраль";
			break;
		case "3":
			str = "Март";
			break;
		case "4":
			str = "Апрель";
			break;
		case "5":
			str = "Май";
			break;
		case "6":
			str = "Июнь";
			break;
		case "7":
			str = "Июль";
			break;
		case "8":
			str = "Август";
			break;
		case "9":
			str = "Сентябрь";
			break;
		case "10":
			str = "Октябрь";
			break;
		case "11":
			str = "Ноябрь";
			break;
		case "12":
			str = "Декабрь";
			break;
	}
	str += " " + year;
	return str;
}


function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://old.voda.crimea.ru/';
	// для нового сайта авторизация не через логин пароль, а через мобильный телефон
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestPost(baseurl + 'personalAccount/Auth.php', {
		type: 'login',
		login: prefs.login,
		password: prefs.password,
		'': ''
	}, AB.addHeaders({
		Referer: baseurl + 'personalAccount/'
	}));

	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}

	var json = getJsonEval(html);

	if (json.success != "true") {
		var error = getError(json.err);
		if (error) {
			throw new AnyBalance.Error(error, null, /LOGIN_NOT_FOUND|PASS_VALID_ERR|LOGIN_VALID_ERR|PASSWORD_INCORRECT/i.test('' +
				json.err));
		}

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	html = AnyBalance.requestPost(baseurl + 'personalAccount/servPart.php', {
		type: 'getAllData',
		'': ''
	}, g_headers);
	json = getJsonEval(html);

	var result = {
		success: true
	};

	AB.getParam(json.ls, result, 'licschet');
	AB.getParam(json.address, result, 'address');

	AB.getParam(json.tbl[0][0], result, 'date', null, null, formatMonth);
	AB.getParam(json.tbl[0][1], result, 'debt_start', null, null, AB.parseBalance);
	AB.getParam(json.tbl[0][2], result, 'spent', null, null, AB.parseBalance);
	AB.getParam(json.tbl[0][3], result, 'payed', null, null, AB.parseBalance);
	AB.getParam(json.tbl[0][4], result, 'debt', null, null, AB.parseBalance);

	AnyBalance.setResult(result);
}
