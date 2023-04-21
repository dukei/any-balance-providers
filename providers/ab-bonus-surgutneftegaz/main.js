﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
};

var baseurl = 'https://lk.sngbonus.ru';
var g_savedData;

function main() {
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
    AnyBalance.setOptions({forceCharset:'utf-8'});
	
	checkEmpty(prefs.login, 'Введите логин!');
   	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('sngbonus', prefs.login);

	g_savedData.restoreCookies();
	
	AnyBalance.trace('Пробуем войти в личный кабинет...');

    var html = AnyBalance.requestGet(baseurl + '/card', g_headers);

    if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	if(!/logout/i.test(html)){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
	
	    var html = AnyBalance.requestGet(baseurl + '/lsc', g_headers);
	
	    var form = getElement(html, /<form[^>]+signin_form[^>]*>/i);
        if(!form){
	    	AnyBalance.trace(html);
	    	throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
        }
	
	    var params = createFormParams(form, function(params, str, name, value) {

	    	if(name === 'username'){
	    		value = prefs.login;
	    	}else if(name === 'password'){
	    		value = prefs.password;
	    	}
		
	    	return value;
        });

        var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
		if(!action){
	    	action = '/signin';
        }

	    html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
	    	'Content-Type': 'application/x-www-form-urlencoded', 
	    	'Origin': baseurl, 
	    	'Referer': baseurl + '/signin'
	    }));
	    
	    if (/Введены неверные данные|Неверная пара логин\/пароль/i.test(html) && /grecaptcha/i.test(html)){
	    	var captcha = getParam(html, /sitekey'[^']*'([^']*)/);
	    	var captcha = solveRecaptcha("Пожалуйста, докажите, что Вы не робот", AnyBalance.getLastUrl(), captcha);
            params['g-recaptcha-response'] = captcha;
            html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
	        	'Content-Type': 'application/x-www-form-urlencoded', 
	        	'Origin': baseurl, 
	        	'Referer': baseurl + '/signin'
	        }));
	    }
		
        if (!/logout/i.test(html)) {
            var error = getParam(html, null, null, /form_error[^>]*>([^<]*?)</i);
            if (error) 
				throw new AnyBalance.Error(error, false, /пароль/i.test(error));
			
            AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
		
	    g_savedData.setCookies();
	    g_savedData.save();
		
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
		
    var result = {success: true};
		
    getParam(html, result, 'balance', /Ваш баланс:([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'this_month', /В этом месяце получено([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'next_status_left', /Получите еще([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Статус:[\s\S]*?<b>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'card_state', /card_state card_active noselect[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	getParam(html, result, 'next_status', /для повышения статуса до[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, result, 'cardnum' , /card_number noselect[\s\S]*?<span>([\s\S]*?)<\//i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /card_number noselect[\s\S]*?<span>([\s\S]*?)<\//i, replaceTagsAndSpaces);

    if (AnyBalance.isAvailable('last_operation')){
		var cid = getParam(html, /name="cid" value="([^"]*)/i, replaceHtmlEntities);
		
		html = AnyBalance.requestPost(baseurl + '/purchases', {
			'cid': cid
		}, addHeaders({
	    	'Content-Type': 'application/x-www-form-urlencoded', 
	    	'Origin': baseurl, 
	    	'Referer': baseurl + '/card'
	    }));
		
        var row = getParam(html, /<tr class="bill-row" bid="0">([\s\S]*?)<\/tr>/);
		if(row){
            var str = getParam(row, /bill-row-otype[^>]*>([\s\S]*?)</) + ' ';
            str += getParam(row, /bill-row-postime[^>]*>([\s\S]*?)</) + '<br>';
            var s = row.match(/bill-row-p(?:name|amount|price)[^>]*>([\s\S]*?)</g);
            for (var i=0; i<s.length; i+=3){
            	var name = getParam(s[i], />(.*)</);
            	var amount = getParam(s[i+1], />(.*)</, null, parseBalance);
            	var price = getParam(s[i+2], />(.*)</, null, parseBalance);
            	str += name + ' ' + amount + ' по ' + price.toFixed(2) + '<br>';
            }
            str += 'Оплачено всего:<strong>' + getParam(row, /bill-row-cost[^>]*>([\s\S]*?)</) + '<br></strong>';
            var b = getParam(row, /bill-row-boff[^>]*>([\s\S]*?)</);
            if (b != '0.00') str += 'Оплачено бонусами:<font  color=#8B0000><strong>' + b + '</strong></font><br>';
            str += 'Начислено бонусов:<font  color=#006400><strong>' + getParam(row, /bill-row-badd[^>]*>([\s\S]*?)</) + '</strong></font><br>';
            result.last_operation = str;
		}else{
		    AnyBalance.trace('Не удалось получить данные по операциям');
	    }
	}
		
    AnyBalance.setResult(result);
}