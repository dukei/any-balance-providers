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

var cities = {
	kha: {
		baseurl: 'https://bill.strelatelecom.ru/KHD/!w3_p_main.showform',
		func: mainBill
	},
	nud: {
		baseurl: 'https://bill.strelatelecom.ru/I/!w3_p_main.showform',
		func: mainBill
	},
	tai: {
		baseurl: 'https://bill.strelatelecom.ru/I/!w3_p_main.showform',
		func: mainBill
	},
	us: {
		baseurl: 'https://bill.strelatelecom.ru/US/!w3_p_main.showform',
		func: mainBill
	},
	dim: {
		baseurl: 'https://bill.strelatelecom.ru/D/!w3_p_main.showform',
		func: mainBill
	},
	ang: {
		baseurl: 'https://bill.strelatelecom.ru/ANG/!w3_p_main.showform',
		func: mainBill
	},
	irk: {
		baseurl: 'https://bill.strelatelecom.ru/I/!w3_p_main.showform',
		func: mainBill
	},
	ude: {
		baseurl: 'https://bill.strelatelecom.ru/BIKS/!w3_p_main.showform',
		func: mainBill
	},
	slg: {
		baseurl: 'https://bill.strelatelecom.ru/BIKS/!w3_p_main.showform',
		func: mainBill
	},
}

function main(){
	var prefs = AnyBalance.getPreferences();
	if(!prefs.city)
		prefs.city = 'irk';

	var city = cities[prefs.city];
   	if(!city)
   		throw new AnyBalance.Error('Неизвестный город ' + prefs.city, null, true);

   	AnyBalance.trace('Выбран город ' + prefs.city);

   	city.func(city);
}

function mainBill(cityInfo){
	var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('windows-1251');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	
	var baseurl = cityInfo.baseurl;
	
	var html = AnyBalance.requestGet(baseurl + '?IDENTIFICATION=CONTRACT&ROOTMENU=ROOT', g_headers);	
	
    html = AnyBalance.requestPost(baseurl + '?CONFIG=CONTRACT', {
		IDENTIFICATION:'CONTRACT',
		USERNAME:prefs.login,
		PASSWORD:prefs.password,
		FORMNAME:'QFRAME'
    }, g_headers);
	
	var sid = getParam(html, null, null, /sid=([0-9a-f]+)/i);
    if(!sid){
        var error = getParam(html, null, null, /<div[^>]+(?:Error|Notice)Text[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
        if(error)
            throw new AnyBalance.Error(error, null, /парол|Логин не найден/i.test(error));

        AnyBalance.trace(html);
        throw new AnyBalance.Error("Не удалось войти в личный кабинет. Личный кабинет изменился или проблемы на сайте.");
    }
	
    html = AnyBalance.requestGet(baseurl + '?FORMNAME=QFRAME&CONFIG=CONTRACT&SID=' + sid + '&NLS=WR');
    var contr_id = getParam(html, null, null, /CONTR_ID=(\d+)/i);
    if(!contr_id)
        throw new AnyBalance.Error('Не удаётся найти идентификатор договора. Сайт изменен?');
	
    //html = AnyBalance.requestGet(baseurl + '?FORMNAME=QCURRACC&CONTR_ID=' + contr_id + '&SID=' + sid + '&NLS=WR');
    html = AnyBalance.requestPost(baseurl + '?FORMNAME=QCURRACC&CONTR_ID=' + contr_id + '&SID=' + sid + '&NLS=WR', {
		CONTR_ID:contr_id,
		ERROR:'Ñòðàíèöà óñòàðåëà',
		FORMNAME:'QCURRACC',
		IDENTIFICATION:'CONTRACT',
		NLS:'WR',
		PASSWORD:prefs.password,
		SID:sid,
		USERNAME:prefs.login,
    });
	
    var result = {success: true};
	
    getParam(html, result, 'balance', /Текущий баланс[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'topay', /Рекомендуемая сумма платежа:[\s\S]*?<td[^>]*>([\S\s]*?)<\/td>/i, replaceTagsAndSpaces, parseBalance);
    getParam(html, result, 'agreement', /Состояние счёта по договору №([^<]*)/i, replaceTagsAndSpaces);
    getParam(html, result, 'fio', /Клиент:([\S\s]*?)<\/div>/i, replaceTagsAndSpaces);
	
    //Пытаемся найти тарифный план
    //Загружаем меню
    var htmlMenu = AnyBalance.requestGet(baseurl + '?FORMNAME=QMENU&ROOTMENUITEM=ROOT&NLS=WR&SID=' + sid + '&OPENED=OPENED=R!ACC' + contr_id + '!');
    var plans = sumParam(htmlMenu, null, null, /:Curr\('TAR[^']*','([^']*)/g, replaceSlashes);
    for(var i=0; plans && i<plans.length; ++i){
        html = AnyBalance.requestGet(baseurl + plans[i]);
        sumParam(html, result, '__tariff', /Текущий тарифный план[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>/i, replaceTagsAndSpaces, null, aggregate_join);
    }
	
    AnyBalance.setResult(result);
}
