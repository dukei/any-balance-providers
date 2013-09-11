/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет и телевидения PskovLine.

Сайт оператора: http://www.pskovline.ru
Личный кабинет: http://stat.pskovline.ru/
*/

function main() {
  AnyBalance.setDefaultCharset("utf-8");
  var prefs = AnyBalance.getPreferences();
  var url="http://stat.pskovline.ru/";
  var info = AnyBalance.requestPost(url, {login: prefs.login, password: prefs.password});

  var result = {success: true}, matches;

        if (info.match("Неверно введен логин или пароль")) {
		throw new AnyBalance.Error("Повторите ввод логина и пароля");
	}
	else if(info.match(/rightblock.*?>/i)){
                if(matches = info.match(/<td>(.*?)<\/td>/igm)){

		var i=0; while(x=matches[i]) {
			 matches[i]=x.match('td>(.*?)<\/td','i')[1];
		i++;
		}
                        var login, ballance, number;

			result['success']=true;
			result['ballance']=parseFloat(matches[3].match(/>([\d\-\.]+)</)[1]);

			if (AnyBalance.isAvailable('login'))
				result['login'] =matches[5];

			if (AnyBalance.isAvailable('number'))
				result['number']=matches[1];

                        AnyBalance.setResult(result);
                }
	
        }
        
        if(!AnyBalance.isSetResultCalled())
                throw new AnyBalance.Error("Ошибка. Проверьте работу личного кабинета. Если Вы можете войти в личный кабинет, а провайдер не работает, обратитесь к автору провайдера.");
}
