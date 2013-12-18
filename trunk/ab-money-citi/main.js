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

function getToken(html){
    var token = getParam(html, null, null, /<input[^>]+name="SYNC_TOKEN"[^>]*value="([^"]*)/i);
    if(!token)
        throw new AnyBalance.Error('Не найден токен синхронизации. Сайт изменен или проблемы на сайте.');
    return token;
}

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://www.citibank.ru/RUGCB/';

    if(prefs.profile && !/^\d{4}$/.test(prefs.profile))
        throw new AnyBalance.Error('Введите последние 4 цифры профиля или не вводите ничего, чтобы получить информацию по первому профилю.');

    var html = AnyBalance.requestGet(baseurl + 'JSO/signon/DisplayUsernameSignon.do', g_headers);

    html = AnyBalance.requestPost(baseurl + 'JSO/signon/ProcessUsernameSignon.do', {
        SYNC_TOKEN:getToken(html),
        username:prefs.login,
        password:prefs.password,
        x:41,
	y:7
    }, g_headers);

    if(!/link_signOffLink/i.test(html)){
        if(/id="nonOtpLogonButton"/i.test(html))
             html = AnyBalance.requestGet(baseurl + 'JSO/signon/uname/HomePage.do', g_headers);
    }
    if(!/link_signOffLink/i.test(html)){
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Неправильный логин-пароль?');
    }

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

    var hrefJson = getParam(html, null, null, /'\/([^']*GetRSDashboardResponse\.do[^']*)/i);
    if(!hrefJson){
        //Возможно, у нас хоумпейдж не туда смотрит, тогда надо перейти на правильный хоумпейдж
        html = AnyBalance.requestGet(baseurl + 'JPS/portal/Home.do', addHeaders({Referer: baseurl + 'JSO/signon/uname/HomePage.do'}));
    }

    hrefJson = getParam(html, null, null, /'\/([^']*GetRSDashboardResponse\.do[^']*)/i);
    if(!hrefJson){
        throw new AnyBalance.Error('Не удалось найти ссылку на получение информации по счетам. Сайт изменен?');
    }

    var jsonStr = AnyBalance.requestGet(baseurl + hrefJson);
    var json = getJson(jsonStr);

    if(!json.dbpersonalAccountSummary || !json.dbpersonalAccountSummary.dashBoardAccounts || !json.dbpersonalAccountSummary.dashBoardAccounts.account){
        AnyBalance.trace(jsonStr);
        throw new AnyBalance.Error('Не найдена информация о счетах. Пожалуйста, обратитесь к автору провайдера для исправления.');
    }

    for(var i=0; i<json.dbpersonalAccountSummary.dashBoardAccounts.account.length; ++i){
        var acc = json.dbpersonalAccountSummary.dashBoardAccounts.account[i];
        if(prefs.accnum && !endsWith(acc.accountIdentifier, prefs.accnum))
            continue; //Не наш счет

        var result = {success: true};
        if(AnyBalance.isAvailable('accnum'))
            result.accnum = acc.accountIdentifier;
        result.__tariff = acc.accountLabel || acc.accountIdentifier;
        if(AnyBalance.isAvailable('accname'))
            result.accname = acc.accountLabel || acc.accountIdentifier;

        if(acc.balances && acc.balances.balance){
            for(var j=0; j<acc.balances.balance.length; ++j){
                var bal = acc.balances.balance[j];
				if(!bal.rawBalance || bal.rawBalance == 'BalUnAvail') {
					// В случае когда bal.rawBalance == 'BalUnAvail' кредитный лимит можно посчитать если есть баланс и использованный кредит
					if(isset(result.balance) && isset(result.credit) && !isset(result.limit)) {
						getParam(result.balance + result.credit, result, 'limit');
					}
                    continue;
				}
                var val = parseBalance(bal.rawBalance);
                if(!isset(val)) {
                    AnyBalance.trace('Could not parse value for ' + bal.balText);
                    continue;
                }

                if(AnyBalance.isAvailable('balance') && /Доступно сейчас|Available now/i.test(bal.balText))
                    result.balance = val;
                if(AnyBalance.isAvailable('ondeposit') && /Текущий баланс|On deposit/i.test(bal.balText))
                    result.ondeposit = val;
                if(AnyBalance.isAvailable('limit') && /Кредитный лимит|Credit limit/i.test(bal.balText))
                    result.limit = val;
                if(AnyBalance.isAvailable('credit') && /Использованный кредит|Credit used/i.test(bal.balText))
                    result.credit = val;

                if(AnyBalance.isAvailable('credit_total') && /Сумма к погашению|Payoff amount/i.test(bal.balText))
                    result.credit_total = val;
                if(AnyBalance.isAvailable('credit_next_payment') && /Сумма следующего платежа|Next installment amount/i.test(bal.balText))
                    result.credit_next_payment = val;					
					
                if(AnyBalance.isAvailable('currency') && !isset(result.currency))
                    result.currency = parseCurrency(bal.balDetail);
            }
        }else{
            AnyBalance.trace('Не удалось найти ни одного баланса: ' + jsonStr);
        }

        AnyBalance.setResult(result);
        break;
    }

    throw new AnyBalance.Error('Не удаётся найти ' + (prefs.accnum ? 'счет/карту с последними цифрами ' + prefs.accnum : 'ни одного счета/карты'));
}
