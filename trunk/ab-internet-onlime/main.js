/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

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
    });
    
	if(!/\/session\/logout/i.test(info)) {
		var error = getParam(info, null, null, /<p[^>]+id="errHolder"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(info);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    var result = {success: true};

    var form = getParam(info, null, null, /<form[^>]+class="forma"[^>]*action="[^"]*choosecontract[^>]*>([\s\S]*?)<\/form>/i)
    if(form){
        //Несколько контрактов на аккаунте. Надо выбрать нужный лицевой счет
        AnyBalance.trace('Требуется выбрать контракт...');
        var re = new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr>))*?<strong[^>]*>\\s*\\d*' + (prefs.num || '\\d+') + '\\s*</strong>[\\s\\S]*?</tr>', 'i');
        var row = getParam(form, null, null, re);
        if(!row)
            throw new AnyBalance.Error(prefs.num ? 'Не удалось найти лицевой счет или договор с последними цифрами ' + prefs.num : 'Не удалось найти ни одного номера счета!');
        var idx = getParam(row, null, null, /<input[^>]+value="([^"]*)"[^>]*name="contract"/i, null, html_entity_decode);
        AnyBalance.trace('Выбираем контракт ' + idx + '...');
        info = AnyBalance.requestPost(baseurl + 'index/choosecontract/', {contract: idx});
    }

    info = AnyBalance.requestGet(baseurl + "json/cabinet/");
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
            info = AnyBalance.requestGet(baseurl + "statistics/inet_statistics");
			
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