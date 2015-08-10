/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Количество бонусов карты сети кинотеатров Кронверк

Operator site: http://www.kronverkcinema.ru/
Личный кабинет: http://www.kronverkcinema.ru/cgi-bin/show.pl?option=CardInfo
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

    var baseurl = "http://www.kronverkcinema.ru/";

    AnyBalance.setDefaultCharset('windows-1251'); 

    var html = AnyBalance.requestPost(baseurl + 'cgi-bin/show.pl', {
        login_fld: prefs.login,
        password_fld: prefs.password,
        option: "authorize_user_json",
        remember_me: 0
    }, addHeaders({Referer: baseurl + 'cgi-bin/show.pl'})); 

    if(/"status":\s*false/i.test(html)){
            var error = getParam(html, null, null, /"status":\s*false,\s*"message":\s*\"([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                throw new AnyBalance.Error(error);
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }

    if (!/^[\d]{5,10}$/i.test(prefs.card)) {
        throw new AnyBalance.Error("Неправильный формат карты. Номер карты должен состоять только из цифр, его длина должна быть от 5 до 10 символов");
    }

    html = AnyBalance.requestPost(baseurl + 'cgi-bin/show.pl', {
        CardNum: prefs.card,
        option: "CardInfo"
    }, addHeaders({Referer: baseurl + 'cgi-bin/show.pl?option=CardInfo'})); 

    var result = {success: true};
    getParam(html, result, 'balance', /Количество баллов\s*([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
