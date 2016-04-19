/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

var g_baseurls = { 
	  "Bashko" : "https://online.bm.ru",
      "Habar" : "https://khb-online.mmbank.ru",
      "Hanti" : "https://ekburg-online.mmbank.ru",
      "Irkut" : "https://nsk-online.mmbank.ru",
      "Kalin" : "https://spb-online.mmbank.ru",
      "Kemer" : "https://nsk-online.mmbank.ru",
      "Krasn" : "https://nsk-online.mmbank.ru",
      "Kursk" : "https://online.bm.ru",
      "Moskv" : "https://online.bm.ru",
      "Nizheg" : "https://nnov-online.mmbank.ru",
      "Novos" : "https://nsk-online.mmbank.ru",
      "Omska" : "https://nsk-online.mmbank.ru",
      "Orenb" : "https://nnov-online.mmbank.ru",
      "Perms" : "https://nnov-online.mmbank.ru",
      "Primo" : "https://khb-online.mmbank.ru",
      "Rosto" : "https://online.bm.ru",
      "Sahal" : "https://khb-online.mmbank.ru",
      "Samar" : "https://nnov-online.mmbank.ru",
      "Sankt" : "https://spb-online.mmbank.ru",
      "Sever" : "https://online.bm.ru",
      "Stavr" : "https://online.bm.ru",
      "Sverd" : "https://ekburg-online.mmbank.ru",
      "Tatar" : "https://online.bm.ru",
      "Tul_s" : "https://online.bm.ru",
      "Tyumen" : "https://ekburg-online.mmbank.ru",
      "Volgo" : "https://online.bm.ru",
      "Voron" : "https://online.bm.ru",
      "Yamalo" : "https://ekburg-online.mmbank.ru",
      "Yarosl" : "https://online.bm.ru",
      "adige" : "https://krasnodar-online.mmbank.ru"
};

var g_baseurl = 'https://online.bm.ru';

function isLoggedIn(html){
	return /logout/i.test(html);
}

function hasCaptcha(html){
	return /<span[^>]id="[^"]*:captchaBlock"(?:[^>](?!display:\s*none))*>/i.test(html);
}

function tryLogin(html){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

    var captcha = getCaptcha(html);

	var form = getElement(html, /<form[^>]*loginForm[^>]*>/i);
	if(!form){
		var error = getElement(html, /<div[^>]+id="mainContent"[^>]*>/i, replaceTagsAndSpaces);
		if(error && error.length < 255) //А то вдруг тут будет слишком много текста...
			throw new AnyBalance.Error(error);
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удаётся найти форму входа. Сайт изменен?');
	}
	
	//Не совсем понятно, зачем эта форма...
	var params = createFormParams(form, function(params, str, name, value) {
		if (/:login$/i.test(name)) 
			return prefs.login;
		else if (/:password$/i.test(name))
			return prefs.password;
		else if (/:saveLogin$/i.test(name))
			return;
		else if (/:captchaText$/i.test(name))
			return captcha;

		return value;
	});

	var submit = getParam(form, null, null, /<input[^>]+id="[^"]*:loginBtn"[^>]*>/i);
	var btnid = getParam(submit, null, null, /<input[^>]+id="([^"]*)>/i, replaceHtmlEntities);
	var submitid = getParam(submit, null, null, /execute:\\?'([^'\\]*)/i);
	var render = getParam(submit, null, null, /render:\\?'([^'\\]*)/);
	var formid = getParam(form, null, null, /<form[^>]+id="([^"]*)/i, replaceHtmlEntities);

	params = joinObjects(params, {
	    'javax.faces.behavior.event': 'action',
		'javax.faces.partial.event': 'click',
		'javax.faces.source': btnid,
		'javax.faces.partial.ajax': 'true',
		'javax.faces.partial.execute': submitid,
		'javax.faces.partial.render': render,
		'javax.faces.source': formid
	});

	params[formid] = formid;

	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i);

	var frmhtml = AnyBalance.requestPost(g_baseurl + action, params, addHeaders({Origin: g_baseurl, Referer: g_baseurl + '/scoring/protected/welcome.jsf', 'Faces-Request': 'partial/ajax'}));

	html = AnyBalance.requestPost(g_baseurl + '/scoring/j_security_check', {
		j_username: prefs.login,
		j_password: prefs.password,
		locale: 'ru',
		captcha: captcha
	}, addHeaders({Origin: g_baseurl, Referer: g_baseurl + '/scoring/protected/welcome.jsf'}));

	return html;

}

