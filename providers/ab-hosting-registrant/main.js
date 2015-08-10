/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о домене для регистратора registrant

Сайт оператора: http://registrant.ru
Личный кабинет: https://control.registrant.ru/
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://control.registrant.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login/', {
        login:prefs.login,
        password:prefs.password,
        start:'ok'
    });

    //AnyBalance.trace(html);
    if(!/\/logout\//i.test(html)){
        var error = getParam(html, null, null, /<p[^>]*class=["']error[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'domains', /Доменов на аккаунте:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /ФИО[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    if(prefs.domains){
        html = AnyBalance.requestGet(baseurl + 'domains/');

        var notfound = [];
        var found = [];
        var ind = 0;
        
        var domains = prefs.domains.split(/\s*,\s*/g);
        var domainsHtml = getParam(html, null, null, /<table[^>]+id="domains"[^>]*>([\s\S]*?)<\/table>/i) || '';
        
        for(var i=0; i<domains.length; ++i){
            var domain = domains[i];
            var _domain = domain;
            if(_domain == '*')
                _domain = '\\w+\\.\\w+';
           
            var tr = getParam(domainsHtml, null, null, new RegExp('(<tr(?:[\\s\\S](?!</tr>))*?<a[^>]+href="/domain/[^>]*>[^<]*' + _domain + '[\\s\\S]*?<\\/tr>)', 'i'));
        
            if(!tr){
                if(domain != '*')
                    notfound[notfound.length] = domain; 
            }else{
                var suffix = ind > 0 ? ind : '';
                var domain_name = getParam(tr, null, null, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(tr, result, 'domain' + suffix, /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
                getParam(tr, result, 'domain_till' + suffix, /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
                found[found.length] = domain_name;
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
