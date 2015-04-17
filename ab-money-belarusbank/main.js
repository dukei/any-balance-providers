/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Cache-Control': 'max-age=0',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    if(AnyBalance.getLevel() < 6)
        throw new AnyBalance.Error('Этот провайдер требует AnyBalance API v.6+');

    //AnyBalance.setOptions({SSL_ENABLED_PROTOCOLS: ['SSLv3']});

    var baseurl = "https://ibank.asb.by/";
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Пожалуйста, укажите логин для входа в интернет-банк Беларусбанка!');
	checkEmpty(prefs.password, 'Пожалуйста, укажите пароль для входа в интернет-банк Беларусбанка!');
	
    if(!prefs.codes0 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes0))
        throw new AnyBalance.Error("Неправильно введены коды 1-10! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes1 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes1))
        throw new AnyBalance.Error("Неправильно введены коды 11-20! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes2 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes2))
        throw new AnyBalance.Error("Неправильно введены коды 21-30! Необходимо ввести 10 четырехзначных кодов через пробел.");
    if(!prefs.codes3 || !/^\s*(?:\d{4}\s+){9}\d{4}\s*$/.test(prefs.codes3))
        throw new AnyBalance.Error("Неправильно введены коды 31-40! Необходимо ввести 10 четырехзначных кодов через пробел.");
      
    var html = AnyBalance.requestGet(baseurl + 'wps/portal/ibank/');
    var url = getParam(html, null, null, /<form[^>]+action="\/([^"]*)"[^>]*name="LoginForm1"/i, null, html_entity_decode);
    if(!url){
        var error = getParam(html, null, null, /<font[^>]+color="#FF0000"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    var htmlCodePage = html = AnyBalance.requestPost(baseurl + url, {
        bbIbUseridField:prefs.login,
        bbIbPasswordField:prefs.password,
        bbIbLoginAction:'in-action',
        bbIbCancelAction:''
    });

    var codenum = getParam(html, null, null, /Введите[^>]*>код [N№]\s*(\d+)/i, null, parseBalance);
    if(!codenum){
        var error = getParam(html, null, null, /<p[^>]+class="(?:warning|error)"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

    codenum -= 1; //Потому что у нас коды с 0 нумеруются

    var col = Math.floor(codenum / 10);
    var idx = codenum % 10;
    var codes = replaceAll(prefs['codes' + col], replaceTagsAndSpaces);
    if(!codes)
        throw new AnyBalance.Error('Не введены коды ' + (col+1) + '1-' + (col+2) + '0');

	var form = getParam(html, null, null, /<form[^>]+action="\/wps\/portal\/ibank\/[^"]*"[^>]*name="LoginForm1"[\s\S]*?<\/form>/i);
	if(!form){
        AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму ввода кода. Сайт изменен?');
	}

	var url = getParam(form, null, null, /<form[^>]+action="\/([^"]*)"[^>]*name="LoginForm1"/i, null, html_entity_decode);
    /*if(!url)
        throw new AnyBalance.Error('Не удалось найти форму ввода кода. Сайт изменен?');*/

    codes = codes.split(/\D+/g);
    var code = codes[idx];
    if(!code)
        throw new AnyBalance.Error('Не введен код № ' + (codenum+1));
	
	var params = createFormParams(form, function(params, str, name, value) {
		if (name == 'bbIbCodevalueField') 
			return code;

		return value;
	});	
	
	params.bbIbLoginAction = 'in-action';
	
    html = AnyBalance.requestPost(baseurl + url, params);

    if(!/portalLogoutLink/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]+class="warning"[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error + '( код №' + (codenum+1) + ': ' + code + ')');

        if(/bbIbNewPasswordConfirmField/i.test(html))
            throw new AnyBalance.Error('Интернет банк требует сменить пароль. Пожалуйста, зайдите в интернет банк через браузер, смените пароль, затем новый пароль введите в настройки провайдера.', null, true);
		
        AnyBalance.trace('******* Страница запроса кода *******');
        AnyBalance.trace(htmlCodePage);
        AnyBalance.trace('******* Страница ответа на ввод кода *******');
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк после ввода кода (№' + (codenum+1) + ': ' + code + ') . Сайт изменен?');
    }
	
	var href = getParam(html, null, null, /href="\/([^"]+)">\s*Счета/i, replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(href, 'Не удалось найти ссылку на счета, сайт изменен?', true);
	html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': baseurl}));
	
	fetchCard(baseurl, html);
}

function fetchCard(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
	
	var href = getParam(html, null, null, /href="\/([^"]+)"(?:[^>]*>){1,2}\s*Счета с карточкой/i, replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(href, 'Не удалось найти ссылку на счета, сайт изменен?', true);
	html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': baseurl}));
	
    var re = new RegExp('<tr[^>]*>\\s*<td[^>]*class="tdAccountText">\\s*<div[^>]*>\\s*Счёт №\\d+' + (prefs.lastdigits || '') + '<\\/div>[^]*?<\\/tr>', 'i');
    var tr = getParam(html, null, null, re);
	
    if(!tr)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не найден счет с последними цифрами " + prefs.lastdigits : "Не найдено ни одного счета");
	
    var result = {success: true};
	
    getParam(tr, result, 'cardnum', /<td[^>]*class="tdAccountText">([^]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
	getParam(tr, result, '__tariff', /<td[^>]*class="tdAccountText">([^]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    getParam(tr, result, 'balance', /<td[^>]*class="tdBalance">([^]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance'], /<td[^>]*class="tdBalance">([^]*?)<\/td>/, replaceTagsAndSpaces, parseCurrency);
    
    AnyBalance.setResult(result);
}