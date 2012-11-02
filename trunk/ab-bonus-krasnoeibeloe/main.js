/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает накопленную сумму и текущую скидку для карты Красное и белое

Сайт оператора: http://krasnoeibeloe.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.krasnoeibeloe.ru/";

    var html = AnyBalance.requestPost(baseurl + '/json/', {
        _do:'get_card_info',
        card_id:prefs.login
    });

    var json;
    try{
        json = JSON.parse(html);
    }catch(e){
        AnyBalance.trace('Can not parse json: ' + html);
        throw new AnyBalance.Error('Сервер вернул неверный ответ. Проблемы на сайте или сайт изменен.');
    }

    if(json.error){
        throw new AnyBalance.Error('Неверный номер карты.');
    }

    var result = {success: true};

    result.balance = parseFloat(json.summ);
    result.discount = parseFloat(json.discount);
    result.__tariff = json.card_id;
    
    AnyBalance.setResult(result);
}
