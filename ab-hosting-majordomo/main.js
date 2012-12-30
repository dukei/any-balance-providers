/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о домене для хостинг провайдера majordomo

Сайт оператора: http://majordomo.ru
Личный кабинет: https://control.majordomo.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('koi8-r');

    var baseurl = "https://control.majordomo.ru/";

    var html = AnyBalance.requestPost(baseurl, {
        start:'0',
        login:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/logout.php/i.test(html)){
        var error = getParam(html, null, null, /<span[^>]*color:\s*red[^>]*>([\s\S]*?)<\/span>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /Состояние счета[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, '__tariff', /.>\s*Тарифный план[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'status', /Статус[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'domains', /Доменов на аккаунте:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);

    if(prefs.domains){
        html = AnyBalance.requestGet(baseurl + 'renew.php');

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