function findErrors(html){
    var elements = getElements(html, /<(?:[^>](?!display:\s*none))+class="error"(?:[^>](?!display:\s*none))*>/ig, replaceTagsAndSpaces);
    var error = elements.join('\n');
    return error;
}

function getCaptcha(html){
    var captcha = '';
    if(hasCaptcha(html)) //Если капча показана, надо её ввести...
    	captcha = getParam(html, null, null, /<img[^>]+id="[^"]*:jcaptcha"[^>]*src="([^"]*)/i) || '';

    if(captcha){
    	AnyBalance.trace('Надо капчу вводить...');
    	var img = AnyBalance.requestGet(g_baseurl + captcha, g_headers);
    	captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img);
    }

    return captcha;
}

function checkForPasswordChange(html){
	var form = getElements(html, [/<form[^>]*>/ig, /<div[^>]+changePasswordBox/i])[0];
    if(!form)
        return html;

    throw new AnyBalance.Error('Банк требует изменить параметры безопасности. Пожалуйста, войдите в интернет-банк ' + g_baseurl + ' через браузер, выполните требования банка, затем введите логин и новый пароль в настройки провайдера.', null, true);
/*
    var prefs = AnyBalance.getPreferences();
    var params = createFormParams(html, function (params, str, name, value) {
        if (/newPassword/i.test(name))
            return prefs.password;
        else if (/repeatPassword/i.test(name))
            return prefs.password;
        return value;
    });

    var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, replaceHtmlEntities);
    html = AnyBalance.requestPost(joinUrl(g_baseurl, action), params, g_headers);
*/
}

function redirectIfNeeded(html){
	if(AnyBalance.getLastStatusCode() >= 300){
		var redirect = getParam(html, null, null, /location.href\s*=\s*['"]([^'"]*)/);
		if(redirect){
			AnyBalance.trace('redirect: ' + redirect);
			var url = joinUrl(g_baseurl, redirect);
			return AnyBalance.requestGet(url, g_headers);
		}
	}

	return html;
}

function login(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

	if(!prefs.region || !g_baseurls[prefs.region])
		prefs.region = 'Moskv';

	g_baseurl = g_baseurls[prefs.region];
	AnyBalance.trace('Region is ' + prefs.region + ': ' + g_baseurl);

	var html = AnyBalance.requestGet(g_baseurl + '/scoring/protected/welcome.jsf', g_headers);
	html = redirectIfNeeded(html);

	if(isLoggedIn(html)){
		//Уже залогинены
        html = checkForPasswordChange(html);
		return html;
	}

	var wasCaptcha = hasCaptcha(html);

	html = tryLogin(html);

	if(isLoggedIn(html))
		return html;

    form = getElements(html, [/<form[^>]+submitForm[^>]*>/ig, /<input[^>]+name="otp_type"/i])[0];
    if(!form && hasCaptcha(html) && !wasCaptcha){
    	tryLogin(html);
	    
		if(isLoggedIn(html)) {
            html = checkForPasswordChange(html);
            return html;
        }

    	form = getElements(html, [/<form[^>]+submitForm[^>]*>/ig, /<input[^>]+name="otp_type"/i])[0];
    }

    if(!form){
        var error = findErrors(html);
        if(error)
        	throw new AnyBalance.Error(error, null, /Неверно указаны данные для входа/i.test(error));
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

	//Потребовалось otp
    var otpType = getParam(form, null, null, /<input[^>]+name="otp_type"[^>]*value+"([^"]*)/i);
    var msg = getParam(html, null, null, new RegExp('<span[^>]+id="otp_type_' + otpType + '"[^>]*confirmType[^>]*>([\\s\\S]*?)</span>', 'i'), replaceTagsAndSpaces);

    //Запрос смс
    var sessionid = AnyBalance.requestPost(g_baseurl + '/scoring/smsPasswordLoginAjaxServlet', {smsSentTime: new Date().getTime()}, addHeaders({
    	Origin: g_baseurl, 
    	Referer: g_baseurl + '/scoring/j_security_check', 
    	'X-Requested-With': 'XMLHttpRequest'
    }));
    var code = AnyBalance.retrieveCode(msg || 'Введите код подтверждения входа');
    
	var params = createFormParams(form, function(params, str, name, value) {
		if ('otp' == name) 
			return code;
		if ('captcha' == name)
			return getCaptcha(html);
		if ('session_id' == name)
			return sessionid;
		return value;
	});

    html = AnyBalance.requestPost(g_baseurl + '/scoring/j_security_check', params, addHeaders({Origin: g_baseurl, Referer: g_baseurl + '/scoring/protected/welcome.jsf'}));

	if(!/logout/i.test(html)){
        var error = findErrors(html);
		if (error)
			throw new AnyBalance.Error(error);

		AnyBalance.trace(html);
		throw AnyBalance.Error('Не удалось войти в интернет банк. Сайт изменен?');
	}

    html = checkForPasswordChange(html);
	return html;
}

function processCards(html, result){
    if(!AnyBalance.isAvailable('cards'))
        return;

	AnyBalance.trace('Читаем карты');

	var cardsBlocks = getElements(html, /<div[^>]+class="cardsBlock"[^>]*>/ig);
	if(cardsBlocks.length == 0){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти блок карт. Карты отсутствуют?');
		return;
	}

	var cards = [];
	for(var i=0; i<cardsBlocks.length; ++i){
		cards = cards.concat(getElements(cardsBlocks[i], /<div[^>]+productShort[^>]*>/ig));
	}

	AnyBalance.trace('Найдено ' + cards.length + ' карт');

	result.cards = [];

	for(var i=0; i<cards.length; ++i){
		var card = cards[i];
		var id = getParam(card, null, null, /statement\/card\/(\d+)/i);
		//Ищем <td> содержащую два спана, второй с номером карты
		var namecontainer = getParam(card, null, null, /<td[^>]*>\s*<span[^>]*>[^<]*<\/span>\s*<span[^>]*>[^<]*\d{4}\s*<\/span>\s*<\/td>/i);
		var name = getParam(namecontainer, null, null, null, [replaceTagsAndSpaces, /\*[*\s]+\*/g, '*']);
		var num = getParam(card, null, null, /[\*\d]{4}\s+[\*\d]{4}\s+[\*\d]{4}\s+\d{4}/i, replaceTagsAndSpaces);
		var c = {
			__id: id, 
			__name: name,
			num: num
		};
		if(__shouldProcess('cards', c)){
			getParam(namecontainer, c, 'cards.type', /<span[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces);
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processInfo(html, result){
    if(!AnyBalance.isAvailable('info'))
        return;

    result.info = {};

	var prefs = AnyBalance.getPreferences();
	getParam(html, result.info, 'info.fio', /<div[^>]*class="clientName"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	getParam(prefs.login, result.info, 'info.login');
}

function processCard(html, result){
	AnyBalance.trace('Обрабатываем карту ' + result.__name);

	getParam(html, result, 'cards.balance', /<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.currency', /<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'cards.name', /<div[^>]+aliasBox[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

	if(AnyBalance.isAvailable('cards.debt_late', 'cards.minpay', 'cards.debt', 'cards.gracepay', 'cards.gracepay_till', 'cards.limit', 'cards.blocked', 'cards.sms', 'cards.till', 'cards.transactions')){
		html = AnyBalance.requestGet(g_baseurl + '/scoring/protected/statement/card/' + result.__id, g_headers);
		var table = getElement(html, /<table[^>]+bigCardShadow[^>]*>/i, replaceHtmlEntities);

		getParam(table, result, 'cards.debt_late', /Просроченная задолженность:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'cards.minpay', /Минимальный платеж:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'cards.debt', /Всего задолженность:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'cards.date_start', /Дата открытия карты:([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(table, result, 'cards.pct', /Процентная ставка:([^<]*)/i, replaceTagsAndSpaces, parseBalance);

		getParam(table, result, 'cards.blocked', /Заблокировано:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		getParam(table, result, 'cards.sms', /Подключено SMS-информирование на номера:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);
		getParam(table, result, 'cards.till', /Действительна до:([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(table, result, 'cards.limit', /Кредитный лимит:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'cards.gracepay', /Сумма платежа в льготном периоде:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'cards.gracepay_till', /Сумма платежа в льготном периоде:[\s\S]*?<span[^>]*>\s*до([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseDate);

		if(AnyBalance.isAvailable('cards.transactions')){
			processCardTransactions(html, result);
		}
	}
}

function processAccounts(html, result){
    if(!AnyBalance.isAvailable('accounts'))
        return;

    AnyBalance.trace('Читаем счета');

    var cards = getElements(html, [/<div[^>]+productShort[^>]*>/ig, /statement\/account\/./i]);
    if(!cards.length){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти блок счетов. счета отсутствуют?');
        return;
    }

    AnyBalance.trace('Найдено ' + cards.length + ' счетов');

    result.accounts = [];

    for(var i=0; i<cards.length; ++i){
        var card = cards[i];
        var id = getParam(card, null, null, /statement\/account\/(\d+)/i);
        //Ищем <td> содержащую два спана, второй с номером карты
        var num = getParam(card, null, null, /(?:\d(?:\s+|&nbsp;|&#160;)*){20}/i, replaceTagsAndSpaces);
        var c = {
            __id: id,
            __name: num,
            num: num.replace(/\s+/g, '')
        };
        if(__shouldProcess('accounts', c)){
            processAccount(card, c);
        }

        result.accounts.push(c);
    }
}

function processAccount(html, result){
    AnyBalance.trace('Обрабатываем счет ' + result.__name);

    getParam(html, result, 'accounts.balance', /<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'accounts.currency', /<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'accounts.name', /<div[^>]+aliasBox[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

    if(AnyBalance.isAvailable('accounts.date_start', 'accounts.contract')){
        html = AnyBalance.requestGet(g_baseurl + '/scoring/protected/statement/account/' + result.__id, g_headers);
        var table = getElement(html, /<table[^>]+productFull[^>]*>/i, replaceHtmlEntities);

        getParam(table, result, 'accounts.date_start', /Дата открытия счета:([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(table, result, 'accounts.contract', /Номер договора:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces);

        if(AnyBalance.isAvailable('accounts.transactions')){
            processAccountTransactions(html, result);
        }
    }
}

function processCredits(html, result){
    if(!AnyBalance.isAvailable('credits'))
        return;

    AnyBalance.trace('Читаем кредиты');

    var cards = getElements(html, [/<div[^>]+productShort[^>]*>/ig, /statement\/credit\/./i]);
    if(!cards.length){
        AnyBalance.trace(html);
        AnyBalance.trace('Не удалось найти блок кредитов. Кредиты отсутствуют?');
        return;
    }

    AnyBalance.trace('Найдено ' + cards.length + ' кредитов');

    result.credits = [];

    for(var i=0; i<cards.length; ++i){
        var card = cards[i];
        var id = getParam(card, null, null, /statement\/credit\/(\d+)/i);
        var title = getElement(card, /<span[^>]+id="[^"]*:aliasText"[^>]*>/i, replaceTagsAndSpaces);
        //Договор N
        var num = getParam(card, null, null, /&#1044;&#1086;&#1075;&#1086;&#1074;&#1086;&#1088; [N№]([^<]*)/i, replaceTagsAndSpaces);
        var c = {
            __id: id,
            __name: title + ' ' + num,
            num: num
        };
        if(__shouldProcess('credits', c)){
            processCredit(card, c);
        }

        result.credits.push(c);
    }
}

function processCredit(html, result){
    AnyBalance.trace('Обрабатываем кредит ' + result.__name);

    getParam(html, result, 'credits.balance', /<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'credits.currency', /<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
    getParam(html, result, 'credits.name', /<div[^>]+aliasBox[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);

    //Ежемесячный платеж:
    getParam(html, result, 'credits.minpay', /&#1045;&#1078;&#1077;&#1084;&#1077;&#1089;&#1103;&#1095;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1090;&#1077;&#1078;:[\s\S]*?<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
    //Дата списания:
    getParam(html, result, 'credits.minpay_till', /&#1044;&#1072;&#1090;&#1072; &#1089;&#1087;&#1080;&#1089;&#1072;&#1085;&#1080;&#1103;:([^<]*)/i, replaceTagsAndSpaces, parseDate);

    if(AnyBalance.isAvailable('credits.debt_late', 'credits.pct', 'credits.date_start', 'credits.period', 'credits.cardnum', 'credits.accnum')){
        html = AnyBalance.requestGet(g_baseurl + '/scoring/protected/statement/credit/' + result.__id, g_headers);
        var table = getElement(html, /<table[^>]+productFull[^>]*>/i, replaceHtmlEntities);

        getParam(table, result, 'credits.debt_late', /Просроченная задолженность:[\s\S]*?<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'credits.pct', /Процентная ставка:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'credits.date_start', /Дата выдачи кредита:([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(table, result, 'credits.till', /Дата окончания кредита:([^<]*)/i, replaceTagsAndSpaces, parseDate);
        getParam(table, result, 'credits.period', /Срок кредита:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        getParam(table, result, 'credits.contract', /Номер Договора: N?([^<]*)/i, replaceTagsAndSpaces);
        getParam(table, result, 'credits.cardnum', /Карта для погашения кредита:[\s\S]*?<a[^>]*>([\s\S]*?)(?:\(|<\/a>)/i, replaceTagsAndSpaces);
        getParam(table, result, 'credits.accnum', /Счет для погашения кредита:[\s\S]*?<a[^>]*>([\s\S]*?)(?:\(|<\/a>)/i, replaceTagsAndSpaces);
/*
        if(AnyBalance.isAvailable('accounts.transactions')){
            processAccountTransactions(html, result);
        } */
    }

}


function getViewState(html){
	return getParam(html, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]*value="([^"]*)/i);
}

function transliterate(word){

    var answer = "";
    var a = {}

    a["Ё"]="YO";a["Й"]="I";a["Ц"]="TS";a["У"]="U";a["К"]="K";a["Е"]="E";a["Н"]="N";a["Г"]="G";a["Ш"]="SH";a["Щ"]="SCH";a["З"]="Z";a["Х"]="H";a["Ъ"]="_";
    a["ё"]="yo";a["й"]="i";a["ц"]="ts";a["у"]="u";a["к"]="k";a["е"]="e";a["н"]="n";a["г"]="g";a["ш"]="sh";a["щ"]="sch";a["з"]="z";a["х"]="h";a["ъ"]="_";
    a["Ф"]="F";a["Ы"]="I";a["В"]="V";a["А"]="a";a["П"]="P";a["Р"]="R";a["О"]="O";a["Л"]="L";a["Д"]="D";a["Ж"]="ZH";a["Э"]="E";
    a["ф"]="f";a["ы"]="i";a["в"]="v";a["а"]="a";a["п"]="p";a["р"]="r";a["о"]="o";a["л"]="l";a["д"]="d";a["ж"]="zh";a["э"]="e";
    a["Я"]="Ya";a["Ч"]="CH";a["С"]="S";a["М"]="M";a["И"]="I";a["Т"]="T";a["Ь"]="_";a["Б"]="B";a["Ю"]="YU";
    a["я"]="ya";a["ч"]="ch";a["с"]="s";a["м"]="m";a["и"]="i";a["т"]="t";a["ь"]="_";a["б"]="b";a["ю"]="yu";

    for (i = 0; i < word.length; ++i){

        answer += a[word[i]] === undefined ? word[i] : a[word[i]];
    }   
    return answer;
}

function extractRegions(){
	var html = AnyBalance.requestGet(g_baseurl + '/private/web.jsf');
	var select = getElement(html, /<select[^>]+id="region"[^>]*>/i);
	var options = getElements(select, /<option[^>]*>/ig);

	var names = [];
	var values = [];
	var valsite = {};

	for(var i=0; i<options.length; ++i){
		var name = getParam(options[i], null, null, null, replaceTagsAndSpaces);
		var val = replaceAll(name, [/Республика\s*/i, '', /\s+.*$/, '']).substr(0, 5);
		val = transliterate(val);
		var site = getParam(options[i], null, null, /<option[^>]+value="([^"]*)/i);

		valsite[val] = site;
		names.push(name);
		values.push(val);
	}

	AnyBalance.setResult({
		success: true,
		valsite: valsite,
		names: names.join('|'),
		values: values.join('|')
	});
}