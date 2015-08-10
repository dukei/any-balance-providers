/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept':'*/*',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Connection':'keep-alive',
	'Origin': 'https://www.citibank.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With': 'XMLHttpRequest'
};

function getToken(html){
    var token = getParam(html, null, null, [/<input[^>]+name="SYNC_TOKEN"[^>]*value="([^"]*)/i, /var token\s*=\s*"([^"]+)/i]);
    if(!token) {
        throw new AnyBalance.Error('Не найден токен синхронизации. Сайт изменен или проблемы на сайте.');
	}
    return token;
}

function main() {
	AnyBalance.setDefaultCharset('utf-8');
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.citibank.ru/RUGCB/';
	
	if(prefs.profile && !/^\d{4}$/.test(prefs.profile))
        throw new AnyBalance.Error('Введите последние 4 цифры профиля или не вводите ничего, чтобы получить информацию по первому профилю.');
	
    var html = AnyBalance.requestGet(baseurl + 'JSO/signon/DisplayUsernameSignon.do?locale=ru_RU', g_headers);
	
	if(!prefs.dbg) {
		html = AnyBalance.requestPost(baseurl + 'JSO/signon/ProcessUsernameSignon.do', {
			SYNC_TOKEN:getToken(html),
			username:prefs.login,
			password:prefs.password,
			'rsaDevicePrint':'version=2&pm_fpua=mozilla/5.0 (windows nt 6.1; wow64) applewebkit/537.36 (khtml, like gecko) chrome/36.0.1985.125 safari/537.36|5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36|Win32&pm_fpsc=24|1600|900|860&pm_fpsw=|qt1|qt2|qt3|qt4|qt5|pdf&pm_fptz=4&pm_fpln=lang=ru|syslang=|userlang=&pm_fpjv=1&pm_fpco=1&pm_fpasw=widevinecdmadapter|pepflashplayer|internal-remoting-viewer|ppgooglenaclpluginchrome|pdf|npqtplugin|npqtplugin2|npqtplugin3|npqtplugin4|npqtplugin5|nppdf32|npgoogleupdate3|npintelwebapiipt|npintelwebapiupdater|npdeployjava1|npjp2|npctrl|npnv3dv|npnv3dvstreaming|npswf32_14_0_0_145&pm_fpan=Netscape&pm_fpacn=Mozilla&pm_fpol=true&pm_fposp=&pm_fpup=&pm_fpsaw=1600&pm_fpspd=24&pm_fpsbd=&pm_fpsdx=&pm_fpsdy=&pm_fpslx=&pm_fpsly=&pm_fpsfse=&pm_fpsui='
		}, g_headers);
		
		// Проверяем, надо ли пропустить вход без смс
		if(/id="nonOtpLogonButton"|Otp-Warning-Skip/i.test(html)) {
			html = AnyBalance.requestGet(baseurl + 'JSO/signon/uname/HomepagePortal.do?SYNC_TOKEN=' + getToken(html), addHeaders({Referer: baseurl + 'JSO/signon/DisplayUsernameSignon.do'}));
		}
		
		if(!/signOffLink/i.test(html)){
			throw new AnyBalance.Error('Не удалось войти в интернет-банк. Неправильный логин-пароль?');
		}
		
		html = AnyBalance.requestGet(baseurl + 'JPS/portal/Home.do', addHeaders({Referer: baseurl + 'JSO/signon/DisplayUsernameSignon.do'}));

		var select = getParam(html, null, null, /<select[^>]+name="selectedProfile"[\s\S]*?<\/select>/i);
		if(select){ //Необходимо выбрать профиль
			var num = prefs.profile ? prefs.profile : '\\d{4}';
			var re = new RegExp('<option[^>]+value="([^"]*)"[^>]*>([^<]*' + num + ')\\s*</option>', 'i');
			var value = getParam(select, null, null, re, null, html_entity_decode);
			if(!value)
				throw new AnyBalance.Error(prefs.profile ? 'Не найдено ни одного профиля. Сайт изменен?' : 'Не найдено профиля с последними цифрами ' + prefs.profile);
			AnyBalance.trace("Selecting profile " + select.match(re)[2]);
			html = AnyBalance.requestPost(baseurl + 'JSO/signon/ProcessUsernameProfileSignon.do', {
				SYNC_TOKEN:getToken(html),
				selectedProfile:value
			}, g_headers);
		   
		}
	}
    /*var hrefJson = getParam(html, null, null, /'\/([^']*GetRSDashboardResponse\.do[^']*)/i);
    if(!hrefJson){
        //Возможно, у нас хоумпейдж не туда смотрит, тогда надо перейти на правильный хоумпейдж
        html = AnyBalance.requestGet(baseurl + 'JPS/portal/Home.do', addHeaders({Referer: baseurl + 'JSO/signon/uname/HomePage.do'}));
    }*/

    /*hrefJson = getParam(html, null, null, /'\/([^']*GetRSDashboardResponse\.do[^']*)/i);
    if(!hrefJson){
        throw new AnyBalance.Error('Не удалось найти ссылку на получение информации по счетам. Сайт изменен?');
    }*/
	
	var jsonHeaders = {
		'Connection':'keep-alive',
		'Accept':'application/json, text/javascript, */*; q=0.01',
		'Origin':'https://www.citibank.ru',
		'X-Requested-With':'XMLHttpRequest',
		'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1985.125 Safari/537.36',
		'Content-Type':'application/json',
		'Referer':'https://www.citibank.ru/RUGCB/JPS/portal/Index.do',
		'Accept-Language':'ru,en;q=0.8',		
	};
	
	var jsonStr = AnyBalance.requestPost(baseurl + 'COA/ain/accsumlit/flow.action', '', jsonHeaders);
    jsonStr = AnyBalance.requestPost(baseurl + 'REST/coa/ain/accsumlit/getAccounts', '', jsonHeaders);
    var json = getJson(jsonStr);
	
    if(!json.accountDetailList){
        AnyBalance.trace(jsonStr);
        throw new AnyBalance.Error('Не найдена информация о счетах. Пожалуйста, обратитесь к автору провайдера для исправления.');
    }

    for(var i=0; i<json.accountDetailList.length; ++i){
        var acc = json.accountDetailList[i];
        if(prefs.accnum && !endsWith(acc.accountNumber, prefs.accnum))
            continue; //Не наш счет

		var result = {success: true};
        if(AnyBalance.isAvailable('accnum'))
            result.accnum = acc.accountNumber;
        result.__tariff = acc.accountName || acc.accountNumber;
        if(AnyBalance.isAvailable('accname'))
            result.accname = acc.accountName || acc.accountNumber;
		
        if(acc.elementEntryMap && (acc.elementEntryMap.right || acc.elementEntryMap.bottom)) {
			if(acc.elementEntryMap.bottom) {
				var accsArray = acc.elementEntryMap.right.concat(acc.elementEntryMap.bottom);
			} else {
				var accsArray = acc.elementEntryMap.right;
			}
			
            for(var j=0; j < accsArray.length; ++j) {
                var bal = accsArray[j];
				if(!bal.value || bal.value == 'BalUnAvail') {
					// В случае когда bal.rawBalance == 'BalUnAvail' кредитный лимит можно посчитать если есть баланс и использованный кредит
					if(isset(result.balance) && isset(result.credit) && !isset(result.limit)) {
						getParam(result.balance + result.credit, result, 'limit');
					}
                    continue;
				}
				
				if(/дата/i.test(bal.phrase)) {
					var val = parseDate(bal.value);
				} else {
					var val = parseBalance(bal.value);
				}
				
                if(!isset(val)) {
                    AnyBalance.trace('Could not parse value for ' + bal.value);
                    continue;
                }
                if(AnyBalance.isAvailable('balance') && /Доступно сейчас|Available now|Остаток долга по кредиту/i.test(bal.phrase)) {
                    if(/Остаток долга по кредиту/i.test(bal.phrase))
						result.balance = val*-1;
					else
						result.balance = val;
				}
                if(AnyBalance.isAvailable('ondeposit') && /Текущий баланс|On deposit/i.test(bal.phrase))
                    result.ondeposit = val;
                if(AnyBalance.isAvailable('limit') && /Кредитный лимит|Credit limit/i.test(bal.phrase))
                    result.limit = val;
                if(AnyBalance.isAvailable('credit') && /Использованный кредит|Credit used/i.test(bal.phrase))
                    result.credit = val;
                if(AnyBalance.isAvailable('credit_total') && /Сумма к погашению|Payoff amount/i.test(bal.phrase))
                    result.credit_total = val;
                if(AnyBalance.isAvailable('credit_next_payment') && /Сумма (?:следующего|очередного) платежа|Next installment amount/i.test(bal.phrase))
                    result.credit_next_payment = val;
                if(AnyBalance.isAvailable('credit_next_payment_till') && /Дата (?:следующего|очередного) платежа/i.test(bal.phrase))
                    result.credit_next_payment_till = val;					
				
                if(!isset(result.currency))
                    result.currency = parseCurrency(bal.value);
            }
        }else{
            AnyBalance.trace('Не удалось найти ни одного баланса: ' + jsonStr);
        }

        AnyBalance.setResult(result);
        break;
    }

    throw new AnyBalance.Error('Не удаётся найти ' + (prefs.accnum ? 'счет/карту с последними цифрами ' + prefs.accnum : 'ни одного счета/карты'));
}
