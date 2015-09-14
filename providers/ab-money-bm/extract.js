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

    var captcha = getCaptcha(html);

	var form = getElement(html, /<form[^>]*loginForm[^>]*>/i);
	if(!form){
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

	var submit = getParam(form, null, null, /<input[^>]+id="[^"]*:saveLogin"[^>]*>/i);
	var submitid = getParam(submit, null, null, /input[^>]+id="([^"]*)/i, null, html_entity_decode);
	var render = getParam(submit, null, null, /render:\\?'([^'\\]*)/, null, html_entity_decode);

	params = joinObjects(params, {
	    'javax.faces.behavior.event': 'action',
		'javax.faces.partial.event': 'click',
		'javax.faces.source': submitid,
		'javax.faces.partial.ajax': 'true',
		'javax.faces.partial.execute': submitid,
		'javax.faces.partial.render': render
	});

	params[submitid] = submitid;

	var action = getParam(form, null, null, /<form[^>]+action="([^"]*)/i, null, html_entity_decode);

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
    var elements = getElements(html, /<(?:[^>](?!display:\s*none))+class="error"(?:[^>](?!display:\s*none))*>/ig, replaceTagsAndSpaces, html_entity_decode);
    var error = elements.join('\n');
    return error;
}

function getCaptcha(html){
    var captcha = '';
    if(hasCaptcha(html)) //Если капча показана, надо её ввести...
    	captcha = getParam(html, null, null, /<img[^>]+id="[^"]*:jcaptcha"[^>]*src="([^"]*)/i, null, html_entity_decode) || '';

    if(captcha){
    	AnyBalance.trace('Надо капчу вводить...');
    	var img = AnyBalance.requestGet(g_baseurl + captcha, g_headers);
    	captcha = AnyBalance.retrieveCode('Пожалуйста, введите код с картинки', img);
    }

    return captcha;
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
	if(isLoggedIn(html)){
		//Уже залогинены
		return html;
	}

	var wasCaptcha = hasCaptcha(html);

	html = tryLogin(html);

	if(isLoggedIn(html))
		return html;

    form = getElements(html, [/<form[^>]+submitForm[^>]*>/ig, /<input[^>]+name="otp_type"/i])[0];
    if(!form && hasCaptcha(html) && !wasCaptcha){
    	tryLogin(html);
	    
		if(isLoggedIn(html))
			return html;

    	form = getElements(html, [/<form[^>]+submitForm[^>]*>/ig, /<input[^>]+name="otp_type"/i])[0];
    }

    if(!form){
        var error = findErrors(html);
        if(error)
        	throw new AnyBalance.Error(error, null, /Неверно указаны данные для входа/i);
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в интернет-банк. Сайт изменен?');
    }

	//Потребовалось otp
    var otpType = getParam(form, null, null, /<input[^>]+name="otp_type"[^>]*value+"([^"]*)/i, null, html_entity_decode);
    var msg = getParam(html, null, null, new RegExp('<span[^>]+id="otp_type_' + otpType + '"[^>]*confirmType[^>]*>([\\s\\S]*?)</span>', 'i'), replaceTagsAndSpaces, html_entity_decode);

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

	return html; 
}

