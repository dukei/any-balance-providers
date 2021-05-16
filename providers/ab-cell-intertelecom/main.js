/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
var g_headers={
'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
'Sec-Fetch-Mode':'navigate',
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
'Sec-Fetch-Site':'same-origin',
'Referer':'https://my.intertelecom.ua/',
'Accept-Encoding':'gzip, deflate, br',
'Accept-Language':'ru,ru-RU;q=0.9,en-US;q=0.8,en;q=0.7,uk;q=0.6',
'Upgrade-Insecure-Requests':1,
//'DNT':1
}
function main() {
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.phone, 'Введите номер телефона!');
    checkEmpty(prefs.pass, 'Введите пароль!');
    AnyBalance.setDefaultCharset('utf-8');

head={
'Accept-Charset':'utf-8',
'Content-Type':'text/xml'}



var html=AnyBalance.requestPost(encodeURI('https://assa.intertelecom.ua/api.php?request=<?xml version="1.0" encoding="UTF-8"?><responc><code>1</code><ip>10.0.2.15</ip><lang>rus</lang><pass>123456QwErty70</pass><phone>443841413</phone><phone2v>443841413</phone2v><real_ip>10.0.2.15</real_ip></responc>'),'',head);
var id=getParam(html,/<id>([^<]*)<\/id>/)
html=AnyBalance.requestPost(encodeURI('https://assa.intertelecom.ua/api.php?request=<?xml version="1.0" encoding="UTF-8"?><responc><code>'+7+'</code><id>'+id+'</id><ip>10.0.2.15</ip><lang>rus</lang><pass>123456QwErty70</pass><phone>443841413</phone><phone2v>443841413</phone2v><real_ip>10.0.2.15</real_ip></responc>'),'',head);
var result = {success: true}
        var services = getElement(html,/<extra>/).match(/<item[^>]*?>/ig);
        var title,value,dateTo,type,minNumber=0,internetNumber=0;
        for (var i=0;i<services.length;i++){
        	title=getParam(services[i],null,null,/title="([^"]*?)"/);
        	value=getParam(services[i],null,null,/value="([\s\S]*?) по/);
        	dateTo=getParam(services[i],null,null,/value="[\s\S]*? по ([^"]*?)"/);
        	type=getParam(services[i],null,null,/type="([^"]*?)"/);
        	//getParam(services[i],null,null,/display_subtitle="([^"]*?)"/)
        	if (type=='time'){
        		getParam(value,result,'min'+minNumber,null,null,parseSeconds);
        		getParam(dateTo,result,'date_min'+minNumber,null,null,parseDate);
        		if (prefs.needPref) getParam(title+':',result,'pref_min'+minNumber);
                        minNumber+=1;
        	}else if(type=='internet'){
        		getParam(value,result,'traffic'+minNumber,null,null,parseBalance);
        		getParam(dateTo,result,'date_traffic'+minNumber,null,null,parseDate);
        		if (prefs.needPref) getParam(title+':',result,'pref_traffic'+minNumber);
        	}else{
        		AnyBalance.trace('Неизвестный баланс:\n'+type+'\n'+title+'\n'+value+'\n'+dateTo);
        	}
        }
        result.ls=getElement(html,/<saldo_id>/,replaceTagsAndSpaces);
        result.__tariff=getElement(html,/<tariff>/,replaceTagsAndSpaces);
        result.mobsubscr=parseStazh(getElement(html,/<abonent_age>/,replaceTagsAndSpaces));
        result.loyalty=parseStazh(getElement(html,/<loyal_age>/,replaceTagsAndSpaces));
        result.contphone=getElement(html,/<contact_num>/,replaceTagsAndSpaces);
        result.mobphonet=getElement(html,/<phone_num_converted>/,replaceTagsAndSpaces);
        result.phonet=getElement(html,/<phone_num>/,replaceTagsAndSpaces);

	AnyBalance.setResult(result);
} 

function parseStazh(str) {
    var matches = str.match(/(\d+)[^\d]*?(\d+)/);
    if (matches) {
        var val = (365 * matches[1] + 30 * matches[2]) * 86400;
        AnyBalance.trace("Parsed " + val + ' seconds from ' + str);
        return val;
    } else {
        AnyBalance.trace("Не удалось вычислить стаж из " + str);
    }
}

function parseSeconds(str) {
    var matches = /(\d+):0*(\d+):0*(\d+)/.exec(str);
    var time;
    if (matches) {
        time = (+matches[1]) * 3600 + (+matches[2]) * 60 + (+matches[3]);
        AnyBalance.trace('Parsing seconds ' + time + ' from value: ' + str);
        return time;
    }
    AnyBalance.trace('Could not parse seconds from value: ' + str);
}
