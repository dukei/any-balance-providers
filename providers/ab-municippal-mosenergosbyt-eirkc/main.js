
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

var baseurl; 
var session;
function getApiData(verb,params){
	AnyBalance.trace('verb='+verb);
	var html = AnyBalance.requestPost(baseurl + verb+(session?'&session='+session:'') , params, addHeaders({
		Referer: baseurl 
	}));
	AnyBalance.trace('Server answer:\n'+html);
	var json = getJson(html);

    if(!json.success){
    	AnyBalance.trace(html);
    	throw new AnyBalance.Error('Ошибка апи');
    } 
	return json.data;
}

function main() {
	var prefs = AnyBalance.getPreferences();

	baseurl = 'https://my.mosenergosbyt.ru/gate_lkcomu?action=';
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Введите е-mail!');
	checkEmpty(prefs.password, 'Введите пароль!');
        session=AnyBalance.getData('session'+prefs.login);
        
        if (session) {
        	AnyBalance.trace('Найден старый токен. Проверяем');
        	try{
                	var lss=getApiData('sql&query=LSList');
                        AnyBalance.trace('Токен в порядке. Используем.');
        	}catch(e){
        		AnyBalance.trace('Токен испорчен.'+e.message);
                        session='';
                        var new_token=AnyBalance.getData('new_token'+prefs.login);
        	}

        }
        try{
        if (!session && new_token){
        	AnyBalance.trace('Пытаемся обновить токен');
        	var json=getApiData('auth&query=login',{
			login:prefs.login,
			psw_token:new_token,
			remember:true
        	})
        	session=json[0].session;
        	var new_token=json[0].new_token;
                var lss=getApiData('sql&query=LSList');
                AnyBalance.trace('Токен обновлен успешно');
        }
        }catch(e){
        	AnyBalance.trace('Не удалось обновить токен. Нужна авторизация\n'+e.message);
                session='';
        }
        if (!session) {
        	AnyBalance.trace('Начало авторизации');
        	var json=getApiData('auth&query=login',{
			login:prefs.login,
			psw:prefs.password,
			remember:true
			})
		session=json[0].session;
		var new_token=json[0].new_token;
		if (!session) {
			if (json[0].nm_result&& json[0].nm_result!="Ошибок нет") throw new AnyBalance.Error(json[0].nm_result,null,true);
				
			throw new AnyBalance.Error('Авторизация не удалась',null,true);
		}
		var ls;
		var lss=getApiData('sql&query=LSList');
	}
	if (!lss||!lss.length) throw new AnyBalance.Error('Не найдены лицевые счета',null,true);
	if (!prefs.account) {
		var ls=lss[0];
	}else{
		let normalized_account=prefs.account.replace(/([^\d]*)/g,'');
		ls=lss.filter(l=>l.data.nn_ls_disp.replace(/([^\d]*)/g,'').endsWith(normalized_account))
		if (!ls||!ls.length) {
			AnyBalance.trace(JSON.stringify(lss));
			throw new AnyBalance.Error('Не найден лицевой счет с последними цифрами '+prefs.account,null,true);
		}
		ls=ls[0];
	}


	var result = {
		success: true
	};

	getParam(ls.data.nn_ls_disp,result,'licschet');
	getParam(ls.nm_ls_group_full,result,'adr');
	getParam(ls.nm_ls_description||ls.nm_type,result,'service');
	getParam(ls.nm_provider,result,'provider');

	var proxy=["bytProxy","smorodinaTransProxy","orlBytProxy","tomskProxy","ufaProxy","trashProxy","vlgProxy","altProxy","sarProxy","tmbProxy","vldProxy","orlProxy","ksgProxy"];
	proxy=proxy[ls.kd_provider-1];
	var IndicationAndPayAvail=getApiData('sql&query=IndicationAndPayAvail',{kd_provider:ls.kd_provider})[0];
	if (IndicationAndPayAvail.balance_avail){
		try{
			var json=getApiData('sql&query='+proxy,{plugin:proxy,proxyquery:'CurrentBalance',vl_provider:ls.vl_provider})[0];
		}catch(e){
			var json=getApiData('sql&query='+proxy,{plugin:proxy,proxyquery:'AbonentCurrentBalance',vl_provider:ls.vl_provider})[0];
		}
                getParam(json.vl_balance||json.sm_balance,result,'balance');
                getParam(json.vl_pay||json.sm_payed,result,'pay');
                getParam(json.vl_accruals||json.sm_charged,result,'cost');
                getParam(json.vl_indications||json.vl_indictions_prev,result,'indicator');
	}
	try{
		var json=getApiData('sql&query='+proxy,{plugin:proxy,proxyquery:'IndicationCounter',vl_provider:ls.vl_provider})[0];
                getParam(json.nn_days,result,'IndicationCounter');
	}catch(e){
		AnyBalance.trace('Счетчик передачи показаний не получен.\n'+e.message);
	}
        AnyBalance.setData('session'+prefs.login,session);
        if (new_token) AnyBalance.setData('new_token'+prefs.login,new_token);
        AnyBalance.saveData();

	AnyBalance.setResult(result);
}
