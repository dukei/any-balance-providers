
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
    'Cache-Control': 'max-age=0',
    'Referer': 'https://www.mosigra.ru/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
};

var baseurl = 'https://www.mosigra.ru';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	if(!g_savedData)
		g_savedData = new SavedData('mosigra', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/account/', addHeaders({'Upgrade-Insecure-Requests': 1}));
	
	if (!html || AnyBalance.getLastStatusCode() > 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}
	
	if (!/href="\/logout"/i.test(html)) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
	} else {
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '/?route=account/sailplay/customer', addHeaders({
		'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Referer': baseurl + '/account/'
	}));
	
	var json = getJson(html);
		
	var info = json.customer;
	AnyBalance.trace('Аккаунт: ' + JSON.stringify(info));
		
	getParam(info.points.confirmed, result, 'balance', null, null, parseBalance);
	getParam(info.points.unconfirmed, result, 'soon_bonuses', null, null, parseBalance);
	getParam(info.points.expired, result, 'exp_bonuses', null, null, parseBalance);
	getParam(info.points.first_expired.points, result, 'exp_bonuses_first', null, null, parseBalance);
	getParam(info.points.first_expired.date, result, 'exp_date_first', null, null, parseDate);
	getParam(info.level.name + ' | ' + info.level.percent + '%', result, '__tariff');
	getParam(info.level.name, result, 'level_name');
	getParam(info.total, result, 'total_sum', null, null, parseBalance);
	getParam(info.level.next, result, 'to_next_level', null, null, parseBalance);
	getParam(info.level.percent, result, 'level_percent', null, null, parseBalance);
	getParam(info.id, result, 'account_id');
	var fio = info.firstname;
	if (info.lastname)
		fio += ' ' + info.lastname;
	getParam(fio, result, 'fio');
	getParam(info.phone, result, 'phone', null, replaceNumber);
	
	if(AnyBalance.isAvailable('last_order_num', 'last_order_sum', 'last_order_date', 'last_order_state', 'last_order_bonuses')) {
		html = AnyBalance.requestGet(baseurl + '/?route=account/sailplay/orders_list', addHeaders({
	    	'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
	    	'Referer': baseurl + '/account/'
	    }));
	
	    var json = getJson(html);
		
		var info = json.orders_list;
		AnyBalance.trace('Заказы: ' + JSON.stringify(info));

	    if(info && info.length > 0){
	    	AnyBalance.trace('Найдено заказов: ' + info.length);
			getParam(info[0].order_num, result, 'last_order_num');
	    	getParam(info[0].total, result, 'last_order_sum', null, null, parseBalance);
	    	getParam(info[0].date, result, 'last_order_date', null, null, parseDate);
			getParam(info[0].state, result, 'last_order_state');
			var dPoints = info[0].sp.points_delta;
			var ddPoints = info[0].sp.debited_points_delta;
			var dPprefix = '';
			var ddPprefix = '';
			if (dPoints > 0)
				dPprefix = '+';
			if (ddPoints > 0)
				ddPprefix = '-';
			getParam(dPprefix + dPoints + '/' + ddPprefix + ddPoints, result, 'last_order_bonuses');
	    }else{
 	    	AnyBalance.trace('Не удалось получить данные по последнему заказу');
 	    }
	}

	AnyBalance.setResult(result);
}
	
function loginSite(prefs) {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
    if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	}
	checkEmpty(prefs.password, 'Введите пароль!');
	
	html = AnyBalance.requestPost(baseurl + '/?route=account/login/modalAjax', {
		scenario: 'email',
        login: prefs.login,
		password: prefs.password
    }, addHeaders({
		'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Origin': baseurl,
		'Referer': baseurl + '/login',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (json.success != 'text_success') {
        var error = json.errors;
		if (error.phone) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error(error.phone, null, /не зарегистрирован/i.test(error));
		} else if (error.email) {
			AnyBalance.trace(html);
			throw new AnyBalance.Error(error.email, null, /не зарегистрирован/i.test(error));
	    } else if (error.login) {
	        AnyBalance.trace(html);
			throw new AnyBalance.Error(error.login, null, /телефон|e-mail/i.test(error));
        } else if (error.password) {
	        AnyBalance.trace(html);
			throw new AnyBalance.Error(error.password, null, /парол/i.test(error));
        }

        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }
	
	g_savedData.setCookies();
	g_savedData.save();
	return html;
}
