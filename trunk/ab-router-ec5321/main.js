/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Router Huawei EC 5321u-1 - маршрутизатор раздающий беспроводный интернет 3G стандарта CDMA по Wi-Fi (802.11b/g/n).
Стандартный адрес устройства: http://192.168.1.1/
*/

function parseTrafficMb(str){
    var val = parseBalance(str);
    if(isset(val))
        val = Math.round(val/1024/1024*100)/100;
    return val;
}

function main(){
	var prefs = AnyBalance.getPreferences();
	var html = AnyBalance.requestGet('http://' + (prefs.ipaddress || '192.168.1.1') + '/api/monitoring/status');
	var result = {success: true};


	//Название
	sumParam(html, result, '__tariff', /\<CurrentNetworkType\>(\d+)\<\/CurrentNetworkType\>/ig, replaceTagsAndSpaces, html_entity_decode, status2support, aggregate_join);

	//Количество пользователей
	sumParam(html, result, 'users', /\<CurrentWifiUser\>(\d+)\<\/CurrentWifiUser\>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

	//Заряд батареи
	sumParam(html, result, 'battery', /\<BatteryLevel\>(\d+)\<\/BatteryLevel\>/ig, replaceTagsAndSpaces, html_entity_decode, level2pct, aggregate_join);
	sumParam(html, result, 'battery_status', /\<BatteryStatus\>(-?\d+)\<\/BatteryStatus\>/ig, replaceTagsAndSpaces, html_entity_decode, status2bat, aggregate_join);

	//Соединение
	sumParam(html, result, 'connect_status_3g', /\<ConnectionStatus\>(\d+)\<\/ConnectionStatus\>/ig, replaceTagsAndSpaces, html_entity_decode, status2connect, aggregate_join);

	//Уровень сигнала
	sumParam(html, result, 'network_level', /\<SignalStrength\>(\d+)\<\/SignalStrength\>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);


	//Трафик
	html = AnyBalance.requestGet('http://' + (prefs.ipaddress || '192.168.1.1') + '/api/monitoring/traffic-statistics');

	sumParam(html, result, 'traffic_download', /\<CurrentDownload\>(\d+)\<\/CurrentDownload\>/ig, html_entity_decode, parseTrafficMb, aggregate_join);
	sumParam(html, result, 'traffic_upload', /\<CurrentUpload\>(\d+)\<\/CurrentUpload\>/ig, html_entity_decode, parseTrafficMb, aggregate_join);
	sumParam(html, result, 'traffic_download_all', /\<TotalDownload\>(\d+)\<\/TotalDownload\>/ig, html_entity_decode, parseTrafficMb, aggregate_join);
	sumParam(html, result, 'traffic_upload_all', /\<TotalUpload\>(\d+)\<\/TotalUpload\>/ig, html_entity_decode, parseTrafficMb, aggregate_join);

        sumParam(html, result, 'connected_time', /\<CurrentConnectTime\>(\d+)\<\/CurrentConnectTime\>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, 'connected_time_all', /\<TotalConnectTime\>(\d+)\<\/TotalConnectTime\>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);


	//SMS
	html = AnyBalance.requestGet('http://' + (prefs.ipaddress || '192.168.1.1') + '/api/sms/sms-count');

	sumParam(html, result, 'sms_unread', /\<LocalUnread\>(\d+)\<\/LocalUnread\>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, 'sms_inbox', /\<LocalInbox\>(\d+)\<\/LocalInbox\>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, 'sms_outbox', /\<LocalOutbox\>(\d+)\<\/LocalOutbox\>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam(html, result, 'sms_draft', /\<LocalDraft\>(\d+)\<\/LocalDraft\>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);


	AnyBalance.setResult(result);
}

function level2pct(str){
      var level = parseInt(str);
      var pct;
      
      if(level==4)
        pct = 100;
    else if(level==3)
        pct = 75;
    else if(level==2)
        pct = 50;
    else if(level==1)
        pct = 25;
    else 
        pct = 0;
    
    return pct;
}

function status2bat(str){
    var status = parseInt(str);
    var batt;
    
    if(status==1)
        batt = 'Заряжается';
    else if(status==-1)
        batt = 'Разряжена';
    else if(status==0)
        batt = 'Норма';
    else 
        batt = 'Неопределено';
    return batt;
}

function status2connect(str){
    var status = parseInt(str);
    var connect;
    
    if(status==901)
        connect = 'Соединено';
    else 
        connect = 'Не соединено';
    return connect;
}

function status2support(str){
    var status = parseInt(str);
    var support;
    
    if(status==0)
        support = 'Без стандарта';
    else if(status==1)
        support = 'GSM';
    else if(status==2)
        support = 'GPRS';
    else if(status==3)
        support = 'EDGE';
    else if(status==4)
        support = 'W-CDMA';
    else if(status==5)
        support = 'HSDPA';
    else if(status==6)
        support = 'HSUPA';
    else if(status==7)
        support = 'HSPA';
    else if(status==8)
        support = 'TD-SCDMA';
    else if(status==9)
        support = 'HSPA+';
    else if(status==10)
        support = 'EVDO Rev.0';
    else if(status==11)
        support = 'EVDO Rev.A';
    else if(status==12)
        support = 'EVDO Rev.B';
    else if(status==13)
        support = '1xRTT';
    else if(status==14)
        support = 'UMB';
    else if(status==15)
        support = '1xEVDV';
    else if(status==16)
        support = '3xRTT';
    else if(status==17)
        support = 'HSPA+ 64';
    else if(status==18)
        support = 'HSPA+ MIMO';
    else if(status==19)
        support = 'LTE';
    else 
        support = 'Не определено';
    return support;
}
