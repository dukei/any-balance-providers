/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о тарифном плане для сотового оператора xxxxxx 

Operator site: http://xxxxxx.ru
Личный кабинет: https://kabinet.xxxxxx.ru/login
*/

var g_headers = {
'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
'Connection':'keep-alive',
'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://new.mcko.ru/";

    AnyBalance.setDefaultCharset('Windows-1251'); 

    var html = AnyBalance.requestGet(baseurl, g_headers); 

    var loginName = getParam(html, null, null, /<form[^>]+id="loginForm_n"[^>]*>(?:[\s\S]*?<input[^>]*){1}name=\"([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode),
        loginPassword = getParam(html, null, null, /<form[^>]+id="loginForm_n"[^>]*>(?:[\s\S]*?<input[^>]*){2}name=\"([\s\S]*?)\"/i, replaceTagsAndSpaces, html_entity_decode),
        param = {};

    param[loginName] = prefs.login;
    param[loginPassword] = prefs.password;   

    html = AnyBalance.requestPost(baseurl + 'index.php?rnd=', param , addHeaders({Referer: baseurl + 'index.php?rnd='})); 

    if(!/\/index\.php\?exit=exit/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]+id=mess[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'index.php?c=parent&d=svod', addHeaders({Referer: baseurl + 'index.php?c=parent'}, g_headers)); 

    var result = {success: true};

    function constructor(subject, paramName) {    
        var table = getParam(html, null, null, /<table[^>]+class=border1[^>]*>([\s\S]*?)<\/table>/i),
            row,
            lastMark,
            i,
            averageMark,
            lastM;

        averageMark = getParam(html, null, null, new RegExp("<table[^>]+class=border1[^>]*>[\\s\\S]*?<b\\b[^>]*>" + subject + "<\/b>(?:[\\s\\S]*?<b\\b[^>]*>){1}([\\s\\S]*?)<\/b>", "i"), replaceTagsAndSpaces, parseBalance);
        row = getParam(table, null, null, new RegExp("<b\\b[^>]*>" + subject + "<\/b>([\\s\\S]*?)<td\\b[^>]*>", "i"));
        lastMark = sumParam(row, null, null, /<nobr[^>]*>([\s\S]*?)<\/nobr>/g, replaceTagsAndSpaces, html_entity_decode);       

        for (i = lastMark.length - 1; i > 0; i--) {
            if (lastMark[i] !== "") {
                lastM = getParam(lastMark[i], null, null, null, replaceTagsAndSpaces, html_entity_decode);  
                i = 0;      
            } 
        }
        if (averageMark) getParam(averageMark + " / " + lastM, result, 'balance' + paramName, null, replaceTagsAndSpaces, html_entity_decode);    

    }

    constructor("английский язык", "Eng");
    constructor("биология", "Bio");
    constructor("география", "Geo");
    constructor("изобразительное искусство", "Izo");
    constructor("история", "Ist");
    constructor("литература", "Lit");
    constructor("математика", "Mat");
    constructor("обществознание \\(включая экономику и право\\)", "Obsch");
    constructor("русский язык", "Rus");
    constructor("музыка", "Mus");


    AnyBalance.setResult(result);
}
