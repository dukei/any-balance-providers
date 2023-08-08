
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
    'Referer': 'https://gorzdrav.org/',
	'Upgrade-Insecure-Requests': '1',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
};

var g_status = {Active: 'Активна', Inactive: 'Не активна', Blocked: 'Заблокирована'};

var baseurl = 'https://gorzdrav.org';
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	if(!g_savedData)
		g_savedData = new SavedData('gorzdrav', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/', addHeaders({'Upgrade-Insecure-Requests': 1}));
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}
	
	if (!/\/logout\//i.test(html)) {
		AnyBalance.trace('Сессия новая. Будем логиниться заново...');
		clearAllCookies();
    	loginSite(prefs);
	} else {
		AnyBalance.trace('Сессия сохранена. Входим автоматически...');
	}
	
	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '/my-account/my-profile', g_headers);
	
	getParam(html, result, 'email', /name="email"[\s\S]*?value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	getParam(html, result, 'phone', /name="phone"[\s\S]*?value="([\s\S]*?)"/i, replaceNumber);
	
	var firstName = getParam(html, null, null, /name="firstName"[\s\S]*?value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	var middleName = getParam(html, null, null, /name="middleName"[\s\S]*?value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	var lastName = getParam(html, null, null, /name="lastName"[\s\S]*?value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	var fio = firstName;
	if (middleName)
		fio += ' ' + middleName;
	if (lastName)
		fio += ' ' + lastName;
	getParam(fio, result, 'fio', null, replaceTagsAndSpaces);
	
	var csrfToken = getParam(html, /name="CSRFToken"[^>]*value="([^"]*)/i, replaceHtmlEntities);
	
	html = AnyBalance.requestPost(baseurl + '/loyaltyCard', {'CSRFToken': csrfToken}, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Referer': baseurl + '/profile'
	}));
	
	var json = getJson(html);
	
	getParam(json.active, result, 'balance', null, null, parseBalance);
	getParam(json.active, result, 'bonuses_active', null, null, parseBalance);
	getParam(json.inactive, result, 'bonuses_inactive', null, null, parseBalance);
	getParam(json.amounts[0].amount, result, 'bonuses_burn', null, null, parseBalance);
	getParam(json.amounts[0].expirationDate, result, 'bonuses_till', null, null, parseDateISO);
	
	getParam(json.barcode, result, '__tariff');
	getParam(json.barcode, result, 'cardnum');
	getParam(g_status[json.status]||json.status, result, 'cardstate');

	AnyBalance.setResult(result);
}
	
function loginSite(prefs) {
    var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите номер телефона!');
    if (/^\d+$/.test(prefs.login)){
	    checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');
	}
	
	var login = prefs.login.replace(/[^\d]+/g, '');
	var formattedLogin = login.replace(/.*(\d{3})(\d{3})(\d{2})(\d{2})$/i, "$1) $2-$3-$4");
	
	var html = AnyBalance.requestGet(baseurl + '/', addHeaders({'Upgrade-Insecure-Requests': 1}));
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}
	
	if (/cloudflare/.test(html)){
       	AnyBalance.trace(html);
	    throw new AnyBalance.Error('Обнаружена защита от роботов. Попробуйте обновить провайдер не ранее, чем через 24 часа');
    }
	
	var csrfToken = getParam(html, /name="CSRFToken"[^>]*value="([^"]*)/i, replaceHtmlEntities);
	
	if(!csrfToken){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен авторизации. Сайт изменен?');
	}
	
	var captcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', AnyBalance.getLastUrl(), '6Le2gr8UAAAAAF46W1xVYXBYnFAsUxz73HU4CBSP', {USERAGENT: g_headers['User-Agent']});
	
	html = AnyBalance.requestPost(baseurl + '/login/sms/send', {
        'j_username': formattedLogin,
		'authorizationFormType': 'PHONE',
        'g-recaptcha-response': captcha,
		'isVisibleCaptcha': false,
        'CSRFToken': csrfToken
    }, addHeaders({
		'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Origin': baseurl,
		'Referer': baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	if (AnyBalance.getLastStatusCode() >= 400) {
		if(json.global_error){
			var error = json.global_error;
		    AnyBalance.trace(html);
	    	throw new AnyBalance.Error(error, null, null, /ошибка|смс/i.test(error));
		}
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось отправить SMS. Сайт изменен?');
	}
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер +7' + prefs.login, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(baseurl + '/j_spring_security_check', {
        'j_username': formattedLogin,
		'authorizationFormType': 'PHONE',
		'isVisibleCaptcha': false,
        'j_password': code,
        'CSRFToken': csrfToken
    }, addHeaders({
		'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Origin': baseurl,
		'Referer': baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	if (AnyBalance.getLastStatusCode() == 401) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Неверный код подтверждения!');
	}
	
	var html = AnyBalance.requestGet(baseurl + '/', addHeaders({'Upgrade-Insecure-Requests': 1}));
	
    if (!/\/logout\//i.test(html)) {
		AnyBalance.trace(html);
       	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}
	
	g_savedData.setCookies();
	g_savedData.save();
	return html;
}
