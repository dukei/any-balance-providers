function main(){
	AnyBalance.trace('Connecting...');
	
	var data = AnyBalance.getPreferences();

	AnyBalance.setAuthentication(data.login,data.password);
	
	var url='http://ag.mos.ru/site/login';
        var phone="+7 ("+data.phone.substr(0,3)+") "+data.phone.substr(3,3)+"-"+data.phone.substr(6,2)+"-"+data.phone.substr(8,2);
	AnyBalance.trace(phone);
	var html = AnyBalance.requestPost(url,{
		"LoginForm[username]":phone,
		"LoginForm[password]":data.password,
		"LoginForm[verifyCode]":"",
		"LoginForm[offer]":"true",
		"LoginForm[remember_me]":"true"
	});
	if (html.search(/redirect/) != -1){
		AnyBalance.trace("Авторизация прола успешно.");
        	html = AnyBalance.requestGet('http://ag.mos.ru/');
		var res=/current_points\">(.+)</.exec(html);
		var result = {success: true};
		result.points=res[1];
		AnyBalance.setResult(result);
	}else{
		AnyBalance.trace("Ошибка авторизации или что-то с сайтом");
		throw new AnyBalance.Error ('Ошибка авторизации.');
	}
}
