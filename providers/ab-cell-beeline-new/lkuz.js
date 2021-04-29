var g_apiHeaders_uz = {
    Connection: 'keep-alive',
	Accept: '*/*',
	'Accept-Encoding': 'gzip, deflate, br',
	'User-Agent': 'Mozilla/5.0 (Linux; Android 8.0; ONEPLUS A3010 Build/OPR6.170623.013) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.116 Crosswalk/18.48.477.13 Mobile Safari/537.36',
	XMLHttpRequest:'XMLHttpRequest',
	'accept-language':'ru'
}

const apiURL_uz='https://beeline.uz/restservices/api/a2/'
function callApi_uz(cmd,params){
	AnyBalance.trace('cmd:'+cmd);
	if (params)
		var html = AnyBalance.requestPost(apiURL_uz+cmd,JSON.stringify(params), g_apiHeaders_uz);
	else
		var html = AnyBalance.requestGet(apiURL_uz+cmd, g_apiHeaders_uz);
        AnyBalance.trace('answer:\n'+html);
	var json = getJson(html);
	return json;
}

function setBeelineCookies(prefs,token){
     AnyBalance.setCookie('beeline.uz','language',prefs.lang);
     AnyBalance.setCookie('beeline.uz','phoneMask','9');
     AnyBalance.setCookie('beeline.uz','phonePrefix','+998');
     AnyBalance.setCookie('beeline.uz','zone','tashkentskaya-obl');
     if (token){
     	AnyBalance.setCookie('beeline.uz','accessToken',token);
     	AnyBalance.setCookie('beeline.uz','accessPhone',prefs.login);
     	AnyBalance.setCookie('beeline.uz','isAuth','true');
     }
}

function main_uz(){
    var prefs = AnyBalance.getPreferences();
    var prefs = AnyBalance.getPreferences();
    checkEmpty(prefs.login, 'Введите номер телефона для входа на сайт beeline.uz!');
    checkEmpty(prefs.password, 'Введите пароль для входа на сайт beeline.uz!');
    prefs.login='998'+prefs.login.replace(/([^\d]*)/g,"").substr(-9);
    if(prefs.login && !/^\d{12}$/i.test(prefs.login)) {
	throw new AnyBalance.Error('В качестве номера необходимо ввести 9 цифр номера, например, 501234567, или не вводить ничего, чтобы получить информацию по основному номеру.');
    }

    prefs.lang=prefs.lang||'ru';
    var token = AnyBalance.getData('token_' + prefs.login), json;
    setBeelineCookies(prefs,token);
    if(token){
    	AnyBalance.trace("We have token saved. Trying to get access");
    	try{
    		var json = callApi_uz('telco/998909363876/subscriptions/'+prefs.login+'/dashboard');
    	}catch(e){
    		AnyBalance.trace("Token is broken");
    		token='';
    	}
    }

    if(!token){
    	AnyBalance.trace("Need login");
    	var json = callApi_uz('auth/'+prefs.login+'/checkexists');
    	if (!json.status) throw new AnyBalance.Error ('Введен неверный логин',false,true);
    	json = callApi_uz('auth/login', {account: prefs.login,password:prefs.password});
        token = json.accessToken;
        var refreshToken=json.refreshToken;
        setBeelineCookies(prefs,token);
        var json = callApi_uz('telco/'+prefs.login+'/subscriptions/'+prefs.login+'/dashboard');
    }
        if(!token) {
    		AnyBalance.setData('token_' + prefs.login, token);
    		AnyBalance.saveData();
        	throw new AnyBalance.Error('Авторизация не удалась Сайт изменен?');
    	}
    	var result = {success: true};
    	AnyBalance.trace('Getting balance');
    	getParam(json.balances[0].paymentMeanData.usage.leftover, result, 'balance');
    	getParam(json.usages[0].leftover, result, 'rub_bonus2');
    	getParam(json.usages[0].serviceExpiryDate, result, 'rub_bonus2_till',null,null,parseDate);
    	getParam(json.subUsers[0].fio , result, 'fio');
    	getParam(json.subUsers[0].pricePlan[prefs.lang], result, '__tariff');
    	getParam(json.subUsers[0].units[prefs.lang], result, 'units');
    	getParam(prefs.login.replace(/(\d{3})(\d{2})(\d{3})(\d{2})(\d*)/,'+$1 ($2) $3-$4-$5'), result, 'phone');

    		AnyBalance.setData('token_' + prefs.login, token);
    		AnyBalance.saveData();

    	AnyBalance.setResult(result);
}