/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для украинского провайдера спутникового телевидения VIASAT

Сайт оператора: http://www.viasat.ua/
Личный кабинет: http://www.viasat.ua/abonent/login
*/

var g_headers = {
  'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
  'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
  'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
  Connection: 'keep-alive'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "http://www.viasat.ua/abonent/";

    var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

    var token = getParam(html, null, null, /<input[^>]+name="authenticity_token"[^>]*value="([^"]*)/i, null, html_entity_decode);
    if(!token)
        throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
 
    html = AnyBalance.requestPost(baseurl + 'session', {
        authenticity_token: token,
	login:prefs.login,
	password:prefs.password,
        x: 49,
        y: 16
    }, g_headers);

    //AnyBalance.trace(html);
    if(!/\/abonent\/logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]*style=["']color:\s*red[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<span[^>]*class="balance"[^>]*>([\S\s]*?)<\/span>/i, [/&#8209;/g, '-', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, 'agreement', /(?:№ договору|№ договора):([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', />\s*(?:пакет)\s*(<[\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /(?:Статус):([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'clientid', /(?:Номер клієнта|Номер клиента):([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'cardnum', /(?:Номер карти|Номер карты):([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}
