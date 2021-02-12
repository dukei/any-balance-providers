/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
 */

var g_headers = {
	Connection: "keep-alive",
	"Upgrade-Insecure-Requests": "1",
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36",
	"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
	"Sec-Fetch-Site": "none",
	"Accept-Encoding": "gzip, deflate, br",
	"Accept-Language": "en-US,en;q=0.9",

};

var getFormCodeFromStatus = function(xFormStatus) {
    var code = xFormStatus;
    var i, l, hval = 0x811c9dc5;
    for (i = 0, l = code.length; i < l; i++) {
        hval ^= code.charCodeAt(i);
        hval += (hval << 1) + (hval << 4) + (hval << 7) + (hval << 8) + (hval << 24);
    }
    return code + "_" + hval.toString(16);
};

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');

   
    var domain = 'www.s7.ru';
    var cookies = {
    	ssdkl: 'e048a38e0c734259a52cdac7f1e42b06',
		lang: 'en',
		isAuth: '0',
		airport: 'DME',
		country: 'RU',
		_psc: '1',
		rerf: 'AAAAAGAmqFI8HMC1AwcCAg==',
		SES_ID2: 'M2EyZmRmOTEtY2Q0Ny00YjFjLThhMjUtMmYyMDM4NTdmOGUy'
	}

	for(var n in cookies){
		AnyBalance.setCookie(domain, n, cookies[n]);
	}

    var baseurl = 'https://www.s7.ru/';

    var maxtries = 10;
    for(var i=0; i<maxtries; ++i){
    	AnyBalance.trace("connecting to s7, try " + (i+1) + ' of ' + maxtries);
    	var html = AnyBalance.requestGet(baseurl, g_headers);

        if (!html || (AnyBalance.getLastStatusCode() >= 400)) {
            AnyBalance.trace(baseurl + ' -> ' + AnyBalance.getLastStatusCode());
            if(i == maxtries-1)
            	throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
            else
            	continue;
        }
        break;
    }
     
    html = AnyBalance.requestGet(baseurl + 'servlets/formprocess/formsecurity?action=checkStatus', g_headers);
    var formStatus = AnyBalance.getLastResponseHeader('X-Form-Status');
    if(!formStatus){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
    }

    /*
    html = AnyBalance.requestGet(baseurl + 'servlets/formprocess/formsecurity?action=generateUiTicketUniqName', g_headers);
    var json = getJson(html);
    if(!json.c || !json.c.name){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось получить имя токена авторизации. Сайт изменен?');
    }
      */
    var loginJson = AnyBalance.requestPost(baseurl + 'dotCMS/priority/ajaxLogin', {
        dispatch: 'login',
        username: prefs.login,
        password: prefs.password,
        xFormCode: getFormCodeFromStatus(formStatus)
    }, addHeaders({
    	Accept: '*/*',
		'X-Requested-With': 'XMLHttpRequest',
		ADRUM: 'isAjax:true',
		Referer: baseurl + 'ru/about/oneworld/index.dot'
	}));
    
    var login = AB.getJson(loginJson);
    if (login.status != 'success') {
        var fatal = false;
        if (login.status == 'error') {
            var errorMsg = login.errors && login.errors[0];
            if (/invalid.*credentials/.test(errorMsg)) {
                errorMsg = "Неверный логин/пароль";
            }
            if (/iplock/.test(errorMsg)) {
                errorMsg = "Авторизация временно невозможна.";
            }
            fatal = /не существует|логин|парол|корректный.*ПИН/.test(errorMsg);
        }
        throw new AnyBalance.Error(errorMsg || 'Ошибка авторизации.', false, fatal);
    }
    
    var userDataJson = AnyBalance.requestGet(baseurl + 'dotCMS/priority/ajaxProfileService?dispatch=getUserInfo&_=' + Date.now(), g_headers);
    
    if (!userDataJson || (AnyBalance.getLastStatusCode() >= 400)) {
        AnyBalance.trace(userDataJson);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
    
    var userData = AB.getJson(userDataJson);
    
    if (!userData.c) {
        AnyBalance.trace(userDataJson);
        throw new AnyBalance.Error('Не удалось получить данные.');
    }

    var cardLevels = {
        CLASSIC: 'Классическая',
        SILVER: 'Серебряная',
        GOLD: 'Золотая',
        PLATINUM: 'Платиновая'
    };

    var result = {
        success: true
    };
    
    AB.getParam(userData.c.milesBalance, result, 'balance');
    AB.getParam(userData.c.cardNumber, result, 'cardnum');
    AB.getParam(userData.c.qMiles, result, 'qmiles');
    AB.getParam(userData.c.qFlights, result, 'flights');
    AB.getParam(userData.c.firstName + ' ' + userData.c.lastName, result, 'userName');
    AB.getParam(cardLevels[userData.c.cardLevel] || userData.c.cardLevel, result, 'type');

    AnyBalance.setResult(result);
}
