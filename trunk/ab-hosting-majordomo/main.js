/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://control2.majordomo.ru/";

    var html = AnyBalance.requestPost(baseurl + 'user/login/', {
        login:prefs.login,
        password:prefs.password
    });
	
	if (!/logout/i.test(html)) {
		var error = getParam(html, null, null, /<span[^>]*color:\s*red[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
		if (error)
			throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
    var result = {success: true};

    getParam(html, result, 'balance', /Баланс(?:[^>]*>){2}([^<]+)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /.>\s*Тарифный план[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'domains', /доменов[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
	
    if(prefs.domains){
        html = AnyBalance.requestGet(baseurl + 'domains');

        var notfound = [];
        var found = [];
        var ind = 0;
        
        var domains = prefs.domains.split(/\s*,\s*/g);
        var domainsHtml = getParam(html, null, null, /<th[^>]*>Истечение срока действия доменных имен([\s\S]*?)<\/table>/i) || '';
        
        for(var i=0; i<domains.length; ++i){
            var domain = domains[i];
            var _domain = domain;
            if(_domain == '*')
                _domain = '\\w+\\.\\w+';
           
			try {
				var tr = getParam(domainsHtml, null, null, new RegExp('(<tr(?:[\\s\\S](?!</tr>))*?<input[^>]+name=[\'"]renewname[^>]*value=["\'][^\'"]*' + _domain + '[\\s\\S]*?</tr>)', 'i'));
				
				if(!tr){
					if(domain != '*')
						notfound[notfound.length] = domain; 
				}else{
					var suffix = ind > 0 ? ind : '';
					var domain_name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
					getParam(tr, result, 'domain' + suffix, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
					getParam(tr, result, 'domain_till' + suffix, /(?:[\s\S]*?<td[^>]*>){3}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
					found[found.length] = domain_name;
				}
			} catch(e) {
				AnyBalance.trace('Ошибка получения данных по доменам: ' + e.message);
			}
            ++ind;
        }
        
        if(!found.length){
            if(prefs.domains != '*'){
                throw new AnyBalance.Error('Не найдено ни одного домена из списка: ' + prefs.domains);
            }else{
                AnyBalance.trace('Доменов на аккаунте не обнаружено');
            }
        }else{
            result.__tariff = ((result.__tariff && result.__tariff + ': ') || '') + found.join(', ');
        }

        if(notfound.length)
            AnyBalance.trace('Следующие домены не найдены: ' + notfound.join(', '));
        
    }
	
    AnyBalance.setResult(result);
}