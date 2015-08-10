/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900; en-US) AppleWebKit/534.11+ (KHTML, like Gecko) Version/7.0.0.187 Mobile Safari/534.11+'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://www.reg.ru/";

    var html = AnyBalance.requestGet(baseurl + 'user/login?nocache=8834', g_headers);
	
	html = AnyBalance.requestPost(baseurl + 'user/login?nocache=8834', {
		login: prefs.login,
		password: prefs.password,
		'ajax': '1',
		'confirmation_code': '',
		'sms_session_id': '',
	}, addHeaders({
		Referer: baseurl + 'user/',
		'x-requested-with':'XMLHttpRequest'
	}));
	
	var json = getJsonEval(html);
	
	if (json.auth_ok != '1') {
		var error = getParam(json.error, null, null, /<p class="red">([^>]*>){2}/i, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	html = AnyBalance.requestGet(baseurl + json.auth_return_path, g_headers);
	
	var result = {success: true};
	
    getParam(html, result, 'balance', /<!--\s*баланс\s*-->(?:[^>]*>){5}([^<]*)/i, replaceTagsAndSpaces, parseBalance);

	if(isAvailable(['domain_0', 'domain_1', 'domain_2', 'domain_date_0', 'domain_date_1', 'domain_date_2', ])) {
		html = AnyBalance.requestGet(baseurl + 'user/domain_list?nocache=1597782', g_headers);
		
		var allDomains = sumParam(html, null, null, /<tr\s+valign="middle"(?:[^>]*>){4}[^>]*номер сервиса в таблице(?:[\s\S]*?<\/tr[^>]*>){1}/ig);
		AnyBalance.trace('Найдено доменов: ' + allDomains.length);
		
		for(var i = 0; i < allDomains.length; i++) {
			var curr = allDomains[i];
			getParam(curr, result, 'domain_'+i, /<tr\s+valign="middle"(?:[^>]*>){16}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(curr, result, 'domain_date_'+i, /--\s*окончание\s*--(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
			
			// В манифесте только 3 объявлено
			if(i >= 3)
				break;
		}
	}
	// Услуги
	if(isAvailable(['service_0', 'service_1', 'service_2', 'service_date_0', 'service_date_1', 'service_date_2', ])) {
		html = AnyBalance.requestGet(baseurl + 'user/service_list?nocache=6968795', g_headers);
		
		var allServices = sumParam(html, null, null, /<tr\s+valign="middle"(?:[^>]*>){4}[^>]*номер сервиса в таблице(?:[\s\S]*?<\/tr[^>]*>){1}/ig);
		AnyBalance.trace('Найдено услуг: ' + allServices.length);
		
		for(var i = 0; i < allServices.length; i++) {
			var curr = allServices[i];
			getParam(curr, result, 'service_'+i, /<tr\s+valign="middle"(?:[^>]*>){16}([^<]*)/i, replaceTagsAndSpaces, html_entity_decode);
			getParam(curr, result, 'service_date_'+i, /--\s*окончание\s*--(?:[^>]*>){1}([^<]*)/i, replaceTagsAndSpaces, parseDate);
			
			// В манифесте только 3 объявлено
			if(i >= 3)
				break;
		}
	}



    // if(prefs.domains){
    //     var notfound = [];
    //     var found = [];
    //     var ind = 0;

    //     var domains = prefs.domains.split(/\s*,\s*/g);
    //     for(var i=0; i<domains.length; ++i){
    //         var domain = domains[i];
           
    //         html = AnyBalance.requestPost(baseurl + 'manager/my_domains.cgi', {
    //             'step':'srv.my_domains.search',
    //             'view.order_by': '',
    //             'search.domain':domain,
    //             'search.domain_group': '',
    //             'view.limit':1,
    //             'cmd.search':'Найти'
    //         });

    //         if(!/Найдено:\s*<strong[^>]*>\s*[1-9]/i.test(html)){
    //             notfound[notfound.length] = domain; 
    //         }else{
    //             var suffix = ind > 0 ? ind : '';
    //             var domain_name = getParam(html, null, null, /<td[^>]*>1\.(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode)
    //             getParam(html, result, 'domain' + suffix, /<td[^>]*>1\.(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //             getParam(html, result, 'domain_status' + suffix, /<td[^>]*>1\.(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    //             getParam(html, result, 'domain_till' + suffix, /<td[^>]*>1\.(?:[\s\S]*?<td[^>]*>){6}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
    //             found[found.length] = domain_name;
    //         }

    //         ++ind;
    //     }
  
    //     if(!found.length)
    //         throw new AnyBalance.Error('Не найдено ни одного домена из списка: ' + prefs.domains);
    //     if(notfound.length)
    //         throw new AnyBalance.trace('Следующие домены не найдены: ' + notfound.join(', '));

    //     result.__tariff = found.join(', ');
    // }
    
    AnyBalance.setResult(result);
}
