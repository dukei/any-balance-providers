/**
Провайдер AnyBalance (http://any-balance-providers.googlecode.com)

Текущий баланс у оператора интернет и телевидения PskovLine.

Сайт оператора: http://www.pskovline.ru
Личный кабинет: https://stat.pskovline.ru/
*/

function main() {
  AnyBalance.setDefaultCharset("utf-8");
  var prefs = AnyBalance.getPreferences();
  var url="https://stat.pskovline.ru/";
  var info = AnyBalance.requestPost(url, {login: prefs.login, password: prefs.password});
  var date=new Date();

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
                        var login, ballance, number, date;

			result['success']=true;
			result['ballance']=parseFloat(matches[3].match(/>([\d\-\.]+)</)[1]);

// Сумма списания за период
var tarif=parseInt(matches[13].match(/\d+/));

			if (AnyBalance.isAvailable('login'))
				result['login'] =matches[5];

			if (AnyBalance.isAvailable('number'))
				result['number']=matches[1].match(/\d+/)[0];

			if (AnyBalance.isAvailable('date'))
				result['date']=info.match('<em .+>[(](.+?)[)]</em','igm')[1].match(/(\d*\.\d*\.\d*)/igm)[1];

// Срок до отключения
var dats=result['date'].split('.');
var tmp=dats[0]; dats[0]=parseInt(dats[1]); dats[1]=tmp;
if (tarif<result['ballance']) dats[0]+=1;
dats=((Date.parse(dats.join('.'))-date)/(1000*60*60*24)<1?0:Math.ceil((Date.parse(dats.join('.'))-date)/(1000*60*60*24)));


			if (AnyBalance.isAvailable('days'))
				result['days']=dats;

                        AnyBalance.setResult(result);
                }
	
        }
        
        if(!AnyBalance.isSetResultCalled())
                throw new AnyBalance.Error("Ошибка. Проверьте работу личного кабинета. Если Вы можете войти в личный кабинет, а провайдер не работает, обратитесь к автору провайдера.");
}
