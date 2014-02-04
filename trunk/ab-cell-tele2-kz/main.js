/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/30.0.1599.101 Safari/537.36',
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'X-Requested-With': 'XMLHttpRequest',
	'Content-Type': 'application/json;charset=UTF-8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection':'keep-alive',
};

function main(){
    var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.password, 'Введите пароль!');
	if(!/\d{10}/i.test(prefs.login)) throw new AnyBalance.Error('Номер телефона должен быть без пробелов и разделителей, в формате 707XXXXXXX или 747XXXXXXX!');
	
    var baseurl = "https://iself.tele2.kz/";
    AnyBalance.setDefaultCharset('utf-8'); 
	
	// Значала зачем-то проверяем номер, какую-то куку ставит еще...
	/*var json = {msisdn: prefs.login};
    var html = AnyBalance.requestPost(baseurl + 'auth/checkMsisdn.json', JSON.stringify(json), g_headers);
    json = getJson(html);
    if(json.oCurrState == '-1')
        throw new AnyBalance.Error('Введенный номер не принадлежит Tele2!');

    if(json.oCurrState != '2' && json.oCurrState != '1')
        throw new AnyBalance.Error('К сожалению, ваш номер обслуживается старым кабинетом и требует капчу. Поддержка этого кабинета появится позднее.');
*/
	
	var html = AnyBalance.requestGet(baseurl + 'login', g_headers);
	
	var token = getParam(html, null, null, /constant\("csrf_token",\s+['"]([^"']*)/i);
	
	var html = AnyBalance.requestPost(baseurl + 'captcha', JSON.stringify({same_origin_token: token}), addHeaders({Referer: baseurl + 'login'})); 
	
	var captchaa;
	if(AnyBalance.getLevel() >= 7) {
		AnyBalance.trace('Пытаемся ввести капчу');
		var captcha = AnyBalance.requestGet(getParam(html, null, null, /"captcha"[^>]*url":"([^"]*)/i));
		captchaa = AnyBalance.retrieveCode("Пожалуйста, введите код с картинки", captcha);
		AnyBalance.trace('Капча получена: ' + captchaa);
	} else {
		throw new AnyBalance.Error('Провайдер требует AnyBalance API v7, пожалуйста, обновите AnyBalance!');
	}
	
    var json = {msisdn: prefs.login, password: prefs.password, same_origin_token: token, answer: captchaa};
    html = AnyBalance.requestPost(baseurl + 'auth/tele2', JSON.stringify(json), addHeaders({Referer: baseurl + 'login'})); 

    if(/"err"/i.test(html)){
        //Если в кабинет войти не получилось, то в первую очередь надо поискать в ответе сервера объяснение ошибки
        var error = getParam(html, null, null, /err":"([\s\S]*?)"/i, replaceTagsAndSpaces, html_entity_decode);
        if(error)
            throw new AnyBalance.Error(error);
		
        throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
    }
	// Получаем данные о балансе
	html = AnyBalance.requestGet(baseurl + 'profile');
	
    var result = {success: true};
    getParam(html, result, 'fio', /"profile">[\s\S]*?([\s\S]*?)<\//i, replaceTagsAndSpaces, html_entity_decode);
    getParam(html, result, 'balance', /class="profile-balance">([\s\S]*?)<\//i, replaceTagsAndSpaces, parseBalance);
	
	try{
		token = getParam(html, null, null, /constant\("csrf_token",\s+['"]([^"']*)/i);
		json = {same_origin_token: token};
		// Сайт возвращает JSON c доп. балансами, они -то нам и нужны
		html = AnyBalance.requestPost(baseurl + 'balanceres', JSON.stringify(json), addHeaders({Referer: baseurl + 'profile'}));
		json = getJson(html);
		var v;
        if(isset(json.returns[0])){ //Ежемесячные
		    v = Math.round(json.returns[0].volume);
			sumParam('' + v, result, 'internet_trafic', null, null, parseBalance, aggregate_sum);
		    //getParam('' + v, result, 'internet_trafic', null, null, parseBalance);
        }
		if(isset(json.returns[1])){ //Еженедельные
			v = Math.round(json.returns[1].volume);
			sumParam('' + v, result, 'internet_trafic', null, null, parseBalance, aggregate_sum);
			//getParam('' + v, result, 'internet_trafic', null, null, parseBalance);
        }
		if(isset(json.returns[2])){ //Ежедневные
			v = Math.round(json.returns[2].volume);
		    //getParam('' + v, result, 'internet_trafic', null, null, parseBalance);
			sumParam('' + v, result, 'internet_trafic', null, null, parseBalance, aggregate_sum);
		}
	} catch(e){
		AnyBalance.trace('Ошибка при получении Интернет-пакетов: ' + e);
	}
    AnyBalance.setResult(result);
}
