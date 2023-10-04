/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 YaBrowser/23.9.0.848 (beta) Yowser/2.5 Safari/537.36'
};

var g_fuelType = {
	'ATUM92': 'Атум-92',
	'DTA': 'ДТ-А-К5',
	'DTL': 'ДТ-Л-К5',
	'DTZ': 'ДТ-З-К5',
	'GAS': 'Газ',
	'P80': 'АИ-80-К5',
	'P92': 'АИ-92-К5',
	'P95': 'АИ-95-К5',
	'P98': 'АИ-98-К5',
	'ATUM95': 'Атум-95'
};

var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];
var replaceCardNum = [replaceTagsAndSpaces, /\D/g, '', /.*(\d)(\d\d\d\d)(\d\d\d\d)$/, '$1-$2-$3-****'];

function main(){
	var prefs = AnyBalance.getPreferences();
	
	switch(prefs.source){
    case 'site':
        site();
		break;
	case 'app':
        mobileApp();
		break;
    case 'auto':
    default:
        try{
		    mobileApp();
	    }catch(e){
		    AnyBalance.trace('Ошибка при получении данных через API');
		    if(/парол/.test(e.message))
			    throw new AnyBalance.Error(e.message, false, true);
            if(/заблокирован/.test(e.message))
			    throw new AnyBalance.Error(e.message, false, true);
		    AnyBalance.trace(e.message);
            site();
	    }
        break;
	}
}

