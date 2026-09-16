/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у интернет-провайдера Smart. Он осуществляет подключение клиентов к домовым сетям в населенных пунктах Новомосковского Административного Округа (ТиНАО).

Сайт оператора: https://smart1.ru/
Личный кабинет: https://lk.smart1.ru/
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Encoding': 'gzip, deflate, br',
	'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.6',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36'
};

var baseurl = 'https://lk.smart1.ru/';

function main(){
    var prefs = AnyBalance.getPreferences();
	
	checkEmpty(prefs.login, 'Введите логин!');
	checkEmpty(prefs.password, 'Введите пароль!');

    AnyBalance.setDefaultCharset('utf-8');

    var html = AnyBalance.requestPost(baseurl + '?', {
		username:prefs.login,
        password:prefs.password,
        action:'auth'
    }, addHeaders({
		'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': baseurl
    }));


//var html = AnyBalance.requestPost('https://lk.smart1.ru/?action=auth&username=...&password=...');

// код...
try {
	if(!html || AnyBalance.getLastStatusCode() > 400)
		{
			throw new AnyBalance.Error('Ошибка при подключении к сайту провайдера! Попробуйте обновить данные позже.');
		}

// код...
  var e;
  var v = new RegExp('<span class="account-form__error">(.*?)</span>', 'i');
  var f = getParam(html, null, null, v, replaceTagsAndSpaces, html_entity_decode);

  if(f == 'Неверный логин или пароль'){
	  	e = 'Неверный логин или пароль';
		f = 0;
	  throw new AnyBalance.Error('Неверный логин или пароль');
	  }
	  else{
		e = '';
		v = new RegExp('<span class="user-balance__num">(.*?) <span class="user-balance__currency">руб.</span></span>', 'i');
		f = getParam(html, null, null, v, replaceTagsAndSpaces, html_entity_decode);
	  }
// обработка ошибки
} catch (err) 
{
  AnyBalance.trace("ошибка:");
  AnyBalance.trace(err);

}

AnyBalance.setResult({success: true, balance: f, err: e});
}
