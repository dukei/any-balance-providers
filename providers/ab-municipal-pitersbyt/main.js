/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает задолженность у Петербургской сбытовой компании

Сайт оператора: http://pesc.ru/
Личный кабинет: http://ikus.pesc.ru:8080/IKUSUser/
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'en-GB,en;q=0.9,ru-RU;q=0.8,ru;q=0.7,en-US;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36',
};

var g_savedData;

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://ikus.pesc.ru/';
    g_headers.Origin = baseurl.replace(/\/$/, '');

    checkEmpty(prefs.login, 'Введите E-mail!');
    checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');

    if(!g_savedData)
		g_savedData = new SavedData('pskpetersburg', prefs.login);

	g_savedData.restoreCookies();
	var token = g_savedData.get('token');
	g_headers['Authorization'] = 'Bearer ' + token;
	
	var html = AnyBalance.requestGet(baseurl + 'application/v3/groups', addHeaders({Referer: baseurl}));
	
	if (!html || AnyBalance.getLastStatusCode() > 500) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if(AnyBalance.getLastStatusCode() === 401 || prefs.login !== g_savedData.get('login')){
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		delete g_headers['Authorization'];
		clearAllCookies();
	
	    var html = AnyBalance.requestGet(baseurl, g_headers);

        var captcha = solveRecaptcha('Пожалуйста, докажите, что вы не робот', baseurl, '6Lep5K0UAAAAADF48l3jpw8QuqUKVQuOUxzM21HJ');

        html = AnyBalance.requestPost(baseurl + 'application/v3/auth/login', JSON.stringify({
	    	username:	prefs.login,
	    	password:	prefs.password,
	    	captchaCode: captcha,
	    }), addHeaders({'Content-Type': 'application/json', Referer: baseurl}));

	    var json = getJson(html);
	    if(!json.access_token){
	    	AnyBalance.trace(html);
	    	var error = json.errors.reduce(function(acc, cur) { acc.push(cur.message); return acc; }, []).join(';\n');
	    	if(error)
	    		throw new AnyBalance.Error(error, null, /не найден|парол|email/i.test(error));
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }

	    var token = json.access_token;
		
		g_headers['Authorization'] = 'Bearer ' + token;
	
	    html = AnyBalance.requestGet(baseurl + 'application/v3/groups', addHeaders({Referer: baseurl}));
	    json = getJson(html);
		
		if(json.errors){
	    	AnyBalance.trace(html);
	    	var error = json.errors.reduce(function(acc, cur) { acc.push(cur.message); return acc; }, []).join(';\n');
	    	if(error)
	    		throw new AnyBalance.Error(error, null, /доступ/i.test(error));
	    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	    }
		
		g_savedData.set('login', prefs.login);
		g_savedData.set('token', token);
		g_savedData.setCookies();
	    g_savedData.save();
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var accounts = [];
	for(var i=0; i<json.length; ++i){
		let g = json[i].id;
		
		html = AnyBalance.requestGet(baseurl + 'application/v5/groups/' + g + '/accounts', addHeaders({Referer: baseurl}));
		var _json = getJson(html);
		accounts.push.apply(accounts, _json);
	}

//	html = AnyBalance.requestGet(baseurl + 'application/api/checkAuthentication', addHeaders({Referer: baseurl}));
//	json = getJson(html);
        
	if(!accounts.length){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('У вас нет ни одного лицевого счета');
	}

	AnyBalance.trace('Найдено лицевых счетов: ' + accounts.length);

	var result = {success: true};

	for(var i=0; i<accounts.length; ++i){
		var acc = accounts[i];

		for(var j=0; j<acc.accountDisplayKey.length; ++j){
			var f = acc.accountDisplayKey[j];
			if(f.fieldCode === '001')
				sumParam(f.fieldValue, result, 'licschet', null, null, null, aggregate_join);
		}

		var name_balance = 'balance' + (i || ''), name_peni = 'peni' + (i || '')

		AnyBalance.trace('Лицевой счет: ' + JSON.stringify(json));

		if(AnyBalance.isAvailable(name_balance, name_peni)){
			html = AnyBalance.requestGet(baseurl + 'application/v3/accounts/' + acc.accountId + '/data', addHeaders({Referer: baseurl}));
			json = getJson(html);

			getParam(json.balanceDetails.balance, result, name_balance);
			for(var k=0; k<json.balanceDetails.subServiceBalances.length; ++k){
				var ss = json.balanceDetails.subServiceBalances[k];
				sumParam(ss.fine, result, name_peni, null, null, null, aggregate_sum);
			}
		}

		if(isAvailable('__tariff')){
			html = AnyBalance.requestGet(baseurl + 'application/v3/accounts/' + acc.accountId + '/common-info', addHeaders({Referer: baseurl}));

			var _json = getJson(html);
			sumParam(_json.address, result, '__tariff', null, null, null, aggregate_join);
		}

	}
	
	if(AnyBalance.isAvailable('email', 'phone', 'fio')){
	    html = AnyBalance.requestGet(baseurl + 'application/v3/profile', addHeaders({Referer: baseurl}));
	    json = getJson(html);
		
		getParam(json.email, result, 'email');
		getParam(json.phoneNumber, result, 'phone', null, [replaceTagsAndSpaces, /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4']);
		getParam(json.firstName + ' ' + json.lastName, result, 'fio');
	}

    AnyBalance.setResult(result); 
}