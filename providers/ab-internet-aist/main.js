/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://my.100megabit.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestGet(baseurl + 'auth.php', g_headers);

    html = AnyBalance.requestPost(baseurl + 'auth.php', {
        user_name:prefs.login,
        user_pass:prefs.password,
    }, addHeaders({Referer: baseurl + 'auth.php'})); 

    if(!/logout/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<span[^>]+class="errorMsg"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};

    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /Текущий тариф[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, 'line', /<span[^>]+next-tarif-caption[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
    getParam(html, result, 'nexttar', /Следующий тариф[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('fio', 'email')){
    	html = AnyBalance.requestGet(baseurl + 'options.php', g_headers);
    	getParam(html, result, 'fio', /<input[^>]+name="username2"[^>]*value="([^"]*)/i, replaceHtmlEntities);
    	getParam(html, result, 'email', /<input[^>]+name="email2"[^>]*value="([^"]*)/i, replaceHtmlEntities);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
