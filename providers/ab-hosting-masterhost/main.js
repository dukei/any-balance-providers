/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает баланс и информацию о домене для хостинг провайдера masterhost

Сайт оператора: http://masterhost.ru
Личный кабинет: https://cp.masterhost.ru
*/

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');

    var baseurl = "https://cp.masterhost.ru/";

    var html = AnyBalance.requestPost(baseurl + 'login', {
        action:'login',
        url:'',
        bind_to_ip:'yes',
        user_unix_time:Math.round(new Date().getTime()/1000),
        login:prefs.login,
        password:prefs.password
    });

    //AnyBalance.trace(html);
    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*class=["']login-error[^>]*>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    getParam(html, result, 'balance', /<div[^>]+class="old-cp-dengi"[^>]*>([\S\s]*?)<\/div>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'balance_ue', /<div[^>]+class="old-cp-dengi"[^>]*>[\S\s]*?<p[^>]+class="desc"[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'userName', /<p[^>]+class="old-cp-user-name-info"[^>]*>([\S\s]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    if(AnyBalance.isAvailable('lastop', 'lastopdate', 'lastopinit', 'lastopip')){
        html = AnyBalance.requestGet(baseurl + 'log');
        var tr = getParam(html, null, null, /<table[^>]*class="operation-info"[^>]*>(?:[\s\S](?!<\/table))*?(<tr[^>]*>\s*<td[\s\S]*?<\/tr>)/i);
        if(!tr){
            AnyBalance.trace('Не найдено ни одного действия в журнале операций');
        }else{
            getParam(tr, result, 'lastop', /(?:[\s\S]*?<td[^>]*>){4}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'lastopdate', /(?:[\s\S]*?<td[^>]*>){2}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, parseDate);
            getParam(tr, result, 'lastopinit', /(?:[\s\S]*?<td[^>]*>){1}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(tr, result, 'lastopip', /(?:[\s\S]*?<td[^>]*>){5}([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);
        }
    }

    if(AnyBalance.isAvailable('till') || prefs.domains || true /* потому что тарифный план здесь */){
        html = AnyBalance.requestGet(baseurl + 'prolongation');

        var block = getParam(html, null, null, /<div[^>]+class="prolongation-block"[^>]*>([\s\S]*?)<\/div>/i);
        if(block){
            getParam(block, result, '__tariff', /тарифный план[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/i, replaceTagsAndSpaces, html_entity_decode);
            getParam(block, result, 'till', /прогнозируемое отключение([^<]*)/i, replaceTagsAndSpaces, parseDate);
        }else{
            AnyBalance.trace('Не найдено ни одной услуги для продления');
        }

        if(prefs.domains){
            
            var notfound = [];
            var found = [];
            var ind = 0;
            
            var domains = prefs.domains.split(/\s*,\s*/g);
            var domainsHtml = getParam(html, null, null, /<ul[^>]+class="ext"[^>]*>([\s\S]*?)<\/ul>/i) || '';
            
            for(var i=0; i<domains.length; ++i){
                var domain = domains[i];
                var _domain = domain;
                if(_domain == '*')
                    _domain = '\\w+\\.\\w+';
               
                var tr = getParam(domainsHtml, null, null, new RegExp('(<li(?:[\\s\\S](?!<\\/li>))*?домен(?:\\s|<(?!\\/li>)[^>]*>)*' + _domain + '[\\s\\S]*?<\\/li>)', 'i'));
            
                if(!tr){
                    if(domain != '*')
                        notfound[notfound.length] = domain; 
                }else{
                    var suffix = ind > 0 ? ind : '';
                    var domain_name = getParam(tr, null, null, /<font[^>]+class="text_hl"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
                    getParam(tr, result, 'domain' + suffix, /<font[^>]+class="text_hl"[^>]*>([\s\S]*?)<\/font>/i, replaceTagsAndSpaces, html_entity_decode);
                    getParam(tr, result, 'domain_till' + suffix, /оплачено до:([^<]*)/i, replaceTagsAndSpaces, parseDate);
                    found[found.length] = domain_name;
                }
            
                ++ind;
            }
            
            if(!found.length){
                if(prefs.domains != '*'){
                    throw new AnyBalance.Error('Не найдено ни одного домена (на обслуживании в мастерхост) из списка: ' + prefs.domains);
                }else{
                    AnyBalance.trace('Ни один домен не находится на обслуживании в мастерхост');
                }
            }else{
                result.__tariff = ((result.__tariff && result.__tariff + ': ') || '') + found.join(', ');
            }

            if(notfound.length)
                AnyBalance.trace('Следующие домены не найдены: ' + notfound.join(', '));
            
        }

    }

    
    AnyBalance.setResult(result);
}
