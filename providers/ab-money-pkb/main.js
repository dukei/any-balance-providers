/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Петрокоммерц

Сайт оператора: http://www.pkb.ru/
Личный кабинет: https://www.pkb24.ru
*/

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

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://www.pkb24.ru/v1/cgi/bsi.dll?";
    
    var html = AnyBalance.requestGet(baseurl + 'T=RT_2Auth.BF');
    var mapId = getParam(html, null, null, /<input[^>]*name="MapID"[^>]*value="([^"]*)"/i);
    var map = getParam(html, null, null, /var\s+PassTemplate\s*=\s*new\s+Array\s*\(([^\)]*)/i);
    var pass = encryptPass(prefs.password, map);

    var headers = {
        'Accept-Language': 'ru, en',
        BSSHTTPRequest:1,
        Referer: baseurl + 'T=RT_2Auth.BF',
        Origin: 'https://www.pkb24.ru',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
    }

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
    }, headers);

    var error = getParam(html, null, null, /<BSS_ERROR>\d*\|?([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var jsonInfo = getParam(html, null, null, /ClientInfo=(\{[\s\S]*?\})\s*(?:<\/div>|$)/i);
    if(!jsonInfo)
        throw new AnyBalance.Error("Не удалось найти информацию о сессии в ответе банка.");

    jsonInfo = JSON.parse(jsonInfo);
/*
    html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.sc',
        nvgt:1,
        SCHEMENAME:'AUTHORIZATION_SMS',
        check: 1,
        FILTERIDENT:'URGENT'
    }, headers);
*/
    html = AnyBalance.requestPost(baseurl, {
        SID:jsonInfo.SID,
        tic:1,
        T:'RT_2IC.form',
        nvgt:1,
        SCHEMENAME:'COMMPAGE',
        XACTION:''
    }, headers);


    if(prefs.type == 'card')
        fetchCard(jsonInfo, html, headers, baseurl);
    else if(prefs.type == 'acc')
        fetchAccount(jsonInfo, html, headers, baseurl);
    else
        fetchCard(jsonInfo, html, headers, baseurl); //По умолчанию карты будем получать

}

function fetchCard(jsonInfo, html, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

    var table = getParam(html, null, null, /<h2[^>]*>\s*Ваши карты\s*<\/H2>\s*<TABLE[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if(!table){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('У вас нет ни одной карты');
    }

    var re = new RegExp('<td[^>]*>(\\d{4}\\s*[\\d\\*]{4}\\s*\\*{4}\\s*' + (prefs.cardnum ? prefs.cardnum : '\\d{4}') + ')<\\/td>', 'i');

    var tr;
    table.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/ig, function(str, str1){
        if(tr)
            return str;
        if(re.test(str1))
            tr = str1;
        return str;
    });

    if(!tr){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));
    }

    var result = {success: true};
    getParam(tr, result, 'cardnum', re, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}

function fetchAccount(jsonInfo, html, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите начало номера счета или не вводите ничего, чтобы показать информацию по первому счету");
                                                                                                                                
    var table = getParam(html, null, null, /<h2[^>]*>\s*Ваши счета\s*<\/H2>[\S\s]*?<TABLE[\s\S]*?<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
    if(!table){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('У вас нет ни одного счета');
    }

    var re = new RegExp('<td[^>]*name="account"[^>]*>\\s*(' + (prefs.cardnum ? prefs.cardnum : '\\d{20}') + '\\d*)', 'i');

    var tr;
    table.replace(/<tr[^>]*>([\s\S]*?)<\/tr>/ig, function(str, str1){
        if(tr)
            return str;
        if(re.test(str1))
            tr = str1;
        return str;
    });

    if(!tr){
    	AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с первыми цифрами ' + prefs.cardnum : 'ни одного счета'));
    }

    var result = {success: true};
    getParam(tr, result, 'cardnum', re, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'type', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(jsonInfo.USR, result, 'fio', /(.*)/i, replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}
