/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function requestApi(action, params, dontAddDefParams, url, ignoreErrors) {
	var baseurl = (url || 'https://online.sberbank.ru:4477/CSAMAPI/');
	return requestApi2(baseurl + action, params, !dontAddDefParams, ignoreErrors);
}

function requestApi2(url, params, addDefParams, ignoreErrors) {
	var m_headers = {
		'Connection': 'keep-alive',
		'User-Agent': 'Mobile Device',
		'Origin':'',
	};
	
	if(!addDefParams) {
		var newParams = params;
	} else {
		var newParams = joinObjects(params, {
			'version':'7.00',
			'appType':'android',
			'appVersion':'2014060500',
			'deviceName':'AnyBalanceAPI',
		});
	}
	// регистрируем девайс
	var html = AnyBalance.requestPost(url, newParams, m_headers);
	// Проверим на правильность

	var code = getParam(html, null, null, /<status>\s*<code>(-?\d+)<\/code>/i, null, parseBalance);
	
	if(!/<status>\s*<code>0<\/code>/i.test(html)) {
		AnyBalance.trace(html);
		if(!ignoreErrors){
			var error = sumParam(html, null, null, /<error>\s*<text>\s*<!(?:\[CDATA\[)?([\s\S]*?)(?:\]\]>)\s*<\/text>\s*<\/error>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
			var ex = new AnyBalance.Error(error || "Ошибка при обработке запроса!", null, /неправильный идентификатор/i.test(error));
			ex.code = code;
			throw ex;
		}
	}
	return html;
}

function getToken(html) {
	var token = getParam(html, null, null, /<token>([^<]+)<\/token>/i);
	if(!token) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удалось найти токен авторизации, сайт изменен?");
	}
	return token;
}

