/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Информация о карте, кредите, депозите в банке "ХоумКредит".

Сайт: http://www.homecredit.ru
ЛК: https://ib.homecredit.ru
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    Referer: 'https://ibank.rosbank.ru/Login.aspx',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11'
};

var g_headers2 = {
    Accept:'*/*',
    'Accept-Encoding':'gzip,deflate,sdch',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'Cache-Control':'no-cache',
    Connection:'keep-alive',
    'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
    //Cookie:'SBPROGID=te1gk1nn6elgt4dcq1f1u0i4s5; mobile=1; ASP.NET_SessionId=q4huu355y2dr3uvgmdxhyjao; sb_geolocation=undefined; sb_start_session=1; _ym_visorc_10028974=b; __utma=58428841.965910810.1400262912.1402233216.1402426508.3; __utmb=58428841.2.9.1402426511039; __utmc=58428841; __utmz=58428841.1400262912.1.1.utmcsr=(direct)|utmccn=(direct)|utmcmd=(none); SiteLang=ru-RU',
    Host:'ibank.rosbank.ru',
    Origin:'https://ibank.rosbank.ru',
    Referer:'https://ibank.rosbank.ru/Login.aspx',
    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36',
    'X-MicrosoftAjax':'Delta=true'
};

var g_headers3 = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Encoding':'gzip,deflate,sdch',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    Host:'ibank.rosbank.ru',
    Referer:'https://ibank.rosbank.ru/Login.aspx',
    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36'
};

function getViewState(html){
    return getParam(html, null, null, /name="__VIEWSTATE".*?value="([^"]*)"/) || getParam(html, null, null, /__VIEWSTATE\|([^\|]*)/i);
};

function getEventValidation(html) {
    return getParam(html, null, null, /name="__EVENTVALIDATION".*?value="([^"]*)"/) || getParam(html, null, null, /__EVENTVALIDATION\|([^\|]*)/i);
};

function main() {
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://ibank.rosbank.ru/';

    //AnyBalance.requestGet(baseurl + 'Logout.aspx', g_headers3);
    var html = AnyBalance.requestGet(baseurl, g_headers);
    if(!/Logout.aspx/i.test(html)) {
        html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
            'ctl00$MainScriptManager':'ctl00$MainContentPlaceHolder$TabsUpdatePanel|ctl00$MainContentPlaceHolder$CardButton',
            __LASTFOCUS:'',
            __EVENTTARGET:'',
            __EVENTARGUMENT:'',
            __VIEWSTATE:getViewState(html),
            __EVENTVALIDATION:getEventValidation(html),
            'ctl00$MainContentPlaceHolder$pin1':'',
            'ctl00$MainContentPlaceHolder$TransCod':'',
            'ctl00$MainContentPlaceHolder$pin2enc':'',
            'ctl00$MainContentPlaceHolder$Signature':'',
            'ctl00$MainContentPlaceHolder$CardNumTextBox':prefs.login,
            __ASYNCPOST:'true',
            'ctl00$MainContentPlaceHolder$CardButton':'%D0%9F%D1%80%D0%BE%D0%B4%D0%BE%D0%BB%D0%B6%D0%B8%D1%82%D1%8C'
        }, g_headers2);

        var pin2enc = getParam(html,null,null,/class="pin2enc" value="(.*)"/);
        var TransCod = getParam(html,null,null,/class="TransCod" value="(.*)"/);
        var pin3 = prefs.password;
        var Signature = '';

        //AnyBalance.trace('pin2enc:'+pin2enc);
        //AnyBalance.trace('TransCod:'+TransCod);
        //AnyBalance.trace('pin3:'+pin3);
        
        //Этот код расчета Signature выдран из main.js сайта (использует cryptojs.js и crb.js)
        var v = CRB.decryptPin2(pin2enc,pin3);
        if (v.result) {
            var sign = CRB.encryptBlock(v.result, TransCod);
            if (sign.result) {
                Signature = sign.result;
            }
            else {
                pin3 = '';
                throw new AnyBalance.Error(sign.error);
            }
        }
        else {
            pin3 = '';
            throw new AnyBalance.Error(v.error);
        }
        //Расчитали Signature

        //AnyBalance.trace('Signature:'+Signature);
        
        html = AnyBalance.requestPost(baseurl + 'Login.aspx', {
            'ctl00$MainScriptManager':'ctl00$MainContentPlaceHolder$TabsUpdatePanel|ctl00$MainContentPlaceHolder$Pwd1Button',
            'ctl00$MainContentPlaceHolder$pin1':'50845000'+prefs.login.replace(' ',''),
            'ctl00$MainContentPlaceHolder$TransCod':TransCod,
            'ctl00$MainContentPlaceHolder$pin2enc':pin2enc,
            'ctl00$MainContentPlaceHolder$Signature':Signature,
            'ctl00$MainContentPlaceHolder$pin3':pin3,
            __LASTFOCUS:'',
            __EVENTTARGET:'',
            __EVENTARGUMENT:'',
            __VIEWSTATE:getViewState(html),
            __EVENTVALIDATION:getEventValidation(html),
            __ASYNCPOST:'true',
            'ctl00$MainContentPlaceHolder$Pwd1Button':'%D0%9F%D1%80%D0%BE%D0%B4%D0%BE%D0%BB%D0%B6%D0%B8%D1%82%D1%8C'
        }, g_headers2);
        //AnyBalance.trace('html_Login='+html);

        //html = AnyBalance.requestGet(baseurl + 'Main2.aspx', g_headers3);
        //AnyBalance.trace('html_Main2='+html);
        
        if(!/Logout.aspx/i.test(html) && !/pageRedirect/i.test(html)){
            var error = getParam(html, null, null, /<div[^>]+class="loginError"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
            if(error)
                throw new AnyBalance.Error(error);
            throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
        }
    };

    if(prefs.type == 'crd')
        fetchCredit(baseurl, html);
    else if(prefs.type == 'acc')
        fetchAccount(baseurl, html);
    else
        fetchAccount(baseurl, html); //По умолчанию счет
    
    //html = AnyBalance.requestGet(baseurl + 'Logout.aspx', g_headers3);
}

