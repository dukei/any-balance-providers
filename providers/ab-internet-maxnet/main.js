/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для харьковского интернет-провайдера MaxNet

Сайт оператора: http://MaxNet.ru
Личный кабинет: https://stat.MaxNet.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://bil.maxnet.ua:8443/cgi-bin/stat.cgi";

    var html = AnyBalance.requestPost(baseurl, {
        login:prefs.login,
        password:prefs.password,
        action: 'check',
        lang: '0',
        id: '0',
        subid: '0'
    });

    //AnyBalance.trace(html);
    if(!/logout/.test(html)){
        var error = getParam(html, null, null, /<div[^>]*passwerror[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /пароль/i.test(error));
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Ваш счет:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /Кредитный счет:[\S\s]*?<span[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Лицевой счет:([\S\s]*?)(?:<\/li>|<\/div>)/i, replaceTagsAndSpaces);

    var sessionid = getParam(html, null, null, /<input[^>]+name="session"[^>]*value="([^"]*)/i, replaceHtmlEntities);
    var userid = getParam(html, null, null, /<input[^>]+name="user"[^>]*value="([^"]*)/i, replaceHtmlEntities);

    html = AnyBalance.requestPost(baseurl, {
    	id: '1',
    	subid: '0',
    	action: 'menu',
    	user: userid, 
    	session: sessionid,
    	lang: 0
    });

    getParam(html, result, '__tariff', /<span[^>]+changepack[^>]*>([\S\s]*?)<\/span>/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

