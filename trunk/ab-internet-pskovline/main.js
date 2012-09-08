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

        if(info.match(/\'utm-table\'.*?>/i)){
                if(matches = info.match(/\'utm-cell\'.*?>(.*?)</img)){

		var i=0; while(x=matches[i]) {matches[i]=x.match(/>(.*?)</i)[1]; i++;}

                        var login, ballance, number, credit, work;

                        AnyBalance.setResult({success:true, login:matches[1], ballance:parseFloat(matches[5]), number:matches[3], credit:matches[7], work:matches[15]});
                }
	
        }
        
        if(!AnyBalance.isSetResultCalled())
                throw new AnyBalance.Error("Ошибка. Проверьте логин и пароль. Если вы можете с ними войти в личный кабинет, а провайдер не работает, обратитесь к автору провайдера.");

//  AnyBalance.setResult({success: true, login: login, ballance: ballance, number: number, credit: credit, work: work});
}
