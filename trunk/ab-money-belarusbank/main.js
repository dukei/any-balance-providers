/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Language': 'ru,en;q=0.8',
	'Connection': 'keep-alive',
	'Cache-Control': 'max-age=0',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.65 Safari/537.36',
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
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
    }

    html = AnyBalance.requestPost(baseurl + url, {
        bbIbUseridField:prefs.login,
        bbIbPasswordField:prefs.password,
        bbIbLoginAction:'in-action',
        bbIbCancelAction:''
    });

    var codenum = getParam(html, null, null, /Введите[^>]*>код [N№]\s*(\d+)/i, null, parseBalance);
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

	var url = getParam(form, null, null, /<form[^>]+action="\/([^"]*)"[^>]*name="LoginForm1"/i, null, html_entity_decode);
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

        if(/bbIbNewPasswordConfirmField/i.test(html))
            throw new AnyBalance.Error('Интернет банк требует сменить пароль. Пожалуйста, зайдите в интернет банк через браузер, смените пароль, затем новый пароль введите в настройки провайдера.', null, true);
		
        throw new AnyBalance.Error('Не удалось войти в интернет-банк после ввода кода (№' + (codenum+1) + ': ' + code + ') . Сайт изменен?');
    }
	
	var href = getParam(html, null, null, /href="\/([^"]+)">\s*Счета/i, replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(href, 'Не удалось найти ссылку на счета, сайт изменен?', true);
	html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': baseurl}));
	
	if(prefs.type == 'dep') {
		fetchDep(baseurl, html);
	} else {
		fetchCard(baseurl, html);
	}
}

function fetchDep(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры депозита или не указывать ничего");
	
	var href = getParam(html, null, null, /href="\/([^"]+)"(?:[^>]*>){1,2}\s*Депозиты/i, replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(href, 'Не удалось найти ссылку на депозиты, сайт изменен?', true);
	html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': baseurl}));
	
    /*var cards = getParam(html, null, null, /<table[^>]+id="[^"]*ibWelcomePageForm:ibCardList"[\s\S]*?<\/table>/i);
    if(!cards)
        throw new AnyBalance.Error("Не найдена таблица карт. У вас нет ни одной карты?");
	*/
	// <tr[^>]*>(?:[^>]*>){16,20}\s*\d*1278[\\s\\S]*?</tr>
    var re = new RegExp('<tr[^>]*>(?:[^>]*>){14,20}\\s*' + (prefs.lastdigits ? prefs.lastdigits : '\\d{4}') + '[\\s\\S]*?</tr>', 'i');
    var tr = getParam(html, null, null, re);
	
    if(!tr)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не найдено депозита с последними цифрами " + prefs.lastdigits : "Не найдено ни одного депозита!");
	
    var result = {success: true};
	
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
	
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
	if(isAvailable('balance')) {
		var action = getParam(html, null, null, /<form[^>]*action="\/(wps\/myportal[^"]+QCPpagesQCPuserDepositCSDList\.jsp[^"]*\/=\/)/i, replaceTagsAndSpaces, html_entity_decode);
		checkEmpty(action, 'Не удалось найти ссылку на баланс, сайт изменен?', true);
		
		var a = getParam(tr, null, null, /<a[^>]*>Получить<\/a>/i);
		var viewns = getParam(a, null, null, /id="([^:"]+:DepositCSDListForm)/i);
		var viewns2 = getParam(a, null, null, /id="([^"]+)/i);
		var viewns3 = getParam(tr, null, null, /input type="radio"[^>]*name="([^"]+)/i);
		var depositUniqueId = getParam(a, null, null, /depositUniqueId[^=]+='([^']+)/i);
		
		var balanceParams = [
			[viewns + ':ibSDTSelField', depositUniqueId],
			[viewns3, ''],
			[viewns + ':closedDepoActive', 'false'],
			['com.sun.faces.VIEW', getParam(html, null, null, /name="com.sun.faces.VIEW"[^>]*value="([^"]+)/i)],
			[viewns, viewns],
			['pageId', ''],
			['depositUniqueId', depositUniqueId],
			[viewns + ':_idcl', viewns2],
		];
		
		html = AnyBalance.requestPost(baseurl + 'wps/PA_rdDepositsCSDlist/SelectDepositCsdServlet', {
			depositUniqueId: depositUniqueId
		}, addHeaders({'Referer': baseurl + href, 'Origin': 'https://ibank.asb.by'}));
		
		html = AnyBalance.requestPost(baseurl + action, balanceParams, addHeaders({'Referer': baseurl + href, 'Origin': 'https://ibank.asb.by'}));
		//html = AnyBalance.requestPost(baseurl + action, balanceParams, addHeaders({'Referer': baseurl + href, 'Origin': 'https://ibank.asb.by'}));
	}
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    
    AnyBalance.setResult(result);
}

function fetchCard(baseurl, html){
    var prefs = AnyBalance.getPreferences();

    if(prefs.lastdigits && !/^\d{4}$/.test(prefs.lastdigits))
        throw new AnyBalance.Error("Надо указывать 4 последних цифры карты или не указывать ничего");
	
	var href = getParam(html, null, null, /href="\/([^"]+)"(?:[^>]*>){1,2}\s*Плат[ёе]жные карты/i, replaceTagsAndSpaces, html_entity_decode);
	checkEmpty(href, 'Не удалось найти ссылку на карты, сайт изменен?', true);
	html = AnyBalance.requestGet(baseurl + href, addHeaders({'Referer': baseurl}));
	
    /*var cards = getParam(html, null, null, /<table[^>]+id="[^"]*ibWelcomePageForm:ibCardList"[\s\S]*?<\/table>/i);
    if(!cards)
        throw new AnyBalance.Error("Не найдена таблица карт. У вас нет ни одной карты?");
	*/
	// <tr[^>]*>(?:[^>]*>){18,20}\s*\d{4}\*{8}[\s\S]*?</tr>
    var re = new RegExp('<tr[^>]*>(?:[^>]*>){18,20}\\s*\\d{4}\\*{8}' + (prefs.lastdigits ? prefs.lastdigits : '\\d{4}') + '[\\s\\S]*?</tr>', 'i');
    var tr = getParam(html, null, null, re);
	
    if(!tr)
        throw new AnyBalance.Error(prefs.lastdigits ? "Не найдено карты с последними цифрами " + prefs.lastdigits : "Не найдено ни одной карты");
	
    var result = {success: true};
	
    getParam(tr, result, 'cardnum', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
	getParam(tr, result, '__tariff', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
	
	
    getParam(tr, result, 'balance', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, parseBalance);
    getParam(tr, result, ['currency', 'balance'], /(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/, replaceTagsAndSpaces, html_entity_decode);
    
    AnyBalance.setResult(result);
}