/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html, */*; q=0.01',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36',
};

function getCsrfToken(html){
	return getParam(html, null, null, /name="_csrf" content="([^"]+)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	mainApi();
}

function callApi(verb, params, method){
    var baseurl = 'https://api.ulmart.ru/api/u/';
    
   	var html = AnyBalance.requestPost(baseurl + verb, params ? JSON.stringify(params) : null, {
		'Content-Type': 'application/json; charset=utf-8',
		'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 6.0.1; D6503 Build/23.5.A.0.575)'
   	}, {HTTP_METHOD: method || (params ? 'POST' : 'GET')});

   	var json = getJson(html);
   	if(json.error){
   		AnyBalance.trace('Error calling ' + verb + ': ' + html);
   		throw new AnyBalance.Error(json.message);
   	}
   		
   	return json;
}

function mainApi(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.restoreCookies();

    var json = callApi('v1_0/meta/partnerLogin', {
    	"login":"mobile_app",
    	"password":"wj78a73kF2kch",
    	"clientInfo": {
    		"ip":"192.168.1.35",
    		"agent":"mobile-app-android"
    	}
    });

    json = callApi('v1_0/app/common/guessCity?show_post_cities=false');
    json = callApi('v1_0/app/common/city/' + json.id, null, 'PUT');

    try{
    	if(!AnyBalance.getData('login'))
    		throw new AnyBalance.Error('Вход ещё не был осуществлен');

    	if(AnyBalance.getData('login') != prefs.login)
    		throw new AnyBalance.Error('Вход ранее был осуществлен на другой логин');

    	json = callApi('v1_0/app/user');

    	AnyBalance.trace('Вошли с сохраненной сессией');
    }catch(e){
    	AnyBalance.trace('Не удалось войти автоматически: ' + e.message);

        json = callApi('authcaptcha');
        var code = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', json.captchaBase64);
        
        json = callApi('v1_0/app/user/login', {
        	"email": prefs.login,
        	"password": prefs.password,
        	"captcha": code
        });

        AnyBalance.setData('login', prefs.login);
    }

    AnyBalance.saveCookies();
    AnyBalance.saveData();

    var result = {success: true};

    var clientTypes = {
    	RETAIL_CUSTOMER: {name: "Розничный клиент", price: 1},
        REGULAR_CUSTOMER: {name: "Постоянный клиент", price: 2},
        FRIEND: {name: "Для друзей", price: 3},
        BIG_WHOLESALE_CUSTOMER: {name: "Крупнооптовый клиент", price: 4},
        DEALER: {name: "Дилер", price: 5},
        SUPERDEALER: {name: "Супер дилер", price: 6},
        PURCHASE: {name: "Закупочная", price: 7},
        RETAIL_CUSTOMER_TERMINAL: {name: "Розничный клиент (КМ)", price: 1},
    };
    
    getParam(json.xxlBonus, result, 'balance');
    getParam(json.fio, result, 'fio');
    getParam(json.agentId, result, 'agentId');
    getParam(clientTypes[json.userType].price, result, 'price');
    getParam(clientTypes[json.userType].name, result, '__tariff');

    AnyBalance.setResult(result);
}

function mainSite(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.ulmart.ru/';
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	var byphone = /^\+\d+$/.test(prefs.login);

	if(/loginCaptcha/i.test(html)){
		var imgUrl = getParam(html, null, null, /<img[^>]+id="captchaImg"[^>]*src="\/([^"]*)/i, null, html_entity_decode);
		var img = AnyBalance.requestGet(baseurl + imgUrl, g_headers);
		var captcha = AnyBalance.retrieveCode('Введите код с картинки', img);
	}

	html = AnyBalance.requestPost(baseurl + 'j_spring_security_check', {
		'target': '/',
		'_csrf':getCsrfToken(html),
		'enterby': byphone ? 'email' : 'phone',
        'phone':byphone ? prefs.login : '',
        'email':byphone ? '' : prefs.login,
        'j_password':prefs.password,
        'loginCaptcha': captcha
    }, addHeaders({Referer: baseurl + 'login'}));
	
    if(!/\/logout/.test(html)){
    	var form = getElement(html, /<form[^>]+id="changeContractorForm"[^>]*>/i);
    	if(form){
    		//Надо выбрать контракт
    		var contractor = getElement(form, new RegExp('<span[^>]+id="contractor[^"]*' + (prefs.num || '') + '"[^>]*>', 'i'));
    		if(!contractor){
    			AnyBalance.trace(form);
    			throw new AnyBalance.Error(prefs.num ? 'Не удалось найти контрактора с номером ' + prefs.num : 'Не удалось найти ни одного контрактора');
    		}

    		var name = getParam(contractor, null, null, null, replaceTagsAndSpaces, html_entity_decode);
    		AnyBalance.trace('Контрактор: ' + name);
    		var contractorId = getParam(contractor, null, null, /uniChangeContractor\(\s*'([^']*)/i, replaceSlashes);

    		html = AnyBalance.requestPost(baseurl + 'cabinet/contractor', {agentId: contractorId}, addHeaders({
				Referer: baseurl, 
				'X-Requested-With':'XMLHttpRequest', 
				'X-CSRF-TOKEN': getCsrfToken(html)
			}));

			html = AnyBalance.requestGet(baseurl + html, g_headers);
    	}
    }

    if(!/\/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]+(?:b-box_error|alert-danger)[^>]*>([\s\S]*?)(?:<\/div>)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Неправиль.*пароль/i.test(error));
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};
	
    getParam(html, result, 'fio', />\s*Личный кабинет(?:[^>]*>){7}\s*<div[^>]*class="dropdown[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'price', /цена(?:&nbsp;|\s)+(\d+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="b-dropdown-popup__info"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<ul/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable(['subaccountall', 'subaccounts', 'balance'])){
		html = AnyBalance.requestGet(baseurl + 'cabinet/bonus', addHeaders({
			Referer: baseurl + 'cabinet?v=bonus', 
			'X-Requested-With':'XMLHttpRequest', 
			'X-CSRF-TOKEN': getCsrfToken(html)
		}));
		
		getParam(html, result, 'balance', /XXL-бонус:([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'subaccounts', /вашей сети[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		
		var list = getParam(html, null, null, /(<ul>[\s\S]*?<\/ul>)\s*<\/div/i);
		if(list){
			var subaccountall = '';
			var li = sumParam(list, null, null, /<li[^>]*>[\s\S]*?<\/li>/ig);
			for(i=0; i< li.length; i++){
				subaccountall += getParam(li[i], null, null, null, replaceTagsAndSpaces, html_entity_decode) +'\n';
			}
			if(subaccountall)
				getParam(subaccountall, result, 'subaccountall');
		}
	}	
    AnyBalance.setResult(result);
}
