/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Отображает баланс и заработок за месяц, вчера и сегодня на adlabs-mobile.ru для разработчиков.
Провайдер получает эти данные из кабинета. Для работы требуется указать в настройках логин и пароль.

Сайт партнерки: http://adlabs-mobile.ru/
*/

function main() {
	
	var result={
        success: true
    };
    
    var prefs=AnyBalance.getPreferences();
    
    var post={
			act:'login',
			email:prefs.login,
			pass:prefs.password
		};
		
	var headers={
			"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64)"
		};
	
	var html=AnyBalance.requestPost('http://adlabs-mobile.ru/site/mobile/login',post,headers);
	
	if(html.indexOf('{"answer":"ok"}')==-1) throw new AnyBalance.Error('Ошибка авторизации. Проверьте логин и пароль');
    

	html=AnyBalance.requestGet('http://adlabs-mobile.ru/site/Statistics/',headers);

	var r=new RegExp('Сумма к выплате: <strong>([0-9,.]+)</strong>');
	var matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить баланс');
	result.balance=matches[1].replace(',','.');
	
	r=new RegExp('<tbody>\\s+<tr class="spec">\\s+(?:<td[\\S\\s]+?){5}<td>([0-9,.]+)');
	var matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить доход за сегодня');
	result.today=matches[1].replace(',','.');
	
	r=new RegExp('<tbody>\\s+<tr class="spec">\\s+(?:<td[\\S\\s]+?){11}<td>([0-9,.]+)');
	var matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить доход за вчера');
	result.yesterday=matches[1].replace(',','.');
	
	r=new RegExp('<td class="ta-lt">Всего</td>\\s+(?:<td[\\S\\s]+?){4}<td>([0-9,.]+)');
	var matches=r.exec(html);
	if(matches==null) throw new AnyBalance.Error('Невозможно получить доход за месяц');
	result.month=matches[1].replace(',','.');
	
	
    AnyBalance.setResult(result);
}
