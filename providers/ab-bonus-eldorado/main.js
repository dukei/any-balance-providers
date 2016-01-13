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
    
    var baseurl = "http://www.eldorado.ru/";
	
	var html = AnyBalance.requestGet(baseurl + 'personal/club/offers/index.php', g_headers);

	// Не трогать! Этот хак здесь живет не просто так.
	// var captchaa;
	// if(AnyBalance.getLevel() >= 7){
		// AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(baseurl+ 'bitrix/tools/captcha.php?captcha_sid=123');
		// captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		// AnyBalance.trace('Капча получена: ' + captchaa);
	// }else{
		// throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	// }
	
    html = AnyBalance.requestPost(baseurl + '_ajax/userCardAuth.php', {
		'AUTH_FORM':'Y',
		'action':'AUTH',
		'auth_popup':'1',
		'backurl':'/personal/orders/index.php?login=yes',
		'USER_LOGIN':login,
		'USER_PASSWORD':prefs.password,
		captcha_sid:'123',
		captcha_word:'5xx57',
    }, addHeaders({Referer: baseurl + 'personal/orders/index.php', 'X-Requested-With': 'XMLHttpRequest'}));
	
    var json = getJson(html);
    if(!json.data && !json.success) {
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
		
		sumParam(html, result, 'phone', /<span[^>]+class=['"]phone_country['"][^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, null, aggragate_join_space);
        sumParam(html, result, 'phone', /<input[^>]+name="CLUB_USER_FORM_MOBPHONE_CODE"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, null, aggragate_join_space);
        sumParam(html, result, 'phone', /<input[^>]+name="CLUB_USER_FORM_MOBPHONE_NUMBER"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, null, aggragate_join_space);
    }

    AnyBalance.setResult(result);
}