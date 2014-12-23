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
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if (prefs.cabinet == 'new') {
		doNewCabinet(prefs);
	} else {
		doOldCabinet(prefs);
	}
}

function parseCurrencyAndMy(cur) {
	return parseCurrencyMy(parseCurrency(cur));
}

function parseCurrencyMy(cur) {
	var tbl = {
		'Российский рубль': 'руб',
		'Доллар США': '$',
		'Евро': '€'
	}
	if (tbl[cur]) return tbl[cur];
	return cur;
}

function getAuthKey(html) {
	return nvl(getParam(html, null, null, /value="([^"]+)[^<]*id="authkey"/i), '').substr(0, 32).toLowerCase();
}

function getP_instance(html) {
	return getParam(html, null, null, /p_instance[^>]*value=['"]([^'"]+)/i);
}

function getFlowID(html) {
	return getParam(html, null, null, /value="([^"]+)[^<]*pFlowId/i);
}

function getFlowStepID(html) {
	return getParam(html, null, null, /p_flow_step_id[^>]*value="([^"]+)/i);
}

function nvl(a, v, vl, vr) {
	return a != undefined && a != null ? (vl != undefined && vl != null ? vl : '') + a + (vr != undefined && vr != null ? vr : '') : (v != undefined && v != null ? v : '')
}

