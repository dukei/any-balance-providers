/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var g_baseurls = {
    ordinary: 'https://prcab.x5club.ru/cwa/',
    vip: 'https://prcab.x5club.ru/green/'
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = g_baseurls[prefs.type] || g_baseurls.ordinary;;

	if(!prefs.login)
		throw new AnyBalance.Error ('Введите номер карты.');
	if(!prefs.password)
		throw new AnyBalance.Error ('Введите пароль.');
		
    AnyBalance.trace('Входим в кабинет ' + baseurl);
    //submitLogin (prefs);
	
    var html = AnyBalance.requestGet (baseurl + 'anonymousLogin.do');
	
    html = AnyBalance.requestPost (baseurl + 'login.do', {
        'job':        'LOGIN',
        'parameter':  formatDate (new Date ()),
        'pricePlan':  '',
        'login':      prefs.login,
        'password':   prefs.password
    });
	
    if(!/logout\.do\?menuId=TML/i.test(html)){
        var error = getParam(html, null, null, /class="errorBoldText"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Неизвестная ошибка. Пожалуйста, свяжитесь с автором провайдера.');
    }
	
    var result = {success: true};
	getParam(html, result, '__tariff', /Номер карты:[^\d]*(\d+)/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс:[^\d]*(\d*)/i, replaceTagsAndSpaces, parseBalance);
	
	if (AnyBalance.isAvailable('customer')) {
        html = AnyBalance.requestGet (baseurl + 'accountDetails.do');
        getParam (html, result, 'customer', /(Имя[\s\S]*?<td>([^<]*)[\s\S]*Фамилия[\s\S]*?<td>([^<]*))/i, [/Имя[\s\S]*?<td>(.)[^<]*[\s\S]*Фамилия[\s\S]*?<td>([^<]+)/, '$2 $1.']);
    }
    if (AnyBalance.isAvailable('burnInThisMonth')) {
        html = AnyBalance.requestGet (baseurl + 'balanceStructure.do');
		var table = getParam(html, null, null, /<table[^>]*id=[^>]*class="results"[\s\S]*?<\/table>/i);
		if(table){
			getParam(html, result, 'burnDate', /Дата списания баллов(?:[\s\S]*?<td[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
			getParam(html, result, 'burnInThisMonth', /Кол-во баллов,\s*подлежащих списанию(?:[\s\S]*?<td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		}else{
			AnyBalance.trace ('Не найдено аннулированных баллов');
		}
    }
    AnyBalance.setResult (result);
}

// Не совсем понятно, для чего это, можно же просто логин передавать, не?
function submitLogin (prefs) {
    var login
    login = "";
    for (var i = 0; i < prefs.login.length; i++) {
        var c = prefs.login.charCodeAt (i);
        if (c <= 57 && c >= 48) {
            login += prefs.login.charAt (i);
        } 
    }
    prefs.login = login;
	// Вроде они теперь передают пароль напрямую, оставим на всякий
    //prefs.password = calcSHA1 (login + prefs.password);
}

function formatDate (date) {
    var day = date.getDate();
    if (day < 10)
        day = '0' + day;

    var month = date.getMonth () + 1;
    if (month < 10)
        month = '0' + month;

    var hours = date.getHours ();
    if (hours < 10)
        hours = '0' + hours;

    var minutes = date.getMinutes ();
    if (minutes < 10)
        minutes = '0' + minutes;

    return date.getFullYear () + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
}