/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у московского интернет-провайдера Starlink

Сайт оператора: http://starlink.ru/
Личный кабинет: https://stat.starlink.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('UTF-8');
    var baseurl = 'https://stat.starlink.ru/';
	
    var html = AnyBalance.requestPost(baseurl + 'form.statistics.php', {
        userLogin:prefs.login,
        userPassword:prefs.password,
        loginNow:true
    });
	
    if(!/Выход из кабинета/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }
    var result = {success: true};
    getParam(html, result, 'balance', /Баланс\s*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	
	if(isAvailable('daysleft')){
		html = AnyBalance.requestGet(baseurl);
		getParam(html, result, 'daysleft', /Осталось:[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
	}
	if(isAvailable('traffic')){
		html = AnyBalance.requestGet(baseurl+'statistics/');
		getParam(html, result, 'traffic', /Входящий трафик(?:[\s\S]*?<td[^>]*>){2}\s*([\s\S]*?)\s*<\/td>/i, replaceTagsAndSpaces, parseTraffic);
	}
    AnyBalance.setResult(result);
}