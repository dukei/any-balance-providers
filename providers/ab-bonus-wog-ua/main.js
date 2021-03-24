/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/


function callAPI(cmd,params){
	var g_headers = {
	'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
	'Connection':'Keep-Alive',
	'Accept-Encoding':'gzip',
	Accept: 'application/json, text/javascript, */*; q=0.01',
	'User-Agent':'Dalvik/2.1.0 (Linux; U; Android 7.1.1; ONEPLUS A5000 Build/NMF26X) APP_VER:1.4.0(400)',
	'X-Requested-With': 'XMLHttpRequest',
	};
//	AnyBalance.trace('Запрос к '+cmd);
	var APIurl='https://online.wog.ua/api/'
	if (params)
		var html = AnyBalance.requestPost(APIurl+cmd,JSON.stringify(params),g_headers);
	else
		var html = AnyBalance.requestGet(APIurl+cmd,g_headers);
//	AnyBalance.trace('Ответ:\n'+html);
	var json=getJson(html);
	return json;
	if (json.error&&json.error!='[ ]') {
		AnyBalance.trace (html);
                throw new AnyBalance.Error(json.error);
	}
	return json;
}
function main(){
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	AnyBalance.setOptions({forceCharset:'utf-8'});
        if(prefs.card) prefs.card=prefs.card.toString().replace(/[^\d]+/g,'');
	if (prefs.source=='app') processApp(prefs)
        if (prefs.source=='site') processSite(prefs)
        throw AnyBalance.Error('Укажите источник данных в настройках');
}
function processSite(prefs) {
		checkEmpty(prefs.login, 'Введите логин!');
		checkEmpty(prefs.password, 'Введите пароль!');
		var json = callAPI('Login?client=site2.0&lang=ru',{User:prefs.login,Password:hex_md5(prefs.password).toUpperCase()});
		var sesion=json.SessionID;
                var json = callAPI('Wallets?client=site2.0&lang=ua&session='+sesion);
		var json = callAPI('Clients?lang=ua&session='+sesion)
		for (var i=0;i<json.length;i++){
                	var client=json[i];
                	AnyBalance.trace('>>>Найден клиент:'+client.КонтрагентНаименование);
                        for (var ii=0;ii<client.Идентификаторы.length;ii++){
                        	var walet=client.Идентификаторы[ii];
                		AnyBalance.trace('>>>Найден счет:'+walet.Наименование);
                		var cards = callAPI('Cards?client=site2.0&lang=ua&session='+sesion,{WALLETS: [walet.Счет]});
                                for (var iii=0;iii<cards.Карты.length;iii++){
                                	var card=cards.Карты[iii];
                                	AnyBalance.trace('>>>Найдена карта:'+card.КартаКод);
                                	if (!prefs.card||card.КартаКод.endsWith(prefs.card)){
                                		AnyBalance.trace('===Ищем баланс по этой карте');
                                                var result = {success: true};
                                                var json = callAPI('Resources2/wallet/1?client=site2.0&contentType=false&headers=%7B%22Cache-Control%22:%22no-cache%22%7D&lang=ru&mimeType=multipart%2Fform-data&processData=false&session='+sesion,{CARDS:[card.Счет]});
                                                if (!json.length||json.length==0) var json =callAPI('Resources2/card/1?client=site2.0&contentType=false&headers=%7B%22Cache-Control%22:%22no-cache%22%7D&lang=ua&mimeType=multipart%2Fform-data&processData=false&session='+sesion,{CARDS:[card.Карта]});
                                                if (json.length>0) 
                                                	json.map(w=>sumParam(w.Остаток,result,'balance',null,null,null,aggregate_sum));
                                                getParam(client.КонтрагентНаименование,result,'fio');
                                                getParam(card.КартаКод+' ('+card.СчетНаименование+')',result,'__tariff');
                                                if (client.Менеджеры&&client.Менеджеры.length>0){
                                                	getParam(client.Менеджеры[0].Менеджер,result,'manager');
                                                	getParam(client.Менеджеры[0].НомерТелефона,result,'managerPhone');
                                                }
						AnyBalance.setResult(result);
						return;
                                	}
                                        AnyBalance.trace('<<<Карта не подошла');
                                }
                                AnyBalance.trace('<<<По счету не найдено подходящих карт');
                	}
                        AnyBalance.trace('<<<По клиенту не найдено подходящих карт');
                }
                throw new AnyBalance.Error('Карта не найдена');

}

