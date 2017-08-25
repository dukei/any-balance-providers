/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    checkEmpty(/^\d{13}$/.test(prefs.login), 'Введите 13 цифр номера карты без пробелов и разделителей!');
    
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://krasnoeibeloe.ru/";
	
    var incapsule = Cloudflare(baseurl + 'discount/?discount=Y');
	var html = AnyBalance.requestGet(baseurl + 'discount/?discount=Y', g_headers);
    if(incapsule.isCloudflared(html))
        html = incapsule.executeScript(html);
	
    html = AnyBalance.requestPost(baseurl + 'local/php_interface/ajax/', {
        'ajax_command': 'discount_check',
        'cardNum': prefs.login.replace(/(\d)(\d{6})(\d{6})/i, '$1 $2 $3'),
    }, addHeaders({Referer: baseurl + 'discount/?discount=Y', 'X-Requested-With': 'XMLHttpRequest'}));

    var json = getJson(html);
	
	if (!json.cardInfo || !json.cardInfo.ID) {
		var error = json.incorrect && 'Неверный номер карты';
		if(!error && !json.cardInfo)
			error = 'Номер карты неверный';

		if (error)
			throw new AnyBalance.Error(error, null, /неверный/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}	

    var result = {success: true};
	
	getParam(json.cardInfo.PERCENT, result, 'discount', null, null, parseBalance);
	getParam(json.cardInfo.SUM, result, 'balance', null, null, parseBalance);
	getParam(json.cardInfo.diff, result, 'sumleft');
	getParam(json.cardInfo.nextCondition || 0, result, 'nextdis');
	getParam(json.cardInfo.ID, result, '__tariff', null, [/(\d)(\d{6})(\d{6})/, '$1-$2-$3']);

    AnyBalance.setResult(result);
}