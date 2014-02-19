/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
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
	
    if(!json.success){
        if(json.error)
            throw new AnyBalance.Error(json.error);
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
	
    var result = {success: true};
	
    html = AnyBalance.requestGet(baseurl + 'index?id=' + encodeURIComponent(prefs.login), g_headers);
    json = getJson(html);
	
    if(!json.clients[0])
        throw new AnyBalance.Error('Не найдена информация о клиенте! Сайт изменен?');
	
    var client = json.clients[0];
	
	getParam(client.balance.CashBalance, result, 'balance');
	getParam(client.balance.CashBonusBalance, result, 'bonuses');
	getParam(client.balance.PointBalance, result, 'crazies');
	getParam(client.balance.CashToNextLevel, result, 'next');
	getParam(client.card.id, result, 'cardnum');
	getParam(client.card.status, result, 'level');
	
    result.__tariff = client.card.name + ', ' + client.card.status + ' ур., №' + client.card.id;
	
    AnyBalance.setResult(result);
}