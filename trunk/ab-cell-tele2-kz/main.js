/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64; rv:21.0) Gecko/20100101 Firefox/21.0',
	'Accept': 'application/json, text/plain, */*',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
	'X-Requested-With': 'XMLHttpRequest',
	'Content-Type': 'application/json;charset=utf-8',
	'Referer': 'https://iself.tele2.kz/login',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Connection':'keep-alive',
};

function main(){
    var prefs = AnyBalance.getPreferences();

    var baseurl = "https://iself.tele2.kz/";
    AnyBalance.setDefaultCharset('utf-8'); 

	// Значала зачем-то проверяем номер, какую-то куку ставит еще...
	var json = {msisdn: prefs.login};
    var html = AnyBalance.requestPost(baseurl + 'auth/checkMsisdn.json', JSON.stringify(json), g_headers);
    json = getJson(html);
    if(json.oCurrState == '-1')
        throw new AnyBalance.Error('Введенный номер не принадлежит Tele2!');

    if(json.oCurrState != '2' && json.oCurrState != '1')
        throw new AnyBalance.Error('К сожалению, ваш номер обслуживается старым кабинетом и требует капчу. Поддержка этого кабинета появится позднее.');

    json = {msisdn: prefs.login, password: prefs.password};
    html = AnyBalance.requestPost(baseurl + 'auth/tele2.json', JSON.stringify(json), g_headers); 

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
    getParam(html, result, 'balance', /class="header">([\s\S]*?)\s*тенге/i, replaceTagsAndSpaces, parseBalance);
	
	try{
		// Сайт возвращает JSON c доп. балансами, они -то нам и нужны
		html = AnyBalance.requestPost(baseurl + 'balanceres', '', addHeaders({Referer: baseurl + 'profile'}));
		json = getJson(html);
                var v;
                if(isset(json.returns[0])){ //Ежемесячные
		    v = Math.round(json.returns[0].volume);
		    getParam('' + v, result, 'internet_trafic', null, null, parseBalance);
                }

                if(isset(json.returns[1])){ //Еженедельные
		    v = Math.round(json.returns[1].volume);
		    getParam('' + v, result, 'internet_trafic', null, null, parseBalance);
                }
		
                if(isset(json.returns[2])){ //Ежедневные
		    v = Math.round(json.returns[2].volume);
		    getParam('' + v, result, 'internet_trafic', null, null, parseBalance);
                }
		
	} catch(e){
		AnyBalance.trace('Попытались получить баланс Интернет-пакеты, из-за ошибки ' + e);
	}

    AnyBalance.setResult(result);
}
