/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт и счетов Росгосстрах

Сайт оператора: http://www.rgsbank.ru
Личный кабинет: https://online.rgsbank.ru
*/

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    if(matches){
          var date = new Date(+matches[3], matches[2]-1, +matches[1]);
	  var time = date.getTime();
          AnyBalance.trace('Parsing date ' + date + ' from value: ' + str);
          return time;
    }
    AnyBalance.trace('Failed to parse date from value: ' + str);
}

function parseStatus(str){
    return getParam(str, null, null, /^([^\(]*)/, replaceTagsAndSpaces);
}

function sleep(delay) {
   if(AnyBalance.getLevel() < 6){
      var startTime = new Date();
      var endTime = null;
      do {
          endTime = new Date();
      } while (endTime.getTime() - startTime.getTime() < delay);
   }else{
      AnyBalance.sleep(delay);
   }
} 

function encryptPass(pass, map){
	if(map){
		var ch='',i=0,k=0,TempPass='',PassTemplate=map.split(','), Pass='';
		TempPass=pass;
		while(TempPass!=''){
			ch=TempPass.substr(0, 1);
			k = ch.charCodeAt(0);
			if(k>0xFF) k-=0x350;
			if(k==7622) k=185;
			TempPass=TempPass.length>1?TempPass.substr(1, TempPass.length):'';
			if(Pass!='')Pass=Pass+';';
			Pass=Pass+PassTemplate[k];
		}
                return Pass;
	}else{
		return pass;
	}

}

var g_headers = {
    'Accept-Language': 'ru, en',
    BSSHTTPRequest:1,
//    Referer: 'https://www.open24.kz/v1/cgi/bsi.dll?T=RT_2Auth.BF&L=RUSSIAN&color=blue',
//    Origin: 'https://www.open24.kz',,
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://online.rgsbank.ru/v1/cgi/bsi.dll?";
    
    var html = AnyBalance.requestGet(baseurl + 'T=RT_2Auth.BF');
    var mapId = getParam(html, null, null, /<input[^>]*name="MapID"[^>]*value="([^"]*)"/i);
    var map = getParam(html, null, null, /var\s+PassTemplate\s*=\s*new\s+Array\s*\(([^\)]*)/i);
    var pass = encryptPass(prefs.password, map);

    html = AnyBalance.requestPost(baseurl, {
        tic: 0,
        T:'RT_2Auth.CL',
        A:prefs.login,
        B:pass,
        L:'russian',
        C:'',
        IdCaptcha:'',
        IMode:'',
        sTypeInterface:'default',
        MapID:mapId || ''
    }, g_headers);

    var error = getParam(html, null, null, /<BSS_ERROR>\d*\|?([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var jsonInfo = getParam(html, null, null, /ClientInfo=(\{[\s\S]*?\})\s*(?:<\/div>|$)/i);
    if(!jsonInfo)
        throw new AnyBalance.Error("Не удалось найти информацию о сессии в ответе банка.");

    jsonInfo = JSON.parse(jsonInfo);

    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'rt_0clientupdaterest.doheavyupd'
    }, g_headers);

    var i=0;
    do{
        AnyBalance.trace('Ожидание обновления данных: ' + (i+1));
        html = AnyBalance.requestPost(baseurl, {
            SID:jsonInfo.SID,
            tic:1,
            T:'rt_0clientupdaterest.CheckForAcyncProcess'
        }, g_headers);
        var opres = getParam(html, null, null, /^\s*(?:<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>)?\d+\s*$/i, replaceTagsAndSpaces, html_entity_decode);
        if(opres){
            AnyBalance.trace('Обновление данных закончено. ' + opres);
            break; //Всё готово, надо получать баланс
        }
        if(++i > 10){  //На всякий случай не делаем больше 10 попыток
            AnyBalance.trace('Не удалось за 10 попыток обновить баланс, получаем старое значение...');
            break;
        }
        sleep(3000);
    }while(true);

/*
    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'COMMPAGE',
        XACTION:''
    }, g_headers);
*/
    if (prefs.type == 'card') {
        fetchCard(jsonInfo, baseurl);
	} else if(prefs.type == 'acc') {
        fetchAccount(jsonInfo, baseurl);
	} else if(prefs.type == 'dep') {
        fetchDeposit(jsonInfo, baseurl);
	} else if(prefs.type == 'credit') {
        fetchCredit(jsonInfo, baseurl);
	} else {
        fetchCard(jsonInfo, baseurl); //По умолчанию карты будем получать
	}
}

function fetchCard(jsonInfo, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.ShowMultiSchemePage',
        nvgt:1,
        SCHEMENAME:'CARDS'
    }, g_headers);

    var cardnum = prefs.cardnum ? prefs.cardnum : '\\d{4}';
    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<tr))*\\d+\\s+\\d+\\*+\\s+\\*+\\s+' + cardnum + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));

    var result = {success: true};
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'status', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('minpay', 'minpaytill', 'debt', 'accnum', 'till', 'pct')){
        var id = getParam(tr, null, null, /show_paymentdetails\s*\([^)]*'([^']*)'\s*\)/);
        if(!id){
            AnyBalance.trace('Не удаётся найти ID карты для получения расширенной информации.');
        }else{
            
            html = AnyBalance.requestPost(baseurl, {
                SID:jsonInfo.SID,
                tic:1,
                T:'RT_2IC.view',
                SCHEMENAME:'CARDS',
                IDR:id,
                FORMACTION:'VIEW'
            }, g_headers);

            getParam(html, result, 'minpay', /Всего к погашению в очередной платеж(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'minpaytill', /Срок очередного платежа(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'debt', /Задолженность по кредиту(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'accnum', /Счет карты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
            getParam(html, result, 'till', /Срок действия(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'pct', /Процентная ставка(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }
    }
    AnyBalance.setResult(result);
}

function fetchAccount(jsonInfo, baseurl) {
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите от четырех последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету");
                                                                                                                                
    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'STM',
        XACTION: 'NEW'
    }, g_headers);

    var cardnum = prefs.cardnum ? prefs.cardnum : '\\d{4,}';
    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<tr))*<input[^>]*STM="[^"]*' + cardnum + '["|][\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с последними цифрами ' + prefs.cardnum : 'ни одного счета'));

    var result = {success: true};
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}

function fetchDeposit(jsonInfo, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите от четырех последних цифр номера счета депозита или не вводите ничего, чтобы показать информацию по первому депозиту");

    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.SC',
        nvgt:1,
        SCHEMENAME:'DEPOSITS',
        FILTERIDENT:''
    }, g_headers);

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.cardnum || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<tr))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accprefix > 0 ? 'депозит с последними цифрами ' + prefs.cardnum : 'ни одного депозита'));

    var result = {success: true};
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'pct', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('pcts')){
        var id = getParam(tr, null, null, /SIDR="([^"]*)/i);
        if(!id){
            AnyBalance.trace('Не удаётся найти ID депозита для получения расширенной информации.');
        }else{
            
            html = AnyBalance.requestPost(baseurl, {
                SID:jsonInfo.SID,
                tic:1,
                T:'RT_2IC.view',
                SCHEMENAME:'DEPOSITS',
                IDR:id,
                FORMACTION:'VIEW'
            }, g_headers);

            getParam(html, result, 'pcts', /Начисленные проценты(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }
    }
    AnyBalance.setResult(result);
}

