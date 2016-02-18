/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Intel Mac OS X 10.6; rv:7.0.1) Gecko/20100101 Firefox/7.0.1',
    Connection: 'keep-alive',
    Origin: 'https://lk-subscr.tricolor.tv',
    Referer: 'https://lk-subscr.tricolor.tv/',
    'X-Requested-With': 'XMLHttpRequest'
};

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите DREID приёмника!');
	checkEmpty(prefs.password, 'Введите пароль!');	
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lk-subscr.tricolor.tv/";

    var html = AnyBalance.requestPost(baseurl + 'Token', {
        grant_type: 'password',
		username:prefs.login,
		password:prefs.password,
		type:'Login'
    }, g_headers);

    var token = getJson(html);
    if(!token.access_token){
    	AnyBalance.trace(html);
    	if(token.error)
    		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте логин и пароль');
    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }

    html = AnyBalance.requestGet(baseurl + 'api/Account/UserInfo', addHeaders({Authorization: 'Bearer ' + token.access_token}));

    var json = getJson(html);

	var result = {success: true};

	var deviceid = json.Subscriber.Agreements[0].Devices[0].SmartCard;

	getParam(json.Subscriber.Agreements[0].Number, result, 'agreement');
	getParam(json.Subscriber.Agreements[0].Devices[0].SmartCard, result, 'device');

	html = AnyBalance.requestGet(baseurl + 'odata/StartTariff(00000000-0000-0000-0000-000000000000)', addHeaders({Authorization: 'Bearer ' + token.access_token})); 
    json = getJson(html);
    if(!json.TariffName)
    	AnyBalance.trace(html);

	getParam(json.TariffName, result, '__tariff');
    
	html = AnyBalance.requestGet(baseurl + 'odata/ServiceInfo?%24filter=(SubjectId%20eq%20%27' + encodeURIComponent(deviceid) + '%27%20and%20SubjectTypeId%20eq%20%27Device%27)&%24orderby=Id', addHeaders({Authorization: 'Bearer ' + token.access_token}));
    json = getJson(html);
    if(!json.value)
    	AnyBalance.trace(html);

    var n = 1;
    var services = [];
    for(var i=0; i<json.value.length; ++i){
    	var si = json.value[i];
    	var name = si.ServiceName;
    	if(si.ServiceStatusId != 'Active'){
    		AnyBalance.trace('Сервис ' + name + ' неактивен, пропускаем.');
    		continue;
    	}

        services.push(si.ServiceId);
    	var left = Math.floor((parseDateISO(si.EndDate) - new Date().getTime())/86400/1000);
    	getParam(name, result, 'service' + n);
    	getParam(left, result, 'daysleft' + n);
    	++n;
    }

    html = AnyBalance.requestGet(baseurl + 'odata/Balance?%24filter=(SubjectId%20eq%20%27' + encodeURIComponent(deviceid) + '%27%20and%20SubjectTypeId%20eq%20%27Device%27)&%24orderby=Id', addHeaders({Authorization: 'Bearer ' + token.access_token}));
    json = getJson(html);
    if(!json.value)
        AnyBalance.trace(html);

    if (json.value.length && services.length) {
        for (var idx = 0; idx < json.value.length; idx++) {
            var serviceId = json.value[idx].ServiceId;
            if (serviceId && services.indexOf(serviceId) > -1) {
                getParam(json.value[idx].Balance, result, 'balance');
                break;
            }
        }
    }
    else {
        getParam(0, result, 'balance');
        AnyBalance.trace('Похоже, денежные средства на счете отсутствуют');
    }

    AnyBalance.setResult(result);
}