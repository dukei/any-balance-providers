/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'http://my.licard.com/';
    var baseurlFizik = 'http://club-lukoil.ru/cabinet/';
	
    AnyBalance.setDefaultCharset('utf-8');
    
	var result = {success: true};
	
    if (prefs.type == 'likard') {
        var html = AnyBalance.requestPost(baseurl + 'ru/login', {
            submit: 'Войти',
            login: prefs.login,
            pass: prefs.password,
        }, addHeaders({Referer: baseurl + 'ru/login'}));
        //получим id пользователя
        var usedId = /\/([\s\S]{1,15})\/client/i.exec(html);
        if (!usedId)
			throw new AnyBalance.Error('Не удалось найти пользователя, проверьте логин и пароль');
		
        getParam(prefs.login, result, 'cardnum');
        getParam(html, result, 'balance', /Баланс[\s\S]*?>[\s\S]*?>([\s\S]*?)<\/b/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'last_payment', /Последний платёж[\s\S]*?payments">([\s\S]*?)<\/a/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'name', /class="value user-name">\s*<b>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, null);
        // для совместимости оставим так, потом когда все обновятся можно раскоментировать
    } else {
        var html = AnyBalance.requestGet(baseurlFizik, g_headers);
        var sessid = getParam(html, null, null, /id="sessid" value="([\s\S]*?)"/i, null, null);
        if (!sessid) throw new AnyBalance.Error('Не удалось найти идентификатор сессии');
        html = AnyBalance.requestPost(baseurlFizik, {
            LOGIN: prefs.login,
            PASS: prefs.password,
            'sessid': sessid
        }, g_headers);
        //После входа обязательно проверяем маркер успешного входа
        //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
        if (!/\?ACTION=logout/i.test(html)) {
            //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
            var error = getParam(html, null, null, /<p[^>]+class="err"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
            if (error) throw new AnyBalance.Error(error);
            //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
        getParam(html, result, 'balance', /Баланс[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'cardnum', /Номер карты[\s\S]*?ph">([\s\S]*?)<\/div/i, replaceTagsAndSpaces, null);
        getParam(html, result, '__tariff', /<li><span>Ваш статус в Программе:<\/span>([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, null);
        getParam(html, result, 'region', /Регион Программы:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        if (AnyBalance.isAvailable('name', 'phonenumber')) {
            html = AnyBalance.requestGet(baseurlFizik + 'personal/');
            getParam(html, result, 'name', /ФИО:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'phonenumber', /Мобильный телефон:([\s\S]*?)<\/li>/i, replaceTagsAndSpaces, html_entity_decode);
        }
    }
	
    AnyBalance.setResult(result);
}