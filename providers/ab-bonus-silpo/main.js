/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Сільпо - Мережа супермаркетів
Сайт Сільпо: http://silpo.ua
Персональная страничка: https://my.silpo.ua/
*/

var baseurl = 'https://api.sm.silpo.ua/api/2.0/exec/FZGlobal/';
var g_headers = {
	'user-info':'{"androidVersion":"Nougat (Android 7.1.1)","appVersionCode":"120","appVersionName":"1.66.0","brand":"OnePlus","geolocationTrackingCode":0,"model":"ONEPLUS A5000","pushNotificationTrackingCode":"1","root":"true","sdkRelease":"7.1.1","sdkVersion":"25"}',
	'coordinates':'{"xCoord":0.0,"yCoord":0.0}',
	'Content-Type':'application/json',
	'Host':'api.sm.silpo.ua',
	'Connection':'Keep-Alive',
	'Accept-Encoding':'gzip',
	'User-Agent':'okhttp/3.12.1'
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}


function callApi(data){
	AnyBalance.trace('=Запрос:\n'+JSON.stringify(data));
	g_headers.deviceTime=new Date().toJSON();
	for(var i=0;i<=3;i++){
		var html = AnyBalance.requestPost(baseurl, JSON.stringify(data), g_headers);
		AnyBalance.trace('====Ответ:\n'+html);
		if (!/503 Backend fetch failed/i.test(html)) break;
		if (i<3){
                	AnyBalance.trace('Ответ не получен. Повтор через 3 секунды');
			AnyBalance.sleep(3000);
		}
	}
	if(!html || AnyBalance.getLastStatusCode() > 401){
		AnyBalance.trace(html);
		throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
	}
	var json = getJson(html);
	if(json.error.errorCode){
		var error = json.error.errorString;
		if (error=='CAPCHA_REQUIRED'||error=='TOKEN_EXPIRED') return json.error.errorString;
		throw new AnyBalance.Error(error, null, /парол|Invalid|block/i.test(error));
	}
	return json;
}

function loginSilpo(prefs){
	var guid=AnyBalance.getData('guid'+prefs.login);
	if (!guid) {
		guid=uuidv4();
		AnyBalance.setData('guid'+prefs.login,guid);
	}

	checkEmpty(prefs.login, 'Введите номер телефона');
        AnyBalance.trace('Запрос SMS');
	var answer=callApi({
	   Data: {
		guid: guid,
		phone: prefs.login
	   },
	   Method: "SendOTP"
	});
        var g_responce='';
	if (answer==='CAPCHA_REQUIRED'){
		AnyBalance.trace('Сайт требует решить каптчу');
		g_responce=solveRecaptcha('silpo.ua требует подтвердить, что вы не робот', 'https://api.sm.silpo.ua/api/2.0/', '6LcafqkUAAAAAFNr8fr2G-3BCsTeVBNa0zeB_xSf');
		
		var answer=callApi({
		Data: {
			captcha:g_responce,
			guid: guid,
			phone: prefs.login
			},
			Method: "SendOTP"
		});
	}
        var sms=AnyBalance.retrieveCode('Для входа в кошелек, пожалуйста, введите код из SMS, посланной на номер '+prefs.login.replace(/\+38(\d{3})(\d{3})(\d{2})(\d{2})/,'+38 ($1) $2-$3-$4'), null, 
        	{inputType: 'number',
        	minLength: 4,
        	maxLength: 4,	
        	time: 180000});
	answer=callApi({
	   Data: {
		guid: guid,
		otpCode: sms,
		phone: prefs.login
	   },
	   Method: "ConfirmationOtp_V2"
	});
	if (!answer.tokens) throw new AnyBalance.Error ('Авторизация не удалась. Возможно API изменен.',false,true);
	var token=answer.tokens.accessToken.value;
	var refreshToken=answer.tokens.refreshToken.value;
        g_headers.Authorization='Token '+token;

        answer=callApi({Data: {},Method: "CheckUser"});
        if (answer.registered==false){
        	AnyBalance.trace('Новый пользователь. Пробуем зарегистрировать');
        	answer=callApi({Data: {},Method: "RegisterUser"});
        	if (answer.register!=true) throw new AnyBalance.Error ('Не удалось зарегистрировать нового пользователя. Пройдите регистрацию на сайте silpo.ua',false,true);
        }
        AnyBalance.setData('token'+prefs.login, token);
        AnyBalance.setData('refreshToken'+prefs.login, refreshToken);
        AnyBalance.saveData();
        return token;
}
function refresh_Token(prefs){
        var token=AnyBalance.getData('refreshToken'+prefs.login);
        g_headers.Authorization='Token '+token;
	var answer=callApi({
	"Data": {},
	"Method": "RefreshToken"
	});
	if (!answer.tokens) return '';
	var token=answer.tokens.accessToken.value;
	var refreshToken=answer.tokens.refreshToken.value;
        g_headers.Authorization='Token '+token;
        AnyBalance.setData('token'+prefs.login, token);
        AnyBalance.setData('refreshToken'+prefs.login, refreshToken);
        AnyBalance.saveData();
        AnyBalance.trace('Получен новый токен');
        return token;	
	}
