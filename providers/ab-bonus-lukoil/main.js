/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://my.licard.com/';
    var baseurlFizik = 'https://club-lukoil.ru/';
   	checkEmpty(prefs.login, 'Введите номер карты!');
   	checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');
    
	var result = {success: true};
	
    if (prefs.type == 'likard') {
		var html = AnyBalance.requestGet(baseurl + 'ru/login', g_headers);

		var params = [];

		var captcha = getParam(html, null, null, /<img[^>]+src="\/([^"]*)"[^>]*class="captcha-pic/i);
		if(captcha){
			var img = AnyBalance.requestGet(baseurl + captcha, addHeaders({Referer:baseurl + 'ru/login'}));
			captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img, {inputType: 'number'});
			params.push(['keystring', captcha]);
		}
		
		params = params.concat([
			['login', prefs.login],
			['pass' , prefs.password],
			['submit', 'Войти'],
		]);
		
		try {
			html = AnyBalance.requestPost(baseurl + 'ru/login', params, addHeaders({Referer: baseurl + 'ru/login', 'Origin': 'https://my.licard.com'}));
		} catch(e) {
			html = AnyBalance.requestGet(baseurl + 'ru', addHeaders({Referer: baseurl + 'ru/login', 'Origin': 'https://my.licard.com'}));
		}
        //получим id пользователя
        var usedId = /\/([\s\S]{1,15})\/client/i.exec(html);
        if (!usedId){
        	var error = getParam(html, null, null, /<div[^>]+common-errors[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        	if(error)
        		throw new AnyBalance.Error(error, false, /Информация о пользователе отсутствует|пароль/i.test(error));
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
        getParam(prefs.login, result, 'cardnum');
        getParam(html, result, 'balance', /Баланс[\s\S]*?>[\s\S]*?>([\s\S]*?)<\/b/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'last_payment', /Последний платёж[\s\S]*?payments">([\s\S]*?)<\/a/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'name', /class="value user-name">\s*<b>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces);
        getParam(html, result, 'status', /<th[^>]*>\s*Статус[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    } else if(prefs.type == 'clubby'){
    	checkEmpty(/^\d{18,19}$/.test(prefs.login), 'Номер карты введен неверно!');

		if(prefs.type == 'clubby')
			baseurlFizik = baseurlFizik.replace(/\.ru/i, '.by');
		
        var html = AnyBalance.requestGet(baseurlFizik + 'login', g_headers);
		
        html = AnyBalance.requestPost(baseurlFizik + 'login', {
            username: prefs.login,
            password: prefs.password,
        }, g_headers);
		
        if (!/logout/i.test(html)) {
            var error = getParam(html, null, null, [/<p[^>]+class="err"[^>]*>([\s\S]*?)<\/p>/i, /class="error">([\s\S]*?)<\//i], replaceTagsAndSpaces);
            if (error)
				throw new AnyBalance.Error(error, false, /Неверный номер карты или пароль/i.test(error));
			
			AnyBalance.trace(html);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
		
        getParam(html, result, 'balance', /Количество&nbsp;баллов(?:[^>]*>){3}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cardnum', /cardNumber"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces, null);
		getParam(html, result, 'name', /"user-FIO"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
		getParam(html, result, 'phonenumber', /"userPhoneTableCell"(?:[^>]*>){1}([^<]+)/i, replaceTagsAndSpaces);
		
        //getParam(html, result, '__tariff', /<li><span>Ваш статус в Программе:<\/span>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, null);
        //getParam(html, result, 'region', /Регион Программы:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces);
    }else{
    	mainPhysicNew(result);
    }
	
    AnyBalance.setResult(result);
}

function callApi(verb, params){
    var baseurl = 'https://customer.licard.ru/';

    var html = AnyBalance.requestPost(baseurl + 'api/' + verb, JSON.stringify(params), addHeaders({
    	Accept: 'application/vnd.licard-b2c.v1+json',
    	'Content-Type': 'application/json;charset=UTF-8',
    	Referer: baseurl
    }));
    var json = getJson(html);
   	var errors = [];
    if(json.status_code && json.status_code >= 400){
    	if(json.errors) for(var e in json.errors){
    		errors = errors.concat(json.errors[e]);
    	}

    	if(!errors.length && json.message)
    		errors.push(json.message)

    	var error = errors.join(' ');
    	throw new AnyBalance.Error(error, null, /Логин|не найден/i.test(error));
    }
    	
    return json;
}

function mainPhysicNew(result){
    var prefs = AnyBalance.getPreferences();

    var json = callApi('user/login', {"login":prefs.login,"password":prefs.password});

    var aggregate_join_space = create_aggregate_join(' ');
    
    getParam(json.user.cardbalance, result, 'balance', null, null, parseBalance);
    getParam(json.user.cardnumber, result, 'cardnum');
	
	sumParam(json.user.lastname, result, 'name', null, null, null, aggregate_join_space);
	sumParam(json.user.firstname, result, 'name', null, null, null, aggregate_join_space);
	sumParam(json.user.middlename, result, 'name', null, null, null, aggregate_join_space);

	getParam(json.user.mobilephone, result, 'phonenumber');
}
