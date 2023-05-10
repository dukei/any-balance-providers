/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
    Accept:'application/json,text/plain,*/*',
    'Accept-Charset':'windows-1251,utf-8;q=0.7,*;q=0.3',
    'Accept-Language':'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
    Connection:'keep-alive',
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36'
};

var baseurl = 'https://my.mosenergosbyt.ru/';

function callApi(query, params, action){
	if(!action)
		action = 'sql';
    if(!params)
    	params = {};
    let url = baseurl + 'gate_lkcomu?action=' + action + '&query=' + query;
    if(callApi.session)
    	url += '&session=' + callApi.session;

    var html = AnyBalance.requestPost(url, params, addHeaders({
    	Referer: baseurl
    }));

    var json = getJson(html);
    if(!json.success){
    	if(json.err_text)
    		throw new AnyBalance.Error(json.err_text);
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка вызова API ' + query + '. Сайт изменен?');
    }

    if(query === 'login'){
    	var res = json.data[0];
    	callApi.session = res.session;
    	if(!res.session){
    		throw new AnyBalance.Error(res.nm_result, null, /парол/i.test(res.nm_result));
    	}
    }

    return json.data;
}

var MES_KD_PROVIDER = 1;
var MOE_KD_PROVIDER = 2;
var TMK_NRG_KD_PROVIDER = 3;
var TMK_RTS_KD_PROVIDER = 4;
var UFA_KD_PROVIDER = 5;
var TKO_KD_PROVIDER = 6;
var VLG_KD_PROVIDER = 7;
var ORL_KD_PROVIDER = 8;
var ORL_EPD_KD_PROVIDER = 9;

var providersPlugin = {};
providersPlugin[MES_KD_PROVIDER]= "bytProxy",
providersPlugin[MOE_KD_PROVIDER]= "smorodinaTransProxy",
providersPlugin[ORL_KD_PROVIDER]= "orlBytProxy",
providersPlugin[TMK_NRG_KD_PROVIDER]= "tomskProxy",
providersPlugin[TMK_RTS_KD_PROVIDER]= "tomskProxy",
providersPlugin[UFA_KD_PROVIDER]= "ufaProxy",
providersPlugin[TKO_KD_PROVIDER]= "trashProxy",
providersPlugin[VLG_KD_PROVIDER]= "vlgProxy",
providersPlugin[ORL_EPD_KD_PROVIDER]= "orlProxy";

function main(){
    var prefs = AnyBalance.getPreferences();
    AnyBalance.setDefaultCharset('utf-8');
	
	checkEmpty(/^(?:\+7|8)?9\d{9}$/.test(prefs.login) || /@/.test(prefs.login), 'Введите в качестве логина ваш номер телефона в формате 9XXXXXXXXX или e-mail.');
	checkEmpty(prefs.password, 'Введите пароль!');

	AnyBalance.requestGet(baseurl, g_headers);

	callApi('login', {
		login: prefs.login, 
		psw: prefs.password, 
		vl_device_info: JSON.stringify({appver: "1.9.0", type: "browser", "userAgent": g_headers['User-Agent']})
	}, 'auth');

	callApi('Init');

	var result = {success: true};

	var lss = callApi('LSList');
	var lsCurrent = null;
	var lssStr = '';
	for(var i=0; lss && i<lss.length; ++i){
		var ls = lss[i];
		AnyBalance.trace('Найден ЛС ' + ls.nn_ls + ': ' + ls.nm_type + ', ' + ls.data.nm_street);
		lssStr += ls.nn_ls + ': ' + ls.nm_type + ', ' + ls.data.nm_street + '\n';
		if(!lsCurrent && ls.nn_ls.indexOf(prefs.num) >= 0){
			AnyBalance.trace('Выбираем ЛС ' + ls.nn_ls + ' в качестве текущего');
			lsCurrent = ls;
		}
	}

	getParam(lssStr, result, 'lss');

	if(!lsCurrent && prefs.num){
		throw new AnyBalance.Error('Не удалось найти лицевой счет, содержащий ' + prefs.num + '. Доступные лицевые счета:\n' + lssStr, false, true);
	}

	if(!lsCurrent)
		lsCurrent = lss[0];

	if(!lsCurrent)
		throw new Anybalance.Error('В Вашем кабинете нет лицевых счетов');

	let type = providersPlugin[lsCurrent.kd_provider];
	if(!type){
		AnyBalance.trace(JSON.stringify(lsCurrent));
		throw new AnyBalance.Error('Неизвестный тип провайдера счета: ' + lsCurrent.kd_provider + '. Сайт изменен?');
	}

	if(!this['process_' + type]){
		throw new AnyBalance.Error('Тип счета ' + type + ' пока не поддерживается. Пожалуйста, обратитесь к разработчику.');
	}
	
	getParam(lsCurrent.nm_provider, result, '__tariff');
	getParam(lsCurrent.nn_ls, result, 'agreement');

	var ipa = callApi('IndicationAndPayAvail', {kd_provider: lsCurrent.kd_provider});
	AnyBalance.trace('Счет ' + type + ' поддерживает: ' + JSON.stringify(ipa[0]));

	this['process_' + type](lsCurrent, ipa[0], result);

    AnyBalance.setResult(result);
}

