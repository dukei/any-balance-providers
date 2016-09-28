/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':           'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Charset':   'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':  'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':    'max-age=0',
    'User-Agent':       'Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
};

function main(){
    var prefs   = AnyBalance.getPreferences(),
        baseurl = "https://my.firstvds.ru";

    AnyBalance.setDefaultCharset('utf-8');

    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    if(AnyBalance.getLevel() < 4)
        throw new AnyBalance.Error('Для этого провайдера требуется AnyBalance 2.8+. Пожалуйста, обновите программу.');

    var html = AnyBalance.requestGet(baseurl + '/billmgr?func=logon', g_headers);
    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Сайт провайдера временно недоступен! Попробуйте обновить данные позже.');
    }

    AnyBalance.setCookie('my.firstvds.ru', 'billmgr4', 'sirius:ru:0');
        
    html = AnyBalance.requestPost(baseurl + '/billmgr', {
        username: prefs.login,
        password: prefs.password,
        lang:     'ru',
        func:     'auth',
    }, addHeaders({
        'Referer': baseurl + '/billmgr?func=logon'
    }));
        
    if (!/document\.location/i.test(html)) {
        var error = AB.getParam(html, null, null, /error">([^<]+)/i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error, null, /Неверное имя пользователя или пароль/i.test(error));
			
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var href = AB.getParam(html, null, null, /document\.location\s*=\s*"([^"]*)/i);
    if(!href) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось найти перенаправляющую ссылку. Сайт изменён?");
    }

    html = AnyBalance.requestGet(baseurl + href, g_headers);

	var result = {success: true};
	
	html = AnyBalance.requestGet(baseurl + '/billmgr?func=dashboard.info&p_num=1&dashboard=info&sfrom=ajax&operafake=' + new Date().getTime(), g_headers);

    var json = getJson(html);
    if(json && json.rows) {
        var data = isArray(json.rows) ? json.rows : [json.rows];

        for(var i = 0; i < data.length; i++) {
            if (data[i].label == 'Дата регистрации') {
                AB.getParam(data[i].value, result, 'date_start', null, null, AB.parseDateISO);
            } else if (data[i].label == 'Провайдер') {
                AB.getParam(data[i].value, result, 'provider');
            } else if (data[i].label == 'Код лицевого счета') {
                AB.getParam(data[i].value, result, 'subacc');
            } else if (data[i].label == 'Баланс') {
                AB.getParam(data[i].value + '', result, 'balance', null, null, AB.parseBalance)
            } else if (data[i].label == 'Средств хватит до') {
                AB.getParam(data[i].value, result, 'forecast', null, null, AB.parseDateISO)
            }
        }
    }

    AnyBalance.setResult(result);
}