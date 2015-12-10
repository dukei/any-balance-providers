var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
	'Accept-Encoding':'gzip, deflate, sdch',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'Host':'evacosmetics.ru',
	'Upgrade-Insecure-Requests':1,
	'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36'
};


function main(){
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://evacosmetics.ru';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.cardnum, 'Введите номер карты!');
	checkEmpty(prefs.cardpin, 'Введите пин!');


	var html = AnyBalance.requestGet(baseurl, g_headers);

	if(!html || AnyBalance.getLastStatusCode() > 400){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}


	html = AnyBalance.requestPost(baseurl + '/orangecard/', {cardnum: prefs.cardnum, cardpin: prefs.cardpin}, addHeaders({
		Origin: baseurl,
		Referer: baseurl + "/"
	}));
	html = AnyBalance.requestGet(baseurl + '/!processing/login.php?cardNum=' + prefs.cardnum + '&cardPin=' + prefs.cardpin, null, addHeaders({ Referer: baseurl + "/orangecard/" }));
	
	var json = getJson(html);
	if(json.error) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error(json.error);
	}

	html = AnyBalance.requestGet(baseurl + '/orangecard/account/my-card/my-shares/', null, addHeaders({ Referer: baseurl + "/orangecard/" }));

	html = AnyBalance.requestGet(baseurl + '/!processing/bill.php');

	json = getJson(html);

	if(!json.buyer) {
		AnyBalance.trace(html);
		throw new AnyBalance.Error("Сервер вернул не верные данные");
	}


	var allBonus = json.buyer.activeBalance*1+json.buyer.inactiveBalance*1,
		activeBonus = json.buyer.activeBalance*1,
		inactiveBonus = json.buyer.inactiveBalance*1;


	html = AnyBalance.requestGet(baseurl + '/!processing/bonusburn.php');
	json = getJson(html);

	// вывод массива сгораемых бонусов,
	// чтоб при проблемах с ними было понятно, что с ними делать
	AnyBalance.trace(json);


	var result = { success: true };

	if(AnyBalance.isAvailable("allBonus")) result.allBonus = allBonus;
	if(AnyBalance.isAvailable("activeBonus")) result.activeBonus = activeBonus;
	if(AnyBalance.isAvailable("inactiveBonus")) result.inactiveBonus = inactiveBonus;


	// этот блок потенциально косячный =)
	// 1. не известно, какого формата дата приходит с сервера
	//    - поэтому же format у счетчика может оказаться не правильным
	// 2. не известно, как сортируются бонусы, я взял 0-й, но он может оказаться и последним по дате
	// 3. не известно, в каком виде с сервера приходит количество бонусов, и зачем они делают substr(1, 10)
	//    надеюсь, мой parseFloat ничего там не сломает

	if(json.burnings.length > 0){
		if(AnyBalance.isAvailable("first_burn_bonus")) result.first_burn_bonus = parseFloat(json.burnings[0].bonus.substr(1, 10));
		if(AnyBalance.isAvailable("first_burn_date")) result.first_burn_date  = parseDate(json.burnings[0].date);
	}

	AnyBalance.setResult(result);
}