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
//	var html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/adm/status.asp');
	var html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/adm/status.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);
	var result = {success: true};

	//Название
	sumParam(html, result, '__tariff', /Firmware Version\s*<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, '__tariff', /Hardware Version\s*<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

	//Модем
	sumParam(html, result, 'connect_status_3g', /var cellCurStat = \"([\s\S]*?)\";/ig, replaceTagsAndSpaces, html_entity_decode, status2connect, aggregate_join);
	sumParam(html, result, 'modem_type', /var cellMdmType = \"([\s\S]*?)\";/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, 'modem_type', /var cellsupported = \"([\s\S]*?)\";/ig, replaceTagsAndSpaces, status2support, aggregate_join);

	//Уровень сигнала
	getParam(html, result, 'network_level_ch', /var cellMdmCsq = \"(\d*)\";/i, replaceTagsAndSpaces);
	getParam(html, result, 'network_level', /var cellMdmCsq = \"(\d*)\";/i, replaceTagsAndSpaces, level2pct);

	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/wireless/stainfo.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);
	
	//Количество подключенных пользователей
	if(AnyBalance.isAvailable('users')){
           var macs = sumParam(html, null, null, /(?:[\da-f]{2}:){5}[\da-f]{2}/ig);
           result.users = macs.length;
        }
        
        html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/adm/statistic.asp', 
		{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.62 Safari/537.36"}
	  
	);

        //Принятый трафик
        getParam(html, result, 'traffic_received_3g', /statisticCELLRxBytes\">Cell Rx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_received_lan', /statisticLANRxBytes\">LAN Rx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_received_wan', /statisticWANRxBytes\">WAN Rx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);

        //Отправленный трафик
        getParam(html, result, 'traffic_transmitted_3g', /statisticCELLTxBytes\">Cell Tx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_transmitted_lan', /statisticLANTxBytes\">LAN Tx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);
	getParam(html, result, 'traffic_transmitted_wan', /statisticWANTxBytes\">WAN Tx bytes: <\/td>\s*<td[^<]*>([\d,\.]*)<\/td>/i, null, parseTrafficMb);


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
