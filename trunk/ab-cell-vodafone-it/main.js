/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для сотового оператора Vodafone (Italy) 

Operator site: http://www.vodafone.it
Личный кабинет: http://www.vodafone.it
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = "http://www.vodafone.it/";
    AnyBalance.setDefaultCharset('ISO-8859-1'); 

    if(!prefs.__dbg){
        var html = AnyBalance.requestPost('https://www.vodafone.it/190/trilogy/jsp/login.do?tk=9608,L0', {
	    username:prefs.login,
	    password:prefs.password
        }, addHeaders({Referer: baseurl + '190/trilogy/jsp/channelView.do'})); 
    }else{
        var html = AnyBalance.requestGet(baseurl + '190/trilogy/jsp/channelView.do?channelId=-1073875022&channelPage=/jsp/content/ty_home_fai_da_te_body.jsp&pageTypeId=9894&fdtcons=true&ty_nocache=true&ty_skip_md=true');
    }

    if(!/logoutButton/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /<div[^>]+class="msgError"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Could not enter personal account. Is the site changed?');
    }

    //Раз мы здесь, то мы успешно вошли в кабинет
    //Получаем все счетчики
    var result = {success: true};
    getParam(html, result, 'phone', /<option[^>]+id="S"[^>]*selected[^>]*>([\s\S]*?)<\/option>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<span[^>]+class="username"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('balance')){
        html = AnyBalance.requestGet(baseurl + '190/fast/mx/CreditoResiduoPush.do');
        getParam(html, result, 'balance', /<e[^>]+n="CREDITO_RESIDUO"[^>]*v="([^"]*)/i, replaceTagsAndSpaces, parseBalance);
    }

    html = AnyBalance.requestGet(baseurl + '190/ebwe/mx/PushSimTel.do');
    getParam(html, result, '__tariff', /<e[^>]+n="PIANO_TELEFONICO"[^>]*v="([^"]*)/i, replaceTagsAndSpaces, html_entity_decode);

    //Возвращаем результат
    AnyBalance.setResult(result);
}
