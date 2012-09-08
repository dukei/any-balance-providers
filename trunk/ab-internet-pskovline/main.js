/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет и телевидения PskovLine.

Сайт оператора: http://www.pskovline.ru
Личный кабинет: http://www.pskovline.ru/utm5/
*/

function main() {
  AnyBalance.setDefaultCharset("utf-8");
  var prefs = AnyBalance.getPreferences();
  var url="http://pskovline.ru/utm5/";
  var info = AnyBalance.requestPost(url, {login: prefs.login, password: prefs.password});

  var result = {success: true}, matches;

        if (info.match("Неверно указаны логин или пароль")) {
		throw new AnyBalance.Error("Повторите ввод логина и пароля");
	}
	else if(info.match(/\'utm-table\'.*?>/i)){
                if(matches = info.match(/\'utm-cell\'.*?>(.*?)</img)){

		var i=0; while(x=matches[i]) {matches[i]=x.match(/>(.*?)</i)[1]; i++;}

                        var login, ballance, number, credit, work;

			result['success']=true;
			result['ballance']=parseFloat(matches[5]);
			if (AnyBalance.isAvailable('login'))
				result['login'] =matches[1];
			if (AnyBalance.isAvailable('number'))
				result['number']=matches[3];
			if (AnyBalance.isAvailable('credit'))
				result['credit']=matches[7];
			if (AnyBalance.isAvailable('work'))
				result['work']	=matches[15];

                        AnyBalance.setResult(result);
                }
	
        }
        
        if(!AnyBalance.isSetResultCalled())
                throw new AnyBalance.Error("Ошибка. Проверьте работу личного кабинета. Если Вы можете войти в личный кабинет, а провайдер не работает, обратитесь к автору провайдера.");
}