function fetchAccount(baseurl, html){
    var prefs = AnyBalance.getPreferences();
    var acc;
    if(prefs.contract && !/^\d{1,4}$/.test(prefs.contract))
        throw new AnyBalance.Error('Пожалуйста, введите не менее 1 последних цифр номера счета, по которому вы хотите получить информацию, или не вводите ничего, чтобы получить информацию по первому счету.');
    html = AnyBalance.requestGet(baseurl + 'Accounts.aspx', g_headers3);

    //Сколько цифр осталось, чтобы дополнить до 4
    var accnum = prefs.contract || '';
    var accprefix = accnum.length;
    accprefix = 4 - accprefix;

    var result = {success: true};

    var re = new RegExp('<td>\\S*' + (accprefix > 0 ? '\\d{' + accprefix + '}' : '') + accnum + '<\\/td><td>[\\d,\\s]*\\.\\d{2}\\s[\\D]{3}<\\/td>.*(?:\\r\\n.*<option.*){2}AccountInfo.aspx\\?id=\\d*', 'i');

    var tr = getParam(html, null, null, re);
    html = AnyBalance.requestGet(baseurl + getParam(tr,null,null,/AccountInfo.aspx\?id=\d*/i));
    //AnyBalance.trace('Проверка условия отсутствия счетов');
    //AnyBalance.trace('re='+re);
    //AnyBalance.trace('tr='+tr);
    //AnyBalance.trace('html='+html);
    //Сразу завершаем сеанс, иначе сессия останется до конца ее жизни и новый запрос не сделать.
    //AnyBalance.requestGet(baseurl + 'Logout.aspx', g_headers3);
    if(!tr)
        throw new AnyBalance.Error('Не удалось найти ' + (prefs.contract ? 'счет № ' + prefs.contract : 'ни одного счета'));
    
    getParam(tr, result, 'balance', /<td>([\d,\s]*\.\d{2})\s[\D]{3}<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, '__tariff', /<td>(\S*\d{4})<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /([\D]{3})<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //getParam(tr, result, 'accnum', /(\d{4})<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accnum', /<td>\W*<\/td><td>(\d*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'accname',   /(?:<tr[\S\s]*?<\/tr>){3}<tr[\S\s]*?<td>.*<\/td><td>(.*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio',       /(?:<tr[\S\s]*?<\/tr>){1}<tr[\S\s]*?<td>.*<\/td><td>(.*)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.setResult(result);
}

function fetchCredit(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(/<a[^>]+href="Loans.aspx"/.test(html))
        html = AnyBalance.requestGet(baseurl + 'Loans.aspx');

    var re = new RegExp('(<tr[^>]*id=["\']?par_(?:[\\s\\S](?!<tr))*' + (prefs.contract || 'td') + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);
    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.contract ? 'кредит №' + prefs.contract : 'ни одного кредита'));

    var result = {success: true};
    
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){13}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'currency', /(?:[\s\S]*?<td[^>]*>){10}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'accname', /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'till', /(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payTill', /(?:[\s\S]*?<td[^>]*>){11}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    getParam(tr, result, 'payNext', /(?:[\s\S]*?<td[^>]*>){12}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<span[^>]+id="ctl00_FIOLabel"[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'limit', /(?:[\s\S]*?<td[^>]*>){9}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'Logout.aspx', g_headers2);
    AnyBalance.setResult(result);
    
}
