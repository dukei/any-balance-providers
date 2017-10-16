﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.password, 'Введите пароль!');
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(!/^\s+|\s+$/i.test(prefs.login), 'Не верный формат логина, необходимо вводить логин без пробелов.');

    var region = prefs.region || 'moscow';
    var regionFunc = g_regions[region] || g_regions.moscow;

    try {
    	AnyBalance.trace("Entering region: " + region);
        regionFunc();
    } catch(e) {
        if (!e.fatal) {
            AnyBalance.trace('Старый логин не сработал (' + e.message + '), пробуем на mycdma.skylink');
            mainMySkylink(prefs);
        } else {
            throw e;
        }
    }
}

function mainMySkylink(){
	var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('utf-8');
    var baseurl = 'https://mycdma.skylink.ru/';
    var headers = {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Connection': 'keep-alive',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
    };

    var html = AnyBalance.requestGet(baseurl, headers);

    if(!html || AnyBalance.getLastStatusCode() > 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var loginForm = getParam(html, null, null, /<form[^>]*id="modal-login-form"[^>]*>[\s\S]*?<\/form>/i);
    if(!loginForm)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(loginForm, function(params, str, name, value) {
        if (name == 'j_username') 
            return prefs.login;
        else if (name == 'j_password')
            return prefs.password;
        return value;
    });

    var res = AnyBalance.requestPost(baseurl + 'public/security/check', params, addHeaders({
        Referer: baseurl,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'application/json, text/javascript, */*; q=0.01'
    }, headers));

    var json = getJson(res);

    if(!json || !json.success){
        AnyBalance.trace(JSON.stringify(json));
        throw new AnyBalance.Error(json.error, null, /Пароль неправильный|/i.test(json.error));
    }

    html = AnyBalance.requestGet(baseurl + json.targetUrl.replace(/^\//, ''), headers);

    var result = {success: true};

    getParam(html, result, 'userName', /top-profile-subscriber-name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тариф\s*<\/h2>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces);

    if(isAvailable('balance')){
        var tokenName = getParam(html, null, null, /var data\s*=\s*{\s*([^:]+)/i, replaceTagsAndSpaces);
        var tokenValue = getParam(html, null, null, /var data\s*=\s*{\s*[^:]+:\s['"]([^'"]+)/i, replaceTagsAndSpaces);
        if(!tokenName || !tokenValue)
            throw new AnyBalance.Error('Не удалось найти токен для получения баланса. Сайт изменен?');

        params = {
            isBalanceRefresh: true
        };
        params[tokenName] = tokenValue;

        res = AnyBalance.requestPost(baseurl + 'balance/json', params, addHeaders({
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json, text/javascript, */*; q=0.01'
        }, headers));

        json = getJson(res);

        getParam(json.balance, result, 'balance', null, replaceTagsAndSpaces, parseBalance);
    }

    AnyBalance.setResult(result);
}

function reqSkypoint(url, action, soapAction) {
	return AnyBalance.requestPost(url, action, addHeaders({
		SOAPAction: soapAction || 'http://www.skylink.ru/UWS/InvokeMethod21',
		Expect: '100-continue',
	}));	
}

function mainSkyBalance(prefs) {
	var headers = {
		'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; MS Web Services Client Protocol 2.0.50727.5477)',
		SOAPAction: "http://ws3.Skypoint.ru/Execute1",
		Expect: '100-continue',
		'Content-Type': 'text/xml; charset=utf-8',
	};
	
	var html = AnyBalance.requestPost('https://ws3.skypoint.ru/wsskypoint3.asmx', '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><Execute1 xmlns="http://ws3.Skypoint.ru/"><dn>' + prefs.login + '</dn><pwd>' + prefs.password + '</pwd><QueryName>BS_Balance_Get</QueryName><QueryParam>i_ExtParam=$SUBSYSTEM=SkyBalance $VERSION=2.0.0.1</QueryParam></Execute1></soap:Body></soap:Envelope>', headers);
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /<BALANCE>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}

function mainSkyPoint(prefs) {
	
	var hash = CryptoJS.SHA256(prefs.password);
	var pass = hash.toString(CryptoJS.enc.Base64);
	
	var html = reqSkypoint('https://uws.skypoint.ru/sc/sc.asmx',
	'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><Verify1 xmlns="http://www.skylink.ru/SC"><phone>'+prefs.login+'</phone><password>'+pass+'</password><users /></Verify1></soap:Body></soap:Envelope>',
	'http://www.skylink.ru/SC/Verify1');

	if (!/Verify1Result[^>]*Value\s*=\s*"\s*True/i.test(html)) {
		var error = getParam(html, null, null, /Message="([^"]*)/i, replaceTagsAndSpaces);
		if(/No connection could be made because the target machine actively refused/i.test(error)) {
			AnyBalance.trace('SkyPoint временно не работает, попробуем войти в SkyBalance...');
			mainSkyBalance(prefs);
			return;
		}
		if (error)
			throw new AnyBalance.Error(error, null, /Неверн.*?(логин|пароль)/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	html = reqSkypoint('https://uws.skypoint.ru/uws.asmx',
	'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><InvokeMethod21 xmlns="http://www.skylink.ru/UWS"><dn>'+prefs.login+'</dn><pwd>'+pass+'</pwd><guid>f1e07de2-2fc5-4beb-bf9c-b997124658a4</guid><Parameters>I_DN='+prefs.login+',i_ExtParam=$SUBSYSTEM=WindowsSkyPoint</Parameters><Delimiter>,</Delimiter></InvokeMethod21></soap:Body></soap:Envelope>');
	getParam(html, result, '__tariff', /<TARIFF_PLAN>([^<]+)/i, replaceTagsAndSpaces);
	
	if(isAvailable('balance')) {
		html = reqSkypoint('https://uws.skypoint.ru/uws.asmx',
		'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><InvokeMethod21 xmlns="http://www.skylink.ru/UWS"><dn>'+prefs.login+'</dn><pwd>'+pass+'</pwd><guid>44e7a309-b54d-4cfb-b169-efe06fdd9f35</guid><Parameters>I_DN='+prefs.login+',i_ExtParam=$SUBSYSTEM=WindowsSkyPoint</Parameters><Delimiter>,</Delimiter></InvokeMethod21></soap:Body></soap:Envelope>');
		
		getParam(html, result, 'balance', /<BALANCE>([^<]+)/i, replaceTagsAndSpaces, parseBalance);		
	}
	if(isAvailable('userNum')) {
		html = reqSkypoint('https://uws.skypoint.ru/uws.asmx',
		'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><InvokeMethod21 xmlns="http://www.skylink.ru/UWS"><dn>'+prefs.login+'</dn><pwd>'+pass+'</pwd><guid>ff644d4c-0dc5-4687-a481-868dc87a685c</guid><Parameters>I_DN='+prefs.login+',i_ExtParam=$SUBSYSTEM=WindowsSkyPoint</Parameters><Delimiter>,</Delimiter></InvokeMethod21></soap:Body></soap:Envelope>');
		
		getParam(html, result, 'userNum', /<ACCOUNT_ID>([^<]+)/i, replaceTagsAndSpaces);		
	}
	if(isAvailable('userName')) {
		html = reqSkypoint('https://uws.skypoint.ru/uws.asmx',
		'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><InvokeMethod21 xmlns="http://www.skylink.ru/UWS"><dn>'+prefs.login+'</dn><pwd>'+pass+'</pwd><guid>6078690c-024d-4a32-8789-84c976adf62c</guid><Parameters>I_DN='+prefs.login+',i_ExtParam=$SUBSYSTEM=WindowsSkyPoint</Parameters><Delimiter>,</Delimiter></InvokeMethod21></soap:Body></soap:Envelope>');

		getParam(html, result, 'userName', /<CLIENT_NAME>([^<]+)/i, replaceTagsAndSpaces);
	}
	
	AnyBalance.setResult(result);
}

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

function parseBalanceRK(_text) {
    var text = _text.replace(/\s+/g, '');
    var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceFloat, parseFloat) || 0;
    var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceFloat, parseFloat) || 0;
    var val = rub+kop/100;
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
    return val;
}

var g_regions = {
    altai: mainUln,
    vladimir: mainUln,
    volgograd: mainUln,
    vologda: mainSpb,
    voronezh: mainUln,
    ekt: mainUln,
    kaliningrad: mainSpb,
    karel: mainSpb,
    kemerovo: mainUln,
    kirov: mainUln,
    murmansk: mainSpb,
    nnov: mainUln,
    vnov: mainSpb,
    nsk: mainUln,
    omsk: mainUln,
    pskov: mainSpb,
    rostov: mainUln,
    moscow: mainSkylinkTele2,
    kaluga: mainUln,
    uln: mainUln,
    kuban: mainKuban,
    spb: mainSpb,
    ryaz: mainRyaz,
	izhevsk: mainUln
};

function mainMoscow(){
	var prefs = AnyBalance.getPreferences();
	try {
		throw new AnyBalance.Error('SkyPoint, похоже, давно мертв, пропускаем его...');
	    mainSkyPoint(prefs);
    } catch(exc) {
        if (exc.fatal) {
            throw exc;
        } else {
            mainMoscowSP(prefs);
        }
    }
}

function mainMoscowSP(){
	var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.skypoint.ru";
    AnyBalance.setDefaultCharset('utf-8');

    var headers = {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Connection':'keep-alive',
        'Referer': baseurl,
    	"User-Agent":'Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0'
    };



    var html = AnyBalance.requestGet(baseurl + '/Account/Login.aspx?ReturnUrl=%2f', headers);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);
    
    var params = {
        __EVENTTARGET:'',
	__EVENTARGUMENT:'',
	__VIEWSTATE:viewstate,
	__EVENTVALIDATION:eventvalidation,
	ctl00$MainContent$txtUserName:prefs.login,
	ctl00$MainContent$WatermarContactPhone_ClientState:'',
	ctl00$MainContent$txtPassword:prefs.password,
        ctl00$MainContent$ctl00: 'Войти'
    };
    
    if (/ctl00\$MainContent\$txt_captcha/i.test(html)) {
        var captchaImage = AnyBalance.requestGet(baseurl + '/account/hcaptcha.ashx', headers);
        var captchaCode = AnyBalance.retrieveCode('Введите проверочный код', captchaImage);
        params['ctl00$MainContent$txt_captcha'] = captchaCode;
    }
    

    html = AnyBalance.requestPost(baseurl + '/Account/Login.aspx?ReturnUrl=%2f', params, headers);

    if(!/ctl00\$b[nt]{2}Login/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="errorPinkMessage"(?:[^>](?!display:none|visibility))*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        if(error) {
            throw new AnyBalance.Error(error, false, /Неверный.*?(?:номер|пароль)|Номер\s+не\s+зарегистрирован/i.test(error));
        }
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен или неправильный регион?');
    }

    //Надо проверить, действительно ли нас пустили в кабинет, или просто перенаправили куда-то в другой регион
    //Но проверить не могу, нет у меня учетных данных...
    //var login_marker = getParam(html, null, null, /(...)/i);
    //if(!login_marker)
    //    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный регион?");

    var result = {success: true};

    getParam(html, result, 'userName', /<span[^>]+id="txtLoginName"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, 'userNum', /<span[^>]+id="ucAbonentInfo_lblLitsevoySchet"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс лицевого счёта[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<span[^>]+id="ucAbonentInfo_lblTariffPlan"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, 'min_left', /Предоплаченные минуты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('charged')){
        html = AnyBalance.requestGet(baseurl + '/AbonentCenter/Summary.aspx');
        getParam(html, result, 'charged', /<span[^>]+id="[^"]*CurrentlyUsed">([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}

function mainUln(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www2.skypoint.ru/login_form.aspx";
    AnyBalance.setDefaultCharset('utf-8');

    var headers = {
    	"User-Agent":'Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0'
    };
    
    var html = AnyBalance.requestGet(baseurl, headers);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl, {
	__EVENTTARGET:'',
	__EVENTARGUMENT:'',
	__VIEWSTATE:viewstate,
	__EVENTVALIDATION:eventvalidation,
	'ctl00$pageContent$TextBox1':prefs.login,
	'ctl00$pageContent$TextBox2':prefs.password,
	'ctl00$pageContent$ImageButton1.x':11,
	'ctl00$pageContent$ImageButton1.y':12
    }, headers
    );

    var error = getParam(html, null, null, /<span[^>]+class="err_msg"[^>]*>(.*?)<\/span>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    //Надо проверить, действительно ли нас пустили в кабинет, или просто перенаправили куда-то в другой регион
    var login_marker = getParam(html, null, null, /<span[^>]+id="ctl00_abonent_number"[^>]*>Абонент: (.*?)<\/span>/i, replaceTagsAndSpaces);
    if(!login_marker)
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный регион?");

    var result = {success: true}
    
    if(AnyBalance.isAvailable('userNum')){
        result.userNum = login_marker;
    }

    getParam(html, result, 'balance', /Ваш баланс, по состоянию на [0-9.]*, составляет:[\s\S]*?(-?\d[\s\d,\.]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'traffic', /Суммарный трафик \(мб\)[\s\S]*?<td[^>]*>(-?\d[\s\d,\.]*)<\/td>/i, replaceFloat, parseFloat);

    var html = AnyBalance.requestGet('http://www2.skypoint.ru/pages/change_tarif2.aspx', headers);	
    getParam(html, result, '__tariff',  /<span[^>]+id="ctl00_pageContent_Label1"[^>]*>Ваш тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
    
    AnyBalance.setResult(result);
}

function mainKuban(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://stat.kuban.skypoint.ru/";
    AnyBalance.setDefaultCharset('windows-1251');

    var headers = {
    	"User-Agent":'Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0'
    };
    
    var html = AnyBalance.requestPost(baseurl + '?Action=Logon', {
	PhoneNumber:prefs.login,
	PinCode:prefs.password,
	LogOn:1
    }, headers);

    html = AnyBalance.requestGet(baseurl + '?Action=Logon');

    if(!/\?Action=Logoff/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="err_msg"[^>]*>(.*?)<\/span>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Возможно, неправильный логин-пароль или регион.");
    }

    var result = {success: true}
    
    getParam(html, result, 'userName', /Абонент:([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces);
    getParam(html, result, 'userNum', /по лицевому счёту абонента[\s\S]*?<!--VALUE-->([\s\S]*?)<!--ENDVALUE-->/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Баланс по лицевому счёту абонента(?:[\s\S]*?<!--VALUE-->){2}([\s\S]*?)<!--ENDVALUE-->/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /израсходовано\s*<b[^>]*>\s*<!--VALUE-->([^<]*)<!--ENDVALUE-->\s*<\/b>\s*мегабайт/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff',  /Текущий тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
    sumParam(html, result, 'trafficPack',  /Баланс в Трафик(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}

function mainSpb(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://app.spb.skylink.ru:7772/internetBalance/";
    AnyBalance.setDefaultCharset('windows-1251');

    var headers = {
    	"User-Agent":'Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0'
    };

    var html = AnyBalance.requestPost(baseurl + 'j_security_check', {
	j_username:prefs.login,
	j_password:prefs.password,
	'ctl00$pContent$ImageButton1.x':33,
	'ctl00$pContent$ImageButton1.y':5
    }, headers);

    if(/<form[^>]+action="j_security_check"/i.test(html) || !/Exit.jsp/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="err_msg"[^>]*>(.*?)<\/span>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Возможно, неправильный логин-пароль или регион.");
    }

    var result = {success: true}
    
    getParam(html, result, 'userName', /Контактное лицо:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'userNum', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff',  /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'trafficDay',  /Передача данных, Mб в день:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('balance', 'status', 'charged')){
        html = AnyBalance.requestGet(baseurl + 'skyServiceBalance');
        getParam(html, result, 'balance', /Баланс,[^<]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'status', /Статус договора:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'charged', /Начислений по договору[\s\S]*?Всего[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
    
    AnyBalance.setResult(result);
}

function mainRyaz(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://skylink.ryazan.ru/balance";
    AnyBalance.setDefaultCharset('utf-8');

    var headers = {
    	"User-Agent":'Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0'
    };
    
    var html = AnyBalance.requestGet(baseurl + '?phone_num=' + encodeURIComponent(prefs.login) + '&acc_num=' + encodeURIComponent(prefs.password), headers);

    if(/Повторить ввод/i.test(html)){
        var error = getParam(html, null, null, /<body[^>]*>([\s\S]*?)<br|$/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Возможно, неправильный логин-пароль или регион.");
    }

    var result = {success: true}
    
    getParam(html, result, 'balance', /Ваш баланс составляет([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalanceRK);
    getParam(html, result, 'traffic', /Использовано интернет за текущий месяц([\s\S]*?)<br/i, replaceTagsAndSpaces, parseTraffic);
    
    AnyBalance.setResult(result);
}

function mainSkylinkTele2(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.password, 'Введите пароль!');

	baseurl = "https://my.skylink.ru/";
	baseurlLogin = 'https://login.skylink.ru/ssotele2/';
	baseurlLoginIndex = baseurlLogin + 'wap/auth/modem/';
	baseurlLoginPost = baseurlLoginIndex;
	g_operatorName = 'SkyLink';

	var html = login();

	var countersTable = {
		common: {
			"balance": "balance",
			"__tariff": "tariff",
			"min_left": "remainders.min_left",
			"traffic": "remainders.traffic_left",
			"sms_left": "remainders.sms_left",
			"mms_left": "remainders.mms_left",
			"min_till": "remainders.min_till",
			"traffic_till": "remainders.traffic_till",
			"sms_till": "remainders.sms_till",
			"mms_till": "remainders.mms_till",
			"min_used": "remainders.min_used",
			"traffic_used": "remainders.traffic_used",
			"sms_used": "remainders.sms_used",
			"mms_used": "remainders.mms_used",
			"userNum": "info.mphone",
			"userName": "info.fio",
		}
	};

	function shouldProcess(counter, info){
		return true;
	}

    var adapter = new NAdapter(countersTable.common, shouldProcess);
	
    adapter.processInfo = adapter.envelope(processInfo);
    adapter.processRemainders = adapter.envelope(processRemainders);
    adapter.processPayments = adapter.envelope(processPayments);
    adapter.processBalance = adapter.envelope(processBalance);

	var result = {success: true};
    adapter.processInfo(html, result);
    adapter.processBalance(html, result);
    adapter.processRemainders(html, result);
    adapter.processPayments(html, result);

    var newresult = adapter.convert(result);
	
	if(result.payments) {
		for (var i = 0; i < result.payments.length; ++i) {
			var p = result.payments[i];

			sumParam(fmtDate(new Date(p.date), '.') + ' ' + p.sum, newresult, 'history', null, null, null, aggregate_join);
			if (/^-/.test(p.sum)) {
				sumParam(p.sum, newresult, 'history_out', null, null, null, aggregate_sum);
			} else {
				sumParam(p.sum, newresult, 'history_income', null, null, null, aggregate_sum);
			}
		}
	}
    
    AnyBalance.setResult(newresult);
}