function main(){
	var prefs = AnyBalance.getPreferences();
        prefs.login=prefs.login.replace(/[^\d]*/g,'').substr(-9);
        if (prefs.login.length!=9) throw new AnyBalance.Error ('Указан не верный номер телефона',false,true);
        prefs.login='+380'+prefs.login;
	AnyBalance.setDefaultCharset('utf-8');
	var token=AnyBalance.getData('token'+prefs.login);
	if (!token) token=loginSilpo(prefs);
        g_headers.Authorization='Token '+token;
        var json=callApi({Data:{forceUpdate:true},Method:'GetPersonalInfo_V4'});
        if (json==='TOKEN_EXPIRED') {
        	AnyBalance.trace('Токен устарел. Пробуем обновить');
        	token=refresh_Token (prefs);
        	if (!token) token=loginSilpo(prefs);
                if (!token) throw new AnyBalance.Error ('Не удалось обновить токен или авторизоваться',false,true);
                var json=callApi({Data:{forceUpdate:true},Method:'GetPersonalInfo_V4'});
                if(json.error.errorCode){
			var error = json.error.errorString;
			throw new AnyBalance.Error(error, null, /парол|Invalid|block/i.test(error));
                }
	}
	var result = {success: true};
	//getParam(json.user.barcode, result, 'num');
	result.baly=json.personalInfo.Bonus.currentBalanceAmount;
	result.bonus=json.personalInfo.Bonus.bonusBalanceAmount;
        json.personalInfo.Bonus.currentBalanceItems.forEach(function(bon){
        	result[bon.codeName.toLowerCase()]=bon.balance;
        	})
        var html='';
        json.personalInfo.Coupons.forEach(function(coupon){
        	coupon.activCoupons.forEach(function(c){
        		if (html) html+='<br>';
        		html+='<strong>'+c.rewardText +(c.couponDescription?' ' +c.couponDescription:'')+'</strong><br>';
        		html+='з '+getFormattedDate('DD.MM.YYYY р.',new Date(parseDateISO(c.beginDate)))+' до '+getFormattedDate('DD.MM.YYYY р.',new Date(parseDateISO(c.endDate)))+'<br>';
                        if (c.lagerWarningText) html+='<strong><font color=red>'+c.lagerWarningText+'</font></strong><br>';
                        if (c.warningText) html+='<strong>'+c.warningText+'</strong><br>';
                        html+='<small>';
                        if (c.promoDescription) html+=c.promoDescription+'<br>';
                        if (c.limitText) html+=c.limitText+'<br>';
                        if (c.addressListText) html+=c.addressListText+'<br>';
        		})
        	})
        if (html) result.activ_coupons=html;
        json=json.personalInfo.MemberAnketa;
        result.moneybox=json.moneyBox.balance;
        var name=(json.firstName||' ') + ' ' + (json.middleName||' ') +' '+ (json.lastName||' ').replace(/\s*/g," ").trim();
        getParam(name, result, '__tariff');
	AnyBalance.setResult(result);
}
