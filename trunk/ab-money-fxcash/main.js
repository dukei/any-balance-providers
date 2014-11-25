/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)
*/

var g_headers = {
	'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'Accept-Charset': 'windows-1251,utf-8;q=0.7,*;q=0.3',
	'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
	'Connection': 'keep-alive',
	'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.76 Safari/537.36',
};

function main() {
	var html;
	var prefs = AnyBalance.getPreferences();
	var baseurl;
	AnyBalance.setDefaultCharset('utf-8');

	var result = {success: true};


	result.balance=0;
	result.balance_fcbr=0;

//fxcash.ru
	if(prefs.fxc==1){
		baseurl = 'https://my.fxcash.ru/';

		checkEmpty(prefs.login, 'Enter login!');
		checkEmpty(prefs.password, 'Enter password!');

		g_headers['Referer']=baseurl;

		try {
			html = AnyBalance.requestPost(baseurl, {
				'login':prefs.login,
				'password':prefs.password,
				'auth':'1',
			}, g_headers);
		} catch(e) {
			throw new AnyBalance.Error('Error on authorization on fxcash.ru.');
		}
		if (/Имя пользователя или пароль введен неверно/i.test(html)) {
			throw new AnyBalance.Error('Incorrect login or password on fxcash.ru.');
		}

		result.__tariff = prefs.login;
		getParam(html, result, 'accessible', /Доступно: <b>(.*?)</, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'balance', /Баланс: <b>(.*?)</, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'bonus', /Ваш бонус: <span .*?>(.*?)</, replaceTagsAndSpaces, parseBalance);
	}

//forexcashbackrebate.com
	if(prefs.fcbr==1){
		baseurl = 'http://www.forexcashbackrebate.com/';
		html = AnyBalance.requestGet(baseurl, g_headers);
		var aret=getParam(html, null, null, /input type="hidden" name="return" value="(.*?)"/, null, null);
		var bret=getParam(html, null, null, /input type="hidden" name="([^<>]*?)" value="1" /, null, null);

		var p_headers={
			'username':prefs.login_fcbr,
			'password':prefs.password_fcbr,
			'Submit':'',
			'remember':'yes',
			'option':'com_users',
			'task':'user.login',
			'return':aret,
		};
		p_headers[bret]='1';
		g_headers['Referer']=baseurl;

		html = AnyBalance.requestPost(baseurl,p_headers,g_headers);

		var err=getParam(html, null,null, /"alert-heading">Warning[\s\S]*?<div>([\s\S]*?)<\/div>/, replaceTagsAndSpaces, html_entity_decode);
		if(err!=null){
			throw new AnyBalance.Error(err+" (forexcashbackreturn.com)");
		}



		getParam(html, result, 'balance_fcbr', /Account Balance \(\$\) :<\/b>(.*?)<br>/, replaceTagsAndSpaces, parseBalance);
		getParam(html, result, 'withdrawn_fcbr', /Net Earnings Paid Out \(\$\) :<\/b>(.*?)<\/div>/, replaceTagsAndSpaces, parseBalance);

	}

	result.total_balance=result.balance*1+result.balance_fcbr*1;
	
	AnyBalance.setResult(result);
}