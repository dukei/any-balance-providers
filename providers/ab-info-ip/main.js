/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
Получает информацию о IP адресе с использованием http://ip-api.com/json/
*/

var baseurl = 'http://ip-api.com/json/';

function main(){
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
    });

    var json;
    try {
        json = JSON.parse(html);
    } catch(e) {
        throw new AnyBalance.Error('Не удалось разобрать ответ сервера: ' + e.message);
    }

    AnyBalance.trace('Ответ: ' + JSON.stringify(json));

    if(json.status !== 'success'){
        throw new AnyBalance.Error('Ошибка: ' + (json.message || 'неизвестная ошибка'));
    }

    var result = {success: true};

    if(AnyBalance.isAvailable('ip'))       result.ip       = json.query;
    if(AnyBalance.isAvailable('country'))  result.country  = json.country;
    if(AnyBalance.isAvailable('city'))     result.city     = json.city;
    if(AnyBalance.isAvailable('isp'))      result.isp      = json.isp;
    if(AnyBalance.isAvailable('timezone')) result.timezone = json.timezone;
  
    AnyBalance.setResult(result);
}