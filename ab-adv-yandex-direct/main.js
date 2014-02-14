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

function getIdKey(html){
    return getParam(html, null, null, /<input[^>]*name="idkey"[^>]*value="([^"]*)/i);
}

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	if(prefs.cid && !/\d+/.test(prefs.cid))
        throw new AnyBalance.Error("Введите ID рекламной кампании, по которой вы хотите получить информацию. Он должен состоять только из цифр!");
	
	var baseurl = "https://passport.yandex.ru/passport?mode=auth";
	
	var html = AnyBalance.requestGet(baseurl, g_headers);
	/*var idKey = getIdKey(html);
    if(!idKey)
        throw new AnyBalance.Error("Не удаётся найти ключ для входа в Яндекс. Процедура входа изменилась или проблемы на сайте.");*/
	
    var html = AnyBalance.requestPost(baseurl, {
        //from:'passport',
        //idkey:idKey,
        //display:'page',
        login:prefs.login,
        passwd:prefs.password,
		retpath:'',
        //timestamp:new Date().getTime()
    }, g_headers);
	
    var error = getParam(html, null, null, /b\-login\-error[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);
	
    if(/Установить постоянную авторизацию на(?:\s|&nbsp;)+данном компьютере\?/i.test(html)){
        //Яндекс задаёт дурацкие вопросы.
        AnyBalance.trace("Яндекс спрашивает, нужно ли запоминать этот компьютер. Отвечаем, что нет... (idkey=" + getIdKey(html) + ")");
        html = AnyBalance.requestPost("https://passport.yandex.ru/passport?mode=auth", {
            filled:'yes',
            timestamp:new Date().getTime(),
            idkey:getIdKey(html), 
            no:1
        }, g_headers);
    }
	
    var yandexuid = getParam(html, null, null, /passport\.yandex\.ru\/passport\?mode=logout&yu=(\d+)/);
    if(!yandexuid)
        throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");
	
    var result = {success: true};
	
    var jsonInfoStr = AnyBalance.requestGet('http://direct.yandex.ru/widget/export?yandexuid=' + yandexuid + '&cid=' + (prefs.cid || ''), g_headers);
	if(/Сервис временно недоступен/.test(jsonInfoStr))
		throw new AnyBalance.Error("Яндекс сообщает: Сервис временно недоступен");
	
	AnyBalance.trace('Got from yandex: ' + jsonInfoStr);
	var jsonInfo = JSON.parse(jsonInfoStr);
	
	if(jsonInfo.no_campaigns)
        throw new AnyBalance.Error('Рекламные кампании отсутствуют');
	
    if(prefs.cid && (!jsonInfo.camps_info || jsonInfo.camps_info.length == 0))
        throw new AnyBalance.Error('Нет активной рекламной кампании ID:' + prefs.cid);
	
    var sum_rest = jsonInfo.sum_rest;
    var active_camps_num = jsonInfo.active_camps_num;
    var active_camps_list = jsonInfo.camps_list || [];
    var camps_info = jsonInfo.camps_info || [];
    var overdraft = jsonInfo.overdraft;
    var has_overdraft = !!jsonInfo.overdraft;
    var overdraft_rest = (overdraft && 1*overdraft.overdraft_rest) || 0;
    var overdraft_debt = (overdraft && 1*overdraft.debt) || 0;
    var overdraft_pay_date = (overdraft && overdraft.pay_date) || '';
	
    if(AnyBalance.isAvailable('balance'))
        result.balance = sum_rest;
	
    if(has_overdraft){    
        if(AnyBalance.isAvailable('o_rest'))
            result.o_rest = overdraft_rest;
        if(AnyBalance.isAvailable('o_debt'))
            result.o_debt = overdraft_debt;
        if(AnyBalance.isAvailable('o_paydate') && overdraft_pay_date)
            result.o_paydate = parseDate(overdraft_pay_date);
    }
	
    if(AnyBalance.isAvailable('cnum')){
        result.cnum = active_camps_num;
    }
	
    if(AnyBalance.isAvailable('clist')){
        var campsNames = [];
        for(var i=0; i<active_camps_list.length; ++i){
            var camp = active_camps_list[i];
            campsNames[i] = '[' + camp.cid + '] ' + camp.name;
        }
        result.clist = campsNames.join(',\n');
    }
	
    var camps_info = jsonInfo.camps_info && jsonInfo.camps_info[0];
    if(camps_info){
        result.__tariff = camps_info.name;
        if(AnyBalance.isAvailable('c_name'))
            result.c_name = camps_info.name;
        if(AnyBalance.isAvailable('cid'))
            result.cid = camps_info.cid;
        if(AnyBalance.isAvailable('c_status'))
            result.c_status = camps_info.status;
        if(AnyBalance.isAvailable('c_rest'))
            result.c_rest = camps_info.sum_rest;
        if(AnyBalance.isAvailable('c_clicks'))
            result.c_clicks = camps_info.clicks_today;
    }
	
    AnyBalance.setResult(result);
}