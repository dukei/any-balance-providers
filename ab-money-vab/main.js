/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Дельта банк

Сайт оператора: http://deltabank.com.ua/
Личный кабинет: https://online.deltabank.com.ua
*/

function getViewState(html){
    return getParam(html, null, null, /name="__VSTATE".*?value="([^"]*)"/);
}

function getEventValidation(html){
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/);
}

var g_headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
}

function smsPassAction(baseurl, html, target, smspass){
    html = AnyBalance.requestPost(baseurl + 'Pages/LogOn.aspx', {
        __LASTFOCUS:'',
        __EVENTTARGET: target,
        __EVENTARGUMENT:'',
        __VSTATE:getViewState(html),
        __VIEWSTATE:'',
        __VIEWSTATEENCRYPTED:'',
        __EVENTVALIDATION:getEventValidation(html),
        wzLogin$ucLogOnOneTimePassword$ucOneTimePassword$fldOneTimePassword$tbOneTimePassword:smspass
    }, addHeaders({Referer: baseurl + 'Pages/LogOn.aspx'}));
    return html;
}


function main(){
    var prefs = AnyBalance.getPreferences();
    if(prefs.accnum){
        if(!prefs.type || prefs.type == 'acc'){
            if(!/^\d{4,}$/.test(prefs.accnum))
                throw new AnyBalance.Error("Введите не меньше 4 последних цифр номера счета или не вводите ничего, чтобы показать информацию по первому счету.");
        }else if(!/^\d{2}$/.test(prefs.accnum)){
            throw new AnyBalance.Error("Введите 2 цифры ID кредита или депозита или не вводите ничего, чтобы показать информацию по первому счету. ID кредита можно узнать, выбрав счетчик \"Сводка\".");
        }
    }

    var baseurl = prefs.login != '1' ? "https://banking.vab.ua/" : "https://banking.vab.ua/Demo/";
    
    var html = AnyBalance.requestGet(baseurl + 'Pages/LogOn.aspx', g_headers);
    var viewstate = getViewState(html);
    var eventvalidation = getEventValidation(html);

    html = AnyBalance.requestPost(baseurl + 'Pages/LogOn.aspx', {
        __EVENTTARGET: 'wzLogin$btnLogOn',
        __EVENTARGUMENT:'',
        __VSTATE:viewstate,
        __VIEWSTATE:'',
        __VIEWSTATEENCRYPTED:'',
        __EVENTVALIDATION:eventvalidation,
        wzLogin$tbLogin:prefs.login,
        wzLogin$tbPassword:prefs.password
    }, g_headers);

    if(!/ctl00\$btnLogout|tbOneTimePassword/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+id="globalErrorMessage"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /Обліковий запис не знайдено|некоректні логін чи пароль|Помилковий пароль|Помилковий security-пароль/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    if(/tbOneTimePassword/i.test(html)){
    	if(!prefs.smspass){
            smsPassAction(baseurl, html, 'wzLogin$btnGenerate', '');
 	    throw new AnyBalance.Error('Для входа в интернет банк требуется ввести временный код, который выслан вам в SMS. Он действует несколько дней. Введите его в настройки провайдера.', null, true);
        }

        html = smsPassAction(baseurl, html, 'wzLogin$btnConfirm', prefs.smspass);
    }

    if(!/ctl00\$btnLogout/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]+id="globalErrorMessage"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error && /Помилковий security-пароль/i.test(error)){
            smsPassAction(baseurl, html, 'wzLogin$btnGenerate', '');
            throw new AnyBalance.Error(error + ' Новый SMS-пароль сгенерерован и выслан вам. Введите его в настройки провайдера.', null, true);
        }
        if(error)
            throw new AnyBalance.Error(error, null, /Обліковий запис не знайдено|некоректні логін чи пароль|Помилковий пароль|Помилковий security-пароль/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк после подтверждения смс-паролем. Сайт изменен?");
    }

    var result = {success: true};
    
    //Сделаем сводку.
    if(AnyBalance.isAvailable('all')){
        var all = [];
        //Сначала для счетов
        var added = false;
        html.replace(/<a[^>]+id="ctl00_PagePlaceHolder_ucAccounts_rpAccounts_ctl\d+_btnAccountDetails"[^>]*>([^<]*)<\/a>\s*<\/td>\s*<td[^>]*>([^<]*)/ig, function(str, name, id){
            if(!added){ all[all.length] = 'Счета'; added = true; }
            all[all.length] = getParam(name, null, null, null, replaceTagsAndSpaces) + ': ' + getParam(id, null, null, null, replaceTagsAndSpaces);
            return str;
        });
        //Для депозитов
        var added = false;
        html.replace(/<a[^>]+id="ctl00_PagePlaceHolder_ucDeposits_rpDeposits_ctl(\d+)_btnDepositDetails"[^>]*>([^<]*)/ig, function(str, id, name){
            if(!added){ all[all.length] = 'Депозиты'; added = true; }
            all[all.length] = getParam(name, null, null, null, replaceTagsAndSpaces) + ': ' + getParam(id, null, null, null, replaceTagsAndSpaces);
            return str;
        });
        //Для кредитов
        var added = false;
        html.replace(/<a[^>]+id="ctl00_PagePlaceHolder_ucCredits_rpCredits_ctl(\d+)_btnLoanDetails"[^>]*>([^<]*)/ig, function(str, id, name){
            if(!added){ all[all.length] = 'Кредиты'; added = true; }
            all[all.length] = getParam(name, null, null, null, replaceTagsAndSpaces) + ': ' + getParam(id, null, null, null, replaceTagsAndSpaces);
            return str;
        });
        if(all.length)
            result.all = all.join('\n');
    }

    if(prefs.type == 'acc'){
        fetchAcc(html, baseurl, result);
    }else if(prefs.type == 'dep'){
        fetchDep(html, baseurl, result);
    }else if(prefs.type == 'crd'){
        fetchCredit(html, baseurl, result);
    }else{
        fetchAcc(html, baseurl, result);
    }
}

