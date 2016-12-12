/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_baseurls = {
    ordinary: 'https://prcab.x5club.ru/cwa/',
    vip: 'https://prcab.x5club.ru/green/'
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    var baseurl = g_baseurls[prefs.type] || g_baseurls.ordinary;;

	if(!prefs.login)
		throw new AnyBalance.Error ('Введите номер карты или номер телефона.');
	if(!prefs.password)
		throw new AnyBalance.Error ('Введите пароль.');
		
    AnyBalance.trace('Входим в кабинет ' + baseurl);
	
    var html = AnyBalance.requestGet (baseurl + 'anonymousLogin.do');

    var card = /^\d{16}$/.test(prefs.login);
    var form = getElement(html, /<form[^>]+LoginForm/i);
	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'job') {
			return 'LOGIN';
		} else if (name == 'password') {
			return prefs.password;
		} else if (name == 'captchaAnswer') {
			var image = getParam(form, /<img[^>]+captcha[^>]+src="([^"]*)/i, replaceHtmlEntities);
			image = AnyBalance.requestGet(joinUrl(baseurl, image), addHeaders({Referer: baseurl}));
			return AnyBalance.retrieveCode('Введите символы с изображения', image);
		}

		return value;
	});

	params.loginMethod = card ? 'card' : 'mobile';
	params[card ? 'login' : 'mobile'] = prefs.login;

    html = AnyBalance.requestPost (baseurl + 'login.do', params, addHeaders({Referer: baseurl}));
	
    if(!/logout\.do\?menuId=TML/i.test(html)){
        var error = getParam(html, null, null, /class="errorBoldText"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Некоррект/i.test(error));
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