function process_trashProxy(ls, ipa, result){

	if(ipa.balance_avail){
		var json = callApi('trashProxy', {
			plugin:	'trashProxy',
			proxyquery:	'AbonentCurrentBalance',
			vl_provider: ls.vl_provider
		});
    
		getParam(json[0].sm_balance, result, 'balance');
	}

	if(ipa.pay_avail && AnyBalance.isAvailable('lastdate', 'lastsum')){
		json = callApi('trashProxy', {
			dt_en:	new Date().toISOString(),
			dt_st:	new Date(+new Date() - 12*30*86400*1000).toISOString(),
			plugin:	'trashProxy',
			proxyquery:	'AbonentPays',
			vl_provider: ls.vl_provider
		});
	    
		if(json && json[0]){
        	getParam(json[0].dt_pay, result, 'lastdate', null, null, parseDateISO);
        	getParam(json[0].sm_pay, result, 'lastsum');
        }else{
        	AnyBalance.trace('Нет платежей за 3 мес');
        }
    }
}

function process_bytProxy(ls, ipa, result){

	if(ipa.balance_avail){
		var json = callApi('bytProxy', {
			plugin:	'bytProxy',
			proxyquery:	'CurrentBalance',
			vl_provider: ls.vl_provider
		});
    
//		getParam((/переплата/i.test(json[0].nm_balance) ? 1 : -1)*json[0].vl_balance, result, 'balance'); // Баланс теперь отдаётся с минусом, если есть задолженность
		getParam(json[0].vl_balance, result, 'balance');
	}

	if(ipa.pay_avail && AnyBalance.isAvailable('lastdate', 'lastsum')){
		json = callApi('bytProxy', {
			dt_en:	new Date().toISOString(),
			dt_st:	new Date(+new Date() - 12*30*86400*1000).toISOString(),
			plugin:	'bytProxy',
			proxyquery:	'Pays',
			vl_provider: ls.vl_provider
		});
	    
		if(json && json[0]){
        	getParam(json[0].dt_pay, result, 'lastdate', null, null, parseDateISO);
        	getParam(json[0].sm_pay, result, 'lastsum');
        }else{
        	AnyBalance.trace('Нет платежей за 3 мес');
        }
    }

    if(ipa.ind_avail && AnyBalance.isAvailable('lastcounter', 'lastcounterdate', 'lastcounter1', 'lastcounter2')){
		json = callApi('bytProxy', {
			dt_en:	new Date().toISOString(),
			dt_st:	new Date(+new Date() - 12*30*86400*1000).toISOString(),
			plugin:	'bytProxy',
			proxyquery:	'Indications',
			vl_provider: ls.vl_provider
		});

		if(json && json[0]){
			getParam(json[0].dt_indication, result, 'lastcounterdate', null, null, parseDateISO);
			getParam(json[0].vl_t1 || undefined, result, 'lastcounter');
			getParam(json[0].vl_t2 || undefined, result, 'lastcounter1');
			getParam(json[0].vl_t3 || undefined, result, 'lastcounter2');
		}else{
        	AnyBalance.trace('Нет счетчиков за 3 мес');
		}
    } 
}

function process_smorodinaTransProxy(ls, ipa, result){

	if(ipa.balance_avail){
		var json = callApi('smorodinaTransProxy', {
			plugin:	'smorodinaTransProxy',
			proxyquery:	'AbonentCurrentBalance',
			vl_provider: ls.vl_provider
		});
    
		getParam(json[0].sm_balance, result, 'balance');
	}

	if(ipa.pay_avail && AnyBalance.isAvailable('lastdate', 'lastsum')){
		json = callApi('smorodinaTransProxy', {
			dt_en:	new Date().toISOString(),
			dt_st:	new Date(+new Date() - 12*30*86400*1000).toISOString(),
			plugin:	'smorodinaTransProxy',
			proxyquery:	'AbonentPays',
			vl_provider: ls.vl_provider
		});
	    
		if(json[0]){
        	getParam(json[0].dt_pay, result, 'lastdate', null, null, parseDateISO);
        	getParam(json[0].sm_pay, result, 'lastsum');
        }else{
        	AnyBalance.trace('Нет платежей за 3 мес');
        }
    }

    if(ipa.ind_avail && AnyBalance.isAvailable('lastcounter', 'lastcounterdate', 'lastcounter1', 'lastcounter2')){
		json = callApi('smorodinaTransProxy', {
			dt_en:	new Date().toISOString(),
			dt_st:	new Date(+new Date() - 12*30*86400*1000).toISOString(),
			plugin:	'smorodinaTransProxy',
			proxyquery:	'AbonentEquipment',
			vl_provider: ls.vl_provider
		});

		if(json && json[0]){
			getParam(json[0].dt_indication, result, 'lastcounterdate', null, null, parseDateISO);
			getParam(json[0].vl_t1 || undefined, result, 'lastcounter');
			getParam(json[0].vl_t2 || undefined, result, 'lastcounter1');
			getParam(json[0].vl_t3 || undefined, result, 'lastcounter2');
		}else{
        	AnyBalance.trace('Нет счетчиков за 3 мес');
		}
    } 
}
