/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
    'Connection': 'keep-alive',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.licard.com/';
    var baseurlFizik = 'https://club-lukoil.ru/';
   	checkEmpty(prefs.login, 'Введите номер карты!');
   	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
    
	var result = {success: true};
	
    if (prefs.type == 'likard') {
		var html = AnyBalance.requestGet(baseurl + 'ru/login', g_headers);

		var params = [];

		var captcha = getParam(html, null, null, /<img[^>]+src="\/([^"]*)"[^>]*class="captcha-pic/i);
		if(captcha){
			var img = AnyBalance.requestGet(baseurl + captcha, addHeaders({Referer:baseurl + 'ru/login'}));
			captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {inputType: 'number'});
			params.push(['keystring', captcha]);
		}
		
		params = params.concat([
			['login', prefs.login],
			['pass' , prefs.password],
			['submit', 'Войти'],
		]);
		
		try {
			html = AnyBalance.requestPost(baseurl + 'ru/login', params, addHeaders({Referer: baseurl + 'ru/login', 'Origin': 'https://my.licard.com'}));
		} catch(e) {
			html = AnyBalance.requestGet(baseurl + 'ru', addHeaders({Referer: baseurl + 'ru/login', 'Origin': 'https://my.licard.com'}));
		}
        //получим id пользователя
        var usedId = /\/([\s\S]{1,15})\/client/i.exec(html);
        if (!usedId){
        	var error = getParam(html, null, null, /<div[^>]+common-errors[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        	if(error)
        		throw new AnyBalance.Error(error, false, /Информация о пользователе отсутствует|пароль/i.test(error));
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
        getParam(prefs.login, result, 'cardnum');
        getParam(html, result, 'balance', /Баланс[\s\S]*?>[\s\S]*?>([\s\S]*?)<\/b/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'last_payment', /Последний платёж[\s\S]*?payments">([\s\S]*?)<\/a/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'name', /class="value user-name">\s*<b>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
        getParam(html, result, 'status', /<th[^>]*>\s*Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    } else if(prefs.type == 'clubby'){
    	checkEmpty(/^\d{18,19}$/.test(prefs.login), 'Номер карты введен неверно!');

		if(prefs.type == 'clubby')
			baseurlFizik = baseurlFizik.replace(/\.ru/i, '.by');
		
        var html = AnyBalance.requestGet(baseurlFizik + 'login', g_headers);
		
        html = AnyBalance.requestPost(baseurlFizik + 'login', {
            username: prefs.login,
            password: prefs.password,
        }, g_headers);
		
        if (!/logout/i.test(html)) {
            var error = getParam(html, null, null, [/<p[^>]+class="err"[^>]*>([\s\S]*?)<\/p>/i, /class="error">([\s\S]*?)<\//i], replaceTagsAndSpaces);
            if (error)
				throw new AnyBalance.Error(error, false, /Неверный номер карты или пароль/i.test(error));
			
			AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
		
        getParam(html, result, 'balance', /Количество&nbsp;баллов(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cardnum', /cardNumber"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, null);
		getParam(html, result, 'name', /"user-FIO"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
		getParam(html, result, 'phonenumber', /"userPhoneTableCell"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
		
        //getParam(html, result, '__tariff', /<li><span>Ваш статус в Программе:<\/span>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, null);
        //getParam(html, result, 'region', /Регион Программы:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    }else{
    	mainPhysicNew(result);
    }
	
    AnyBalance.setResult(result);
}

function callApi(verb, params){
    var baseurl = 'https://customer.licard.ru/';

    var html = AnyBalance.requestPost(baseurl + 'api/v2/' + verb, JSON.stringify(params), addHeaders({
    	'Accept': 'application/json, text/plain, */*',
    	'X-Api-Token': 'mcHySTn5vmPvMLWrYMfG3xgC9rV2moJ6',
    	'Content-Type': 'application/json;charset=UTF-8',
    	Origin: baseurl.replace(/\/$/g, ''),
    	Referer: baseurl
    }));
    var json = getJson(html);
   	var errors = [];
    if(json.errorCode){
    	var error = json.errorMessage;
    	throw new AnyBalance.Error(error, null, /Логин|не найден|парол|недейств/i.test(error));
    }
    	
    return json;
}

function generateUUID() {
	function s4() {
  		return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
	}
  	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}


function mainPhysicNew(result){
    var prefs = AnyBalance.getPreferences();

    var json = callApi('user/login', {"appVersion":1,"osVersion":'win32', platform: 'web'});
    var sessionId = json.result.sessionId;

    var json = callApi('card/connect', {"cardNumber":prefs.login,"password":prefs.password, sessionId: sessionId});
    var cardId = json.result.cardShortInfo.id;

    var aggregate_join_space = create_aggregate_join(' ');
    
    getParam(json.result.cardShortInfo.balance, result, 'balance');
    getParam(json.result.cardShortInfo.cardNumber, result, 'cardnum');

    getParam(json.result.cardShortInfo.cardLevel.description, result, '__tariff');

    if(AnyBalance.isAvailable('name', 'phonenumber')){
	    json = callApi('card/info', {"cardId":cardId, sessionId: sessionId});
		
		sumParam(json.result.lastName, result, 'name', null, null, null, aggregate_join_space);
		sumParam(json.result.firstName, result, 'name', null, null, null, aggregate_join_space);
		sumParam(json.result.middleName, result, 'name', null, null, null, aggregate_join_space);
		
		getParam(json.result.phoneNumber, result, 'phonenumber');
    }
	
    if(AnyBalance.isAvailable('lastpayment')){
	    json = callApi('card/transactions/list', {"cardId":cardId, sessionId: sessionId});
		
		getParam(json.result.transactions && json.result.transactions[0] && json.result.transactions[0].amountTotal, result, 'lastpayment');
    }

}
