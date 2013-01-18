/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Провайдер Avicom - телевидение
Сайт оператора: http://avicom.tv
Личный кабинет: http://selfcare.avicom.tv/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var domain = prefs.region;

	var baseurl = 'http://selfcare.avicom.tv/';
	AnyBalance.setDefaultCharset('utf-8');

    // Заходим на главную страницу
	AnyBalance.trace('Authorizing by ' + baseurl);
	var info = AnyBalance.requestPost(baseurl, {
            login:prefs.login,
            password:prefs.password,
            logonForm:''
	});
    
        if(!/logout/i.test(info)){
           var error = getParam(info, null, null, /<span[^>]+class="error"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
           if(error)
               throw new AnyBalance.Error(error);
           throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
        }
    
        var result = {success: true};

        getParam(info, result, 'balance', /Баланс лицевого счета:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(info, result, 'agreement', /Договор:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(info, result, 'fio', /Абонент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(info, result, '__tariff', /Тарифный план:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

	AnyBalance.setResult(result);
};






