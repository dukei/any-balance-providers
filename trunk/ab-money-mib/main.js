/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

function xorString(str, val) {
	if (!str || !val) {
		return '';
	}
	var res = '';
	for (var i = 0; i < str.length; i++) {
		res += String.fromCharCode(str.charCodeAt(i) ^ val);
	}
	return res;
}

function encodePan(prefix, val) {
	if (prefix && prefix.length > val.length) {
		val = prefix.substring(0, prefix.length - val.length) + val;
	}
	return val;
}

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://telebank.minbank.ru/';
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl, g_headers);
    var sessionKey = getParam(html, null, null, /var\s+sessionKey\s*=\s*'([^']*)/);
    if(!sessionKey)
        throw new AnyBalance.Error('Не удаётся найти ключ сессии. Сайт изменен?');

    var sessionParams = {
        cookiesDisabled: 0,
        sessionKey: sessionKey
    };

    html = AnyBalance.requestPost(baseurl + 'getModule.jsp?name=Logon', joinObjects({a: 'content'}, sessionParams), g_headers);

    var xorKey = getParam(html, null, null, /value:xorString[^;]*'(\d+)'/);
    if(!xorKey)
        throw new AnyBalance.Error('Не удаётся найти ключ шифрования пароля. Сайт изменен?');
    var prefix = getParam(html, null, null, /var\s+prefix\s*=\s*'(\d+)'/);
    if(!prefix)
        throw new AnyBalance.Error('Не удаётся найти ключ шифрования логина. Сайт изменен?');
    
    if(prefs.loginType != 'nick'){
        //Вход по ид пользователя
        html = AnyBalance.requestPost(baseurl + 'exec.jsp?c=GetPANRq&InterProList=AuthMode;PAN;PIN;cookiesDisabled;FormMustBeSigned;', {
            AuthMode:'TBId',
            PAN:encodePan(prefix, prefs.login),
            PIN:xorString((prefs.password || '').substr(0, 6), xorKey),
            cookiesDisabled:0,
            FormMustBeSigned:'',
            sessionKey:sessionKey
        }, g_headers);
    }else{
        //Вход по текстовому псевдониму
        html = AnyBalance.requestPost(baseurl + 'exec.jsp?c=GetPANRq&InterProList=AuthMode;TextLogin;PIN;cookiesDisabled;FormMustBeSigned;', {
            AuthMode:'TextLogin',
            TextLogin:prefs.login,
            PIN:xorString((prefs.password || '').substr(0, 6), xorKey),
            cookiesDisabled:0,
            FormMustBeSigned:'',
            sessionKey:sessionKey
        }, g_headers);
    }
    
    var json = getJson(html);
	
    if(!json.GetPANRp || !json.GetPANRp.Response){
        if(json.Fault)
            throw new AnyBalance.Error(json.Fault.Explanation);
        AnyBalance.trace('Can not enter the bank (1): ' + html);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + 'exec.jsp?c=LogonRq', sessionParams, g_headers);
    var json = getJson(html);

	// Может нужен код из смс?
	var code;
	if(json.Fault && json.Fault.Code.Value == 18) {
		var transactionId = json.Fault.Detail.TranId;
		
		html = AnyBalance.requestPost(baseurl + 'getModule.jsp?name=DynamicAuth', {
            a:'CountExtended',
            cookiesDisabled:0,
            sessionKey:sessionKey
        }, g_headers);
		
		
		var Address = getParam(html, null, null, /value="([^"]+)[^<]+id="address"/i, replaceTagsAndSpaces);
		var Masked = getParam(html, null, null, /id="masked"[^>]*value="([^"]+)/i, replaceTagsAndSpaces);
		
		html = AnyBalance.requestPost(baseurl + 'getModule.jsp?name=DynamicAuth', {
			'a':'Password',
			'PrevTranId':transactionId,
			'GenerateDynPasswordRq___Address':Address,
			'GenerateDynPasswordRq___Channel':'MINB_SMS',
			'Masked':Masked,
            'cookiesDisabled':0,
            'sessionKey':sessionKey
        }, g_headers);
		
		if(AnyBalance.getLevel() >= 7) {
			AnyBalance.trace('Пытаемся ввести код из смс...');
			code = AnyBalance.retrieveCode("Пожалуйста, введите код из смс", 'R0lGODlhBAAEAJEAAAAAAP///////wAAACH5BAEAAAIALAAAAAAEAAQAAAIElI8pBQA7');
			AnyBalance.trace('Код получен: ' + code);
		} else {
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
		
		html = AnyBalance.requestPost(baseurl + 'exec.jsp?c=LogonRq', joinObjects({
			DynamicPassword: code,
			PrevTranId:transactionId
		}, sessionParams), g_headers);
		
		json = getJson(html);
	}
	
    if(!json.LogonRp || !json.LogonRp.Response || !json.LogonRp.Response.ApprovalCode){
        if(json.Fault)
            throw new AnyBalance.Error(json.Fault.Explanation);
        AnyBalance.trace('Can not enter the bank (2): ' + html);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    if(prefs.type == 'crd')
        fetchCredit(baseurl, sessionParams);
    else if(prefs.type == 'acc')
        fetchAccount(baseurl, sessionParams);
    else if(prefs.type == 'card')
        fetchCard(baseurl, sessionParams);
    else if(prefs.type == 'dep')
        fetchDeposit(baseurl, sessionParams);
    else
        fetchCard(baseurl, sessionParams); //По умолчанию карта
}

