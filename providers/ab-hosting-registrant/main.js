/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает информацию о домене для регистратора registrant

Сайт оператора: http://registrant.ru
Личный кабинет: https://control.registrant.ru/
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
    
    AB.checkEmpty(prefs.login, 'Введите логин!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = "https://domains.nethouse.ru";
    
    var html = AnyBalance.requestGet(baseurl + '/login', g_headers);
    
    var formHtml = AB.getElement(html, /<form[^>]+?login_check/i);

    var params = AB.createFormParams(html, function (params, str, name, value) {
        if (/username/.test(name)) {
            return prefs.login;
        }
        if (/password/.test(name)) {
            return prefs.password;
        }
        return value;
    });


    html = AnyBalance.requestPost(baseurl + '/login_check', params, AB.addHeaders({
        Referer: baseurl + '/login',
        Origin: baseurl
    }));

    //AnyBalance.trace(html);
    if(!/\/logout/i.test(html)){
        var error = getParam(html, null, null, /<p[^>]*class=["']error[^>]*>([\s\S]*?)<\/p>/, replaceTagsAndSpaces, html_entity_decode);
        if(error) {
            throw new AnyBalance.Error(error, false, /логин|парол/i.test(html));
        }
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось войти в личный кабинет. Проблемы на сайте или сайт изменен.');
    }

    var result = {success: true};

    if (AnyBalance.isAvailable('balance')) {
        getParam(AB.getElement(html, /<a\s(?![^>]*?menu-item-link)[^>]*?\/control\/balance/i, replaceTagsAndSpaces, parseBalance), result, 'balance');
    }
    
    var htmlTable = AB.getElement(html, /<div\s[^>]*?class\s*=\s*"[^"]*?account-table/i);
    
    if (!htmlTable) {
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найден список доменов.');
    }
    
    var htmlRows = AB.getElements(htmlTable, /<div\s[^>]*?class\s*=\s*"(?=[^"]*?row)(?=[^"]*?mrg-null)/ig);
    
    getParam(htmlRows.length - 1, result, 'domains');
    
    if(prefs.domains){
        var map = {};
        var i, arr = [];
        for (i = 1; i < htmlRows.length; ++i) {
            var domain = getParam(htmlRows[i], null, null, /class="[^"]*?account-domain-name[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces);
            if (domain) {
                arr.push(map[domain] = {
                    domain: domain,
                    date: getParam(htmlRows[i], null, null, /class="[^"]*?col2[^>]*>([^<]+)/i, AB.replaceTagsAndSpaces, AB.parseDate)
                });
            }
        }
        
        var MAX_COUNT = 4;
        
        if (prefs.domains == '*') {
            if (!arr.length) {
                AnyBalance.trace('Доменов на аккаунте не обнаружено');
            }
            for (i = 0; i < arr.length && i < MAX_COUNT; ++i) {
                AB.getParam(arr[i].domain, result, 'domain' + (i || ''));
                AB.getParam(arr[i].date, result, 'domain_till' + (i || ''));
            }
        } else {
            var domains = prefs.domains.split(/\s*,\s*/);
            var count = 0;
            var notfound = [];
            for (i = 0; i < domains.length; ++i) {
                var di = map[domains[i]];
                if (di) {
                    AB.getParam(di.domain, result, 'domain' + (count || ''));
                    AB.getParam(di.date, result, 'domain_till' + (count || ''));
                    count++;
                    if (count >= MAX_COUNT) {
                        break;
                    }
                } else {
                    notfound.push(domains[i]);
                }
            }
            if (!count) {
                throw new AnyBalance.Error('Не найдено ни одного домена из списка: ' + prefs.domains);
            }
            if(notfound.length) {
                AnyBalance.trace('Следующие домены не найдены: ' + notfound.join(', '));
            }
        }
    }
    
    if (AnyBalance.isAvailable('userName')) {
        html = AnyBalance.requestGet(baseurl + '/control/contacts', g_headers);
        /*
        <div class="item col-xs-12 col-sm-4">
                        <p class="contact-label">
                            Фамилия Имя Отчество:
                        </p>
                        <p class="contact-block">
                            Маргунов Артем Евгеньевич
                        </p>
                    </div>
        */
        getParam(html, result, 'userName', /<p\s[^>]*>\s*Фамилия\s+Имя\s+Отчество[^<]*<\/p>\s*<p\s[^>]*>([^<]+)/i, replaceTagsAndSpaces);
    }

    
    AnyBalance.setResult(result);
}
