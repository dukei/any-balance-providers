/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/
	const iiud_part=(len,base=16)=>Math.floor((1 + Math.random()) * base**len).toString(base).substring(1);	
	//const=generateUUID=(mask='4',base=16)=>mask.match(/\d+/g).map(m=>iiud_part(m,base)).join('-');
	function generateUUID(mask='4',base=16){
		var mathes=mask.match(/\d+/g)
		var res='';
		for(var i=0;i<mathes.length;i++){
                    res+=iiud_part(mathes[i],base)+'-';
                }
                res=res.substring(0,res.length-1);
                return res;
	}
var baseLoginurl = 'https://sso.mtsbank.ru/';
var g_LoginHeaders = {
Connection:'keep-alive',
Accept:'*/*',
Origin:'https://sso.mtsbank.ru',
'User-Agent':'Mozilla/5.0 (Linux; Android 7.1.1; ONEPLUS A5000 Build/NMF26X; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/68.0.3440.91 Safari/537.36',
'Content-Type':'application/json',
Referer:'https://sso.mtsbank.ru/login/mtsmoney/auth/',
'Accept-Encoding':'gzip, deflate',
'Accept-Language':'ru-RU,en-US;q=0.9',
'X-Requested-With':'ru.mts.money',
Authorization: 'Basic bXRzLW1vbmV5LWFuZHJvaWQtbXRzaWQ6YjM0MjZmY2ItMWNlOC00MzQwLTk5NmUtNzk2YmU4MWJmMWIz'
};