function fetchCredit(jsonInfo, baseurl){
    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.SC',
        nvgt:1,
        SCHEMENAME:'CREDITS',
        FILTERIDENT:''
    }, g_headers);


	var id = getParam(html, null, null, /SIDR="([^"]*)/i);
	if(!id) {
		throw new AnyBalance.Error('Не удаётся найти ни одного кредита!');
	}

    html = AnyBalance.requestPost(baseurl, {
            SID:jsonInfo.SID,
            tic:1,
            T:'RT_2IC.view',
            SCHEMENAME:'CREDITS',
            IDR:id,
            FORMACTION:'VIEW'
        }, g_headers);

    var result = {success: true};

    getParam(html, result, 'balance', /Общая задолженность(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'summ', /Сумма договора(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'minpay', /Всего к погашению в очередной платеж(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pct', /Процентная ставка(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accnum', /Счет для погашения кредита(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces);
    getParam(html, result, 'pcts', /Сумма начисленных процентов\s*<(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'type', /Тип кредита(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces);
    getParam(html, result, 'minpaytill', /Срок очередного платежа(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, '__tariff', /Счет для погашения кредита(?:[\s\S]*?<TD[^>]*>){1}([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function html_entity_decode(str) {
    //jd-tech.net
    var tarea=document.createElement('textarea');
    tarea.innerHTML = str;
    return tarea.value;
}

