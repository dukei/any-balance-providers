/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Юникредит

Сайт оператора: http://www.unicreditbank.ru/rus/index.wbp
Личный кабинет: https://enter.unicredit.ru/
*/

function parseStatus(str){
    return getParam(str, null, null, /^([^\(]*)/, replaceTagsAndSpaces);
}


function main(){
    var prefs = AnyBalance.getPreferences();
    processUnicredit();
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

function processUnicredit(){
    var prefs = AnyBalance.getPreferences();

    AnyBalance.setOptions({PER_DOMAIN: {'enter.unicredit.ru': {SSL_ENABLED_CIPHER_SUITES_ADD: ['SSL_RSA_WITH_3DES_EDE_CBC_SHA']}}});

    var baseurl = prefs.login != 'demo' ? "https://enter.unicredit.ru/v2/cgi/bsi.dll?" : "http://demo.enter.unicredit.ru/v2/cgi/bsi.dll?";
    
    var html = AnyBalance.requestGet(baseurl + 'T=RT_2Auth.BF');
    var mapId = getParam(html, null, null, /<input[^>]*id="MapID"[^>]*value="([^"]*)"/i);
    var map = getParam(html, null, null, /<input[^>]*id="Map"[^>]*value="([^"]*)"/i);
    var pass = encryptPass(prefs.password, map);

    var headers = {
        'Accept-Language': 'ru, en',
        BSSHTTPRequest:1,
        Referer: baseurl + 'T=RT_2Auth.BF',
        Origin: baseurl + 'T=RT_2Auth.BF&Log=1&L=RUSSIAN',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
    }

    html = AnyBalance.requestPost(baseurl, {
        tic: 0,
        T:'RT_2Auth.CL',
        A:prefs.login,
        B:pass,
        L:'RUSSIAN',
        IdCaptcha:'',
        C:'',
        MapID:mapId || '',
        BROWSER:'Crome',
        BROWSERVER: '21.0.1180.60'
    }, headers);

    var error = getParam(html, null, null, /<BSS_ERROR>\d*\|?([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error)
        throw new AnyBalance.Error(error);

    var jsonInfo = getParam(html, null, null, /ClientInfo=(\{[\s\S]*?\})\s*(?:<\/div>|$)/i);
    if(!jsonInfo)
        throw new AnyBalance.Error("Не удалось найти информацию о сессии в ответе банка.");

    jsonInfo = JSON.parse(jsonInfo);

    if(prefs.type == 'card')
        fetchCard(jsonInfo, headers, baseurl);
    else if(prefs.type == 'acc')
        fetchAccount(jsonInfo, headers, baseurl);
    else if(prefs.type == 'crd')
        fetchCredit(jsonInfo, headers, baseurl);
    else if(prefs.type == 'dep')
        fetchDeposit(jsonInfo, headers, baseurl);
    else
        fetchCard(jsonInfo, headers, baseurl); //По умолчанию карты будем получать
}

function fetchCard(jsonInfo, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'CARDSLIST',
        XACTION:''
    }, headers);

    var error = getParam(html, null, null, /<REDIRECT>[\s\S]*?'(NO)CARDS'/i);
    if(error)
        throw new AnyBalance.Error('У вас нет ни одной карты');

    var cardid = getParam(html, null, null, /<REDIRECT>[\s\S]*?CardID=(\d+)/i);
    if(!cardid){
        var cardtpl = prefs.cardnum ? '******' + prefs.cardnum : '';
	var cardHtmls = sumParam(html, null, null, /<table(?:[\s\S](?!<\/table>))*?CardID=\d+[\s\S]*?<\/table>/ig);
	for(var i=0; i<cardHtmls.length; ++i){
		if(!cardtpl || cardHtmls[i].indexOf(cardtpl) >= 0){
			cardid = getParam(cardHtmls[i], null, null, /CardID=(\d+)/i);
			break;
		}
	}

	if(!cardid)
            throw new AnyBalance.Error('Не удаётся найти ' + (cardtpl ? 'карту с последними цифрами ' + cardtpl : 'ни одной карты'));
    }

    html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'CARD',
        XACTION:'',
        CardID:cardid
    }, headers);

    var result = {success: true};
    getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseStatus);
    getParam(html, result, 'statustill', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'balance', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Баланс:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'cardnum', /Номер карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Номер карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'accnum', /Счет карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'type', /Тип карты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'fio', /Держатель:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'cardname', /Имя на карте:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'credit', /Кредитный лимит:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    AnyBalance.setResult(result);
}

