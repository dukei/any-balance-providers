/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'u-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': 'https://www.dns-shop.ru',
	'Referer': 'https://www.dns-shop.ru/',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
};

var baseurl = 'https://www.dns-shop.ru/';
var baseurlApi = 'https://restapi.dns-shop.ru/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/@|^\d{10}$/.test(prefs.login), 'Введите e-mail или телефон (10 цифр без пробелов и разделителей)!');
	
	if(!/@/.test(prefs.login))
		prefs.login = '7' + prefs.login;
	
	if(AnyBalance.getData('login') === prefs.login)
    	AnyBalance.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + 'profile/menu/', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 403){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
    if(AnyBalance.getLastStatusCode() == 401 || !/href="\/logout\/"/i.test(html)){
	    AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookiesExceptProtection();
	    
		var html = loadProtectedPage((baseurl + 'profile/menu/', g_headers));
	    
	    var csrf = getParam(html, /name="csrf-token" content="([^"]*)/i);
		
		if(!csrf){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось получить токен авторизации. Сайт изменен?');
		}
		
		html = AnyBalance.requestGet(baseurl + 'auth/auth/get-csrf-token/', g_headers);
		
		if(!prefs.password && /^\d+$/.test(prefs.login)){
			AnyBalance.trace('Входим по номеру телефона и коду подтверждения...');
			
		    var formattedLogin = prefs.login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, '+7 $1 $2-$3-$4');
			
			html = AnyBalance.requestPost(baseurl + 'auth/auth/fast-authorization/', {
			    'FastAuthorizationLoginLoadForm[login]': prefs.login,
				'FastAuthorizationLoginLoadForm[isPhoneCall]': 1,
			    'FastAuthorizationLoginLoadForm[token]': ''
		    }, addHeaders({
			    'Referer': baseurl + 'profile/menu/no-referrer',
			    'X-Csrf-Token': csrf,
                'X-Requested-With': 'XMLHttpRequest'
		    }));
			
			var json = getJson(html);
			
			if(json.result != true){
			    var error = json.message;
			    if(error)
				    throw new AnyBalance.Error(error, null, /Номер|телефон|код/i.test(error));
			    
	    	    AnyBalance.trace(html);
	    	    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		    }
			
			var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения из звонка, поступившего на номер ' + formattedLogin, null, {time: 180000, inputType: 'number'});
			
			html = AnyBalance.requestPost(baseurl + 'auth/auth/check-code/', {
			    'CheckCodeLoadForm[login]': prefs.login,
			    'CheckCodeLoadForm[code]': code
		    }, addHeaders({
			    'Referer': baseurl + 'profile/menu/no-referrer',
			    'X-Csrf-Token': csrf,
                'X-Requested-With': 'XMLHttpRequest'
		    }));
		}else{
			AnyBalance.trace('Входим по логину и паролю...');
			
			checkEmpty(prefs.password, 'Введите пароль!');
			
		    html = AnyBalance.requestPost(baseurl + 'auth/auth/login-password-authorization/', {
			    'LoginPasswordAuthorizationLoadForm[login]': prefs.login,
				'LoginPasswordAuthorizationLoadForm[password]': prefs.password,
			    'LoginPasswordAuthorizationLoadForm[token]': ''
		    }, addHeaders({
			    'Referer': baseurl + 'profile/menu/no-referrer',
			    'X-Csrf-Token': csrf,
                'X-Requested-With': 'XMLHttpRequest'
		    }));
		}
		
	    var json = getJson(html);
		
		AnyBalance.trace('Авторизация: ' + JSON.stringify(json));
		
	    if(json.result != true){
			var error = json.message;
			if(error)
				throw new AnyBalance.Error(error, null, /E-mail|телефон|парол|код/i.test(error));
			
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		}
		
		html = AnyBalance.requestGet(baseurl + 'profile/menu/', g_headers);
		
		AnyBalance.setData('login', prefs.login);
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
		AnyBalance.saveCookies();
    	AnyBalance.saveData();
	}

	var result = {success: true};
	
	var html = AnyBalance.requestGet(baseurlApi + 'v1/get-user-profile', g_headers);
	
	var json = getJson(html);
	
	AnyBalance.trace('Профиль: ' + JSON.stringify(json));
	
	getParam(json.data.points, result, 'balance', null, null, parseBalance);
	getParam(json.data.level, result, 'level', null, null, parseBalance);

    getParam(json.data.reg_date, result, 'regdate', null, null, parseDateISO);
	getParam(json.data.email, result, 'email');
	getParam(json.data.phone, result, 'phone', null, replaceNumber);
	getParam(json.data.username, result, 'username');
	
	var person = {};
	sumParam(json.data.firstName, person, '__n', null, null, null, create_aggregate_join(' '));
