/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о бонусах на карте Клуба Перекресток.

Сайт магазина: http://www.perekrestok.ru/
Личный кабинет: https://prcab.x5club.ru/cwa/
*/

var g_headers = {
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
	Origin: "https://my.5ka.ru"
};

var baseurl = "https://my.5ka.ru/"
var domain = getParam(baseurl, /\/\/(.*?)\//);
var apiHeaders = {
	Referer: baseurl + 'login'
};


function callApi(verb, getParams, postParams){
	AnyBalance.trace('====================================================\nverb='+verb);
	AnyBalance.trace('getParams='+getParams);
	AnyBalance.trace('postParams='+postParams);
	var method = 'GET';
	var h = apiHeaders;
	if(isset(postParams)){
		method = 'POST';
		h = addHeaders({'Content-Type': 'application/json;charset=UTF-8'}, apiHeaders);
	}
	
	var html = AnyBalance.requestPost(baseurl + 'api/' + verb, postParams && JSON.stringify(postParams), addHeaders(h), {HTTP_METHOD: method});
	AnyBalance.trace('html:\n'+html+'\n====================================================');
	if(!html)
		return {__empty: true};

	var json = getJson(html);
	if(json.error){
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error.description, null, /парол/i.test(json.error.description));
	}

	if(json.non_field_errors){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка ' + verb + ': ' + json.non_field_errors.join(', '));
	}

	return json;
}

function handshakeAndEstablish(){
    var prefs = AnyBalance.getPreferences (), html, json;

    var handshake = callApi('v1/startup/handshake', null, {
    	app: {
    		platform: 'web',
    		user_agent: g_headers['User-Agent'],
    		version: 1
    	},
    	version: 1
    });

    apiHeaders['X-Authorization'] = 'Token' + handshake.server.features['security/session'].token.value;
    //AnyBalance.setCookie(domain, 'token', 'Token' + handshake.server.features['security/session'].token.value);
    //AnyBalance.setCookie(domain, 'header_name', 'X-Authorization');
    AnyBalance.setData('token'+prefs.login,handshake.server.features['security/session'].token.value);
    AnyBalance.saveData();


//    var params1 = passCaptcha(handshake);

    var card = /^\d{16}$/.test(prefs.login);
    json = callApi('v1/auth/signin', null, {
    	login: card ? prefs.login : '+7' + prefs.login,
    	password: prefs.password,
    	schema: card ? 'by-card' : 'by-phone'
    });

    if(!json.token){
    	if(json.code){
    		if(json.code==4004) throw AnyBalance.Error('Личный кабинет заблокирован на один час', null, true);
    		throw AnyBalance.Error('Неверно указаны данные для входа', null, true);
    	}
        AnyBalance.trace(JSON.stringify(json));
        throw new AnyBalance.trace('Не удалось войти в личный кабинет. Сайт изменен?');
    }
    var token = json.token;

    var code = AnyBalance.retrieveCode('Пожалуйста, введите код подтверждения для входа в личный кабинет, отправленный вам по СМС', null, {time: 120000, inputType: 'number'});

    json = callApi('v1/auth/2fa', null, {
    	code: code,
    	token: token
    });

    if(!json.__empty && Object.keys(json).length > 0){
    	if(json.code == 4001)
    		throw new AnyBalance.Error('Неверный код подтверждения. Осталось попыток: ' + json.attempts);
        AnyBalance.trace(JSON.stringify(json));
        throw new AnyBalance.trace('Не удалось войти в личный кабинет после ввода кода подтверждения. Сайт изменен?');
    }
    json = callApi('v1/users/me');
    return json;
}

function main () {
    var prefs = AnyBalance.getPreferences ();
    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите 16 цифр номера карты или 10 цифр номера телефона.');
	checkEmpty(/^\d{16}$/.test(prefs.login) || /^\d{10}$/.test(prefs.login), 'Введите 16 цифр номера карты или 10 цифр номера телефона.');
	checkEmpty(prefs.password, 'Введите пароль.');
    var	 token=AnyBalance.getData('token'+prefs.login);
    if (token){
    	AnyBalance.trace('Найден старый токен');
    	apiHeaders['X-Authorization'] = 'Token' + token;
    	AnyBalance.trace('Проверка токена');
    	var me = callApi('v1/users/me');
    	if (AnyBalance.getLastStatusCode() >= 401){
            AnyBalance.trace(me.detail+'\nТокен не подешел. Нужна авторизация');
    		token='';
            apiHeaders['X-Authorization'] = '';
    		AnyBalance.setData('token'+prefs.login,'');
    		AnyBalance.saveData();
    	}
    }
    if (!token){
    	AnyBalance.trace('Входим в кабинет ' + baseurl);
    	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
    	if(AnyBalance.getLastStatusCode() >= 400){
    		AnyBalance.trace(html);
    		throw new AnyBalance.Error('Личный кабинет ' + baseurl + ' временно недоступен. Пожалуйста, попробуйте позже');
    	}
    	var me = handshakeAndEstablish();
    }
    if (!me||!me.cards){
    	token='';
    	apiHeaders['X-Authorization'] = '';
    	AnyBalance.setData('token'+prefs.login,'');
    	AnyBalance.saveData();
    	throw new AnyBalance.Error('Не удалось войти в личный кабинет. Возможно изменился API');
    }
    if(!me.cards.main)
    	throw new AnyBalance.Error('У вас нет карт Пятерочки Выручай-ка');
    
    var result = {success: true};

    var card = callApi('v3/cards/' + me.cards.main);

    if(isAvailable(['customer', '__tariff'])){
    	getParam(me.person.first_name + ' ' + me.person.last_name, result, 'customer');
    	getParam(card.number.replace(/(\d{4})(\d{4})(\d{4})(\d{4})(\d*)/,'$1-$2-$3-$4 $5').trim(), result, '__tariff');
//    	getParam(card.number.replace(/(\d{4})(\d{4})(\d{4})(\d{4})(\d*)/,'$1-$2-$3-$4 $5').trim(), result, 'card_number');
//    	getParam(card.type.verbose_name, result, '__tariff');
    }

    if(isAvailable(['balance', 'earnedInThisMonth', 'balancePoints'])){
    	getParam(card.balance.points, result, 'balancePoints');
    	getParam(Math.floor(card.balance.points/10), result, 'balance');
    	getParam(card.balance.incoming_monthly_points, result, 'earnedInThisMonth');
    }
    if(isAvailable('last_transaсtion')){
    try{
    	var t=callApi('v4/transactions/?card=' + me.cards.main+'&offset=0&limit=1');
    	if (t && t.results) getParam(t.results[0].created_at.replace(/(\d{4})-(\d{2})-(\d{2})([\s\S]*)/,'$3.$2.$1$4')+' '+t.results[0].bonuses[0].title+' '+t.results[0].bonuses[0].sum +' ('+t.results[0].title+' на '+t.results[0].sum+')',result,'last_transaсtion');
    }catch(e){
    	AnyBalance.trace(e.message);
    }
    }
    AnyBalance.setResult (result);
}
