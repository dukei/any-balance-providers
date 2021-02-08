/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'application/json, text/javascript, */*; q=0.01',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
    DNT:1
};

function main() {
    var baseurl = "https://www.eldorado.ru/";
    var prefs = AnyBalance.getPreferences();
    AnyBalance.restoreCookies();
    var token=AnyBalance.getData('token'+prefs.login);
    if (token){
    	AnyBalance.trace('Есть старый токен. Пытаюсь обновить.');
    	 g_headers['authorization']='Bearer '+token;
    	 html = AnyBalance.requestGet(baseurl + '_ajax/spa/auth/getToken.php', addHeaders({Referer: baseurl}));
    	 json=getJson(html);
    	 token=json.token;
         g_headers['authorization']='Bearer '+token;
    	 AnyBalance.trace('Новый токен:'+token);
    }
	var formattedLogin = getParam(prefs.login, null, null, /^\d+$/, [/^(\d{4})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4']);
	var login = formattedLogin || prefs.login;
	var passMsg = formattedLogin ? 'PIN-код' : 'пароль';

    checkEmpty(login, 'Введите номер карты или логин!');
    checkEmpty(prefs.password, 'Введите ' + passMsg + ' для входа в личный кабинет!');
    

	
	var html = AnyBalance.requestGet(baseurl + 'personal/club/offers/index.php', g_headers);

	var params = {
		'user_login':login,
		'user_password':prefs.password
    };
    html = AnyBalance.requestPost(baseurl + '_ajax/spa/auth/v2/auth_with_login.php', JSON.stringify(params), addHeaders({Referer: baseurl + 'personal/orders/index.php', 'X-Requested-With': 'XMLHttpRequest'}));

    var json = getJson(html);
    if (json.status!=1){
    	if(json.captcha){
    		AnyBalance.trace('Потребовалась рекапча...');
    		var recaptcha = solveRecaptcha('Эльдорадо потребовало доказать, что вы не робот', baseurl + 'personal/club/offers/index.php', '6LfglhgTAAAAAKyh5GZXHeO6U3a7JUB-c-xtC1gW');
    		params['g-recaptcha-response'] = recaptcha;
    		html = AnyBalance.requestPost(baseurl + '_ajax/spa/auth/v2/auth_with_login.php', JSON.stringify(params), addHeaders({Referer: baseurl + 'personal/orders/index.php', 'X-Requested-With': 'XMLHttpRequest'}));
    		json = getJson(html);
    	}
    }
    if(json.pinToPass)
        throw new AnyBalance.Error('Эльдорадо просит сменить ПИН на пароль. Для этого войдите в личный кабинет Эльдорадо через браузер, выполните инструкции и введите новый пароль в настройки провайдера.', null, true);

    if(!json.authData){
    	var error = JSON.stringify(json.errors);
    	if(error)
    		throw new AnyBalance.Error(error, null, /парол/i.test(error));
    	AnyBalance.trace(html);
        throw new AnyBalance.Error(json.message || 'Не удаётся войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
	
    getParam('' + json.authData.customerLoyalty.bonusAmount, result, 'balance', null, null, parseBalance);
    getParam('' + json.authData.customerLoyalty.cardNumber, result, 'cardnum');
    getParam('' + json.authData.user.firstName+' '+json.authData.user.lastName , result, 'userName');
    getParam('' + json.authData.customerLoyalty.mobilePhone, result, 'phone');
    getParam('' + json.authData.customerLoyalty.level, result, 'level',null, null, parseBalance);
    getParam('' + json.authData.customerLoyalty.chargePercent, result, 'chargePercent');

    if(AnyBalance.isAvailable('reserv', 'inactive')) {
	    html = AnyBalance.requestGet(baseurl + '_ajax/getUserCardBonus.php', addHeaders({Referer: baseurl + 'personal/?loyalty', 'X-Requested-With': 'XMLHttpRequest'}));
	    json = getJson(html);
	    if(!json.result) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти бонусы. Сайт изменен?');
	    }
	    getParam('' + json.result.reserved, result, 'reserv', null, null, parseBalance);
	    getParam('' + json.result.inactive, result, 'inactive', null, null, parseBalance);
    }

    if (!token) {
    	 html = AnyBalance.requestGet(baseurl + '_ajax/spa/auth/getToken.php', addHeaders({Referer: baseurl}));
    	 json=getJson(html);
    	 token=json.token;
    }
    AnyBalance.trace('Сохраняем token:'+token);
    AnyBalance.setData('token'+prefs.login,token)
    AnyBalance.saveCookies();
    AnyBalance.saveData();

    AnyBalance.setResult(result);
}