function callAPP(cmd,params){
	var g_headers = {
	'Content-Type':'application/json; charset=UTF-8',
	'Connection':'Keep-Alive',
	'Accept-Encoding':'gzip',
	'Authorization':'Basic V09HX01PQklMRTpCMXpJZDJFUTQwSDBlalg=',
	'User-Agent':'Dalvik/2.1.0 (Linux; U; Android 7.1.1; ONEPLUS A5000 Build/NMF26X) APP_VER:1.4.0(400)'
	};
	var APPurl='https://thebestapp4ever.wog.ua/MobileBackend/hs/MobileBackEnd/'
	params.version='1.0';
	params.appVersion='1.4.0';
	params.appOS='Android';
	var html = AnyBalance.requestPost(APPurl+cmd,JSON.stringify(params),g_headers)
	//AnyBalance.trace('cmd:'+cmd+'\nAnswer:'+html);
	var json=getJson(html);
	if (json.error) throw new AnyBalance.Error(json.message.ru);
	if (!json.status==0) {
		AnyBalance.trace (html);
                throw new AnyBalance.Error('Сервер вернул неожиданный ответ');
	}
	return json;
}
function processApp(prefs) {
	var prefs = AnyBalance.getPreferences();
	prefs.phone= '380'+(prefs.phone.replace(/[^\d]+/g, '').substr(-9));
	AnyBalance.setDefaultCharset('utf-8');
	var token=AnyBalance.getData('token'+prefs.phone);
	if (token){
		var result=AnyBalance.getData('result'+prefs.phone);
		var card=result.__tariff;
		AnyBalance.trace("Найден токен авторизации. Проверяем");
		try{
			var json = callAPP('clientinfo/'+card+'/'+prefs.phone,{token:token,qr_last_number:0,qr_tokens_count:0})
			AnyBalance.trace('Старый токен в порядке. Используем его.');
		}catch(e){
			var token='';
                        AnyBalance.trace(e.message);
                        AnyBalance.trace('токен испорчен');
		}
	}
	if (!token){
		checkEmpty(prefs.phone, 'Введите номер телефона!');
		AnyBalance.trace('Запрашиваем СМС для входа');

		var json = callAPP('authorization/'+prefs.phone+'/2',{});
		var code=AnyBalance.retrieveCode('Введите код из SMS' , null, {time: 60000, inputType: 'number',minLength: 4,maxLength: 4,});
		var json = callAPP('gettoken/'+prefs.phone,{otpPass:code})
		var token=json.token;
		var result = {success: true};
		if (json.noCard)  throw new AnyBalance.Error('У Вас нет карты', null, true);
		var card=json.info.numberCard;
		//if (prefs.card) card=prefs.card.replace(/[^\d]+/g,'');
		if (!card) throw new AnyBalance.Error('Карта не найдена', null, true);
	
		sumParam(json.info.name, result, 'fio', null, null, null, aggregate_join);
		sumParam(json.info.surname, result, 'fio', null, null, null, aggregate_join);
        	getParam(card, result, '__tariff');
        	var json = callAPP('clientinfo/'+card+'/'+prefs.phone,{token:token,qr_last_number:0,qr_tokens_count:0})
        }
        var preResilt=result;
        getParam(json.Bonuses, result, 'balance',null,null,parseBalance);
        AnyBalance.setData('token'+prefs.phone,token);
        AnyBalance.setData('result'+prefs.phone,preResilt);
        AnyBalance.saveData();
    AnyBalance.setResult(result);
}


/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
/**
var g_headers = {
	'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,* /*;q=0.8',
	'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection':'keep-alive',
	'User-Agent':'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
	'X-Requested-With':'XMLHttpRequest'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	var baseurl = 'https://wog.ua/ru/';
	AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');
	var captcha=solveRecaptcha("Пожалуйста, докажите, что Вы не робот", 'https://wog.ua/', '6LeZtnUUAAAAAFGfP6ZcTtWtWZjGUSbSbPj3h-uy');
	var html = AnyBalance.requestPost(baseurl + 'profile/login/', {
        "data[login]":prefs.login,
        "data[password]":prefs.password,
        "g-recaptcha-response":captcha
    }, addHeaders({
		Referer: baseurl + 'profile/login/',
		'X-Requested-With': 'XMLHttpRequest'
	}));

	var json = getJson(html);
	if(json.status !== true) {
		if(json){
			if(json.status == 'card_not_found')
				throw new AnyBalance.Error('Карта не найдена', null, true);
			if(json.status == 'invalid_password')
				throw new AnyBalance.Error('Неверный пароль', null, true);
			var e = {};
			if(json.errors){
				for(var i in json.errors)
					sumParam(json.errors[i], e, 'e', null, null, null, aggregate_join);
			}
			if(e.e)
				throw new AnyBalance.Error(e);
		}
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Не удалось зайти в личный кабинет. Сайт изменен?');
	}

    var result = {success: true};
	
    sumParam(json.info.FIRSTNAME, result, 'fio', null, null, null, aggregate_join);
    sumParam(json.info.MIDDLENAME, result, 'fio', null, null, null, aggregate_join);
    sumParam(json.info.LASTNAME, result, 'fio', null, null, null, aggregate_join);
    getParam(json.info.BIRTHDAY, result, 'birthday', null, null, parseDate);
    getParam(json.info.TELEPHONE, result, 'phone');
    getParam(json.info.EMAIL, result, 'email');
    getParam(json.info.SEX, result, 'sex', null, null, function(str){return str == 2 ? 'ж' : 'м'});

    html = AnyBalance.requestGet(json.redirectLink, g_headers);
	
	getParam(html, result, 'balance', /<span[^>]+balance_status[^>]*>([\s\S]*?)<\/span>/i, replaceTagsAndSpaces, parseBalance);
	getParam(html, result, '__tariff', />Номер картки<[\s\S]*?<div[^>]+class="right"[^>]*>([\s\S]*?)<\/div>/i, replaceTagsAndSpaces);
	
    AnyBalance.setResult(result);
}
*/