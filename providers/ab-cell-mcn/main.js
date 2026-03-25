var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Connection': 'keep-alive',
	'Content-Type': 'application/json',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
}

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	switch(prefs.source){
	case 'new':
        processSiteNew(prefs);
		break;
    case 'old':
        processSiteOld(prefs);
		break;
    case 'auto':
    default:
        try{
			processSiteNew(prefs);
        }catch(e){
            if(e.fatal)
                throw e;
			AnyBalance.trace('Не удалось получить данные из нового личного кабинета');
		    clearAllCookies();
            processSiteOld(prefs);
        }
        break;
	}
}

function processSiteNew(prefs){
    var baseurl = 'https://base.mcn.ru/';
	
	AnyBalance.trace('Пробуем войти в новый кабинет...');
    
	var html = AnyBalance.requestPost(baseurl + 'api/public/api/auth/authorization', JSON.stringify({login: prefs.login}), addHeaders({referer: 'https://base.mcn.ru/auth/login'}));
	
	AnyBalance.trace(html);
	
	var json = getJson(html);
	
    if(!json.ok){
		var error = json.error;
		if(error && /login_is_invalid/i.test(error))
			throw new AnyBalance.Error('Неправильный логин!', null, true);
		
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	html = AnyBalance.requestPost(baseurl + 'api/public/api/auth/authorization/confirm', JSON.stringify({password: prefs.password}), addHeaders({referer: 'https://base.mcn.ru/auth/login'}));
	
	AnyBalance.trace(html);
	
	json = getJson(html);
	
    if(!json.ok){
		var error = json.error;
		if(error && /password_is_incorrect/i.test(error))
			throw new AnyBalance.Error('Неправильный пароль!', null, true);
		
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'api/protected/api/auth/info', addHeaders({referer: 'https://base.mcn.ru/dashboard'}));
	
	AnyBalance.trace('Балансы: ' + html);
	
	json = getJson(html);
	
	var currentAccount = json.result && json.result.currentAccount;
	var currentContract = json.result && json.result.currentContract;
	
	if(currentAccount){
	    getParam(currentAccount.balance, result, 'balance', null, null, parseBalance);
	    getParam(currentAccount.credit, result, 'credit', null, null, parseBalance);
	    getParam(currentAccount.accountId, result, 'ls');
	    getParam(currentAccount.accountId, result, '__tariff');
	}else{
		AnyBalance.trace('Не удалось получить данные по аккаунту');
	}
	
	html = AnyBalance.requestGet(baseurl + 'api/protected/api/user/info', addHeaders({referer: 'https://base.mcn.ru/dashboard'}));
	
	AnyBalance.trace('Профиль: ' + html);
	
	json = getJson(html);
	
	if(json.result){
	    getParam(json.result.email, result, 'email');
	    getParam(json.result.full_name, result, 'fio');
	}else{
		AnyBalance.trace('Не удалось получить данные профиля');
	}
	
	html = AnyBalance.requestGet('https://services.mcn.ru/api/services/2?limitPerPage=10&pageNumber=1', addHeaders({referer: 'https://base.mcn.ru/dashboard'}));
	
	AnyBalance.trace('Телефония: ' + html);
	
	json = getJson(html);
	
	var phones = [];
	
	if(json.result && json.result.length){
	    for(var i=0; i<json.result.length; ++i){
            if(json.result[i].isDeactivated){
			    continue;
		    }else{
    	        phones.push(json.result[i]);
		    }
	    }
		AnyBalance.trace('Найдено активных номеров телефонов: ' + phones.length);
	}else{
		AnyBalance.trace('Не удалось получить информацию по номерам телефонов');
	}
	
    if(phones && phones.length && phones.length > 0){
	    for(var i=0; i<phones.length; ++i){
    	    var phone = phones[i];
    	    var voip_number = phone.name.toString().replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 $2 $3-$4-$5');
		    getParam(voip_number, result, 'tel' + i);
    	    result['pretel' + i] = prefs.needPref && voip_number ? voip_number + ': ' : '';
    	    if(phone.deactivateDate)
			    getParam(phone.deactivateDate, result, 'deactivate_future_date' + i, null, null, parseDateISO);
		    getParam(phone.tariff.name, result, "tariff" + i);
		    
		    var traffic = {bytes_amount: 0, bytes_consumed: 0};
		    for(var j=0; j<phone.packages.length; ++j){
			    var package = phone.packages[j];
				if(package.name !== 'Интернет')
					continue;
			    if(package.connected && package.connected.length && package.connected.length>0){
			        for(var k=0; k<package.connected.length; ++k){
			            var connected = package.connected[k];
					    if(connected.fields && connected.fields.length && connected.fields.length>0){
			                for(var l=0; l<connected.fields.length; ++l){
			                    var field = connected.fields[l];
							    if(field.label == 'Количество'){
								    if(field.value)
			                            sumParam(field.value + ' ' + field.unit, traffic, 'traffic.bytes_amount', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
							    }else if(/Ис[трачено|пользовано]|Израсходовано|Расход/i.test(field.label)){
								    if(field.value)
			                            sumParam(field.value + ' ' + field.unit, traffic, 'traffic.bytes_consumed', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
							    }
						    }
					    }
				    }
			    }
		    }
			AnyBalance.trace('Трафик на номере ' + voip_number + ': ' + JSON.stringify(traffic));
    	    getParam((traffic.bytes_amount - traffic.bytes_consumed).toFixed(2), result, 'inet' + i, null, null, parseFloat);
		    getParam((traffic.bytes_amount ? '/' + traffic.bytes_amount.toFixed(0) + ' Мб' : ' Мб'), result, 'suf_inet' + i);
	    }
	}
    
	AnyBalance.setResult(result);
}

function processSiteOld(prefs){
    var baseurl = 'https://lk.mcn.ru/';
    
	AnyBalance.trace('Пробуем войти в старый кабинет...');
	
	var html = AnyBalance.requestPost(baseurl + 'core/auth/login_post', {email: prefs.login, password: prefs.password});
	
	AnyBalance.trace('Профиль: ' + html);
	
    var json = getJson(html);
	
    if(!json.user_id){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Авторизация не удалась. Проверьте логин и пароль', false, true);
    }
    
    var result = {success: true};
	
	getParam(json.email, result, 'email');
	getParam(json.name, result, 'fio');
	
    html = AnyBalance.requestPost(baseurl + 'lk/account_info/read?__lk_account_info', {});
	
	AnyBalance.trace('Балансы: ' + html);
	
    json = getJson(html);
	
	getParam(json.balance, result, 'balance', null, null, parseBalance);
	getParam(json.credit, result, 'credit', null, null, parseBalance);
	getParam(json.id, result, 'ls');
	getParam(json.id, result, '__tariff');
	
    html = AnyBalance.requestPost(baseurl + 'lk/voip/read?__lk_voip', {page_number: 1, limit_per_page: 100});
	
	AnyBalance.trace('Телефония: ' + html);
	
    json = getJson(html);
	
	var phones = [];
	
	if(json && json.length){
	    for(var i=0; i<json.length; ++i){
            if(!json[i].id){
			    continue;
		    }else{
    	        phones.push(json[i]);
		    }
	    }
		AnyBalance.trace('Найдено активных номеров телефонов: ' + phones.length);
	}else{
		AnyBalance.trace('Не удалось получить информацию по номерам телефонов');
	}
	
    if(phones && phones.length && phones.length > 0){
	    for(var i=0; i<phones.length; ++i){
    	    var phone = phones[i];
    	    var voip_number = phone.voip_number.toString().replace(/(\d)(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 $2 $3-$4-$5');
    	    getParam(voip_number, result, 'tel' + i);
    	    result['pretel' + i] = prefs.needPref && voip_number ? voip_number + ': ' : '';
    	    if(phone.deactivate_future_date)
			    getParam(parseDat(phone.deactivate_future_date), result, 'deactivate_future_date' + i);
		    getParam(phone.tariffs.map(function(s) { return s.name }).join(', '), result, "tariff" + i);
			var traffic = {bytes_amount: 0, bytes_consumed: 0};
    	    phone.internet_packages.forEach(function(pakage, index) {
			    if(pakage.amount)
			        sumParam(pakage.amount + ' ' + pakage.unit, traffic, 'traffic.bytes_amount', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
			    if(pakage.consumed)
			        sumParam(pakage.consumed + ' ' + pakage.unit, traffic, 'traffic.bytes_consumed', null, replaceTagsAndSpaces, parseTraffic, aggregate_sum);
		    });
		    AnyBalance.trace('Трафик на номере ' + voip_number + ': ' + JSON.stringify(traffic));
    	    getParam((traffic.bytes_amount - traffic.bytes_consumed).toFixed(2), result, "inet" + i, null, null, parseFloat);
		    getParam((traffic.bytes_amount ? '/' + traffic.bytes_amount.toFixed(0) + ' Мб' : ' Мб'), result, "suf_inet" + i);
        }
	}
	
    AnyBalance.setResult(result);
}

function parseDat(str){
    var matches = /(\d*)-(\d*)-(\d*)/.exec(str);
    if (matches) {
        var date = new Date(matches[1], matches[2] - 1, matches[3]);
        var time = date.getTime();
        AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
        return time;
    }
}
