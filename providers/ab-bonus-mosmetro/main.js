
/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36',
};

function generateCodeVerifier() {
    for (var t = "", e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_~", n = 0; n < 64; n++)
        t += e.charAt(Math.floor(Math.random() * e.length));
    return t
}

function generateState() {
	return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

var baseurl = 'https://lk.mosmetro.ru';

function login(){
	var prefs = AnyBalance.getPreferences();
	
	var cv = generateCodeVerifier();
	var state = generateState();
	var hash = CryptoJS.SHA256(cv);
	var challenge = hash.toString(CryptoJS.enc.Base64)
		.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

	var html = AnyBalance.requestGet(baseurl + '/api/externals/v1.0?redirectUri=' + baseurl + '/external-auth&state=' + state + '&codeChallenge=' + challenge + '&codeChallengeMethod=S256',
		{Referer: baseurl + '/sign_in'});
	var json = getJson(html);

	var url = json.data.authorizeUrl;
	html = AnyBalance.requestGet(url, addHeaders({Referer: baseurl + '/sign_in'}));

	var login = prefs.login;
	if(!/@/.test(login))
		login = '7' + login;
	
	var signinurl = AnyBalance.getLastUrl();
	var returnUrl = getParam(signinurl, /ReturnUrl=([^&]*)/i, null, decodeURIComponent);
	html = AnyBalance.requestPost(baseurl + '/auth/api/auth/login/password', JSON.stringify({
		"password":prefs.password,
		"login":login.replace(/\+/g, ''),
		"returnUrl":returnUrl
	}), addHeaders({
		"Content-Type": "application/json",
		Referer: signinurl
	}));

	if(/^\{/.test(html)){
		AnyBalance.trace(html);
		json = getJson(html);
		throw new AnyBalance.Error(json.type || 'Не удалось войти в личный кабинет. Сайт изменен?', null, /user|pass/i.test(json.type));
	}
	
	url = html;
	html = AnyBalance.requestGet(joinUrl(baseurl, url), addHeaders({Referer: signinurl}));

	var authlink = AnyBalance.getLastUrl();
	var code = getParam(authlink, /code=([^&]*)/, null, decodeURIComponent);
	var scope = getParam(authlink, /scope=([^&]*)/, null, decodeURIComponent);
	var state = getParam(authlink, /state=([^&]*)/, null, decodeURIComponent);

	html = AnyBalance.requestPost(baseurl + '/api/authorization/v1.0/codeFlow', JSON.stringify({
    	"code": code,
    	"codeVerifier": cv,
    	"redirectUri": baseurl + "/external-auth"
	}), addHeaders({
		"Content-Type": "application/json",
		Referer: AnyBalance.getLastUrl()
	}));

	var json = getJson(html);
	if(!json.success){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет после авторизации. Сайт изменен?');
	}

	g_headers.Authorization = json.data.type + ' ' + json.data.accessToken;
}

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');
	
	AB.checkEmpty(/(^\d{10}$|@)/, 'Введите телефон (10 цифр без пробелов и разделителей) или емейл!');

	login();

	var html = AnyBalance.requestGet(baseurl + '/api/carriers/v1.0/linked', addHeaders({Referer: baseurl + '/personal-cabinet'}));
	var json = getJson(html);

	var result = {
		success: true,
	};

	AnyBalance.trace("Найдено карт: " + json.data.cards.length);
	var selected;

	for(var i=0; i<json.data.cards.length; ++i){
		var card = json.data.cards[i];
		var name = card.card.cardType + ' ' + card.card.displayName + ' ' + card.card.cardNumber;
		AnyBalance.trace('Найдена карта ' + name);

		if((prefs.num && endsWith(card.card.cardNumber, prefs.num)) || (!prefs.num && i==0)){
			AnyBalance.trace('Выбираем эту карту');
			getParam(name, result, '__tariff');
			getParam(card.balance.balance, result, 'balance');
			getParam(card.balance.bonus, result, 'bonus');
			selected = card;
		}
	}

	if(!selected){
		if(json.data.cards.length)
			throw new AnyBalance.Error('Не найдена карта с последними цифрами ' + prefs.num);
		else
			throw new AnyBalance.Error('В кабинете не прикреплена ни одна карта');
	}

	AnyBalance.setResult(result);
}
