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
	
	AB.checkEmpty(prefs.login, 'Введите DREID приёмника!');
    AB.checkEmpty(prefs.password, 'Введите пароль!');
	
    AnyBalance.setDefaultCharset('utf-8');

    var baseurl = "https://lk-subscr.tricolor.tv/";

    var html = AnyBalance.requestPost(
        baseurl + 'Token',
        {
            grant_type: 'password',
            username:prefs.login,
            password:prefs.password,
            type:'Login'
        },
        g_headers
    );

    if(/crash-content/i.test(html))
    	throw new AnyBalance.Error('В настоящий момент сервис временно недоступен, проводятся технические работы.');

    var token = AB.getJson(html);
    if (!token.access_token) {
    	AnyBalance.trace(html);
    	if(token.error) {
            throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Проверьте логин и пароль');
        }

    	throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
    var deviceid=token.userName;
    html = AnyBalance.requestGet(
        baseurl + 'api/Account/UserInfo',
        AB.addHeaders({Authorization: 'Bearer ' + token.access_token})
    );

    var json = AB.getJson(html);
	var result = {
        success: true,
        balance: 0
    };

if (json.Subscriber.Agreements.length>0){
	var deviceid = json.Subscriber.Agreements[0].Devices[0].Id;

    AB.getParam(json.Subscriber.Agreements[0].Number, result, 'agreement');
    AB.getParam(json.Subscriber.Agreements[0].Devices[0].SmartCard, result, 'device');
}
if (!result.agreement) AB.getParam(json.AbonentInfo.AgreementNumber, result, 'agreement');
if (!result.device) AB.getParam(json.AbonentInfo.SmartCardId, result, 'device');
	html = AnyBalance.requestGet(
        baseurl + 'api/Abonent/GetStartTariff',
        AB.addHeaders({Authorization: 'Bearer ' + token.access_token})
    );
    json = AB.getJson(html);
    if(!json.TariffName){
    	AnyBalance.trace('Не удалось найти название тарифа: ' + html);
    }

    AB.getParam(json.TariffName, result, '__tariff');
    
	html = AnyBalance.requestGet(
        baseurl + 'api/BillingOperations/GetServices?SubjectId=' + encodeURIComponent(deviceid) + '&SubjectTypeId=AbonentId&ListTypeId=VisibleForSubject',
        AB.addHeaders({Authorization: 'Bearer ' + token.access_token})
    );
    json = AB.getJson(html);
    if(!json.Value)
    	AnyBalance.trace('Не найдены сервисы: ' + html);

    var n = 1;
    var services = [];
    for(var i=0; json.Value && i<json.Value.length; ++i){
    	var si = json.Value[i];
    	var name = si.ServiceName;
    	if(si.ServiceStatusId != 'Active'){
    		AnyBalance.trace('Сервис ' + name + ' неактивен, пропускаем.');
    		continue;
    	}

        services.push(si.ServiceId);
        AB.getParam(name, result, 'service' + n);
        AB.getParam('' + si.RemainingDays, result, 'daysleft' + n, null, null, parseBalance);
    	++n;
    }

    html = AnyBalance.requestGet(
        baseurl + 'api/BillingOperations/GetBalance?subjectId=' + encodeURIComponent(deviceid) + '&subjectTypeId=AbonentId',
        AB.addHeaders({Authorization: 'Bearer ' + token.access_token})
    );
    json = AB.getJson(html);
    if(!json.Value)
        AnyBalance.trace('Не найден баланс: ' + html);

    if (json.Value && json.Value.length) {
        for (var idx = 0; idx < json.Value.length; idx++) {
            var serviceId = json.Value[idx].ServiceId;
            if (!serviceId || services.indexOf(serviceId) > -1) {
                AB.sumParam(result.balance + json.Value[idx].Balance, result, 'balance', null, null, null, aggregate_sum);
            }
        }
    }
    else {
        AnyBalance.trace('Похоже, денежные средства на счете отсутствуют');
    }

    AnyBalance.setResult(result);
}