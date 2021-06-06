/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
'Content-Type':'application/json;charset=utf-8',
'X-Requested-With':'XMLHttpRequest',
'User-Agent':'Dalvik/2.1.0 (Linux; U; Android 7.1.1; ONEPLUS A5000 Build/NMF26X)',
'Connection':'Keep-Alive',
'Accept-Encoding':'gzip'
};

function main() {
	var prefs = AnyBalance.getPreferences();
	AnyBalance.setDefaultCharset('utf-8');
	checkEmpty(prefs.phone, 'Введите телефон!');
        prefs.phone='+380'+prefs.phone.replace(/[^\d]*/g,'').substr(-9);
	var token=AnyBalance.getData('token'+prefs.phone);
	if (!token) {
		AnyBalance.trace('Первая авторизация');
		callAPI('Mobile/resend_sms',{str:prefs.phone});
		var code=AnyBalance.retrieveCode('Введите код из SMS', null, {inputType: 'number',minLength:4,maxLength:4, time: 60000});
                var json=callAPI('Token/PhoneSMSLogin',{Username:prefs.phone,Password:code});
                if (!json.AccessToken) throw new AnyBalance.Error('Не удалось войти в приложение',null,true)
                var token=json.AccessToken;
                AnyBalance.setData('token'+prefs.phone,json.AccessToken)
                AnyBalance.setData('RefreshToken'+prefs.phone,json.RefreshToken)
                AnyBalance.saveData();

        }
        g_headers = {
                'Authorization':'Bearer '+token,
                'Connection':'Keep-Alive',
                'Accept-Encoding':'gzip',
                'User-Agent':'okhttp/3.12.0'
        }
        var json=callAPI('Mobile/GetUserProfile','  ');
	var result = {success: true};
        result.balance=json.curr_points;
        result.prev_points=json.prev_points;
        if (json.card1)  {
        	result.card1=json.card1;
                result.card1link='Ссылка: <a href="https://barcode.tec-it.com/barcode.ashx?data='+json.card1+'&code=&multiplebarcodes=false&translate-esc=true&unit=Fit&dpi=96&imagetype=Gif&rotation=1&color=%23000000&bgcolor=%23ffffff&codepage=Default&qunit=Mm&quiet=0&hidehrt=False">https://barcode.tec-it.com/barcode.ashx?data='+json.card1+'&code=&multiplebarcodes=false&translate-esc=true&unit=Fit&dpi=96&imagetype=Gif&rotation=1&color=%23000000&bgcolor=%23ffffff&codepage=Default&qunit=Mm&quiet=0&hidehrt=False</a>'
                }
        if (json.card2)  {
        	result.card2=json.card2;
                result.card2link='https://barcode.tec-it.com/barcode.ashx?data='+json.card2+'&code=&multiplebarcodes=false&translate-esc=true&unit=Fit&dpi=96&imagetype=Gif&rotation=1&color=%23000000&bgcolor=%23ffffff&codepage=Default&qunit=Mm&quiet=0&hidehrt=False'
                }

        result.__tariff=json.last_name+' '+json.first_name+' '+json.middle_name

	var json = callAPI('Mobile/get_economy_data');
	for (var c in json)  result[c]=json[c];

	AnyBalance.setResult(result);
}
	
function callAPI(verb,params){
	AnyBalance.trace('Запрос '+verb);
	if (params)
		var answer=AnyBalance.requestPost('https://td4.brsm-nafta.com/api/v2/'+verb,JSON.stringify(params),g_headers);
	else
		var answer=AnyBalance.requestGet('https://td4.brsm-nafta.com/api/v2/'+verb,g_headers);
	AnyBalance.trace('Ответ:\n '+answer);
	try{
		var json=getJson(answer);
	}catch(e){
		throw new AnyBalance.Error(answer);
	}
	if (json.errorMsg) throw new AnyBalance.Error(json.errorMsg);
	return json;
}