/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'application/json, text/javascript, */*; q=0.01',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
};

function main() {
    var prefs = AnyBalance.getPreferences();
	
	var formattedLogin = getParam(prefs.login, null, null, /^\d+$/, [/^(\d{4})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4']);
	var login = formattedLogin || prefs.login;
	var passMsg = formattedLogin ? 'PIN-код' : 'пароль';

    checkEmpty(login, 'Введите номер карты или логин!');
    checkEmpty(prefs.password, 'Введите ' + passMsg + ' для входа в личный кабинет!');
    
    var baseurl = "https://www.eldorado.ru/";
	
	var html = AnyBalance.requestGet(baseurl + 'personal/club/offers/index.php', g_headers);

	var params = {
		'AUTH_FORM':'Y',
		'action':'AUTH',
		'auth_popup':'1',
		'backurl':'/personal/orders/index.php?login=yes',
		'USER_LOGIN':login,
		'USER_PASSWORD':prefs.password
    };

    html = AnyBalance.requestPost(baseurl + '_ajax/userCardAuth.php', params, addHeaders({Referer: baseurl + 'personal/orders/index.php', 'X-Requested-With': 'XMLHttpRequest'}));
	
    var json = getJson(html);
    if(!json.data && !json.success) {
    	if(json.captcha){
    		AnyBalance.trace('Потребовалась рекапча...');
    		var recaptcha = solveRecaptcha('Эльдорадо потребовало доказать, что вы не робот', baseurl + 'personal/club/offers/index.php', '6LfglhgTAAAAAKyh5GZXHeO6U3a7JUB-c-xtC1gW');
    		params['g-recaptcha-response'] = recaptcha;
    		html = AnyBalance.requestPost(baseurl + '_ajax/userCardAuth.php', params, addHeaders({Referer: baseurl + 'personal/orders/index.php', 'X-Requested-With': 'XMLHttpRequest'}));
    		json = getJson(html);
    	}
    }

    if(json.pinToPass)
        throw new AnyBalance.Error('Эльдорадо просит сменить ПИН на пароль. Для этого войдите в личный кабинет Эльдорадо через браузер, выполните инструкции и введите новый пароль в настройки провайдера.', null, true);

    if(!json.data && !json.success){
    	var error = json.message;
    	if(error)
    		throw new AnyBalance.Error(error, null, /парол/i.test(error));
    	AnyBalance.trace(html);
        throw new AnyBalance.Error(json.message || 'Не удаётся войти в личный кабинет. Сайт изменен?');
    }
	
    html = AnyBalance.requestGet(baseurl + '_ajax/getUserCardBonus.php', addHeaders({Referer: baseurl + 'personal/?loyalty', 'X-Requested-With': 'XMLHttpRequest'}));
    json = getJson(html);
	
    if(!json.result) {
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти бонусы. Сайт изменен?');
    }
	
    var result = {success: true};
	
    getParam('' + json.result.total, result, 'balance', null, null, parseBalance);
    getParam('' + json.result.reserved, result, 'reserv', null, null, parseBalance);
    getParam('' + json.result.inactive, result, 'inactive', null, null, parseBalance);
	
    if(AnyBalance.isAvailable('cardnum', 'phone', 'userName')) {
        html = AnyBalance.requestGet(baseurl + 'personal/club/form/', g_headers);
		
		getParam(html, result, 'cardnum', /Карта №([^<]+)/i, replaceTagsAndSpaces);
		
		var aggragate_join_space = create_aggregate_join(' ');
		
		sumParam(html, result, 'userName', /<input[^>]+name="CLUB_USER_FORM_NAME_LAST"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, null, aggragate_join_space);
        sumParam(html, result, 'userName', /<input[^>]+name="CLUB_USER_FORM_NAME_FIRST"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, null, aggragate_join_space);
        sumParam(html, result, 'userName', /<input[^>]+name="CLUB_USER_FORM_NAMEMIDDLE"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, null, aggragate_join_space);
		
		sumParam(html, result, 'phone', /<label[^>]+placeholder-mobile-phone[^>]*>([\s\S]*?)<\/label>/i, replaceTagsAndSpaces, null, aggragate_join_space);
    }

    AnyBalance.setResult(result);
}