function getRsaN(html) {
	return getParam(html, null, null, /rsa_N\s*=\s*['"]([^'"]+)/i);
}

function getRsaE(html) {
	return getParam(html, null, null, /rsa_E\s*=\s*['"]([^'"]+)/i);
}

function doNewCabinet(prefs) {
	var baseurl = 'https://i.bankuralsib.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	var html = AnyBalance.requestGet(baseurl + '', g_headers);
	
    var authkey = getAuthKey(html);
	var rsa_N = getRsaN(html);
	var rsa_E = getRsaE(html);
	var password = prefs.password;
	var passwordMD5 = '';
	var p_instance = getP_instance(html);
	
    if (typeof(CryptoJS) != 'undefined' && authkey) {
    	passwordMD5 = CryptoJS.MD5(password).toString(CryptoJS.enc.Hex).substr(0, 30);
    	passwordMD5 = ':' + CryptoJS.MD5(authkey + ':' + passwordMD5).toString(CryptoJS.enc.Hex);
    }
    password = CryptoJS.SHA1(password).toString(CryptoJS.enc.Hex);
    password = CryptoJS.SHA1(authkey + ':' + password).toString(CryptoJS.enc.Hex);
	
    if (rsa_N && rsa_E && typeof(RSAKey) != undefined) {
    	var rsa = new RSAKey();
    	rsa.setPublic(rsa_N, rsa_E);
    	authkey = authkey + ':' + rsa.encrypt(password + passwordMD5).toLowerCase();
    	var l = password.length;
    	password = '';
    	for (var i = 0; i < l; i++)
			password += '*';
    }
	html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', {
		p_request: 'APPLICATION_PROCESS=AUTHENTICATE',
		p_flow_id: getFlowID(html),
		p_flow_step_id: getFlowStepID(html),
		p_instance: p_instance,
		x01: 'AUTH#PASSWORD',
		x02: prefs.login,
		x03: password,
		x04: authkey,
		x05: 'N',
		x06: '4' // может понадобится переделать
	}, addHeaders({
		Referer: baseurl
	}));
	
    if (!/Авторизация успешна/i.test(html)) {
    	var error = sumParam(html, null, null, /"err"[^"]+"([^"]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    	if (error) 
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		if(/истёк срок действия пароля/i.test(html)) 
			throw new AnyBalance.Error('Истёк срок действия пароля. Смените пароль через браузер, а затем введите его в настройки провайдера.', null, true);
		
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	
	var loginVar = getParam(html, null, null, /afterLogin\(([^)]+)/i);
	if(!loginVar)
		throw new AnyBalance.Error('Не удалось найти ссылку на страницу с данными, сайт изменен?');
	
	var url = baseurl + 'f?p=10:MAIN:' + loginVar;
	html = AnyBalance.requestGet(url, g_headers);
	
	// Теперь надо пнуть базу, чтобы обновилось все
	var P_instance = getP_instance(html);
	var FlowID = getFlowID(html);
	var FlowStepID = getFlowStepID(html);
	
	var requests = ['AFTER_AUTH', 'APPLICATION_PROCESS=GET_MAIL_COUNT', 'APPLICATION_PROCESS=GET_CRM', 'APPLICATION_PROCESS=LoadPresale', ''];
	
	// Запросы посылаются в цикле :)
	for(var i = 0; i < requests.length; i++) {
		var currentRequest = requests[i];
		
		html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', {
			'p_request':currentRequest,
			'p_instance':getP_instance(html) || P_instance,
			p_flow_id:getFlowID(html) || FlowID,
			p_flow_step_id:getFlowStepID(html) || FlowStepID,		
		}, addHeaders({Referer: url, 'X-Requested-With': 'XMLHttpRequest'}));		
	}
	// Все, теперь можно разбирать данные
    if(prefs.type == 'acc')
		fetchAcc(html, baseurl, prefs, url);
	else
		fetchCard(html, baseurl, prefs);
}

function fetchCard(html, baseurl, prefs) {
	html = AnyBalance.requestGet(baseurl + getParam(html, null, null, /href="([^"]+CARDS[^"]+)[^>]*>\s*Карты\s*</i), g_headers);
	
	var lastdigits = prefs.cardnum ? prefs.cardnum : '\\d{4}';
	
	// <li[^>]*class(?:[^>]*>){25,30}\d{4}[\-x]{8,}6445(?:[^>]*>){3,6}\s*</
	var reCard = new RegExp('<li[^>]*class(?:[^>]*>){23,30}\\d{4}[\\-x]{8,}' + lastdigits + '(?:[^>]*>){1,6}\\s*</', 'i');
	
	var tr = getParam(html, null, null, reCard);
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.cardnum ? 'карту с последними цифрами '+prefs.cardnum : 'ни одной карты!'));
	
	var result = {success: true};
	
	getParam(tr, result, '__tariff', /(\d{4}[-x]{8,}\d{4})/i, replaceTagsAndSpaces);
	getParam(result.__tariff, result, 'cardNumber');
	getParam(tr, result, 'userName', /"profile-name"(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'balance', /"sum"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance'], /"sum"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseCurrencyAndMy);
	getParam(tr, result, 'till', /\d{4}[-x]{8,}\d{4}[^<]*?(\d{1,2}\/\d{1,2})/i, [replaceTagsAndSpaces, /(.*)/i, '01/$1'], parseDate);
	
	// Дополнительная инфа по картам.
	if (isAvailable(['status', 'accnum', 'acctype', 'blocked', 'limit', 'grace_till', 'grace_pay'])) {
		var href = getParam(tr, null, null, /<a\s*href="([^"]*)/i);
		if(href) {
			html = AnyBalance.requestGet(baseurl + href, g_headers);
			
			getParam(html, result, 'status', /Состояние карты(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'accnum', /Карточный счет(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'acctype', /Тип карты(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'blocked', /Заблокировано(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'limit', />Кредитный лимит<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'grace_till', /погасить в период:[^-]+([\s\S]*?)<\//i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'grace_pay', /для выполнения условий льготного периода кредитования[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		} else {
			AnyBalance.trace('Не нашли ссылку на дополнительную информацию по картам, возможно, сайт изменился?');
		}
	}
	AnyBalance.setResult(result);
}

function fetchAcc(html, baseurl, prefs, url) {
	var lastdigits = prefs.cardnum ? prefs.cardnum : '\\d{4}';
	// <div[^>]*desc(?:[^>]*>){20,22}\s*\d{14,}6688(?:[^>]*>){1}\s*</div>
	var reCard = new RegExp('<div[^>]*desc(?:[^>]*>){20,22}\\s*\\d{14,}' + lastdigits + '(?:[^>]*>){1}\\s*</div>', 'i');
	
	var tr = getParam(html, null, null, reCard);
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.cardnum ? 'счет с последними цифрами '+prefs.cardnum : 'ни одного счета!'));
	
	var result = {success: true};
	
	getParam(tr, result, '__tariff', /\d{20}/i, replaceTagsAndSpaces);
	getParam(result.__tariff, result, 'accnum');
	getParam(tr, result, 'acctype', /ITEM_ID[^>]*>([^<]+)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'total', /ITEM_ID(?:[^>]*>){8}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance', 'total'], /ITEM_ID(?:[^>]*>){10}([^<]+)/i, replaceTagsAndSpaces, parseCurrencyMy);
	
	// Дополнительная инфа.
	if (isAvailable(['balance', 'blocked'])) {
		var href = getParam(tr, null, null, /href="(f\?p=[^"]+)"/i);
		if(href) {
			html = AnyBalance.requestGet(baseurl + href, g_headers);
			
			getParam(html, result, 'blocked', /Заблокировано по операциям с картой([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
			getParam(html, result, 'balance', /Доступно для операций с картами([^>]*>){5}/i, replaceTagsAndSpaces, parseBalance);
			
			/*getParam(html, result, 'status', /Состояние карты(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'accnum', /Карточный счет(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'acctype', /Тип карты(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);*/
		} else {
			AnyBalance.trace('Не нашли ссылку на дополнительную информацию по картам, возможно, сайт изменился?');
		}
	}
	AnyBalance.setResult(result);
}

var g_headersOld = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function do_encrypt(password, key, salt) {
	var n = key;
	var e = "3";
	var fill = "********************"
	var rsa = new RSAKey();
	rsa.setPublic(n, e);
	var res = rsa.encrypt(Base64.encode(password + salt));
        var ret = {};
	if(res) {
		ret.rsa = res;
		ret.len = fill.substr(0,password.length);
	}
	return ret;
}

function doOldCabinet(prefs) {
    var baseurl = "https://client.uralsibbank.ru";
    
    var html = AnyBalance.requestGet(baseurl, g_headersOld);
    var key = getParam(html, null, null, /var n\s*=\s*"([0-9a-f]{128})"/i);
    var salt = getParam(html, null, null, /document.LoginForm.CustAuth.value\s*\+\s*"([^"]*)"/i);
    if(!key)
        throw new AnyBalance.Error("Не найден RSA ключ! Обратитесь к автору провайдера.");
    if(!salt)
        throw new AnyBalance.Error("Не найден параметр шифрования! Обратитесь к автору провайдера.");

    var pwdEncrypted = do_encrypt(prefs.password || '', key, salt);
    html = AnyBalance.requestPost(baseurl + '/login.asp', {
        RSAAuth:pwdEncrypted.rsa,
        CustIdent:prefs.login,
        CustAuth:pwdEncrypted.len,
        CustomerLogin:"Войти в систему"
    }, g_headersOld);
	
	if(/Регистрация в новой версии системы(?:[^>]*>)?\s*.УРАЛСИБ/i.test(html)) {
		AnyBalance.trace('Необходимо изменить настройки провайдера, выберите Версия интернет-банка: Новый, не забудьте проверить правильность ввода логина и пароля от нового интернет-банка. А пока мы попробуем войти в новыую версии системы самостоятельно...');
		doNewCabinet(prefs);
		return;
	}
	
	if(/Пароль верный, но время его действия скоро истекает/i.test(html)) {
		AnyBalance.trace('Пароль верный, но время его действия скоро истекает, попробуем войти...');
		var href = getParam(html, null, null, /href="([^"]*)"[^>]*>\s*Продолжить работу без смены пароля/i);
		html = AnyBalance.requestGet(baseurl + '/' + href, g_headersOld);
	} else if(!/login\.asp\?logout/i.test(html)) {
        var error = getParam(html, null, null, /^(?:[\s\S](?!<NOSCRIPT))*?<p[^>]*class="errorb"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		if(/истёк срок действия пароля/i.test(html)) 
			throw new AnyBalance.Error('Истёк срок действия пароля. Смените пароль через браузер, а затем введите его в настройки провайдера.', null, true);

		AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }
	
    var result = {success: true};
	
    if(AnyBalance.isAvailable('all')){
        var found = [];
        html.replace(/<a[^>]+href="account_retail\.asp\?AccID=(\d+)"[^>]*>([\s\S]*?)<\/a>/ig, function(str, id, name){
            if(/^0+$/.test(id))
                return str; //Неправильный id
            found[found.length] = getParam(name, null, null, null, replaceTagsAndSpaces) + ' (ID: ' + id + ')';
            return str;
        });
        result.all = found.join('\n');
    }

    var accId = prefs.cardnum || getParam(html, null, null, /<a[^>]+href="account_retail\.asp\?AccID=(\d+)"/i);
    if(!accId || (!prefs.cardnum && /^0+$/.test(accId)))
        throw new AnyBalance.Error("У вас нет ни одного счета");

    var activeAccId = getParam(html, null, null, /<a[^>]+href="account_retail\.asp\?AccID=(\d+)"[^>]*>\s*<img/i); //Активный аккаунт
    if(activeAccId != accId)
        html = AnyBalance.requestGet(baseurl + '/account_retail.asp?AccID=' + accId);

    //Если это сообщение про IP, то игнорируем его
    var error = getParam(html, null, null, /<p[^>]+class="errorb"[^>]*>(?:[\s\S](?!IP-адрес))*?<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error) 
        throw new AnyBalance.Error(error + ' (ID: ' + accId + ')');

    getParam(html, result, '__tariff', /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Доступно для операций[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'total', /Всего на счете[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'grace_pay', /С льготным периодом[\s\S]*?Итого[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'grace_till', /Необходимо погасить в срок до[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'limit_left', /Неиспользованная часть кредитного лимита[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'debt', /Текущая задолженность[\s\S]*?Итого[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'blocked', /Заблокировано по авторизованным транзакциям[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Валюта счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrencyMy);
    getParam(html, result, 'acctype', /Тип счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'accnum', /Номер счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'status', /Статус счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'limit', />Кредитный лимит<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accnum_pay', /Счет для погашения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}