function mainMobileApp(prefs) {
	if(AnyBalance.getLevel() < 9) {
		throw new AnyBalance.Error('Для использования API мобильного приложения необходим AnyBalance API v9!');
	}
	
	var defaultPin = '11223';
	
	/*html = requestApi('checkPassword.do', {
		'operation':'check',
		'password':defaultPin
	}, true, 'https://node1.online.sberbank.ru:4477/mobile7/', true);
	*/
	// Здесь нужно узнать, нужна ли привязка
	var guid = AnyBalance.getData('guid', '');
	if(guid) {
		AnyBalance.trace('Устройство уже привязано!');
		AnyBalance.trace('guid is: ' + guid);
		
		try{
			html = requestApi2('https://online.sberbank.ru:4477/CSAMAPI/login.do', {
				'operation':'button.login',
				'mGUID':guid,
				'isLightScheme':'true',
				'devID':hex_md5(prefs.login)
			}, true);
		}catch(e){
			if(e.code == 7){
			     //Приложение не зарегистрировано. Надо перегенерить гуид
			     AnyBalance.trace(e.message + ": Надо перегенерить guid");
			     guid = null;
			}else{
				throw e;
			}
		}
	}

	if(!guid){
		AnyBalance.trace('Необходимо привязать устройство!');
		
		// Сбер стал блокировать одинаковые девайсы, перепривязывая их по новой.
		// Придется сделать так
		var devID = hex_md5(prefs.login + ' ' + Math.random());
		// регистрируем девайс
		var html = requestApi('registerApp.do', {
			'operation':'register',
			'login':prefs.login,
			'devID':devID
		});
		
		var mGUID = getParam(html, null, null, /<mGUID>([\s\S]*?)<\/mGUID>/i);
		if(!mGUID) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error("Не удалось найти токен регистрации, сайт изменен?");
		}
		
		AnyBalance.setData('guid', mGUID);
		AnyBalance.trace('mGUID is: ' + mGUID);
		//AnyBalance.saveData(); Нельзя здесь сохранять! Только после успешного ввода кода!

		// Все, тут надо дождаться смс кода
		var code = AnyBalance.retrieveCode('Пожалуйста, введите код из смс, для привязки данного устройства.', null, {
			time: 120000,
			inputType: 'number',
		});
		
		html = requestApi('registerApp.do', {
			'operation':'confirm',
			'mGUID':mGUID,
			'smsPassword':code,
		});
		AnyBalance.trace('Успешно привязали устройство. Создадим PIN...');
		
		html = requestApi('registerApp.do', {
			'operation':'createPIN',
			'mGUID':mGUID,
			'password':defaultPin,
			'isLightScheme':'true',
			'devID':devID
		});

		AnyBalance.saveData();
		var token = getToken(html);
	}
	
	var baseurlAPI = 'https://node1.online.sberbank.ru:4477/mobile7/';
	var result = {success: true};
	
	html = requestApi2(baseurlAPI + 'postCSALogin.do', {'token':getToken(html)});
	
	getParam(html, result, 'userName', /<surName>([\s\S]*)<\/(?:patrName|firstName)>/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	
	html = requestApi2(baseurlAPI + 'checkPassword.do', {'operation':'check','password':defaultPin});
	// Спасибо
	if (AnyBalance.isAvailable('spasibo')) {
		html = requestApi2(baseurlAPI + 'private/profile/loyaltyURL.do');
		
		var url = getParam(html, null, null, /<url>([^<]{10,})/i, replaceTagsAndSpaces, html_entity_decode);
		if(url) {
			html = AnyBalance.requestGet(url);
			getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		} else {
			AnyBalance.trace("Не удалось найти ссылку на программу спасибо, сайт изменен?");
		}
	}
	// Курсы валют
	if(isAvailable(['eurPurch', 'eurSell', 'usdPurch', 'usdSell'])) {
		AnyBalance.trace('Fetching rates...');
		html = requestApi2(baseurlAPI + 'private/rates/list.do');
		
		getParam(html, result, 'eurPurch', /RUB<\/code>\s*<amount>([^<]+)<\/amount>\s*<\/from>\s*<to>\s*<code>EUR/i, null, parseBalance);
		getParam(html, result, 'eurSell', /EUR<\/code>\s*<\/from>\s*<to>\s*<code>RUB<\/code>([\s\S]*?)<\//i, null, parseBalance);
		getParam(html, result, 'usdPurch', /RUB<\/code>\s*<amount>([^<]+)<\/amount>\s*<\/from>\s*<to>\s*<code>USD/i, null, parseBalance);
		getParam(html, result, 'usdSell', /USD<\/code>\s*<\/from>\s*<to>\s*<code>RUB<\/code>([\s\S]*?)<\//i, null, parseBalance);		
	}
	
	// Получим продукты
	html = requestApi2(baseurlAPI + 'private/products/list.do', {showProductType:'cards,accounts,imaccounts'});
	
	if (prefs.type == 'acc')
		throw new AnyBalance.Error('Получение счетов пока не поддерживается, свяжитесь с разработчиками!');
	else
		fetchApiCard(html, result, prefs);
	
	AnyBalance.setResult(result);
}

function fetchApiCard(html, result, prefs) {
	if (prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего", null, true);
	
	var digits = '';
	if(prefs.lastdigits) {
		for(var i = 0; i < prefs.lastdigits.length; i++) {
			var сhar = prefs.lastdigits[i]
			digits += сhar + '\\s*';
		}
	}
	
	//<card>(?:[^>]*>){6,10}\s*<number>[\s\d*]+55 82[\s\S]*?<\/card>
	var card = getParam(html, null, null, new RegExp('<card>(?:[^>]*>){6,10}\\s*<number>[\\s\\d*]+' + digits + '[\\s\\S]*?</card>'));
	
	if(!card) {
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами ' + prefs.lastdigits : 'ни одной карты!'));
	}
	
	getParam(card, result, 'balance', /<amount>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(card, result, 'cardNumber', /<number>([^<]+)/i, replaceTagsAndSpaces);
	getParam(card, result, '__tariff', /<number>([^<]+)/i, replaceTagsAndSpaces);
	getParam(card, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], /code>\s*<name>([^<]+)/i, [replaceTagsAndSpaces, /\./, '']);
	getParam(card, result, 'status', /<state>([^<]+)/i, [replaceTagsAndSpaces, /active/i, 'Активная']);
	//getParam(card, result, 'till', reCardTill, replaceTagsAndSpaces, parseDateWord);
	
	var id = getParam(card, null, null, /<id>([^<]+)/i)
	if (AnyBalance.isAvailable('cash', 'electrocash', 'minpay', 'minpaydate', 'maxlimit')) {
		html = requestApi2('https://node1.online.sberbank.ru:4477/mobile7/private/cards/info.do', {'id':id});
		
		//getParam(html, result, ' ', /<holderName>([^<]+)/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
		getParam(html, result, 'cash', /<availableCashLimit>([\s\S]+?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'electrocash', /<purchaseLimit>([\s\S]+?)<\/amount>/i, replaceTagsAndSpaces, parseBalance);
		
		// Еще не знаю как это будет выглядеть
		//getParam(html, result, 'minpay', /Минимальный платеж:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'maxlimit', /Кредитный лимит:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
		//getParam(html, result, 'minpaydate', /Дата минимального платежа:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseDateForWord);
	}
	
	if (isAvailable(['lastPurchSum', 'lastPurchPlace', 'lastPurchDate'])) {
		try {
			html = requestApi2('https://node1.online.sberbank.ru:4477/mobile7/private/cards/abstract.do', {'id':id, count:10, paginationSize:10});
			
			getParam(html, result, 'lastPurchDate', /<operation><date>([^<]+)/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'lastPurchSum', /<amount>([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'lastPurchPlace', /<description><\!\[CDATA\[([^\]]+)/i, replaceTagsAndSpaces);
		} catch(e) {
			AnyBalance.trace('Не удалось получить выписку: ' + e.message);
		}
	}
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = "https://online.sberbank.ru/CSAFront/login.do";
	AnyBalance.setDefaultCharset('utf-8');
	
	if (prefs.__debug == 'esk') {
		//Чтобы карты оттестировать
		readEskCards();
		return;
	} 
	checkEmpty(prefs.login, "Пожалуйста, укажите логин для входа в Сбербанк-Онлайн!");
	checkEmpty(prefs.password, "Пожалуйста, укажите пароль для входа в Сбербанк-Онлайн!");
	if (prefs.lastdigits && !/^\d{4,5}$/.test(prefs.lastdigits)) 
		throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего", null, true);
	
	if(prefs.source == 'app') {
		mainMobileApp(prefs);
		return;
	}
	
/*      
    var html = AnyBalance.requestGet(baseurl + 'esClient/_logon/LogonContent.aspx');
    var error = getParam(html, null, null, /techBreakMsgLabel[^>]*>([\s\S]*?)<\/span>/i);
    if(error)
        throw new AnyBalance.Error(error);

    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    if(!viewstate){
        if(/<title>Runtime Error<\/title>/i.test(html))
            throw new AnyBalance.Error('Сервер Сбербанка Онлайн временно недоступен по техническим причинам. Попробуйте позднее.');
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + 'esClient/_logon/LogonContent.aspx', {
      __EVENTTARGET:'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$btnLogin',
      __EVENTARGUMENT:'',
      __VIEWSTATE:viewstate,
      'ctl00$ctl00$tbSbmt':'',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbLogin':prefs.login,
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbPassword':'********',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$hPw':prefs.password,
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbAlias':'',
      'ctl00$ctl00$BaseContentPlaceHolder$EnterContentPlaceHolder$tbAliasAgain':'',
      'ctl00$ctl00$BaseContentPlaceHolder$ctl01$ContentUpdatePanelParam':'',
      'ctl00$ctl00$BaseContentPlaceHolder$ctl01$ctl04$userManual2Region$ddlRegions':''
    });
*/
	var html;

	//Сбер разрешает русские логины и кодирует их почему-то в 1251, хотя в контент-тайп передаёт utf-8.
	AnyBalance.setDefaultCharset('windows-1251');
	html = AnyBalance.requestPost(baseurl, {
		'field(login)': prefs.login,
		'field(password)': prefs.password,
		operation: 'button.begin'
	});
	AnyBalance.setDefaultCharset('utf-8');
	
	var error = getParam(html, null, null, /<h1[^>]*>О временной недоступности услуги[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);
	
	error = getParam(html, null, null, /в связи с ошибкой в работе системы[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	if (error)
		throw new AnyBalance.Error(error);

	if (/\$\$errorFlag/i.test(html)) {
		var error = getParam(html, null, null, /([\s\S]*)/, replaceTagsAndSpaces, html_entity_decode);
		
		throw new AnyBalance.Error(error, null, /Ошибка идентификации/i.test(error));
	}
	var page = getParam(html, null, null, /value\s*=\s*["'](https:[^'"]*?AuthToken=[^'"]*)/i);
	if (!page) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по картам. Пожалуйста, обратитесь к автору провайдера для исправления ситуации.");
	}
	
	AnyBalance.trace("About to authorize: " + page);
	
	if (/esk.zubsb.ru/.test(page)) //Пока только это поддерживается
		doOldAccount(page);
	else if (/online.sberbank.ru\/PhizIC/.test(page))
		doNewAccount(page);
	else if (/Off_Service/i.test(page))
		throw new AnyBalance.Error("В настоящее время услуга Сбербанк ОнЛ@йн временно недоступна по техническим причинам. Сбербанк приносит свои извинения за доставленные неудобства.");
	else 
		throw new AnyBalance.Error("К сожалению, ваш вариант Сбербанка-онлайн пока не поддерживается. Пожалуйста, обратитесь к автору провайдера для исправления ситуации.");
}

function getViewState(html) {
	return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html) {
	return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}
/**
 * Извлекает валюту из переданного текста (типичная реализация)
 */
function parseCurrencyMy(text) {
	var val = getParam(html_entity_decode(text).replace(/\s+|[,.]*/g, ''), null, null, /-?\d[\d.,]*(\S*)/);
	AnyBalance.trace('Parsing currency (' + val + ') from: ' + text);
	return val;
}
/** Приводим все к единому виду вместо ИВаНов пишем Иванов */
function capitalFirstLenttersDecode(str) {
	str = html_entity_decode(str + '');
	var wordSplit = str.toLowerCase().split(' ');
	var wordCapital = '';
	for (i = 0; i < wordSplit.length; i++) {
		wordCapital += wordSplit[i].substring(0, 1).toUpperCase() + wordSplit[i].substring(1) + ' ';
	}
	return wordCapital.replace(/^\s+|\s+$/g, '');;
}

function parseSmallDate(str) {
    var dt = parseSmallDateInternal(str);
    AnyBalance.trace('Parsed small date ' + new Date(dt) + ' from ' + str);
    return dt;
}

function parseSmallDateInternal(str) {
	//Дата
    var matches = str.match(/(\d+):(\d+)/) || [,0,0];
	var now = new Date();
	if (/сегодня/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +matches[1], +matches[2], 0);
		return date.getTime();
	} else if (/вчера/i.test(str)) {
		var date = new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, +matches[1], +matches[2], 0);
		return date.getTime();
	} else {
		var matches = /(\d+)[^\d]+(\d+)/i.exec(str);
		if (!matches) {
			AnyBalance.trace('Не удалось распарсить дату: ' + str);
		} else {
			var year = now.getFullYear();
			if (now.getMonth() + 1 < +matches[2])--year; //Если текущий месяц меньше месяца последней операции, скорее всего, то было за прошлый год
			var date = new Date(year, +matches[2] - 1, +matches[1]);
			return date.getTime();
		}
	}
}

function doOldAccount(page) {
	AnyBalance.trace('Entering old account...');
	var html = AnyBalance.requestGet(page);
	var prefs = AnyBalance.getPreferences();
	var newpage = getParam(html, null, null, /"redirectForm"\s\S*?action="([^"]*)"/i);
	var submitparam = getParam(html, null, null, /<input type="hidden"[^>]*name="([^"]*)"/i);
	if (newpage) {
		var params = {};
		params[submitparam] = '';
		html = AnyBalance.requestPost('https://esk.zubsb.ru/pay/sbrf/Preload' + newpage, params);
		if (prefs.type == 'acc') fetchOldAcc(html);
		else fetchOldCard(html);
		return;
	}
	//Проверим, может это пересылка на режим ограниченной функциональности?
	var redirect = getParam(html, null, null, /Для продолжения работы в этом режиме перейдите по ссылке\s*<a[^>]+href="([^"]*)+/i, null, html_entity_decode);
	if (redirect) {
		AnyBalance.trace('Сбербанк перенаправил на ' + redirect);
		if (/esk.sbrf.ru\/esClient\/_logon\/MoveToCards.aspx/i.test(redirect)) {
			html = AnyBalance.requestGet(redirect);
			doNewAccountEsk(html);
			return;
		}
		throw new AnyBalance.Error('Сбербанк перенаправил на неизвестный личный кабинет. Пожалуйста, обратитесь к автору провайдера по е-мейл для исправления.');
	}
	throw new AnyBalance.Error('Не удалось войти в старый аккаунт. Проблемы или изменения на сайте. Пожалуйста, свяжитесь с автором провайдера для исправления.');
}

function fetchOldAcc(html) {
	var prefs = AnyBalance.getPreferences();
	var countLeft = prefs.lastdigits && (20 - prefs.lastdigits.length);
	var lastdigits = prefs.lastdigits ? (countLeft >= 0 ? '\\d{' + countLeft + '}' + prefs.lastdigits : prefs.lastdigits) : '\\d{20}';
	var re = new RegExp('Мои счета и вклады[\\s\\S]*?(<tr[^>]*>(?:[\\s\\S](?!</tr>))*>\\s*' + lastdigits + '\\s*<[\\s\\S]*?</tr>)', 'i');
	var tr = getParam(html, null, null, re);
	if (!tr) {
		if (prefs.lastdigits) throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по счету с последними цифрами " + prefs.lastdigits);
		else throw new AnyBalance.Error("Не удаётся найти ни одного счета");
	}
	var result = {
		success: true
	};
	getParam(tr, result, 'cardNumber', /(\d{20})/);
	getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrencyMy);
	getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<\/td>|<div)/i, replaceTagsAndSpaces);
	fetchOldThanks(html, result);
	var cardref = getParam(tr, null, null, /<a[^>]+href="([^"]*)/i, null, html_entity_decode);
	if (AnyBalance.isAvailable('userName')) {
		html = AnyBalance.requestGet('https://esk.zubsb.ru/pay/sbrf/AccountsMain' + cardref);
		getParam(html, result, 'userName', /Владелец(?:&nbsp;|\s+)счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	}
	AnyBalance.setResult(result);
}

function fetchOldThanks(html, result) {
	var thanksref = getParam(html, null, null, /"([^"]*bonus-spasibo.ru[^"]*)/i);
	if (AnyBalance.isAvailable('spasibo')) {
		html = AnyBalance.requestGet(thanksref);
		getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
}

function fetchOldCard(html) {
	var prefs = AnyBalance.getPreferences();
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	var baseFind = 'Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="[^"]{6,}"[^>]*>[^<]*?';
	var reCard = new RegExp('Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="([^"]{6,})"[^>]*>[^<]*?\\*\\*\\*' + lastdigits, 'i');
	var reCardNumber = new RegExp(baseFind + '(\\d+\\*\\*\\*' + lastdigits + ')', 'i');
	var reOwner = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?Владелец счета:([^<]*)', 'i');
	var reEngOwner = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?Клиент:([^<]*)', 'i');
	var reBalanceContainer = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?<td[^>]*>([\\S\\s]*?)<\\/td>', 'i');
	var cardref = getParam(html, null, null, reCard);
	if (!cardref) {
		if (prefs.lastdigits)
			throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по карте с последними цифрами " + prefs.lastdigits);
		else
			throw new AnyBalance.Error("Не удаётся найти ни одной карты");
	}
	var thanksref = getParam(html, null, null, /"([^"]*bonus-spasibo.ru[^"]*)/i);
	var result = {success: true};
	
	getParam(html, result, 'cardNumber', reCardNumber);
	getParam(html, result, 'userName', reOwner, replaceTagsAndSpaces, capitalFirstLenttersDecode);
	getParam(html, result, 'cardName', reEngOwner, replaceTagsAndSpaces);
	getParam(html, result, 'balance', reBalanceContainer, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], reBalanceContainer, replaceTagsAndSpaces, parseCurrencyMy);
	getParam(html, result, '__tariff', reCardNumber, replaceTagsAndSpaces);
	if (AnyBalance.isAvailable('till', 'status', 'cash', 'debt', 'minpay', 'electrocash', 'maxcredit', 'lastPurchDate', 'lastPurchSum', 'lastPurchPlace')) {
		html = AnyBalance.requestGet('https://esk.zubsb.ru/pay/sbrf/' + cardref);
		getParam(html, result, 'till', /Срок действия:[\s\S]*?<td[^>]*>.*?по ([^<]*)/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'cash', /Доступно наличных[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'debt', /Сумма задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'minpay', /Сумма минимального платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'electrocash', /Доступно для покупок[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'maxcredit', /Лимит кредита[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		//Последняя операция
		var tr = getParam(html, null, null, /Последние операции по карте:[\s\S]*?<tr[^>]*>((?:[\s\S](?!<\/tr>))*"(?:cDebit|cCredit)"[\s\S]*?)<\/tr>/i);
		if (tr) {
			getParam(tr, result, 'lastPurchDate', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
			getParam(tr, result, 'lastPurchSum', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(tr, result, 'lastPurchPlace', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		} else {
			AnyBalance.trace('Последняя операция не найдена.');
		}
	}
	if (AnyBalance.isAvailable('spasibo')) {
		html = AnyBalance.requestGet(thanksref);
		getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	AnyBalance.setResult(result);
}

function doNewAccount(page) {
	var html = AnyBalance.requestGet(page);
	if (/StartMobileBankRegistrationForm/i.test(html)) {
		//Сбербанк хочет, чтобы вы приняли решение о подключении мобильного банка. Откладываем решение.
		var pageToken = getParam(html, null, null, /name="PAGE_TOKEN"[^>]*value="([^"]+)/i);
		checkEmpty(pageToken, 'Попытались отказаться от подключения мобильного банка, но не удалось найти PAGE_TOKEN!', true);
		
		html = AnyBalance.requestPost('https://online.sberbank.ru/PhizIC/login/register-mobilebank/start.do', {
			PAGE_TOKEN:pageToken,
			operation: 'skip'
		});
		//throw new AnyBalance.Error('Сбербанк хочет, чтобы вы приняли решение о подключении мобильного банка. Пожалуйста, зайдите в Сбербанк ОнЛ@йн через браузер и сделайте выбор.');
	}
	// А ну другой кейс, пользователь сменил идентификатор на логин
	if(/Ранее вы[^<]*уже создали свой собственный логин для входа/i.test(html)) {
		checkEmpty(null, getParam(html, null, null, /Ранее вы[^<]*уже создали свой собственный логин для входа[^<]*/i, replaceTagsAndSpaces, html_entity_decode));
	}
	
	var baseurl = getParam(page, null, null, /^(https?:\/\/.*?)\//i);
	if (/PhizIC/.test(html)) {
		return doNewAccountPhysic(html, baseurl);
	} else {
		return doNewAccountEsk(html);
	}
}

function doNewAccountEsk(html) {
	AnyBalance.trace('Entering esk account...');
	var baseurl = 'https://esk.sbrf.ru';
	//self.location.href='/esClient/Default.aspx?Page=1&qs=AuthToken=d80365e0-4bfd-41a1-80a1-b24847ae3e94&i=1'
	var page = getParam(html, null, null, /self\.location\.href\s*=\s*'([^'"]*?AuthToken=[^'"]*)/i);
	if (!page) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по картам (esk). Пожалуйста, обратитесь к разработчикам для исправления ситуации.");
	}
	var token = getParam(page, null, null, /AuthToken=([^&]*)/i);
	//Переходим в лк esk (Типа логинимся автоматически)
	html = AnyBalance.requestGet(baseurl + page);
	//Зачем-то ещё логинимся 
	html = AnyBalance.requestGet(baseurl + '/esClient/_logon/MoveToCards.aspx?AuthToken=' + token + '&i=1&supressNoCacheScript=1');
	//AnyBalance.trace(html);
	if (AnyBalance.getPreferences().type == 'acc')
		throw new AnyBalance.Error('Ваш тип личного кабинета не поддерживает просмотр счетов. Если вам кажется это неправильным, напишите автору провайдера е-мейл.');
	
	readEskCards();
}

function readEskCards() {
	var baseurl = 'https://esk.sbrf.ru';
	//Получаем карты
	var prefs = AnyBalance.getPreferences();
	AnyBalance.trace("Reading card list...");
	var html = AnyBalance.requestGet(baseurl + '/esClient/_s/CardsDepositsAccounts.aspx');
	//AnyBalance.trace(html);
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	var baseFind = 'Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="[^"]{6,}"[^>]*>[^<]*?';
	var reCard = new RegExp('Мои банковские карты[\\s\\S]*?<a\\s[^>]*href="([^"]{6,})"[^>]*>[^<]*?\\*\\*\\*' + lastdigits, 'i');
	var reCardNumber = new RegExp(baseFind + '(\\d+\\*\\*\\*' + lastdigits + ')', 'i');
	var reBalanceContainer = new RegExp(baseFind + '\\*\\*\\*' + lastdigits + '[\\s\\S]*?<td[^>]*>([\\S\\s]*?)<\\/td>', 'i');
	var cardref = getParam(html, null, null, reCard);
	if (!cardref) {
		if (prefs.lastdigits) throw new AnyBalance.Error("Не удаётся найти ссылку на информацию по карте с последними цифрами " + prefs.lastdigits);
		else throw new AnyBalance.Error("Не удаётся найти ни одной карты");
	}
	var result = {success: true};
	
	getParam(html, result, 'cardNumber', reCardNumber);
	getParam(html, result, 'balance', reBalanceContainer, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], reBalanceContainer, replaceTagsAndSpaces, parseCurrencyMy);
	getParam(html, result, '__tariff', reCardNumber, replaceTagsAndSpaces);
	if (AnyBalance.isAvailable('userName', 'cardName', 'till', 'status', 'cash', 'debt', 'minpay', 'electrocash', 'maxcredit')) {
		html = AnyBalance.requestGet(baseurl + '/esClient/_s/' + cardref);
		getParam(html, result, 'userName', /Имя держателя:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalFirstLenttersDecode);
		getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'till', /Срок действия:[\s\S]*?<td[^>]*>\s*по\s*([^<\s]*)/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'cash', /Доступно наличных[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'electrocash', /Доступно для покупок[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'debt', /Сумма задолженности[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'minpay', /Сумма минимального платежа[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'maxcredit', /Лимит кредита[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
	AnyBalance.setResult(result);
}

function doNewAccountPhysic(html, baseurl) {
	AnyBalance.trace('Entering physic account...: ' + baseurl);
	
	if (/confirmTitle/.test(html))
		throw new AnyBalance.Error("Ваш личный кабинет требует одноразовых паролей для входа. Пожалуйста, отмените в настройках кабинета требование одноразовых паролей при входе. Это безопасно: для совершения денежных операций требование одноразового пароля всё равно останется.");
	if (/Откроется справочник регионов, в котором щелкните по названию выбранного региона/.test(html)) {
		//Тупой сбер предлагает обязательно выбрать регион оплаты. Вот навязчивость...
		//Ну просто выберем все регионы
		html = AnyBalance.requestPost(baseurl + '/PhizIC/region.do', {
			id: -1,
			operation: 'button.save'
		});
	}
	var prefs = AnyBalance.getPreferences();
	if (prefs.type == 'acc')
		fetchNewAccountAcc(html, baseurl);
	else if (prefs.type == 'metal_acc')
		fetchNewAccountMetallAcc(html, baseurl);
	else
		fetchNewAccountCard(html, baseurl);
}

function fetchRates(html, result) {
	AnyBalance.trace('Fetching rates...');
	getParam(html, result, 'eurPurch', /"currencyRateName"[^>]*>EUR(?:[^>]*>){2}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'eurSell', /"currencyRateName"[^>]*>EUR(?:[^>]*>){5}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'usdPurch', /"currencyRateName"[^>]*>USD(?:[^>]*>){2}([^<]*)/i, null, parseBalance);
	getParam(html, result, 'usdSell', /"currencyRateName"[^>]*>USD(?:[^>]*>){5}([^<]*)/i, null, parseBalance);
}

function fetchNewThanks(baseurl, result) {
	if (AnyBalance.isAvailable('spasibo')) {
		html = AnyBalance.requestGet(baseurl + '/PhizIC/private/async/loyalty.do');
		
		var href = getParam(html, null, null, /^\s*(https?:\/\/\S*)/i, replaceTagsAndSpaces, html_entity_decode);
		if (!href) {
			AnyBalance.trace('Не удаётся получить ссылку на спасибо от сбербанка: ' + html);
		} else {
			html = AnyBalance.requestGet(href);
			getParam(html, result, 'spasibo', /Баланс:\s*<strong[^>]*>\s*([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		}
	}
}

function fetchNewAccountCard(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	// Теперь только здесь есть курсы валют
	var result = {success: true};
	fetchRates(html, result);
	
	html = AnyBalance.requestGet(baseurl + '/PhizIC/private/cards/list.do');
	var lastdigits = prefs.lastdigits ? prefs.lastdigits.replace(/(\d)/g, '$1\\s*') : '(?:\\d\\s*){3}\\d';
	var baseFind = '<[^>]*class="accountNumber\\b[^"]*">[^<,]*' + lastdigits;
	var reCardId = new RegExp(baseFind + '[\\s\\S]*?<div[^>]+id="card_(\\d+)', 'i');
	//    AnyBalance.trace('Пытаемся найти карту: ' + reCardId);
	var cardId = getParam(html, null, null, reCardId);
	if (!cardId) {
		if (prefs.lastdigits) throw new AnyBalance.Error("Не удаётся идентификатор карты с последними цифрами " + prefs.lastdigits);
		else throw new AnyBalance.Error("Не удаётся найти ни одной карты");
	}
	var reCardNumber = new RegExp('<[^>]*class="accountNumber\\b[^"]*">([^<,]*' + lastdigits + ')[<,]', 'i');
	var reCardTill = new RegExp('<[^>]*class="accountNumber\\b[^"]*">[^<,]*' + lastdigits + ', действует (?:до|по)([^<]*)', 'i');
	var reBalance = new RegExp('<a[^>]+href="[^"]*info.do\\?id=' + cardId + '"[\\s\\S]*?<span[^>]+class="overallAmount\\b[^>]*>([\\s\\S]*?)</span>', 'i');
	
	getParam(html, result, 'balance', reBalance, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cardNumber', reCardNumber, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', reCardNumber, replaceTagsAndSpaces);
	getParam(html, result, 'till', reCardTill, replaceTagsAndSpaces, parseDateWord);
	getParam(html, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], reBalance, replaceTagsAndSpaces, parseCurrencyMy);
	fetchRates(html, result);
	if (AnyBalance.isAvailable('userName', 'cash', 'electrocash', 'minpay', 'minpaydate', 'maxlimit')) {
		html = AnyBalance.requestGet(baseurl + '/PhizIC/private/cards/detail.do?id=' + cardId);
		getParam(html, result, 'userName', /Держатель карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/, replaceTagsAndSpaces, capitalFirstLenttersDecode);
		getParam(html, result, 'cash', /Для снятия наличных:(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'electrocash', /для покупок:(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'minpay', /Обязательный платеж(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'minpaydate', /Обязательный платеж(?:[^>]*>){7}([\s\S]*?)<\/div>/, replaceTagsAndSpaces, parseDateWord);
		getParam(html, result, 'maxlimit', /Кредитный лимит(?:[^>]*>){5}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
	fetchNewThanks(baseurl, result);
	if (AnyBalance.isAvailable('lastPurchSum') || AnyBalance.isAvailable('lastPurchPlace') || AnyBalance.isAvailable('lastPurchDate')) {
		html = AnyBalance.requestGet(baseurl + '/PhizIC/private/cards/info.do?id=' + cardId);
		var tr = getParam(html, null, null, /<tr[^>]*class="ListLine0"[^>]*>([\S\s]*?)<\/tr>/i);
		if (tr) {
			getParam(tr, result, 'lastPurchDate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSmallDate);
			var sum = getParam(tr, result, 'lastPurchSum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
			getParam(tr, result, 'lastPurchPlace', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		} else {
			AnyBalance.trace('Не удалось найти последнюю операцию.');
		}
	}
	AnyBalance.setResult(result);
}

function parseDateForWord(str){
	AnyBalance.trace('Parsing date from ' + str);
	var date = /(?:mon|tue|wed|Thu|fri|sat|sun)\s*([\w]*)\s*(\d+)[\s\S]*?(\d{4})/i.exec(str);
	if(!date)
		AnyBalance.trace('Failed to parse date from ' + str);
	else {
		return parseDateWord(date[2] + ' ' + date[1] + ' ' + date[3]);
	}
}

function fetchNewAccountMetallAcc(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	// Теперь только здесь есть курсы валют
	var result = {success: true};
	fetchRates(html, result);
	
	html = AnyBalance.requestGet(baseurl + '/PhizIC/private/ima/list.do');
	var lastdigits = prefs.lastdigits ? prefs.lastdigits.replace(/(\d)/g, '$1\\s*') : '(?:\\d\\s*){3}\\d';
	var baseFind = 'class="productNumber\\b[^"]*">[^<]*' + lastdigits + '\\s*<';
	var reCardId = new RegExp(baseFind + '[\\s\\S]*?account_(\\d+)', 'i');
	
	AnyBalance.trace('Пытаемся найти счет: ' + reCardId);
	
	var cardId = getParam(html, null, null, reCardId);
	if (!cardId) {
		if (prefs.lastdigits) throw new AnyBalance.Error("Не удаётся идентификатор счета с последними цифрами " + prefs.lastdigits);
		else throw new AnyBalance.Error("Не удаётся найти ни одного счета");
	}
	
	html = AnyBalance.requestGet(baseurl + '/PhizIC/private/ima/info.do?id=' + cardId);
	
	getParam(html, result, '__tariff', /ProductTitle([^>]*>){2}/i, replaceTagsAndSpaces);
	getParam(html, result, 'weight', /detailAmount([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['weight_units', 'weight'], /detailAmount([^>]*>){2}/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'balance', /По курсу покупки Банка([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, ['currency', 'balance'], /По курсу покупки Банка([^>]*>){2}/i, replaceTagsAndSpaces, parseCurrencyMy);
	getParam(html, result, 'cardNumber', /productNumber"([^>]*>){2}/i, [replaceTagsAndSpaces, /\D/g, '']);
	
	AnyBalance.setResult(result);
}

function fetchNewAccountAcc(html, baseurl) {
	var prefs = AnyBalance.getPreferences();
	// Теперь только здесь есть курсы валют
	var result = {success: true};
	fetchRates(html, result);
	
	html = AnyBalance.requestGet(baseurl + '/PhizIC/private/accounts/list.do');
	var lastdigits = prefs.lastdigits ? prefs.lastdigits.replace(/(\d)/g, '$1\\s*') : '(?:\\d\\s*){3}\\d';
	// class="productNumber\b[^"]*">[^<]*
	var baseFind = 'class="productNumber\\b[^"]*">[^<]*' + lastdigits + '[^<]*<';
	// [\s\S]*?onclick\s*=\s*"[^"]*(?:operations|info)[^']*'(\d+)
	var reCardId = new RegExp(baseFind + '[\\s\\S]*?<div[^>]+id="account_(\\d+)', 'i');
	
	AnyBalance.trace('Пытаемся найти счет: ' + reCardId);
	
	var cardId = getParam(html, null, null, reCardId);
	// бывает что номера счета нет на странице со счетами, придется идти внутрь
	if (!cardId) {
		AnyBalance.trace('Не нашли счет стандартным способом, пробудем альтернативным...');
		var accountsWithoutIDs = sumParam(html, null, null, /<div class="productTitle">(?:[^>]*>){200,300}\s*<div class="productNumberBlock">\s*<\/div>/ig);
		AnyBalance.trace('Нашли счета без номеров: ' + accountsWithoutIDs.length);
		// Проваливаемся
		for(var i = 0; i < accountsWithoutIDs.length; i++) {
			cardId = getParam(accountsWithoutIDs[i], null, null, /id=(\d+)/);
			AnyBalance.trace('Пробуем найти номер счета у id: ' + cardId);
			html = AnyBalance.requestGet(baseurl + '/PhizIC/private/accounts/info.do?id=' + cardId);
			
			var accountNum = getParam(html, null, null, /Номер счета[^:]*:(?:[^>]*>){3}([\s\d]{20,40})/i, [/\D/g, '']);
			AnyBalance.trace('Номер счета: ' + accountNum);
			
			if(endsWith(accountNum, prefs.lastdigits)) {
				AnyBalance.trace('Номер счета: ' + accountNum + ' совпадает с нужным нам ' + prefs.lastdigits);
				break;
			}
		}
		// Теперь получим баланс
		getParam(html, result, 'balance', /Сумма вклада:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], /Сумма вклада:(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseCurrency);
		getParam(accountNum, result, '__tariff');
	}
	// Теперь проверяем ID
	if (!cardId) {
		throw new AnyBalance.Error('Не удаётся найти ' + (prefs.lastdigits ? 'идентификатор счета с последними цифрами ' + prefs.lastdigits: 'ни одного счета!'));
	}
	var reCardNumber = new RegExp('class="productNumber\\b[^"]*">([^<]*' + lastdigits + ')<', 'i');
	var reBalance = new RegExp('<a[^>]+href="[^"]*operations.do\\?id=' + cardId + '"[\\s\\S]*?<span[^>]+class="overallAmount\\b[^>]*>([\\s\\S]*?)</span>', 'i');
	
	getParam(html, result, 'balance', reBalance, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cardNumber', reCardNumber, [replaceTagsAndSpaces, /\D/, '']);
	getParam(html, result, '__tariff', new RegExp("\\?id=" + cardId + "[\\s\\S]*?<span[^>]+class=\"mainProductTitle\"[^>]*>([\\s\\S]*?)<\\/span>", "i"), replaceTagsAndSpaces);
	getParam(html, result, ['currency', 'balance', 'cash', 'electrocash', 'debt', 'maxlimit'], reBalance, replaceTagsAndSpaces, parseCurrencyMy);
	
	if (AnyBalance.isAvailable('till', 'cash')) {
		html = AnyBalance.requestGet(baseurl + '/PhizIC/private/accounts/info.do?id=' + cardId);
		getParam(html, result, 'till', /Дата окончания срока действия:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'cash', /Максимальная сумма снятия:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	}
	fetchNewThanks(baseurl, result);
	if (AnyBalance.isAvailable('lastPurchSum') || AnyBalance.isAvailable('lastPurchPlace') || AnyBalance.isAvailable('lastPurchDate')) {
		html = AnyBalance.requestGet(baseurl + '/PhizIC/private/accounts/operations.do?id=' + cardId);
		var tr = getParam(html, null, null, /<tr[^>]*class="ListLine0"[^>]*>([\S\s]*?)<\/tr>/i);
		if (tr) {
			getParam(tr, result, 'lastPurchDate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseSmallDate);
			if (AnyBalance.isAvailable('lastPurchSum')) {
				var credit = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				var debet = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
				result.lastPurchSum = credit ? '+' + credit : '-' + debet;
			}
			getParam(tr, result, 'lastPurchPlace', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		} else {
			AnyBalance.trace('Не удалось найти последнюю операцию.');
		}
	}
	AnyBalance.setResult(result);
}