/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.31 (KHTML, like Gecko) Chrome/26.0.1410.64 Safari/537.31'
};

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
    
    AB.checkEmpty(prefs.login, 'Введите логин!');
	AB.checkEmpty(prefs.password, 'Введите пароль!');

    var baseurl = 'https://lk.erc-progress.ru';
	var html = AnyBalance.requestGet(baseurl + '/login?login=' + 
        encodeURIComponent(prefs.login) +
        '&password=' +
        encodeURIComponent(prefs.password), g_headers);
        
    if (!html || AnyBalance.getLastStatusCode() >= 400) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	
    if(!/logout/i.test(html)){
        var error = getParam(html, null, null, /<div[^>]*?main_table[^>]*>\s*<p[^>]*?color:red[^>]*>([^<]+)/i, replaceTagsAndSpaces);
        if (error) {
            throw new AnyBalance.Error(error, false, /логин|парол/i.test(error));
        }
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    
    var aid = getParam(html, null, null, /<dt[^>]*?aid="(\d+)/i);
    
    if(!aid){
        AnyBalance.trace(html);
        throw new AnyBalance.Error('Не найден aid');
    }
	
    var result = {success: true};
    getParam(html, result, 'fio', /<span[^>]*?class="fio"[^>]*>([^<]+)/i, replaceTagsAndSpaces);
    getParam(html, result, 'agreement', /Длинный\s+код[\s\S]*?(\d{10,})/i);
    
    html = AnyBalance.requestPost(baseurl + '/accrualhistory', g_headers);
    
    getParam(html, result, 'date', /Информация о начислениях на([^<]+)/i, replaceTagsAndSpaces);
    
    html = AnyBalance.requestPost(baseurl + '/payments?aid=' + aid, g_headers);
    var json = getJson(html);
    
    var counters = {
        balance: 0,
        dolg: 0,
        opl: 0,
        nachisleno: 0
    };
    
    function round(v) {
        return Math.round(v * 100) / 100;
    }
    for (var i = 0; i < json.length; ++i) {
        counters.dolg += parseBalance(json[i].serviceentry_debt);
        counters.opl += parseBalance(json[i].serviceentry_debtpaid);
        counters.nachisleno += parseBalance(json[i].serviceentry_additsum);
        counters.balance += parseBalance(json[i].serviceentry_payable);
    }
    // Долг/переплата
    getParam(round(counters.dolg), result, 'dolg');
	// Оплачено
	getParam(round(counters.opl), result, 'opl');
	// Начислено
	getParam(round(counters.nachisleno), result, 'nachisleno');
	// Сумма к оплате
	getParam(round(counters.balance), result, 'balance');

    AnyBalance.setResult(result);
}