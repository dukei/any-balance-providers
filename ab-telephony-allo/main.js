/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите номер телефона!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(prefs.cabinet == 'new')
		doNewCabinet(prefs)
	else
		doOldCabinet(prefs);
}

function doNewCabinet(prefs) {
	AnyBalance.trace('Входим в новый кабинет...');
	
        AnyBalance.setDefaultCharset('utf-8');
	var baseurl = 'https://www.alloincognito.ru/';
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	var instanceNo = 0;	var captchaa;
	
	if(AnyBalance.getLevel() >= 7){
		AnyBalance.trace('Пытаемся ввести капчу');
		
		var href = getParam(html, null, null, /src\s*=\s*['"](https:\/\/www.alloincognito.ru\/index.php\?showCaptcha=[^'"]+)['"]/);
		checkEmpty(href, 'Не удалсоь найти картинку капчи, сайт изменен?', true);
		
		var captcha = AnyBalance.requestGet(href);
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	}else{
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
	var hidden = /<input type="hidden" name="([0-9a-z]{32})" value="([^"]*)"\s*\/>/i.exec(html);
	if(!hidden)
		throw new AnyBalance.Error('Не удалось найти форму входа, сайт изменен?');
	
	var param = hidden[1];
	var value = hidden[2];
	
	var loginParams = {
		code:prefs.prefix || '',
		username:prefs.login,
		passwd:prefs.password,
		osolCatchaTxt:captchaa,
		osolCatchaTxtInst:instanceNo,
		option:'com_user',
		view:'login',
		task:'login',
	};
	
	loginParams[param] = value;
	
	html = AnyBalance.requestPost(baseurl + 'ru/login', loginParams, addHeaders({
		Referer: baseurl + 'login',
		'Origin':'https://www.alloincognito.ru',
	}));
	
	if (/<form[^>]+name="oferta_authorization"/i.test(html)) {
		AnyBalance.trace("Требуется принять оферту. Принимаем...");
		//Надо оферту принять, а то в кабинет не пускает
		html = AnyBalance.requestPost(baseurl + 'ru/cabinet-contractoffer', {
			oferta: 1,
			task: 'setOfertaАuthorization'
		}, addHeaders({Referer: baseurl + 'ru/cabinet-contractoffer','Origin': 'https://www.alloincognito.ru',}));
	}
	if (!/exit=1"/i.test(html)) {
		var error = getParam(html, null, null, />Ошибка([^>]*>){4}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Имя пользователя и пароль не совпадают|учетная запись отсутствует/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /id="info_block"([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'phone', /id="info_block"([^>]*>){6}/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(html, result, 'balance', /Баланс\s*:([^>]*>){2}/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', /Тариф\s*:([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
	
	AnyBalance.setResult(result);	
}

function doOldCabinet(prefs) {
	AnyBalance.trace('Входим в старый кабинет...');
    var baseurl = "https://my.alloincognito.ru/clients/";
    AnyBalance.setDefaultCharset('windows-1251');
	
    var html = AnyBalance.requestPost(baseurl + '?sc=allo', {
        sc:'allo',
        action:',go',
        'interface':'AUTO',
        prefix:prefs.prefix,
        login:prefs.login,
        password:prefs.password
    });
	
    if(!/\?action=logout/i.test(html)){
        var error = getParam(html, null, null, /<ul[^>]+class="errortext"[^>]*>([\s\S]*?)<\/ul>/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неправильный логин-пароль?');
    }
	
    var result = {success: true};
	
    html = AnyBalance.requestGet(baseurl + 'skel.cgi?sc=allo&action=setup');
    getParam(html, result, 'phone', /Ваш «Инкогнито номер»:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Ваш «Инкогнито номер»:([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'fio', /<th[^>]*>\s*Абонент[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
	
    if(AnyBalance.isAvailable('balance') || !isset(result.__tariff)){
        html = AnyBalance.requestGet(baseurl + 'skel.cgi?sc=allo&action=detal');

        getParam(html, result, 'balance', /Остаток на счете:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, '__tariff', [/Тарифный(?:\s|\&nbsp;)план([^>]*>){4}/i, /Ваш «Инкогнито номер»:([^<]*)/i], replaceTagsAndSpaces, html_entity_decode);
    }
	
    AnyBalance.setResult(result);
}