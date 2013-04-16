/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сибирского интернет-провайдера Стрела-Телеком

Сайт оператора: http://strelatelecom.ru/
Личный кабинет: https://bill.strelatelecom.ru
*/

function main(){
    if(AnyBalance.getLevel() < 6)
        throw new AnyBalance.Error('Этот провайдер требует AnyBalance API 6+');

    //Старый сервер оракл 10g имеет баг в TSL, приходится явно перейти на SSL
    AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['SSLv3']});

    var prefs = AnyBalance.getPreferences();

    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://bill.strelatelecom.ru/I/!w3_p_main.showform";

    var html = AnyBalance.requestPost(baseurl + '?CONFIG=CONTRACT', {
	IDENTIFICATION:'CONTRACT',
	USERNAME:prefs.login,
	PASSWORD:prefs.password,
	FORMNAME:'QFRAME'
    });

    var sid = getParam(html, null, null, /sid=([0-9a-f]+)/i);
    if(!sid){
        var error = getParam(html, null, null, /<div[^>]+(?:Error|Notice)Text[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    html = AnyBalance.requestGet(baseurl + '?FORMNAME=QFRAME&CONFIG=CONTRACT&SID=' + sid + '&NLS=WR');
    var contr_id = getParam(html, null, null, /CONTR_ID=(\d+)/i);
    if(!contr_id)
        throw new AnyBalance.Error('Не удаётся найти идентификатор договора. Сайт изменен?');

    html = AnyBalance.requestGet(baseurl + '?FORMNAME=QCURRACC&CONTR_ID=' + contr_id + '&SID=' + sid + '&NLS=WR');

    var result = {success: true};
    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'topay', /Рекомендуемая сумма платежа:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /Состояние счёта по договору №([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Клиент:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    //Пытаемся найти тарифный план
    //Загружаем меню
    var htmlMenu = AnyBalance.requestGet(baseurl + '?FORMNAME=QMENU&ROOTMENUITEM=ROOT&NLS=WR&SID=' + sid + '&OPENED=OPENED=R!ACC' + contr_id + '!');
    var plans = sumParam(htmlMenu, null, null, /:Curr\('TAR[^']*','([^']*)/g, replaceSlashes);
    for(var i=0; plans && i<plans.length; ++i){
        html = AnyBalance.requestGet(baseurl + plans[i]);
        sumParam(html, result, '__tariff', /Текущий тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
    }

    AnyBalance.setResult(result);
}
