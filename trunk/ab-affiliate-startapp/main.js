/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Отображает баланс и заработок за месяц на StartApp.com для разработчиков.
Провайдер получает эти данные из кабинета. Для работы требуется указать в настройках логин и пароль.

Сайт партнерки: http://startapp.com/
*/

function main() {
	
	var result={
        success: true
    };

	var html=AnyBalance.requestGet('https://developers.startapp.com/General/Login.aspx');
		
	if(html.indexOf('>Log out</a>')==-1) {
		
		var prefs=AnyBalance.getPreferences();
		
		var r=new RegExp('<div class="row email clearfix">[\\s\\S]+?<input name="([^"]+)"');
		var matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Невозможно получить имя поля логина');
		var loginFieldName=matches[1];
		
		r=new RegExp('<div class="row password">[\\s\\S]+?<input name="([^"]+)"');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Невозможно получить имя поля пароля');
		var passwordFieldName=matches[1];
		
		r=new RegExp('<input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="([^"]+)"');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Невозможно получить значение VIEWSTATE');
		var viewStateValue=matches[1];
		
		r=new RegExp('<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="([^"]+)"');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Невозможно получить значение EVENTVALIDATION');
		var vwEvntVlitnValue=matches[1];
		
		r=new RegExp('<input type="submit" name="([^"]+)"');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Невозможно получить имя кнопки');
		var submitName=matches[1];
		
		var post={
			__EVENTTARGET:'',
			__EVENTARGUMENT:'',
			__LASTFOCUS:'',
			__VIEWSTATE:viewStateValue,
			__EVENTVALIDATION:vwEvntVlitnValue
			};
		post[loginFieldName]=prefs.login;
		post[passwordFieldName]=prefs.password;
		post[submitName]='LOGIN';
		
		var html=AnyBalance.requestPost('https://developers.startapp.com/General/Login.aspx',post);
		
		if(html.indexOf('>Log out</a>')==-1) throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
	}
	
	r=new RegExp('<span class="earning-text">\\s+(\\S+)\\s+</span>');
    matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить заработок за месяц');
	result.month=matches[1];
	
	
	html=AnyBalance.requestGet('https://developers.startapp.com/Payment/EarningHistory.aspx');
	r=new RegExp('<div class="pe-earning">\\s+(\\S+)\\s+');
    matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить баланс');
	result.balance=matches[1];

    AnyBalance.setResult(result);
}
