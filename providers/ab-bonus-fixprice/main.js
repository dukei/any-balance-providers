
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Origin': 'https://fix-price.com',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36',
};

var baseurl = 'https://api.fix-price.com';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(!g_savedData)
		g_savedData = new SavedData('fix-price', prefs.login);

	g_savedData.restoreCookies();
	var authXKey = g_savedData.get('authXKey');
	
	var html = AnyBalance.requestGet(baseurl + '/buyer/v2/profile/personal', addHeaders({
		'Accept': 'application/json, text/plain, */*',
		'Content-Type': 'application/json',
		'Referer': 'https://fix-price.com/',
		'X-City': 3,
        'X-Key': authXKey,
        'X-Language': 'ru'
	}));
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(/Требуется авторизация/i.test(html)){
        AnyBalance.trace('Сессия новая. Будем логиниться заново...');

		html = AnyBalance.requestGet('https://fix-price.com/', g_headers);
		
		var authXKey = getParam(html,  /authXKey:"([^">]*)/i, replaceTagsAndSpaces);

		prefs.login = '+7(' + prefs.login.replace(/[^\d]*/g,'').substr(-10).replace(/(\d{3})(\d{3})(\d{2})(\d{2})/, '$1)-$2-$3-$4');

		html = AnyBalance.requestPost(baseurl + '/buyer/v2/auth/login', JSON.stringify({
            email: null,
			phone: prefs.login,
            password: prefs.password
		}), addHeaders({
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json',
			'Referer': 'https://fix-price.com/',
			'X-City': 3,
            'X-Key': authXKey,
            'X-Language': 'ru'
		}));

		var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));

		if (json.code || AnyBalance.getLastStatusCode() > 400) {
			var error = json.message;
			if (error) {
				throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
			}
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
		}
		
		html = AnyBalance.requestGet(baseurl + '/buyer/v2/profile/personal', addHeaders({
		    'Accept': 'application/json, text/plain, */*',
		    'Content-Type': 'application/json',
		    'Referer': 'https://fix-price.com/',
		    'X-City': 3,
            'X-Key': authXKey,
            'X-Language': 'ru'
	    }));
		
		g_savedData.set('authXKey', authXKey);
		g_savedData.setCookies();
	    g_savedData.save();
		
	}else{
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	getParam(json.activeBalance, result, 'balance', null, null, parseBalance);
    getParam(json.inactiveBalance, result, 'balance_inactive', null, null, parseBalance);
	getParam(json.card, result, '__tariff');
	getParam(json.card, result, 'card');

	var fio = json.firstName;
	if (json.lastName)
		fio += ' ' + json.lastName;
	getParam(fio, result, 'fio');
	getParam(json.phone, result, 'phone', null, replaceNumber);
	
	if(AnyBalance.isAvailable('lasttransum', 'lasttrandate', 'lasttranbon', 'lasttranchar', 'lasttrantype')) {
		html = AnyBalance.requestGet(baseurl + '/buyer/v2/profile/transaction?page=1', addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
		    'Content-Type': 'application/json',
		    'Referer': 'https://fix-price.com/',
		    'X-City': 3,
            'X-Key': authXKey,
            'X-Language': 'ru'
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
	
	    var t = json.transactions;
	    if(t && t.length > 0){
	    	AnyBalance.trace('Найдено последних покупок: ' + t.length);
	    	getParam(t[0].amount, result, 'lasttransum', null, null, parseBalance);
	    	getParam(t[0].date.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'), result, 'lasttrandate', null, null, parseDate);
	    	getParam(t[0].amountBonus, result, 'lasttranbon', null, null, parseBalance);
			getParam(t[0].amountCharge, result, 'lasttranchar', null, null, parseBalance);
	    	getParam(t[0].type, result, 'lasttrantype');
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последней покупке');
 	    }
	}
	
	AnyBalance.setResult(result);
}
