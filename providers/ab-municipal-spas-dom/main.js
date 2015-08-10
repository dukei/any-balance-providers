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
	var baseurl = 'https://cabinet.spas-dom.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите лицевой счет!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	
	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
	html = AnyBalance.requestPost(baseurl + 'ajax/login/', {
		username: prefs.login,
		userpswd: prefs.password
	}, addHeaders({Referer: baseurl + 'login/'}));
	
    html = AnyBalance.requestGet(baseurl + 'mycabinet/', g_headers);
    
	if (!/logout/i.test(html)) {		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
    
    //получаем данные о начислениях за квартиру
    var today = new Date();
    var monthNumber = today.getMonth()+1;
    var report_year = today.getFullYear();
    AnyBalance.trace(monthNumber);
    AnyBalance.trace(report_year);
    
	html = AnyBalance.requestPost(baseurl + 'ajax/accview/', {
		pmonth: monthNumber,
		pyear: report_year
	}, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
    
    var json = getJson(html);
    
    if(json[0].code != 1) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить данные о начислениях. Сайт изменен?');       
    }
    
	var result = {success: true};
	
	getParam(json[1].rnls, result, 'acc_num', null, replaceTagsAndSpaces, html_entity_decode);
	getParam(json[1].rname, result, 'fio', null, replaceTagsAndSpaces, html_entity_decode);
    
    var count, summ = 0;
    var res = [];
    for(var i = 0; i < json[2].length; i++) {
        if(json[2][i].rout_balance == 0) {
            count = parseBalance(json[2][i].resaldo);
            summ += count;
            res.push('<b>' + json[2][i].rserv_name + '</b>' + ' - Задолженность: ' + json[2][i].resaldo);
        }
    }
    result.fulltext = res.join('<br/>');
    
    getParam(summ, result, 'balance', null, null);
    AnyBalance.trace(summ);
    
    getParam(json[0].bdate + ' - ' + json[0].edate, result, 'period', null, null);
    
    // получаем данные по счетчикам на воду
	html = AnyBalance.requestPost(baseurl + 'ajax/lists/meters/', {}, addHeaders({'X-Requested-With': 'XMLHttpRequest'}));
    
    json = getJson(html);
    if(json[0].code != 1) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось получить данные о приборах учета. Сайт изменен?');       
    }

	getParam(json[1].rsay_ind, result, 'hot_water', null, replaceTagsAndSpaces, parseBalance);
	getParam(json[2].rsay_ind, result, 'cold_water', null, replaceTagsAndSpaces, parseBalance);
	
	AnyBalance.setResult(result);
}