/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/


function main(){
	var baseurl = "https://my.yota.ru/";
	var g_headers = {
		Accept: 'application/json',
		'Accept-Language': 'ru-RU,en-US,en;q=0.9',
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.120 Safari/537.36',
		Connection: 'keep-alive',
	}
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');

	checkEmpty(prefs.login, 'Пожалуйста, введите логин в личный кабинет Yota!');
	checkEmpty(prefs.password, 'Пожалуйста, введите пароль!');
	//var token=AnyBalance.getData('token'+prefs.login);
	//if (token) g_headers.Authorization=token;
        AnyBalance.trace('Get tokenInfo');
	var html = AnyBalance.requestPost('https://my.yota.ru/wa/v1/auth/tokenInfo');
	var params={
		'client_id': 'yota_mya',
		'client_secret':'password',
		realm: '/customer',
		service: 'dispatcher',
		'grant_type': 'urn:roox:params:oauth:grant-type:m2m',
		'response_type': 'token cookie'
		};
        var json=getJson(html);
	        AnyBalance.trace('Get execution');
		var html = AnyBalance.requestPost('https://id.yota.ru/sso/oauth2/access_token?skipAutoLogin=false',params, g_headers);
		json=getJson(html);
        
		params.execution=json.execution;
        	params['_eventId']='next';
        	params.username= prefs.login;
        	params.password= prefs.password;
                AnyBalance.trace('Get access_token 2');
		var html = AnyBalance.requestPost('https://id.yota.ru/sso/oauth2/access_token?skipAutoLogin=false',params, g_headers);
		json=getJson(html);
//		if (json.access_token){
//			token=json.token_type+' '+json.access_token;
//			//g_headers.Authorization=token;
//		}else{
//			throw new AnyBalance.Error('Не удается авторизоваться. Изменения в API?');
//		}
	
	if(!json.access_token){
		AnyBalance.trace(html);
		if (json.form.errors[0].message) throw new AnyBalance.Error(json.form.errors[0].message);
		throw new AnyBalance.Error('Не удается найти форму входа. Сайт изменен?');
	}
        //AnyBalance.setData('token'+prefs.login,token);
	//AnyBalance.saveData();
	g_headers.Authorization='Basic bmV3X2xrX3Jlc3Q6cGFzc3dvcmQ=';
	var html = AnyBalance.requestGet('https://my.yota.ru/wa/v1/finance/getBalance',g_headers);
        json=getJson(html);
        var result = {success: true};
        result.balance=json.amount;

        if(isAvailable('agreement','phone','email','licschet')){
		var html = AnyBalance.requestGet('https://my.yota.ru/wa/v1/profile/info',g_headers);
		json=getJson(html);
	        result.agreement=json.accountType;
	        result.phone=json.phone;
	        result.email=json.email;
	        result.licschet=json.userId;
        }

        if(isAvailable('speed','abon','timeleft','speed1','abon1','timeleft1','speed2','abon2','timeleft2','speed3','abon3','timeleft3','speed4','abon4','timeleft4')){
		var html = AnyBalance.requestGet('https://my.yota.ru/wa/v1/devices/devices',g_headers);
		var devlist=[];
	        json=getJson(html);
	        var devrefs = (prefs.devices?prefs.devices.toString():'*').split(/\s*[\\,;\-\/\s\.]+\s*/g);
	        let sufix='';
	        for(let i=0; i<json.devices.length; ++i){
	        	let dev=json.devices[i];
	        	AnyBalance.trace('Найдено устройство '+dev.physicalResource.resourceID.key);
	        	let need=false;
	                if (!devrefs.includes('*')&&devrefs.length>0) {
	                	for(let j=0; j<devrefs.length; ++j){
		        		if (endsWith(dev.physicalResource.resourceID.key,devrefs[j])) {
		        			AnyBalance.trace('Данные по устройству '+dev.physicalResource.resourceID.key+' будут добавлены, т.к. оно найдено в настройках провайдера:'+devrefs[j]);
	        				need=true;
	        				break;
		        		}
	                	}
	                }else{
	                	AnyBalance.trace('Данные по устройству '+dev.physicalResource.resourceID.key+' будут добавлены, т.к. обрабатываются все устройства.');
	                	need=true;
	                }
	                if (need){
	                	result['dev'+sufix]=(prefs.description & 1)?dev.physicalResource.resourceID.key+': ':'';
	                        if (prefs.description & 2) result['dev'+sufix]+=dev.physicalResource.registrState.name+': ';
        	                devlist.push(dev.physicalResource.registrState.name);
                	        result['speed'+sufix]=dev.offeringSpeed.speedValue;
                	        result['speedunit'+sufix]=dev.offeringSpeed.unitOfMeasure;
	                        result['abon'+sufix]=dev.product.price.amount;
        	                result['timeleft'+sufix]=(new Date(dev.product.endDate)-new Date())/1000;
                	        sufix=sufix?sufix+1:1;

	                }else{
        	        	AnyBalance.trace('Устройство '+dev.physicalResource.resourceID.key+' пропущено.');
	                }
	        }
	}
	if (devlist) result.__tariff=devlist.join(', ');
        AnyBalance.setResult(result);
        return;
}
