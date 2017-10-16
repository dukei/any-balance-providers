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
	if (/@/.test(prefs.login)) {
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
	if(!AnyBalance.isAvailable('profile', 'fines', 'nalog'))
		return;

	result.profile = {};

	getParam(html, result.profile, 'profile.fio', /title="Личный кабинет"(?:[^>]*>){3}([^<]+)</i, replaceTagsAndSpaces);
	// Глючит, почему-то всегда 5 показывает
	if (isAvailable('profile.mails'))
		getParam(getUnreadMsgJson(), result.profile, 'profile.mails', /"msgCount"\D*(\d+)/i, replaceTagsAndSpaces, parseBalance);

	// Детальная инфа
	var html = checkForRedirect(AnyBalance.requestGet('https://esia.gosuslugi.ru/profile/user/', g_headers));

	getParam(html, result.profile, 'profile.fio', /ФИО(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)(?:<\/dd>|<span[^>]+status-verify)/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.birth_place', /Место рождения(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)(?:<\/dd>|<span[^>]+status-verify)/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.birth_day', /Дата рождения(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)(?:<\/dd>|<span[^>]+status-verify)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result.profile, 'profile.document', /Документ, удостоверяющий личность(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)(?:<\/dd>|<span[^>]+status-verify)/i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.snils', /Страховой номер индивидуального лицевого счёта(?:[\s\S]*?<dd[^>]*>)([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces);
	getParam(html, result.profile, ['profile.inn', 'nalog'], /id="person:someInnLinkId[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.adress_fakt', /openAltAddress[^<]+'PRG'[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.adress', /openAltAddress[^<]+'PLV'[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.email', /altEmailWgt[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result.profile, 'profile.phone', /altMobileWgt[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);

	var license = getElement(html, /<[^>]+altDrLicenceWgt.show[^>]*>/i, replaceTagsAndSpaces);
	if (isset(license)) {
		getParam(license, result.profile, ['profile.license_number', 'fines'], /[^,]*/, [/\s+/g, '']);
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
			var dd = getElement(vehicles[i], /<dd[^>]*>/i, replaceTagsAndSpaces);
			getParam(dd, vehicle, ['profile.vehicles.plate', 'fines'], /([^,]+)/i, [/\s+/g, '']);
			getParam(dd, vehicle, ['profile.vehicles.plate_id', 'fines'], /свидетельство о регистрации\s*([^<]+)/i, [/\s+/g, '']);

			if (isset(vehicle.name) || isset(vehicle.plate) || isset(vehicle.plate_id))
				result.profile.vehicles.push(vehicle);
		}
	}
}
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Штрафы
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function processFinesBeta(result, prefs, showPaidFines) {
	var plates = [], stsNums = [], vehicles = [];
	if(prefs.gosnumber)
		plates = (prefs.gosnumber || '').split(/\s*;[\s;]*/g);

	if(prefs.sts_num)
		stsNums = (prefs.sts_num || '').split(';');

	AnyBalance.trace('Автомобилей: ' + plates.length);
	AnyBalance.trace('Свидетельств о регистрации: ' + stsNums.length);

	if (plates.length != stsNums.length)
		throw new AnyBalance.Error('Введите одинаковое количество номеров автомобилей и свидетельств о регистрации!', null, true);

    for(var i=0; i<plates.length; ++i){
    	vehicles.push({
    		plate: plates[i],
    		plate_id: stsNums[i]
    	});
    }

    processFinesBetaVehicles(result, vehicles, prefs.licensenumber, showPaidFines);
}

function processFinesBetaVehicles(result, vehicles, license_number, showPaidFines) {
	if ((!vehicles || !vehicles.length) && !license_number){
		AnyBalance.trace('Нет автомобилей или прав, штрафы не получаем');
		return;
	}

	if (isAvailable(['fines', 'fines_total', 'fines_unpaid'])) {
		AnyBalance.trace('Указан номер автомобиля, значит надо получать штрафы...');
		result.fines = [];
		// Обнулим общие счетчики
		result['fines_unpaid'] = 0;
		result['fines_total'] = 0;

		html = AnyBalance.requestGet(g_baseurl + '10001/form', g_headers);

		var trackId = AnyBalance.getLastResponseHeader('X-Atmosphere-tracking-id');
		checkEmpty(trackId, 'X-Atmosphere-tracking-id header missing', true);

		var templateObj = getJsonObject(html, /gibdd\.requestTemplate/);

		function createRequestParams(template) {
			if (template.form.content) {
				// Добавим водительское удостоверение
				if (license_number) {
					template.form.content['GibddFines.FormStep1.Panel1.vuNumber'] = {
						value: license_number
					};
				}
				// Теперь машины
				for (var i = 0; i < vehicles.length; i++) {
					template.form.content['GibddFines.FormStep1.Panel1.carNumber' + i] = {
						"value": vehicles[i].plate.replace(/\s+/g, '')
					};
					template.form.content['GibddFines.FormStep1.Panel1.stsNumber' + i] = {
						"value": vehicles[i].plate_id.replace(/\s+/g, '')
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
			'Origin': g_baseurl,
			'X-Atmosphere-tracking-id': trackId,
			'X-Atmosphere-Framework': '1.0',
			'Content-Type': 'application/json',
			'X-Cache-Date': '0',
			'X-Atmosphere-Transport': 'long-polling',
			'Referer': g_baseurl + '10001/result',
		});

		if (response.error.code != 0) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось запросить информацию о штрафах, ошибка в запросе!');
		}
		// Для удобства
		var data = response.form.content || {total: 0};

		for(var k in data) {
			var current = data[k];
			
			// Это не штраф, пропускаем
			if(!current || !current.billSource)
				continue;
			
			var _id = current.bID || current.billId;
			var _name = current.fkNumber;
			
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

function parseBool(str) {
	return !/0/.test(str);
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
	if(!inn){
		AnyBalance.trace('Не указан ИНН, налоги не получаем...');
		return;
	}

	if (isAvailable(['nalog'])) {
		result.nalog = {};

		html = AnyBalance.requestGet(g_baseurl + '10002/form', g_headers);

		var forminfo = getJsonObject(html, /rootScope.fns.requestTemplate\s*=/);
		if(!forminfo){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму ввода инн. Сайт изменен?');
		}

		var mnemonic = forminfo.form.mnemonic;

		var trackId = AnyBalance.getLastResponseHeader('X-Atmosphere-tracking-id');
		checkEmpty(trackId, 'X-Atmosphere-tracking-id header missing', true);

		var json = {
			"type": "javaServiceTask",
			"serviceName": "formProcessing",
			"methodName": "process",
			"parameter": "{\"submitComponent\":\"Fns.FormStep1.Panel1.button\",\"submitEventNumber\":\"0\",\"submitEvent\":\"submit\",\"userSelectedRegion\":\"00000000000\",\"form\":{\"mnemonic\":\"" + mnemonic + "\",\"content\":{\"Fns.FormStep1.Panel1.userInn\":{\"value\":\"" + inn + "\"},\"Fns.FormStep1.Panel1.emailSend\":{\"value\":false},\"Fns.FormStep1.Panel1.phoneSend\":{\"value\":false},\"Fns.FormStep1.Panel1.formatedResponse\":{\"value\":false},\"Fns.FormStep1.Panel1.requested\":{\"value\":false},\"Fns.FormStep1.Panel1.useFailoverCache\":{\"value\":false}}},\"context\":{\"context\":{\"groovy\":{\"Script\":\"groovy.fnsFetchBill\"}}}}"
		}

		var fns = apiCallBetaCabinet('POST', 'a/wsapi/?_=' + new Date().getTime(), JSON.stringify(json), {
			'Origin': g_baseurl,
			'X-Atmosphere-tracking-id': trackId,
			'X-Atmosphere-Framework': '1.0',
			'Content-Type': 'application/json',
			'X-Cache-Date': '0',
			'X-Atmosphere-Transport': 'long-polling',
			'Referer': g_baseurl + '10002/result',
		});
		// Общая сумма
		sumParam(fns.form.content.total.total + '', result.nalog, 'nalog.debt', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);

		var details = '';

		for (var data in fns.form.content) {
			if (fns.form.content[data].vidnalog) {
				details += fns.form.content[data].vidnalog + ': <b>' + fns.form.content[data].summa + '</b><br/><br/>';
			} else {
				continue;
			}

		}

		if (details != '')
			sumParam(details, result.nalog, 'nalog.info', null, replaceTagsAndSpaces, null, aggregate_join);
	}
}


/**
 API call implementation.
 returns json obj
 */
function apiCallBetaCabinet(method, action, params, addOnHeaders) {
	var ret;
	if (method == 'GET')
		ret = AnyBalance.requestGet(g_baseurl + action, isset(addOnHeaders) ? addHeaders(g_betaApiHeaders, addOnHeaders) : g_betaApiHeaders);
	else if (method == 'POST')
		ret = AnyBalance.requestPost(g_baseurl + action, params, isset(addOnHeaders) ? addHeaders(g_betaApiHeaders, addOnHeaders) : g_betaApiHeaders);
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