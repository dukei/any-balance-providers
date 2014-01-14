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

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(prefs.cabinet == 'new') {
		doNewCabinet(prefs);
	} else {
		doOldCabinet(prefs);
	}
}

function getAuthKey(html) {
	return nvl(getParam(html, null, null, /value="([^"]+)[^<]*id="authkey"/i), '').substr(0, 32).toLowerCase();
}

function getP_instance(html) {
	return getParam(html, null, null, /p_instance[^>]*value=['"]([^'"]+)/i);
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
	
    if (typeof (CryptoJS) != 'undefined' && authkey) {
		passwordMD5 = CryptoJS.MD5(password).toString(CryptoJS.enc.Hex).substr(0, 30);
		passwordMD5 = ':' + CryptoJS.MD5(authkey + ':' + passwordMD5).toString(CryptoJS.enc.Hex);
	}
	password = CryptoJS.SHA1(password).toString(CryptoJS.enc.Hex);
	password = CryptoJS.SHA1(authkey + ':' + password).toString(CryptoJS.enc.Hex);
    
    if (rsa_N && rsa_E && typeof (RSAKey) != undefined) {
        var rsa = new RSAKey();
        rsa.setPublic(rsa_N, rsa_E);
        authkey = authkey + ':' + rsa.encrypt(password + passwordMD5).toLowerCase();
        var l = password.length;
        password = '';
        for (var i = 0; i < l; i++)
			password += '*';
    }
	
	html = AnyBalance.requestPost(baseurl + 'wwv_flow.show', {
		p_request:'APPLICATION_PROCESS=AUTHENTICATE',
		p_flow_id:'10',
		p_flow_step_id:'1000',
		p_instance:p_instance,
		x01:'AUTH#PASSWORD',
		x02:prefs.login,
		x03:password,
		x04:authkey,
		x05:'N',
		x06:'4' // может понадобится переделать
	}, addHeaders({Referer: baseurl + ''}));

	if (!/Авторизация успешна/i.test(html)) {
		var error = sumParam(html, null, null, /"err"[^"]+"([^"]+)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
		if (error && /Неверный логин или пароль/i.test(error))
			throw new AnyBalance.Error(error, null, true);
		if (error)
			throw new AnyBalance.Error(error);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var loginVar = getParam(html, null, null, /afterLogin\(([^)]+)/i);
	if(!loginVar)
		throw new AnyBalance.Error('Не удалось найти ссылку на страницу с данными, сайт изменен?');
	
	html = AnyBalance.requestGet(baseurl + 'f?p=10:MAIN:' + loginVar, g_headers);
	// Все, теперь можно разбирать данные
    if(prefs.type == 'acc')
        {}//fetchAcc(html, baseurl);
    else
        fetchCard(html, baseurl, prefs);
}

function fetchCard(html, baseurl, prefs) {
	html = AnyBalance.requestGet(baseurl + getParam(html, null, null, /href="([^"]+CARDS[^"]+)/i), g_headers);
	
	var lastdigits = prefs.lastdigits ? prefs.lastdigits : '\\d{4}';
	
	// <li[^>]*class(?:[^>]*>){25}\d{4}[-x]{8,}5821(?:[^>]*>){5}\s*</li>
	var reCard = new RegExp('<li[^>]*class(?:[^>]*>){25}\\d{4}[-x]{8,}' + lastdigits + '(?:[^>]*>){5}\\s*</li>', 'i');
	
	var tr = getParam(html, null, null, reCard);
	if(!tr)
		throw new AnyBalance.Error('Не удалось найти ' + (prefs.lastdigits ? 'карту с последними цифрами '+prefs.lastdigits : 'ни одной карты!'));
	
	var result = {success: true};
	
	getParam(tr, result, '__tariff', /(\d{4}[-x]{8,}\d{4})/i, replaceTagsAndSpaces);
	getParam(result.__tariff, result, 'cardNumber');
	getParam(tr, result, 'userName', /"profile-name"(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces);
	getParam(tr, result, 'balance', /"sum"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, ['currency', 'balance'], /"sum"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'till', /\d{4}[-x]{8,}\d{4}[^<]*?(\d{1,2}\/\d{1,2})/i, [replaceTagsAndSpaces, /(.*)/i, '01/$1'], parseDate);
	
	// Дополнительная инфа по картам.
	if (isAvailable(['status', 'accnum', 'acctype'])) {
		var href = getParam(tr, null, null, /<a\s*href="([^"]*)/i);
		if(href) {
			html = AnyBalance.requestGet(baseurl + href, g_headers);
			
			getParam(tr, result, 'status', /Состояние карты(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'accnum', /Карточный счет(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
			getParam(html, result, 'acctype', /Тип карты(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces);
		} else {
			AnyBalance.trace('Не нашли ссылку на дополнительную информацию по картам, возможно, сайт изменился?');
		}
	}
	AnyBalance.setResult(result);
}

function fetchAcc(html, baseurl) {
	throw new AnyBalance.Error("Отображение информации по счетам пока не поддерживается, свяжитесь с разработчиком для исправления ситуации.");
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

    if(!/login\.asp\?logout/i.test(html)){
        var error = getParam(html, null, null, /^(?:[\s\S](?!<NOSCRIPT))*?<p[^>]*class="errorb"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
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
    getParam(html, result, 'currency', /Валюта счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'acctype', /Тип счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'accnum', /Номер счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'status', /Статус счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'limit', />Кредитный лимит<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accnum_pay', /Счет для погашения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}