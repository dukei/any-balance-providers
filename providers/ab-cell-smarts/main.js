/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора Смартс.

Сайт оператора: http://issa.smarts.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "http://issa.smarts.ru/cgi-bin/cgi.exe?";

    AnyBalance.trace("Trying to enter issa at address: " + baseurl + "function=is_login");
    var html = AnyBalance.requestPost(baseurl + "function=is_login", {
        Lang: 2,
        mobnum: prefs.login,
        Password: prefs.password
    });
    
    var matches = html.match(/<td class=error>([\s\S]*?)<\/td>/i);
    if(matches){
        throw new AnyBalance.Error(matches[1].replace(/^\s*|\s*$/g, ''));
    }
    
    var result = {success: true};
    
    html = AnyBalance.requestGet(baseurl + "function=is_account");
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
    
    if(AnyBalance.isAvailable('average_speed')){
        var val = $tableBalance.find('td:contains("Средняя скорость расходования средств по лицевому счету в день")').next().text();
	AnyBalance.trace("Speed: " + val);
        if(val && (matches = val.match(/([\d\.]+)/))){
            result.average_speed = parseFloat(matches[1]);
        }
    }
    
    if(AnyBalance.isAvailable('status')){
        html = AnyBalance.requestGet(baseurl + 'function=is_tarif');
        $html = $(html);
        result.status = $.trim($html.find("tr:contains('Текущее состояние')").next().find('td:first-child').text());
    }

    AnyBalance.setResult(result);
}
