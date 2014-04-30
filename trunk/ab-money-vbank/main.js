/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    var baseurl = 'https://online.bankcard.ru/';
    AnyBalance.setDefaultCharset('utf-8');
    
    if(prefs.num && !/^\d{4}$/.test(prefs.num))
        throw new AnyBalance.Error("Введите последние 4 цифры карты или не вводите ничего, чтобы показать информацию по первой карте.");

    var html = AnyBalance.requestGet(baseurl + 'client/logon?ReturnUrl=%2fclient%2f', g_headers);

	var params = createFormParams(html, function(params, str, name, value){
		if(name == 'Mode')
			return 'password';
		else if(name == 'UserName')
			return prefs.login;
		else if(name == 'Password')
			return prefs.password;			
		return value;
	});

    html = AnyBalance.requestPost(baseurl + 'client/logon?ReturnUrl=%2fclient%2f', params, addHeaders({Referer: baseurl + 'client/logon?ReturnUrl=%2fclient%2f'}));
    if(!/client\/logoff/i.test(html)){
        var error = getParam(html, null, null, [/<div[^>]class="error"[^>]*>([\s\S]*?)<\/div>/i, /class="[^>]*error[^>]*>([^<]*)/i], replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error);
        if(/changepassword.aspx/i.test(html)){
            AnyBalance.requestGet(baseurl + 'logout.aspx'); //На всякий случай попробуем выйти, но вообще-то ничего кроме смены пароля сделать почему-то нельзя...
            throw new AnyBalance.Error('Банк требует сменить пароль. Пожалуйста, зайдите в интернет-банк https://online.bankcard.ru через браузер, смените пароль, а затем введите новый пароль в настройки провайдера.');
        }
        throw new AnyBalance.Error("Не удалось зайти в интернет-банк. Сайт изменился?");
    }
    try{
        html = AnyBalance.requestGet(baseurl + 'client/contracts');
        var reCard = new RegExp('<a[^>]+href=[\'"](/client/?[^\'"]*)[\'"][^>]*>\\s*\\d{4}\\s*XXXX\\s*XXXX\\s*' + (prefs.num ? prefs.num : '\\d{4}'), 'i');
        var href = getParam(html, null, null, reCard, null, html_entity_decode);
        
        if(!href){
            if(prefs.num)
                throw new AnyBalance.Error('Не удалось найти карты с последними цифрами ' + prefs.num);
            else
                throw new AnyBalance.Error('Не удалось найти ни одной карты!');
        }
        
        html = AnyBalance.requestGet(baseurl + href);
        
        var result = {success: true};
        
        getParam(html, result, 'cardnum', /Номер:(?:[\s\S]*?<[^>]*td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, ['currency', 'balance'], /Валюта:(?:[\s\S]*?<[^>]*td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, 'cardname', /Наименование:(?:[\s\S]*?<[^>]*td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, '__tariff', /Наименование:(?:[\s\S]*?<[^>]*td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, 'till', /Срок действия:(?:[\s\S]*?<[^>]*td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(html, result, 'status', /Статус:\s*(?:[\s\S]*?<[^>]*td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces);
        getParam(html, result, 'balance', /Доступные средства:(?:[\s\S]*?<[^>]*td[^>]*>){2}([^<]*)/i, replaceTagsAndSpaces, parseBalance);
    }finally{
        AnyBalance.requestGet(baseurl + 'client/logoff');
        AnyBalance.trace("Вышли из системы");
    }
    
    AnyBalance.setResult(result);
}