function fetchAcc(html, baseurl, result){
    var prefs = AnyBalance.getPreferences();
    //Сколько цифр осталось, чтобы дополнить до 12
    var accnum = prefs.accnum || '';
    var accprefix = accnum.length;
    accprefix = 12 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?>\\s*' + (accprefix > 0 ? '\\d{' + accprefix + ',}' : '') + accnum + '\\s+[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'счет с последними цифрами ' + accnum : 'ни одного счета'));

    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'available', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('blocked')){
        var id = getParam(tr, null, null, /__doPostBack\s*\(\s*'([^']*Details)'/i);
        if(id){
            html = requestPostMultipart(baseurl + 'Pages/MainPage.aspx', {
                __EVENTTARGET: id,
                __EVENTARGUMENT: '',
                __VSTATE: getViewState(html),
                __VIEWSTATE: '',
                __VIEWSTATEENCRYPTED: '',
                __EVENTVALIDATION: getEventValidation(html)
            }, g_headers);
        
            getParam(html, result, 'blocked', /(?:Блокировано|Блоковано|Blocked)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }else{
            AnyBalance.trace('Не удалось получить ссылку на подробные сведения о счете');
        }
    }

    AnyBalance.setResult(result);
}

function fetchDep(html, baseurl, result){
    var prefs = AnyBalance.getPreferences();
    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?<a[^>]+id="ctl00_PagePlaceHolder_ucDeposits_rpDeposits_ctl' + (prefs.accnum ? prefs.accnum : '\\d{2}') + '_btnDepositDetails"[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.accnum ? 'депозит с ID ' + prefs.accnum : 'ни одного депозита'));

    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /ucDeposits_rpDeposits_ctl(\d{2})_btnDepositDetails/i, replaceTagsAndSpaces);
    getParam(tr, result, 'pct', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}

function fetchCredit(html, baseurl, result){
    var prefs = AnyBalance.getPreferences();
    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?<a[^>]+id="ctl00_PagePlaceHolder_ucCredits_rpCredits_ctl' + (prefs.accnum ? prefs.accnum : '\\d{2}') + '_btnLoanDetails"[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.accnum ? 'кредит с ID ' + prefs.accnum : 'ни одного кредита'));

    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /ucCredits_rpCredits_ctl(\d{2})_btnLoanDetails/i, replaceTagsAndSpaces);
    getParam(tr, result, 'pct', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){7}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    if(AnyBalance.isAvailable('paytill', 'payfrom', 'pay')){
        var id = getParam(tr, null, null, /__doPostBack\s*\(\s*'([^']*)/i);
        if(id){
            html = requestPostMultipart(baseurl + 'Pages/MainPage.aspx', {
                __EVENTTARGET: id,
                __EVENTARGUMENT: '',
                __VSTATE: getViewState(html),
                __VIEWSTATE: '',
                __VIEWSTATEENCRYPTED: '',
                __EVENTVALIDATION: getEventValidation(html)
            }, g_headers);
        
            getParam(html, result, 'paytill', /(?:Дата следующей оплаты|Дата наступної оплати|Next payment date)[\s\S]*?<td[^>]*>[^<]*до([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'payfrom', /(?:Дата следующей оплаты|Дата наступної оплати|Next payment date)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'pay', /(?:Сумма следующего платежа|Сума наступного платежу|Next payment amount)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        }else{
            AnyBalance.trace('Не удалось получить ссылку на подробные сведения о кредите');
        }
    }

    AnyBalance.setResult(result);
}
