/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7',
    'Connection': 'keep-alive',
    Origin: 'https://www.sportmaster.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
	'Cache-Control': 'max-age=0',
	'Upgrade-Insecure-Requests': '1',
	'Sec-Fetch-User': '?1',                   	
	'Referer': 'https://www.sportmaster.ru/user/session/login.do?continue=%2F',
};

var g_cardTypes = [
    {},
    { auth: 'COMMON', check: '300', name: 'Обычный' },
    { auth: 'SILVER', check: '301', name: 'Серебряный' },
    { auth: 'GOLD', check: '302', name: 'Золотой' }
];

function generateUUID () {
    var s = [], itoh = '0123456789abcdef', i;
    for (i = 0; i < 36; i++) {
        s[i] = Math.floor(Math.random() * 0x10);
    }
    s[14] = 4;
    s[19] = (s[19] & 0x3) | 0x8;
    for (i = 0; i < 36; i++) {
        s[i] = itoh[s[i]];
    }
    s[8] = s[13] = s[18] = s[23] = '-';
    return s.join('');
}

var g_androidId;
var g_accessToken;

function callApi(action, params, method){
	if(!g_androidId){
		var prefs = AnyBalance.getPreferences();
		g_androidId = hex_md5(prefs.login).substr(0, 16);
	}

    if(!g_accessToken){
    	var token = AnyBalance.getData('accessToken');
    	if(token && AnyBalance.getData('login') === prefs.login)
    		g_accessToken = token;
    }

    if(!g_accessToken){
    	g_accessToken = generateUUID();
    	AnyBalance.setData('login', prefs.login);
    	AnyBalance.setData('accessToken', g_accessToken);
    	AnyBalance.saveData();
    }

	var headers = {
		'User-Agent': 'mobileapp-android-3.5.5(21135)',
		'X-SM-MobileApp': g_androidId,
		Connection: 'Keep-Alive'
	};

	if(params)
		headers['Content-Type'] = 'application/json; charset=utf-8';

	var delim = action.indexOf('?') >= 0 ? '&' : '?';
	action += delim + 'access-token=' + encodeURIComponent(g_accessToken);

	var html = AnyBalance.requestPost('https://mobileapp.sportmaster.ru/rest/v1/' + action, params ? JSON.stringify(params) : null, headers, {HTTP_METHOD: method || 'GET'});

	var json = getJson(html);
	if(json.error){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error, /42/i.test(json.error) ? true : null, /телефон|парол/i.test(json.error));
	}
		
	return json;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите номер телефона!');
    AB.checkEmpty(/^\d{10}$/.test(prefs.login), 'Введите номер телефона - 10 цифр без пробелов и разделителей!');

    var json = callApi('entities?' + createUrlEncodedParams({
    	types: 'auth,bonus,profile',
    	'access-token': g_accessToken
    }));

    if(!json.auth || json.auth.anonymous){
    	json = callApi('confirmation/sms/signIn', {phone: prefs.login}, 'POST');

    	var code = AnyBalance.retrieveCode('Пожалуйста, введите SMS для подтверждения входа в личный кабинет Спортмастер', null, {inputType: 'number', time: json.waitSeconds*1000});

    	json = callApi('auth', {password: code, token: prefs.login, type: 'signInCode'}, 'POST');

		json = callApi('entities?' + createUrlEncodedParams({
    		types: 'auth,bonus,profile',
    		'access-token': g_accessToken
    	}));
    }

    var result = {success: true};

    AB.getParam(json.bonus.clientInfo.curLevelName, result, '__tariff');
    AB.getParam(json.bonus.clientInfo.cardNumber, result, 'cardnum');
    AB.getParam(json.bonus.clientInfo.curLevelSumma, result, 'balance');
    AB.getParam(json.bonus.clientInfo.toNextLevelSumma, result, 'nextlevel');

/*    var bonuses = getParam(html, /bonuses:\s*(\[\{[\s\S]*?\}\])/, replaceHtmlEntities, getJson);
    var tillbonus = (bonuses || []).reduce(function(b, prev) { if(!prev || b.dateEnd < prev.dateEnd) prev = b; return prev }, 0);
    getParam(tillbonus && tillbonus.dateEnd, result, 'till');
    getParam(tillbonus && tillbonus.amount, result, 'sumtill');
*/	/*
	if(isAvailable('all')) {
		var table = AB.getParam(html, null, null, /<table[^>]*sm-profile__bonustable[^>]*>(?:[\s\S](?!<\/table>))[\s\S]*?<\/table>/i);
		if(table) {
			var string = '';
			var array = AB.sumParam(table, null, null, /<tr>\s*<td[^>]*>\s*[\s\S]*?<\/tr>/ig, replaceTagsAndSpaces);
			for(var i = 0; i < array.length; i++) {
				var current = AB.getParam(array[i], null, null, null, [/(\d{4})$/i, '$1\n', /(\d{2})-(\d{2})-(\d{4})/, '$1/$2/$3']);
				string += current;
			}
			getParam(string, result, 'all');
		}
	}
*/	
    AnyBalance.setResult(result);
}
