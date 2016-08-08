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
	
	//if(prefs.cabinet == 'new')
		doNewCabinet(prefs)
	//else
		//doOldCabinet(prefs);
}

function doNewCabinet(prefs) {
	AnyBalance.trace('Входим в новый кабинет...');
	
	AnyBalance.setDefaultCharset('utf-8');
	var baseurl = 'https://lk.alloincognito.ru/';
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);

	var form = getElement(html, /<form[^>]+com-form-login[^>]*>/i);
	if(!form){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	}

	var params = AB.createFormParams(form, function(params, str, name, value) {
		if (name == 'LoginForm[abon_num]') {
			return prefs.prefix + prefs.login;
		} else if (name == 'LoginForm[password]') {
			return prefs.password;
		}

		return value;
	});


	html = AnyBalance.requestPost(baseurl + 'login', params, addHeaders({Referer: baseurl + 'login', 'Origin': baseurl}));
	
	if (/<form[^>]+"js-form-accept"/i.test(html)) {
		AnyBalance.trace("Требуется принять оферту. Принимаем...");
		//Надо оферту принять, а то в кабинет не пускает
		html = AnyBalance.requestPost(baseurl + 'contract-offer', {
			task: 'offer.acceptOffer'
		}, addHeaders({Referer: baseurl + 'contract-offer','Origin': baseurl}));
	}
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, />\s*Ошибка([\s\S]*?)<\/div/i, replaceTagsAndSpaces);
		if (error)
			throw new AnyBalance.Error(error, null, /Не найден|парол/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};
	
	getParam(html, result, 'fio', /"person-info"(?:[^>]*>){2}([\s\S]*?<\/span[\s\S]*?)<\/span/i, replaceTagsAndSpaces);
	getParam(html, result, 'balance', />\s*Баланс(?:[^>]*>){2}([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);

	html = AnyBalance.requestGet(baseurl + 'ajax/sets', g_headers);
	var json = getJson(html);
	
	for(var i=0; i<json.length; ++i){
		var s = json[i];
		sumParam(s.main_abon_num, result, 'phone', null, null, null, aggregate_join);
		sumParam(s.tariff_plan_term, result, '__tariff', null, null, null, aggregate_join);
	}

	if(AnyBalance.isAvailable('internet')){
		html = AnyBalance.requestGet(baseurl + 'ajax/set-limits?app_id=' + json[0].app_id, g_headers);
		json = getJson(html);

		for(var i=0; i<json.limits.length; ++i){
			var l = json.limits[i];
			if(/мб/i.test(l.accum_unit)){
				sumParam(l.accum_remainder, result, 'internet', null, null, parseBalance, aggregate_sum);
			}
		}
	}
	

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