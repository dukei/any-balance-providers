/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Language':'en-GB,en;q=0.9,ru-RU;q=0.8,ru;q=0.7,en-US;q=0.6',
	'Connection':'keep-alive',
	'Origin': 'https://lkk.mosoblgaz.ru',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://lkk.mosoblgaz.ru/';
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'auth/login', g_headers);
	
	var params = createFormParams(html, function(params, str, name, value) {
		AnyBalance.trace('Processing form field ' + name + ': ' + value);
		if (/username/i.test(name)) 
			return prefs.login;
		else if (/password/i.test(name))
			return prefs.password;
		else if (/submit/i.test(name))
			return undefined;
/*		else if (/\$Captcha/i.test(name)){
			AnyBalance.trace('Пытаемся ввести капчу');
			AnyBalance.setOptions({forceCharset:'base64'});
			var captcha_href = getParam(html, null, null, /(CaptchaImage.axd[^"]*)/i);
			var captcha = AnyBalance.requestGet(baseurl+ captcha_href);
			var captchaVal = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			    AnyBalance.trace('Капча получена: ' + captchaVal);
			AnyBalance.setOptions({forceCharset:'utf-8'});
			return captchaVal;                            
		}*/

		return value;
	});
	
	html = AnyBalance.requestPost(baseurl + 'auth/login', params, addHeaders({Referer: baseurl + 'auth/login'})); 
	var json = getJson(html);
	
    if(!json.success){
    	var errors = [];
    	for(var i in json.errors){
    		errors.push(json.errors[i]);
    	}
        var error = errors.join(';\n');
        if(error)
            throw new AnyBalance.Error(error, null, /парол|имя/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl, g_headers);

    var nums = getElements(html, /<a[^>]+account-option/ig), chooseNumHref, activeNum, chosenNum;
    AnyBalance.trace('В кабинете счетов: ' + nums.length);
    for(var i=0; i<nums.length; ++i){
     	var num = getParam(nums[i], /№\s*(\d+)/i, replaceTagsAndSpaces);
     	var address = getParam(nums[i], /:([\s\S]*)/, replaceTagsAndSpaces);
     	AnyBalance.trace('Найден счет ' + num + ': ' + address);
     	if(/active/i.test(nums[i])){
     		activeNum = num;
     	}
     	if(!chosenNum){
     		if(!prefs.num || endsWith(num, prefs.num)){
     			chosenNum = num;
     			chooseNumHref = joinUrl(baseurl, getParam(nums[i], /<a[^>]+href="([^"]*)/i, replaceHtmlEntities));
     		}
     	}
    }

    if(!chosenNum && prefs.num){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось найти счет с последними цифрами ' + prefs.num);
    }


    AnyBalance.trace('Выбрали ' + chosenNum + ' (' + (chosenNum == activeNum ? 'он уже активен' : 'надо его активировать') + ')');
    if(chosenNum != activeNum){
    	html = AnyBalance.requestGet(chooseNumHref, addHeaders({Referer: baseurl}));
    }

	
    var result = {success: true};
    getParam(html, result, 'acc', /<span[^>]+account-chosen[^>]*>([\s\S]*?)<\/span>/i, [replaceTagsAndSpaces, /№/, '']);
	getParam(html, result, 'fio', /<div[^>]+site-header__name[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
/*
	getParam(html, result, 'next_check', /очередной срок поверки([^<]*)/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'last_counter_val', /по лицевому счету при показаниях\s*<strong[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'last_counter_date', /Показания от([^<\-]*)/i, replaceTagsAndSpaces, parseDate);

	if(isAvailable('__tariff')){
		html = AnyBalance.requestGet(baseurl + 'DevicesSUPG.aspx', g_headers);
		getParam(html, result, '__tariff', /<span[^>]+current-counter[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

	}
*/

	if(isAvailable(['income', 'nachisl', 'recomended', 'balance'])) {
		html = AnyBalance.requestGet(baseurl + 'balance', g_headers);

		AB.getParam(html, result, 'balance', 	/<div[^>]+label-uppercase[^>]*>(?:\s+|<[^>]*>)*?Баланс[\s\S]*?<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, 						   		AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'income',  	/ПОСТУПЛЕНИЯ НА СЧЕТ В ТЕКУЩЕМ МЕСЯЦЕ[\s\S]*?<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, 	AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'nachisl', 	/НАЧИСЛЕНИЯ ТЕКУЩЕГО МЕСЯЦА[\s\S]*?<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, 		 	AB.replaceTagsAndSpaces, AB.parseBalance);
		AB.getParam(html, result, 'recomended', /РЕКОМЕНДУЕМАЯ СУММА К ОПЛАТЕ[\s\S]*?<div[^>]+balance-value[^>]*>([\s\S]*?)<\/div>/i, 			AB.replaceTagsAndSpaces, AB.parseBalance);
	}

    AnyBalance.setResult(result);
}