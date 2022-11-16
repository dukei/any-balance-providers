/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.7,en;q=0.4',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36'
};

var baseurl = 'https://cabinet.iptel.by';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+$1 ($2) $3-$4-$5'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	var html = AnyBalance.requestGet(baseurl + '/', g_headers);
	
	if(AnyBalance.getLastStatusCode() >= 500){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен. Попробуйте еще раз позже');
    }
	
	var form = getElement(html, /<form[^>]+enctype[^>]*>/i);
    if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
	var params = createFormParams(form, function(params, str, name, value) {

		if(name === 'username'){
			value = prefs.login;
		}else if(name === 'password'){
			value = prefs.password;
		}
	
		return value;
    });

    var action = getParam(form, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    if(!action){
		action = '/';
    }

	html = AnyBalance.requestPost(joinUrl(baseurl, action), params, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded', 
		'Origin': baseurl, 
		'Referer': baseurl + '/'
	}));
	
	if (!/logout/i.test(html)) {
		var error = getElement(html, /<div[^>]+alert-danger/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
	
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'balance', /Баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'status_internet', /Статус интернета[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
	getParam(html, result, 'status_block', /Состояние блокировки[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Имя тарифа(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'abon', /Абон. плата(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'discount', /Списано(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'date_start', /Начало расч. периода(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'date_till', /Конец расч. периода(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'date_connect', /Дата подключения[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'licschet', /Основной лицевой сч[е|ё]т[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'address', /Адрес[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /Мобильный телефон[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceNumber);
	getParam(html, result, 'fio', /<div[^>]+class="well well-sm"><strong>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);
    
	if(AnyBalance.isAvailable(['last_payment_sum', 'last_payment_date', 'last_payment_type'])){
		
		var dt = new Date();
        var dtPrev = new Date(dt.getFullYear(), dt.getMonth()-3, dt.getDate());
        var dts = n2(dt.getDate()) + '.' + n2(dt.getMonth()+1) + '.' + dt.getFullYear();
        var dtPrevs = n2(dtPrev.getDate()) + '.' + n2(dtPrev.getMonth()+1) + '.' + dtPrev.getFullYear();
		
		html = AnyBalance.requestPost(baseurl + '/user/payment', {
			'startDate': dtPrevs,
			'endDate': dts,
            'submit': 'Показать'
		}, addHeaders({
	    	'Content-Type': 'application/x-www-form-urlencoded', 
	    	'Origin': baseurl, 
	    	'Referer': baseurl + '/user/payment'
	    }));
		
		var tab = getElement(html, /<table[^>]+class[\s\S]*?<tbody>/i);
		var pays = getElements(tab, [/<tr[^>]*>/ig, /\d\d.\d\d.\d\d\d\d/i]);
   	   	if(pays && pays.length > 0){
			// Данные по последнему платежу
			AnyBalance.trace('Найдено платежей: ' + pays.length);
			var pay = pays[pays.length-1];
            getParam(pay, result, 'last_payment_sum', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
		    getParam(pay, result, 'last_payment_date', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(pay, result, 'last_payment_type', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
		}else{
            AnyBalance.trace('Последний платеж не найден');
        }
    }

	AnyBalance.setResult(result);
}
