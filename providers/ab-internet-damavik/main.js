/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
	'Origin':'https://mydom.velcom.by',
};

function parseBalanceRK(_text) {
  var text = _text.replace(/\s+/g, '');
  var rub = getParam(text, null, null, /(-?\d[\d\.,]*)руб/i, replaceTagsAndSpaces, parseBalance) || 0;
  var _sign = rub < 0 || /-\d[\d\.,]*руб/i.test(text) ? -1 : 1;
  var kop = getParam(text, null, null, /(-?\d[\d\.,]*)коп/i, replaceTagsAndSpaces, parseBalance) || 0;
  var val = _sign*(Math.abs(rub) + kop / 100);
  AnyBalance.trace('Parsing balance (' + val + ') from: ' + _text);
  return val;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'https://my.velcom.by/';
    AnyBalance.setDefaultCharset('utf-8'); 
	
    var html = AnyBalance.requestGet(baseurl, g_headers);
    var sid;
	
	try {
		
		var form = AB.getElement(html, /<form[^>]+asmpform/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удаётся найти форму входа! Сайт изменен?');
		}
	    
		var params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'UserIDFixed') {
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
	    
		html = AnyBalance.requestPost(url, params, AB.addHeaders({
			Referer: AnyBalance.getLastUrl()
		}));
		
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
                throw new AnyBalance.Error('ИССА Velcom временно недоступна. Пожалуйста, попробуйте позже.');
            
			AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
        }
		// Иногда сервис недоступен, дальше идти нет смысла
		if (/По техническим причинам работа с сервисами ограничена|Сервис временно недоступен/i.test(html)) {
			var message = getParam(html, null, null, /<div class="BREAK">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
			if(message) {
				AnyBalance.trace('Сайт ответил: ' + message);
				throw new AnyBalance.Error('ИССА Velcom временно недоступна.\n ' + message);
			}
			
			throw new AnyBalance.Error('ИССА Velcom временно недоступна. Пожалуйста, попробуйте позже.');
		}	
		
        var result = {success: true};
        
        var sid = getParam(html, /<input[^>]+name="sid3"[^>]*value="([^"]*)/i, replaceHtmlEntities);
        if(!sid){
			if(AnyBalance.getLastStatusCode() >= 400){
				var error = getParam(html, null, null, /<h1[^>]*>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces, html_entity_decode);
				if(error)
					throw new AnyBalance.Error(error);
				throw new AnyBalance.Error('Сайт временно недоступен. Пожалуйста, попробуйте ещё раз позднее.');
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
        
		
		if(isAvailable(['trafic', 'trafic_total'])) {
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
            sumParam(html, result, 'traffic', new RegExp(n2(dt.getMonth() + 1) + '\\.' + dt.getFullYear() + '[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>', 'ig'),
                replaceTagsAndSpaces, parseBalance, aggregate_sum);
		}

        AnyBalance.setResult(result);

	} catch(e) {
		throw e;
	} finally {
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
		} catch(e) {
			AnyBalance.trace('Ошибка при выходе из кабинета: ' + e.message);
		}
	}
	
    AnyBalance.setResult(result);
}

function n2(val){
	val = val + '';
	if(val.length < 2)
		val = '0' + val;
	return val;
}