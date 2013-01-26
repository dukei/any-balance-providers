/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте Новэкс

Сайт оператора: http://ulmart.ru
Личный кабинет: http://www.ulmart.ru/cabinet/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.novex-trade.ru/bonus/card/checkBalance/";

    var html = AnyBalance.requestPost(baseurl, {
        customer_email:'noeamil@noemail.ru',
        number:prefs.login
    }, {
        Accept:'application/json, text/javascript, */*; q=0.01',
        'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
        'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
        'Referer':'http://www.novex-trade.ru/bonus-card-program/',
        'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17',
        'X-Requested-With':'XMLHttpRequest'
    });

    var json = getJson(html);

    if(!isset(json.bonus)){
        if(json.error)
            throw new AnyBalance.Error(json.error);
        throw new AnyBalance.Error('Не удалось получить баланс карты. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    if(AnyBalance.isAvailable('balance'))
        result.balance = json.bonus;
    result.__tariff = prefs.login;

    AnyBalance.setResult(result);
}
