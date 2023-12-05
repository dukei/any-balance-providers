/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Домашний Интернет и Телевидение Акадо
Сайт оператора: http://www.akado.ru/
Личный кабинет: https://office.akado.ru/login.xml
*/

var g_headers = {
	'Accept': '*/*',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Origin': 'https://office.akado.ru',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.131 Safari/537.36',
};

var baseurl = 'https://office.akado.ru/';
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(?:\d)?(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function getId(html) {
	return getParam(html, null, null, /akado-request\s*([\dA-F\-]+)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'user/login.xml?NeedLoggedOn', g_headers);
	
	html = requestPostMultipart(baseurl + 'user/login.xml', {
		login: prefs.login,
		password: prefs.password,
	}, addHeaders({
		'Referer': baseurl + 'user/login.xml?NeedLoggedOn',
		'X-Request': 'xml',
		'X-Request-ID': getId(html)
	}));
	
	if(!/Вы успешно вошли в Личный кабинет/i.test(html)){
		var error = getElement(html, /<message[^>]*>/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /логин|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};

	getParam(html, result, 'balance', /balance="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'username', /<account([\s\S]*?)\/>/i, [replaceTagsAndSpaces, /surname="([^"]+)"\s*name="([^"]+)"\s*patronymic="([^"]+)[\s\S]*/i, '$1 $2 $3']);
	getParam(html, result, 'agreement', /crc="([^"]+)/i, replaceTagsAndSpaces);
	
	if(AnyBalance.isAvailable(['balance_begin', 'payhint', 'expense_this_month', 'balance_end', 'expense_next_month', 'last_oper_sum', 'last_oper_date'])){
	    html = AnyBalance.requestGet(baseurl + 'finance/display.xml');
		
		getParam(html, result, 'balance_begin', /balance-begin="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'payhint', /prepay amount="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'expense_this_month', /expense amount="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'balance_end', /prepay[\s\S]+bill amount="([\s\S]*?)"[\s\S]*?Остаток на сч[е|ё]те/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'expense_next_month', /prepay[\s\S]+bill amount="([\s\S]*?)"[\s\S]*?в следующем месяце/i, replaceTagsAndSpaces, parseBalance);
		
		if(AnyBalance.isAvailable('last_oper_sum', 'last_oper_date')){
		    html = AnyBalance.requestGet(baseurl + 'finance/payments-display.xml');
		    
		    getParam(html, result, 'last_oper_sum', /amount="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
		    getParam(html, result, 'last_oper_date', /payment date="([^"]+)/i, replaceTagsAndSpaces, parseDate);
		}
	}
	
	if(AnyBalance.isAvailable('till_date', 'till_days')){
	    html = AnyBalance.requestGet(baseurl + 'information/infoblock.xml');
		
		getParam(html, result, 'till_date', /date-to-block amount="([^"]+)/i, replaceTagsAndSpaces, parseDate);
		getParam(html, result, 'till_days', /days-to-block amount="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	}
	
	if(AnyBalance.isAvailable('notifications')){
	    html = AnyBalance.requestGet(baseurl + 'information/notifications.xml');
		
		getParam(html, result, 'notifications', /surveys amount="([^"]+)/i, replaceTagsAndSpaces, parseBalance);
	}

    html = AnyBalance.requestGet(baseurl + 'services/display.xml');
	
	sumParam(html, result, '__tariff', /<service[^>]*type="(?:tv\-interactive|internet)"[^>]*name="([^"]+)[^>]*"active"[\s\S]*?[^>]*>/ig, replaceTagsAndSpaces, null, aggregate_join);
	
	if(AnyBalance.isAvailable('phone', 'address')){
	    html = AnyBalance.requestGet(baseurl + 'user/profile-display.xml');
		
		getParam(html, result, 'phone', /Контактный телефон[^>]*>([\s\S]*?)</i, replaceNumber);
		
		var res = getParam(html, null, null, /address city="([^"]+)/i, replaceTagsAndSpaces);
		var street = getParam(html, null, null, /street="([^"]+)/i, replaceTagsAndSpaces);
		if(street)
			res += ', ' + street;
		var house = getParam(html, null, null, /house="([^"]+)/i, replaceTagsAndSpaces);
		if(house)
			res += ', ' + house;
		var flat = getParam(html, null, null, /flat="([^"]+)/i, replaceTagsAndSpaces);
		if(flat)
			res += ', кв.' + flat;
		result.address = res;
	}
	
    AnyBalance.setResult(result);
}