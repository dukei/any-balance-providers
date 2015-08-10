/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Роутеры Hame - маршрутизаторы раздающий беспроводный интернет 3G стандарта CDMA и UMTS + GSM по Wi-Fi (802.11b/g/n).
Стандартный адрес устройства: http://192.168.169.1/
*/

function parseTrafficMb(str){
    var val = str;
    if(isset(val))
        val = Math.round(val/1024*100)/100;
    return val;
}


function main(){
	var prefs = AnyBalance.getPreferences();
	var admpass = hex_md5(prefs.admpass);

	var html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/goform/signin', 
		 {admpass: admpass}
		 ,
		 {"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36"}
	);

	var result = {success: true};


	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/adm/status.asp', 
		 {"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36"}
	);

	//Название
	sumParam(html, result, '__tariff', /Platform<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
	sumParam('ver.', result, '__tariff', null, null, null, aggregate_join)
	sumParam(html, result, '__tariff', /Version<\/td>\s*<td[^<]*>([\s\S]*?)<\/td>/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);


	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/internet/dhcpcliinfo.asp', 
		 {"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36"}
	);

        //Количество подключенных пользователей
	if(AnyBalance.isAvailable('users')){
           var macs = sumParam(html, null, null, /(?:[\da-f]{2}:){5}[\da-f]{2}/ig);
           result.users = macs.length;
        }


        html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/goform/GetstatusData', 
		 {"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36"}
	);

	//Статус подключения модема
	var connect_status_txt = getParam(html, null, null, /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d\d:\d\d:\d\d;[^>]*?;\d;\d;([\s\S]*?);/i, replaceTagsAndSpaces, html_entity_decode);
	var connect_status_nbr = getParam(html, null, null, /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d\d:\d\d:\d\d;[^>]*?;\d;\d;[^>]*?;\d;([\s\S]*?);/i, replaceTagsAndSpaces, html_entity_decode);

        if((connect_status_txt=='status connect')&&(connect_status_nbr=='0'))
          result.connect_status = 'Соединено';
        else if((connect_status_txt=='status connect')&&(connect_status_nbr=='1'))
          result.connect_status = 'Разъединено';
        else if((connect_status_txt=='status connecting')&&(connect_status_nbr=='0'))
          result.connect_status = 'Соединяется';
        else if((connect_status_txt=='status reconnecting')&&(connect_status_nbr=='0'))
          result.connect_status = 'Пересоединяется';
        else 
          result.connect_status = 'Неизвестно';

	//Тип подключения
	sumParam(html, result, 'connect_type', /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d\d:\d\d:\d\d;([\s\S]*?);/i, replaceTagsAndSpaces, html_entity_decode, aggregate_join);

	//Загруженный трафик
        sumParam(html, result, 'traffic_download', /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d\d:\d\d:\d\d;[^>]*?;\d;\d;[^>]*?;\d;\d;[^>]*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*;(\d*);/ig, replaceTagsAndSpaces, html_entity_decode, parseTrafficMb, aggregate_join);
	//Отправленный трафик
        sumParam(html, result, 'traffic_upload', /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d\d:\d\d:\d\d;[^>]*?;\d;\d;[^>]*?;\d;\d;[^>]*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;(\d*);/ig, replaceTagsAndSpaces, html_entity_decode, parseTrafficMb, aggregate_join);
        //Общий трафик
        sumParam(html, result, 'traffic_total', /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d\d:\d\d:\d\d;[^>]*?;\d;\d;[^>]*?;\d;\d;[^>]*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*;\d*;\d?\d?:?\d?\d?:?\d?\d?;(\d*);/ig, replaceTagsAndSpaces, html_entity_decode, parseTrafficMb, aggregate_join);

	//Время работы роутера
        sumParam(html, result, 'running_time', /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;([\s\S]*?);/i, replaceTagsAndSpaces, html_entity_decode, parseSeconds);
	//Текущее время соединения
        sumParam(html, result, 'connected_time', /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d\d:\d\d:\d\d;[^>]*?;\d;\d;[^>]*?;\d;\d;[^>]*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*;\d*;([\s\S]*?);/i, replaceTagsAndSpaces, html_entity_decode, parseSeconds);
        //Общее время соединения
        sumParam(html, result, 'connected_time_total', /\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d\d:\d\d:\d\d;[^>]*?;\d;\d;[^>]*?;\d;\d;[^>]*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*?\.?\d*?\.?\d*?\.?\d*?;\d*;\d*;\d?\d?:?\d?\d?:?\d?\d?;\d*;([\s\S]*?);/i, replaceTagsAndSpaces, html_entity_decode, parseSeconds);


	html = AnyBalance.requestPost('http://' + (prefs.ipaddress || '192.168.169.1') + '/goform/GetmainData', 
		 {"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.57 Safari/537.36"}
	);

	//Уровень сигнала
	sumParam(html, result, 'signal_level', /[^>]*?;([\s\S]*?);/i, replaceTagsAndSpaces, html_entity_decode, status2signal, aggregate_join);


	AnyBalance.setResult(result);
}

function status2signal(str){

    var signal;

    if(str=='sig_5')
        signal = 100;
    else if(str=='sig_4')
        signal = 80;
    else if(str=='sig_3')
        signal = 60;
    else if(str=='sig_2')
        signal = 40;
    else if(str=='sig_1')
        signal = 20;    
    else 
        signal = 0;
    return signal;
}

function parseSeconds(str){
    var matches = /(\d+):0*(\d+):0*(\d+)/.exec(str);
    var time;
    if(matches){
	  time = (+matches[1])*3600 + (+matches[2])*60 + (+matches[3]);
          AnyBalance.trace('Parsing seconds ' + time + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Could not parse seconds from value: ' + str);
}
