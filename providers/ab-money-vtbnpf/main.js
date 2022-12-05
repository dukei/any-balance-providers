/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.7,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
};

var g_headersAPI = {
    'Connection': 'Keep-Alive',
    'Accept-Encoding': 'gzip',
    'User-Agent': 'okhttp/5.0.0-alpha.2'
};

var baseurl = 'https://lk.vtbnpf.ru';
var g_savedData;

function main() {
	var prefs = AnyBalance.getPreferences();
	
	switch(prefs.source){
	case 'app':
        var html = processAPI(prefs);
		break;
    case 'site':
        var html = processSite(prefs);
		break;
    case 'auto':
    default:
        try{
			var html = processAPI(prefs);
        }catch(e){
            if(e.fatal)
                throw e;
			AnyBalance.trace('Не удалось получить данные из мобильного приложения');
		    clearAllCookies();
            var html = processSite(prefs);
        }
        break;
	}
	
	var result = {success: true};
	
	AnyBalance.setResult(result);
}

function processSite(){
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
    if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{11}$/.test(prefs.login), 'Введите номер пенсионного страхового свидетельства - 11 цифр без пробелов и разделителей!');
	}
	    
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var login = prefs.login.replace(/[^\d]+/g, '');
	var formattedLogin = login.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/i, '$1-$2-$3-$4');
	
	AnyBalance.trace ('Пробуем получить данные с официального сайта...');
	    
	var html = AnyBalance.requestGet(baseurl + '/index.php?from=main', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}
	    
	var captchaa;
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl + '/code.php');
		captchaa = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	    
	html = AnyBalance.requestPost(baseurl + '/ipension/fiz/login.php', {
		ag: '',
		kod: formattedLogin,
		pass: prefs.password,
		code: captchaa,
		ajax: 'y'
    }, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Referer': baseurl + '/ipension/fiz/login.php',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	    
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
		
	if(json.result !== 1){
		var error = json.message;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол|не найден/i.test(error));
		
		AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var redirectUrl = json.redirect;
	
	html = AnyBalance.requestGet(joinUrl(baseurl, redirectUrl), addHeaders({Referer: baseurl + '/'}));

    var result = {success: true};
	
	getParam(html, result, 'balance', /Накоплений по(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'acc_num', /Номер счета(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, '__tariff', /Номер счета(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contract_num', /Номер договора(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'contract_date', /Дата договора(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'snils', /name="snils" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'email', /name="email" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /name="tel" value="([^"]*)/i, [replaceTagsAndSpaces, /.*(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2-$3-$4']);
	var person = {};
	sumParam(html, person, '__n', /name="fam" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	sumParam(html, person, '__n', /name="nam" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	sumParam(html, person, '__n', /name="otch" value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));
	getParam(person.__n, result, 'fio');
	
	if(AnyBalance.isAvailable(['income_sum', 'invest_sum', 'last_oper_date', 'last_oper_sum', 'last_oper_desc'])){
		var account = getParam(html, null, null, /account=([\s\S]*?)(?:[&|"])/i, replaceTagsAndSpaces, html_entity_decode);
	
	    html = AnyBalance.requestGet(baseurl + '/local/components/vedita/personal.kabinet/ajax.php?account=' + account + '&mode=5&participant=&typeLink=', addHeaders({Referer: AnyBalance.getLastUrl()}));
		
		getParam(html, result, 'income_sum', /Сумма поступивших средств(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'invest_sum', /Сумма инвест\. дохода(?:[\s\S]*?<div[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		
		var table = getElement(html, /<table[^>]*>/i);
        
		if(table){
		    getParam(table, result, 'last_oper_date', /Дата(?:[\s\S]*?<td[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
		    getParam(table, result, 'last_oper_sum', /Сумма(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		    getParam(table, result, 'last_oper_desc', /Операция(?:[\s\S]*?<td[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces);
		}else{
			AnyBalance.trace('Не удалось получить данные о последней операции');
		}
	}
	
    AnyBalance.setResult(result);
}

function patchRequests(){
	//Иногда попадаются ссылки с пробелом
	var post = AnyBalance.requestPost;
	var fget = AnyBalance.requestGet;

	function req(func, url, args){
		args[0] = url.replace(/\s/g, '%20');
		if(url != args[0]){
			AnyBalance.trace('Ссылка содержит пробел. Исправляем...'); // Ссылки не показываем, там пароль
		}
		return func.apply(AnyBalance, args);
	}

	AnyBalance.requestPost = function(url){
		return req(post, url, arguments);
	}

	AnyBalance.requestGet = function(url){
		return req(fget, url, arguments);
	}
}

function callApi(verb, params){
	patchRequests();
	var userToken = g_savedData.get('userToken');
	
	var method = 'GET', headers = g_headersAPI;
	if(params){
		method = 'POST';
	}
	
//	AnyBalance.trace('Запрос: ' + verb);
	var html = AnyBalance.requestPost(baseurl + verb, params, headers, {HTTP_METHOD: method});
	var json = getJson(html);
//	AnyBalance.trace('Ответ: ' + JSON.stringify(json));
	
	if(json.error){
		var error = json.message || json.error;
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол|код/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

	return json;
}

function processAPI(){
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{11}$/.test(prefs.login), 'Введите номер пенсионного страхового свидетельства - 11 цифр без пробелов и разделителей!');
	}
	    
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var login = prefs.login.replace(/[^\d]+/g, '');
	var formattedLogin = login.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/i, '$1-$2-$3 $4');
	
	if(!g_savedData)
	    g_savedData = new SavedData('vtbnpf', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем получить данные из мобильного приложения...');
	
	var json;
	
	try{
		json = callApi('/rest/?action=getContracts&userToken=' + userToken);
		AnyBalance.trace('Успешно вошли по userToken');
	}catch(e){
		AnyBalance.trace('Не удалось войти по userToken: ' + e.message);
		g_savedData.set('userToken', undefined);
		clearAllCookies();
		
		var deviceToken = g_savedData.get('deviceToken');
	
	    if(!deviceToken){
	    	AnyBalance.trace('Токен устройства не сохранен. Логинимся заново...');
	        json = callApi('/rest/?action=logIn&snils=' + formattedLogin + '&password=' + prefs.password);
	    }else{
	    	AnyBalance.trace('Токен устройства сохранен. Входим по токену...');
	    	try{
	    	    json = callApi('/rest/?action=logIn&snils=' + formattedLogin + '&password=' + prefs.password + '&deviceToken=' + deviceToken);
	    	    AnyBalance.trace('Успешно вошли по deviceToken');
	        }catch(e){
	        	AnyBalance.trace('Не удалось войти по deviceToken: ' + e.message);
	    		g_savedData.set('deviceToken', undefined);
	        	clearAllCookies();
	        	json = callApi('/rest/?action=logIn&snils=' + formattedLogin + '&password=' + prefs.password);
	        }
	    }
	
	    if (json.whereTo && !json.userToken && !json.deviceToken) {
	        AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
	        var num = json.address;
	        var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +' + num, null, {inputType: 'number', time: 180000});
	        
	    	json = callApi('/rest/?action=authorize&snils=' + formattedLogin + '&code=' + code);
	    }
		
	    var userToken = json.userToken;
	    var deviceToken = json.deviceToken;
		g_savedData.set('userToken', userToken);
	    g_savedData.set('deviceToken', deviceToken);
		g_savedData.save();
		
	    json = callApi('/rest/?action=getContracts&userToken=' + userToken);
	    
	    g_savedData.setCookies();
	    g_savedData.save();
	}

    var result = {success: true};
	
	var data = json.data[0];
	
	getParam(data.accumulations, result, 'balance', null, null, parseBalance);
	getParam(data.income, result, 'income_sum', null, null, parseBalance);
	getParam(data.investmentIncome, result, 'invest_sum', null, null, parseBalance);
	getParam(data.accountNumber, result, 'acc_num');
	getParam(data.accountNumber, result, '__tariff');
	getParam(data.contractNumber, result, 'contract_num');
	getParam(data.contractDate, result, 'contract_date', null, null, parseDate);
	
	var hists = data.history;
	
	if (hists && hists.length>0){
		var hist = hists[0];
		getParam(hist.date, result, 'last_oper_date', null, replaceTagsAndSpaces, parseDate);
	    getParam(hist.sum, result, 'last_oper_sum', null, replaceTagsAndSpaces, parseBalance);
		getParam(hist.description, result, 'last_oper_desc');
	}else{
		AnyBalance.trace('Не удалось получить информацию о последней операции');
	}
	
	if(AnyBalance.isAvailable(['last_oper_date', 'last_oper_sum', 'last_oper_desc'])){
	    json = callApi('/rest/?action=getUserInfo&userToken=' + userToken);
	
	    getParam(json.snils, result, 'snils');
	    getParam(json.email, result, 'email');
	    getParam(json.phone, result, 'phone', null, [replaceTagsAndSpaces, /.*(\d{3})(\d{3})(\d{2})(\d{2})/, '+7 $1 $2-$3-$4']);
	    var person = {};
	    sumParam(json.surname, person, '__n', null, null, null, create_aggregate_join(' '));
	    sumParam(json.name, person, '__n', null, null, null, create_aggregate_join(' '));
	    sumParam(json.patronymic, person, '__n', null, null, null, create_aggregate_join(' '));
	    getParam(person.__n, result, 'fio');
	}
	
	AnyBalance.setResult(result);
}
