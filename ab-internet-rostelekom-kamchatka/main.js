/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интернет Ростелеком Камчатский филиал
Сайт оператора: http://disly.dsv.ru/kam
Личный кабинет: http://issa.kamchatka.ru/
*/

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://issa.kamchatka.ru//cgi-bin/cgi.exe?';
    // Заходим на главную страницу
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
    
    if(AnyBalance.isAvailable('average_speed')){
        var val = $tableBalance.find('td:contains("Средняя скорость расходования средств по лицевому счету в день")').next().text();
        AnyBalance.trace("Speed: " + val);
        if(val && (matches = val.match(/([\d\.]+)/))){
            result.average_speed = parseFloat(matches[1]);
        }
    }

    if(AnyBalance.isAvailable('time_off')){
        var val = $tableBalance.find('td:contains("Предположительная дата отключения без поступления средств менее")').next().text();
        AnyBalance.trace("Time off: " + val);
        if(val && (matches = val.match(/(\d+)/))){
            result.time_off = parseInt(matches[1]);
        }
    }

    var $tableCounters = $html.find('table.ystyle:contains("Название аккумулятора")');
    AnyBalance.trace("Found counters table: " + $tableCounters.length);
    
    $tableCounters.find('tr').each(function(index){
        var str = $('td:nth-child(2)', this).text();
        if(!str)
            return;
        
        //Входящий локальный трафик
        if(matches = str.match(/Входящий локальный трафик/i)){
            str = $('td:nth-child(3)', this).text();
            if(matches = str.match(/([\d\.]+)/)){
                result.traffic_local_in = Math.round(parseFloat(matches[1])*100)/100;
            }
        }else if(matches = str.match(/Исходящий внешний трафик/i)){
            str = $('td:nth-child(3)', this).text();
            if(matches = str.match(/([\d\.]+)/)){
                result.traffic_global_out = Math.round(parseFloat(matches[1])*100)/100;
            }
        }else if(matches = str.match(/Входящий внешний трафик/i)){
            str = $('td:nth-child(3)', this).text();
            if(matches = str.match(/([\d\.]+)/)){
                result.traffic_global_in = Math.round(parseFloat(matches[1])*100)/100;
            }
        }else if(matches = str.match(/Трафик входящий в абонплату/i)){
            str = $('td:nth-child(3)', this).text();
            if(matches = str.match(/([\d\.]+)/)){
                result.traffic_included = Math.round(parseFloat(matches[1])*100)/100;
            }
        }else if(matches = str.match(/Безлимитная Камчатка/i)){
            str = $('td:nth-child(3)', this).text();
            if(matches = str.match(/([\d\.]+)/)){
                result.traffic_kamchatka = Math.round(parseFloat(matches[1])/1024*100)/100;
            }
        }
    });
    
    AnyBalance.setResult(result);
}