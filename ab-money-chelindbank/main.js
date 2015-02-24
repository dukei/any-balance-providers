/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = "https://www.chelindbank.ru/ib2/";
    
    var headers = {
        'Accept-Language': 'ru, en',
        Referer: baseurl + 'Logon.aspx',
        Origin: baseurl + 'Logon.aspx',
        'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.1 (KHTML, like Gecko) Chrome/21.0.1180.60 Safari/537.1'
    }

    var html = AnyBalance.requestPost(baseurl + 'Logon.aspx', {
        login:prefs.login,
        password:prefs.password,
        submit:'Submit'
    }, headers);

    if(!/action=logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*id="login_error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось зайти в интернет-банк. Сайт изменен?');
    }

    if(prefs.type == 'acc')
        fetchAccount(html, headers, baseurl);
    else
        fetchCard(html, headers, baseurl); //По умолчанию карты будем получать
}

function fetchCard(html, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера карты или не вводите ничего, чтобы показать информацию по первой карте");

	var re = new RegExp('(<tr[^>]*>\\s*<td[^>]*class="ui-narrowest(?:[^>]*>){20}[^>]*\\d{4}XXXXXXXX' + (prefs.cardnum ? prefs.cardnum : '\\d{4}') + '[\\s\\S]*?</tr>)', 'i');
    var tr = getParam(html, null, null, re);

    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'карту с последними цифрами ' + prefs.cardnum : 'ни одной карты'));

    var result = {success: true};
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}

function fetchAccount(html, headers, baseurl){
    var prefs = AnyBalance.getPreferences();
    if(prefs.cardnum && !/^\d{4}$/.test(prefs.cardnum))
        throw new AnyBalance.Error("Введите 4 последних цифры номера счета или не вводите ничего, чтобы показать информацию по первому счету");
	
	// <tr>\s*<td[^>]*class="ui-narrowest(?:[^>]*>){5}\s*\d{6,}1189[\s\S]*?</tr>
    var re = new RegExp('<tr>\\s*<td[^>]*class="ui-narrowest(?:[^>]*>){5}\\s*\\d{6,}' + (prefs.cardnum || '') + '[\\s\\S]*?</tr>', 'i');
    var tr = getParam(html, null, null, re);

    if(!tr)
        throw new AnyBalance.Error('Не удаётся найти ' + (prefs.cardnum ? 'счет с первыми цифрами ' + prefs.cardnum : 'ни одного счета'));

    var result = {success: true};
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, 'accnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces);
    AnyBalance.setResult(result);
}