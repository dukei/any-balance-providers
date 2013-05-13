/**
Ресторанный комплекс Бамбук (http://any-balance-providers.googlecode.com)

Получает сумму бонусов с карты ресторанов Бамбук

Сайт: http://bamboo.tomsk.ru
Личный кабинет: http://bamboo.tomsk.ru/bonus
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

    var baseurl = "http://bamboo.tomsk.ru/";

    AnyBalance.setDefaultCharset('UTF-8'); 

    var html = AnyBalance.requestPost(baseurl + 'discount/index.php', {
        rm:"discont",
        action: "view",
        cardNum:prefs.login
    }, addHeaders({Referer: baseurl + 'discount/index.php'})); 

    if(!/<div[^>]+id="back"[^>]*>[\s\S]*Назад<\/a>/i.test(html)){
        var error;
        if (/<div[^>]+id="back"[^>]*>[\s\S]*Назад!/i.test(html)) {
            error = getParam(html, null, null, /<div[^>]+id="restsum"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        }
        else {
            if(prefs.login === "") {
                error = 'Введите номер карты.';
            }
            if(!prefs.login.match(/^[0-9]+$/)) {
                error = 'Некорректный номер.';
            }
        }
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'fio', /<div[^>]+id="fio"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /сумма Ваших бонусных баллов:\s*([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}
