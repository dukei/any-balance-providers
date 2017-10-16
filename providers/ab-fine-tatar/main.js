/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html, application/xhtml+xml, image/jxr, */*',
	'Accept-Language': 'ru,en-US;q=0.7,en;q=0.3',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection': 'Keep-Alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.10240',
	'Cache-Control': 'no-cache',
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    if(!prefs.plate || !/^.\d\d\d..\d{2,3}$/i.test(prefs.plate))
        throw new AnyBalance.Error('Введите номер машины в формате cXXXccRR для автомобиля или XXXXccRR для мотоцикла, где с - буква, X - цифра, RR - номер региона (2 или 3 цифры).');
    if(!prefs.sr)
        throw new AnyBalance.Error('Введите последние 6 цифр номера свидетельства о регистрации.');
    
    var baseurl = 'https://uslugi.tatarstan.ru/';
	
    var html = AnyBalance.requestGet(baseurl, g_headers);

    if (!html || AnyBalance.getLastStatusCode() > 400) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }
	
    var form = getParam(html, null, null, /<form[^>]+action="[^"]+user\/login"[^>]*>([\s\S]*?)<\/form>/i, null, html_entity_decode);
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
    var params = createFormParams(form, function(params, str, name, value){
        if(/phone_number/i.test(name))
            return prefs.login;
        if(/password/i.test(name))
            return prefs.password;
        if(/remember_me/i.test(name))
            return '1';
        return value;
    });
	
    html = AnyBalance.requestPost(baseurl + 'user/login', params, addHeaders({Referer: baseurl}));
	
	/*
	cookie:PHPSESSID=mrg7pon70a6ciuap2km3etv877; user_id=1033048; passwd_hash=95765202e373b801890672567c466c4d2e01b4f5; _ga=GA1.3.333398957.1440405474; _gat=1; _pk_id.48.53d4=e921c84074a5110d.1440405474.1.1440405474.1440405474.; _pk_ses.48.53d4=*; _ym_visorc_13106635=w
	*/
	
    if(!/is_user_authorized\s*=\s*true/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*id=["']error_explanation[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
		AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
	
    var isAuto = /^\D/.test(prefs.plate);
    var number = getParam(prefs.plate, null, null, /^.\d\d\d../);
    var region = getParam(prefs.plate, null, null, /(\d+)$/);
	
    var finesHtml = AnyBalance.requestPost(baseurl + 'gibdd/fines/getFromApi', {
        number:number,
        region:region,
        doc_nm:prefs.sr,
        type_ts:isAuto ? 'auto' : 'moto',
    }, addHeaders({'x-requested-with':'XMLHttpRequest'}));
	
	var json = getJson(finesHtml);
	var message_id = json.message_id;

	var max_tries = 60;	
	for(var i = 0; i < max_tries; i++) {
		AnyBalance.sleep(1000);
		
		finesHtml = AnyBalance.requestGet(baseurl + 'gibdd/fines/getBy/message_id/' + message_id, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
		json = getJson(finesHtml);
		
		if(json.status == 'completed') {
			AnyBalance.trace('Данные успешно обновлены за ' + (i+1) + ' попыток.');
			break;
		}
		if(json.status == 'error') {
			throw new AnyBalance.Error(error);
		}
	}

	if(i>=max_tries){
		AnyBalance.trace(finesHtml);
		throw new AnyBalance.Error('Не удалось получить данные по штрафам за приемлемое время. Попробуйте ещё раз позже');
	}

	var result = {success: true};

	if (!isset(json.response) || !isset(json.response.fines) || !json.response.fines.length) {
			AnyBalance.trace('Не найдено штрафов..');
			getParam('0', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
		}
	else {
		try {
			getParam(json.response.fines.length + '', result, 'count', null, replaceTagsAndSpaces, parseBalance);
		} catch(e){}

		for(var z = 0; z < json.response.fines.length; z++) {
			var current = json.response.fines[z];

			sumParam(current.amount+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			sumParam(current.date+'', result, 'lastdate', null, replaceTagsAndSpaces, parseDate, aggregate_max);
			sumParam(current.date+'', result, 'firstdate', null, replaceTagsAndSpaces, parseDate, aggregate_min);
		}
	}
	
    AnyBalance.setResult(result);
}