var baseurl='https://api.mtsbank.ru/';
var g_headers = {
Platform:'ANDROID',
'App-version':'1.21.1',
'Model-phone':'ONEPLUS A5000',
'Content-Type':'application/x-www-form-urlencoded',
Connection:'Keep-Alive',
'Accept-Encoding':'gzip',
'Client-id':'mts-money-android-mtsid',
'User-Agent':'okhttp/3.12.12'
};
var token='';
function mainAPI(){
	var prefs = AnyBalance.getPreferences();
	checkEmpty(prefs.login, 'Введите номер телефона');
	prefs.login='7'+prefs.login.replace(/[^\d]*/g,'').substr(-10);

    	token=AnyBalance.getData('token'+prefs.login);
if (token) {
	AnyBalance.trace('Найден старый токен');
	g_headers.Authorization='Bearer '+token;
	try{
		var json=callAPI('dbo-balance-info/v1/balance');
	}catch(e){
		AnyBalance.trace(e.message);
		AnyBalance.trace('Старый токен не подошел. Пробуем обновить.');
		g_LoginHeaders=g_headers;
                g_LoginHeaders.Authorization='Basic bXRzLW1vbmV5LWFuZHJvaWQtbXRzaWQ6YjM0MjZmY2ItMWNlOC00MzQwLTk5NmUtNzk2YmU4MWJmMWIz';
                var refresh_token=AnyBalance.getData('refresh_token'+prefs.login);
                var tid=AnyBalance.getData('tid'+prefs.login);
		var json=callLoginAPI('api/token',{refresh_token:refresh_token,scope:'all',grant_type:'refresh_token',tid:tid});
		token=json.access_token;
                g_headers.Authorization='Bearer '+token;
                try{
			var json=callAPI('dbo-balance-info/v1/balance');
			AnyBalance.setData('token'+prefs.login,token);
		    	AnyBalance.saveData();
		}catch(e){
			AnyBalance.trace(e.message);
			AnyBalance.trace('Не удалось обновть токен. Нужна авторизация');
			token='';
			AnyBalance.setData('token'+prefs.login,'');
			AnyBalance.setData('refresh_token'+prefs.login,'');
			AnyBalance.setData('tid'+prefs.login,'');
		    	AnyBalance.saveData();
		}

	}
}
if (!token){    	
	if (!tid) var tid=generateUUID('8-4-4-4-12',16);
	const code_verifier=generateUUID('8-4-4-4-12',16);
	const state=generateUUID('8-4-4-4-12',16);
	var code_challenge=Base64.encode(hex_sha256(code_verifier));
	code_challenge=code_challenge.substr(0,code_challenge.length-2);
	AnyBalance.trace('tid:\n'+tid+'\n'+'code_verifier:\n'+code_verifier+'\n'+'state:\n'+state+'\n'+'code_challenge:\n'+code_challenge);
	callLoginAPI('api%2Fauthorize?'+
		'client_id=mts-money-android-mtsid'+
		'&code_challenge='+code_challenge+
		'&code_challenge_method=S256'+
		'&redirect_uri=mtsmoney'+
		'&scope=all'+
		'&state='+state+
		'&response_type=code'+
		'&tid='+tid);
	var json=callLoginAPI('api/v2/login',{login:prefs.login})
	if (json.next_step!='sms_confirm'){
		AnyBalance.trace(JSON.stringify(json));
		throw new AnyBalance.Error('Ожидался запрос кода из СМС',false,true);
	}
    	var code = AnyBalance.retrieveCode((json.name?json.name+', п':'П')+'ожалуйста, введите код из СМС для входа в МТС Деньги.', null, {inputType: 'number', time: 300000});
        var json=callLoginAPI('api/v2/confirm',{code:code});
        if (!json.redirect_url)
        AnyBalance.trace();
        var code=callLoginAPI('api/authorize');
        //AnyBalance.setAuthentication('mts-money-android-mtsid','b3426fcb-1ce8-4340-996e-796be81bf1b3');
        g_LoginHeaders=g_headers
        g_LoginHeaders.Authorization='Basic bXRzLW1vbmV5LWFuZHJvaWQtbXRzaWQ6YjM0MjZmY2ItMWNlOC00MzQwLTk5NmUtNzk2YmU4MWJmMWIz';
       var json=callLoginAPI('api/token','&grant_type=authorization_code&redirect_uri=mtsmoney&code_verifier='+encodeURIComponent(code_verifier)+'&code='+encodeURIComponent(code)+'&scope=all&tid='+tid+'&');
       token=json.access_token;
       if (!token)
       		throw new AnyBalance.Error('Не удалось авторизоваться в API.',false,true);
    	AnyBalance.setData('token'+prefs.login,token);
    	AnyBalance.setData('refresh_token'+prefs.login,json.refresh_token);
    	AnyBalance.setData('tid'+prefs.login,tid);
    	AnyBalance.saveData();

       g_headers.Authorization='Bearer '+token;
       var json=callAPI('dbo-balance-info/v1/balance');
}
        var result = {success: true, phone:prefs.login};
	getParam(json.amount, result, 'balance', null, null, parseBalance);

	AnyBalance.setResult(result);
}
function callLoginAPI(cmd,params){
	if (g_LoginHeaders.Platform)
		g_LoginHeaders['Request-id']=generateUUID('8-4-4-4-12',16);
	if (params && !params.refresh_token)
		params=JSON.stringify(params);
	if (params) 
		var html=AnyBalance.requestPost(baseLoginurl+cmd,(params),g_LoginHeaders);
	else
        	var html=AnyBalance.requestGet(baseLoginurl+cmd,g_LoginHeaders);
	if (cmd=='api/authorize'){
		var url=AnyBalance.getLastUrl();
		return getParam(url,null,null,/code=([^&]*)/)
	}
	if(AnyBalance.getLastStatusCode() > 400)
		throw new AnyBalance.Error('Сайт временно недоступен. Пожалуйста, попробуйте позже');
	if (/api%2Fauthorize/.test(cmd)) return html;
	var json=getJson(html);
	if (json.error){
		AnyBalance.trace('Запрос:'+cmd);
		AnyBalance.trace('Ответ:\n'+html);
		throw new AnyBalance.Error(json.error_description,false,true);
	}
	return json;

}
function callAPI(cmd,params){
	var id=generateUUID('8-4-4-4-12',16);
	g_headers['Request-id']=id;
	g_headers['X-Request-Id']=id;
	if (params) 
		var html=AnyBalance.requestPost(baseurl+cmd,JSON.stringify(params),g_headers);
	else
        	var html=AnyBalance.requestGet(baseurl +cmd,g_headers);

	var json=getJson(html);
	if (json.error){
		AnyBalance.trace('Запрос:'+cmd);
		AnyBalance.trace('Ответ:\n'+html);
		throw new AnyBalance.Error(json.error_description,false,true);
	}
	return json;

}