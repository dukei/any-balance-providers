/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
	'Connection': 'keep-alive',
	'Origin': 'https://user.utex.net',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

var baseurl = 'https://user.utex.net/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'cp2/login?uri=', g_headers);
	
    if(!html || AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
    var form = getElement(html, /<form[^>]+id="loginForm"[^>]*>/i);
    if(!form){
        AnyBalance.trace(form);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {
	   	if(name == 'login') {
	   		return prefs.login;
    	}else if(name == 'password'){
	    	return prefs.password;
	    }
        	        
	    return value;
	});
		
	html = AnyBalance.requestPost(baseurl + 'cp2/login?uri=', params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
	    'Referer': AnyBalance.getLastUrl(),
	}));
	
	if(!/logout/i.test(html)){
		var error = getParam(html, /<div[^>]+class='error'[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
		if(error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + 'cp2/?page=info', g_headers);
	
    getParam(html, result, 'balance',  /Баланс<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'monthly_payment',  /Суммарная абонентская плата за все услуги<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'to_pay',  /Рекомендуемый платеж<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Текущий тариф<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'status',    /Статус<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'agreement', /Договор:\s*([\s\S]*?)<br><\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'agreement_date', /Дата регистрации<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'paycode', /(?:Код оплаты|Лиц\.\s?счет)<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'traffic',  /Трафик<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'date_start', /Дата начала периода<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'date_till', /Дата завершения периода<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'address', /Адрес<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'email', /Контактный email<\/td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'userNum', /Мобильный телефон<\/td><td[^>]*>([\s\S]*?)<\/td>/i, replaceNumber);
	getParam(html, result, 'userName',  /<div[^>]+style="font-size:\d+px;" data-customstyle=[^>]*>([\s\S]*?)<br><\/div>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('last_oper_sum', 'last_oper_date', 'last_oper_type', 'last_oper_subtype', 'last_oper_sum_after', 'last_oper_comment')){
	    html = AnyBalance.requestGet(baseurl + 'cp2/?page=histpayment', g_headers);
		
		var table = getElement(html, /<table[^>]+class[^>]*>/i);
	    var hists = getElements(table, /<tr[^>]+class[^>]*>/ig);
	
	    if(hists.length && hists.length > 0){
			AnyBalance.trace('Найдено операций: ' + hists.length);
			result.last_oper_subtype = '–';
			for(var i=hists.length-1; i>=0; i--){
	    	    var hist = hists[i];
				
				var paymentSum = getParam(hist, null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance); // Проверяем поступление
				if(!paymentSum) // Если поступления нет, значит это списание
					paymentSum = getParam(hist, null, null, /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				result.last_oper_sum = paymentSum||0;
				
				getParam(hist, result, 'last_oper_date', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDateISO);
		        getParam(hist, result, 'last_oper_type', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
				getParam(hist, result, 'last_oper_subtype', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
				getParam(hist, result, 'last_oper_sum_after', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
				getParam(hist, result, 'last_oper_comment', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, capitalizeFirstLetter);
				
				if(!result.last_oper_subtype)
				    result.last_oper_subtype = '–';
				if(!result.last_oper_comment)
				    result.last_oper_comment = 'Нет комментария';
				
			    break;
	        }
		}else{
			AnyBalance.trace('Не удалось получить данные по операциям');
		}
	}
	
	/*if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var dt = new Date();
        html = AnyBalance.requestPost(baseurl, {
            devision:2,
            service:1,
            statmode:0,
            vgstat:0,
            timeblock:1,
            year_from:dt.getFullYear(),
            month_from:dt.getMonth()+1,
            day_from:1,
            year_till:dt.getFullYear(),
            month_till:dt.getMonth()+1,
            day_till:dt.getDate()
        });
        re = new RegExp(prefs.login + '\\s*</a>\\s*</td>(?:[\\S\\s]*?<td[^>]*>){2}(.*?)</td>', 'i');
        getParam(html, result, 'trafficIn', re, replaceTagsAndSpaces, parseTrafficGbMy);
        re = new RegExp(prefs.login + '\\s*</a>\\s*</td>(?:[\\S\\s]*?<td[^>]*>){3}(.*?)</td>', 'i');
        getParam(html, result, 'trafficOut', re, replaceTagsAndSpaces, parseTrafficGbMy);
    }*/

    AnyBalance.setResult(result);
}

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

