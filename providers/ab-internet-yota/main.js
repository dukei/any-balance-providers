/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var baseurl = "https://my.yota.ru/";
var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
	'Accept-Language': 'ru-RU,en-US,en;q=0.9',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	Connection: 'keep-alive'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Пожалуйста, введите логин в личный кабинет Yota!');
	checkEmpty(prefs.password, 'Пожалуйста, введите пароль!');

	var html = AnyBalance.requestGet(baseurl, g_headers);
	var widgetUrl = getParam(html, /widgetUrls\[0\]=('[^']*')/, [/'/g, '"', /^/, 'return '], safeEval);
	var data = getParam(widgetUrl, /up_inputData=([^&]*)/, null, decodeURIComponent);
	if(!data){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удается найти форму входа. Сайт изменен?');
	}
		
	data = getJson(data);

	var referer = AnyBalance.getLastUrl();

	var html = AnyBalance.requestPost(data.serverUrl, {
		username: prefs.login.replace(/^\s*\+/, ''),
		password: prefs.password,
		_eventId: 'next',
		execution: data.execution
	}, addHeaders({
		Accept: 'application/json',
		'X-Requested-With': 'XMLHttpRequest',
		Referer: referer
	}));

	var json = getJson(html);

	if(json.step != 'redirect'){
		var error = json.form.errors.map(function(e) { return e.message }).join(', ');
		if(error)
			throw new AnyBalance.Error(error, null, /credentials/i.test(error));
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var html = AnyBalance.requestGet(joinUrl(referer, json.location), addHeaders({
    	Referer: referer
    }));
	
	
    if(!/\/selfcare\/logout/.test(html)){
        var error = getParam(html, /id="site-fastclick"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
        if(!error)
            error = getParam(html, /id="selfcare-not-available"[^>]*>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
		if(/404 not found/i.test(html) || /error-site-fastclick/i.test(lastUrl))
			throw new AnyBalance.Error("В данный момент превышено допустимое количество подключений к серверу. Попробуйте обновить данные позже.");
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин-пароль?');
    }

    var result = {success: true};
	
	if(/corp\./i.test(AnyBalance.getLastUrl())) {
		AnyBalance.trace('Это корпоративный кабинет.');
		html = AnyBalance.requestGet('https://corp.yota.ru/selfcare/devices');
		
		getParam(html, result, 'balance', /"account-money"[^>]*>([^{]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		sumParam(html, result, '__tariff', /<h3[^>]+class="[^"]*device-title[^"]*"[^>]*>([\S\s]*?)<\/h3>/ig, replaceTagsAndSpaces, null, aggregate_join);
		
		if(AnyBalance.isAvailable('licschet', 'agreement', 'fio', 'email', 'phone')){
			html = AnyBalance.requestGet('https://corp.yota.ru/selfcare/profile');
			getParam(html, result, 'licschet', /(?:Номер лицевого сч(?:e|ё)та|Personal Account Number)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
			getParam(html, result, 'phone', /(?:Телефон|Mobile Phone Number)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
			getParam("Корпоративный", result, 'agreement');
			getParam(html, result, 'fio', /(?:Компания|Company)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
			getParam(html, result, 'email', /(?:Эл\. почта|E-mail)(?:[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
		}
		
		AnyBalance.setResult(result);
	} else {
		AnyBalance.trace('Похоже на кабинет для физических лиц.');
		if(!/<span[^>]*>Yota 4G<\/span>/i.test(html)) {
			AnyBalance.trace('Открылась не страница по устройству. Надо открыть нужную страницу. Страница: ' + lastUrl);
			html = AnyBalance.requestGet(baseurl + 'devices');
		}

		var devices = sumParam(html, /<form[^>]+class="tariff-choice-form"[^>]*>([\s\S]*?)<\/form>/ig);
		if(devices.length > 0){
			var idx = 0, n = 0;
			var devrefs = (prefs.devices || '*,*,*,*,*').split(/\s*,\s*/g);
			for(var i=0; i<devrefs.length; ++i){
				var device = null;
				if(devrefs[i] == '*'){
					if(idx >= devices.length){
						AnyBalance.trace("All the devices are listed, breaking...");
						break;
					}else{
						device = devices[idx++];
					}
				}else{
					for(var j=0; j<devices.length; ++j){
						var icc = getParam(devices[j], /ICCID:([^<]+)/i, replaceTagsAndSpaces);
						if(!icc){
							AnyBalance.trace("Can not find device ICCID: " + devices[j]);
							continue;
						}
						if(endsWith(icc, devrefs[i])){
							device = devices[j];
							break;
						}
					}

					if(!device){
							AnyBalance.trace("Could not find device ending with " + devrefs[i]);
							++n;
							continue;
					}
					AnyBalance.trace("Found device ICCID:" + icc + ', ends with ' + devrefs[i]);
				}

				var suffix = n==0 ? '' : '' + n;
				++n;
				getParam(device, result, 'abon' + suffix, /<div[^>]+class="cost"[^>]*>([^{]*?)<\/div>/ig, replaceTagsAndSpaces, parseBalance);
				getParam(device, result, 'speed' + suffix, /<div[^>]+class="speed"[^>]*>([^{]*?)<\/div>/ig, replaceTagsAndSpaces);
				sumParam(device, result, '__tariff', /<h3[^>]+class="device-title"[^>]*>([\S\s]*?)<\/h3>/ig, replaceTagsAndSpaces, null, aggregate_join);
				getParam(device, result, 'timeleft' + suffix, /<div[^>]+class="time[^"]*"[^>]*>([\S\s]*?)<\/div>/ig, replaceTagsAndSpaces, parseTimeInterval);
			}
		}

		getParam(html, result, 'balance', /<dd[^>]+id="balance-holder"[^>]*>([^{]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
		if(AnyBalance.isAvailable('licschet', 'agreement', 'fio', 'email', 'phone')){
			html = AnyBalance.requestGet(baseurl + 'profile');
			getParam(html, result, 'licschet', /(?:Номер лицевого счета|Personal Account Number)[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces);
			getParam(html, result, 'agreement', /(?:Тип договора|Contract Type)[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces);
			getParam(html, result, 'fio', /(?:Фамилия Имя|>Name<)[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces);
			getParam(html, result, 'email', /E-mail[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces);
			getParam(html, result, 'phone', /(?:Мобильный телефон|Mobile Phone Number)[\S\s]*?<div[^>]+class="value"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces);
		}
		
		AnyBalance.setResult(result);		
	}
}

function parseTimeInterval(str){
    var val = parseBalance(str);
    if(!isset(val))
        return;
    var units = getParam(str, null, null, /\d+\s*(.)/);
    switch(units){
        case 'Д':
        case 'д':
            val*=86400;
            break;
        case 'ч':
        case 'Ч':
            val*=3600;
            break;
        case 'м':
        case 'М':
            val*=60;
            break;
	default:
            AnyBalance.trace('Не удалось выяснить единицы изменения для интервала ' + str);
            return;
    }
    AnyBalance.trace('Получили ' + val + ' сек из ' + str);
    return val;
}