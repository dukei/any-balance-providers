
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.6,en;q=0.4',
    'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'Host': 'gorzdrav.org',
    'Referer': 'https://gorzdrav.org/',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.54 Safari/537.36',
};

var baseurl = 'https://gorzdrav.org';
var g_csrf;
var g_savedData;
var replaceNumber = [replaceTagsAndSpaces, /\D/g, '', /.*(\d\d\d)(\d\d\d)(\d\d)(\d\d)$/, '+7 $1 $2-$3-$4'];

function main() {
	var prefs = AnyBalance.getPreferences();
	
	if(!g_savedData)
		g_savedData = new SavedData('gorzdrav', prefs.login);

	g_savedData.restoreCookies();

    AnyBalance.trace ('Пробуем войти в личный кабинет...');
	
	var html = AnyBalance.requestGet(baseurl + '/', addHeaders({'Upgrade-Insecure-Requests': 1}));
	
	if (!html || AnyBalance.getLastStatusCode() > 500) {
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
	
	html = AnyBalance.requestGet(baseurl + '/my-account/my-profile', addHeaders({'Upgrade-Insecure-Requests': 1}));
		
	getParam(html, result, 'balance', /Активные бонусы[\s\S]*?form-label[^>]*>\(([\s\S]*?)\)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses_active', /Активные бонусы[\s\S]*?card__value[^>]*>([\s\S]*?)<span/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses_inactive', /Неактивные бонусы[\s\S]*?card__value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses_burn', /card__balance b-icn--fire">([\s\S]*?)сгорит/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'bonuses_till', /card__balance b-icn--fire">[\s\S]*?сгорит<br>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseDate);
	
	var firstName = getParam(html, null, null, /name="firstName"[\s\S]*?value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	var middleName = getParam(html, null, null, /name="middleName"[\s\S]*?value="([\s\S]*?)"/i, replaceTagsAndSpaces);
	var fio = firstName;
	if (middleName)
		fio += ' ' + middleName;
	getParam(fio, result, 'fio', null, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /Номер карты[\s\S]*?card__number[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cardnum', /Номер карты[\s\S]*?card__number[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'cardstate', /Статус карты[\s\S]*?card__value[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, capitalFirstLetters);
	getParam(html, result, 'phone', /name="phone"[\s\S]*?value="([\s\S]*?)"/i, replaceNumber);

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
	
	if (!html || AnyBalance.getLastStatusCode() > 500) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже');
	}
	
	g_csrf = getParam(html, /name="CSRFToken"[^>]*value="([^"]*)/i, replaceHtmlEntities);
	
	if(!g_csrf){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти токен для авторизации. Сайт изменен?');
	}
	
	var captcha = solveRecaptcha('Пожалуйста, подтвердите, что вы не робот', AnyBalance.getLastUrl(), '6Le2gr8UAAAAAF46W1xVYXBYnFAsUxz73HU4CBSP', {USERAGENT: g_headers['User-Agent']});
	
	html = AnyBalance.requestPost(baseurl + '/login/sms/send', {
        'j_username': formattedLogin,
		'authorizationFormType': 'PHONE',
        'g-recaptcha-response': captcha,
		'isVisibleCaptcha': false,
        'CSRFToken': g_csrf
    }, addHeaders({
		'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Host': 'gorzdrav.org',
		'Origin': baseurl,
		'Referer': baseurl + '/',
		'X-Requested-With': 'XMLHttpRequest'
	}));
	
	var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения, высланный на номер ' + prefs.login, null, {inputType: 'number', time: 180000});
	
	html = AnyBalance.requestPost(baseurl + '/j_spring_security_check', {
        'j_username': formattedLogin,
		'authorizationFormType': 'PHONE',
		'isVisibleCaptcha': false,
        'j_password': code,
        'CSRFToken': g_csrf
    }, addHeaders({
		'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Host': 'gorzdrav.org',
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
