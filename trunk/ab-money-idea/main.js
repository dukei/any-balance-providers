/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и другие параметры карт банка Idea

Сайт оператора: http://ideabank.com.ua/
Личный кабинет: https://online.ideabank.com.ua
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

    var baseurl = prefs.login != '1' ? "https://online.ideabank.com.ua/" : "https://online.ideabank.com.ua:444/";
    
    var html = AnyBalance.requestGet(baseurl + 'Pages/LogOn.aspx', g_headers);

    var form = getParam(html, null, null, /<form[^>]+name="aspnetForm"[^>]*>([\s\S]*?)<\/form>/i);
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');

    var params = createFormParams(form);
    params.__EVENTTARGET = 'ctl00$body$ContentBody$wzLogin$btnLogin';
    params.ctl00$body$ContentBody$wzLogin$tbLogin = prefs.login;
    params.ctl00$body$ContentBody$wzLogin$tbPassword = prefs.password;

    html = AnyBalance.requestPost(baseurl + 'Pages/Security/LogOn.aspx', params, g_headers);

    if(!/\$btnLogout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id="ctl00_body_ContentBody_wzLogin_vlSummaryLogin"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменен?");
    }

    var result = {success: true};
    
    //Сделаем сводку.
    if(AnyBalance.isAvailable('all')){
        var all = [];
        //Сначала для счетов
        var added = false;
        html.replace(/<a[^>]+id="ctl00_ctl00_body_ContentBody_MainContent_ucAccountList_gvAccounts_ctl\d+_btnAccountName"[^>]*>([^<]*)<\/a>\s*<\/td>\s*<td[^>]*>([^<]*)/ig, function(str, name, id){
            if(!added){ all[all.length] = 'Счета'; added = true; }
            all[all.length] = getParam(name, null, null, null, replaceTagsAndSpaces) + ': ' + getParam(id, null, null, null, replaceTagsAndSpaces);
            return str;
        });
        //Для депозитов
        var added = false;
        html.replace(/<a[^>]+id="ctl00_ctl00_body_ContentBody_MainContent_ucDepositList_gvDeposits_ctl(\d+)_btnName"[^>]*>([^<]*)/ig, function(str, id, name){
            if(!added){ all[all.length] = 'Депозиты'; added = true; }
            all[all.length] = getParam(name, null, null, null, replaceTagsAndSpaces) + ': ' + getParam(id, null, null, null, replaceTagsAndSpaces);
            return str;
        });
        //Для кредитов
        var added = false;
        html.replace(/<a[^>]+id="ctl00_ctl00_body_ContentBody_MainContent_ucLoanList_gvLoans_ctl(\d+)_btnName"[^>]*>([^<]*)/ig, function(str, id, name){
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

function fetchDetails(html, tr, baseurl){
    var id = getParam(tr, null, null, /__doPostBack\s*\(\s*(?:'|&#39;)([^'&]*Name)(?:'|&#39;)/i);
    var form = getParam(html, null, null, /<form[^>]+name="aspnetForm"[^>]*>([\s\S]*?)<\/form>/i);
    if(id && form){
        var params = createFormParams(form);
        params.__EVENTTARGET = id;
        delete params.ctl00$ctl00$body$ContentHorizontalMenu$ucHorizontalBar$btnDefault;
        delete params.ctl00$ctl00$body$ContentMenu$btnAvatar;
        html = AnyBalance.requestPost(baseurl + 'Pages/User/MainPage.aspx', params, addHeaders({Referer: baseurl + 'Pages/Security/LogOn.aspx'}));
        return html;
    }else{
        AnyBalance.trace('Не удалось получить ссылку на подробные сведения о продукте');
    }
}

function fetchAcc(html, baseurl, result){
    var prefs = AnyBalance.getPreferences();
    //Сколько цифр осталось, чтобы дополнить до 12
    var accnum = prefs.accnum || '';
    var accprefix = accnum.length;
    accprefix = 12 - accprefix;

    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?>\\s*#' + (accprefix > 0 ? '\\d{' + accprefix + ',}' : '') + accnum + '[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (accnum ? 'счет с последними цифрами ' + accnum : 'ни одного счета'));

    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'available', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance', 'available', 'limit'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('limit', 'pay', 'pct')){
        if(html = fetchDetails(html, tr, baseurl)){
            getParam(html, result, 'limit', /(?:Лимит овердрафта|Ліміт овердрафту|Overdraft limit)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'pay', /(?:Сумма к оплате|Сума до оплати|Amount to pay)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'pct', /(?:Процентная ставка|Відсоткова ставка|Interest rate)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }
    }

    AnyBalance.setResult(result);
}

function fetchDep(html, baseurl, result){
    var prefs = AnyBalance.getPreferences();
    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?<a[^>]+id="ctl00_ctl00_body_ContentBody_MainContent_ucDepositList_gvDeposits_ctl' + (prefs.accnum ? prefs.accnum : '\\d{2}') + '_btnName"[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.accnum ? 'депозит с ID ' + prefs.accnum : 'ни одного депозита'));

    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /ctl00_ctl00_body_ContentBody_MainContent_ucDepositList_gvDeposits_ctl(\d{2})_btnName/i, replaceTagsAndSpaces);
    getParam(tr, result, 'pct', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);

    AnyBalance.setResult(result);
}

function fetchCredit(html, baseurl, result){
    var prefs = AnyBalance.getPreferences();
    var re = new RegExp('(<tr[^>]*>(?:[\\s\\S](?!<\\/tr>))*?<a[^>]+id="ctl00_ctl00_body_ContentBody_MainContent_ucLoanList_gvLoans_ctl' + (prefs.accnum ? prefs.accnum : '\\d{2}') + '_btnName"[\\s\\S]*?<\\/tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.accnum ? 'кредит с ID ' + prefs.accnum : 'ни одного кредита'));

    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces);
    getParam(tr, result, 'accnum', /ctl00_ctl00_body_ContentBody_MainContent_ucLoanList_gvLoans_ctl(\d{2})_btnName/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance', 'pay', 'limit'], /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)(?:<span[^>]+class="sortExpr"|<\/td>)/i, replaceTagsAndSpaces, parseDate);

    if(AnyBalance.isAvailable('paytill', 'pay', 'pct')){
        if(html = fetchDetails(html, tr, baseurl)){
            getParam(html, result, 'paytill', /(?:Дата следующего погашения|Дата наступного погашення|Next repayment date)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(html, result, 'pay', /(?:Сумма следующего погашения|Сума наступного погашення|Next repayment amount)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
            getParam(html, result, 'pct', /(?:Процентная ставка|Відсоткова ставка|Interest rate)[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
        }
    }

    AnyBalance.setResult(result);
}
