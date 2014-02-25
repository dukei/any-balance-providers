/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_regionsById = {
    ultranet: getUltranet,
    cifra1: getCifra1
};

var g_regionsByUrl = {
    'https://stat.ultranet.ru/login/': 'ultranet',
    'http://stat.cifra1.ru/amsc/auth.jsf': 'cifra1',
};

var g_headers = {
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    checkEmpty(prefs.login && /^\d{10}$/.test(prefs.login), 'Логин должен состоять из 10 цифр');
    checkEmpty(prefs.password, 'Введите пароль!');
	
    var params, region;
    if(!prefs.region || prefs.region == 'auto' || !g_regionsById[prefs.region]){
        var info = AnyBalance.requestGet('http://www.cifra1.ru/office/sites.json?login=' + encodeURIComponent(prefs.login), addHeaders({
            Referer: 'http://www.cifra1.ru/r/homeusers/',
            "X-Requested-With":'XMLHttpRequest'
        }));

        var json = getJson(info);
        if(json.type != "correct"){
            AnyBalance.trace(JSON.stringify(json));
            throw new AnyBalance.Error('Неверный номер договора: ' + prefs.login, null, true);
        }
        params = {};
        params[json.login_var] = prefs.login;
        params[json.pass_var] = prefs.password;

        var region = g_regionsByUrl[json.url];
        if(!region)
            throw new AnyBalance.Error('Личный кабинет для вашего номера договора: ' + json.url + '. К сожалению, он пока не поддерживается. Обратитесь к автору провайдера по е-мейл, чтобы добавить его поддержку.');
    }else{
        region = prefs.region;    
    }
	
    AnyBalance.trace('region: ' + region);
    g_regionsById[region](region, params);
}

function getCifra1(region, params){
    var baseurl = 'http://stat.cifra1.ru/amsc/';
    var prefs = AnyBalance.getPreferences();
    var headers = g_headers;
    if(!params){
/*        var html = AnyBalance.requestGet(baseurl);
        headers = addHeaders({Referer:baseurl});

        params = {
		'html:authForm:html':'authForm',
		'html:authForm:loginInputText':prefs.login,
		'html:authForm:j_id_id47':prefs.password,
		'html:authForm:j_id_id62':'Войти',
		'javax.faces.ViewState':'j_id1'
        };
*/
        params = {
            from_url_9: '',
            'html:authForm:loginInputText':prefs.login,
            'html:authForm:j_id_id45':prefs.password
        };
   }

    var html = AnyBalance.requestPost(baseurl + 'auth.jsf', params);
 
 	if (!/log__out/i.test(html)) {
		var error = getParam(html, null, null, /<tr\s*class="error"([^>]*>){3}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Пользователь не найден/i.test(error));
		
		AnyBalance.trace(html_entity_decode(html));
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Неверный логин или пароль, проблемы на сайте или сайт изменен.');
	}
	
	var result = {success: true};
	//Баланс
    getParam(html, result, 'balance', /&#1041;&#1072;&#1083;&#1072;&#1085;&#1089;:([\S\s]*?)(\||<a)/i, replaceTagsAndSpaces, parseBalance);
    //Лицевой счет: 
    getParam(html, result, 'agreement', /&#1051;&#1080;&#1094;&#1077;&#1074;&#1086;&#1081; &#1089;&#1095;&#1105;&#1090;:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    var services = getParam(html, null, null, /<table[^>]+id="[^"]*services"[\s\S]*?<\/table>/i);
    if(services){
        //Ищем кроме бесплатного тарифного плана
        sumParam(services, result, '__tariff', /<tr(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/ig, [/&#1041;&#1077;&#1089;&#1087;&#1083;&#1072;&#1090;&#1085;&#1099;&#1081;/, '', replaceTagsAndSpaces], html_entity_decode, aggregate_join);
    }else{
        AnyBalance.trace('Не удалось найти таблицу услуг!');
    }

    AnyBalance.setResult(result);
}    


function getUltranet(region, params){
    var baseurl = 'https://stat.ultranet.ru/';
    var prefs = AnyBalance.getPreferences();

    if(!params)
        params = {
            login: prefs.login,
            password: prefs.password,
            email: ''
        };

    var html = AnyBalance.requestPost(baseurl + 'login/', params);
 
    if(!/\/login\/destroySessionId/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]*class=["'][^"']*error[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error, null, /неверный логин/i.test(error));
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Баланс:([\S\s]*?)<span/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'status', /Состояние доступа:[\S\s]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'agreement', /PIN:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, '__tariff', /Тариф:[\S\s]*?<td[^>]*>([\S\s]*?)(?:<\/td>|<a)/i, replaceTagsAndSpaces, html_entity_decode);
    AnyBalance.setResult(result);
}    
