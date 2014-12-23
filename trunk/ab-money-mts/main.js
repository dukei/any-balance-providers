/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

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

function encryptPass(pass, map) {
	if (map) {
		var ch = '', i = 0, k = 0, TempPass = '', PassTemplate = map.split(','), Pass = '';
		TempPass = pass;
		while (TempPass != '') {
			ch = TempPass.substr(0, 1);
			k = ch.charCodeAt(0);
			if (k > 0xFF) k -= 0x350;
			if (k == 7622) k = 185;
			TempPass = TempPass.length > 1 ? TempPass.substr(1, TempPass.length) : '';
			if (Pass != '') Pass = Pass + ';';
			Pass = Pass + PassTemplate[k];
		}
		return Pass;
	} else {
		return pass;
	}
}

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://personalbank.ru/v1/cgi/bsi.dll?";
    
    var html = AnyBalance.requestGet(baseurl + 'T=RT_2Auth.BF');
    var mapId = getParam(html, null, null, /<input[^>]*name="MapID"[^>]*value="([^"]*)"/i);
    var map = getParam(html, null, null, /var\s+PassTemplate\s*=\s*new\s+Array\s*\(([^\)]*)/i);
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
        L:'russian',
        C:'',
        IdCaptcha:'',
        IMode:'',
        sTypeInterface:'default',
        MapID:mapId || ''
    }, headers);

    var error = getParam(html, null, null, /<BSS_ERROR>\d*\|?([\s\S]*?)<\/BSS_ERROR>/i, replaceTagsAndSpaces, html_entity_decode);
    if(error && /Вы ошиблись при вводе логина или пароля/i.test(error))
        throw new AnyBalance.Error(error, null, true);
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
    }, headers);

    var i=0;
    do{
        AnyBalance.trace('Ожидание обновления данных: ' + (i+1));
        html = AnyBalance.requestPost(baseurl, {
            SID:jsonInfo.SID,
            tic:1,
            T:'rt_0clientupdaterest.CheckForAcyncProcess'
        }, headers);
        if(/^\s*(?:<BSS_ERROR>[\s\S]*?<\/BSS_ERROR>)?0\s*$/i.test(html))
            break; //Всё готово, надо получать баланс
        if(++i > 10){  //На всякий случай не делаем больше 5 попыток
            AnyBalance.trace('Не удалось за 30 секунд обновить баланс, получаем старое значение...');
            break;
        }
        sleep(3000);
    }while(true);


    var html = AnyBalance.requestPost(baseurl, {
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

	var div = getParam(html, null, null, new RegExp('<div[^>]*>(?:[\\d\\*]{4}\\s?){3}' + (prefs.cardnum || '\\d{4}') + '(?:[^>]*>){40,60}\\s*</tr>'));
    if(!div)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));
	
    var result = {success: true};
    
    getParam(div, result, '__tariff', /[\d\*]{14,16}/, replaceTagsAndSpaces);
	getParam(result.__tariff, result, 'cardnum');
	
    getParam(div, result, 'balance', /Платёжный лимит(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(div, result, 'currency', /Платёжный лимит(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
    // getParam(div, result, 'type', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
	
    getParam(jsonInfo.USR, result, 'fio', null, replaceTagsAndSpaces, capitalFirstLetters);
	
    AnyBalance.setResult(result);
}

function fetchAccount(jsonInfo, html, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4,}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите начало номера счета или не вводите ничего, чтобы показать информацию по первому счету");
	
	// <div(?:[^>]*>){3}\d{16}8528(?:[^>]*>){40,60}\s*</tr>
	var div = getParam(html, null, null, new RegExp('<div(?:[^>]*>){3}\\d{16}' + (prefs.cardnum || '\\d{4}') + '(?:[^>]*>){40,60}\\s*</tr>'));
	if(!div)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с первыми цифрами ' + prefs.cardnum : 'ни одного счета'));

    var result = {success: true};
	
    getParam(div, result, '__tariff', /\d{20}/i, replaceTagsAndSpaces);
    getParam(result.__tariff, result, 'cardnum');
    getParam(div, result, 'balance', /Текущий остаток:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
    getParam(div, result, 'currency', /Текущий остаток:(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseCurrency);
    getParam(div, result, 'type', /<div[^>]*>([\s\S]*?)<\//i, replaceTagsAndSpaces);
	
	getParam(jsonInfo.USR, result, 'fio', null, replaceTagsAndSpaces, capitalFirstLetters);
	
    AnyBalance.setResult(result);
}
