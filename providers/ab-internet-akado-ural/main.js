/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "https://stat.akado-ural.ru/";
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
    
    var html = AnyBalance.requestGet(baseurl + 'login.php?in=1');
	
    html = AnyBalance.requestPost(baseurl + 'login.php?in=1', {
        r: getParam(html, null, null, /name="r" value="([^"]*)"/),
        login: prefs.login,
        pass: prefs.password
    });

	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /class="redlight"[^>]*>([\s\S]*?)<\/div>/i, [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/, '']);
		if (error)
			throw new AnyBalance.Error(error, null, /введен неверно/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};
    
    getParam(html, result, 'balance', /<th[^>]*>\s*Баланс:[\s\S]*?<td[^>]*>\s*([^<]*)</i, null, parseFloat);
    getParam(html, result, 'credit', /<th[^>]*>\s*Кредит:[\s\S]*?<td[^>]*>\s*([^<]*)</i, null, parseFloat);
    getParam(html, result, 'blocked', /<th[^>]*>\s*Блокировка в биллинге:[\s\S]*?<td[^>]*>\s*([^<]*)</i);
    getParam(html, result, 'agreement', /<th[^>]*>\s*Договор:[\s\S]*?<td[^>]*>\s*([^<]*)</i);
    getParam(html, result, '__tariff', /<td[^>]*>\s*Тарифный план:[\s\S]*?<td[^>]*>\s*([^<]*)</i, [/\s+$/,'']);

    if(AnyBalance.isAvailable('bonus','friends')){
		var html = AnyBalance.requestGet(baseurl + "?page=24");
    	getParam(html, result, 'friends', /<td[^>]*>\s*Количество друзей:[\s\S]*?<td[^>]*>\s*(\d[\s\d\.,]*)[^<]*</i, [/\s+/g, '', /,/g, '.'], parseInt);
    	getParam(html, result, 'bonus', /<td[^>]*>\s*Сумма бонуса:[\s\S]*?<td[^>]*>\s*(-?\s*\d[\s\d\.,]*)[^<]*</i, [/\s+/g, '', /,/g, '.'], parseFloat);
    }
    
    AnyBalance.setResult(result);
}
