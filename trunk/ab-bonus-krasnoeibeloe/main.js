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

    var levels = [
        [500, 1],
        [3000, 2],
        [8000, 4],
        [18000, 6],
        [36000, 8],
        [60000, 10],
    ];

    for(var i=0; i<levels.length; ++i){
        if(levels[i][1] > json.discount){
            result.sumleft = levels[i][0] - json.summ;
            result.nextsum = levels[i][0];
            result.nextdis = levels[i][1];
            break;
        }
    }
    
    AnyBalance.setResult(result);
}
