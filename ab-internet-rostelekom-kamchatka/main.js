/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Интернет Ростелеком Камчатский филиал
Сайт оператора: http://disly.dsv.ru/kam
Личный кабинет: http://issa.kamchatka.ru/
*/

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time = 0;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + 'from value: ' +  str);
    return time;
}

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

        var value;
        if(regexp){
            var matches = regexp.exec (html);
            if(matches)
                value = (matches.length <= 1 ? matches[0] : matches[1]);
        }else{
            value = html;
        }

	if (typeof(value) != 'undefined') {
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

		if(param)
			result[param] = value;
		return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseBalance(text){
    var val = getParam(text.replace(/\s+/g, ''), null, null, /(-?\d[\d.,]*)/, replaceFloat, parseFloat);
    AnyBalance.trace('Parsing balance (' + val + ') from: ' + text);
    return val;
}

function parseTraffic(text){
     var val = parseBalance(text);
     if(val)
         val = Math.round(val*100)/100;
     return val;
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'http://issa.kamchatka.ru/cgi-bin/cgi.exe?';
    // Заходим на главную страницу
    var html = AnyBalance.requestPost(baseurl + "function=is_login", {
        Lang: 2,
    	mobnum: prefs.login,
        Password: prefs.password
    });

    var error = getParam(html, null, null, /<td class=error>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);
    
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
        getParam(val, result, 'balance', null, null, parseBalance);
    }
    
    if(AnyBalance.isAvailable('average_speed')){
        var val = $tableBalance.find('td:contains("Средняя скорость расходования средств по лицевому счету в день")').next().text();
        AnyBalance.trace("Speed: " + val);
        getParam(val, result, 'average_speed', null, null, parseBalance);
    }

    if(AnyBalance.isAvailable('time_off')){
        var val = $tableBalance.find('td:contains("Предположительная дата отключения без поступления средств менее")').next().text();
        AnyBalance.trace("Time off: " + val);
        getParam(val, result, 'time_off', null, null, parseBalance);
    }

    var $tableCounters = $html.find('table.ystyle:contains("Название аккумулятора")');
    AnyBalance.trace("Found counters table: " + $tableCounters.length);
    
    $tableCounters.find('tr').each(function(index){
        var str = $('td:nth-child(2)', this).text();
        if(!str)
            return;
        
        //Входящий локальный трафик
        var val = $('td:nth-child(3)', this).text();
        if(matches = str.match(/Входящий локальный трафик/i)){
            getParam(val, result, 'traffic_local_in', null, null, parseTraffic);
        }else if(matches = str.match(/Исходящий внешний трафик/i)){
            getParam(val, result, 'traffic_global_out', null, null, parseTraffic);
        }else if(matches = str.match(/Входящий внешний трафик/i)){
            getParam(val, result, 'traffic_global_in', null, null, parseTraffic);
        }else if(matches = str.match(/Трафик входящий в абонплату/i)){
            getParam(val, result, 'traffic_included', null, null, parseTraffic);
        }else if(matches = str.match(/Безлимитная Камчатка/i)){
            getParam(val, result, 'traffic_kamchatka', null, null, parseTraffic);
        }else if(matches = str.match(/Доп. пакет внеш. трафика \(300 Мб\)/i)){
            getParam(val, result, 'traffic_300', null, null, parseTraffic);
        }else if(matches = str.match(/Доп. пакет внеш. трафика \(1000 Мб\)/i)){
            getParam(val, result, 'traffic_1000', null, null, parseTraffic);
        }
    });

    if(AnyBalance.isAvailable('traffic_night_out', 'traffic_night_in')){
        html = AnyBalance.requestGet(baseurl + 'function=is_lastcalls&action=report');
        $html = $(html);
        var now = new Date(), monthBegin = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        $html.find('table.ystyle').find('tr').each(function(index){
            var str = $('td:nth-child(2)', this).text();
            if(!/Ночной безлимит/i.test(str))
                return;
            
            var name;
            if(/Исходящий внешний трафик/i.test(str) && AnyBalance.isAvailable('traffic_night_out'))
                name = 'traffic_night_out';
            if(/Входящий внешний трафик/i.test(str) && AnyBalance.isAvailable('traffic_night_in'))
                name = 'traffic_night_in';
            if(!name)
                return;

            var date = parseDate($('td:nth-child(1)', this).text());
            if(!date || date < monthBegin)
                return;
            
            var val = getParam($('td:nth-child(3)', this).text(), null, null, null, null, parseBalance) || 0;
            result[name] = (typeof(result[name]) == 'undefined' ? 0 : result[name]) + val;
        });

        if(result.traffic_night_out) result.traffic_night_out = Math.round(result.traffic_night_out*100)/100;
        if(result.traffic_night_in) result.traffic_night_in = Math.round(result.traffic_night_in*100)/100;
   }
    
    AnyBalance.setResult(result);
}