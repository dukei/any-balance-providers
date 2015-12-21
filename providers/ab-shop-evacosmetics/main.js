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
	AnyBalance.trace(JSON.stringify(json));


	var result = { success: true };

	getParam(allBonus, result, 'allBonus');
	getParam(activeBonus, result, 'activeBonus');
	getParam(inactiveBonus, result, 'inactiveBonus');

	if(json.burnings.length > 0){
		var bonus, dt;
		if(json.burnings[0] && json.burnings[0].bonus) {
			bonus = parseFloat(json.burnings[0].bonus.substr(1, 10));
		}
		if(json.burnings[0] && json.burnings[0].date) {
			dt = parseDate(json.burnings[0].date) || parseDateWord(json.burnings[0].date) || parseDateISO(json.burnings[0].date) || parseDateJS(json.burnings[0].date);

		}

		if(bonus && dt) {
			getParam(bonus, result, 'first_burn_bonus');
			getParam(dt, result, 'first_burn_date');
		} else {
			AnyBalance.trace(JSON.stringify(json));
			throw new AnyBalance.Error("Не удалось обработать данные с сервера. Возможно изменился формат вывода.");
		}
	}
	AnyBalance.setResult(result);
}