//	sumParam(json.data.middleName, person, '__n', null, null, null, create_aggregate_join(' '));
	sumParam(json.data.lastName, person, '__n', null, null, null, create_aggregate_join(' '));
	getParam(person.__n, result, 'fio', null, null, capitalFirstLetters);
	getParam(person.__n, result, '__tariff', null, null, capitalFirstLetters);
	
	if(AnyBalance.isAvailable('prozapass', 'prozapass_inactive', 'clubcoins')){
    	var html = AnyBalance.requestGet(baseurl + 'profile/prozapass/', g_headers);
		
		getParam(html, result, 'prozapass', /ProZaPass[\s\S]*?"profile-bonuses__pzp-balance-value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'prozapass_inactive', /Неактивные бонусы[\s\S]*?"profile-bonuses__pzp-inactive-value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'clubcoins', /Клубкоины[\s\S]*?"profile-bonuses__clubcoins-balance-value"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(AnyBalance.isAvailable(['lastordernum', 'lastordersum', 'lastorderdate', 'lastorderbon', 'lastorderitems', 'lastorderstatus', 'lastorderdesc'])){
		var html = AnyBalance.requestGet(baseurlApi + 'v1/profile-orders-get-list?page=1&tab=all', addHeaders({
			'Cityid': '30b7c1f3-03fb-11dc-95ee-00151716f9f5', // Москва по умолчанию
			'Lang': 'ru',
			'X-Requested-With': 'XMLHttpRequest'
		}));
        
		var json = getJson(html);
		
		AnyBalance.trace('Заказы: ' + JSON.stringify(json));
	    
	    var o = json.data && json.data.groups && json.data.groups["Личные заказы"];
	    if(o && o.length > 0){
	    	AnyBalance.trace('Найдено последних заказов: ' + o.length);
			
			getParam(o[0].number, result, 'lastordernum');
	    	getParam(o[0].price, result, 'lastordersum', null, null, parseBalance);
	    	getParam(o[0].date, result, 'lastorderdate', null, null, parseDateISO);
	    	getParam(o[0].bonus, result, 'lastorderbon', null, null, parseBalance);
			getParam(o[0].products.length, result, 'lastorderitems', null, null, parseBalance);
	    	getParam(o[0].statusTitle, result, 'lastorderstatus');
			
			if(AnyBalance.isAvailable('lastorderdesc')){
				var p = o[0].products;
				
				if(p && p.length > 0){
				    for(var j=0; j<p.length; ++j){
						var count = getParam(p[j].count + '', null, null, null, null, parseBalanceSilent);
				        var cost = getParam(p[j].price + '', null, null, null, null, parseBalanceSilent);
				        
				        sumParam(p[j].title + ': ' + count + ' шт x ' + cost + ' ₽', result, 'lastorderdesc', null, null, null, create_aggregate_join(',\n '));
		            }
				}else{
 	    	        AnyBalance.trace('Не удалось получить данные по продуктам последнего заказа');
 	            }
			}
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему заказу');
 	    }
	}
		
	if(AnyBalance.isAvailable('favorites')){
	    var html = AnyBalance.requestGet(baseurlApi + 'v1/get-wishlist-count', addHeaders({
			'Cityid': '30b7c1f3-03fb-11dc-95ee-00151716f9f5', // Москва по умолчанию
			'Lang': 'ru',
			'X-Requested-With': 'XMLHttpRequest'
		}));
	    
	    var json = getJson(html);
		
		AnyBalance.trace('Избранное: ' + JSON.stringify(json));
	
	    getParam(json.data, result, 'favorites', null, null, parseBalance);
	}
    
	AnyBalance.setResult(result);
}

function loadProtectedPage(headers){
	var prefs = AnyBalance.getPreferences();
	const url = 'https://www.dns-shop.ru/';

    var html = AnyBalance.requestGet(url, headers);
    if(/__qrator/.test(html) || AnyBalance.getLastStatusCode() == 401) {
        AnyBalance.trace("Обнаружена защита от роботов. Пробуем обойти...");
        clearAllCookies();

        const bro = new BrowserAPI({
            provider: 'dns-shop',
            //userAgent: g_headers["User-Agent"],
	    incognito: true,
	    singlePage: true,
            headful: true,
	    noInterception: true,
            rules: [{
                url: /^data:/.toString(),
                action: 'abort',
            },{
                accept: /^(image|css|font|script)$/.toString(),
                action: 'abort',
            }, {
                url: /_qrator\/qauth_utm_v2(?:_\w+)?\.js/.toString(),
                action: 'cache',
                valid: 3600*1000
            }, {
                url: /_qrator/.toString(),
                action: 'request',
            }, {
                url: /\.(png|jpg|ico|svg|woff2|css)/.toString(),
                action: 'abort',
            }, {
                url: /a\.dns-shop\.ru/i.toString(),
                action: 'abort',
            }, {
                url: /dns-shop\.ru/i.toString(),
                action: 'request',
            }, {
		        url: /.*/.toString(),
		        action: 'abort'
            }],
            //additionalRequestHeaders: [{
            //    headers: {
		//	        'User-Agent': g_headers["User-Agent"]
		//        }
		//    }],
            debug: AnyBalance.getPreferences().debug
        });

        const r = bro.open(url);
        try {
            bro.waitForLoad(r.page);
            html = bro.content(r.page).content;
            const cookies = bro.cookies(r.page, url);
            BrowserAPI.useCookies(cookies);
        } finally {
            bro.close(r.page);
        }

        if(/__qrator|HTTP 40[31]/.test(html)||AnyBalance.getLastStatusCode() >= 400)
            throw new AnyBalance.Error('Не удалось обойти защиту. Сайт изменен?');

        AnyBalance.trace("Защита от роботов успешно пройдена");
        AnyBalance.saveCookies();
    	AnyBalance.saveData();

    }

    return html;
}

function clearAllCookiesExceptProtection(){
	clearAllCookies(function(c){return!/qrator/i.test(c.name)})
}