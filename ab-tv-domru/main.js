/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер ЭрТелеком, ДОМ.РУ - кабельное телевидение
Сайт оператора: http://citydom.ru/
Личный кабинет: http://chel.domru.ru/balance_ktv
*/

var g_region_change = {
	kzn: 'kazan',
	nch: 'chelny'
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region;

// установка региона
	if(prefs.region==""){	// Санкт-петербург по умолчанию
		domain='spb';
	}

	if(g_region_change[domain])
		domain = g_region_change[domain];

	AnyBalance.trace('Selected region: ' + domain);


	var baseurl = 'http://'+domain+'.domru.ru/balance_ktv';
	AnyBalance.setDefaultCharset('utf-8');

    // Заходим на главную страницу
	AnyBalance.trace('Authorizing by ' + baseurl);
	var info = AnyBalance.requestPost(baseurl, {
            second_name:prefs.uname,
            contract_number:prefs.contract,
            submited:1
	});
    
        if(!/class="balance_ktv__left"/i.test(info)){
           var error = getParam(info, null, null, /<div[^>]+color:\s*red[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
           if(error)
               throw new AnyBalance.Error(error);
           throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    
        var result = {success: true};

        getParam(info, result, 'balance', /<div[^>]+class="balance_ktv__left"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
        result.__tariff = prefs.uname;
        if(AnyBalance.isAvailable('contract'))
            result.contract = prefs.contract;

	AnyBalance.setResult(result);
};






