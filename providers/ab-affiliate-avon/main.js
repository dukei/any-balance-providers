/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию из личного кабинета AVON

Operator site: http://www.avon.ru
Личный кабинет: https://www.avon.ru/REPSuite/login.page
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
    var baseurl = "https://www.avon.ru/";
    AnyBalance.setDefaultCharset('utf-8'); 

    if(prefs.__dbg){
        var html = AnyBalance.requestGet('http://www.avon.ru/REPSuite/home.page');
    }else{
        var html = AnyBalance.requestPost(baseurl + 'REPSuite/login.page', {
            languageSelected:false,
            langCode:'',
            userIdDisplay:prefs.login,
            password:prefs.password,
            x:39,
            y:15,
            Val:''
        }, addHeaders({Referer: baseurl + 'REPSuite/login.page'})); 
    }

    if(!/logoutMain.page/i.test(html)){
        var error = getParam(html, null, null, /<td[^>]+class="?error"?[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        //Если объяснения ошибки не найдено, при том, что на сайт войти не удалось, то, вероятно, произошли изменения на сайте
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};
    getParam(html, result, 'balance', /<a[^>]+accountBalance.page[^>]*>Баланс<(?:[\s\S]*?<\/td>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'fio', /Здравствуйте,([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Здравствуйте,([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'daysleft', /<span[^>]+daysLeft_text[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);

    html = AnyBalance.requestGet(baseurl + 'REPSuite/accountBalance.page', g_headers);
    
    getParam(html, result, 'lastpay', /Последний платеж\s*:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credit', /Кредит\s*:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	if(!result.balance)
		getParam(html, result, 'balance', /Баланс \+ Пени\s*:([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    var table = getParam(html, null, null, /<table[^>]+class="body"[^>]*>(?:[\s\S](?!<\/table>))*?Кампания[\s\S]*?<\/table>/i);
    var tr;
    if(table)
        tr = getParam(table, null, null, /<tr[^>]*>\s*<td[^>]*>[1-9]\d*(?:[\s\S](?!<\/tr>))*?Заказ[\s\S]*?<\/tr>/i);
    if(tr){
        getParam(tr, result, 'orderdate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
        getParam(tr, result, 'paytill', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    }

    //Возвращаем результат
    AnyBalance.setResult(result);
}