/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию по бонусной карте Шел

Operator site: http://www.shell.com
Личный кабинет: https://www.shellsmart.com
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
    var baseurl = "https://www.shellsmart.com/smart/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var prefix = '';
    var num = prefs.login;
    if(/^\d{15,}/.test(prefs.login)){
        num = prefs.login.substr(6, 9);
        prefix = prefs.login.substr(0, 6);
    }

    var html = AnyBalance.requestPost(baseurl + 'user/LogIn.html', {
        loginor:0,
        sourceUrl:'/smart/index.html?site=ru-ru',
        oemtc_smart_length:11,
        oemtc_oemtc_length:8,
        oemtc_smart_cn_text:'',
        oemtc_oemtc_cn_text:'',
        cn_prefix_text:prefix,
        cardnumber:num,
        password:prefs.password,
        site:'ru-ru',
    }, addHeaders({Referer: baseurl + 'index.html'})); 

    //После входа обязательно проверяем маркер успешного входа
    //Обычно это ссылка на выход, хотя иногда приходится искать что-то ещё
    if(!/user\/LogOut.html/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<span[^>]+class="errorMsgText"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
//    getParam(html, result, 'fio', /<p[^>]+id="name_label"[^>]*>([\s\S]*?)<\/(?:p|td)>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /<p[^>]+id="point"[^>]*>([\s\S]*?)<\/(?:p|td)>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<p[^>]+id="name_label"[^>]*>([\s\S]*?)<\/(?:p|td)>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('reserved', 'available')){
        html = AnyBalance.requestGet(baseurl + 'AccountDetail.html?mod=SMART', g_headers);
        getParam(html, result, 'reserved', /Зарезервировано баллов:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'available', /Доступно баллов:(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}
