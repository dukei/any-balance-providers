/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'
};

function main(){
    var langMap = {
        rus: 'ru',
        kaz: 'kk'
    };

    var prefs = AnyBalance.getPreferences();
    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона');
    checkEmpty(prefs.password, 'Введите пароль');

    var baseurl = "https://www.activ.kz/";

    AnyBalance.setDefaultCharset('utf-8');

    AnyBalance.trace("Trying to enter ics at address: " + baseurl);
    var lang = prefs.lang || 'ru';
    lang = langMap[lang] || lang; //Переведем старые настройки в новые.

    var html;
    if(!prefs.__dbg) {
        html = AnyBalance.requestPost(baseurl + lang + "/ics.security/authenticate", {
            'msisdn': '+7 (' + prefs.login.substr(0, 3) + ') ' + prefs.login.substr(3, 3) + '-' + prefs.login.substr(6, 4),
            'password': prefs.password
        }, addHeaders({'Referer': baseurl + lang + '/ics.security/login'}));

		//AnyBalance.trace(html);

        if(!/security\/logout/i.test(html)){
			var error = getParam(html, null, null, /<div[^>]*class="[^"]*alert[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error)
				throw new AnyBalance.Error(error);

			throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Если вы уверены, что правильно ввели логин-пароль, то это может быть из-за проблем на сервере или изменения личного кабинета.");
        }

		if(/icons\/503\.png/i.test(html))
			throw new AnyBalance.Error("Проблемы на сервере, сайт изменен или, возможно, вы ввели неправильный номер телефона.");

		if(/<title>\s*Смена пароля\s*<\/title>/i.test(html))
			throw new AnyBalance.Error("Необходимо сменить пароль, зайдите на сайт через браузер и смените пароль.");
    } else {
		html = AnyBalance.requestGet(baseurl + lang + '/ics.account/dashboard', {'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11'});
    }

    var result = {success: true};
    //На казахском языке описание каких-то значений идёт перед ними, а на английском и в русском - после.

    //(?:Теңгерім|Баланс|Balance):
    getParam(html, result, 'balance', /<h5[^>]*?>\s*?(?:Баланс|Теңгерім|Balance)\s*?<\/h5>\s*?<h5[^>]*?>([\s\S]*?)<\/h5/i, replaceTagsAndSpaces, parseBalance);
    //Тариф:
    getParam(html, result, '__tariff', /<h[^>]*>(?:Тарифный план|Тариф|Tariff)[\s\S]*?<h[^>]*>([\s\S]*?)<\/h/i, replaceTagsAndSpaces, html_entity_decode);
    //(?:Шот қалпы|Статус номера|Account status):
    getParam(html, result, 'status', /<h5>(?:Статус|Қалпы|Status)(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);

    var bonuses = getParam(html, null, null, /<h5[^>]*>\s*(?:Бонусы|Bonuses|Бонустар)[\s\S]*?<h5[^>]*>([\s\S]*?)<\/h5>/i);
    AnyBalance.trace('Найдены бонусы: ' + bonuses);

    bonuses = getElements(bonuses, /<li[^>]*>/ig);
    for(var i=0; i<bonuses.length; ++i){
    	var bonus = bonuses[i], val;
    	AnyBalance.trace('Разбираем ' + bonus);

    	if(val = getParam(bonus, null, null, /\d[\d\s.,]*\s*[МмMm][БбBb]/i)){
    	
    		var night = /01:00/i.test(bonus) ? '_night' : '';
    		AnyBalance.trace('это трафик ' + night);
    		sumParam(val, result, 'internet_plus' + night, null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);

    	}else if(val =  getParam(bonus, null, null, /(\d+)\s*(?:бонусных ед.|бонустық бірлік|bonus units)/i)){
    		
    		AnyBalance.trace('это бонусные единицы');
		    sumParam(val, result, 'bonus', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    	}else if(val =  getParam(bonus, null, null, /([\d\.]+)\s*(?:Бонусных минут в роуминге|Роумингтегі бонус минут|Bonus minutes in roaming)/i)){

    		AnyBalance.trace('это минуты в роуминге');
		    sumParam(val, result, 'min_roaming', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    	}else if(/all-net|ВСЕ сети|БАРЛЫҚ желілерге/i.test(bonus) && /мин\.|min\./i.test(bonus)){

    		AnyBalance.trace('это локальные минуты на все сети');
		    sumParam(bonus, result, 'min_local', /\d+[^\d<]*(?:мин\.|min\.)/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    	}else if(/on-net|внутри сети|желі ішінде/i.test(bonus) && /мин\.|min\.|сек|sec/i.test(bonus)){

    	    var sec = /сек|sec/i.test(bonus);
    		AnyBalance.trace('это внутрисетевые ' + (sec ? 'секунды' : 'минуты'));
		    sumParam(bonus, result, 'min_left', /\d+[^\d<]*(?:мин\.|min\.|сек|sec)/i, replaceTagsAndSpaces, function(str){ var s = parseBalance(str); return (s && sec) ? s/60 : s }, aggregate_sum);

    	}else if(val =  getParam(bonus, null, null, /(\d[\d\s.,]*)[^\d<]*SMS/i)){

    		AnyBalance.trace('это SMS');
		    sumParam(val, result, 'sms_net', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    	}else if(/мин\.|min\.|сек|sec/i.test(bonus)){

    	    var sec = /сек|sec/i.test(bonus);
    		AnyBalance.trace('это какие-то ' + (sec ? 'секунды' : 'минуты'));
		    sumParam(bonus, result, 'min_local', /\d+[^\d<]*(?:мин\.|min\.|сек|sec)/i, replaceTagsAndSpaces, function(str){ var s = parseBalance(str); return (s && sec) ? s/60 : s }, aggregate_sum);

    	}else{
    		AnyBalance.trace('!!! Неизвестный бонус: ' + bonus);

    	}

    }

    if(AnyBalance.isAvailable('internet_plus')){
        html = AnyBalance.requestGet(baseurl + lang + '/ics.account/getconnectedservices', g_headers);
        var json = getJson(html);
        var inet = json.inetPlusPack && json.inetPlusPack.inetPlusPackInfoDto;
        if(inet){
        	sumParam(inet.totalAvailableBytes + 'bytes', result, 'internet_plus', null, null, parseTraffic, aggregate_sum);
        	sumParam(inet.welcomeBonusBytes + 'bytes', result, 'internet_plus', null, null, parseTraffic, aggregate_sum);
        }
    }




    AnyBalance.setResult(result);
}
