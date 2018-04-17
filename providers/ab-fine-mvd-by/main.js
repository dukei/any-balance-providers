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
    			var dt = getParam(fines[i], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    			var num = getParam(fines[i], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    			var sum = getFineSum(num);
    			if(!latest.dt || dt > latest.dt){
    				latest.dt = dt;
    				latest.num = num;
    				latest.sum = sum;
    			}

    			var str = getParam(fines[i], null, null, /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces) + ' - ' + num;
    			if(sum)
    				str += ': <b>' + sum + ' р</b>';

    			all.push(str);
   				sumParam(sum, result, 'total_sum', null, null, null, aggregate_sum);
    		}

   			getParam(all.join('<br/>\n'), result, 'all');
   			getParam(latest.dt, result, 'last_date');
   			getParam(latest.num, result, 'last_num');
   			getParam(latest.sum, result, 'last_sum');
       	}catch(e){
       	    AnyBalance.trace(e.message + '\n' + e.stack);
       	}
        result.status = 'Штраф';
    }

    AnyBalance.setResult(result);
}

function getFineSum(num){
	try{
		var html, form, params;
		var baseurl = 'https://pay.wmtransfer.by/pls/iSOU/';
		
		if(!getFineSum.authorized){
			html = AnyBalance.requestGet("https://wmtransfer.by/pay.asp", g_headers);
		    
			form = getElement(html, /<form[^>]+id="pay"/i);
			if(!form){
				AnyBalance.trace(html);
				throw new AnyBalance.Error('Не удалось найти форму для авторизации');
			}
	        
			params = AB.createFormParams(form);
		    
			html = AnyBalance.requestPost(baseurl + '!iSOU.Authentication', params, addHeaders({Referer: AnyBalance.getLastUrl()}));
			getFineSum.authorized = true;
		}

		html = AnyBalance.requestPost(baseurl + '!iSOU.PaymentPrepare', {
			service_no:	'391141',
			ParamCount: '',
			Amount: '',
			AmountCurr: '',	
			ServiceInfoId: '',	
			ExtraInfoText:	'0B0C01D4EEF2EEF4E8EAF1E0F6E8FF20F1EAEEF0EEF1F2E8',
		}, addHeaders({Referer: baseurl + '!iSOU.ServiceTree'}));
	    
		form = getElement(html, /<form[^>]+id="frm"/i);
		if(!form){
			AnyBalance.trace(html);
			throw new AnyBalance.Error('Не удалось найти форму для запроса суммы штрафа');
		}
	    
		params = AB.createFormParams(form, function(params, str, name, value) {
			if (name == 'param2')
				return num;
	    
			return value;
		});
	    
		html = AnyBalance.requestPost(baseurl + '!iSOU.PaymentPrepare', params, addHeaders({Referer: baseurl + '!iSOU.PaymentPrepare'}), {
			options: {
				REQUEST_CHARSET: 'windows-1251',
			}
		});
	    
		return getParam(html, /<input[^>]+name="Amount"[^>]+value="([^"]*)/i, replaceHtmlEntities, parseBalance);
	}catch(e){
       	AnyBalance.trace('Не удалось получить сумму штрафа: ' + e.message + '\n' + e.stack);
       	return;
	}
}
