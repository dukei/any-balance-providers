/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Language': 'en-GB,en;q=0.9,ru-RU;q=0.9,ru;q=0.8,en-US;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.komiesc.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }

	var form = getElement(html, /<form[^>]+user-login-form[^>]*>/i);
	if(!form){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
		if(name == 'name'){
	   		return prefs.login;
    	}else if(name == 'pass'){
	    	return prefs.password;
	    }
		
		return value;
	});
	
	var action = getParam(form, null, null, /<form[\s\S]*?action="([^"]*)/i, replaceHtmlEntities);
	
	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({Referer: baseurl + 'login'}));
	
    if(!/logout/i.test(html)){
		var error = getParam(html, null, null, /<div[^>]+class="messages error"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	    if(error)
		    throw new AnyBalance.Error(error, null, /пользовател|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	if(/info_messages/i.test(AnyBalance.getLastUrl())){
		AnyBalance.trace('Сайт вывел информационное сообщение. Переходим принудительно');
		
		html = AnyBalance.requestGet(baseurl, g_headers);
	}
	
	if(/maindata_u/i.test(AnyBalance.getLastUrl())){
		AnyBalance.trace('Мы в кабинете для юридических лиц. Получаем основные данные');
		var token = getParam(html, null, null, /<div[^>]+dummy-block-token="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
		
		html = AnyBalance.requestGet('https://cabinet.komiesc.ru:8080/load2_content/data_request?token=' + token, g_headers);
		
		var info = JSON.parse(html).content;
		
		if(!info){
		    var tries = 0, maxTries = 10;
		    do{
			    AnyBalance.trace('Не удалось получить основные данные. Повторная попытка: ' + (tries + 1) + ' из ' + maxTries);
			    html = AnyBalance.requestGet(baseurl + 'maindata_u', g_headers);
			
			    token = getParam(html, null, null, /<div[^>]+dummy-block-token="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
			
		        html = AnyBalance.requestGet('https://cabinet.komiesc.ru:8080/load2_content/data_request?token=' + token, g_headers);
		
		        var info = JSON.parse(html).content;
			    AnyBalance.trace('Сервер вернул: ' + html);
		    }while(!info && (++ tries < maxTries));
		}
		
		if(info && info == null){
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось получить основные данные. Попробуйте еще раз позже');
	    }
		
		if(info && !/content_table/i.test(info)){
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Данных для отображения не найдено. Попробуйте еще раз позже');
	    }
		
		if(!info){
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось получить основные данные. Сайт изменен?');
	    }
		
        result.account = prefs.login;
		result.__tariff = prefs.login;
        
	    getParam(info, result, 'fio', /Покупатель[\s\S]*?tcell[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'servicecontract', /Номер договора[\s\S]*?tcell[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(info, result, 'servicebalance', /Состояние расчетов[\s\S]*?tcell[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, 'долг', '-'], parseBalance);
	    getParam(info, result, 'serviceprovider', /Продавец[\s\S]*?tcell[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
		    
        getParam(info, result, 'balance', /Состояние расчетов[\s\S]*?tcell[^>]*>([\s\S]*?)<\/td>/i, [replaceTagsAndSpaces, 'долг', '-'], parseBalance);
	}else{
		AnyBalance.trace('Мы в кабинете для физиических лиц. Получаем данные по договорам');
		
		html = AnyBalance.requestGet(baseurl + 'cabinet', g_headers);
	
	    getParam(html, result, 'account', /<div[^>]+id="client_no">[\s\S]*?Номер клиента:\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	    getParam(html, result, '__tariff', /<div[^>]+id="client_no">[\s\S]*?Номер клиента:\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	    getParam(html, result, 'lodgers', /Кол-во проживающих:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'address', /Адрес:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	    getParam(html, result, 'fio', /Покупатель:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
	
	    // Получаем услуги
	    var info = getElement(html, /<div[^>]+class="info_column_block"[^>]*>/i);
		
		if(!info){
		    AnyBalance.trace(html);
		    throw new AnyBalance.Error('Не удалось получить информацию. Сайт изменен?');
	    }
		
	    var services = getElements(info, /<div[^>]+class="info_column_secondary"[^>]*>/ig);
	    
	    if(services && services.length > 0){
		    AnyBalance.trace('Найдено договоров: ' + services.length + '. Получаем информацию по каждому договору');
	        for(var i=0; i<services.length; ++i){
	            var service = services[i];
		        var scontract = (i >= 1 ? 'servicecontract' + (i + 1) : 'servicecontract');
		        var sbalance = (i >= 1 ? 'servicebalance' + (i + 1) : 'servicebalance');
	            var sprovider = (i >= 1 ? 'serviceprovider' + (i + 1) : 'serviceprovider');
                
                getParam(service, result, scontract, /Номер договора:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		        getParam(service, result, sbalance, /Состояние расчетов:[^>]*>\s*<div[^>]*>([^<]+)/i, [replaceTagsAndSpaces, 'долг', '-'], parseBalance);
	            getParam(service, result, sprovider, /Поставщик:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		        
                sumParam(service, result, 'balance', /Состояние расчетов:[^>]*>\s*<div[^>]*>([^<]+)/i, [replaceTagsAndSpaces, 'долг', '-'], parseBalanceSilent, aggregate_sum);
		        
		        if (i>=4)
		            break;
	        }
	    }else{
		    AnyBalance.trace('Других договоров не найдено. Получаем информацию по основному договору');
		    getParam(info, result, 'servicecontract', /Номер договора:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		    getParam(info, result, 'servicebalance', /Состояние расчетов:[^>]*>\s*<div[^>]*>([^<]+)/i, [replaceTagsAndSpaces, 'долг', '-'], parseBalance);
	        getParam(info, result, 'serviceprovider', /Поставщик:[^>]*>\s*<div[^>]*>([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
		       
            getParam(info, result, 'balance', /Состояние расчетов:[^>]*>\s*<div[^>]*>([^<]+)/i, [replaceTagsAndSpaces, 'долг', '-'], parseBalance);
	    }
    }
	
	AnyBalance.setResult(result);
}