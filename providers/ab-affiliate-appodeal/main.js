/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Отображает баланс и заработок за месяц на Appodeal.com для разработчиков.
Провайдер получает эти данные из кабинета. Для работы требуется указать в настройках логин и пароль.

Сайт партнерки: http://startapp.com/
*/

function main() {
	
	var result={
        success: true
    };

	var html=AnyBalance.requestGet('http://www.appodeal.ru/signin');

	if(html.indexOf('<a class="logout" data-method="delete" href="/signout" rel="nofollow"')==-1) {
		
		var prefs=AnyBalance.getPreferences();
		
		var r=new RegExp('<input name="authenticity_token" type="hidden" value="([^"]+)" />');
		var matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Невозможно получить authenticity_token');
		var authenticityToken=matches[1];
		
		var post={
			utf8:'✓',
			authenticity_token:authenticityToken,
			'session[email]':prefs.login,
			'session[password]':prefs.password,
			commit:'Вход'
			};
		
		var html=AnyBalance.requestPost('http://www.appodeal.ru/signin',post);
		
		if(html.indexOf('<a class="logout" data-method="delete" href="/signout" rel="nofollow"')==-1) throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
	}

	r=new RegExp('<li><a class="balance"[^>]+>([0-9.]+)</a></li>');
    matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить баланс');
	result.balance=matches[1];
	
	if(AnyBalance.isAvailable('month')) {
		var date=new Date();
		html=AnyBalance.requestGet('http://www.appodeal.ru/dashboard/dashboard_ajax_table?chart_detalisation=month&date_to='+date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+'&date_from='+date.getFullYear()+'-'+(date.getMonth()+1)+'-01&detalisation%5B%5D=none');
		r=new RegExp('<td><span class="currency">([0-9.]+)</span></td>');
		matches=r.exec(html);
		if(matches==null) throw new AnyBalance.Error('Невозможно получить заработок за месяц');
		result.month=matches[1];
	}

    AnyBalance.setResult(result);
}
