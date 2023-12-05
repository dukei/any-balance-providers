
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    "user-agent": "BUYER-FRONT-ANDROID 3.39",
    "x-cns-fx": "Ndihs3A9-DRZbxihl-Nsd5gi0o-OB6kLtTx",
    "cache-control": "public, max-age=60",
    "accept-encoding": "gzip"
};

var baseurl = 'https://a-api.fix-price.com';
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
		'x-city': 3,
        'x-key': authXKey
	}));
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
	}
	
	if(/Требуется авторизация/i.test(html)){
        AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		
		clearAllCookies();

		html = AnyBalance.requestGet(baseurl + '/buyer/v1/location/city?sort=head', g_headers); // x-key здесь из хедера надо получать
		
		var authXKey = AnyBalance.getLastResponseHeader('x-key');
		AnyBalance.trace('authXKey: ' + authXKey);

		html = AnyBalance.requestPost(baseurl + '/buyer/v2/auth/login', JSON.stringify({
			phone: '7' + prefs.login.replace(/[^\d]*/g,'').substr(-10),
            password: prefs.password
		}), addHeaders({
			'content-type': 'application/json; charset=UTF-8',
			'x-city': 3,
            'x-key': authXKey
		}));
		AnyBalance.trace(html);

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
		    'x-city': 3,
            'x-key': authXKey
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
	getParam(json.email, result, 'email');
	getParam(json.phone, result, 'phone', null, replaceNumber);
	
	if(AnyBalance.isAvailable('lasttransum', 'lasttrandate', 'lasttranbon', 'lasttranprice', 'lasttranchar', 'lasttranitems', 'lasttrantype')) {
		html = AnyBalance.requestGet(baseurl + '/buyer/v2/profile/transaction?page=1', addHeaders({
		    'x-city': 3,
            'x-key': authXKey
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
	
	    var t = json.transactions;
	    if(t && t.length > 0){
	    	AnyBalance.trace('Найдено последних покупок: ' + t.length);
	    	getParam(t[0].amountTotal, result, 'lasttransum', null, null, parseBalance);
	    	getParam(t[0].date.replace(/(\d{4})-(\d{2})-(\d{2})(.*)/,'$3.$2.$1'), result, 'lasttrandate', null, null, parseDate);
	    	getParam(t[0].amountBonus, result, 'lasttranbon', null, null, parseBalance);
			getParam(t[0].amount, result, 'lasttranprice', null, null, parseBalance);
			getParam(t[0].amountDiscount, result, 'lasttranchar', null, null, parseBalance);
			getParam(t[0].itemsCount, result, 'lasttranitems', null, null, parseBalance);
	    	getParam(t[0].type, result, 'lasttrantype');
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последней покупке');
 	    }
	}
	
	if(AnyBalance.isAvailable('favorcat', 'favorcattilldate')) {
		html = AnyBalance.requestGet(baseurl + '/buyer/v2/profile/like-group', addHeaders({
		    'x-city': 3,
            'x-key': authXKey
	    }));
	
	    var json = getJson(html);
		AnyBalance.trace(JSON.stringify(json));
	    
	    if(json.groups && json.groups.length > 0){
	    	AnyBalance.trace('Найдено любимых категорий: ' + json.groups.length);
			for(var i=0; i<json.groups.length; ++i){
	            var c = json.groups[i];
				
			    sumParam(c.likeGroupName, result, 'favorcat', null, null, null, create_aggregate_join(',<br> '));
			}
			
			getParam(json.likeGroups, result, 'favorcattilldate', /<span[^>]*>[\s\S]*?(Действуют до [\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по любимым категориям');
			result.favorcat = 'Нет данных';
 	    }
	}
	
	AnyBalance.setResult(result);
}
