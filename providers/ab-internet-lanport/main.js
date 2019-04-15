/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main() {

    AnyBalance.setDefaultCharset('utf-8');

    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.key, 'Введите ключ доступа!');
	
    var baseurl = "http://new.lanport.ru/lk?";
    
    var html = AnyBalance.requestPost(baseurl + prefs.key, {});
    
    //AnyBalance.trace('got  ' + html);
   
    var ps = html.lastIndexOf('Доступ извне нужно включить предварительно из личного кабинета, находясь внутри сети.');
    if (ps >= 0) {
       throw new AnyBalance.Error('Доступ извне нужно включить предварительно из личного кабинета, находясь внутри сети');
    }

    var p1 = html.lastIndexOf('Номер договора');
    if (p1 < 0)
        throw new AnyBalance.Error('Не удаётся найти данные. Сайт изменен?');

    html = html.substr(p1);

    var result = {success: true};

    getParam(html, result, 'dogovor', /Номер договора<\/td>[^>]*>(.*?)<\/td>/i,  replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус[^>]*>[^>]*>[^<]*<span style="[^"]*">(.*?)<\/span/i,  replaceTagsAndSpaces, html_entity_decode);

    var r = "";
    var c = "";
    if(matches = html.match(/Баланс[\D]*(.*?) руб. (.*?) коп/)) {
        r = matches[1];
        c = matches[2];
        result['balance'] = r+'.'+c;
    }
    r = "";
    c = "";
    if(matches = html.match(/Последний платеж[\D]*(.*?) руб. (.*?) коп/)) {
        r = matches[1];
        c = matches[2];
        result['last_payment'] = r+'.'+c;
    }

    AnyBalance.setResult(result);
}


