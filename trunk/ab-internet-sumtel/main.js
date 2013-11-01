/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'*/*',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36',
	'Origin':'http://my.sumtel.ru/'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    var baseurl = 'http://my.sumtel.ru/';
    AnyBalance.setDefaultCharset('utf-8');

	// Есть возможность получения баланса без капчи, но только баланса и все.
	if(prefs.type == 'balance') {
		var html = AnyBalance.requestGet('http://sbmsapi.sumtel.ru/get_bill.php?l='+encodeURIComponent(prefs.login)+'&p='+encodeURIComponent(prefs.password));

		if(/error/i.test(html)) {
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Причина: ' + html);
		}

		var result = {success: true};
		getParam(html, result, 'balance', /bill':([\d\.]*)/i, replaceTagsAndSpaces, parseBalance);

		AnyBalance.setResult(result);
	} else {
		var html = AnyBalance.requestGet(baseurl + 'ps/scc/login.php?SECONDARY_LOGIN=1');
		var session = getParam(html, null, null, /name="PHPSESSID"[^>]*value="([^"]*)/i);

		var captchaa;
		if(AnyBalance.getLevel() >= 7){
			AnyBalance.trace('Пытаемся ввести капчу');
			var captcha = AnyBalance.requestGet(baseurl+ '/ps/scc/php/cryptographp.php');
			captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
			AnyBalance.trace('Капча получена: ' + captchaa);
		}else{
			throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
		}
		
		html = AnyBalance.requestPost(baseurl + 'ps/scc/php/check.php', {
			PHPSESSID:session,
			LOGIN:prefs.login,
			PASSWORD:prefs.password,
			CODE:captchaa
		}, addHeaders({Referer: baseurl})); 
		
		session = getParam(html, null, null, /<SESSION_ID>([\s\S]*?)<\/SESSION_ID>/i);
		
		if(!session){
			var error = getParam(html, null, null, /<ERROR_ID>([\s\S]*?)<\/ERROR_ID>/i, replaceTagsAndSpaces, html_entity_decode);
			if(error == -3)
				throw new AnyBalance.Error('Введите цифры с картинки!');
			else if(error == -6)
				throw new AnyBalance.Error('Вы ввели не верные символы с картинки! Попробуйте еще раз');
			throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
		}
		
		html = AnyBalance.requestPost(baseurl + 'SCC/SC_BASE_LOGIN', {
			SESSION_ID:session,
			LOGIN:prefs.login,
			PASSWD:prefs.password,
			CHANNEL:'WWW'
		}, addHeaders({Referer: baseurl + 'ps/scc/login.php?SECONDARY_LOGIN=1'})); 
		
		html = AnyBalance.requestPost(baseurl + 'SCWWW/ACCOUNT_INFO', {
			SESSION_ID:session,
			CHANNEL:'WWW',
			P_USER_LANG_ID:'1',
			find:''
		}, addHeaders({Referer: baseurl + 'SCC/SC_BASE_LOGIN'})); 

		var result = {success: true};
		getParam(html, result, 'fio', /class="group-client"[^>]*>([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'acc_num', /&#1051;&#1080;&#1094;&#1077;&#1074;&#1086;&#1081; &#1089;&#1095;&#1077;&#1090;:(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;(?:[\s\S]*?<div[^>]*>){2}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, '__tariff', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089; &#1072;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1072;:(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		getParam(html, result, 'abon', /&#1040;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1089;&#1082;&#1072;&#1103; &#1087;&#1083;&#1072;&#1090;&#1072;(?:[\s\S]*?<div[^>]*>){1}([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);

		AnyBalance.setResult(result);
	}
}

function mainMy(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "http://my.sumtel.ru/";
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestGet(baseurl);

    AnyBalance.trace('Authenticating');
    html = AnyBalance.requestPost(baseurl + 'ps/scc/php/check.php', {
        LOGIN:prefs.login,
        PASSWORD:prefs.password});

    AnyBalance.trace('Got result from service guide: ' + html);

    var matches;
    if(matches = html.match(/<ERROR_ID>(.*?)<\/ERROR_ID>/i)){
        var errid = matches[1];
        AnyBalance.trace('Got error from sg: ' + errid);
        //Случилась ошибка, может быть мы можем даже увидеть её описание
        if(matches = html.match(/<ERROR_MESSAGE>(.*?)<\/ERROR_MESSAGE>/i)){
            AnyBalance.trace('Got error message from sg: ' + matches[1]);
            throw new AnyBalance.Error(matches[1]);
        }

        errid = "js.login.error." + Math.abs(parseInt(errid));
        if(GlbLoginJSPhrases[errid])
            throw new AnyBalance.Error(GlbLoginJSPhrases[errid]);

        AnyBalance.trace('Got unknown error from sg');
        throw new AnyBalance.Error(GlbLoginJSPhrases['js.login.error.0']);
    }

    if(!(matches = html.match(/<SESSION_ID>(.*?)<\/SESSION_ID>/i))){
        throw new AnyBalance.Error('Не удалось получить сессию');
    }

    var result = {success: true};
    var S = matches[1];

    html = AnyBalance.requestPost(baseurl + 'SCWWW/ACCOUNT_INFO', {
        SESSION_ID:S,
        CHANNEL:'WWW'});

    getParam(html, result, 'fio', /<div[^>]*class="group-client"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    //Баланс
    getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;:[\s\S]*?<div[^>]*class="[^"]*td_def[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Текущий тарифный план
    getParam(html, result, '__tariff', /&#1058;&#1077;&#1082;&#1091;&#1097;&#1080;&#1081; &#1090;&#1072;&#1088;&#1080;&#1092;&#1085;&#1099;&#1081; &#1087;&#1083;&#1072;&#1085;:[\s\S]*?<div[^>]*class="[^"]*td_def[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    //Абонентская плата по услугам
    getParam(html, result, 'abon', /&#1040;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1089;&#1082;&#1072;&#1103; &#1087;&#1083;&#1072;&#1090;&#1072; &#1087;&#1086; &#1091;&#1089;&#1083;&#1091;&#1075;&#1072;&#1084;:[\s\S]*?<div[^>]*class="[^"]*td_def[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    //Статус абонента
    getParam(html, result, 'status', /&#1057;&#1090;&#1072;&#1090;&#1091;&#1089; &#1072;&#1073;&#1086;&#1085;&#1077;&#1085;&#1090;&#1072;:[\s\S]*?<div[^>]*class="[^"]*td_def[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
}

var GlbLoginJSPhrases = {};
GlbLoginJSPhrases['js.login.error.1'] = 'Введите логин!';
GlbLoginJSPhrases['js.login.error.2'] = 'Введите пароль!';
GlbLoginJSPhrases['js.login.error.3'] = 'Введите защитный код!';
GlbLoginJSPhrases['js.login.error.4'] = 'Неверный префикс.';
GlbLoginJSPhrases['js.login.error.5'] = 'Защитный код устарел.';
GlbLoginJSPhrases['js.login.error.6'] = 'Введен неверный защитный код.';
GlbLoginJSPhrases['js.login.error.7'] = 'Выберите контрольный вопрос.';
GlbLoginJSPhrases['js.login.error.8'] = 'Введите ответ на контрольный вопрос.';
GlbLoginJSPhrases['js.login.error.9'] = 'Вам недоступен список контрольных вопросов.';
GlbLoginJSPhrases['js.login.error.10'] = 'Передан неизвестный параметр.';
GlbLoginJSPhrases['js.login.error.11'] = 'Ваш ответ слишком короткий.';
GlbLoginJSPhrases['js.login.error.12'] = 'Не заполнено поле со старым паролем.';
GlbLoginJSPhrases['js.login.error.13'] = 'Не заполнено поле с новым паролем.';
GlbLoginJSPhrases['js.login.error.14'] = 'Не заполнено поле подтверждения пароля.';
GlbLoginJSPhrases['js.login.error.100'] = 'Вход в систему самообслуживания. Пожалуйста подождите.';
GlbLoginJSPhrases['js.login.error.200'] = 'Ошибка запроса на сервер. Обратитесь, пожалуйста, в службу поддержки.';
GlbLoginJSPhrases['js.login.error.0'] = 'Ошибка. Сервис недоступен. Обратитесь, пожалуйста, в службу поддержки.';
