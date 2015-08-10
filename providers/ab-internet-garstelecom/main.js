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

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cab.garstelecom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
    //typicalLanBillingInetTv(baseurl + 'index.php?r=site/login');

    var html = AnyBalance.requestPost(baseurl + 'index.php?r=site/login', {
        'LoginForm[login]':prefs.login,
        'LoginForm[password]':prefs.password,
        'yt0':'Войти'
    });
    
    if(!/r=site\/logout/i.test(html)) {
        var error = getParam(html, null, null, /<div class="alert(?:[^>]*>){3}([\s\S]*?)</i, replaceTagsAndSpaces, html_entity_decode);
        if (error)
            throw new AnyBalance.Error(error, null, /Неверный логин или пароль/i.test(error));
        
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var result = {success: true};

    var accs = sumParam(html, null, null, /<tr[^>]+agreements-grid-row[^>]+>[^]+?<\/tr>/ig);

    if(!accs.length)
        throw new AnyBalance.Error('Не удалось найти ни одного аккаунта.');
    // Берем первый аккаунт
    getParam(accs[0], result, 'agreement', /<td[^>]*>[^]+?<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(accs[0], result, 'balance', /(?:<td[^>]*>[^]+?<\/td>\s*){2}(<td[^>]*>[^]+?<\/td>)/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'username', /<span[^>]+class="content-aside-name"[^>]*>[\s\S]*?<\/span>/i, replaceTagsAndSpaces, html_entity_decode);

    if(isAvailable('abon')){
        var agrmid = getParam(accs[0], null, null, /<a[^>]+id="show-vgroups-(\d+)"/i, replaceTagsAndSpaces, parseBalance);
        if(agrmid){
            var res = AnyBalance.requestPost(baseurl + 'index.php?r=account/vgroups&agrmid=' + agrmid, {});
            var json = getJson(res);
            if(isArray(json.body) && json.body.length){
                for(var i = 0, toi = json.body.length, abon = 0; i < toi; i++)
                    abon += json.body[i].state.state === 'Действует' ? parseBalance(json.body[i].rent) : 0;
                getParam('' + abon, result, 'abon');
            }
        } else {
            AnyBalance.trace('Не удалось найти id для получения списка услуг.');
        }
    }

    AnyBalance.setResult(result);
}

// function typicalLanBillingInetTv(url) {
//     var prefs = AnyBalance.getPreferences();
//     AnyBalance.setDefaultCharset('utf-8');
	
//     var priority = {active: 0, inactive: 1};
	
//     //Вначале попытаемся найти интернет лиц. счет
//     var accTv = [], accInet = [];
//     var accs = sumParam(html, null, null, /Номер договора[\s\S]*?<\/table>/ig);
//     for(var i=0; i<accs.length; ++i){
//         var act = /Состояние:\s+актив/i.test(accs[i]) ? 'active' : 'inactive';
//         var pri = priority[act];
//         if(accs[i].indexOf('Израсходовано:') >= 0) {
//             if(!isset(accInet[pri]))
//                 accInet[pri] = accs[i];
//         } else {
//             if(!isset(accTv[pri]))
//                 accTv[pri] = accs[i];
//         }
//     }

//     function readAcc(html, isInet){
//         if(html){
//             var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr|Нет подключенных услуг))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
//             if(!tr)
//                 tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
//             if(!tr)
//                 tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);
            
//             if(tr){
//                 sumParam(tr, result, '__tariff', [/<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/ig], replaceTagsAndSpaces, html_entity_decode, aggregate_join);
//                 if(isInet){
//                     getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
//                     getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
//                 }
//             }
            
//             sumParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
//             getParam(html, result, isInet ? 'balance' : 'balance_tv', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
//         }
//     }

//     function readAccByPriority(arr, isInet) {
//         for(var i=0; i<arr.length; ++i)
//             if(arr[i])
//                 return readAcc(arr[i], isInet);
//     }

//     readAccByPriority(accInet, true);
//     readAccByPriority(accTv);
//     getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

//     AnyBalance.setResult(result);
// } 