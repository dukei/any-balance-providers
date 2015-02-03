/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function sleep(delay) {
   AnyBalance.trace('Sleeping ' + delay + ' ms');
   if(AnyBalance.getLevel() < 6){
      var startTime = new Date();
      var endTime = null;
      do {
          endTime = new Date();
      } while (endTime.getTime() - startTime.getTime() < delay);
   }else{
      AnyBalance.trace('Calling hw sleep');
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
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://retail.myskb.ru/v2/cgi/bsi.dll?';
    
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
        }, addHeaders({Referer: baseurl+'T=RT_2Auth.BF'}));

        var opres = getParam(html, null, null, /^\s*(?:<BSS_ERROR>([\s\S]*?)<\/BSS_ERROR>)?([\s\S]*>)?\d+\s*$/i, replaceTagsAndSpaces, html_entity_decode);
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
	
    if(prefs.type == 'card')
        fetchCard(jsonInfo, baseurl);
    else if(prefs.type == 'acc')
        fetchAccount(jsonInfo, baseurl);
    
	/*else if(prefs.type == 'dep')
        fetchDeposit(jsonInfo, baseurl);
    else if(prefs.type == 'cred')
        fetchCredit(jsonInfo, baseurl);		*/
	
    else
        fetchCard(jsonInfo, baseurl); //По умолчанию карты будем получать
}

function fetchCard(jsonInfo, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");
	
	var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
		nvgt:1,
		XACTION:'',
		SCHEMENAME:'COMMPAGE'
    }, g_headers);
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /<H1>([\s\S]*?),<\/H1>/i, null);
	getParam(html, result, ['currency', 'balance'], /Обновление остатка по карточке[\s\S]*?обновить[\s\S]*?<TD>([\s\S]*?)<\/TD>/i, replaceTagsAndSpaces);
	
	var cardnum = prefs.cardnum ? prefs.cardnum : '\\d{4}';
	
	var re = new RegExp('(>[^<]*' + cardnum + '</TD>[^>]*"CARDUPDATE"(?:[^>]*>){6})', 'i');
	
	var card = getParam(html, null, null, re, null);
	if(!card)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));
	
	var result = {success: true};
	
    getParam(card, result, 'accnum', /(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
    getParam(card, result, '__tariff', /(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
	getParam(card, result, 'balance', /(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(card, result, ['currency', 'balance'], /(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces);
	getParam(card, result, 'type', /(?:[^>]*>){7}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}

function fetchAccount(jsonInfo, baseurl){
    var prefs = AnyBalance.getPreferences();
   
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите от четырех последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету");

	var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
		nvgt:1,
		XACTION:'',
		SCHEMENAME:'COMMPAGE'
    }, g_headers);

	var cardnum = prefs.cardnum ? prefs.cardnum : '\\d{4}';
	
	var re = new RegExp('(ID=\\"account\\"[^>]*>[^<]*' + cardnum + '(?:[^>]*>){9})', 'i');
	
	var account = getParam(html, null, null, re);
	if(!account)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с последними цифрами ' + prefs.cardnum : 'ни одного счета!'));

	var result = {success: true};
	
    getParam(account, result, 'accnum', /(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
    getParam(account, result, '__tariff', /(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces);
	getParam(account, result, 'balance', /(?:[^>]*>){3}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(account, result, ['currency', 'balance'], /(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces);
	getParam(account, result, 'type', /(?:[^>]*>){7}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}

function fetchDeposit(jsonInfo, baseurl){
	throw new AnyBalance.Error("Получение информации по депозитам пока не поддерживается. Обращайтесь к автору провайдера.");
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
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'pct', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
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
	throw new AnyBalance.Error("Получение информации по кредитам пока не поддерживается. Обращайтесь к автору провайдера.");

    var prefs = AnyBalance.getPreferences();
    var html = AnyBalance.requestPost(baseurl, {
		LASTREQUESTURL:'T=RT_2IC.SC,nvgt=1,SCHEMENAME=CREDITS,FILTERIDENT=',
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.SC',
        nvgt:1,
        SCHEMENAME:'CREDITS',
        FILTERIDENT:''
    }, addHeaders({Referer: baseurl}));
	var result = {success: true};
	// Теперь соберем данные о кредитах
	var firstIDR = '';
	var found = /SIDR="([\s\S]*?)">([\s\S]*?)<\//.exec(html);
	var Details = '';
	while(found)
	{
		if(firstIDR == '')
			firstIDR = found[1];
		// Нашли совпадение, занесем в сводку
		Details = Details+'ID: ' + found[1] + ' Имя: ' + found[2] + '\n';
		// продолжим поиск
		html = html.replace(/SIDR="([\s\S]*?)">([\s\S]*?)<\//, '');
		found = /SIDR="([\s\S]*?)">([\s\S]*?)<\//.exec(html);
	}
	getParam(Details, result, 'all', null, null);

	// Теперь запросим инфу по конкретному кредиту
	var idr = prefs.cardnum ? prefs.cardnum : firstIDR;
	if(idr == '')
		throw new AnyBalance.Error('Не удаётся найти ID кредита');
	AnyBalance.trace('idr is set to '+idr);
	html = AnyBalance.requestPost(baseurl, {
		FILTERIDENT:'',
		IDR:idr,
		IDR:idr,
		SCHEMENAME:'CREDITS',
		SID:jsonInfo.SID,
		T:'RT_2IC.view',
		XACTION:'VIEW',
		nvgt:1,
		tic:1,
    }, g_headers);
	// Мы в расширенной инфе по кредиту
	getParam(html, result, ['limit', 'currency'], /Лимит кредита[\s\S]*?">([\s\S]*?)\(([\s\S]{1,5}),/i, null, parseBalance);
	getParam(html, result, 'debt', /Сумма задолженности по основному долгу[\s\S]*?>([\s\S]*?)<\/td>/i, null, parseBalance);
	getParam(html, result, 'minpay', /Всего к погашению в очередной платеж[\s\S]*?>([\s\S]*?)<\/td>/i, null, parseBalance);
	getParam(html, result, 'minpaytill', /Срок очередного платежа[\s\S]*?>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
	getParam(html, result, 'pcts', /Сумма начисленных процентов[\s\S]*?>([\s\S]*?)<\/td>/i, null, parseBalance);
	getParam(html, result, 'type', /Тип кредита[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'accnum', /Номер договора[\s\S]*?<td>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	getParam(html, result, 'pct', /Процентная ставка[\s\S]*?>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'till', /Срок погашения[\s\S]*?>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}