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

var g_baseurl = 'https://www.gosuslugi.ru/';

function performRedirect(html) {
	var href = getParam(html, null, null, /url=([^"]+)/i);
	if(!href) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти ссылку на переадресацию, сайт изменен?');
	}
	AnyBalance.trace('Нашли ссылку на ' + href);
	return AnyBalance.requestGet(href, addHeaders({Referer: g_baseurl + 'pgu/personcab'}));
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login = getParam(prefs.login || '', null, null, null, [/^(\d{3})(\d{3})(\d{3})(\d{2})$/i, '$1-$2-$3 $4']), 'Введите СНИЛС (без пробелов и разделителей, 11 символов подряд, вы ввели: "'+ (prefs.login || 'пустое поле')+'") или логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(g_baseurl + 'pgu/personcab', g_headers);
	
	html = performRedirect(html);
	
	html = AnyBalance.requestPost('https://esia.gosuslugi.ru/idp/Authn/UsernamePasswordLogin', {
		username: prefs.login,
		password: prefs.password,
		answer:'',
		globalRole:'RF_PERSON',
		capture:'',
		phraseId:'',
		cmsDS:'',
		isRegCheck:'false'
	}, addHeaders({Referer: 'https://esia.gosuslugi.ru/idp/Authn/CommonLogin'}));
	
	html = AnyBalance.requestGet('https://www.gosuslugi.ru/pgu/personcab', g_headers);
	
	html = performRedirect(html);
	
	// Поскольку Ваш браузер не поддерживает JavaScript, для продолжения Вам необходимо нажать кнопку "Продолжить".
	var params = createFormParams(html);
	
	html = AnyBalance.requestPost('https://www.gosuslugi.ru/pgu/saml/SAMLAssertionConsumer', params, addHeaders({Referer: g_baseurl + 'pgu/personcab'}));
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /span\s*>\s*(Ошибка авторизации(?:[^>]*>){4})/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(html));
		
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /title="Личный кабинет"(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	// Глючит, почему-то всегда 5 показывает
	if(isAvailable('mails')) {
		getParam(getUnreadMsgJson(), result, 'mails', /"msgCount"\D*(\d+)/i, replaceTagsAndSpaces, parseBalance);
	}
	// Штрафы ГИБДД
	if(prefs.gosnumber) {
		AnyBalance.trace('Указан номер автомобиля, значит надо получать штрафы...');
		processGibdd(result, html, prefs);
	}

	/*
	getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /Номер:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'deadline', /Действителен до:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, ['currency', 'balance'], /Текущий баланс:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'status', /Статус:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
	*/
	AnyBalance.setResult(result);
}

function processGibdd(result, html, prefs) {
	checkEmpty(prefs.gosnumber, 'Введите госномер автомобиля!');
	checkEmpty(prefs.licensenumber, 'Введите серию и номер водительского удостоверения!');
	
	if(isAvailable(['gibdd_balance', 'gibdd_info'])) {
		// Id сервиса в системе, может меняться в будущем - вынесем отдельно.
		var serviceID = '10000581563';

		var url = 'https://www.gosuslugi.ru/pgu/service/'+ serviceID +'_26.html'
		
		html = AnyBalance.requestGet(url, g_headers);
		
		var json = postAPICall('https://www.gosuslugi.ru/fed/service/' + serviceID + '_26/checkStatus.json', {}, url);
		
		var mainLink = 'https://www.gosuslugi.ru/fed/services/s26/initForm?serviceTargetExtId=' + serviceID + '&userSelectedRegion=00000000000&rURL=https://www.gosuslugi.ru/pgu/personcab/orders&srcFormProviderId=9952354';
		
		html = AnyBalance.requestGet(mainLink, addHeaders({Referer: url}));
		
		html = AnyBalance.requestGet(mainLink, addHeaders({Referer: mainLink}));
		
		var action = getParam(html, null, null, /'action'[^'"]*['"]\/([^'"]*)/i);
		
		var params = createFormParams(html, function(params, str, name, value) {
			if (name == 'tsRz')
				return prefs.gosnumber;
			else if (name == 'VU')
				return prefs.licensenumber;
			return value;
		});
		
		html = AnyBalance.requestPost(g_baseurl + action, params, addHeaders({Referer: mainLink}));
		
		// Проверить что статус у заявления исполнено
		if(/>\s*Исполнено\s*</i.test(html)) {
			var href = getParam(html, null, null, /\{\s*url:[^"]*"\/([^"]*)/i, [/\s/ig, '%20']);
			
			// https://www.gosuslugi.ru/fed/serviceResult/getFileResult?filename=%D0%A0%D0%B5%D0%B7%D1%83%D0%BB%D1%8C%D1%82%D0%B0%D1%82_1.html&orderId=89560860&serviceId=26&mimeType=docFormat%20docXML&downloadType=download&alternate=text/html&mnemonic=1&fileNo=0
			html = AnyBalance.requestGet(g_baseurl + href, {
				'Accept': 'text/html, */*',
				'X-Requested-With': 'XMLHttpRequest',
				'User-Agent': 'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.76 Safari/537.36',
				'Referer': g_baseurl + action,
			});
			
			// Все теперь у нас есть данные, наконец-то..
			var fees = sumParam(html, null, null, /<div[^>]*class="text"[^>]*>\s*<table(?:[\s\S]*?<tr[^>]*>){12}(?:[^>]*>){5}\s*<\/table>/ig);
			var gibdd_info = '';
			
			AnyBalance.trace('Найдено штрафов (оплаченных и неоплаченных): ' + fees.length);
			
			for(var i = 0; i < fees.length; i++) {
				var current = fees[i];
				var plainText = getParam(current, null, null, null, replaceTagsAndSpaces);
				
				var feeName = getParam(current, null, null, /<td[^>]*>([^<]+)/i, replaceTagsAndSpaces);
				
				if(/Оплачено/i.test(current)) {
					AnyBalance.trace('Нашли оплаченный штраф, пропускаем: ' + feeName);
					gibdd_info += feeName + ' - <b>Оплачен</b><br/><br/>';
				} else {
					AnyBalance.trace('Нашли неоплаченный штраф: ' + feeName);
					gibdd_info += feeName + ' - <b>Неоплачен</b><br/><br/>';

					sumParam(feeName, result, 'gibdd_balance', /([\d.,]*)\s*руб/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				}
			}
			// Сводка по штрафам
			getParam(gibdd_info, result, 'gibdd_info', null, [/^\s+|\s+$/g, '', /<br\/><br\/>$/i, '']);
		} else {
			AnyBalance.trace('Не удалось обработать заявление, сайт изменен?');
		}
	}	
}

var g_apiHeaders = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'Origin':'https://www.gosuslugi.ru',
	'X-Requested-With':'XMLHttpRequest',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.76 Safari/537.36',
	'Content-Type':'application/json',
	'Referer':'https://www.gosuslugi.ru/pgu/personcab',
}

/** на входе урл и параметры в json */
function postAPICall(url, params, referer) {
	var response = AnyBalance.requestPost(url, JSON.stringify(params), isset(referer) ? addHeaders({Referer: referer}) : g_apiHeaders);
	
	if(!response)
		throw new AnyBalance.Error('Не удалось получить информацию об услуге, сайт изменен?');
	
	return response;		
}

function getUnreadMsgJson() {
	var response = AnyBalance.requestPost('https://www.gosuslugi.ru/pgu/wsapi/gepsIntegration/getUnreadMessageCount', JSON.stringify({}), g_apiHeaders);
	if(!response || !/"operation completed"/i.test(response))
		AnyBalance.trace('Не удалось получить информацию о госпочте, сайт изменен?');

	return response;
}