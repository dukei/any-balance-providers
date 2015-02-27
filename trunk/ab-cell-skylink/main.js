/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Content-Type': 'text/xml; charset=utf-8',
	'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; MS Web Services Client Protocol 2.0.50727.5472)',
	'Connection': 'keep-alive',
};

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.password, 'Введите пароль!');
    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(/^\d{10}$/.test(prefs.login), 'Не верный формат логина, необходимо вводить логин без +7 в начале и без пробелов.');

    var region = prefs.region || 'moscow';
    var regionFunc = g_regions[region] || g_regions.moscow;

    AnyBalance.trace("Entering region: " + region);

    regionFunc();
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
		var error = getParam(html, null, null, /Message="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
		if(/No connection could be made because the target machine actively refused/i.test(error)) {
			AnyBalance.trace('SkyPoint временно не работает, попробуем войти в SkyBalance...');
			mainSkyBalance(prefs);
			return;
		}
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	html = reqSkypoint('https://uws.skypoint.ru/uws.asmx',
	'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><InvokeMethod21 xmlns="http://www.skylink.ru/UWS"><dn>'+prefs.login+'</dn><pwd>'+pass+'</pwd><guid>f1e07de2-2fc5-4beb-bf9c-b997124658a4</guid><Parameters>I_DN='+prefs.login+',i_ExtParam=$SUBSYSTEM=WindowsSkyPoint</Parameters><Delimiter>,</Delimiter></InvokeMethod21></soap:Body></soap:Envelope>');
	getParam(html, result, '__tariff', /<TARIFF_PLAN>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('balance')) {
		html = reqSkypoint('https://uws.skypoint.ru/uws.asmx',
		'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><InvokeMethod21 xmlns="http://www.skylink.ru/UWS"><dn>'+prefs.login+'</dn><pwd>'+pass+'</pwd><guid>44e7a309-b54d-4cfb-b169-efe06fdd9f35</guid><Parameters>I_DN='+prefs.login+',i_ExtParam=$SUBSYSTEM=WindowsSkyPoint</Parameters><Delimiter>,</Delimiter></InvokeMethod21></soap:Body></soap:Envelope>');
		
		getParam(html, result, 'balance', /<BALANCE>([^<]+)/i, replaceTagsAndSpaces, parseBalance);		
	}
	if(isAvailable('userNum')) {
		html = reqSkypoint('https://uws.skypoint.ru/uws.asmx',
		'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><InvokeMethod21 xmlns="http://www.skylink.ru/UWS"><dn>'+prefs.login+'</dn><pwd>'+pass+'</pwd><guid>ff644d4c-0dc5-4687-a481-868dc87a685c</guid><Parameters>I_DN='+prefs.login+',i_ExtParam=$SUBSYSTEM=WindowsSkyPoint</Parameters><Delimiter>,</Delimiter></InvokeMethod21></soap:Body></soap:Envelope>');
		
		getParam(html, result, 'userNum', /<ACCOUNT_ID>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);		
	}
	if(isAvailable('userName')) {
		html = reqSkypoint('https://uws.skypoint.ru/uws.asmx',
		'<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body><InvokeMethod21 xmlns="http://www.skylink.ru/UWS"><dn>'+prefs.login+'</dn><pwd>'+pass+'</pwd><guid>6078690c-024d-4a32-8789-84c976adf62c</guid><Parameters>I_DN='+prefs.login+',i_ExtParam=$SUBSYSTEM=WindowsSkyPoint</Parameters><Delimiter>,</Delimiter></InvokeMethod21></soap:Body></soap:Envelope>');

		getParam(html, result, 'userName', /<CLIENT_NAME>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
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
    moscow: mainMoscow,
    kaluga: mainUln,
    uln: mainUln,
    kuban: mainKuban,
    spb: mainSpb,
    ryaz: mainRyaz,
	izhevsk: mainUln
};

function mainMoscow(){
	var prefs = AnyBalance.getPreferences();
	
	mainSkyPoint(prefs);
	return;
	// Тут ввели капчу, пока не будем получать отсюда
    var baseurl = "https://www.skypoint.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    var headers = {
        'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Connection':'keep-alive',
        'Referer': baseurl,
    	"User-Agent":'Mozilla/5.0 (Windows NT 5.1; rv:2.0) Gecko/20100101 Firefox/4.0'
    };



    var html = AnyBalance.requestGet(baseurl + 'Account/Login.aspx?ReturnUrl=%2f', headers);
    var eventvalidation = getEventValidation(html);
    var viewstate = getViewState(html);

    html = AnyBalance.requestPost(baseurl + 'Account/Login.aspx?ReturnUrl=%2f', {
	__EVENTTARGET:'',
	__EVENTARGUMENT:'',
	__VIEWSTATE:viewstate,
	__EVENTVALIDATION:eventvalidation,
	ctl00$MainContent$txtUserName:prefs.login,
	ctl00$MainContent$WatermarContactPhone_ClientState:'',
	ctl00$MainContent$txtPassword:prefs.password,
        ctl00$MainContent$ctl00: 'Войти'
    }, headers);

    if(!/ctl00\$b[nt]{2}Login/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+class="errorPinkMessage"(?:[^>](?!display:none|visibility))*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен или неправильный регион?');
    }

    //Надо проверить, действительно ли нас пустили в кабинет, или просто перенаправили куда-то в другой регион
    //Но проверить не могу, нет у меня учетных данных...
    //var login_marker = getParam(html, null, null, /(...)/i);
    //if(!login_marker)
    //    throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный регион?");

    var result = {success: true};

    getParam(html, result, 'userName', /<span[^>]+id="txtLoginName"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userNum', /<span[^>]+id="ucAbonentInfo_lblLitsevoySchet"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс лицевого счёта[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<span[^>]+id="ucAbonentInfo_lblTariffPlan"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'min_left', /Предоплаченные минуты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('charged')){
        html = AnyBalance.requestGet(baseurl + 'AbonentCenter/Summary.aspx');
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

    var error = getParam(html, null, null, /<span[^>]+class="err_msg"[^>]*>(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    //Надо проверить, действительно ли нас пустили в кабинет, или просто перенаправили куда-то в другой регион
    var login_marker = getParam(html, null, null, /<span[^>]+id="ctl00_abonent_number"[^>]*>Абонент: (.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(!login_marker)
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный регион?");

    var result = {success: true}
    
    if(AnyBalance.isAvailable('userNum')){
        result.userNum = login_marker;
    }

    getParam(html, result, 'balance', /Ваш баланс, по состоянию на [0-9.]*, составляет:[\s\S]*?(-?\d[\s\d,\.]*)/i, replaceFloat, parseFloat);
    getParam(html, result, 'traffic', /Суммарный трафик \(мб\)[\s\S]*?<td[^>]*>(-?\d[\s\d,\.]*)<\/td>/i, replaceFloat, parseFloat);

    var html = AnyBalance.requestGet('http://www2.skypoint.ru/pages/change_tarif2.aspx', headers);	
    getParam(html, result, '__tariff',  /<span[^>]+id="ctl00_pageContent_Label1"[^>]*>Ваш тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
    
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
        var error = getParam(html, null, null, /<span[^>]+class="err_msg"[^>]*>(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Возможно, неправильный логин-пароль или регион.");
    }

    var result = {success: true}
    
    getParam(html, result, 'userName', /Абонент:([\s\S]*?)<br[^>]*>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userNum', /по лицевому счёту абонента[\s\S]*?<!--VALUE-->([\s\S]*?)<!--ENDVALUE-->/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /Баланс по лицевому счёту абонента(?:[\s\S]*?<!--VALUE-->){2}([\s\S]*?)<!--ENDVALUE-->/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'traffic', /израсходовано\s*<b[^>]*>\s*<!--VALUE-->([^<]*)<!--ENDVALUE-->\s*<\/b>\s*мегабайт/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff',  /Текущий тарифный план:[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
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
        var error = getParam(html, null, null, /<span[^>]+class="err_msg"[^>]*>(.*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Возможно, неправильный логин-пароль или регион.");
    }

    var result = {success: true}
    
    getParam(html, result, 'userName', /Контактное лицо:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'userNum', /Номер счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff',  /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'trafficDay',  /Передача данных, Mб в день:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(AnyBalance.isAvailable('balance', 'status', 'charged')){
        html = AnyBalance.requestGet(baseurl + 'skyServiceBalance');
        getParam(html, result, 'balance', /Баланс,[^<]*:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'status', /Статус договора:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
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
        var error = getParam(html, null, null, /<body[^>]*>([\s\S]*?)<br|$/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Возможно, неправильный логин-пароль или регион.");
    }

    var result = {success: true}
    
    getParam(html, result, 'balance', /Ваш баланс составляет([\s\S]*?)<br/i, replaceTagsAndSpaces, parseBalanceRK);
    getParam(html, result, 'traffic', /Использовано интернет за текущий месяц([\s\S]*?)<br/i, replaceTagsAndSpaces, parseTraffic);
    
    AnyBalance.setResult(result);
}
