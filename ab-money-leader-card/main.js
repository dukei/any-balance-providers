/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс по карте Лидер 

Operator site: http://xxxxxx.ru
Личный кабинет: https://xxxxxx.ru/login
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
    var baseurl = "https://87.249.30.84:8443/cyclos/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'do/login', {
//        validation:true,
	operatorLogin:false,
	principalType:'CARD',
	principal:prefs.login,
	password:prefs.password
    }, addHeaders({Referer: baseurl + 'do/login'})); 

    if(!/\/do\/logout/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<table[^>]+class="defaultTable"[^>]*>([\s\S]*?)<\/table>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'do/member/accountOverview?fromMenu=true&fromQuickAccess=true', g_headers);

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'fio', /<span[^>]+class="loginData"[^>]*>[^<]*-([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(prefs.login, result, 'card', null, [/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4']);
    getParam(html, result, 'balance', /<td[^>]*>(?:Состояние счёта|Account balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, [/\./g, '', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, 'currency', /<td[^>]*>(?:Состояние счёта|Account balance)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
