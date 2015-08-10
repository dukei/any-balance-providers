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
	var baseurl = 'https://91.210.44.133/';
	
	typicalLanBillingInetTv(baseurl + 'client2/index.php?r=site/login');
}

function typicalLanBillingInetTv(url) {
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
    var html = AnyBalance.requestPost(url, {
        'LoginForm[login]':prefs.login,
        'LoginForm[password]':prefs.password,
        'yt0':'Войти'
    });
	
    if(!/r=site\/logout/i.test(html)){
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Неправильный логин-пароль?");
    }
	
    var result = {success: true};
    var priority = {active: 0, inactive: 1};
	
    //Вначале попытаемся найти интернет лиц. счет
    var accTv = [], accInet = [];
    var accs = sumParam(html, null, null, /Номер договора[\s\S]*?<\/table>/ig);
    for(var i=0; i<accs.length; ++i){
        var act = /Состояние:\s+актив/i.test(accs[i]) ? 'active' : 'inactive';
        var pri = priority[act];
        if(accs[i].indexOf('Израсходовано:') >= 0) {
            if(!isset(accInet[pri]))
                accInet[pri] = accs[i];
        } else {
            if(!isset(accTv[pri]))
                accTv[pri] = accs[i];
        }
    }
	
    function readAcc(html, isInet){
        if(html){
            var tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr|Нет подключенных услуг))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
            if(!tr)
                tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>((?:[\s\S](?!<\/tr))*?Состояние:\s+актив[\s\S]*?)<\/tr>/i);
            if(!tr)
                tr = getParam(html, null, null, /<tr[^>]+class="(?:account|odd|even)"[^>]*>([\s\S]*?)<\/tr>/i);
            
            if(tr){
                sumParam(tr, result, '__tariff', [/<!-- Работа с тарифом -->[\s\S]*?<b[^>]*>([\s\S]*?)<\/b>/ig], replaceTagsAndSpaces, html_entity_decode, aggregate_join);
                if(isInet){
                    getParam(tr, result, 'abon', /Абонентская плата:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                    getParam(tr, result, 'internet_cur', /Израсходовано:([^<]*)/i, replaceTagsAndSpaces, parseBalance);
                }
            }
            
            sumParam(html, result, 'agreement', /Номер договора:[^<]*<[^>]*>([^<]*)/ig, replaceTagsAndSpaces, html_entity_decode, aggregate_join);
            getParam(html, result, isInet ? 'balance' : 'balance_tv', /Текущий баланс:[^<]*<[^>]*>([^<]*)/i, replaceTagsAndSpaces, parseBalance);
        }
    }

    function readAccByPriority(arr, isInet) {
        for(var i=0; i<arr.length; ++i)
            if(arr[i])
                return readAcc(arr[i], isInet);
    }

    readAccByPriority(accInet, true);
    readAccByPriority(accTv);
    getParam(html, result, 'username', /<div[^>]+class="content-aside"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i, replaceTagsAndSpaces, html_entity_decode);

    AnyBalance.setResult(result);
} 