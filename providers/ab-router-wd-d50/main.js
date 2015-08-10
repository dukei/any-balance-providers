/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Router WD-D50 - маршрутизатор раздающий беспроводный интернет 3G стандарта CDMA и UMTS + GSM по Wi-Fi (802.11b/g/n).
Стандартный адрес устройства: http://192.168.169.1/
*/

function parseTrafficMb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024/1024*100)/100;
    return val;
}

function main(){
	var prefs = AnyBalance.getPreferences();

	var html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/adm/status.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}

	);
	var result = {success: true};

        //Первая прошивка
	//Название
	if(!/Cannot open URL/i.test(html)){
	sumParam(html, result, '__tariff', /Firmware Version\s*<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, '__tariff', /Hardware Version\s*<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

	//Модем
	sumParam(html, result, 'connect_status_3g', /var cellCurStat = \"([\s\S]*?)\";/ig, replaceTagsAndSpaces, html_entity_decode, status2connect, aggregate_join);
	sumParam(html, result, 'modem_type', /var cellMdmType = \"([\s\S]*?)\";/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, 'modem_type', /var cellsupported = \"([\s\S]*?)\";/ig, replaceTagsAndSpaces, status2support, aggregate_join);

	//Уровень сигнала
	getParam(html, result, 'network_level_ch', /var cellMdmCsq = \"(\d*)\";/i, replaceTagsAndSpaces);
	getParam(html, result, 'network_level', /var cellMdmCsq = \"(\d*)\";/i, replaceTagsAndSpaces, level2pct);

	//Время работы роутера
        sumParam(html, result, 'running_time', /System Up Time\s*<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, parseSeconds);
	}

	//Вторая прошивка
	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/r3g/status.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);

	//Название
	if(!/Cannot open URL/i.test(html)){
	sumParam(html, result, '__tariff', /Software Version\s*<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, '__tariff', /Hardware Version\s*<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

	//Время работы роутера
        sumParam(html, result, 'running_time', /System Up Time\s*<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode, parseSeconds);
	}

	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/r3g/wan3g.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);

	//Модем
	if(!/Cannot open URL/i.test(html)){
	sumParam(html, result, 'modem_type', /3G Mode<\/td>\s*<\/tr>\s*<tr>\s*<td[^>]*>\s*([\s\S]*?)\s*\<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	}

        //Первая прошивка
	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/wireless/stainfo.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);

	//Количество подключенных пользователей
	if(!/Cannot open URL/i.test(html)){
	if(AnyBalance.isAvailable('users')){
           var macs = sumParam(html, null, null, /(?:[\da-f]{2}:){5}[\da-f]{2}/ig);
           result.users = macs.length;
        }
	}

        //Вторая прошивка
	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/r3g/dhcpcliinfo.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);

	//Количество подключенных пользователей
	if(!/Cannot open URL/i.test(html)){
	if(AnyBalance.isAvailable('users')){
           var macs = sumParam(html, null, null, /(?:[\da-f]{2}:){5}[\da-f]{2}/ig);
           result.users = macs.length;
        }
	}

        //Первая прошивка
        html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/adm/statistic.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);

        //Принятый трафик
	if(!/Cannot open URL/i.test(html)){
        getParam(html, result, 'traffic_received_3g', /statisticCELLRxBytes\">Cell Rx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_received_lan', /statisticLANRxBytes\">LAN Rx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_received_wan', /statisticWANRxBytes\">WAN Rx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);

        //Отправленный трафик
        getParam(html, result, 'traffic_transmitted_3g', /statisticCELLTxBytes\">Cell Tx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_transmitted_lan', /statisticLANTxBytes\">LAN Tx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_transmitted_wan', /statisticWANTxBytes\">WAN Tx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	}

	//Вторая прошивка
	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/r3g/statistic.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);

	//Модем статус
	if(!/Cannot open URL/i.test(html)){
	if(AnyBalance.isAvailable('connect_status_3g')){
           var ppp = sumParam(html, null, null, /ppp0/ig);
	   if(ppp.length == 1)
             result.connect_status_3g = 'Соединено';
           else
             result.connect_status_3g = 'Не соединено';
        }

        //Принятый трафик
        getParam(html, result, 'traffic_received_3g', /"ppp0","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
        getParam(html, result, 'traffic_received_ra0', /"ra0","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_received_br0', /"br0","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_received_wan', /"eth2.2","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_received_eth2', /"eth2","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_received_eth2.1', /"eth2.1","\d+","([\d,\.]*)"/i, null, parseTrafficMb);

        //Отправленный трафик
        getParam(html, result, 'traffic_transmitted_3g', /"ppp0","\d+","\d+","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
        getParam(html, result, 'traffic_transmitted_ra0', /"ra0","\d+","\d+","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
        getParam(html, result, 'traffic_transmitted_br0', /"br0","\d+","\d+","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_transmitted_wan', /"eth2.2","\d+","\d+","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_transmitted_eth2', /"eth2","\d+","\d+","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_transmitted_eth2.1', /"eth2.1","\d+","\d+","\d+","([\d,\.]*)"/i, null, parseTrafficMb);
	}

	//Коррекция Времени работы роутера для Первой прошивки
        html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/adm/management.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	);

	if(!/Cannot open URL/i.test(html)){
	if(AnyBalance.isAvailable('running_time')){
        var gmt = getParam(html, null, null, /var tz = \"([\s\S]*?)\";/i, replaceTagsAndSpaces, gmt2utc);
	result.running_time=result.running_time-gmt;
	}
	}

	AnyBalance.setResult(result);
}

function level2pct(str){
      var level = parseInt(str);
      var pct;

      if(level<5)
        pct = 0;
    else if((level>=10)&&(level<15))
        pct = 40;
    else if((level>=15)&&(level<20))
        pct = 60;
    else if((level>=20)&&(level<25))
        pct = 80;
    else if((level>=25)&&(level<60))
        pct = 100;
    else if(level==99)
        pct = 0;
    else if((level>=101)&&(level<110))
        pct = 0;
    else if((level>=120)&&(level<130))
        pct = 40;
    else if((level>=130)&&(level<140))
        pct = 60;
    else if((level>=140)&&(level<150))
        pct = 80;
    else if(level>=150)
        pct = 100;
    else 
        pct = 20;

    return pct;
}

function status2connect(str){
    var status = parseInt(str);
    var connect;

    if(status==1)
        connect = 'Соединено';
    else 
        connect = 'Не соединено';
    return connect;
}

function status2support(str){
    var status = parseInt(str);
    var support;

    if(status==1)
        support = 'Поддерживается';
    else 
        support = 'Не поддерживается';
    return support;
}

function parseSeconds(text) {
        var hour = 0, min = 0, sec = 0;
        // Это формат ЧЧ:ММ:СС  
        if(/^\d+:\d+:\d+$/i.test(text)) {
                var regExp = /^(\d+):(\d+):(\d+)$/i.exec(text);
                hour = parseFloat(regExp[1]);
                min = parseFloat(regExp[2]);
                sec = parseFloat(regExp[3]);
        } else if(/^\d+ .+ \d+ .+ \d+ .+$/i.test(text)) {
                var regExp = /^(\d+) .+ (\d+) .+ (\d+) .+$/i.exec(text);
                hour = parseFloat(regExp[1]);
                min = parseFloat(regExp[2]);
                sec = parseFloat(regExp[3]);
        // Это формат ММ:СС
        } else if(/^\d+:\d+/i.test(text)) {
                var regExp = /^(\d+):(\d+)/i.exec(text);
                hour = 0;
                min = parseFloat(regExp[1]);
                sec = parseFloat(regExp[2]);
        } else if(/^\d+ .+ \d+/i.test(text)) {
                var regExp = /^(\d+) .+ (\d+)/i.exec(text);
                hour = 0;
                min = parseFloat(regExp[1]);
                sec = parseFloat(regExp[2]);
        // Это формат СС
        }else {
                var regExp = /^(\d+)/i.exec(text);
                hour = 0;
                min = 0;
                sec = parseFloat(regExp[1]);
        }
        var val = (hour*3600) + (min * 60) + sec;
        AnyBalance.trace('Parsed seconds (' + val + ') from: ' + text);
        return val;
}

function gmt2utc(str){

      var pct;

      if(str=='UCT_-11')
        pct = 46800;
    else if(str=='UCT_-10')
        pct = 50400;
    else if(str=='NAS_-09')
        pct = 54000;
    else if(str=='PST_-08')
        pct = 57600;
    else if(str=='MST_-07')
        pct = 61200;
    else if(str=='CST_-06')
        pct = 64800;
    else if(str=='UCT_-06')
        pct = 64800;
    else if(str=='UCT_-05')
        pct = 68400;
    else if(str=='EST_-05')
        pct = 68400;
    else if(str=='AST_-04')
        pct = 72000;
    else if(str=='UCT_-04')
        pct = 72000;
    else if(str=='UCT_-03')
        pct = 75600;
    else if(str=='EBS_-03')
        pct = 75600;
    else if(str=='NOR_-02')
        pct = 79200;
    else if(str=='EUT_-01')
        pct = 82800;
    else if(str=='MET_001')
        pct = 3600;
    else if(str=='MEZ_001')
        pct = 3600;
    else if(str=='UCT_001')
        pct = 3600;
    else if(str=='EET_002')
        pct = 7200;
    else if(str=='SAS_002')
        pct = 7200;
    else if(str=='IST_003')
        pct = 10800;
    else if(str=='MSK_003')
        pct = 10800;
    else if(str=='UCT_004')
        pct = 14400;
    else if(str=='UCT_005')
        pct = 18000;
    else if(str=='UCT_006')
        pct = 21600;
    else if(str=='UCT_007')
        pct = 25200;
    else if(str=='CST_008')
        pct = 28800;
    else if(str=='CCT_008')
        pct = 28800;
    else if(str=='SST_008')
        pct = 28800;
    else if(str=='AWS_008')
        pct = 28800;
    else if(str=='JST_009')
        pct = 32400;
    else if(str=='KST_009')
        pct = 32400;
    else if(str=='UCT_010')
        pct = 36000;
    else if(str=='AES_010')
        pct = 36000;
    else if(str=='UCT_011')
        pct = 39600;
    else if(str=='UCT_012')
        pct = 43200;
    else if(str=='NZS_012')
        pct = 43200;
    else 
        pct = 0;

    return pct;
}
