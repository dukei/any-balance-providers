/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	'Origin':'https://www.walletone.com',
	'JS-Framework':'Basis',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.2; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36',
	'Accept': '*/*',
	'Content-type': 'text/xml;charset=utf-8',
	'Referer':'https://www.walletone.com/client/?attempt=1',
};

function encryptPass(pass) {
	AnyBalance.trace('Trying to encrypt pass: ' + pass);
	pass = Basis.Crypt(pass).sha1(!0).base64().toString();
	AnyBalance.trace('Encrypted pass: ' + pass);
	return pass;
}

function trace(str){
    AnyBalance.trace(str);
}

function ur1(u) {
    trace('getting path of the url ' + u);
    return u.replace(/^\w+:\/\/[^\/]*/, '') || '/';
}

function main() {
	AnyBalance.setDefaultCharset('utf-8');
	var prefs = AnyBalance.getPreferences(),
	currency = {
		980: '₴',
		398: '₸',
		643: 'р',
		710: 'ZAR',
		840: '$',
		978: '€'
	},
	currencyCode = prefs.currency || 643;
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

        var domain = 'www.walletone.com';
        var baseurl = 'https://' + domain;
	
	var html = AnyBalance.requestGet(baseurl + '/client/', g_headers);
        var redirect_js_url = getParam(html, null, null, /src="(\/redirect.js[^>"]*)/i, null, html_entity_decode);
        if(!redirect_js_url){
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удаётся получить секретный параметр входа. Сайт изменен?');
        }
        var script = sumParam(html, null, null, /<script[^>]*>([\s\S]*?)<\/script>/ig, null, null, create_aggregate_join('\n', false));

        var redirect_js = AnyBalance.requestGet(baseurl + redirect_js_url, addHeaders({Referer: baseurl + '/client/'}));
        var location = {href: baseurl + '/client/'};
        var document = {cookie: 'CABINET_LOCALE=ru'};
        var window = {location: location, document: document};
        var eval_script = 'var ur1;\n' + redirect_js + '\nur1=' + ur1.toString() + '\n' + script;
        try{
            //Ну вот зачем делать такую защиту? Ну почему бы просто не дать возможность пользователям смотреть свой баланс в AnyBalance?
            //Теперь придется делать сложный и опасный eval... Надеюсь, разработчики w1 пойдут навстречу своим пользователям и разрешат им смотреть баланс w1 в AnyBalance.
            var safe_eval_func = new Function('window', 'document', 'location', 'self', 'top', 'AnyBalance', 'g_AnyBalanceApiParams', '_AnyBalanceApi', eval_script);
            safe_eval_func(window, document, location, window, window);
        }catch(e){
            AnyBalance.trace(eval_script);
            AnyBalance.trace('Error executing redirect.js: ' + e.message + '\n' + e.stack);
            throw new AnyBalance.Error('Ошибка выполнения скрипта входа. Сайт изменен?');
        }
        
        AnyBalance.trace('cookie is: ' + document.cookie);
        var cookiename = decodeURIComponent(document.cookie.replace(/=[\s\S]*/, ''));
        var cookievalue = decodeURIComponent(document.cookie.replace(/;[\s\S]*/, '').replace(/^.*?=/, ''));
        AnyBalance.trace('Setting cookie: ' + cookiename + '=' + cookievalue);
        AnyBalance.setCookie(domain, cookiename, cookievalue);

        AnyBalance.trace('New location is: ' + location.href + ', but we will not follow it (unnecessary)');
	
	var loginXml = '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Header><ParamsHeader xmlns="Wallet.Security.WebService"><Params><Param Name="CultureId" Value="ru-RU"/></Params></ParamsHeader></soap:Header><soap:Body><GetSessionTicket xmlns="Wallet.Security.WebService"><Login>'+ prefs.login +'</Login><Password>' + encryptPass(prefs.password) +'</Password><LoginType>Auto</LoginType><ClientId>w1_web</ClientId><Params><Param Name="UserAgent" Value="Chrome 31.0.1650.63"/><Param Name="ClientResolutionX" Value="1920"/><Param Name="ClientResolutionY" Value="1080"/><Param Name="AppVersion" Value="201312260718-test"/></Params></GetSessionTicket></soap:Body></soap:Envelope>';
	// Получаем SessionKey
	html = AnyBalance.requestPost(baseurl + '/w1service/SecurityService.asmx', loginXml, addHeaders({
		'SOAPAction': 'Wallet.Security.WebService/GetSessionTicket'
	}));
	var SessionUserId = getParam(html, null, null, /<SessionUserId>([\s\S]*?)<\/SessionUserId>/i);
	var SessionKey = getParam(html, null, null, /<SessionKey>([\s\S]*?)<\/SessionKey>/i);
	if (!SessionKey || !SessionUserId){ 
		var error = getParam(html, null, null, /<faultstring>[\s\S]*:\s*([\s\S]*?)<\/faultstring>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error) throw new AnyBalance.Error(error, null, /USER_PASSWORD_NOT_MATCH/i.test(html));
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }

	var balanceXml = '<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Header><SecurityHeader xmlns="Wallet.Processing.WebService"><SessionKey>' + SessionKey + '</SessionKey></SecurityHeader><ParamsHeader><Params><Param Name="CultureId" Value="ru-RU" /></Params></ParamsHeader></soap:Header><soap:Body><GetUserBalance xmlns="Wallet.Processing.WebService" /></soap:Body></soap:Envelope>';
	html = AnyBalance.requestPost('http://services.w1.ru/11/ProcessingService.asmx', balanceXml, addHeaders({
		'SOAPAction': 'Wallet.Processing.WebService/GetUserBalance'
	}));

	var result = {success: true};
	getParam(html, result, 'balance', new RegExp("<CurrencyId>" + currencyCode + "<\/CurrencyId>(?:<Amount>){1}([\\s\\S]*?)<\/Amount>", "i"), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'SafeAmount', new RegExp("<CurrencyId>" + currencyCode + "<\/CurrencyId>[\\s\\S]*(?:<SafeAmount>){1}([\\s\\S]*?)<\/SafeAmount>", "i"), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'HoldAmount', new RegExp("<CurrencyId>" + currencyCode + "<\/CurrencyId>[\\s\\S]*(?:<HoldAmount>){1}([\\s\\S]*?)<\/HoldAmount>", "i"), replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'Overdraft', new RegExp("<CurrencyId>" + currencyCode + "<\/CurrencyId>[\\s\\S]*(?:<Overdraft>){1}([\\s\\S]*?)<\/Overdraft>", "i"), replaceTagsAndSpaces, parseBalance);
	result.currency = currency[currencyCode];
	AnyBalance.setResult(result);
}