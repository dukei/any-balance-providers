/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о наличии штрафов с белорусского сайта мвд

Operator site: http://mvd.gov.by/
Личный кабинет: http://mvd.gov.by/ru/main.aspx?guid=15791
*/

var g_headers = {
'Accept':'*/*',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'Content-Type': 'application/json; charset=UTF-8',
'Referer': 'http://mvd.gov.by/ru/main.aspx?guid=15791',
'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    checkEmpty(prefs.surname, 'Введите фамилию!');
    checkEmpty(prefs.username, 'Введите имя!');
    checkEmpty(prefs.fathername, 'Введите отчество!');
    checkEmpty(prefs.srseria, 'Введите серию свидетельства о регистрации!');
    checkEmpty(prefs.srnumber, 'Введите номер свидетельства о регистрации!');

    var baseurl = "http://mvd.gov.by/Ajax.asmx/GetExt";

    AnyBalance.setDefaultCharset('utf-8'); 

    var html = AnyBalance.requestPost(baseurl, JSON.stringify({
        "GuidControl":2091,
        "Param1":prefs.surname + " " + prefs.username + " " + prefs.fathername,
        "Param2":prefs.srseria,
        "Param3":prefs.srnumber
    }), g_headers);


    if(!/не найдена|ата и время последнего обновления данных/i.test(html)){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось получить данные по штрафам. Обратитесь к разработчику.');
    }

    var result = {success: true};

    result.__tariff = prefs.surname + ' ' + prefs.username.substr(0,1) + prefs.fathername.substr(0,1) + ' (' + prefs.srseria + ' ' + prefs.srnumber + ')';

    if(/не найдена/i.test(html))
        result.status = 'Чисто';
    else{
    	try{
    		var table = getJson(html);
    		var fines = sumParam(table, null, null, /<tr[^>]*>((?:[\s\S](?!<\/tr>))*?<td[^>]*>\s*\d+\s*<\/td>)\s*<\/tr>/ig);
    		var latest = {};
    		var all = [];

    		for(var i=0; i<fines.length; ++i){
    			var dt = getParam(fines[i], null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    			var num = getParam(fines[i], null, null, /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    			if(!latest.dt || dt > latest.dt){
    				latest.dt = dt;
    				latest.num = num;
    			}
    			all.push(getParam(fines[i], null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode) + ' - ' + num);
    		}

   			getParam(all.join('\n'), result, 'all');
   			getParam(latest.dt, result, 'last_date');
   			getParam(latest.num, result, 'last_num');
       	}catch(e){
       	    AnyBalance.trace(e.message + '\n' + e.stack);
       	}
        result.status = 'Штраф';
    }

    AnyBalance.setResult(result);
}