function fetchCard(baseurl, sessionParams){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите 4 последних цифры номера карты, по которой вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первой карте.');

    var html = AnyBalance.requestPost(baseurl + 'getModule.jsp?name=CardsHome', sessionParams, g_headers);

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*\\d{6}\\*{3,6}' + (prefs.contract ? prefs.contract : '\\d{4}') + '[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'карту с последними цифрами ' + prefs.contract : 'ни одной карты'));
    
    var result = {success: true};
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'cardname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var pan = getParam(tr, null, null, /panmbr="([^"\-]*)/i, null, html_entity_decode);
    var mbr = getParam(tr, null, null, /panmbr="[^"]*-([^"]*)/i, null, html_entity_decode);
   
    if(AnyBalance.isAvailable('balance','currency','net_balance','owner','status', 'accnum', 'accname', 'limit', 'reserved')){
        html = AnyBalance.requestPost(baseurl + 'getModule.jsp?name=CardInfo', joinObjects({PAN:pan, MBR:mbr}, sessionParams), g_headers);

        getParam(html, result, 'balance', /Доступный баланс основного счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'currency', /Доступный баланс основного счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
        getParam(html, result, 'net_balance', /Общий баланс основного счета[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        getParam(html, result, 'owner', /Владелец[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(html, result, 'status', /Статус[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|Изменить)/i, replaceTagsAndSpaces, html_entity_decode);
        var acc = getParam(html, result, 'accnum', /Основной счет[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(acc, result, 'accnum', /([\s\S]*?)(?:\(|$)/i, replaceTagsAndSpaces, html_entity_decode);
        getParam(acc, result, 'accname', /\(([\s\S]*?)(?:$|\))/i, replaceTagsAndSpaces, html_entity_decode);

        if(AnyBalance.isAvailable('limit', 'reserved')){
            var accid = getParam(html, null, null, /goToAcct\s*\(\s*'([^']*)/i);
            if(accid){
                html = AnyBalance.requestPost(baseurl + 'getModule.jsp?name=AcctInfo', joinObjects({a: 'AddInfo', Acct:accid}, sessionParams), g_headers);
                
                getParam(html, result, 'limit', /<td[^>]*>\s*Кредитный лимит\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
                getParam(html, result, 'reserved', /<td[^>]*>\s*Зарезервировано для будущих расчетов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            }else{
                AnyBalance.trace('Не удалось найти идентификатор связанного с картой счета');
            }
        }

    }


    AnyBalance.setResult(result);
                                            
}

function fetchAccount(baseurl, sessionParams){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');

    var html = AnyBalance.requestPost(baseurl + 'getModule.jsp?name=AcctsHome', sessionParams, g_headers);

    //Сколько цифр осталось, чтобы дополнить до 20
    var accnum = prefs.contract || '';
    var accprefix = accnum.length;
    accprefix = 20 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '\\s*<[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'счет с последними цифрами ' + prefs.contract : 'ни одного счета'));
    
    var result = {success: true};

    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('net_balance', 'limit', 'reserved', 'status', 'cardnum', 'cardname')){
        var id = getParam(tr, null, null, /<td[^>]+acct="([^\-"]*)/i);
        if(id){
            html = AnyBalance.requestPost(baseurl + 'getModule.jsp?name=AcctInfo', joinObjects({/*a: 'AddInfo',*/ Acct:id}, sessionParams), g_headers);
            
            getParam(html, result, 'net_balance', /<td[^>]*>\s*Общий баланс[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'limit', /<td[^>]*>\s*Кредитный лимит\s*<[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'reserved', /<td[^>]*>\s*Зарезервировано для будущих расчетов[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'status', /<td[^>]*>\s*Статус[\s\S]*?<td[^>]*>([\s\S]*?)(?:<\/td>|Изменить)/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'cardnum', /<td[^>]+crdCardHomeLeftB[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(html, result, 'cardname', /<td[^>]+crdCardHomeLeftB[^>]*>(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }else{
             AnyBalance.trace('Не удалось найти идентификатор счета');
        }
    }

    AnyBalance.setResult(result);
    
}

function fetchDeposit(baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.contract && !/^\d{4,20}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 4 последних цифр номера счета вклада, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому вкладу.');

    throw new AnyBalance.Error('Вклады пока не поддерживаются, обратитесь к автору провайдера.');
}

function fetchCredit(baseurl){
    var prefs = AnyBalance.getPreferences();

    if(prefs.contract && !/^\d{6,10}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите номер кредита, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому кредиту.');

    throw new AnyBalance.Error('Кредиты пока не поддерживаются, обратитесь к автору провайдера.');
}
