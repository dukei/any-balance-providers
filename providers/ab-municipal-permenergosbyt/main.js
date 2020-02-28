/**
Показания счетчика Пермэнергосбыт (http://any-balance-providers.googlecode.com)

Получает баланс на счету оплаты электроэнергии

Operator site: http://permenergosbyt.ru/
Личный кабинет: http://lk.permenergosbyt.ru/
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.99 Safari/537.36'
};

function redirectIfNeeded(html){
    if(/document.forms\[0\].submit/i.test(html)){
    	AnyBalance.trace('Потребовался редирект формой...');
    	var params = createFormParams(html);
    	var action = getParam(html, /<form[^>]+action=['"]([^'"]*)/, replaceHtmlEntities);
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestPost(joinUrl(url, action), params, addHeaders({Refefer: url}));
    }
    var redir = getParam(html, /<meta[^>]+http-equiv="REFRESH"[^>]*content="0;url=([^";]*)/i, replaceHtmlEntities);
    if(redir){
    	AnyBalance.trace('Потребовался get редирект...');
    	var url = AnyBalance.getLastUrl();
    	html = AnyBalance.requestGet(joinUrl(url, redir), addHeaders({Refefer: url}));
    }
    return html;
}

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.phone, 'Введите телефон!');

    var baseurl = "https://lk.permenergosbyt.ru/";

    AnyBalance.setDefaultCharset('utf-8');

    // Не обязательно запрашивать форму перед её отправкой
    // var html = AnyBalance.requestGet(baseurl + 'personal/show', g_headers);

    html = AnyBalance.requestPost(baseurl + 'personal/show', {
        "action": 'login',
        "login": prefs.login,
        "phone": prefs.phone
    }, addHeaders({Referer: baseurl + 'personal/show'}));
    html = redirectIfNeeded(html);

    var form = getElement(html, /<form[^>]+(?:name="auth")/i);
    var reAccount = /Лицевой счёт\: (\d+)/i;

    if (form || !/action="logout"/i.test(html), !reAccount.test(html)) {
        var error = getElement(html, /<div[^>]+(?:alert)/i, replaceTagsAndSpaces);
        if (error)
            throw new AnyBalance.Error('Не удалось войти в личный кабинет. ' + error.replace('×', ''));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    var result = {success: true};

    getParam(html, result, 'account', reAccount, replaceTagsAndSpaces);
    result.balance = -getParam(html, null, null, /<tr[^>]+class="tr-pay-total"+>.*?<\/tr>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'fio', /<p><strong>ФИО\: <\/strong>(.*?)<\/p>/i, replaceTagsAndSpaces);
    getParam(html, result, 'address', /<p><strong>Адрес\: <\/strong>(.*?)<\/p>/i, replaceTagsAndSpaces);
    getParam(html, result, 'date', /alert.*?\:\s+(.+?)<\/strong>/i, replaceTagsAndSpaces, parseDate);
/*
    getParam(html, result, 'balance', reBalance, [/Долг(?:\s|&nbsp;)*:/i, '-', replaceTagsAndSpaces], parseBalance);
    getParam(html, result, 'fio', /ФИО(?:\s|&nbsp;)*:\s*([\s\S]*?)<\/p>/i, replaceTagsAndSpaces);
    getParam(html, result, 'number', /Номер счетчика(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, '__tariff', /Тариф(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(html, result, 'tariffNumber', /Ставка тарифа(?:[\s\S]*?<td[^>]*>){8}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
*/
    //Возвращаем результат
    AnyBalance.setResult(result);
}
