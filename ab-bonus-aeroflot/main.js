/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс миль в программе Aeroflot Bonus.

Сайт оператора: http://aeroflotbonus.ru/
Личный кабинет: https://www.aeroflot.ru/personal/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Language': 'ru,en-US;q=0.8,en;q=0.6',
	'Cache-Control': 'max-age=0',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.99 Safari/537.36'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
    checkEmpty(prefs.login, 'Введите логин');
    checkEmpty(prefs.login, 'Введите пароль');

    var baseurl = "https://www.aeroflot.ru/personal/";
    AnyBalance.setDefaultCharset('utf-8');
    
    var html = requestPostMultipart(baseurl + 'login', {
    	return_url: '',
    	login: prefs.login,
    	password: prefs.password,
    	submit0: 'Подождите...',
    }, addHeaders({
    	Origin: "https://www.aeroflot.ru",
    	Referer: baseurl + 'login'
    }));
	if (!/\/personal\/logout/i.test(html)) {
		var error = getParam(html, null, null, /<div[^>]+class="[^"]*error[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /указали неправильные реквизиты/.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось войти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
	
    getParam(html, result, 'balance', /<td[^>]+id="member_miles_value"[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /<div[^>]+class="name"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces, html_entity_decode);

    if(/signconsentform/i.test(html)){
	AnyBalance.trace('Аэрофлот просит подписать согласие какое-то. Подписываем, ибо иначе придется отказываться от всех милей всё равно.');
	var form = getParam(html, null, null, /<form[^>]+name="signconsentform"[^>]*>([\s\S]*?)<\/form>/i);
	var params = createFormParams(form);
	html = requestPostMultipart(baseurl + 'sign_consent', params, addHeaders({
        	Origin: "https://www.aeroflot.ru",
        	Referer: baseurl + 'sign_consent'
        }));
    }

    if(AnyBalance.isAvailable('qmiles', 'segments')){
	var html = AnyBalance.requestPost(baseurl + 'services/widgets_bulk', {
		widgets:'["miles_exp_date","miles_summary"]',
	}, addHeaders({
    		Origin: "https://www.aeroflot.ru",
    		Referer: AnyBalance.getLastUrl(),
		'X-Requested-With':'XMLHttpRequest'
	}));
	var json = getJson(html);
	if(json.data){
		for(var i=0; i<json.data.length; ++i){
			var o = json.data[i];
			if(!isset(o.current_year_miles_amount))
				continue;
			
    			getParam(o.current_year_miles_amount, result, 'qmiles');
    			getParam(o.current_year_segments_amount, result, 'segments');
			break;
		}
	}else{
		AnyBalance.trace('Информация о квалификационных милях не вернулась: ' + html);
	}
		
    }

    if(AnyBalance.isAvailable('balance') && !isset(result.balance)){
        AnyBalance.trace('Баланс не на странице. Попробуем получить аяксом.');
	html = AnyBalance.requestGet(baseurl + 'ajax/mile_balance', addHeaders({Referer: baseurl, 'X-Requested-With': 'XMLHttpRequest'}));
        getParam(html, result, 'balance', /\d+/i, replaceTagsAndSpaces, parseBalance);
    }
	
    AnyBalance.setResult(result);
}

