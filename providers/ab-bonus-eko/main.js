/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Всеукраинская сеть супермаркетов «ЭКО-маркет»
Сайт оператора: http://www.eko.com.ua
Личный кабинет: http://www.podyaka.eko.com.ua
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'http://www.podyaka.eko.com.ua';

    AnyBalance.trace("Trying to enter selfcare at address: " + baseurl + '/site/');
    var html = AnyBalance.requestPost(baseurl + '/site/', {
    	USER_LOGIN: prefs.login,
	USER_PASSWORD: prefs.passw,
	AUTH_FORM: 'Y',
	TYPE: 'AUTH'
    });

    var result = {success: true};
    
    if(!/Вийти/i.test(html)){

    var error = getParam(html, null, null, /<span style='color:red'>([^<]*)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    // Название
    sumParam(html, result, '__tariff', /<p><em>([\s\S]*?)<\/em><\/p>/ig, replaceTagsAndSpaces, html_entity_decode, create_aggregate_join(' '));

    // Баланс
    sumParam (html, result, 'bonus', /На картці <strong>(\d+.\d+) грн<\/strong><\/p>/ig, replaceTagsAndSpaces, parseBalance, aggregate_sum);

    // Номер карты
    result.ncard = prefs.login;

    //Выходим из личного кабинета
    html = AnyBalance.requestPost(baseurl + '/site/', {
	logout: 'yes'
    });

    AnyBalance.setResult(result);

}
