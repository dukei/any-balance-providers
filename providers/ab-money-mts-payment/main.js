/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Cache-Control': 'max-age=0',
	Connection: 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
};

var g_baseurl = 'https://payment.mts.ru';

function main() {
	var prefs = AnyBalance.getPreferences();

	checkEmpty(prefs.login, 'Введите номер телефона');
	checkEmpty(prefs.password, 'Введите пароль');
	
	var html = enterMtsLK({
		login: prefs.login,
		password: prefs.password,
		url: 'https://login.mts.ru/amserver/UI/Login?service=money&goto=https://payment.mts.ru/Auth/SignIn/%3FReturnUrl%3D%2F', 
		baseurl: g_baseurl
	});

	AnyBalance.trace('It looks like we are in selfcare...');

	var result = {success: true};

	html = AnyBalance.requestGet(g_baseurl + '/cards', addHeaders({Referer: g_baseurl + '/'}));
	if(AnyBalance.getLastStatusCode() >= 400 || /Unreachable server/i.test(html))
		throw new AnyBalance.Error('Сайт временно недоступен. Пожалуйста, попробуйте позже');

	var myphone = getElements(html, [/<div[^>]+acc[oa]unt-phone/ig, /мой телефон/i])[0];
	if(myphone){
		getParam(myphone, result, 'balance_phone', /<[^>]+b-payment-element__val-num[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		result.status_phone = 'Не блокирован';
		getParam(myphone, result, 'status_phone', /<div[^>]+b-payment-element__warn[^>]*>([\s\S]*?)(?:<\/div>|\.)/i, replaceTagsAndSpaces);
	}

	var cardId = getParam(html, /<a[^>]+href="[^"]*EMONEY[^>]*data-bid="([A-F\d]+)"/i);
	if(!cardId){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти идентификатор электронного кошелька. Сайт изменен?');
	}

    if(AnyBalance.isAvailable('cashback')){
    	var token = getParam(html, /<input[^>]+__RequestVerificationToken[^>]*value="([^"]*)/i, replaceHtmlEntities);
    	html = AnyBalance.requestPost(g_baseurl + '/Auth/EnsureIsAuthenticated/', {
    	}, addHeaders({
    		'X-Requested-With': 'XMLHttpRequest',
    		Referer: g_baseurl + '/cards'
    	}));
    	html = AnyBalance.requestPost(g_baseurl + '/PaymentInstrument/GetCashBackBalance', {
    		__RequestVerificationToken: token
    	}, addHeaders({
    		'X-Requested-With': 'XMLHttpRequest',
    		Referer: g_baseurl + '/cards'
    	}));

        var json = getJson(html);
        getParam(json.balance, result, 'cashback');

    }

	html = AnyBalance.requestGet(g_baseurl + '/cards/' + cardId, addHeaders({Referer: g_baseurl + '/cards'}));

	getParam(html, result, 'identification', /<div[^>]+b-card-page__val-status[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, '__tariff', /<div[^>]+b-card-page__val-status[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', /<div[^>]+b-card-page__val-num[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'phone', /<div[^>]+b-card__phone[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
	AnyBalance.setResult(result);
}