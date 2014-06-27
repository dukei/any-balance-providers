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

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    if(!prefs.plate || !/^.\d\d\d..\d{2,3}$/i.test(prefs.plate))
        throw new AnyBalance.Error('Введите номер машины в формате cXXXccRR для автомобиля или XXXXccRR для мотоцикла, где с - буква, X - цифра, RR - номер региона (2 или 3 цифры).');
    if(!prefs.sr)
        throw new AnyBalance.Error('Введите последние 6 цифр номера свидетельства о регистрации.');
    
    var baseurl = 'https://uslugi.tatarstan.ru/';
	
    var html = AnyBalance.requestGet(baseurl + 'user/login', g_headers);
	
    var form = getParam(html, null, null, /<form[^>]+id="login-form"[^>]*>([\s\S]*?)<\/form>/i, null, html_entity_decode);
    if(!form)
        throw new AnyBalance.Error('Не удалось найти форму входа. Сайт изменен?');
	
    var params = createFormParams(form, function(params, str, name, value){
        if(/phone_number/i.test(name))
            return prefs.login;
        if(/password/i.test(name))
            return prefs.password;
        if(/remember_me/i.test(name))
            return '0';
        return value;
    });
	
    html = AnyBalance.requestPost(baseurl + 'user/login', params, addHeaders({Referer: baseurl + ''}));
	
    if(!/is_user_authorized\s*=\s*true/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*id=["']error_explanation[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }
	
    var isAuto = /^\D/.test(prefs.plate);
    var number = getParam(prefs.plate, null, null, /^.\d\d\d../);
    var region = getParam(prefs.plate, null, null, /(\d+)$/);
	
    html = AnyBalance.requestPost(baseurl + 'gibdd/fines/getFromApi', {
        findType:'car',
        type_ts:isAuto ? 'auto' : 'moto',
        number:number,
        region:region,
        doc_nm:prefs.sr,
        find_protocol_region:'',
        find_protocol_series:'',
        find_protocol_number:'',
        find_protocol_date:''
    }, addHeaders({'x-requested-with':'XMLHttpRequest'}));
	
	var json = getJson(html);
	
	for(var i = 0; i < 20; i++) {
		AnyBalance.sleep(1000);
		
		html = AnyBalance.requestGet(baseurl + 'gibdd/fines/getBy/message_id/' + (json.message_id || json.id), g_headers);
		
		json = getJson(html);
		
		if(json.status != 'in_processing') {
			AnyBalance.trace('Данные успешно обновлены за ' + i + ' сек.');
			break;
		}
	}
	
	var result = {success: true};
	
	if(/<h2>Штрафов не найдено<\/h2>/i.test(html)) {
		AnyBalance.trace('Не найдено штрафов..');
		getParam('0', result, 'balance', null, replaceTagsAndSpaces, parseBalance);
	} else {
		/*var finesTable = getParam(html, null, null, /<table[^>]*class="extra-table"[^>]*>([\s\S]*?)<\/table>/i) || '';
		
		getParam(html, result, 'count', /Найдено\s*(\d+)/i, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'balance', /штраф[^<]*?на сумму ([^<]*)/i, replaceTagsAndSpaces, parseBalance);
		sumParam(finesTable, result, 'lastdate', /<tr[^>]*>\s*(?:(?:[\s\S](?!<\/tr))*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_max);
		sumParam(finesTable, result, 'firstdate', /<tr[^>]*>\s*(?:(?:[\s\S](?!<\/tr))*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate, aggregate_min);*/
		if(!json.response.fines) {
			AnyBalance.trace('Не найдено штрафов..');
			getParam('0', result, 'balance', null, replaceTagsAndSpaces, parseBalance);		
		}
		
		getParam(json.response.fines.length+'', result, 'count', null, replaceTagsAndSpaces, parseBalance);
		
		for(var z = 0; z < json.response.fines.length; z++) {
			var current = json.response.fines[z];
			
			sumParam(current.amount+'', result, 'balance', null, replaceTagsAndSpaces, parseBalance, aggregate_sum);
			sumParam(current.date+'', result, 'lastdate', null, replaceTagsAndSpaces, parseDate, aggregate_max);
			sumParam(current.date+'', result, 'firstdate', null, replaceTagsAndSpaces, parseDate, aggregate_min);
		}
	}
	
    AnyBalance.setResult(result);
}