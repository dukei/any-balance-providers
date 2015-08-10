/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плате для телекоммуникационной компании Роснет

Operator site: http://rosnet.ru
Личный кабинет: https://tstat.rosnet.ru/cabinet/cabinet.cgi
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    //Получаем в переменную заданные пользователем настройки
    var prefs = AnyBalance.getPreferences();

    if(!/^\d+$/.test(prefs.login || ''))
        throw new AnyBalance.Error('Пожалуйста, введите 7 цифр вашего номер телефона!')

    var baseurl = "http://" + prefs.login + ".pbx.rosnet.ru/admin/";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl + 'users/easy_login', {
        login:prefs.login,
	password:prefs.password,
	fselect:prefs.type || 4,
	x:32,
	y:4
    });

    if(!/users\/logout/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<div[^>]+id="error_div"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    var domain = getParam(html, null, null, /firstDomain\s*=\s*['"](\d+)/);
    if(domain){
        html = AnyBalance.requestGet(baseurl + 'domains/edit/' + domain, {'x-ajaxtoken':'pbxadmin'});
        getParam(html, result, '__tariff', /<form_label[^>]+name="tariff_category"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'licschet', /<form_label[^>]+name="account_id"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'usercnt', /<form_label[^>]+name="count"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'maxusercnt', /<form_label[^>]+name="users_count"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'phone', /<form_label[^>]+name="phone_number"[^>]*value="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('balance')){
        html = AnyBalance.requestGet(baseurl + 'domains/get_balance');
        var json = getJson(html);
        result.balance = parseFloat(json.balance);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
