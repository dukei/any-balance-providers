/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию по бонусной карте CrazyPark

Сайт оператора: http://www.crazypark.ru
Личный кабинет: http://www.crazypark.ru/club/index.php
*/

var g_headers = {
	'Accept':'application/json, text/javascript, */*; q=0.01',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.56 Safari/537.17',
	'X-Requested-With':'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "http://www.crazypark.ru/client/";

    var html = AnyBalance.requestGet(baseurl + 'login?id=' + encodeURIComponent(prefs.login) + '&password=' + encodeURIComponent(prefs.password), g_headers);

    var json = getJson(html);

    //AnyBalance.trace(html);
    if(!json.success){
        if(json.error)
            throw new AnyBalance.Error(json.error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    html = AnyBalance.requestGet(baseurl + 'index?id=' + encodeURIComponent(prefs.login), g_headers);
    json = getJson(html);

    if(!json.clients[0])
        throw new AnyBalance.Error('Не найдена информация о клиенте! Сайт изменен?');

    var client = json.clients[0];
    if(AnyBalance.isAvailable('balance'))
        result.balance = client.balance.CashBalance;
    if(AnyBalance.isAvailable('bonuses'))
        result.bonuses = client.balance.CashBonusBalance;
    if(AnyBalance.isAvailable('crazies'))
        result.crazies = client.balance.PointBalance;
    if(AnyBalance.isAvailable('next'))
        result.next = client.balance.CashToNextLevel;
    if(AnyBalance.isAvailable('cardnum'))
        result.cardnum = client.card.id;
    if(AnyBalance.isAvailable('level'))
        result.level = client.card.status;

    result.__tariff = client.card.name + ', ' + client.card.status + ' ур., №' + client.card.id;

    AnyBalance.setResult(result);
}