function fetchAccount(jsonInfo, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите начало номера счета или не вводите ничего, чтобы показать информацию по первому счету");

    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'ACCOUNTSLIST',
        XACTION:''
    }, headers);

    var error = getParam(html, null, null, /<REDIRECT>[\s\S]*?'(NO)ACCOUNTS'/i);
    if(error)
        throw new AnyBalance.Error('У вас нет ни одного счета');

    var result = {success: true};

    var accid = getParam(html, null, null, /<REDIRECT>[\s\S]*?AccID=(\d+)/i);
    if(!accid){
        var tpl = prefs.cardnum ? prefs.cardnum : '';
        var $html = $(html);
        
        var $acc = $html.find('div.div-cards:has(span[onclick*="AccID=' + (tpl || '') + '"])').first();
        if(!$acc.size())
            throw new AnyBalance.Error('Не удаётся найти ' + (tpl ? 'счет №' + tpl : 'ни одного счета'));
        
//        accid = getParam(html, null, null, /AccID=(\d+)/i, replaceTagsAndSpaces);

        html = $acc.html();
        
        getParam(html, result, 'balance', /<td[^>]+class="div-b"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'currency', /<td[^>]+class="div-b"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        getParam(html, result, 'type', /<div[^>]+class="div-b"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(html, result, 'accnum', /AccID=(\d+)/i, replaceTagsAndSpaces);
        getParam(html, result, '__tariff', /AccID=(\d+)/i, replaceTagsAndSpaces);
    }else{
        html = AnyBalance.requestPost(baseurl, {
            SID:jsonInfo.SID,
            tic:1,
            T:'RT_2IC.form',
            nvgt:1,
            SCHEMENAME:'ACCOUNT',
            XACTION:'',
            AccID:accid
        }, headers);

        getParam(html, result, 'balance', /<td[^>]*class="div-b"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'currency', /<td[^>]*class="div-b"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        getParam(html, result, 'type', /<div[^>]*class="div-b"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        getParam(html, result, 'accnum', /Номер счета:([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, '__tariff', /Номер счета:([^<]*)/i, replaceTagsAndSpaces);
    }

    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}

function fetchCredit(jsonInfo, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^[0-9A-Z]{4,}$/i.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите номер кредитной сделки (её можно найти в информации о кредите в интернет-банке) или не вводите ничего, чтобы показать информацию по первому кредиту");

    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'CREDITSLIST',
        XACTION:''
    }, headers);

    var error = getParam(html, null, null, /<REDIRECT>[\s\S]*?'(NO)CREDITS'/i);
    if(error)
        throw new AnyBalance.Error('У вас нет ни одного кредита');

    var crdid = getParam(html, null, null, /<REDIRECT>[\s\S]*?CrdID=([0-9A-Z]+)/i);
    if(!crdid){
        var tpl = prefs.cardnum ? prefs.cardnum.toUpperCase() : '';
        var $html = $(html);
        
        var $crd = $html.find('div.div-b:has(span[onclick*="CrdID=' + (tpl || '') + '"])').first();
        if(!$crd.size())
            throw new AnyBalance.Error('Не удаётся найти ' + (tpl ? 'кредитную сделку №' + tpl : 'ни одного кредита'));
        
        crdid = getParam($crd.html(), null, null, /CrdID=([0-9A-Z]+)/i);
        if(!crdid)
            throw new AnyBalance.Error('Не удаётся найти номер кредитной сделки. Интернет-банк изменился?');
    }

    html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'CREDIT',
        XACTION:'',
        CrdID:crdid
    }, headers);

    var result = {success: true};
    getParam(html, result, 'type', /<h2>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<h2>([\s\S]*?)<\/h2>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Осталось выплатить:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Осталось выплатить:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'credit', /Сумма кредита:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'paynum', /Осталось выплат:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'pay', /Ближайший плат[ёe]ж:[\s\S]*?<td[^>]*>([^<]*)\s+до\s+/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'paytill', /Ближайший плат[ёe]ж:[\s\S]*?<td[^>]*>[^<]*\s+до\s+([^<]*)/i, replaceTagsAndSpaces, parseDate);
    getParam(html, result, 'pct', /Проценты:[\s\S]*?<td[^>]*>[^<]*\s+до\s+([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'period', /Срок кредита:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(crdid, result, 'accnum', /(.*)/i);

    AnyBalance.setResult(result);
}

function fetchDeposit(jsonInfo, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^[0-9A-Z]{4,}$/i.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите номер сделки для вклада (её можно найти в информации о вкладе в интернет-банке) или не вводите ничего, чтобы показать информацию по первому вкладу");

    var html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'DEPOSITSLIST',
        XACTION:''
    }, headers);

    var error = getParam(html, null, null, /<REDIRECT>[\s\S]*?'(NO)DEPOSITS'/i);
    if(error)
        throw new AnyBalance.Error('У вас нет ни одного вклада');

    var depid = getParam(html, null, null, /<REDIRECT>[\s\S]*?DepID=([0-9A-Z]+)/i);
    if(!depid){
        var tpl = prefs.cardnum ? prefs.cardnum.toUpperCase() : '';
        var $html = $(html);
        
        var $dep = $html.find('div.div-b:has(span[onclick*="DepID=' + (tpl || '') + '"])').first();
        if(!$dep.size())
            throw new AnyBalance.Error('Не удаётся найти ' + (tpl ? 'сделку вклада №' + tpl : 'ни одного вклада'));
        
        depid = getParam($dep.html(), null, null, /DepID=([0-9A-Z]+)/i);
        if(!depid)
            throw new AnyBalance.Error('Не удаётся найти номер сделки для вклада. Интернет-банк изменился?');
    }

    html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'DEPOSIT',
        XACTION:'',
        DepID:depid
    }, headers);

    var result = {success: true};
    getParam(html, result, 'type', /<h1>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /<h1>([\s\S]*?)<\/h1>/i, replaceTagsAndSpaces);
    getParam(html, result, 'balance', /Текущая сумма вклада[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'currency', /Текущая сумма вклада[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'pct', /Проценты:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'period', /Срок вклада:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(depid, result, 'accnum', /(.*)/i);
    getParam(html, result, 'status', /Статус:[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);

    AnyBalance.setResult(result);
}
