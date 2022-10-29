/**
 Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/ 

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'Keep-Alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.84 Safari/537.36 OPR/85.0.4341.75'
};

var baseurl = 'https://www.s7.ru';
var token;
var resid;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];
var replaceCard = [replaceTagsAndSpaces, /\D/g, '', /(.*)(\d\d\d)(\d\d\d)$/, '$1 $2 $3'];

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

function generateUUID1() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
}

function getDeviceId(){
	var prefs = AnyBalance.getPreferences();
	var id = hex_md5(prefs.login);
	return id;
}

function login(){
	var prefs = AnyBalance.getPreferences(), json;

	html = AnyBalance.requestPost('https://myprofile.s7.ru/auth/auth/api/profiles/tickets', JSON.stringify({
        "id": prefs.login,
        "secret": prefs.password,
        "temporaryResource": generateUUID(),
        "device": getDeviceId()
    }), addHeaders({
		'accept': 'application/json, text/plain, */*',
		'adrum': 'isAjax:true',
		'content-type': 'application/json',
        'origin': baseurl,
        'referer': baseurl + '/',
        'x-language': 'ru'
	}));
	
	var json = getJson(html);
		
	if (json.error) {
        if (json.error.code == 'invalid.credentials') {
	    	var error = json.error.message;
        	if (error) {
	    		AnyBalance.trace(html);
        		throw new AnyBalance.Error(error);	
        	}

        	AnyBalance.trace(html);
        	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
    }
	
	token = json.ticket.token;
	resid = json.ticket.resourceId;
}

function setCoockies() {
	var prefs = AnyBalance.getPreferences();
	if (/@/.test(prefs.login)) {
		var ssdge = getDeviceId();
	} else {
	    var ssdge = generateUUID1();
    }
	
    AnyBalance.setCookie('.s7.ru', 'ssdcp', token);
	AnyBalance.setCookie('.s7.ru', 'userId', resid);
	AnyBalance.setCookie('.s7.ru', 'ssdge', ssdge);
	AnyBalance.setCookie('.s7.ru', 'profileId', resid);
}

function main() {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    checkEmpty(prefs.login, 'Введите логин!');
    checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
    var tries = 0;
	do {
		login();
		setCoockies();
		var html = AnyBalance.requestGet(baseurl + '/api/v1/profile/profileAccount', addHeaders({
	    	'accept': 'application/json, text/plain, */*',
	    	'adrum': 'isAjax:true',
	    	'origin': baseurl,
            'referer': baseurl + '/',
	    	'upgrade-insecure-requests': '1'
	    }));
	
	    var json = getJson(html);
		json = json.c;
	    AnyBalance.trace('Попытка ' + tries + ': ' + JSON.stringify(json));
	} while (!json.memberId && ++ tries < 5);

	if (!json.memberId) {
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить данные профиля. Сайт изменен?');
	}

    var cardLevels = {
        CLASSIC: 'Классическая',
        SILVER: 'Серебряная',
        GOLD: 'Золотая',
        PLATINUM: 'Платиновая'
    };

    var result = {success: true};

//    for(var i=0; i<jsonLoyalty.profile.balancesContainer.length; ++i){
//    	var b = jsonLoyalty.profile.balancesContainer[i];
//    	if(b.type === 'REDEMPTION')
//    		AB.getParam(jsonLoyalty.milesBalance, result, 'balance');
//    	if(b.type === 'QUALIFYING')
//    		AB.getParam(b.value, result, 'qmiles');
//    	if(b.type === 'FLIGHTS')
//    		AB.getParam(b.value, result, 'flights');
//    }
    AB.getParam(json.milesBalance, result, 'balance', null, null, parseBalance); 
	AB.getParam(json.burningMiles, result, 'burning', null, null, parseBalance);
    var cardNum = AB.getParam(json.memberId, result, 'cardnum', null, replaceCard);
	AB.getParam(json.statusExpireDate, result, 'expDate', null, null, parseDate);
	AB.getParam(json.phone.phoneString, result, 'phone', null, replaceNumber);

    AB.getParam(json.firstName + ' ' + json.lastName, result, 'userName');
    AB.getParam(cardLevels[json.cardLevel] || json.cardLevel, result, 'type');
	AB.getParam(json.travelLevelStatus, result, 'status');
    AB.getParam(cardNum + ' | ' + json.travelLevelStatus, result, '__tariff');
                        
    AnyBalance.setResult(result);
}
