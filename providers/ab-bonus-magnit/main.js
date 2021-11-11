
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
};

var baseurl = "https://new.moy.magnit.ru";
var g_savedData;
var replaceLogin = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+ 7 ( $1 ) $2-$3$4'];
var replaceLogin1 = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, ' 7 ( $1 ) $2-$3$4'];
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main(){
    var prefs = AnyBalance.getPreferences();
	
    AnyBalance.setDefaultCharset('utf-8');
	
	if(!g_savedData)
		g_savedData = new SavedData('magnit', prefs.login);

	g_savedData.restoreCookies();
	
	AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/dashboard/', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 400){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт Мой магнит временно недоступен. Попробуйте ещё раз позже');
    }
	
	if(/<div class="balances">/i.test(html)){
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}else{
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
    }

    var result = {success: true};
	
	if (AnyBalance.isAvailable('balance', 'express', 'magnets', 'spend_now', 'count_now', 'level', 'status')) {
		html = AnyBalance.requestGet(baseurl + '/dashboard/', g_headers);
		
	    getParam(html, result, 'balance', /<div class="balance balance--b">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'express', /<div class="balance balance--e">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'magnets', /<div class="balance balance--m">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'spend_now', /<span data-dashboard-spend-now>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'count_now', /<span data-dashboard-count-now>([\s\S]*?)\s*товара<\/span>/i, replaceTagsAndSpaces, parseBalance);
	    getParam(html, result, 'level', /<div class="welcome-proc welcome-proc--gold" data-dashboard-level>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	    var status = {
	    	gold: 'Золотой',
	    	silver: 'Серебряный',
	    	bronze: 'Бронзовый'
	    };
	    var medal = getParam(html, /<div class="header-balance[\s\S]*?medal medal--([\s\S]*?)"><\/div>/i, replaceTagsAndSpaces);
	    getParam (status[medal]||medal, result, 'status');
	}
	
	if (AnyBalance.isAvailable('__tariff', 'cardnum_plastic', 'cardnum_virtual', 'phone', 'fio')) {
	    html = AnyBalance.requestGet(baseurl + '/dashboard/settings/', g_headers);
	
	    getParam(html, result, '__tariff', /Пластиковая Карта Магнит<[\s\S]*?card-number">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	    getParam(html, result, 'cardnum_plastic', /Пластиковая Карта Магнит<[\s\S]*?card-number">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	    getParam(html, result, 'cardnum_virtual', /Виртуальная Карта Магнит<[\s\S]*?card-number">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	    getParam(html, result, 'phone', /name="phone"[\s\S]*?value="([\s\S]*?)"/i, replaceNumber);
	    getParam(html, result, 'fio', /name="name" value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	}
	
	if (AnyBalance.isAvailable('last_operation')) {
   	   	html = AnyBalance.requestGet(baseurl + '/dashboard/history/', g_headers);
		
		var dt = new Date();
        var dtStart = new Date(dt.getFullYear(), dt.getMonth(), '01');
		
		var hists = getElements(html, /<div[^>]+class="history-item"[^>]*>/ig);
		AnyBalance.trace('Найдено транзакций: ' + hists.length);
		if(hists && hists.length > 0){
			// Данные по покупкам за месяц
			for(var i = 0; i<hists.length; i++){
				var purDate = getParam(hists[i], /<div class="history-item-title">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
		    	if (purDate >= dtStart) {
		    	    sumParam(hists[i], result, 'month_purchases', /<div class="history-item-sum">([\s\S]*?)\s?₽<\/div>/i, replaceTagsAndSpaces, parseBalance, aggregate_sum);
				}
		    }
			
			// Данные по последней транзакции
			var hist = hists[0];
		    var date = getParam(hist, /<div class="history-item-title">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
            var sum = getParam(hist, /<div class="history-item-sum">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		    var bonus_b = getParam(hist, /<div class="balance balance--b">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			var bonus_e = getParam(hist, /<div class="balance balance--e">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			if (!bonus_e)
				var bonus_e = 0;
			var bonus_m = getParam(hist, /<div class="balance balance--m">([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
			if (!bonus_m)
				var bonus_m = 0;
			
    		var res = date + '. ';
			res += 'Покупка на ' + sum + '. ';
    		res += 'Бонусы: ' + bonus_b + ' Б. ';
			res += 'Экспресс: ' + bonus_e + ' Б. ';
			res += 'Магнитики: ' + bonus_m + ' шт.';
    		getParam(res, result, 'last_operation');
			
		}else{
            AnyBalance.trace('Последняя операция не найдена');
			getParam('Нет операций', result, 'last_operation');
        }
	}
	
	AnyBalance.setResult(result);
}


function loginSite(prefs){
	var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	
	var uPhone = getParam(prefs.login, null, null, null, replaceLogin);
	
	var params = [
	    ['phone',uPhone],
	];
	
	var html = AnyBalance.requestPost(baseurl + '/local/ajax/login/', params, addHeaders({
		'accept': 'application/json, text/javascript, */*; q=0.01',
		'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'origin': baseurl,
		'Referer': baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest',
	    }));

	if(!html){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа! Сайт изменён?');
	}
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));

    if(!json.data && json.status == "success"){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось отправить SMS на указанный номер из-за проблем на сайте. Попробуйте ещё раз позже');
	}else if (json.status != "success") {
		var error = json.errors.phone;
    	if (error) {
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error);	
       	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось отправить SMS на указанный номер. Проверьте правильность ввода номера телефона');
    }
	
	if (!json) {
       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
	
	AnyBalance.trace('Сайт затребовал код подтверждения из SMS');
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + prefs.login, null, {inputType: 'number', time: 170000});
	
	var uPhone = getParam(prefs.login, null, null, null, replaceLogin1);
	
	var params = [
	    ['phone',uPhone],
		['code',code],
	];
	
	var html = AnyBalance.requestPost(baseurl + '/local/ajax/login/', params, addHeaders({
		'accept': 'application/json, text/javascript, */*; q=0.01',
		'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'origin': baseurl,
		'Referer': baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest',
	    }));
	
	var json = getJson(html);
	AnyBalance.trace(JSON.stringify(json));
	
	if (/user_not_exists/i.test(html)) {
       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Карта не зарегистрирована');
    }

    if (!json || json.status != "success") {
		var error = json.errors.code;
    	if (error) {
			AnyBalance.trace(html);
       		throw new AnyBalance.Error(error);	
       	}

       	AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменён?');
    }
	
	g_savedData.setCookies();
	g_savedData.save();
	return json;
}
