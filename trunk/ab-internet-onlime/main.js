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

function getWtf(info){
	return getParam(info, null, null, /var wtf\s*=\s*'([^']+)/i);
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://my.onlime.ru/';

    AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    if(prefs.num && !/^\d+$/.test(prefs.num))
        throw new AnyBalance.Error('Пожалуйста, введите номер лицевого счета или договора, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');
    
    // Заходим на главную страницу
    var info = AnyBalance.requestPost(baseurl + "session/login", {
    	"login_credentials[login]": prefs.login,
        "login_credentials[password]": prefs.password
    }, g_headers);
    
	var wtf = getWtf(info);
	checkEmpty(wtf, 'Не удалось найти форму входа, сайт изменен?', true);
	
	if(/<input[^>]*value="Войти"/i.test(info)) {
		var error = getParam(info, null, null, /"message error"[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пароль неверный|не найден/i.test(error));
		
		AnyBalance.trace(info);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
	info = AnyBalance.requestPost(baseurl + 'json/cabinet/', {}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest', 'X-Request': 'JSON', 'X-Wtf': getWtf(info)}));
	
    var result = {success: true};
	
	//info = AnyBalance.requestGet(baseurl + "json/cabinet/");
	
	var contracts = getParam(info, null, null, /<contracts>([\s\S]*?)<\/contracts>/i)
    if(contracts) {
        //Несколько контрактов на аккаунте. Надо выбрать нужный лицевой счет
        AnyBalance.trace('Требуется выбрать контракт...');
		
		var idx = getParam(contracts, null, null, new RegExp('row_id="(\\d+)">\\s*<ObjidPrvc>\\s*' + (prefs.num || ''), 'i'));
        if(!idx)
            throw new AnyBalance.Error(prefs.num ? 'Не удалось найти лицевой счет или договор с последними цифрами ' + prefs.num : 'Не удалось найти ни одного номера счета!');
        
        AnyBalance.trace('Выбираем контракт ' + idx + '...');
        info = AnyBalance.requestPost(baseurl + 'account/choose/', {contract: idx});
		
		info = AnyBalance.requestPost(baseurl + 'json/cabinet/', {}, addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest', 'X-Request': 'JSON', 'X-Wtf': getWtf(info)}));
    }
    
    AnyBalance.trace('got info: ' + info);
    var oInfo = getJson(info.replace(/:(\-)?\./g, ':$10.')); //А то "balance":-.31 не распарсивается
	
	result.__tariff = oInfo.tier;
	getParam(oInfo.balance, result, 'balance');
	getParam(oInfo.points, result, 'bonus_balance');
	//Похоже, 1000 используется, как бесконечное значение, в кабинете показывается >100
	getParam(oInfo.lock == 1000 ? 100 : oInfo.lock, result, 'lock');
	getParam(oInfo.contract, result, 'agreement');
	getParam(oInfo.account, result, 'license');
    
	if((AnyBalance.isAvailable('balance') && !isset(result.balance)) || (AnyBalance.isAvailable('bonus_balance') && !isset(result.bonus_balance)) || (AnyBalance.isAvailable('lock') && !isset(result.lock))) {
        //Странно, json не вернул то, что надо, придется из html вырезать
        var html = AnyBalance.requestGet(baseurl + 'billing/balance');
		
        getParam(html, result, 'balance', /Баланс:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'lock', /Количество дней до блокировки:[\s\S]*?<dd[^>]*>([\s\S]*?)<\/dd>/i, replaceTagsAndSpaces, parseBalance);
    }
	
    if((AnyBalance.isAvailable('bonus_balance') && !isset(result.bonus_balance))) {
        //Странно, json не вернул то, что надо, придется из html вырезать
        var html = AnyBalance.requestGet(baseurl + 'bonus/account/');
        getParam(html, result, 'bonus_balance', /Бонусный счет:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    }
	
    if(AnyBalance.isAvailable('internet_total', 'internet_up', 'internet_down')) {
        try {
			var dt = new Date();
			
            info = AnyBalance.requestGet(baseurl + 'html/inetstat/?month=' + (dt.getMonth()+1) + '&year=' + dt.getFullYear());
			
			if(AnyBalance.isAvailable('internet_total', 'internet_down')){
                var val = getParam(info, null, null, /Входящий трафик(?:[\s\S]*?<th[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                if(val)
                    result.internet_down = Math.round(parseFloat(val)/1024*100)/100; //Переводим в Гб с двумя точками после запятой
            }
			
            if(AnyBalance.isAvailable('internet_total', 'internet_up')){
                var val = getParam(info, null, null, /Входящий трафик(?:[\s\S]*?<th[^>]*>){4}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                if(val)
                    result.internet_up = Math.round(parseFloat(val)/1024*100)/100; //Переводим в Гб с двумя точками после запятой
            }
			if(AnyBalance.isAvailable('internet_total')){
                if(result.internet_down && result.internet_up)
                    result.internet_total = result.internet_down + result.internet_up;
            }
        }catch(e){
            AnyBalance.trace('Не удалось получить трафик: ' + e.message);
        }
    }
    
    AnyBalance.setResult(result);
}