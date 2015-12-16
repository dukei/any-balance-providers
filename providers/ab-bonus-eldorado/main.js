/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Данные по бонусной карте Eldorado

Сайт оператора: http://eldorado.ru/
Личный кабинет: http://www.club.eldorado.ru/enter.php

!!!Обязательное требование: первый раз требуется зайти в личный кабинет вручную, т.к однократно запрашивается привязка email или предлагает создать учетную запись к Вашей карте.
Если требование не выполнено, получите ошибку провайдера: Не удаётся войти в личный кабинет. Сайт изменен?
*/

var g_headers = {
    'Accept':'application/json, text/javascript, */*; q=0.01',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11',
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var cardNumber = getParam(prefs.login, null, null, /^\d+$/, [/^(\d{4})(\d{4})(\d{4})(\d{4})$/, '$1 $2 $3 $4']),
	    login = cardNumber || prefs.login,
        passMsg = cardNumber ? 'PIN-код' : 'пароль';

    checkEmpty(login, 'Введите номер карты или логин!');
    checkEmpty(prefs.password, 'Введите ' + passMsg + ' для входа в личный кабинет!');
    
    var baseurl = "http://www.eldorado.ru/";
	
	var html = AnyBalance.requestGet(baseurl + 'personal/club/offers/index.php', g_headers);

    var params = createFormParams(html, function(params, str, name, value) {
        switch (name.toLowerCase()) {
            case 'user_login':
                return login;
            case 'user_password':
                return prefs.password;
            default:
                return value;
        }
    });

    if(!params) {
        AnyBalance.trace(params);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }
	
    html = AnyBalance.requestPost(
        baseurl + '_ajax/userCardAuth.php',
        params,
        addHeaders({Referer: baseurl + 'personal/index.php', 'X-Requested-With': 'XMLHttpRequest'})
    );

    var json = getJson(html);
    if(!json.data && !json.success) {
        throw new AnyBalance.Error(json.message || 'Не удаётся войти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + '_ajax/getUserCardBonus.php', addHeaders({Referer: baseurl + 'personal/?loyalty', 'X-Requested-With': 'XMLHttpRequest'}));
    json = getJson(html);

    if(!json.result) {
        throw new AnyBalance.Error('Не удаётся найти бонусы. Сайт изменен?');
    }

    var result = {success: true};

    getParam('' + json.result.total, result, 'balance', null, null, parseBalance);
    getParam('' + json.result.reserved, result, 'reserv', null, null, parseBalance);
    getParam('' + json.result.inactive, result, 'inactive', null, null, parseBalance);


    if(AnyBalance.isAvailable('cardnum', 'phone', 'userName')){
        html = AnyBalance.requestGet(baseurl + 'personal/club/form/', g_headers);

        getParam(html, result, 'cardnum', /Карта №([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    
        var aggragate_join_space = create_aggregate_join(' ');

        sumParam(html, result, 'userName', /<input[^>]+name="CLUB_USER_FORM_NAME_LAST"[^>]*value="([^"]*)/i, null, html_entity_decode, aggragate_join_space);
        sumParam(html, result, 'userName', /<input[^>]+name="CLUB_USER_FORM_NAME_FIRST"[^>]*value="([^"]*)/i, null, html_entity_decode, aggragate_join_space);
        sumParam(html, result, 'userName', /<input[^>]+name="CLUB_USER_FORM_NAMEMIDDLE"[^>]*value="([^"]*)/i, null, html_entity_decode, aggragate_join_space);

        sumParam(html, result, 'phone', /<span[^>]+class=['"]phone_country['"][^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode, aggragate_join_space);
        sumParam(html, result, 'phone', /<input[^>]+name="CLUB_USER_FORM_MOBPHONE_CODE"[^>]*value="([^"]*)/i, null, html_entity_decode, aggragate_join_space);
        sumParam(html, result, 'phone', /<input[^>]+name="CLUB_USER_FORM_MOBPHONE_NUMBER"[^>]*value="([^"]*)/i, null, html_entity_decode, aggragate_join_space);
    }

    AnyBalance.setResult(result);
}