function processCards(html, result){
	AnyBalance.trace('Читаем карты');

	var cardsBlock = getElement(html, /<div[^>]+class="cardsBlock"[^>]*>/i);
	if(!cardsBlock){
		AnyBalance.trace(html);
		AnyBalance.trace('Не удалось найти блок карт. Карты отсутствуют?');
		return;
	}

	var cards = getElements(cardsBlock, /<div[^>]+productShort[^>]*>/ig);
	AnyBalance.trace('Найдено ' + cards.length + ' карт');

	result.cards = [];

	for(var i=0; i<cards.length; ++i){
		var card = cards[i];
		var id = getParam(card, null, null, /statement\/card\/(\d+)/i);
		//Ищем <td> содержащую два спана, второй с номером карты
		var namecontainer = getParam(card, null, null, /<td[^>]*>\s*<span[^>]*>[^<]*<\/span>\s*<span[^>]*>[^<]*\d{4}\s*<\/span>\s*<\/td>/i);
		var name = getParam(namecontainer, null, null, null, [replaceTagsAndSpaces, /\*[*\s]+\*/g, '*'], html_entity_decode);
		var c = {
			__id: id, 
			__name: name
		};
		if(__shouldProcess('cards', c)){
			getParam(namecontainer, c, 'cards.num', /<span[^>]*>([^<]*)<\/span>\s*<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(namecontainer, c, 'cards.type', /<span[^>]*>([^<]*)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
			processCard(card, c);
		}

		result.cards.push(c);
	}
}

function processInfo(html, result){
	var prefs = AnyBalance.getPreferences();
	getParam(html, result, 'fio', /<div[^>]*class="clientName"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
	getParam(prefs.login, result, 'email');
}

function processCard(html, result){
	getParam(html, result, 'cards.balance', /<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, 'cards.currency', /<span[^>]+amountBox[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseCurrency);
	getParam(html, result, 'cards.name', /<div[^>]+aliasBox[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

	if(AnyBalance.isAvailable('cards.blocked', 'cards.sms', 'cards.till', 'cards.transactions')){
		html = AnyBalance.requestGet(g_baseurl + '/scoring/protected/statement/card/' + result.__id, g_headers);

		//Заблокировано:
		getParam(html, result, 'cards.blocked', /&#1047;&#1072;&#1073;&#1083;&#1086;&#1082;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1086;:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
		//Подключено SMS-информирование на номера:
		getParam(html, result, 'cards.sms', /&#1055;&#1086;&#1076;&#1082;&#1083;&#1102;&#1095;&#1077;&#1085;&#1086; SMS-&#1080;&#1085;&#1092;&#1086;&#1088;&#1084;&#1080;&#1088;&#1086;&#1074;&#1072;&#1085;&#1080;&#1077; &#1085;&#1072; &#1085;&#1086;&#1084;&#1077;&#1088;&#1072;:[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'cards.till', /&#1044;&#1077;&#1081;&#1089;&#1090;&#1074;&#1080;&#1090;&#1077;&#1083;&#1100;&#1085;&#1072; &#1076;&#1086;:([^<]*)/i, replaceTagsAndSpaces, parseDate);
		
		if(AnyBalance.isAvailable('cards.transactions')){
			processCardTransactions(html, result);
		}
	}
}

function n2(n) { return n < 10 ? '0' + n : '' + n; }

function getViewState(html){
	return getParam(html, null, null, /<input[^>]+name="javax.faces.ViewState"[^>]*value="([^"]*)/i, null, html_entity_decode);
}

function processCardTransactions(html, result){
	var form = getElement(html, /<form[^>]+id="tableForm"[^>]*>/i);
	var dt = new Date();
	var dtFrom = new Date(dt.getFullYear() - 3, dt.getMonth(), dt.getDate());
	var params = createFormParams(form, function(params, str, name, value) {
		if ('beginDate' == name) 
			return n2(dtFrom.getDate()) + '.' + n2(dtFrom.getMonth()) + '.' + n2(dtFrom.getYear());
		else if ('endDate' == name)
			return n2(dt.getDate()) + '.' + n2(dt.getMonth()) + '.' + n2(dt.getYear());
		else if (/ViewState/i.test(name))
			return getViewState(html);
		else if (/\w+Button/.test(name))
			return;

		return value;
	});
	
	var printid = getParam(html, null, null, /<a[^>]+id="([^"]*:printBtn)"/i, null, html_entity_decode);
	params['tableForm:_idcl'] = printid;

	html = AnyBalance.requestPost(g_baseurl + '/scoring/protected/statement/card/' + result.__id, params, addHeaders({Origin: g_baseurl, Referer: AnyBalance.getLastUrl()}));

	var trs = getElements(html, [/<tr[^>]*>/ig, /<td[^>]+border:\s*1[^>]*>/i]);
	
	result.transactions = [];

	var cols = null;
	for(var j=0; j<trs.length; ++j){
		var tr = trs[j];
		
		if(/ИТОГО:/i.test(tr))
			break; //Последняя строка
		
		if(!cols && /Дата(\s|<[^>]*>)+операции/i.test(tr)){ //Заголовок
			var colsa = getElements(tr, /<td[^>]*>/ig);
			cols = {}
			for(var i=0; i<colsa.length; ++i){
				var col = replaceAll(colsa[i], [replaceTagsAndSpaces, replaceHtmlEntities]);
				if(/Дата операции/i.test(col))
					cols.date = i;
				else if(/Сумма операции/i.test(col))
					cols.sum = i;
				else if(/Валюта операции/i.test(col))
					cols.currency = i;
				else if(/Дата оплаты/i.test(col))
					cols.date_done = i;
				else if(/Комиссия/i.test(col))
					cols.fee = i;
				else if(/Описание/i.test(col))
					cols.descr = i;
			}
			continue;
		}

		var tds = getElements(tr, /<td[^>]*>/ig);
		
		var t = {};
		if(cols.hasOwnProperty('date'))
			getParam(tds[cols.date], t, 'cards.transactions.date', null, replaceTagsAndSpaces, parseDate);
		if(cols.hasOwnProperty('date_done'))
			getParam(tds[cols.date_done], t, 'cards.transactions.date_done', null, replaceTagsAndSpaces, parseDate);
		if(cols.hasOwnProperty('sum'))
			getParam(tds[cols.sum], t, 'cards.transactions.sum', null, replaceTagsAndSpaces, parseBalance);
		if(cols.hasOwnProperty('currency'))
			getParam(tds[cols.currency], t, ['cards.transactions.currency', 'cards.transactions.sum'], null, replaceTagsAndSpaces, html_entity_decode);
		if(cols.hasOwnProperty('fee'))
			getParam(tds[cols.fee], t, 'cards.transactions.fee', null, replaceTagsAndSpaces, parseBalance);
		if(cols.hasOwnProperty('descr'))
			getParam(tds[cols.descr], t, 'cards.transactions.descr', null, replaceTagsAndSpaces, html_entity_decode);

		result.transactions.push(t);
	}
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
		var name = getParam(options[i], null, null, null, replaceTagsAndSpaces, html_entity_decode);
		var val = replaceAll(name, [/Республика\s*/i, '', /\s+.*$/, '']).substr(0, 5);
		val = transliterate(val);
		var site = getParam(options[i], null, null, /<option[^>]+value="([^"]*)/i, null, html_entity_decode);

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