function mobileApp(){
    var headers = {
	    'User-Agent': 'ksoap2-android/2.6.0+',
	    'Content-Type': 'text/xml;charset=utf-8',
	    'X-SMP-APPCID': 'd3414113-f962-4d45-b193-6f348ca5f73b',
	    'Accept-Language': 'ru',
	    'X-CSRF-TOKEN': 'FETCH',
	    'Connection': 'Keep-Alive'
    }
	
	var prefs = AnyBalance.getPreferences();
	
	var baseurl = 'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900';
	
	AnyBalance.setDefaultCharset('utf-8');

	AnyBalance.trace('Пробуем войти через API...');
	
	AnyBalance.restoreCookies();
	
	var authToken = AnyBalance.getData('authToken' + prefs.login);
	
	headers.SOAPAction = 'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900/readClientData';
	
	var xml = AnyBalance.requestPost(baseurl, '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:readClientData id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><ATOKEN i:type="d:string">' + authToken + '</ATOKEN></n0:readClientData></v:Body></v:Envelope>', headers);
	
	if(!xml || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сервер API временно недоступен. Попробуйте еще раз позже');
	}
	
	var desk = getXMLValue('CODE');
	
	if(desk && desk != 100){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
		headers.SOAPAction = 'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900/userSignInV3';
	    
	    if(/@/i.test(prefs.login)){
		    AnyBalance.trace('Входить будем по E-mail');
	        var xml = AnyBalance.requestPost(baseurl, '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:userSignInV3 id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><EMAIL i:type="d:string">' + prefs.login + '</EMAIL><CNUM i:type="d:string"></CNUM><REGID i:type="d:string">d3414113-f962-4d45-b193-6f348ca5f73b</REGID><PASSWORD i:type="d:string">' + prefs.password + '</PASSWORD><NOTSMS i:type="d:string"></NOTSMS></n0:userSignInV3></v:Body></v:Envelope>', headers);
	        AnyBalance.trace(xml);
	    }else{
		    AnyBalance.trace('Входить будем по номеру карты');
		    var xml = AnyBalance.requestPost(baseurl, '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:userSignInV3 id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><CNUM i:type="d:string">' + prefs.login + '</CNUM><EMAIL i:type="d:string"></EMAIL><REGID i:type="d:string">d3414113-f962-4d45-b193-6f348ca5f73b</REGID><PASSWORD i:type="d:string">' + prefs.password + '</PASSWORD><NOTSMS i:type="d:string"></NOTSMS></n0:userSignInV3></v:Body></v:Envelope>', headers);
            AnyBalance.trace(xml);
	    }
		
	    var desk = getXMLValue('STAT_DESC');
	    
	    if(desk && /SMS/i.test(desk)){
			AnyBalance.trace('Затребован код подтверждения из SMS');
			
		    headers.SOAPAction = 'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900/userAuthSMS';
		    
		    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на ваш номер телефона', null, {inputType: 'number', minLength: 4, maxLength: 4, time: 180000});
		    
		    if(/@/i.test(prefs.login)){
		        var xml = AnyBalance.requestPost(baseurl, '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:userAuthSMS id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><IV_EMAIL i:type="d:string">' + prefs.login + '</IV_EMAIL><IV_CNUM i:type="d:string"></IV_CNUM><IV_CODE i:type="d:string">'+ code +'</IV_CODE></n0:userAuthSMS></v:Body></v:Envelope>', headers);
                AnyBalance.trace(xml);
		    }else{
		        var xml = AnyBalance.requestPost(baseurl, '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:userAuthSMS id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><IV_CNUM i:type="d:string">' + prefs.login + '</IV_CNUM><IV_EMAIL i:type="d:string"></IV_EMAIL><IV_CODE i:type="d:string">'+ code +'</IV_CODE></n0:userAuthSMS></v:Body></v:Envelope>', headers);
                AnyBalance.trace(xml);
		    }
	    }
	    
	    
	    if(desk && desk != 'Ок')
		    throw new AnyBalance.Error(desk);
	
	    var authToken = getXMLValue('AUTHTOKEN');
		var authToken_pass = getXMLValue('AUTHTOKEN_PASS');
		
	    if(!authToken)
		    throw new AnyBalance.Error('Не удалось получить токен авторизации. Изменения в API?');
	    
        
        headers.SOAPAction = 'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900/readClientData';
	    
	    var xml = AnyBalance.requestPost(baseurl, '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:readClientData id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><ATOKEN i:type="d:string">' + authToken + '</ATOKEN></n0:readClientData></v:Body></v:Envelope>', headers);
	    
		var desk = getXMLValue('CODE');
	    
		if(desk && desk != 100)
		    throw new AnyBalance.Error('Не удалось войти в личный кабинет. Изменения в API?');
	
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	AnyBalance.setData('authToken' + prefs.login, authToken);
	AnyBalance.saveCookies();
	AnyBalance.saveData();

	var result = {success: true};
	
	AnyBalance.trace(xml);
	
	getParam(getXMLValue('LBAL'), result, 'balance', null, null, parseBalance);
	getParam(getXMLValue('FNAME') + ' ' + getXMLValue('LNAME'), result, 'fio', null, null);
	getParam(getXMLValue('CNUM'), result, 'cardNumber', null, replaceCardNum);
	getParam(getXMLValue('CNUM'), result, '__tariff', null, replaceCardNum);
	getParam(getXMLValue('TOWN'), result, 'address', null, null);
	getParam(getXMLValue('EMAIL'), result, 'email', null, null);
	getParam(getXMLValue('MTEL'), result, 'phone', null, replaceNumber);
	
	if(AnyBalance.isAvailable('fuelType')){
		var fuels = getElements(getXMLValue('PTYPE'), /<item/ig, replaceTagsAndSpaces);
		
		if(fuels && fuels.length > 0){
		    for(var i=0; i<fuels.length; ++i){
			    var fuel = fuels[i];
			    sumParam(g_fuelType[fuel]||fuel, result, 'fuelType', null, null, null, create_aggregate_join(',\n '));
			}
		}else{
		    AnyBalance.trace('Не удалось получить информацию по типам топлива');
		    result.fuelType = 'Не выбрано';
	    }
	}
	
	if(AnyBalance.isAvailable('burnPoints', 'burnDate')){
		headers.SOAPAction = 'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900/getExprSoon';
        
        var xml = AnyBalance.requestPost(baseurl, '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:getExprSoon id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><IV_AUTHTOKEN i:type="d:string">' + authToken + '</IV_AUTHTOKEN></n0:getExprSoon></v:Body></v:Envelope>', headers);
        AnyBalance.trace(xml);
		
		getParam(getXMLValue('EV_POINTS'), result, 'burnPoints', null, null, parseBalance);
		var expDate = getXMLValue('EV_DATE');
		if(/0000/i.test(expDate))
			expDate = '';
		getParam(expDate, result, 'burnDate', null, null, parseDateISO);
	}
	
	if(AnyBalance.isAvailable(['accrualPoints', 'redeemPoints', 'operSum', 'operDate', 'operType', 'operPoints'])){
		headers.SOAPAction = 'https://mobilewsp.bashneft.ru/cli/iarelayserver/smp.prod/com.bashneft.azs/sap/bc/srt/scs/sap/z_loy_mobile_ws?sap-client=900/getLoyTransListV3';
	    
		var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
	    var dateFrom = dtPrev.getFullYear() + n2(dtPrev.getMonth()+1) + n2(dtPrev.getDate());
	    var dateTo = dt.getFullYear() + n2(dt.getMonth()+1) + n2(dt.getDate());
		
		var xml = AnyBalance.requestPost(baseurl, '<v:Envelope xmlns:i="http://www.w3.org/2001/XMLSchema-instance" xmlns:d="http://www.w3.org/2001/XMLSchema" xmlns:c="http://schemas.xmlsoap.org/soap/encoding/" xmlns:v="http://schemas.xmlsoap.org/soap/envelope/"><v:Header /><v:Body><n0:getLoyTransListV3 id="o0" c:root="1" xmlns:n0="urn:sap-com:document:sap:rfc:functions"><IV_ATOKEN i:type="d:string">' + authToken + '</IV_ATOKEN><IV_DATE_FROM i:type="d:string">' + dateFrom + '</IV_DATE_FROM><IV_DATE_TO i:type="d:string">' + dateTo + '</IV_DATE_TO></n0:getLoyTransListV3></v:Body></v:Envelope>', headers);
	    AnyBalance.trace(xml);
		
		getParam(getXMLValue('ACCRUAL'), result, 'accrualPoints', null, null, parseBalance);
		getParam(getXMLValue('REDEEM'), result, 'redeemPoints', null, null, parseBalance);
		
		var operations = getElements(getXMLValue('ET_TRANS_TAB'), /<item/ig);
		
		if(operations && operations.length > 0){
			AnyBalance.trace('Найдено операций: ' + operations.length);
			for(var i=operations.length-1; i>=0; i--){
			    var xml = operations[i];
				getParam(getXMLValue('SUMMA'), result, 'operSum', null, null, parseBalance);
	            getParam(getXMLValue('DATE'), result, 'operDate', null, null, parseDateISO);
				getParam(getXMLValue('VID_DESC'), result, 'operType', null, null);
				getParam(getXMLValue('POINTS'), result, 'operPoints', null, null, parseBalance);
				
				break;
			}
		}else{
		    AnyBalance.trace('Не удалось получить информацию по операциям');
	    }
	}

	AnyBalance.setResult(result);

    function getXMLValue(find){
        const re = new RegExp('<' + find + '>([\\s\\S]*?)</' + find + '>');
        return getParam(xml, re)
    }
}

function site() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://bashneft-azs.ru/';
	
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	AnyBalance.trace('Пробуем войти через сайт...');
	
	AnyBalance.restoreCookies();
	
	var html = AnyBalance.requestGet(baseurl + 'loyalty/personal/', g_headers);
	
    if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if (!/Выход|out=yes/i.test(html)) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
		
		html = AnyBalance.requestGet(baseurl + 'loyalty/personal/', g_headers);
		
		var form = getElement(html, /<form[^>]+name=""[^>]*>/i);
        if(!form){
        	AnyBalance.trace(form);
        	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {
	   		if(name == 'userLoginForm_login') {
	   			return prefs.login;
    		}else if(name == 'userLoginForm_pswrd'){
	    		return prefs.password;
	    	}else if(name == 'recaptcha_response'){
				return solveRecaptcha('Пожалуйста, докажите, что вы не робот', 'https://bashneft-azs.ru/', JSON.stringify({SITEKEY: '6Lc14VYkAAAAAFc4La-w4vnSUAPLpXD28LijszbN', TYPE: 'V3', ACTION: 'login', USERAGENT: g_headers['User-Agent']}));
	    	}
	        
	    	return value;
	    });
		
	    var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		
		html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
			'Content-Type': 'application/x-www-form-urlencoded',
			'Origin': 'https://bashneft-azs.ru',
            'Referer': 'https://bashneft-azs.ru/'
        }));
	    
	    if (!/Выход|out=yes/i.test(html)) {
		    if(/Технические работы/i.test(html))
			    throw new AnyBalance.Error('Личный кабинет временно не доступен в связи с проводимыми техническими работами');
            
		    var error = getParam(html, null, null, /<div\s+class='notification is-danger'>([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);
		    if (error) {
               	throw new AnyBalance.Error(error, null, /логин|парол|неверн|не пройден/i.test(error));
		    }
		    
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	    }
    }else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	AnyBalance.saveCookies();
	AnyBalance.saveData();
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Ваш баланс[\s\S]*?<div[^>]*>([\s\S]+?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /<div\s+class="lk_left_info_block">[\s\S]*?<div\s+class="text">([\s\S]+?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Ваша карта[\s\S]*?<div[^>]*>№?([\s\S]+?)<\/div>/i, replaceCardNum);
	getParam(html, result, 'cardNumber', /Ваша карта[\s\S]*?<div[^>]*>№?([\s\S]+?)<\/div>/i, replaceCardNum);
	
	if(AnyBalance.isAvailable(['accrualPoints', 'redeemPoints', 'operSum', 'operDate', 'operType', 'operPoints'])){
		var dt = new Date();
	    var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-1, dt.getDate());
	    var dateFrom = n2(dtPrev.getDate()+1) + '.' + n2(dtPrev.getMonth()+1) + '.' + dtPrev.getFullYear();
	    var dateTo = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear();
		
		html = AnyBalance.requestGet(baseurl + 'loyalty/personal/orders/?from=' + dateFrom + '&to=' + dateTo, g_headers);
		
		getParam(html, result, 'accrualPoints', /Итого начислено бонусов:[\s\S]*?itog_value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'redeemPoints', /Итого потрачено бонусов:[\s\S]*?itog_value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		
		var operTable = getElement(html, /<div[^>]+class="info_table_block"[^>]*>/i);
		var operations = getElements(operTable, /<a[^>]+table_row[^>]*>/ig);
		
		if(operations && operations.length > 0){
			AnyBalance.trace('Найдено операций: ' + operations.length);
			for(var i=0; i<operations.length; ++i){
			    var operation = operations[i];
				getParam(operation, result, 'operSum', /data-rub="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
	            getParam(operation, result, 'operDate', /data-date="([^"]*)/i, replaceTagsAndSpaces, parseDate);
				getParam(operation, result, 'operType', /data-type="([^"]*)/i, replaceTagsAndSpaces);
				getParam(operation, result, 'operPoints', /data-points="([^"]*)/i, replaceTagsAndSpaces);
				
				break;
			}
		}else{
		    AnyBalance.trace('Не удалось получить информацию по операциям');
	    }
	}
	
	if(AnyBalance.isAvailable(['address', 'email', 'phone', 'fuelType'])){
		html = AnyBalance.requestGet(baseurl + 'loyalty/personal/settings/', g_headers);
		
		getParam(html, result, 'address', /Насел[её]нный пункт[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
		getParam(html, result, 'email', /E-mail[\s\S]*?value="([^"]*)/i, replaceTagsAndSpaces);
	    getParam(html, result, 'phone', /Мобильный телефон[\s\S]*?value="([^"]*)/i, replaceNumber);
		
		if(AnyBalance.isAvailable('fuelType')){
			var fuelSelector = getElement(html, /<select[^>]+userRegistrationForm_fuelType[^>]*>/i);
		    var fuels = getElements(fuelSelector, [/<option[^>]*>/ig, /selected/i]);
		    
		    if(fuels && fuels.length > 0){
		        for(var i=0; i<fuels.length; ++i){
			        var fuel = fuels[i];
			        sumParam(fuel, result, 'fuelType', /<option[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, null, create_aggregate_join(',\n '));
			    }
		    }else{
		        AnyBalance.trace('Не удалось получить информацию по типам топлива');
		        result.fuelType = 'Не выбрано';
	        }
	    }
	}

	AnyBalance.setResult(result);
}