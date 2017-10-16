﻿/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept: 'application/json, text/javascript, */*; q=0.01',
    Origin: 'http://www.sbyt.irkutskenergo.ru',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://sbyt.irkutskenergo.ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	AB.checkEmpty(prefs.login, 'Введите номер лицевого счета/договора!');
    AB.checkEmpty(prefs.password, 'Введите фамилию!');
	
	var html = AnyBalance.requestGet(baseurl + 'qa/PersonalCabin.html', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var plainParams = {
        AccountNo:prefs.login,
        AccountFIO:prefs.password,
        PostAddress:"",
        IsApproved:false,
        Residents:"",
        FullArea:"",
        SaveDataFlag:false
    };
    
    var par = 'EnergoSales@LoginPL(\''+ JSON.stringify(plainParams) +'\'#string)';
    
	html = AnyBalance.requestPost(
        baseurl + 'asp/srvproxy.aspx',
        {Parameters: par},
        AB.addHeaders({
            Referer: baseurl + 'qa/PersonalCabin.html',
            'X-Requested-With': 'XMLHttpRequest'
        })
    );
	
    var json = AB.getJson(html);
    
	if (json.LoginError) {
		var error = AB.getParam(html, null, null, json.LoginError, AB.replaceTagsAndSpaces);
		if (error) {
            throw new AnyBalance.Error(error, null, /Ошибка авторизации/i.test(error));
        }
		
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}
	
	var result = {success: true};

    if (json.Credentials && json.Credentials.balanses) {

        var accounts = json.Credentials.balanses;
        for (var i = 0; i < accounts.length; i++) {
            var counter_name;
            if(/электроэнергия/i.test(accounts[i].ServiceName))
                counter_name = 'balance';
            else if(/отопление/i.test(accounts[i].ServiceName))
                counter_name = 'balanceHeat';
            else if(/ГВС/i.test(accounts[i].ServiceName))
                counter_name = 'balanceGVS';

            if(!counter_name)
                AnyBalance.trace("Неизвестная опция: "+ accounts[i].ServiceName);
            else
                AB.getParam(accounts[i].Balans, result, counter_name, null, null, AB.parseBalance);
        }
    }
    else {
        AnyBalance.trace("Не удалось найти балансы по услугам.");
    }
    
    var today = new Date(),
        to_month = today.getMonth() + 1,
        to_date = today.getDate() + '.' + to_month + '.' + today.getFullYear(),
        from_date = to_month + '.' + today.getFullYear();

    AnyBalance.trace(from_date);
    AnyBalance.trace(to_date);
    
    var date_par = "EnergoSales@GetPLCreditsMonthSummary('00000000-0000-0000-0000-000000000000'#guid,'01." + from_date + "'#string,'" + to_date + "'#string'true'#bool)";
    
	html = AnyBalance.requestPost(
        baseurl + 'asp/srvproxy.aspx',
        { Parameters: date_par },
        AB.addHeaders({
            Referer: baseurl + 'qa/PersonalCabin.html',
            'X-Requested-With': 'XMLHttpRequest'
        })
    );
    
    json = AB.getJson(html);

    if (!json.Credits || !json.Credits[0]) {
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Информация временно недоступна. Попробуйте позднее');
    }

    AB.getParam(json.Credits[0].Balance, result, 'to_pay', null, null, AB.parseBalance);
    AB.getParam(json.Credits[0].Month, result, 'month');
    AB.getParam(json.Credits[0].Year, result, 'year');
    AB.getParam(json.Credits[0].Pay, result, 'credited', null, null, AB.parseBalance);
    AB.getParam(json.Credits[0].Purchase, result, 'paid', null, null, AB.parseBalance);
	
	AnyBalance.setResult(result);
}