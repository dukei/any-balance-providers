/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();

    if(AnyBalance.getLevel() < 6)
        throw new AnyBalance.Error('Этот провайдер требует AnyBalance API v.6+');

    AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['SSLv3']});

    var baseurl = "https://ibank.asb.by/wps/portal/ibank/";
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login)
        throw new AnyBalance.Error("Пожалуйста, укажите логин для входа в интернет-банк Беларусбанка!");
    if(!prefs.password)
        throw new AnyBalance.Error("Пожалуйста, укажите пароль для входа в интернет-банк Беларусбанка!");

    if(!prefs.codes0 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes0))
        throw new AnyBalance.Error("Неправильно введены коды 1-10! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes1 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes1))
        throw new AnyBalance.Error("Неправильно введены коды 11-20! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes2 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes2))
        throw new AnyBalance.Error("Неправильно введены коды 21-30! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes3 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes3))
        throw new AnyBalance.Error("Неправильно введены коды 31-40! Необходимо ввести 10 четырехзначных кодов через пробел.");
      
    var html = AnyBalance.requestGet(baseurl);
    var url = getParam(html, null, null, /<form[^>]+action="\/wps\/portal\/ibank\/([^"]*)"[^>]*name="LoginForm1"/i, null, html_entity_decode);
    if(!url){
        var error = getParam(html, null, null, /<font[^>]+color="#FF0000"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + url, {
        bbIbUseridField:prefs.login,
        bbIbPasswordField:prefs.password,
        bbIbLoginAction:'in-action',
        bbIbCancelAction:''
    });

    var codenum = getParam(html, null, null, /Введите код N\s*(\d+)/i, null, parseBalance);
    if(!codenum){
        var error = getParam(html, null, null, /<p[^>]+class="warning"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    codenum -= 1; //Потому что у нас коды с 0 нумеруются

    var col = Math.floor(codenum / 10);
    var idx = codenum % 10;
    var codes = replaceAll(prefs['codes' + col], replaceTagsAndSpaces);
    if(!codes)
        throw new AnyBalance.Error('Не введены коды ' + (col+1) + '1-' + (col+2) + '0');

	var form = getParam(html, null, null, /<form[^>]+action="\/wps\/portal\/ibank\/[^"]*"[^>]*name="LoginForm1"[\s\S]*?<\/form>/i);
	if(!form)
		throw new AnyBalance.Error('Не удалось найти форму ввода кода. Сайт изменен?');

	var url = getParam(form, null, null, /<form[^>]+action="\/wps\/portal\/ibank\/([^"]*)"[^>]*name="LoginForm1"/i, null, html_entity_decode);
    /*if(!url)
        throw new AnyBalance.Error('Не удалось найти форму ввода кода. Сайт изменен?');*/

    codes = codes.split(/\D+/g);
    var code = codes[idx];
    if(!code)
        throw new AnyBalance.Error('Не введен код № ' + (codenum+1));
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'bbIbCodevalueField') 
			return code*1;

		return value;
	});	
	
	params.bbIbLoginAction = 'in-action';
	
	//
    html = AnyBalance.requestPost(baseurl + url, params);

    if(!/portalLogoutLink/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+class="warning"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error + '( код №' + (codenum+1) + ': ' + code + ')');
        throw new AnyBalance.Error('Не удалось войти в интернет-банк после ввода кода (№' + (codenum+1) + ': ' + code + ') . Сайт изменен?');
    }

    fetchCard(baseurl, html);
}

function fetchCard(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");

    var cards = getParam(html, null, null, /<table[^>]+id="[^"]*ibWelcomePageForm:ibCardList"[\s\S]*?<\/table>/i);
    if(!cards)
        throw new AnyBalance.Error("Не найдена таблица карт. У вас нет ни одной карты?");

    var re = new RegExp('<tr[^>]*>(?:[\\s\\S](?!</tr>))*?\\d{4}\\*{8}' + (prefs.lastdigits ? prefs.lastdigits : '\\d{4}') + '[\\s\\S]*?</tr>', 'i');
    var tr = getParam(cards, null, null, re);

    if(!tr)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не найдено карты с последними цифрами " + prefs.lastdigits : "Не найдено ни одной карты");
    var result = {success: true};
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}
