/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
	'Accept-Language': 'en-US,en;q=0.9',
	'Connection': 'keep-alive',
	'Cache-Control': 'max-age=0',
    'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	'Origin': 'https://my.a1.by',
};

var velcomOddPeople = 'Не удалось войти в личный кабинет. Сайт изменен?';

function parseBalanceRK(_text) {
  var text = _text.replace(/\s+/g, '');
  var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceTagsAndSpaces, parseBalance) || 0;
  var _sign = rub < 0 || /-\d[\d\.,]*руб/i.test(text) ? -1 : 1;
  var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceTagsAndSpaces, parseBalance) || 0;
  var val = _sign*(Math.abs(rub) + kop / 100);
  AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
  return val;
}

function getDomain(url){
	return getParam(url, /^(https?:\/\/[^\/]*)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите номер лицевого счета!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if (prefs.login.length > 12 || prefs.login.length < 6)
		throw new AnyBalance.Error('Неверный формат номера. Номер лицевого счета должен содержать от 6 до 12 символов!', false, true);
//	if (prefs.password.length > 20 || prefs.password.length < 8)
//		throw new AnyBalance.Error('Неверный формат пароля. Пароль должен содержать от 8 до 20 символов!', false, true);
	
    var baseurl = 'https://my.a1.by/';
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
	
	var sid;
	
	try {
		
		var form = getElement(html, /<form[^>]*name="asmpform"/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
		}
	    
		var params = createFormParams(form, function(params, str, name, value) {
			if (name == 'pinCheck') {
				return 'false';
			}else if (name == 'UserIDFixed') {
				return prefs.login;
			} else if (name == 'fixedPassword') {
				return prefs.password;
			} else if (name == 'fixednet') {
				return 'true';
			}
	    
			return value;
		});

		var action = getParam(form, /action="([^"]*)/i, replaceHtmlEntities);
		var url = joinUrl(AnyBalance.getLastUrl(), action);
	    
		html = AnyBalance.requestPost(url, params, addHeaders({Referer: AnyBalance.getLastUrl()}));
		
        if(/user_input_3/i.test(html)){ // Требуется выбрать версию кабинета для перехода. Выбираем старую
			var form = getElement(html, /<form[^>]*name="mainForm"/i);
            if(!form){
	    	    AnyBalance.trace(html);
	    	    throw new AnyBalance.Error('Не удалось найти форму выбора версии кабинета. Сайт изменен?');
            }
	        
	        var params = createFormParams(form, function(params, str, name, value) {
	    	    if(name === 'user_input_timestamp'){
	    		    value = new Date().getTime();
	    	    }else if(name === 'user_input_0'){
	    		    value = '_next';
	    	    }else if(name === 'user_input_3'){
	    		    value = 1;
	    	    }
	    	    if(!name)
	    		    return;
	    	    return value || '';
            });
            delete params.user_submit;
            var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
            var referer = AnyBalance.getLastUrl();
		    html = requestPostMultipart(joinUrl(referer, action), params, addHeaders({Referer: referer, Origin: getDomain(referer)}));
	    }
		
		var kabinetType, personalInfo;
		if(/_root\/PERSONAL_INFO_FISICAL/i.test(html)) {
            personalInfo = 'PERSONAL_INFO_FISICAL';
            kabinetType = 5;		
		} else if(/_root\/PERSONAL_INFO/i.test(html)){
            personalInfo = 'PERSONAL_INFO';
            kabinetType = 2;
        }
		
		AnyBalance.trace('Cabinet type: ' + kabinetType);
		
        if(!kabinetType){
            var error = getElement(html, /<[^>]*p--error/i, replaceTagsAndSpaces);
            if(error)
                throw new AnyBalance.Error(error, null, /не зарегистрирован|Неверно указан номер|номер телефона|парол/i.test(error));
            if(/Сервис временно недоступен/i.test(html))
                throw new AnyBalance.Error('Сервис временно недоступен. Пожалуйста, попробуйте позже.');
            
			AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
		// Иногда сервис недоступен, дальше идти нет смысла
		if (/По техническим причинам работа с сервисами ограничена|Сервис временно недоступен/i.test(html)) {
			var message = getParam(html, null, null, /<div class="BREAK">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
			if(message) {
				AnyBalance.trace('Сайт ответил: ' + message);
				throw new AnyBalance.Error('Сервис временно недоступен.\n ' + message);
			}
			
			throw new AnyBalance.Error('Сервис временно недоступен. Пожалуйста, попробуйте позже.');
		}	
		
        var result = {success: true};
        
        var sid = getParam(html, /<input[^>]+name="sid3"[^>]*value="([^"]*)/i, replaceHtmlEntities);
        if(!sid){
			if(AnyBalance.getLastStatusCode() >= 400){
				var error = getParam(html, null, null, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
				if(error)
					throw new AnyBalance.Error(error);
				throw new AnyBalance.Error('Сервис временно недоступен. Пожалуйста, попробуйте позже.');
			}
			AnyBalance.trace(html);
			throw new AnyBalance.Error(velcomOddPeople);
        }
        
		//Персональная информация
        html = requestPostMultipart(baseurl + 'work.html', {
            sid3: sid,
            user_input_timestamp: new Date().getTime(),
            user_input_0: '_next',
            last_id: '',
            user_input_1: personalInfo,
        }, addHeaders({
        	Referer: baseurl
        }));
		
		getParam(html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalanceRK);
		getParam(html, result, 'userName', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		getParam(html, result, 'acc', /Лицевой счет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        getParam(html, result, 'status', /Статус л\/с:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
        
		
		if(isAvailable(['traffic_used', 'traffic_total'])) {
            html = requestPostMultipart(baseurl + 'work.html', {
                sid3: sid,
                user_input_timestamp: new Date().getTime(),
                user_input_0: '_root/STATISTIC',
                last_id: '',
                user_input_1: '0',
                user_input_2: '',
            }, addHeaders({
            	Referer: baseurl
            }));

            html = requestPostMultipart(baseurl + 'work.html', {
                sid3: sid,
                user_input_timestamp: new Date().getTime(),
                user_input_0: '_next',
                last_id: '',
                user_input_1: 'STATISTIC_OF_TRAFFIC',
            }, addHeaders({
            	Referer: baseurl
            }));

            html = requestPostMultipart(baseurl + 'work.html', {
                sid3: sid,
                user_input_timestamp: new Date().getTime(),
                user_input_0: '_next',
                last_id: '',
                user_input_1: '1',
            }, addHeaders({
            	Referer: baseurl
            }));

            getParam(html, result, 'traffic_total', /ИТОГО[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

            var dt = new Date();
            sumParam(html, result, 'traffic_used', new RegExp(n2(dt.getMonth() + 1) + '\\.' + dt.getFullYear() + '[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>', 'ig'),
                replaceTagsAndSpaces, parseBalance, aggregate_sum);
		}
		
	    try{
	    // Выходим из кабинета, чтобы снизить нагрузку на сервер
		    AnyBalance.trace('Выходим из кабинета, чтобы снизить нагрузку на сервер');
		    html = requestPostMultipart(baseurl + 'work.html', {
			    sid3: sid,
			    user_input_timestamp: new Date().getTime(),
			    user_input_0: '_exit',
			    user_input_1: '',
			    last_id: ''
		    }, g_headers);
			clearAllCookies();
	    } catch(e) {
		    AnyBalance.trace('Ошибка при выходе из кабинета: ' + e.message);
	    }

	} catch(e) {
		throw e;
	}
	
    AnyBalance.setResult(result);
}
