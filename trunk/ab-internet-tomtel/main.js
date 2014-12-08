/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    if(AnyBalance.getLevel() < 6)
        throw new AnyBalance.Error('Этот провайдер требует AnyBalance API 6+');
	
	//Старый сервер оракл 10g имеет баг в TSL, приходится явно перейти на SSL
   	//AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['SSLv3']});
	
	var prefs = AnyBalance.getPreferences();
	
	AnyBalance.setDefaultCharset('windows-1251');
	
	var baseurl = "https://bill.tomtel.ru/fastcom/!w3_p_main.showform";
	
	var html = AnyBalance.requestPost(baseurl + '?IDENTIFICATION=TOMTEL_CONTRACT&ROOTMENU=ROOT', {
        CONTRACT:'IDENTIFICATION',
        ROOT:'ROOTMENU',
        FORMNAME:'QFRAME',
        USERNAME:prefs.login,
        PASSWORD:prefs.password
    });
	
	var href = getParam(html, null, null, /menu" SRC="([^"]+)/i);
	if(href) {
		html = AnyBalance.requestGet(baseurl + href);
	}
	
	//AnyBalance.trace(html);
    var sid = getParam(html, null, null, /SID=([A-F0-9]{32})/i);
    var contr_id = getParam(html, null, null, /CONTR_ID=(\d+)/i);
    if(!sid || !contr_id){
        var error = getParam(html, null, null, /setError\s*\(\s*"([^"]*)/, replaceSlashes);
        if(error)
            throw new AnyBalance.Error(error);
        
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }

    html = AnyBalance.requestGet(baseurl + '?FORMNAME=QCURRACC&CONTR_ID=' + contr_id + '&SID=' + sid + '&NLS=WR');

    var result = {success: true};

    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'topay', /Рекомендуемая сумма платежа:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'bonus', /Количество бонусных баллов[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'licschet', /Лицевой счёт:[\s\S]*?<td[^>]*>([\s\S]*?)<\/?t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/?t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Клиент:[\s\S]*?<td[^>]*>([\s\S]*?)<\/?t[dr]>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}