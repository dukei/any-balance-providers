/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у сотового оператора БайкалВестКом.

Сайт оператора: https://issa.bwc.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    
    var baseurl = "https://issa.bwc.ru/cgi-bin/cgi.exe?";

    AnyBalance.trace("Trying to enter issa at address: " + baseurl + "function=is_login");
    var html = AnyBalance.requestPost(baseurl + "function=is_login", {
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
    var $tableBalance = $html.find('h2:contains("Информация о лицевом счете")').next();
    
    if(AnyBalance.isAvailable('balance')){
        result.balance = parseFloat($tableBalance.find('td:contains("Актуальный баланс")').next().find('em').text());
    }
    
    if(AnyBalance.isAvailable('average_speed')){
        var val = $tableBalance.find('td:contains("Средняя скорость расходования средств по лицевому счету в день")').next().text();
	AnyBalance.trace("Speed: " + val);
        if(val && (matches = val.match(/([\d\.]+)/))){
            result.average_speed = parseFloat(matches[1]);
        }
    }
    
    var $tableCounters = $html.find('h2:contains("Общая продолжительность разговоров")').next();
    $tableCounters.find('tr').each(function(index){
        var str = $('td:nth-child(2)', this).text();
        if(!str)
            return;
        
        //Пакет минут
        if(matches = str.match(/(\d+) мин/)){
            result.min_total = parseInt(matches[1]);
            str = $('td:nth-child(3)', this).text();
            if(matches = str.match(/(\d+):\d+/)){
                result.min_used = parseInt(matches[1]);
                result.min_left = result.min_total - result.min_used;
            }
        }else if(matches = str.match(/([\d\.]+) Мб/)){
            result.traffic_total = parseFloat(matches[1]);
            str = $('td:nth-child(3)', this).text();
            if(matches = str.match(/([\d\.]+)/)){
                result.traffic_used = parseFloat(matches[1]);
                result.traffic_left = result.traffic_total - result.traffic_used;
            }
        }else if(str.match(/GPRS/i)){
            str = $('td:nth-child(3)', this).text();
            if(matches = str.match(/([\d\.]+)/)){
                result.traffic_used = parseFloat(matches[1]);
            }
        }
    });
    
    html = AnyBalance.requestGet(baseurl + 'function=is_tarif&inf=3');
    var val = $(html).find('h2:contains("Тарифный план:")').text();
    if(val && (matches = val.match(/:\s*(.*)/))){
        result.__tariff = matches[1];
    }
    
    AnyBalance.setResult(result);
}
