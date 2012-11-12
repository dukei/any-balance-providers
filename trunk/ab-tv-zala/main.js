/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Белтелеком (Zala) - белорусский провайдер телевидения
Сайт оператора: http://zala.by/
Личный кабинет: https://issa.beltelecom.by
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = 'https://issa.beltelecom.by/cgi-bin/cgi.exe?';

    AnyBalance.trace('Entering ' + baseurl  + "function=is_login");

    var required_headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:12.0) Gecko/20100101 Firefox/12.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-ru,ru;q=0.8,en-us;q=0.5,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
    };
    
    var html = AnyBalance.requestPost(baseurl + "function=is_login", {
        Lang: 2,
        mobnum: prefs.login,
        Password: prefs.password
    }, required_headers);

    //AnyBalance.trace(html);

    var matches = html.match(/<td class=error>([\s\S]*?)<\/td>/i);
    if(matches){
        throw new AnyBalance.Error(matches[1].replace(/^\s*|\s*$/g, ''));
    }
    
    var result = {
        success: true
    };
    
    html = AnyBalance.requestGet(baseurl + "function=is_account", required_headers);
    //AnyBalance.trace(html);
    if(!/\?function=is_exit/i.test(html)){
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Проблемы на сайте или сайт изменен.");
    }

    var $html = $(html);
    var $tableInfo = $html.find('table.ystyle:has(img[src*="images/issa/person.gif"])');
    AnyBalance.trace("Found info table: " + $tableInfo.length);
    
    if(AnyBalance.isAvailable('username')){
        var val = $tableInfo.find('td:has(img[src*="images/issa/person.gif"])').next().find('b').text();
        if(val)
            result.username = $.trim(val);
    }
    if(AnyBalance.isAvailable('agreement'))
        result.agreement = $.trim($tableInfo.find('td:has(img[src*="images/issa/account.gif"])').next().find('b').text());
    
    result.__tariff = $.trim($tableInfo.find('td:has(img[src*="images/issa/tariff.gif"])').next().find('b').text());
    
    var $tableBalance = $html.find('p:contains("Информация о лицевом счете")').next();
    AnyBalance.trace("Found balance table: " + $tableBalance.length);
    
    if(AnyBalance.isAvailable('balance')){
        var val = $tableBalance.find('td:contains("Актуальный баланс")').next().text();
        if(val && (matches = val.match(/[\-\d\.]+/)))
            result.balance = parseFloat(matches[0]);
    }
    
    if(AnyBalance.isAvailable('corrections')){
        var val = $tableBalance.find('td:contains("Сумма корректировок за текущий месяц:")').next().text();
        AnyBalance.trace("Corrections: " + val);
        if(val && (matches = val.match(/([\-\d\.]+)/))){
            result.corrections = parseFloat(matches[1]);
        }
    }

    if(AnyBalance.isAvailable('pays')){
        var val = $tableBalance.find('td:contains("Сумма платежей за текущий месяц:")').next().text();
        AnyBalance.trace("Pays: " + val);
        if(val && (matches = val.match(/([\-\d\.]+)/))){
            result.pays = parseFloat(matches[1]);
        }
    }
   
    AnyBalance.setResult(result);
}