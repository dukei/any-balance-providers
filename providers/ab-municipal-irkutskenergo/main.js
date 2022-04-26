/**
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
    AB.checkEmpty(prefs.password, 'Введите фамилию/пароль!');
	
	var html = AnyBalance.requestGet(baseurl + 'qa/PersonalCabin.html', g_headers);
	
	if (!html || AnyBalance.getLastStatusCode() > 400) {
        throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
    }

    var plainParams = {
		"Home":true,
	    "AccountNo":prefs.login,
	    "AccountFIO":"",
	    "CurrentAccountPassword":prefs.password,
	    "Rooms_Count":"",
	    "PostAddress":"",
	    "IsApproved":false,
	    "Residents":"",
	    "FullArea":"",
	    "FullArea_All":"",
	    "IsBindMessage":false,
	    "bindAddMode":false,
	    "bindAccountDataItem":{},
	    "bindAccountDataList":[],
	    "contractsQueueList":[],
	    "SaveDataFlag":true,
	    "Services":[],
	    "ContractorServiceInfoList":[],
	    "ContractorBalanceInfoList":[],
	    "CreditList":[],
	    "BillsAvailable":false
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

    if (json.Credentials && json.Credentials.ContractorBalanceInfoList) {
		
		AB.getParam(json.Credentials.AccountNo, result, 'account');
	    AB.getParam(json.Credentials.AccountFIO, result, 'fio');

        var accounts = json.Credentials.ContractorBalanceInfoList;
        for (var i = 0; i < accounts.length; i++) {
            var counter_name;
            if(/Иркутскэнергосбыт/i.test(accounts[i].Title)) // электроэнергия
                counter_name = 'balance';
			else if(/Дирекция Городской Инфраструктуры/i.test(accounts[i].Title)) // водоснабжение
                counter_name = 'balanceCold';
            else if(/Байкальская энергетическая компания/i.test(accounts[i].Title)) // отопление + ГВС
                counter_name = 'balanceHeat';
			else if(/ОДПУ/i.test(accounts[i].Title)) // установка ОДПУ
                counter_name = 'balanceODPU';

            if(!counter_name)
                AnyBalance.trace("Неизвестная опция: " + accounts[i].Title);
            else
                AB.getParam(accounts[i].Summ, result, counter_name, null, null, AB.parseBalance);
        }
    }
    else {
        AnyBalance.trace("Не удалось найти балансы по услугам.");
    }
	
	result.__tariff = prefs.login;
    
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
	AnyBalance.trace('Ответ 2: '+ JSON.stringify(json));///////////////////////////////////////////////

    if (!json.Credits || !json.Credits[0]) {
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Информация временно недоступна. Попробуйте позднее.');
    }

    AB.getParam(json.Credits[0].Balance, result, 'to_pay', null, null, AB.parseBalance);
    AB.getParam(json.Credits[0].Month, result, 'month');
    AB.getParam(json.Credits[0].Year, result, 'year');
    AB.getParam(json.Credits[0].Pay, result, 'credited', null, null, AB.parseBalance);
    AB.getParam(json.Credits[0].Purchase, result, 'paid', null, null, AB.parseBalance);
	
	AnyBalance.setResult(result);
}