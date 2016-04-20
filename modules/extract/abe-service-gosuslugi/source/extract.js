/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com) 
 */

		var g_headers = {
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
			'Connection': 'keep-alive',
			'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.76 Safari/537.36',
		};

var g_apiHeaders = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'Origin': 'https://www.gosuslugi.ru',
	'X-Requested-With': 'XMLHttpRequest',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.76 Safari/537.36',
	'Content-Type': 'application/json',
	'Referer': 'https://www.gosuslugi.ru/pgu/personcab',
}

var g_betaApiHeaders = {
	'Accept': 'application/json, text/javascript, */*; q=0.01',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36',
	'Accept-Language': 'ru,en;q=0.8',
}

var g_baseurl = 'https://www.gosuslugi.ru/';
var g_betaBaseurl = 'https://beta.gosuslugi.ru/';

var g_replaceSpacesAndBrs = [/^\s+|\s+$/g, '', /<br\/><br\/>$/i, ''];
// Максимальное количество автомобилей, по которым получать данные.
var g_max_plates_num = 10;
// Максимальное количество ИНН, по которым получать данные.
var g_max_inns_num = 3;

function login(prefs) {
	AnyBalance.setDefaultCharset('utf-8');

	var formattedLogin = getParam(prefs.login || '', null, null, /^\d{11}$/, [/^(\d{3})(\d{3})(\d{3})(\d{2})$/i, '$1-$2-$3 $4']);
	var loginType = 'snils';
	if (!isset(formattedLogin) || !formattedLogin) {
		formattedLogin = getParam(prefs.login || '', null, null, /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);
		loginType = 'email';
	}

	if (loginType == 'snils')
		checkEmpty(formattedLogin, 'Введите СНИЛС (без пробелов и разделителей, 11 символов подряд). Вы ввели: "' + (prefs.login || 'пустое поле') + '"!');
	else
		checkEmpty(formattedLogin, 'Введите правильный Email. Вы ввели: "' + (prefs.login || 'пустое поле') + '"!');

	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(g_baseurl + 'pgu/personcab', g_headers);

	// нужно для отладки
	if (!isLoggedIn(html)) {
		html = checkForRedirect(html);

		// Госуслуги издеваются. Сначала выкатили новую форму входа, потом спрятали
		// Пока используем старую
		// html = AnyBalance.requestPost('https://esia.gosuslugi.ru/idp/authn/UsernamePasswordLogin', {
		// username: formattedLogin,
		// password: prefs.password,
		// idType:loginType,
		// }, addHeaders({Referer: 'https://esia.gosuslugi.ru/idp/authn/CommonLogin'}));

		// А новую оставим на всякий
		var command = getParam(html, null, null, /new\s+LoginViewModel\((?:[^,]+,){1,2}'([^"']+)'/i);
		if (!command) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти идентификатор команды для входа.');
		}

		html = AnyBalance.requestPost('https://esia.gosuslugi.ru/idp/login/pwd/do', {
			login: formattedLogin,
			password: prefs.password,
			idType: loginType,
			'command': command
		}, addHeaders({Referer: 'https://esia.gosuslugi.ru/idp/rlogin?cc=bp'}));

		if (!isLoggedIn(html)) {
			//Попытаемся получить ошибку авторизации на раннем этапе. Тогда она точнее.
			var errorCode = getParam(html, null, null, [/new LoginViewModel\([^,]+,'([^']+)/i, /authn\.error\.([^"']+)/i]);
			if (errorCode) {
				var jsonLocalizationMsg = getJsonObject(html, /var jsonLocalizationMsg/i);
				var message = getParam(jsonLocalizationMsg.d.error[errorCode], null, null, null, replaceTagsAndSpaces);

				throw new AnyBalance.Error(message, null, /account_is_locked|certificate_user_not_found|invalid_credentials|invalid_signature|no_subject_found/i.test(errorCode));
			}
		}

		// Возможно мы попадем в кабинет где есть ИП и физ лицо, надо проверить
		if (/<h1[^>]*>\s*Выбор роли\s*<\/h1>|Войти как/i.test(html)) {
			html = AnyBalance.requestGet('https://esia.gosuslugi.ru/idp/globalRoleSelection?orgID=P', g_headers);
		}

		html = checkForRedirect(AnyBalance.requestGet('https://www.gosuslugi.ru/pgu/personcab', g_headers));

		// Поскольку Ваш браузер не поддерживает JavaScript, для продолжения Вам необходимо нажать кнопку "Продолжить".
		html = checkForJsOff(html);
	}

	if (!isLoggedIn(html)) {
		var error = getParam(html, null, null, [/span\s*>\s*(Ошибка авторизации(?:[^>]*>){4})/i, /<div class="error[^>]*>([\s\S]*?)<\/div>/i], [replaceTagsAndSpaces, /Вернуться назад/i, ''], html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

	return html;
}

function processProfile(result) {
	result.profile = {};

	getParam(html, result.profile, 'profile.fio', /title="Личный кабинет"(?:[^>]*>){3}([^<]+)</i, replaceTagsAndSpaces);
	// Глючит, почему-то всегда 5 показывает
	if (isAvailable('profile.mails'))
		getParam(getUnreadMsgJson(), result.profile, 'profile.mails', /"msgCount"\D*(\d+)/i, replaceTagsAndSpaces, parseBalance);

	// Детальная инфа
	var html = checkForRedirect(AnyBalance.requestGet('https://esia.gosuslugi.ru/profile/user/', g_headers));

	getParam(html, result.profile, 'profile.fio', /ФИО(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.birth_place', /Место рождения(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.birth_day', /Дата рождения(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result.profile, 'profile.document', /Документ, удостоверяющий личность(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.snils', /Страховой номер индивидуального лицевого счёта(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.inn', /id="person:innInf[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.adress_fakt', /id="person:liveAddrInf"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.adress', /id="person:regAddrInf"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.email', /Адрес электронной почты(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.phone', /Мобильный телефон(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)<\//i, replaceTagsAndSpaces);

	var license = getParam(html, null, null, /id="person:drLicenseInf"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	if (isset(license)) {
		getParam(license, result.profile, 'profile.license');
		getParam(license, result.profile, 'profile.license_till', /действительно до([^<]+)/i, null, parseDate);
	}

	var vehiclesContainer = getElement(html, /<div[^>]+id="person:vehicleInf">/i);
	if (vehiclesContainer) {
		var vehicles = getElements(vehiclesContainer, /<dl[^>]+class="line-link">/ig);

		AnyBalance.trace('Найдено автомобилей: ' + vehicles.length);
		result.profile.vehicles = [];

		for (var i = 0; i < vehicles.length; ++i) {
			var vehicle = {};

			getParam(vehicles[i], vehicle, ['profile.vehicles.name', 'fines'], /<dt>([^<]+)/i, replaceTagsAndSpaces);
			getParam(vehicles[i], vehicle, ['profile.vehicles.plate', 'fines'], /государственный регистрационный знак\s*([^,]+)/i, [replaceTagsAndSpaces, /\s/g, '']);
			getParam(vehicles[i], vehicle, ['profile.vehicles.plate_id', 'fines'], /свидетельство о регистрации\s*([^<]+)/i, [replaceTagsAndSpaces, /\s/g, '']);

			if (isset(vehicle.name) || isset(vehicle.plate) || isset(vehicle.plate_id))
				result.profile.vehicles.push(vehicle);
		}
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Штрафы
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processFinesBeta(result, prefs, showPaidFines) {
	if (!prefs.gosnumber)
		return;

	if (isAvailable(['fines', 'fines_total', 'fines_unpaid'])) {
		AnyBalance.trace('Указан номер автомобиля, значит надо получать штрафы...');
		result.fines = [];
		// Обнулим общие счетчики
		result['fines_unpaid'] = 0;
		result['fines_total'] = 0;

		var plates = (prefs.gosnumber || '').split(';');
		AnyBalance.trace('Автомобилей: ' + plates.length);

		var stsNums = (prefs.sts_num || '').split(';');
		AnyBalance.trace('Свидетельств о регистрации: ' + stsNums.length);

		if (plates.length != stsNums.length)
			throw new AnyBalance.Error('Введите номера автомобилей и свидетельств о регистрации!');

		html = AnyBalance.requestGet(g_betaBaseurl + '10001', g_headers);

		var trackId = AnyBalance.getLastResponseHeader('X-Atmosphere-tracking-id');
		checkEmpty(trackId, 'X-Atmosphere-tracking-id header missing', true);

		var templateObj = getJsonObject(html, /gibdd\.requestTemplate/);

		function createRequestParams(template) {
			if (template.form.content) {
				// Добавим водительское удостоверение
				if (prefs.licensenumber) {
					template.form.content['GibddFines.FormStep1.Panel1.vuNumber'] = {
						value: prefs.licensenumber
					};
				}
				// Теперь машины
				for (var i = 0; i < plates.length; i++) {
					template.form.content['GibddFines.FormStep1.Panel1.carNumber' + i] = {
						"value": plates[i]
					};
					template.form.content['GibddFines.FormStep1.Panel1.stsNumber' + i] = {
						"value": stsNums[i]
					};
				}
			}
			return template;
		}

		var json = {
			"type": "javaServiceTask",
			"serviceName": "formProcessing",
			"methodName": "process",
			"parameter": createRequestParams(templateObj)
		};

		var response = apiCallBetaCabinet('POST', 'a/wsapi/?_=' + new Date().getTime(), JSON.stringify(json), {
			'Origin': 'https://beta.gosuslugi.ru',
			'X-Atmosphere-tracking-id': trackId,
			'X-Atmosphere-Framework': '1.0',
			'Content-Type': 'application/json',
			'X-Cache-Date': '0',
			'X-Atmosphere-Transport': 'long-polling',
			'Referer': 'https://beta.gosuslugi.ru/10001/result',
		});

		if (response.error.code != 0) {

			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось запросить информацию о штрафах, ошибка в запросе!');
		}
		// Для удобства
		var data = response.form.content || {total: 0};

//		getParam(data.total.total + '', result, 'fines_with_discount', null, null, parseBalance);

		// Всего может быть 10 машин для abe и 3 для ab ну и неизвестное количество штрафов
		for (var i = 0; i < g_max_plates_num; i++) {
			// 30 штрафов должно хватить, я думаю
			for (var z = 0; z < 30; z++) {
				var current = data['simpleMode' + i + '_' + z];

				if (!isset(current))
					break;

				var _id = current.bID;
				var _name = current.bID + ' ' + current.carNumber;
				var isPaid = parseBool(current.isPaid);

				// У очень старых штрафов нету поля originalAmount, запишем его руками
				if (!current.originalAmount)
					current.originalAmount = current.violationSum;

				// Сумма неоплаченных штрафов
				if (!isPaid) {
					// Сумма неоплаченных штрафов
					sumParam(current.violationSum + '', result, 'fines_unpaid', null, null, parseBalance, aggregate_sum);
					// Сумма неоплаченных штрафов без учета скидок
					sumParam(current.originalAmount + '', result, 'fines_unpaid_full', null, null, parseBalance, aggregate_sum);
				}

				// Сумма всех штрафов
				sumParam(current.violationSum + '', result, 'fines_total', null, null, parseBalance, aggregate_sum);
				// Сумма всех штрафов без учета скидок
				sumParam(current.originalAmount + '', result, 'fines_total_full', null, null, parseBalance, aggregate_sum);

				if (!showPaidFines && isPaid)
					continue;

				var f = {__id: _id, __name: _name};

				if (__shouldProcess('fines', f)) {
					getParam(current.violationSum + '', f, 'fines.ammount', null, replaceTagsAndSpaces, parseBalance);
					getParam(current.violationReason, f, 'fines.break', null, replaceTagsAndSpaces);
					getParam(current.violationDate + ' ' + current.violationTime, f, 'fines.time', null, replaceTagsAndSpaces, parseDate);
//					getParam(current, f, 'fines.fio', null, replaceTagsAndSpaces);
					getParam(current.reportPlace, f, 'fines.place', null, replaceTagsAndSpaces);
					getParam(current.carModel, f, 'fines.vehicle', null, replaceTagsAndSpaces);
					getParam(current.offense, f, 'fines.proto_place', null, replaceTagsAndSpaces);
					getParam(current.carNumber, f, 'fines.carNumber', null, replaceTagsAndSpaces);
//					getParam(current, f, 'fines.department', null, replaceTagsAndSpaces);
					getParam(isPaid, f, 'fines.paid');
				}

				result.fines.push(f);
			}
		}
	}
}

function parseBool(str) {
	return !/0/.test(str);
}

function processFines(result, prefs, showPaidFines) {
	// Штрафы ГИБДД
	if (!prefs.gosnumber)
		return;

	AnyBalance.trace('Указан номер автомобиля, значит надо получать штрафы...');
	result.fines = [];
	// Обнулим общие счетчики
	result['fines_unpaid'] = 0;
	result['fines_total'] = 0;

	var plates = prefs.gosnumber.split(';');
	AnyBalance.trace('Автомобилей: ' + plates.length);
	// Добавим машины из профиля
	if (result.profile && result.profile.vehicles) {
		AnyBalance.trace('Добавим автомобили из профиля: ' + result.profile.vehicles.length);
		for (var i = 0; i < result.profile.vehicles.length; i++) {
			var currPlate = result.profile.vehicles[i].plate.toLowerCase();
			var currPlateName = result.profile.vehicles[i].name;

			var contains = plates.some(function (element, i) {
				if (currPlate === element.toLowerCase()) {
					return true;
				}
			});

			if (!contains) {
				plates.push(currPlate);
				AnyBalance.trace('Добавили автомобиль ' + currPlateName + ' (' + currPlate + ')');
			} else {
				AnyBalance.trace('Автомобиль ' + currPlateName + ' (' + currPlate + ') уже добавлен..');
			}
		}
	}
	var len = Math.min(plates.length, g_max_plates_num);
	for (var i = 0; i < len; i++) {
		var currentPlate = plates[i];
		if (currentPlate) {
			AnyBalance.trace('Получаем данные по автомобилю с номером ' + currentPlate);
			try {
				processFinesForCurrentPlate(result, prefs, currentPlate, showPaidFines);
			} catch (e) {
				AnyBalance.trace('Не удалось получить данные по штрафам из-за ошибки: ' + e.message);
				if (e.fatal)
					throw e;
			}
		}
	}
}

function processFinesForCurrentPlate(result, prefs, currentPlate, showPaidFines) {
	checkEmpty(currentPlate = getParam(currentPlate, null, null, /^\D?\d{3,4}\D{2}\d{2,3}$/), 'Введите номер автомобиля в формате х123хх50 или 1234хх50!', true);
	// Права не обязательны для заполнения
	if (prefs.licensenumber)
		checkEmpty(prefs.licensenumber = getParam(prefs.licensenumber, null, null, /^.{10}$/), 'Введите серию и номер водительского удостоверения в формате 50км123456!', true);

	// Id сервиса в системе, может меняться в будущем - вынесем отдельно.
	var serviceID = '10000581563';
	var url = 'https://www.gosuslugi.ru/pgu/service/' + serviceID + '_26.html'

	var html = AnyBalance.requestGet(url, g_headers);
	var json = getJson(postAPICall('https://www.gosuslugi.ru/fed/service/' + serviceID + '_26/checkStatus.json', {}, url));

	if (json.errorCode != 0)
		throw new AnyBalance.Error('Система ответила сообщением: ' + json.errorMessage);

	var mainLink = 'https://www.gosuslugi.ru/fed/services/s26/initForm?serviceTargetExtId=' + serviceID + '&userSelectedRegion=00000000000&rURL=https://www.gosuslugi.ru/pgu/personcab/orders&srcFormProviderId=9952354';
	// Иногда возвращается пустая страница
	for (var tries = 3; tries > 0; tries--) {
		html = AnyBalance.requestGet(mainLink, addHeaders({Referer: url}));
		if (html)
			break;
	}
	//html = AnyBalance.requestGet(mainLink, addHeaders({Referer: mainLink}));
	// Здесь проверим на ошибки
	var action = getParam(html, null, null, /'action'[^'"]*['"]\/([^'"]*)/i);
	if (!action) {
		var error = getParam(html, null, null, /Услуга недоступна<(?:[^>]*>){3}([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error);

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму для запроса штрафов, скорее всего услуга недоступна!');
	}

	var params = createFormParams(html, function (params, str, name, value) {
		if (name == 'tsRz')
			return currentPlate;
		else if (name == 'VU')
			return prefs.licensenumber;
		return value;
	});

	html = AnyBalance.requestPost(g_baseurl + action, params, addHeaders({Referer: mainLink}));

	// Проверить что статус у заявления исполнено
	if (!/>\s*Исполнено\s*</i.test(html))
		throw new AnyBalance.Error('Не удалось обработать заявление, сайт изменен?');

	html = getXmlFileResult(html);

	// Все теперь у нас есть данные, наконец-то..
	var fines = getElements(html, /<div[^>]+class="[^"]*tabs-dd[^>]*>/ig);
	AnyBalance.trace('Найдено штрафов: ' + fines.length);

	for (var i = 0; i < fines.length; i++) {
		var current = fines[i];
		var feeName = getParam(current, null, null, /<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		var isPaid = /Оплачено/i.test(current);

		AnyBalance.trace('Нашли ' + (isPaid ? 'оплаченный' : 'неоплаченный') + 'оплаченный штраф: ' + feeName);

		var feeSum = getParam(current, null, null, /Штраф,?\s*руб(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

		// Сумма неоплаченных штрафов
		if (!isPaid)
			sumParam(feeSum, result, 'fines_unpaid', null, null, null, aggregate_sum);
		// Сумма всех штрафов
		sumParam(feeSum, result, 'fines_total', null, null, null, aggregate_sum);

		if (!showPaidFines && isPaid)
			continue;

		var _id = getParam(current, null, null, /Постановление\/протокол([\s\S]*?)от/i, replaceTagsAndSpaces);
		var _name = getParam(current, null, null, /Дата и номер постановления\/протокола(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

		// Проверим, может уже есть такой энтити
		if (findIdInArray(result.fines, _id)) {
			AnyBalance.trace('Этот штраф привязан к номеру ВУ и уже был добавлен');
			continue;
		}

		var f = {__id: _id, __name: _name};

		if (__shouldProcess('fines', f)) {
			getParam(current, f, 'fines.ammount', /Штраф,?\s*руб(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(current, f, 'fines.break', /Нарушение(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(current, f, 'fines.time', /Дата и время нарушения(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
			getParam(current, f, 'fines.fio', /Нарушитель(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(current, f, 'fines.place', /Место нарушения(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(current, f, 'fines.vehicle', /Марка, модель ТС(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(current, f, 'fines.proto_place', /Место составления протокола(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(current, f, 'fines.department', /Подразделение(?:[\s\S]*?<td[^>]*>)([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(isPaid, f, 'fines.paid');
		}

		result.fines.push(f);
	}
	// Сводка по штрафам
	// getParam(g_gibdd_info, result, 'gibdd_info', null, g_replaceSpacesAndBrs);
}

function findIdInArray(jsonArray, currId) {
	if (!jsonArray || jsonArray.length < 1)
		return false;

	for (var i = 0; i < jsonArray.length; i++) {
		var json = jsonArray[i];
		var __id = json['__id'];

		if (currId == __id)
			return true;
	}
}

// // Налоги
// if (prefs.inn) {
// try {
// AnyBalance.trace('Указан ИНН, значит надо получать данные по налогам...');

// var inns = prefs.inn.split(';');
// AnyBalance.trace('Указано ИНН: ' + inns.length);
// var len = Math.min(inns.length, g_max_inns_num);
// for(var i = 0; i < len; i++) {
// var current = inns[i];
// if(current) {
// AnyBalance.trace('Получаем данные по ИНН: ' + current);
// processNalogiBeta(result, html, current);
// }
// }
// } catch (e) {
// AnyBalance.trace('Не удалось получить данные по налогам из-за ошибки: ' + e.message);
// if(e.fatal)
// throw e;
// }
// }

function processNalogi(result, html, prefs) {
	if (isAvailable(['nalog_balance', 'nalog_info'])) {
		// Id сервиса в системе, может меняться в будущем - вынесем отдельно.
		var serviceID = '10001761551', servicesubId = '99';

		var url = g_baseurl + 'pgu/service/' + serviceID + '_' + servicesubId + '.html'

		html = AnyBalance.requestGet(url, g_headers);

		var json = postAPICall(g_baseurl + 'fed/service/' + serviceID + '_' + servicesubId + '/checkStatus.json', {}, url);
		json = getJson(json);

		if (json.errorCode != 0) {
			throw new AnyBalance.Error('Система ответила сообщением: ' + json.errorMessage);
		}

		var mainLink = g_baseurl + 'fed/services/s' + servicesubId + '/initForm?serviceTargetExtId=' + serviceID + '&userSelectedRegion=00000000000&rURL=https://www.gosuslugi.ru/pgu/personcab/orders&srcFormProviderId=9952354';
		// Иногда возвращается пустая страница
		for (var tries = 3; tries > 0; tries--) {
			html = AnyBalance.requestGet(mainLink, addHeaders({Referer: url}));

			if (html)
				break;
		}
		//html = AnyBalance.requestGet(mainLink, addHeaders({Referer: url}));

		var stepId = 0;
		// Нужно подтвердить пользовательское соглашение...
		var serviceUrl = g_baseurl + 'fed/services/s' + servicesubId + '/s' + (++stepId) + '?serviceTargetExtId=' + serviceID;
		html = AnyBalance.requestPost(serviceUrl, createFormParamsById(html, servicesubId), addHeaders({Referer: mainLink}));

		var params = createFormParamsById(html, servicesubId);

		params.inn = prefs.inn;
		// По всем регионам
		params['region[0]'] = '99';

		serviceUrl = g_baseurl + 'fed/services/s' + servicesubId + '/s' + (++stepId) + '?serviceTargetExtId=' + serviceID;
		html = AnyBalance.requestPost(serviceUrl, params, addHeaders({Referer: serviceUrl}));

		// Проверить что статус у заявления исполнено
		if (!/>\s*Исполнено\s*</i.test(html)) {
			throw new AnyBalance.Error('Не удалось обработать заявление, сайт изменен?');
		}

		html = getXmlFileResult(html);

		// Все теперь у нас есть данные, наконец-то..
		var array = sumParam(html, null, null, /<tr>(\s*<td>(?:[\s\S]*?<td[^>]*){4}[^<]*)<\/t/ig);

		AnyBalance.trace('Найдено налогов: ' + array.length);
		var html_resonse = '';

		for (var i = 0; i < array.length; i++) {
			var current = array[i];

			var nalog = getParam(current, null, null, /<td(?:[^>]*>){1}([^<]*)/i) || 'Неизвестный тип налога'; // Транспортный налог
			//var agency = getParam(current, null, null, /<td(?:[^>]*>){3}([^<]+)/i); // УПРАВЛЕНИЕ ФЕДЕРАЛЬНОГО КАЗНАЧЕЙСТВА ПО МОСКОВСКОЙ ОБЛАСТИ (Межрайонная ИФНС России № 3 по Московской области)
			var type = getParam(current, null, null, /<td(?:[^>]*>){5}([^<]+)/i); // Пени
			var summ = getParam(current, null, null, /<td(?:[^>]*>){7}([^<]+)/i); // 5.62
			//var date = getParam(current, null, null, /<td(?:[^>]*>){9}([^<]+)/i); // 23.01.2014
			sumParam(summ, result, 'nalog_balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			// Формируем html
			html_resonse += nalog + ': ' + type + ' <b>' + summ + '</b><br/><br/>';
		}
		getParam(html_resonse, result, 'nalog_info', null, g_replaceSpacesAndBrs);
	}
}

function getLocalizedMsg(msgs, path) {
	var paths = path.split(/\./g);
	for (var i = 0; i < paths.length; ++i) {
		msgs = msgs[paths[i]];
	}
	return html_entity_decode(msgs);
}

function isLoggedIn(html) {
	return /\/logout|title="Выход"/i.test(html);
}

/** на входе урл и параметры в json */
function postAPICall(url, params, referer) {
	var response = AnyBalance.requestPost(url, JSON.stringify(params), isset(referer) ? addHeaders({Referer: referer}) : g_apiHeaders);

	if (!response) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию об услуге, сайт изменен?');
	}
	return response;
}

function getUnreadMsgJson() {
	var response = AnyBalance.requestPost('https://www.gosuslugi.ru/pgu/wsapi/gepsIntegration/getUnreadMessageCount', JSON.stringify({}), g_apiHeaders);
	if (!response || !/"operation completed"/i.test(response)) {
		AnyBalance.trace(response);
		AnyBalance.trace('Не удалось получить информацию о госпочте, сайт изменен?');
	}

	return response;
}

function checkForJsOff(html) {
	if (/Since your browser does not support JavaScript,\s+you must press the Continue button once to proceed/i.test(html)) {
		AnyBalance.trace('Since your browser does not support JavaScript, you must press the Continue button once to proceed...');
		// Поскольку Ваш браузер не поддерживает JavaScript, для продолжения Вам необходимо нажать кнопку "Продолжить".
		var params = createFormParams(html);
		var action = getParam(html, null, null, /<form[^>]+action="([^"]+)/i, replaceTagsAndSpaces);
		if (!action) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму переадресации, сайт изменен?');
		}

		html = checkForRedirect(AnyBalance.requestPost(action, params, addHeaders({Referer: g_baseurl + 'idp/profile/SAML2/Redirect/SSO'})));
	}
	return html;
}

function checkForRedirect(html) {
	// Пытаемся найти ссылку на редирект
	// var href = getParam(html, null, null, /url=([^"]+)/i);
	var href = getParam(html, null, null, /<meta[^>]+"refresh"[^>]+url=([^"]+)/);
	// Если нет ссылки, не надо никуда идти
	if (!href) {
		AnyBalance.trace('Данная страница не требует переадресации.');
		//AnyBalance.trace(html);
		return html;
		// Если нашли ссылку, идем по ней
	} else {
		AnyBalance.trace('checkForRedirect: Нашли ссылку ' + href);
		return checkForJsOff(AnyBalance.requestGet(href, addHeaders({Referer: g_baseurl + 'pgu/personcab'})));
	}
}

// function followRedirect(html, allowExceptions) {
// var href = getParam(html, null, null, /<meta[^>]+"refresh"[^>]+url=([^"]+)/i);
// if (!href) {
// AnyBalance.trace(html);
// if(allowExceptions)
// throw new AnyBalance.Error('Не удалось найти ссылку на переадресацию, сайт изменен?');
// }
// //AnyBalance.trace('Нашли ссылку ' + href);
// return AnyBalance.requestGet(href, addHeaders({Referer: g_baseurl + 'pgu/personcab'}));
// }

function createFormParamsById(html, servicesubId) {
	var form = getParam(html, null, null, new RegExp('<form[^>]*id="s' + servicesubId + '"[\\s\\S]*?</form>'));
	if (!form) {
		var err = getParam(html, null, null, /"popupText"([^>]*>){2}/i, replaceTagsAndSpaces);
		if (err)
			throw new AnyBalance.Error(err);

		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму с данными для id: ' + servicesubId + ', такое бывает, если услуга недоступна. Если эта ошибка появляется часто - свяжитесь, пожалуйста, с разработчиками.');
	}
	return createFormParams(form);
}

function getXmlFileResult(html) {
	var href = getParam(html, null, null, /\{\s*url:[^"]*"\/([^"]*)/i, [/\s/ig, '%20']);

	if (!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку для загрузки файла результата, сайт изменен?');
	}
	// https://www.gosuslugi.ru/fed/serviceResult/getFileResult?filename=%D0%A0%D0%B5%D0%B7%D1%83%D0%BB%D1%8C%D1%82%D0%B0%D1%82_1.html&orderId=89560860&serviceId=26&mimeType=docFormat%20docXML&downloadType=download&alternate=text/html&mnemonic=1&fileNo=0
	return html = AnyBalance.requestGet(g_baseurl + href, {
		'Accept': 'text/html, * /*',
		'X-Requested-With': 'XMLHttpRequest',
		'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.76 Safari/537.36',
		//'Referer': g_baseurl + action,
	});
}

/////////////////////////////////////////////// Начало блока бета-кабинета ///////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Бета версия кабинета гос услуг
function processNalogiBeta(result, html, inn) {
	if (isAvailable(['nalog_balance', 'nalog_info'])) {
		html = AnyBalance.requestGet(g_betaBaseurl + '10002', g_headers);

		var trackId = AnyBalance.getLastResponseHeader('X-Atmosphere-tracking-id');
		var mnemonic = getParam(html, null, null, /fns\.requestTemplate\s*=\s*(?:[\s\S]*?{){2}\s*"mnemonic":\s*"([^"]+)/i);

		checkEmpty(trackId, 'X-Atmosphere-tracking-id header missing', true);

		var json = {
			"type": "javaServiceTask",
			"serviceName": "formProcessing",
			"methodName": "process",
			"parameter": "{\"submitComponent\":\"Fns.FormStep1.Panel1.button\",\"submitEventNumber\":\"0\",\"submitEvent\":\"submit\",\"userSelectedRegion\":\"00000000000\",\"form\":{\"mnemonic\":\"" + mnemonic + "\",\"content\":{\"Fns.FormStep1.Panel1.userInn\":{\"value\":\"" + inn + "\"},\"Fns.FormStep1.Panel1.emailSend\":{\"value\":false},\"Fns.FormStep1.Panel1.phoneSend\":{\"value\":false},\"Fns.FormStep1.Panel1.formatedResponse\":{\"value\":false},\"Fns.FormStep1.Panel1.requested\":{\"value\":false},\"Fns.FormStep1.Panel1.useFailoverCache\":{\"value\":false}}},\"context\":{\"context\":{\"groovy\":{\"Script\":\"groovy.fnsFetchBill\"}}}}"
		}

		var fns = apiCallBetaCabinet('POST', 'a/wsapi/?_=' + new Date().getTime(), JSON.stringify(json), {
			'Origin': 'https://beta.gosuslugi.ru',
			'X-Atmosphere-tracking-id': trackId,
			'X-Atmosphere-Framework': '1.0',
			'Content-Type': 'application/json',
			'X-Cache-Date': '0',
			'X-Atmosphere-Transport': 'long-polling',
			'Referer': 'https://beta.gosuslugi.ru/10002/result',
		});
		// Общая сумма
		sumParam(fns.form.content.total.total + '', result, 'nalog_balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);

		var details = '';

		for (var data in fns.form.content) {
			if (fns.form.content[data].vidnalog) {
				details += fns.form.content[data].vidnalog + ': <b>' + fns.form.content[data].summa + '</b><br/><br/>';
			} else {
				continue;
			}

		}

		if (details != '')
			sumParam(details, result, 'nalog_info', null, replaceTagsAndSpaces, null, aggregate_join);
	}
}


/**
 API call implementation.
 returns json obj
 */
function apiCallBetaCabinet(method, action, params, addOnHeaders) {
	var ret;
	if (method == 'GET')
		ret = AnyBalance.requestGet(g_betaBaseurl + action, isset(addOnHeaders) ? addHeaders(g_betaApiHeaders, addOnHeaders) : g_betaApiHeaders);
	else if (method == 'POST')
		ret = AnyBalance.requestPost(g_betaBaseurl + action, params, isset(addOnHeaders) ? addHeaders(g_betaApiHeaders, addOnHeaders) : g_betaApiHeaders);
	else
		throw new AnyBalance.Error('Unexpected type of method: ' + method);

	ret = getJson(ret);

	var code = isset(ret.error.code) ? ret.error.code : ret.error.errorCode;
	var message = ret.error.message || ret.error.errorMessage;

	if (code !== 0) {
		if (message)
			throw new AnyBalance.Error(message);

		throw new AnyBalance.Error("Произошла неизвестная ошибка при выполнении запроса.");
	}

	return ret;
}
/////////////////////////////////////////////// Конец блока бета-кабинета ////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////