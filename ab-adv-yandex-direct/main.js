/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Получает текущий остаток и номер счета Яндекс.Деньги

Сайт оператора: http://money.yandex.ru/
Личный кабинет: https://money.yandex.ru/
*/

function getParam (html, result, param, regexp, replaces, parser) {
	if (param && (param != '__tariff' && !AnyBalance.isAvailable (param)))
		return;

	var value = regexp.exec (html);
	if (value) {
		value = value[1];
		if (replaces) {
			for (var i = 0; i < replaces.length; i += 2) {
				value = value.replace (replaces[i], replaces[i+1]);
			}
		}
		if (parser)
			value = parser (value);

    if(param)
      result[param] = value;
    else
      return value
	}
}

var replaceTagsAndSpaces = [/<[^>]*>/g, ' ', /\s{2,}/g, ' ', /^\s+|\s+$/g, '', /^"+|"+$/g, ''];
var replaceFloat = [/\s+/g, '', /,/g, '.'];

function parseDate(str){
    var matches = /(\d+)[^\d](\d+)[^\d](\d+)/.exec(str);
    var time;
    if(matches){
	  time = (new Date(+matches[3], matches[2]-1, +matches[1])).getTime();
    }
    AnyBalance.trace('Parsing date ' + new Date(time) + ' from value: ' + str);
    return time;
}

function main(){
    var prefs = AnyBalance.getPreferences();
    
    AnyBalance.setDefaultCharset('utf-8');

    if(!prefs.login)
        throw new AnyBalance.Error("Введите логин!");
    if(!prefs.password)
        throw new AnyBalance.Error("Введите пароль!");
    if(prefs.cid && !/\d+/.test(prefs.cid))
        throw new AnyBalance.Error("Введите ID рекламной кампании, по которой вы хотите получить информацию. Он должен состоять только из цифр!");

    var baseurl = "https://passport.yandex.ru/passport?mode=auth";
    
    var html = AnyBalance.requestGet(baseurl);
    var idKey = getParam(html, null, null, /Passport\.idkey\s*=\s*'([^'])*/);
    if(!idKey)
        throw new AnyBalance.Error("Не удаётся найти ключ для входа в Яндекс. Процедура входа изменилась или проблемы на сайте.");
 
    var html = AnyBalance.requestPost(baseurl, {
        from:'passport',
        idkey:idKey,
        display:'page',
        login:prefs.login,
        passwd:prefs.password,
        timestamp:new Date().getTime()
    });

    var error = getParam(html, null, null, /b\-login\-error[^>]*>([\s\S]*?)<\/strong>/i, replaceTagsAndSpaces);
    if(error)
        throw new AnyBalance.Error(error);

    var yandexuid = getParam(html, null, null, /passport\.yandex\.ru\/passport\?mode=logout&yu=(\d+)/);
    if(!yandexuid)
        throw new AnyBalance.Error("Не удалось зайти. Проверьте логин и пароль.");

    var result={success: true};

    var jsonInfoStr = AnyBalance.requestGet('http://direct.yandex.ru/widget/export?yandexuid=' + yandexuid + '&cid=' + (prefs.cid || ''));
    if(/Сервис временно недоступен/.test(jsonInfoStr))
        throw new AnyBalance.Error("Яндекс сообщает: Сервис временно недоступен");

    AnyBalance.trace('Got from yandex: ' + jsonInfoStr);
    var jsonInfo = JSON.parse(jsonInfoStr);
   
    if(jsonInfo.no_campaigns)
        throw new AnyBalance.Error('Рекламные кампании отсутствуют');

    if(prefs.cid && !jsonInfo.camps_info)
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
