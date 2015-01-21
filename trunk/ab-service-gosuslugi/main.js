/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.76 Safari/537.36',
};

var g_apiHeaders = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Origin':'https://www.gosuslugi.ru',
	'X-Requested-With':'XMLHttpRequest',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.76 Safari/537.36',
	'Content-Type':'application/json',
	'Referer':'https://www.gosuslugi.ru/pgu/personcab',
}

var g_baseurl = 'https://www.gosuslugi.ru/';
var g_replaceSpacesAndBrs = [/^\s+|\s+$/g, '', /<br\/><br\/>$/i, ''];
var g_gibdd_info = '';
// Максимальное количество автомобилей, по которым получать данные.
var g_max_plates_num = 3;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	var formattedLogin = getParam(prefs.login || '', null, null, /^\d{11}$/, [/^(\d{3})(\d{3})(\d{3})(\d{2})$/i, '$1-$2-$3 $4']);
	
	checkEmpty(formattedLogin, 'Введите СНИЛС (без пробелов и разделителей, 11 символов подряд). Вы ввели: "'+ (prefs.login || 'пустое поле')+'"!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(g_baseurl + 'pgu/personcab', g_headers);
	
	// нужно для отладки
	if(!isLoggedIn(html)) {
		html = performRedirect(html);
		
		html = AnyBalance.requestPost('https://esia.gosuslugi.ru/idp/authn/UsernamePasswordLogin', {
			username: formattedLogin,
			password: prefs.password,
			idType:'snils',
		}, addHeaders({Referer: 'https://esia.gosuslugi.ru/idp/authn/CommonLogin'}));
		
		//Попытаемся получить ошибку авторизации на раннем этапе. Тогда она точнее.
		var errorCode = getParam(html, null, null, /authn\.error\.([^"']+)/i);
		if (errorCode) {
			var jsonLocalizationMsg = getParam(html, null, null, /var jsonLocalizationMsg\s*=\s*(\{[\s\S]*?\})\s*;/i, null, getJson);
			var message = getParam(jsonLocalizationMsg.authn.error[errorCode], null, null, null, replaceTagsAndSpaces, html_entity_decode);
			
			throw new AnyBalance.Error(message, null, /invalidCredentials/i.test(errorCode));
		}

		// Возмонжо мы попадем в кабинет где есть ИП и физ лицо, надо проверить
		if(/<h1[^>]*>\s*Выбор роли\s*<\/h1>/i.test(html)) {
			html = AnyBalance.requestGet('https://esia.gosuslugi.ru/idp/globalRoleSelection?orgID=P', g_headers);
		}
		
		html = performRedirect(AnyBalance.requestGet('https://www.gosuslugi.ru/pgu/personcab', g_headers));
		// Поскольку Ваш браузер не поддерживает JavaScript, для продолжения Вам необходимо нажать кнопку "Продолжить".
		//var params = createFormParams(html);
		
		//html = performRedirect2(AnyBalance.requestPost('https://www.gosuslugi.ru/pgu/saml/SAMLAssertionConsumer', params, addHeaders({Referer: g_baseurl + 'idp/profile/SAML2/Redirect/SSO'})));
		html = checkForJsOff(html);
	}

	if(!isLoggedIn(html)) {
		var error = getParam(html, null, null, [/span\s*>\s*(Ошибка авторизации(?:[^>]*>){4})/i, /<div class="error[^>]*>([\s\S]*?)<\/div>/i], [replaceTagsAndSpaces, /Вернуться назад/i, ''], html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, '__tariff', /title="Личный кабинет"(?:[^>]*>){3}([^<]+)</i, replaceTagsAndSpaces, html_entity_decode);
	getParam(result.__tariff, result, 'fio');
	
	// Глючит, почему-то всегда 5 показывает
	if(isAvailable('mails')) {
		getParam(getUnreadMsgJson(), result, 'mails', /"msgCount"\D*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	}
    // Штрафы ГИБДД
    if (prefs.gosnumber) {
    	try {
			AnyBalance.trace('Указан номер автомобиля, значит надо получать штрафы...');
			
			var plates = prefs.gosnumber.split(';');
			AnyBalance.trace('Автомобилей: ' + plates.length);
			var len = Math.min(plates.length, g_max_plates_num);
			for(var i = 0; i < len; i++) {
				var current = plates[i];
				if(current) {
					AnyBalance.trace('Получаем данные по автомобилю с номером ' + current);
					
					prefs.gosnumber = current;
					processGibdd(result, html, prefs);
				}
			}
    	} catch (e) {
			AnyBalance.trace('Не удалось получить данные по штрафам из-за ошибки: ' + e.message);
    	}
    }
    // Налоги
    if (prefs.inn) {
    	try {
    		AnyBalance.trace('Указан ИНН, значит надо получать данные по налогам...');
    		processNalogi(result, html, prefs);
    	} catch (e) {
    		AnyBalance.trace('Не удалось получить данные по налогам из-за ошибки: ' + e.message);
    	}
    }
    AnyBalance.setResult(result);
}

function processGibdd(result, html, prefs) {
	checkEmpty(prefs.gosnumber = getParam(prefs.gosnumber, null, null, /^\D?\d{3,4}\D{2}\d{2,3}$/), 'Введите номер автомобиля в формате х123хх50 или 1234хх50!', true);
	// Права не обязательны для заполнения
	if(prefs.licensenumber) {
		checkEmpty(prefs.licensenumber = getParam(prefs.licensenumber, null, null, /^.{10}$/), 'Введите серию и номер водительского удостоверения в формате 50км123456!', true);
	}
	
	if(isAvailable(['gibdd_balance', 'gibdd_info'])) {
		// Id сервиса в системе, может меняться в будущем - вынесем отдельно.
		var serviceID = '10000581563';
		
		var url = 'https://www.gosuslugi.ru/pgu/service/'+ serviceID +'_26.html'
		
		html = AnyBalance.requestGet(url, g_headers);
		
		var json = getJson(postAPICall('https://www.gosuslugi.ru/fed/service/' + serviceID + '_26/checkStatus.json', {}, url));
		
		if(json.errorCode != 0) {
			throw new AnyBalance.Error('Система ответила сообщением: ' + json.errorMessage);
		}
		
		var mainLink = 'https://www.gosuslugi.ru/fed/services/s26/initForm?serviceTargetExtId=' + serviceID + '&userSelectedRegion=00000000000&rURL=https://www.gosuslugi.ru/pgu/personcab/orders&srcFormProviderId=9952354';
		// Иногда возвращается пустая страница
		for(var tries = 3; tries > 0; tries--) {
			html = AnyBalance.requestGet(mainLink, addHeaders({Referer: url}));
			
			if(html)
				break;
		}
		//html = AnyBalance.requestGet(mainLink, addHeaders({Referer: mainLink}));
		// Здесь проверим на ошибки
		var action = getParam(html, null, null, /'action'[^'"]*['"]\/([^'"]*)/i);
		
		if(!action) {
			var error = getParam(html, null, null, /Услуга недоступна<(?:[^>]*>){3}([\s\S]*?)<\/div/i, replaceTagsAndSpaces, html_entity_decode);
			if (error)
				throw new AnyBalance.Error(error);
			
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму для запроса штрафов, скорее всего услуга недоступна!');
		}
		//checkEmpty(action, 'Не удалось найти форму для запроса штрафов, скорее всего услуга недоступна!', true);
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'tsRz')
				return prefs.gosnumber;
			else if (name == 'VU')
				return prefs.licensenumber;
			return value;
		});
		
		html = AnyBalance.requestPost(g_baseurl + action, params, addHeaders({Referer: mainLink}));
		
		// Проверить что статус у заявления исполнено
		if(!/>\s*Исполнено\s*</i.test(html)) {
			throw new AnyBalance.Error('Не удалось обработать заявление, сайт изменен?');
		}
		html = getXmlFileResult(html);
		
		// Все теперь у нас есть данные, наконец-то..
		var fees = sumParam(html, null, null, /<div[^>]*class="text"[^>]*>\s*<table(?:[\s\S]*?<tr[^>]*>){12}(?:[^>]*>){5}\s*<\/table>/ig);
		
		AnyBalance.trace('Найдено штрафов: ' + fees.length);
		
		if(!isset(result.gibdd_balance))
			result.gibdd_balance = 0;
		
		for(var i = 0; i < fees.length; i++) {
			var current = fees[i];
			var plainText = getParam(current, null, null, null, replaceTagsAndSpaces);
			var feeName = getParam(current, null, null, /<td[^>]*>([^<]+)/i, replaceTagsAndSpaces);
			
			if(/Оплачено/i.test(current)) {
				//AnyBalance.trace('Нашли оплаченный штраф, пропускаем: ' + feeName);
				//g_gibdd_info += feeName + ' - <b>Оплачен</b><br/><br/>';
			} else {
				AnyBalance.trace('Нашли неоплаченный штраф: ' + feeName);
				
				if(g_gibdd_info.indexOf(feeName) === -1) {
					g_gibdd_info += feeName + ' - <b>Не оплачен</b><br/><br/>';
					sumParam(feeName, result, 'gibdd_balance', /,([\s\d.,]+)руб/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);					
				} else {
					AnyBalance.trace('Штраф ' + feeName + ' привязан к номеру ВУ и уже был учтен в подсчете общей суммы штрафов...');
				}
			}
		}
		// Сводка по штрафам
		getParam(g_gibdd_info, result, 'gibdd_info', null, g_replaceSpacesAndBrs);
	}
}

function processNalogi(result, html, prefs) {
	if(isAvailable(['nalog_balance', 'nalog_info'])) {
		// Id сервиса в системе, может меняться в будущем - вынесем отдельно.
		var serviceID = '10001761551', servicesubId = '99';
		
		var url = g_baseurl + 'pgu/service/'+ serviceID +'_' + servicesubId + '.html'
		
		html = AnyBalance.requestGet(url, g_headers);
		
		var json = postAPICall(g_baseurl + 'fed/service/' + serviceID + '_' + servicesubId + '/checkStatus.json', {}, url);
		json = getJson(json);
		
		if(json.errorCode != 0) {
			throw new AnyBalance.Error('Система ответила сообщением: ' + json.errorMessage);
		}
		
		var mainLink = g_baseurl + 'fed/services/s' + servicesubId + '/initForm?serviceTargetExtId=' + serviceID + '&userSelectedRegion=00000000000&rURL=https://www.gosuslugi.ru/pgu/personcab/orders&srcFormProviderId=9952354';
		// Иногда возвращается пустая страница
		for(var tries = 3; tries > 0; tries--) {
			html = AnyBalance.requestGet(mainLink, addHeaders({Referer: url}));
			
			if(html) break;
		}
		//html = AnyBalance.requestGet(mainLink, addHeaders({Referer: url}));
		
		var stepId = 0;
		// Нужно подтвердить пользовательское соглашение...
		var serviceUrl = g_baseurl + 'fed/services/s' + servicesubId + '/s' + (++stepId) + '?serviceTargetExtId=' + serviceID;
		html = AnyBalance.requestPost(serviceUrl, createFormParamsById(html, servicesubId),	addHeaders({Referer: mainLink}));
		
		var params = createFormParamsById(html, servicesubId);
		
		params.inn = prefs.inn;
		// По всем регионам
		params['region[0]'] = '99';
		
		serviceUrl = g_baseurl + 'fed/services/s' + servicesubId + '/s' + (++stepId) + '?serviceTargetExtId=' + serviceID;
		html = AnyBalance.requestPost(serviceUrl, params, addHeaders({Referer: serviceUrl}));
		
		// Проверить что статус у заявления исполнено
		if(!/>\s*Исполнено\s*</i.test(html)) {
			throw new AnyBalance.Error('Не удалось обработать заявление, сайт изменен?');
		}
		
		html = getXmlFileResult(html);
		
		// Все теперь у нас есть данные, наконец-то..
		var array = sumParam(html, null, null, /<tr>(\s*<td>(?:[\s\S]*?<td[^>]*){4}[^<]*)<\/t/ig);
		
		AnyBalance.trace('Найдено налогов: ' + array.length);
		var html_resonse = '';
		
		for(var i = 0; i < array.length; i++) {
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
	
	if(!response) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить информацию об услуге, сайт изменен?');
	}
	return response;		
}

function getUnreadMsgJson() {
	var response = AnyBalance.requestPost('https://www.gosuslugi.ru/pgu/wsapi/gepsIntegration/getUnreadMessageCount', JSON.stringify({}), g_apiHeaders);
	if(!response || !/"operation completed"/i.test(response)) {
		AnyBalance.trace(response);
		AnyBalance.trace('Не удалось получить информацию о госпочте, сайт изменен?');
	}
	
	return response;
}

function checkForJsOff(html) {
	if(/Since your browser does not support JavaScript,\s+you must press the Continue button once to proceed/i.test(html)) {
		AnyBalance.trace('Since your browser does not support JavaScript, you must press the Continue button once to proceed...');
		// Поскольку Ваш браузер не поддерживает JavaScript, для продолжения Вам необходимо нажать кнопку "Продолжить".
		var params = createFormParams(html);
		
		html = checkForRedirect(AnyBalance.requestPost('https://www.gosuslugi.ru/pgu/saml/SAMLAssertionConsumer', params, addHeaders({Referer: g_baseurl + 'idp/profile/SAML2/Redirect/SSO'})));
	}
	return html;
}

function checkForRedirect(html) {
	// Пытаемся найти ссылку на редирект
	var href = getParam(html, null, null, /url=([^"]+)/i);
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

function performRedirect(html) {
	var href = getParam(html, null, null, /url=([^"]+)/i);
	if (!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на переадресацию, сайт изменен?');
	}
	//AnyBalance.trace('Нашли ссылку ' + href);
	return AnyBalance.requestGet(href, addHeaders({Referer: g_baseurl + 'pgu/personcab'}));
}

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
	
	if(!href) {
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