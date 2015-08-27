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

function parseTrafficGbMy(str){
    return parseTrafficGb(str, 'mb');
}

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://cabinet.utex-telecom.ru';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	alternativeLanBillingInetTv(baseurl + '/index.php');
}

function alternativeLanBillingInetTv(baseurl){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl, {
        login: prefs.login,
        password: prefs.password
    });

    if(!/'devision',\s*'?-1'?/i.test(html)){
        var error = getParam(html, null, null, /<(form)[^>]+name="loginForm">/i);
        if(error)
            throw new AnyBalance.Error("Неверный логин или пароль");
        throw new AnyBalance.Error("Не удалось зайти в личный кабинет. Сайт изменен?");
    }

    var result = {success: true};

    getParam(html, result, 'userName', /Вы:<\/td>\s*<td[^>]*>(.*?)<\/td>/i, replaceTagsAndSpaces, html_entity_decode);

    var table = getElements(html, [/<table[^>]+class="table_comm"[^>]*/ig, /<td[^>]*class="td_head_ext[^>]*>\s*Баланс/i])[0];
    var header = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*class="td_head_ext[^>]*>\s*Баланс/i])[0];
    var tds = getElements(header, /<td[^>]*class="td_head_ext[^>]*>/ig);
    var cols = {}
    for(var i=0; i<tds.length; ++i){
    	var td = tds[i];
    	if(/Номер договора/i.test(td))
    		cols.agreement = i;
    	else if(/Код оплаты/i.test(td))
    		cols.paycode = i;
    	else if(/Баланс/i.test(td))
    		cols.balance = i;
    	else if(/Бонус/i.test(td))
    		cols.bonus = i;
    }
    var row = getElements(table, [/<tr[^>]*>/ig, /<td[^>]+class="td_comm/i])[0];
    var tds = getElements(row, /<td[^>]*class="td_comm[^>]*>/ig);
    for(var name in cols){
    	getParam(tds[cols[name]], result, name, null, replaceTagsAndSpaces, function(str){
    		if(/balance|bonus/.test(name))
    			return parseBalance(str);
    		return html_entity_decode(str);
    	});
    }

    var table = getElements(table.substr(1), [/<table[^>]+class="table_comm"[^>]*/ig, /<td[^>]*class="td_head[^>]*>\s*Услуга: Интернет/i])[0];
    var header = getElements(table, [/<tr[^>]*>/ig, /<td[^>]*class="td_head[^>]*>\s*Тариф/i])[0];
    var tds = getElements(header, /<td[^>]*class="td_head[^>]*>/ig);
    var cols = {}
    for(var i=0; i<tds.length; ++i){
    	var td = tds[i];
    	if(/<td[^>]*>\s*Тариф/i.test(td))
    		cols.__tariff = i;
    	else if(/Состояние/i.test(td))
    		cols.status = i;
    }
    var row = getElements(table, [/<tr[^>]*>/ig, /<td[^>]+class="td_comm/i])[0];
    var tds = getElements(row, /<td[^>]*class="td_comm[^>]*>/ig);
    for(var name in cols){
    	getParam(tds[cols[name]], result, name, null, replaceTagsAndSpaces, html_entity_decode);
    }

    if(AnyBalance.isAvailable('trafficIn', 'trafficOut')){
        var dt = new Date();
        html = AnyBalance.requestPost(baseurl, {
            devision:2,
            service:1,
            statmode:0,
            vgstat:0,
            timeblock:1,
            year_from:dt.getFullYear(),
            month_from:dt.getMonth()+1,
            day_from:1,
            year_till:dt.getFullYear(),
            month_till:dt.getMonth()+1,
            day_till:dt.getDate()
        });
        re = new RegExp(prefs.login + '\\s*</a>\\s*</td>(?:[\\S\\s]*?<td[^>]*>){2}(.*?)</td>', 'i');
        getParam(html, result, 'trafficIn', re, replaceTagsAndSpaces, parseTrafficGbMy);
        re = new RegExp(prefs.login + '\\s*</a>\\s*</td>(?:[\\S\\s]*?<td[^>]*>){3}(.*?)</td>', 'i');
        getParam(html, result, 'trafficOut', re, replaceTagsAndSpaces, parseTrafficGbMy);
    }

    AnyBalance.setResult(result);
}
